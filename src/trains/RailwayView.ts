import * as THREE from 'three'
import { BoardStage } from '../stage/BoardStage.ts'
import { type Axis, type BoardSize, type Side, type Spot, stepFrom } from '../stage/Grid.ts'
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
import { isStationStop } from './Rails.ts'
import type { Piece, Railway } from './Railway.ts'
import { advanceRoadCar, type RoadCar } from './RoadCar.ts'

export class RailwayView {
  private readonly stage: BoardStage
  private readonly pieces = new THREE.Group()
  private readonly ghost = new THREE.Group()
  private readonly cars = [createEngine(), createWagon('#2b6cb0'), createWagon('#e0b020')]
  private barriers: Barrier[] = []
  private bubbles: LavaBubble[] = []
  private clock = 0

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
    this.barriers = []
    this.bubbles = []
    const placed = railway.listPieces()
    for (const piece of placed) {
      const { model, barrier } = createPieceModel(piece, {
        pieces: placed,
        linkedSides: railway.listLinkedSides(piece.spot),
        waterSides: railway.listWaterSides(piece.spot),
      })
      this.pieces.add(model)
      if (barrier) this.barriers.push({ ...barrier, spot: piece.spot, openness: 1 })
      if (piece.kind === 'lava') this.bubbles.push(...createBubbles(model, piece.spot))
    }
  }

  showTrain(cars: Car[], seconds: number) {
    this.clock += seconds
    this.cars.forEach((model, index) => {
      const car = cars[index]
      model.visible = car !== undefined && !car.hidden
      if (!car) return
      model.position.set(car.x, 0.1 + car.lift, car.z)
      model.rotation.y = -car.heading
    })
    for (const barrier of this.barriers) this.moveGates(barrier, cars, seconds)
    this.stirLava()
  }

  private stirLava() {
    lavaGlow.color.setHSL(0.07 + 0.015 * Math.sin(this.clock * 2), 1, 0.52 + 0.08 * Math.sin(this.clock * 3.3))
    for (const { mesh, phase } of this.bubbles) {
      const age = (this.clock * 0.7 + phase) % 1
      mesh.scale.setScalar(Math.max(Math.sin(Math.PI * age), 0.001))
      mesh.position.y = 0.08 + 0.06 * age
    }
  }

  private moveGates(barrier: Barrier, cars: Car[], seconds: number) {
    const near = cars.some((car) => Math.hypot(car.x - (barrier.spot.x + 0.5), car.z - (barrier.spot.z + 0.5)) < 2.4)
    barrier.openness += ((near ? 0 : 1) - barrier.openness) * Math.min(1, seconds * 5)
    for (const gate of barrier.gates) gate.rotation.z = barrier.openness * 1.2
    for (const roadCar of barrier.roadCars) {
      roadCar.car = advanceRoadCar(roadCar.car, seconds, barrier.openness < 0.5)
      roadCar.model.visible = roadCar.car.pause <= 0
      roadCar.model.position.z = roadCar.direction * roadCar.car.progress
    }
    barrier.lamps.forEach((lamp, index) => {
      const lit = near && Math.floor(this.clock * 3) % 2 === index
      lamp.material.color.set(lit ? '#ff4d4d' : '#5a1f1f')
    })
  }

  showPlacementGhost(pieces: Piece[]) {
    disposeChildrenOf(this.ghost)
    for (const piece of pieces) {
      const { model } = createPieceModel(piece, { pieces, linkedSides: [], waterSides: [] })
      showAsGhost(model)
      this.ghost.add(model)
    }
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
const water = '#3b8fd6'

function vectorOf(side: Side) {
  return { north: { x: 0, z: -1 }, east: { x: 1, z: 0 }, south: { x: 0, z: 1 }, west: { x: -1, z: 0 } }[side]
}

type Barrier = {
  spot: Spot
  gates: THREE.Group[]
  lamps: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[]
  roadCars: { model: THREE.Group; direction: 1 | -1; car: RoadCar }[]
  openness: number
}

type Surroundings = { pieces: Piece[]; linkedSides: Side[]; waterSides: Side[] }

function createPieceModel(piece: Piece, { pieces, linkedSides, waterSides }: Surroundings) {
  const model = new THREE.Group()
  model.position.set(piece.spot.x + 0.5, 0, piece.spot.z + 0.5)
  let barrier: Pick<Barrier, 'gates' | 'lamps' | 'roadCars'> | undefined
  if (piece.kind === 'track') model.add(...createTrack(linkedSides))
  else if (piece.kind === 'tree') model.add(createTree(piece.spot))
  else if (piece.kind === 'river') model.add(...createWater(waterSides, water, 1, 0.06))
  else if (piece.kind === 'lava') model.add(...createLava(waterSides))
  else if (piece.kind === 'mountain') model.add(...createMountain(piece, pieces))
  else if (piece.kind === 'station') model.add(...createStation(piece.axis, isStationStop(pieces, piece.spot)))
  else if (piece.kind === 'points') model.add(...createPoints(piece.side, linkedSides))
  else if (piece.kind === 'bridge') {
    const lavaSides = waterSides.filter((side) =>
      pieces.some((other) => other.kind === 'lava' && isSpot(other.spot, stepFrom(piece.spot, side))),
    )
    model.add(...createBridge(piece.axis, linkedSides, waterSides, lavaSides))
  } else {
    const inner = new THREE.Group()
    inner.rotation.y = piece.axis === 'horizontal' ? 0 : Math.PI / 2
    inner.add(...createTrack(['west', 'east']))
    if (piece.kind === 'signal') inner.add(...createSignal(piece.go))
    if (piece.kind === 'barrier') {
      const crossing = createBarrier(piece.spot)
      inner.add(...crossing.parts)
      barrier = crossing
    }
    model.add(inner)
  }
  return { model, barrier }
}

function createWater(waterSides: Side[], colour: string, widen: number, height: number) {
  const [first, second] = waterSides
  if (waterSides.length === 2 && isACorner(first, second))
    return [part(cornerSector(first, second, 0.5 - 0.32 * widen, 0.5 + 0.32 * widen, height, 0), colour, [0, 0, 0])]
  const arms = waterSides.flatMap((side) => createWaterArm(side, colour, widen, height))
  if (waterSides.length === 2) return arms
  return [part(new THREE.CylinderGeometry(0.32 * widen, 0.32 * widen, height, 20), colour, [0, height / 2, 0]), ...arms]
}

function createWaterArm(side: Side, colour: string, widen: number, height: number) {
  const { x, z } = vectorOf(side)
  const width = 0.64 * widen
  return [box(x !== 0 ? [0.5, height, width] : [width, height, 0.5], colour, [x * 0.25, height / 2, z * 0.25])]
}

const lavaGlow = new THREE.MeshBasicMaterial({ color: '#ff8a2a' })

const bubbleLook = new THREE.MeshBasicMaterial({ color: '#ffe066' })

type LavaBubble = { mesh: THREE.Mesh; phase: number }

function createLava(lavaSides: Side[]) {
  return [...createWater(lavaSides, '#5a2a1a', 1.25, 0.05), ...glowing(createWater(lavaSides, '#ff8a2a', 0.85, 0.07))]
}

function glowing(meshes: THREE.Mesh[]) {
  for (const mesh of meshes) mesh.material = lavaGlow
  return meshes
}

function createBubbles(model: THREE.Group, { x, z }: Spot): LavaBubble[] {
  return [0, 1, 2].map((index) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), bubbleLook)
    const angle = (x * 5 + z * 11 + index * 2.1) * 1.7
    mesh.position.set(0.14 * Math.cos(angle), 0.08, 0.14 * Math.sin(angle))
    model.add(mesh)
    return { mesh, phase: ((x * 3 + z * 7 + index * 5) % 10) / 10 }
  })
}

function createBarrier(spot: Spot) {
  const gates: THREE.Group[] = []
  const lamps: Barrier['lamps'] = []
  const parts: THREE.Object3D[] = [box([0.36, 0.012, 1.3], '#6b6f76', [0, 0.116, 0])]
  for (const side of [-1, 1]) {
    const gate = new THREE.Group()
    gate.position.set(-0.2, 0.22, side * 0.42)
    for (const index of [0, 1, 2, 3]) {
      gate.add(box([0.1, 0.04, 0.04], index % 2 === 0 ? '#d94a3f' : '#f2f2f2', [0.05 + index * 0.1, 0, 0]))
    }
    gates.push(gate)
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 10, 8),
      new THREE.MeshBasicMaterial({ color: '#5a1f1f' }),
    )
    lamp.position.set(-0.2, 0.32, side * 0.42)
    lamps.push(lamp)
    parts.push(standingCylinder(0.035, 0.22, '#555a60', [-0.2, 0.11, side * 0.42]), gate, lamp)
  }
  const colours = ['#f0c040', '#40a0f0', '#e06080', '#60c080']
  const roadCars = ([1, -1] as const).map((direction, lane) => {
    const model = createRoadCar(colours[(spot.x * 3 + spot.z * 5 + lane) % colours.length])
    model.position.set(direction * -0.09, 0.122, 0)
    model.rotation.y = direction === 1 ? 0 : Math.PI
    model.visible = false
    parts.push(model)
    return { model, direction, car: { progress: -0.62, pause: 1 + lane * 1.2 } }
  })
  return { parts, gates, lamps, roadCars }
}

function createRoadCar(colour: string) {
  const car = new THREE.Group()
  car.add(box([0.13, 0.07, 0.22], colour, [0, 0.035, 0]), box([0.1, 0.06, 0.1], '#cfe8ff', [0, 0.1, -0.015]))
  return car
}

function createPoints(aimedAt: Side, linkedSides: Side[]) {
  const { x, z } = vectorOf(aimedAt)
  const arrow = part(new THREE.ConeGeometry(0.11, 0.26, 12), '#f0a020', [x * 0.18, 0.26, z * 0.18])
  arrow.rotation.z = -x * (Math.PI / 2)
  arrow.rotation.x = z * (Math.PI / 2)
  const hub = part(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16), '#5a4a3a', [0, 0.14, 0])
  return [box([0.64, 0.1, 0.64], wood, [0, 0.05, 0]), ...linkedSides.flatMap(createArm), hub, arrow]
}

function createBridge(axis: Axis, linkedSides: Side[], waterSides: Side[], lavaSides: Side[]) {
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
  return [
    raised,
    ...waterSides.filter((side) => !lavaSides.includes(side)).flatMap((side) => createWaterArm(side, water, 1, 0.06)),
    ...lavaSides.flatMap((side) => [
      ...createWaterArm(side, '#5a2a1a', 1.25, 0.05),
      ...glowing(createWaterArm(side, '#ff8a2a', 0.85, 0.07)),
    ]),
    ...underneath.flatMap(createArm),
  ]
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
  return [
    part(cornerSector(a, b, 0.18, 0.82, 0.1, 0), wood, [0, 0, 0]),
    part(cornerSector(a, b, 0.31, 0.37, 0.05, 0.1), rail, [0, 0, 0]),
    part(cornerSector(a, b, 0.63, 0.69, 0.05, 0.1), rail, [0, 0, 0]),
  ]
}

function cornerSector(a: Side, b: Side, inner: number, outer: number, height: number, lift: number) {
  const to = vectorOf(a)
  const other = vectorOf(b)
  const corner = { x: 0.5 * (to.x + other.x), z: 0.5 * (to.z + other.z) }
  const angleA = Math.atan2(-other.z, -other.x)
  const angleB = Math.atan2(-to.z, -to.x)
  const sweepIsPositive = ((angleB - angleA + 3 * Math.PI) % (2 * Math.PI)) - Math.PI > 0
  const [start, end] = sweepIsPositive ? [angleA, angleB] : [angleB, angleA]
  return ringSector(corner, inner, outer, start, end, height).translate(0, lift, 0)
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

function createStation(axis: Axis, isStop: boolean) {
  const platform = new THREE.Group()
  platform.rotation.y = axis === 'horizontal' ? 0 : Math.PI / 2
  platform.add(...createTrack(['west', 'east']), box([1, 0.14, 0.24], '#c8c2b4', [0, 0.07, -0.4]))
  platform.add(box([1, 0.04, 0.34], '#8c3b2a', [0, 0.52, -0.4]))
  if (!isStop) {
    platform.add(...[-0.45, 0.45].map((along) => box([0.05, 0.4, 0.05], '#5a4a3a', [along, 0.34, -0.5])))
    return [platform]
  }
  const roof = part(new THREE.ConeGeometry(0.5, 0.24, 4), '#8c3b2a', [0, 0.66, -0.4])
  roof.rotation.y = Math.PI / 4
  platform.add(
    box([0.8, 0.34, 0.24], '#d9534f', [0, 0.31, -0.4]),
    box([0.2, 0.2, 0.02], '#f4e3b0', [0, 0.34, -0.27]),
    roof,
  )
  return [platform]
}

function createMountain({ spot, axis }: Extract<Piece, { kind: 'mountain' }>, pieces: Piece[]) {
  const joined = (['north', 'east', 'south', 'west'] as const).filter((side) =>
    pieces.some((other) => other.kind === 'mountain' && isSpot(other.spot, stepFrom(spot, side))),
  )
  const layerCount = 2 + (joined.length >= 3 ? 1 : 0) + (joined.length >= 4 ? 2 : 0)
  const colours = ['#7d8389', '#8f969c', '#a3aab0', '#b4bbc0', '#f2f5f7']
  const parts: THREE.Object3D[] = Array.from({ length: layerCount }, (_, layer) => {
    const inset = (side: Side) => (joined.includes(side) ? 0 : 0.09 * layer)
    const [west, east, north, south] = [
      -0.5 + inset('west'),
      0.5 - inset('east'),
      -0.5 + inset('north'),
      0.5 - inset('south'),
    ]
    return box([east - west, 0.3, south - north], colours[layer === layerCount - 1 && layerCount === 5 ? 4 : layer], [
      (east + west) / 2,
      0.15 + 0.3 * layer,
      (south + north) / 2,
    ])
  })
  const mouths: Side[] = axis === 'horizontal' ? ['west', 'east'] : ['north', 'south']
  for (const side of mouths.filter((mouth) => !joined.includes(mouth))) {
    const { x, z } = vectorOf(side)
    const arch = new THREE.Mesh(
      new THREE.CircleGeometry(0.26, 24, 0, Math.PI),
      new THREE.MeshBasicMaterial({ color: '#2d2a28' }),
    )
    arch.position.set(x * 0.505, 0.02, z * 0.505)
    arch.rotation.y = Math.atan2(x, z)
    parts.push(arch)
  }
  return parts
}

function isSpot(a: Spot, b: Spot) {
  return a.x === b.x && a.z === b.z
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
