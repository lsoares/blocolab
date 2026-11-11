import * as THREE from 'three'
import { BoardStage } from '../stage/BoardStage.ts'
import type { Axis, BoardSize, Side, Spot } from '../stage/Grid.ts'
import {
  box,
  createErasureMarker,
  disposeChildrenOf,
  lyingCylinder,
  part,
  showAsGhost,
  standingCylinder,
} from '../stage/Parts.ts'
import { bridgeRise, type Car } from './Journey.ts'
import type { Piece, Railway } from './Railway.ts'

export class RailwayView {
  private readonly stage: BoardStage
  private readonly pieces = new THREE.Group()
  private readonly ghost = new THREE.Group()
  private readonly cars = [createEngine(), createWagon('#2b6cb0'), createWagon('#e0b020')]

  constructor(canvas: HTMLCanvasElement, size: BoardSize) {
    this.stage = new BoardStage(canvas, size)
    this.stage.surface.add(this.pieces, ...this.cars, this.ghost)
    for (const car of this.cars) car.visible = false
  }

  start(onFrame: (elapsedSeconds: number) => void) {
    this.stage.start(onFrame)
  }

  show(railway: Railway) {
    disposeChildrenOf(this.pieces)
    for (const piece of railway.listPieces()) {
      this.pieces.add(createPieceModel(piece, railway.listLinkedSides(piece.spot)))
    }
  }

  showTrain(cars: Car[]) {
    this.cars.forEach((model, index) => {
      const car = cars[index]
      model.visible = car !== undefined && !car.hidden
      if (!car) return
      model.position.set(car.x, 0.1 + car.lift, car.z)
      model.rotation.y = -car.heading
    })
  }

  showPlacementGhost(piece: Piece) {
    disposeChildrenOf(this.ghost)
    const model = createPieceModel(piece, [])
    showAsGhost(model)
    this.ghost.add(model)
  }

  showTrainGhost({ x, z }: Spot) {
    disposeChildrenOf(this.ghost)
    const engine = createEngine()
    engine.position.set(x + 0.5, 0.1, z + 0.5)
    showAsGhost(engine)
    this.ghost.add(engine)
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

const wood = '#e0b074'
const rail = '#9a6a3a'

function vectorOf(side: Side) {
  return { north: { x: 0, z: -1 }, east: { x: 1, z: 0 }, south: { x: 0, z: 1 }, west: { x: -1, z: 0 } }[side]
}

function createPieceModel(piece: Piece, linkedSides: Side[]) {
  const model = new THREE.Group()
  model.position.set(piece.spot.x + 0.5, 0, piece.spot.z + 0.5)
  if (piece.kind === 'track') model.add(...createTrack(linkedSides))
  else if (piece.kind === 'tree') model.add(createTree(piece.spot))
  else if (piece.kind === 'points') model.add(...createPoints(piece.side, linkedSides))
  else if (piece.kind === 'bridge') model.add(...createBridge(piece.axis, linkedSides))
  else {
    const inner = new THREE.Group()
    inner.rotation.y = piece.axis === 'horizontal' ? 0 : Math.PI / 2
    inner.add(...createTrack(['west', 'east']))
    if (piece.kind === 'station') inner.add(...createStation())
    if (piece.kind === 'tunnel') inner.add(...createTunnel())
    if (piece.kind === 'signal') inner.add(...createSignal(piece.go))
    model.add(inner)
  }
  return model
}

function createPoints(aimedAt: Side, linkedSides: Side[]) {
  const { x, z } = vectorOf(aimedAt)
  const arrow = part(new THREE.ConeGeometry(0.11, 0.26, 12), '#f0a020', [x * 0.18, 0.26, z * 0.18])
  arrow.rotation.z = -x * (Math.PI / 2)
  arrow.rotation.x = z * (Math.PI / 2)
  const hub = part(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16), '#5a4a3a', [0, 0.14, 0])
  return [box([0.64, 0.1, 0.64], wood, [0, 0.05, 0]), ...linkedSides.flatMap(createArm), hub, arrow]
}

function createBridge(axis: Axis, linkedSides: Side[]) {
  const alongX = axis === 'horizontal'
  const underneath = linkedSides.filter((side) => (vectorOf(side).x !== 0) !== alongX)
  const raised = new THREE.Group()
  raised.rotation.y = alongX ? 0 : Math.PI / 2
  raised.add(
    part(archedBand(0.14, 0.64, 0), wood, [0, 0, 0]),
    part(archedBand(0.05, 0.06, -0.16, 0.1), rail, [0, 0, 0]),
    part(archedBand(0.05, 0.06, 0.16, 0.1), rail, [0, 0, 0]),
    part(archedBand(0.18, 0.05, -0.31, 0.2), '#b98a55', [0, 0, 0]),
    part(archedBand(0.18, 0.05, 0.31, 0.2), '#b98a55', [0, 0, 0]),
  )
  return [raised, ...underneath.flatMap(createArm)]
}

function archedBand(thickness: number, width: number, aside: number, lift = 0) {
  const profile = (along: number) => 0.1 + (bridgeRise * (1 - Math.cos(2 * Math.PI * along))) / 2 + lift
  const samples = Array.from({ length: 25 }, (_, index) => index / 24)
  const shape = new THREE.Shape()
  shape.moveTo(-0.5, profile(0))
  for (const along of samples) shape.lineTo(along - 0.5, profile(along))
  for (const along of [...samples].reverse()) shape.lineTo(along - 0.5, Math.max(profile(along) - thickness, 0))
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false })
  geometry.translate(0, 0, aside - width / 2)
  return geometry
}

function createTrack(linkedSides: Side[]) {
  const [first, second] = linkedSides
  if (linkedSides.length === 2 && isACorner(first, second)) return createCorner(first, second)
  const arms = linkedSides.flatMap(createArm)
  if (linkedSides.length === 0 || linkedSides.length >= 3) return [box([0.64, 0.1, 0.64], wood, [0, 0.05, 0]), ...arms]
  if (linkedSides.length === 1) return [...arms, createBuffer(first)]
  return arms
}

function isACorner(a: Side, b: Side) {
  return vectorOf(a).x + vectorOf(b).x !== 0 && vectorOf(a).z + vectorOf(b).z !== 0
}

function createArm(side: Side) {
  const { x, z } = vectorOf(side)
  const alongX = x !== 0
  return [
    box(alongX ? [0.5, 0.1, 0.64] : [0.64, 0.1, 0.5], wood, [x * 0.25, 0.05, z * 0.25]),
    ...[-0.16, 0.16].map((aside) =>
      box(alongX ? [0.5, 0.05, 0.06] : [0.06, 0.05, 0.5], rail, [
        x * 0.25 + (alongX ? 0 : aside),
        0.125,
        z * 0.25 + (alongX ? aside : 0),
      ]),
    ),
  ]
}

function createBuffer(linkedSide: Side) {
  const { x, z } = vectorOf(linkedSide)
  return box(x !== 0 ? [0.08, 0.2, 0.64] : [0.64, 0.2, 0.08], '#c0392b', [-x * 0.06, 0.1, -z * 0.06])
}

function createCorner(a: Side, b: Side) {
  const to = vectorOf(a)
  const other = vectorOf(b)
  const corner = { x: 0.5 * (to.x + other.x), z: 0.5 * (to.z + other.z) }
  const angleA = Math.atan2(-other.z, -other.x)
  const angleB = Math.atan2(-to.z, -to.x)
  const sweepIsPositive = ((angleB - angleA + 3 * Math.PI) % (2 * Math.PI)) - Math.PI > 0
  const [start, end] = sweepIsPositive ? [angleA, angleB] : [angleB, angleA]
  const sector = (inner: number, outer: number, height: number, lift: number) =>
    ringSector(corner, inner, outer, start, end, height).translate(0, lift, 0)
  return [
    part(sector(0.18, 0.82, 0.1, 0), wood, [0, 0, 0]),
    part(sector(0.31, 0.37, 0.05, 0.1), rail, [0, 0, 0]),
    part(sector(0.63, 0.69, 0.05, 0.1), rail, [0, 0, 0]),
  ]
}

function ringSector(
  centre: { x: number; z: number },
  inner: number,
  outer: number,
  start: number,
  end: number,
  height: number,
) {
  const shape = new THREE.Shape()
  shape.absarc(centre.x, centre.z, outer, start, end, false)
  shape.absarc(centre.x, centre.z, inner, end, start, true)
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 16 })
  geometry.rotateX(Math.PI / 2)
  geometry.translate(0, height, 0)
  return geometry
}

function createStation() {
  const roof = part(new THREE.ConeGeometry(0.3, 0.2, 4), '#8c3b2a', [0, 0.57, -0.4])
  roof.rotation.y = Math.PI / 4
  return [box([0.88, 0.16, 0.24], '#c8c2b4', [0, 0.08, -0.4]), box([0.46, 0.3, 0.2], '#d9534f', [0, 0.31, -0.4]), roof]
}

function createTunnel() {
  const entrance = (side: number) => {
    const arch = new THREE.Mesh(
      new THREE.CircleGeometry(0.36, 24, 0, Math.PI),
      new THREE.MeshBasicMaterial({ color: '#2d2a28' }),
    )
    arch.position.set(side * 0.452, 0.02, 0)
    arch.rotation.y = (side * Math.PI) / 2
    return arch
  }
  return [lyingCylinder(0.46, 0.9, '#9aa0a6', [0, 0.02, 0]), entrance(-1), entrance(1)]
}

function createSignal(go: boolean) {
  const lamp = (lit: boolean, litColor: string, dimColor: string, height: number) => {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 12, 8),
      lit ? new THREE.MeshBasicMaterial({ color: litColor }) : new THREE.MeshLambertMaterial({ color: dimColor }),
    )
    bulb.position.set(0, height, 0.34)
    return bulb
  }
  return [
    standingCylinder(0.04, 0.62, '#555a60', [0, 0.31, 0.4]),
    box([0.2, 0.38, 0.14], '#2b2f36', [0, 0.68, 0.4]),
    lamp(!go, '#ff4d4d', '#5a1f1f', 0.77),
    lamp(go, '#5dff7a', '#1f4a28', 0.59),
  ]
}

function createTree({ x, z }: Spot) {
  const size = 0.85 + (((x * 7 + z * 13) % 5) / 5) * 0.3
  const tree = new THREE.Group()
  const lower = part(new THREE.ConeGeometry(0.27, 0.5, 10), '#3a8f4b', [0, 0.45, 0])
  const upper = part(new THREE.ConeGeometry(0.19, 0.36, 10), '#46a257', [0, 0.68, 0])
  tree.add(standingCylinder(0.05, 0.22, '#7a4b2a', [0, 0.11, 0]), lower, upper)
  tree.scale.setScalar(size)
  return tree
}

function createWheels(positions: number[]) {
  return positions.flatMap((along) =>
    [-0.17, 0.17].map((aside) => {
      const wheel = part(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 16), '#25272b', [along, 0.09, aside])
      wheel.rotation.x = Math.PI / 2
      return wheel
    }),
  )
}

function createEngine() {
  const engine = new THREE.Group()
  engine.add(
    box([0.62, 0.22, 0.3], '#d94a3f', [-0.02, 0.24, 0]),
    box([0.22, 0.2, 0.3], '#a83a31', [-0.22, 0.45, 0]),
    lyingCylinder(0.13, 0.34, '#c0392b', [0.14, 0.38, 0]),
    standingCylinder(0.05, 0.16, '#25272b', [0.24, 0.55, 0]),
    ...createWheels([-0.2, 0.2]),
  )
  return engine
}

function createWagon(color: string) {
  const wagon = new THREE.Group()
  wagon.add(
    box([0.58, 0.18, 0.3], color, [0, 0.2, 0]),
    box([0.46, 0.1, 0.24], '#7a4b2a', [0, 0.34, 0]),
    ...createWheels([-0.18, 0.18]),
  )
  return wagon
}
