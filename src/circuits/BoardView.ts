import * as THREE from 'three'
import type { Board, Piece } from '../loops/Board.ts'
import { BoardStage } from '../stage/BoardStage.ts'
import type { BoardSize, Side, Spot } from '../stage/Grid.ts'
import {
  box,
  createErasureMarker,
  disposeChildrenOf,
  lyingCylinder,
  part,
  showAsGhost,
  standingCylinder,
} from '../stage/Parts.ts'

export class BoardView {
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
        linkedSides: board.listLinkedSides(piece.spot),
        stillLife: this.reducedMotion.matches,
      })
      this.pieces.add(model)
      if (animate) this.animations.push(animate)
    }
  }

  showPlacementGhost(piece: Piece) {
    disposeChildrenOf(this.ghost)
    const { model } = createPieceModel(piece, { powered: false, strength: 0, linkedSides: [], stillLife: true })
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

type PieceLook = { powered: boolean; strength: number; linkedSides: Side[]; stillLife: boolean }

const cableRadius = 0.14

function createPieceModel(piece: Piece, look: PieceLook) {
  const model = new THREE.Group()
  model.position.set(piece.spot.x + 0.5, 0, piece.spot.z + 0.5)
  if (piece.kind === 'wire') {
    model.add(...createWire(look.linkedSides))
    return { model, animate: undefined }
  }
  const inner = new THREE.Group()
  inner.rotation.y = piece.axis === 'horizontal' ? 0 : Math.PI / 2
  model.add(inner)
  const { parts, animate } = {
    battery: createBattery,
    switch: createSwitch,
    lamp: createLamp,
    motor: createMotor,
    buzzer: createBuzzer,
  }[piece.kind](piece, look)
  inner.add(...parts)
  return { model, animate }
}

type PieceParts = { parts: THREE.Object3D[]; animate?: (seconds: number) => void }

function createWire(linkedSides: Side[]) {
  const arms = linkedSides.map((side) => {
    const [dx, dz] = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] }[side]
    const arm = part(new THREE.CylinderGeometry(cableRadius, cableRadius, 0.5, 16), '#2b6cb0', [
      dx * 0.25,
      cableRadius,
      dz * 0.25,
    ])
    if (dx !== 0) arm.rotation.z = Math.PI / 2
    else arm.rotation.x = Math.PI / 2
    return arm
  })
  return [part(new THREE.SphereGeometry(cableRadius, 16, 12), '#2b6cb0', [0, cableRadius, 0]), ...arms]
}

function createTerminals(length = 0.22) {
  return [-1, 1].map((end) => lyingCylinder(cableRadius, length, '#d9b44a', [end * (0.5 - length / 2), cableRadius, 0]))
}

function createTile(color: string) {
  return [box([0.94, 0.1, 0.94], color, [0, 0.05, 0]), ...createTerminals()]
}

function createBattery(): PieceParts {
  const sign = (size: [number, number, number], position: [number, number, number]) => box(size, '#ffffff', position)
  return {
    parts: [
      ...createTerminals(),
      lyingCylinder(0.27, 0.6, '#2b2d33', [0, 0.27, 0]),
      lyingCylinder(0.275, 0.3, '#d98e32', [0.15, 0.27, 0]),
      lyingCylinder(0.27, 0.03, '#9aa3ad', [-0.315, 0.27, 0]),
      lyingCylinder(0.1, 0.1, '#e8edf2', [0.35, 0.27, 0]),
      sign([0.16, 0.01, 0.04], [0.15, 0.55, 0]),
      sign([0.04, 0.01, 0.16], [0.15, 0.55, 0]),
      sign([0.14, 0.01, 0.04], [-0.12, 0.545, 0]),
    ],
  }
}

function createSwitch(piece: Piece): PieceParts {
  const lever = new THREE.Group()
  lever.position.set(-0.3, 0.22, 0)
  lever.rotation.z = piece.kind === 'switch' && piece.closed ? 0 : 0.7
  lever.add(
    box([0.64, 0.07, 0.14], '#f2f2f2', [0.32, 0, 0]),
    part(new THREE.SphereGeometry(0.1, 16, 12), '#c0453f', [0.64, 0, 0]),
  )
  return {
    parts: [
      ...createTile('#c0453f'),
      standingCylinder(0.08, 0.2, '#d9b44a', [-0.3, 0.2, 0]),
      standingCylinder(0.08, 0.2, '#d9b44a', [0.3, 0.2, 0]),
      lever,
    ],
  }
}

function createLamp(_piece: Piece, { powered, strength }: PieceLook): PieceParts {
  const glow = Math.min(strength, 1.6) / 1.6
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 24, 16),
    powered
      ? new THREE.MeshBasicMaterial({ color: new THREE.Color('#8f7a3c').lerp(new THREE.Color('#fffbe6'), glow) })
      : new THREE.MeshLambertMaterial({ color: '#dfe8ee', transparent: true, opacity: 0.9 }),
  )
  bulb.position.set(0, 0.5, 0)
  bulb.castShadow = !powered
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.4 + 0.3 * glow, 24, 16),
    new THREE.MeshBasicMaterial({ color: '#ffd84a', transparent: true, opacity: 0.06 + 0.3 * glow, depthWrite: false }),
  )
  halo.position.copy(bulb.position)
  return {
    parts: [
      ...createTerminals(0.3),
      standingCylinder(0.24, 0.26, '#9aa0a6', [0, 0.13, 0]),
      bulb,
      ...(powered ? [halo] : []),
    ],
  }
}

function createMotor(_piece: Piece, { powered, strength, stillLife }: PieceLook): PieceParts {
  const blades = new THREE.Group()
  blades.position.set(0, 0.56, 0)
  blades.add(box([0.86, 0.03, 0.14], '#f5f1e6', [0, 0, 0]), box([0.14, 0.03, 0.86], '#f5f1e6', [0, 0, 0]))
  return {
    parts: [
      ...createTile('#5b4aa8'),
      standingCylinder(0.3, 0.3, '#7a68c8', [0, 0.25, 0]),
      standingCylinder(0.05, 0.16, '#d9b44a', [0, 0.48, 0]),
      blades,
    ],
    animate:
      powered && !stillLife
        ? (seconds) => {
            blades.rotation.y = seconds * 14 * strength
          }
        : undefined,
  }
}

function createBuzzer(_piece: Piece, { powered, stillLife }: PieceLook): PieceParts {
  const body = standingCylinder(0.33, 0.22, '#1b1d22', [0, 0.21, 0])
  const waves = [0, 0.5].map((offset) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.03, 8, 40),
      new THREE.MeshBasicMaterial({ color: '#7ad0ff', transparent: true }),
    )
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.34
    return { ring, offset }
  })
  return {
    parts: [
      ...createTile('#2b2f36'),
      body,
      standingCylinder(0.12, 0.05, '#555b66', [0, 0.34, 0]),
      ...(powered ? waves.map(({ ring }) => ring) : []),
    ],
    animate:
      powered && !stillLife
        ? (seconds) => {
            body.scale.set(1 + 0.04 * Math.sin(seconds * 60), 1, 1 + 0.04 * Math.sin(seconds * 60))
            for (const { ring, offset } of waves) {
              const phase = (seconds * 1.5 + offset) % 1
              ring.scale.setScalar(0.7 + phase * 0.7)
              ring.material.opacity = 1 - phase
            }
          }
        : undefined,
  }
}
