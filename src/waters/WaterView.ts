import * as THREE from 'three'
import type { Board, Piece } from '../loops/Board.ts'
import { BoardStage } from '../stage/BoardStage.ts'
import type { BoardSize, Side, Spot } from '../stage/Grid.ts'
import {
  box,
  createErasureMarker,
  disposeChildrenOf,
  lyingCylinder,
  showAsGhost,
  standingCylinder,
} from '../stage/Parts.ts'

export class WaterView {
  private readonly stage: BoardStage
  private readonly pieces = new THREE.Group()
  private readonly ghost = new THREE.Group()
  private animations: ((seconds: number) => void)[] = []

  constructor(
    canvas: HTMLCanvasElement,
    size: BoardSize,
    private readonly reducedMotion: MediaQueryList,
  ) {
    this.stage = new BoardStage(canvas, size)
    this.stage.surface.add(this.pieces, this.ghost)
  }

  start() {
    this.stage.start((seconds) => {
      for (const animate of this.animations) animate(seconds)
    })
  }

  show(board: Board) {
    disposeChildrenOf(this.pieces)
    this.animations = []
    for (const piece of board.listPieces()) {
      const { model, animate } = createPieceModel(piece, {
        powered: board.isPoweredAt(piece.spot),
        strength: board.measureStrengthAt(piece.spot),
        live: board.isLiveAt(piece.spot),
        flows: board.listFlowsAt(piece.spot),
        linkedSides: board.listLinkedSides(piece.spot),
        stillLife: this.reducedMotion.matches,
      })
      this.pieces.add(model)
      if (animate) this.animations.push(animate)
    }
  }

  showPlacementGhost(piece: Piece) {
    disposeChildrenOf(this.ghost)
    const { model } = createPieceModel(piece, {
      powered: false,
      strength: 0,
      live: false,
      flows: [],
      linkedSides: [],
      stillLife: true,
    })
    showAsGhost(model)
    this.ghost.add(model)
  }

  showErasureGhost(spot: Spot) {
    disposeChildrenOf(this.ghost)
    this.ghost.add(createErasureMarker(spot))
  }

  hideGhost() {
    disposeChildrenOf(this.ghost)
  }

  pickSpot(pointer: PointerEvent) {
    return this.stage.pickSpot(pointer)
  }
}

type PieceLook = {
  powered: boolean
  strength: number
  live: boolean
  flows: { side: Side; out: number }[]
  linkedSides: Side[]
  stillLife: boolean
}

type PieceParts = { parts: THREE.Object3D[]; animate?: (seconds: number) => void }

const pipeRadius = 0.17
const steel = '#7d96ab'
const water = '#3b8fd6'

const glass = new THREE.MeshLambertMaterial({ color: '#b9d3e6', transparent: true, opacity: 0.5, depthWrite: false })
const wetness = new THREE.MeshLambertMaterial({ color: water })
const foam = new THREE.MeshBasicMaterial({ color: '#e8f6ff' })

function createPieceModel(piece: Piece, look: PieceLook) {
  const model = new THREE.Group()
  model.position.set(piece.spot.x + 0.5, 0, piece.spot.z + 0.5)
  if (piece.kind === 'wire') {
    const { parts, animate } = createPipe(look)
    model.add(...parts)
    return { model, animate }
  }
  const inner = new THREE.Group()
  inner.rotation.y = piece.axis === 'horizontal' ? 0 : Math.PI / 2
  model.add(inner)
  const { parts, animate } = {
    battery: createPump,
    switch: createTap,
    lamp: createFountain,
    motor: createWheel,
    buzzer: createBubbler,
  }[piece.kind](piece, look)
  inner.add(...parts)
  return { model, animate }
}

function vectorOf(side: Side) {
  return { north: { x: 0, z: -1 }, east: { x: 1, z: 0 }, south: { x: 0, z: 1 }, west: { x: -1, z: 0 } }[side]
}

function createPipe({ linkedSides, live, flows, stillLife }: PieceLook): PieceParts {
  const tubes = (radius: number, material: THREE.Material) =>
    linkedSides.map((side) => {
      const { x, z } = vectorOf(side)
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.5, 16), material)
      arm.position.set(x * 0.25, pipeRadius, z * 0.25)
      if (x !== 0) arm.rotation.z = Math.PI / 2
      else arm.rotation.x = Math.PI / 2
      return arm
    })
  const joint = (radius: number, material: THREE.Material) => {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), material)
    ball.position.set(0, pipeRadius, 0)
    return ball
  }
  const parts: THREE.Object3D[] = [...tubes(pipeRadius, glass), joint(pipeRadius, glass)]
  if (!live) return { parts }
  parts.push(...tubes(pipeRadius * 0.7, wetness), joint(pipeRadius * 0.7, wetness))
  const arrows = flows.flatMap(({ side, out }) =>
    [0, 0.5].map((phase) => ({ side, out, phase, mesh: createArrowhead(Math.sign(out), side) })),
  )
  parts.push(...arrows.map(({ mesh }) => mesh))
  const place = (seconds: number) => {
    for (const { side, out, phase, mesh } of arrows) {
      const { x, z } = vectorOf(side)
      const progress = (seconds * Math.min(1, Math.abs(out)) * 0.8 + phase) % 1
      const along = out > 0 ? 0.08 + 0.38 * progress : 0.46 - 0.38 * progress
      mesh.position.set(x * along, pipeRadius, z * along)
    }
  }
  place(0.25)
  return { parts, animate: stillLife ? undefined : place }
}

function createArrowhead(direction: number, side: Side) {
  const { x, z } = vectorOf(side)
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 10), foam)
  arrow.rotation.z = -x * direction * (Math.PI / 2)
  arrow.rotation.x = z * direction * (Math.PI / 2)
  return arrow
}

function createDroplet(radius: number) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), foam)
}

function createStubs(length = 0.22) {
  return [-1, 1].map((end) => lyingCylinder(pipeRadius, length, steel, [end * (0.5 - length / 2), pipeRadius, 0]))
}

function createPump(_piece: Piece, { powered, stillLife }: PieceLook): PieceParts {
  const impeller = new THREE.Group()
  impeller.position.set(0, 0.36, 0)
  impeller.add(box([0.44, 0.03, 0.09], '#f2f6fa', [0, 0, 0]), box([0.09, 0.03, 0.44], '#f2f6fa', [0, 0, 0]))
  return {
    parts: [
      ...createStubs(0.3),
      lyingCylinder(0.13, 0.62, steel, [0, pipeRadius, 0]),
      standingCylinder(0.3, 0.26, '#3a6ea5', [0, 0.17, 0]),
      standingCylinder(0.22, 0.04, '#2a527d', [0, 0.31, 0]),
      impeller,
    ],
    animate:
      powered && !stillLife
        ? (seconds) => {
            impeller.rotation.y = seconds * 9
          }
        : undefined,
  }
}

function createTap(piece: Piece, { live }: PieceLook): PieceParts {
  const open = piece.kind === 'switch' && piece.closed
  const indicator = box([0.34, 0.03, 0.06], open ? '#4fd36b' : '#f2f6fa', [0, 0.42, 0])
  if (!open) indicator.rotation.y = Math.PI / 2
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius, pipeRadius, 1, 16), glass)
  pipe.rotation.z = Math.PI / 2
  pipe.position.set(0, pipeRadius, 0)
  const wet = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius * 0.7, pipeRadius * 0.7, 1, 16), wetness)
  wet.rotation.z = Math.PI / 2
  wet.position.set(0, pipeRadius, 0)
  return {
    parts: [
      pipe,
      ...(live ? [wet] : []),
      box([0.3, 0.26, 0.3], '#5a6b7a', [0, 0.17, 0]),
      standingCylinder(0.05, 0.1, '#5a6b7a', [0, 0.35, 0]),
      standingCylinder(0.17, 0.04, open ? '#d94a3f' : '#a83a31', [0, 0.4, 0]),
      indicator,
    ],
  }
}

function createFountain(_piece: Piece, { powered, strength, stillLife }: PieceLook): PieceParts {
  const jetHeight = 0.2 + 0.4 * (Math.min(strength, 1.6) / 1.6)
  const basin = standingCylinder(0.36, 0.1, '#c9c2b3', [0, 0.05, 0])
  const pond = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 24), wetness)
  pond.position.set(0, 0.105, 0)
  const drops = Array.from({ length: 14 }, (_, index) => ({ index, mesh: createDroplet(0.035) }))
  return {
    parts: [
      ...createStubs(),
      basin,
      standingCylinder(0.05, 0.2, '#8fa0ad', [0, 0.2, 0]),
      ...(powered ? [pond, ...drops.map(({ mesh }) => mesh)] : []),
    ],
    animate:
      powered && !stillLife
        ? (seconds) => {
            for (const { index, mesh } of drops) {
              const along = (seconds * 1.1 + index / drops.length) % 1
              const heading = (index % 7) * ((Math.PI * 2) / 7)
              const reach = 0.04 + 0.2 * along
              mesh.position.set(
                Math.cos(heading) * reach,
                0.28 + jetHeight * 4 * along * (1 - along),
                Math.sin(heading) * reach,
              )
            }
          }
        : undefined,
  }
}

function createWheel(_piece: Piece, { powered, strength, stillLife }: PieceLook): PieceParts {
  const rotor = new THREE.Group()
  rotor.position.set(0, 0.16, 0)
  for (let paddle = 0; paddle < 6; paddle++) {
    const blade = box([0.26, 0.12, 0.07], '#b9803f', [0.2, 0, 0])
    const arm = new THREE.Group()
    arm.rotation.y = (paddle * Math.PI) / 3
    arm.add(blade)
    rotor.add(arm)
  }
  rotor.add(standingCylinder(0.09, 0.14, '#7a4b2a', [0, 0, 0]))
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.02, 24), powered ? wetness : glass)
  pool.position.set(0, 0.09, 0)
  return {
    parts: [...createStubs(), standingCylinder(0.38, 0.08, '#6d8296', [0, 0.04, 0]), pool, rotor],
    animate:
      powered && !stillLife
        ? (seconds) => {
            rotor.rotation.y = seconds * 5 * strength
          }
        : undefined,
  }
}

function createBubbler(_piece: Piece, { powered, stillLife }: PieceLook): PieceParts {
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.42, 24), glass)
  jar.position.set(0, 0.22, 0)
  const inside = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.3, 24), wetness)
  inside.position.set(0, 0.17, 0)
  const bubbles = Array.from({ length: 6 }, (_, index) => ({ index, mesh: createDroplet(0.05) }))
  return {
    parts: [
      ...createStubs(),
      standingCylinder(0.34, 0.04, '#6d8296', [0, 0.02, 0]),
      ...(powered ? [inside, ...bubbles.map(({ mesh }) => mesh)] : []),
      jar,
    ],
    animate:
      powered && !stillLife
        ? (seconds) => {
            for (const { index, mesh } of bubbles) {
              const rise = (seconds * 0.6 + index / bubbles.length) % 1
              mesh.position.set(Math.cos(index * 2.1) * 0.12, 0.08 + 0.3 * rise, Math.sin(index * 2.1) * 0.12)
              mesh.scale.setScalar(0.6 + 0.8 * rise)
            }
          }
        : undefined,
  }
}
