import * as THREE from 'three'
import type { Board, BoardSize, Piece, Spot } from './Board.ts'
import { BoardCamera } from './BoardCamera.ts'
import type { Side } from './Circuit.ts'

export class BoardView {
  readonly camera: BoardCamera
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly surface = new THREE.Group()
  private readonly pieces = new THREE.Group()
  private readonly ghost = new THREE.Group()
  private readonly raycaster = new THREE.Raycaster()
  private animations: ((seconds: number) => void)[] = []

  constructor(
    private readonly canvas: HTMLCanvasElement,
    size: BoardSize,
    private readonly reducedMotion: MediaQueryList,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.shadowMap.enabled = true
    this.camera = new BoardCamera(size)

    this.surface.position.set(-size.columns / 2, 0, -size.rows / 2)
    this.surface.add(createPlate(size), createStuds(size), ...createRimWall(size), this.pieces, this.ghost)
    this.scene.add(this.surface, ...createLights(size))

    new ResizeObserver(() => this.fitToCanvas()).observe(canvas)
    this.fitToCanvas()
  }

  start() {
    const timer = new THREE.Timer()
    this.renderer.setAnimationLoop((timestamp) => {
      timer.update(timestamp)
      for (const animate of this.animations) animate(timer.getElapsed())
      this.renderer.render(this.scene, this.camera.camera)
    })
  }

  show(board: Board) {
    this.disposeChildrenOf(this.pieces)
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
    this.disposeChildrenOf(this.ghost)
    const { model } = createPieceModel(piece, { powered: false, strength: 0, linkedSides: [], stillLife: true })
    model.traverse((part) => {
      if (part instanceof THREE.Mesh) Object.assign(part, { material: placementLook, castShadow: false })
    })
    this.ghost.add(model)
  }

  showErasureGhost(spot: Spot) {
    this.disposeChildrenOf(this.ghost)
    const marker = new THREE.Group().add(
      new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.5, 0.96), erasureLook),
      new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(0.96, 0.5, 0.96)),
        new THREE.LineBasicMaterial({ color: '#7a0000' }),
      ),
      createCross(),
    )
    marker.position.set(spot.x + 0.5, 0.25, spot.z + 0.5)
    this.ghost.add(marker)
  }

  hideGhost() {
    this.disposeChildrenOf(this.ghost)
  }

  pickSpot(pointer: PointerEvent): Spot | undefined {
    const bounds = this.canvas.getBoundingClientRect()
    this.raycaster.setFromCamera(
      new THREE.Vector2(
        ((pointer.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((pointer.clientY - bounds.top) / bounds.height) * 2 + 1,
      ),
      this.camera.camera,
    )
    const midHeight = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.3)
    const point = this.raycaster.ray.intersectPlane(midHeight, new THREE.Vector3())
    if (!point) return undefined
    const { x, z } = this.surface.worldToLocal(point)
    return { x: Math.floor(x), z: Math.floor(z) }
  }

  private disposeChildrenOf(group: THREE.Group) {
    for (const child of [...group.children]) {
      group.remove(child)
      child.traverse((part) => {
        if (part instanceof THREE.Mesh || part instanceof THREE.LineSegments) part.geometry.dispose()
      })
    }
  }

  private fitToCanvas() {
    const { clientWidth, clientHeight } = this.canvas
    this.renderer.setSize(clientWidth, clientHeight, false)
    this.camera.fitTo(clientWidth, clientHeight)
  }
}

type PieceLook = { powered: boolean; strength: number; linkedSides: Side[]; stillLife: boolean }

const placementLook = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 })
const erasureLook = new THREE.MeshBasicMaterial({ color: '#ff4d4d', transparent: true, opacity: 0.35 })

const paints = new Map<string, THREE.MeshLambertMaterial>()

function paint(color: string) {
  const known = paints.get(color)
  if (known) return known
  const made = new THREE.MeshLambertMaterial({ color })
  paints.set(color, made)
  return made
}

function part(geometry: THREE.BufferGeometry, color: string, position: [number, number, number]) {
  const mesh = new THREE.Mesh(geometry, paint(color))
  mesh.position.set(...position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function box(size: [number, number, number], color: string, position: [number, number, number]) {
  return part(new THREE.BoxGeometry(...size), color, position)
}

function lyingCylinder(radius: number, length: number, color: string, position: [number, number, number]) {
  const mesh = part(new THREE.CylinderGeometry(radius, radius, length, 24), color, position)
  mesh.rotation.z = Math.PI / 2
  return mesh
}

function standingCylinder(radius: number, height: number, color: string, position: [number, number, number]) {
  return part(new THREE.CylinderGeometry(radius, radius, height, 24), color, position)
}

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

function createTile(color: string) {
  return [
    box([0.94, 0.1, 0.94], color, [0, 0.05, 0]),
    ...[-1, 1].map((end) => lyingCylinder(cableRadius, 0.22, '#d9b44a', [end * 0.39, cableRadius, 0])),
  ]
}

function createBattery(): PieceParts {
  const sign = (size: [number, number, number], position: [number, number, number]) => box(size, '#ffffff', position)
  return {
    parts: [
      ...createTile('#cfd5dc'),
      lyingCylinder(0.27, 0.6, '#2b2d33', [0, 0.34, 0]),
      lyingCylinder(0.275, 0.3, '#d98e32', [0.15, 0.34, 0]),
      lyingCylinder(0.27, 0.03, '#9aa3ad', [-0.315, 0.34, 0]),
      lyingCylinder(0.1, 0.1, '#e8edf2', [0.35, 0.34, 0]),
      sign([0.16, 0.01, 0.04], [0.15, 0.62, 0]),
      sign([0.04, 0.01, 0.16], [0.15, 0.62, 0]),
      sign([0.14, 0.01, 0.04], [-0.12, 0.615, 0]),
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
  bulb.position.set(0, 0.52, 0)
  bulb.castShadow = !powered
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.4 + 0.3 * glow, 24, 16),
    new THREE.MeshBasicMaterial({ color: '#ffd84a', transparent: true, opacity: 0.06 + 0.3 * glow, depthWrite: false }),
  )
  halo.position.copy(bulb.position)
  return {
    parts: [
      ...createTile('#e6e2d5'),
      standingCylinder(0.22, 0.2, '#9aa0a6', [0, 0.2, 0]),
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

function createPlate({ columns, rows }: BoardSize) {
  const plate = new THREE.Mesh(new THREE.BoxGeometry(columns, 0.4, rows), paint('#4a9d6b'))
  plate.position.set(columns / 2, -0.2, rows / 2)
  plate.receiveShadow = true
  return plate
}

function createStuds({ columns, rows }: BoardSize) {
  const studs = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16),
    paint('#3b8156'),
    columns * rows,
  )
  const placement = new THREE.Matrix4()
  for (let index = 0; index < columns * rows; index++) {
    studs.setMatrixAt(
      index,
      placement.makeTranslation((index % columns) + 0.5, 0.02, Math.floor(index / columns) + 0.5),
    )
  }
  studs.receiveShadow = true
  return studs
}

function createRimWall({ columns, rows }: BoardSize) {
  const thickness = 0.6
  const wall = (size: [number, number, number], position: [number, number, number]) => box(size, '#c28e5a', position)
  return [
    wall([columns + 2 * thickness, 0.9, thickness], [columns / 2, 0.05, -thickness / 2]),
    wall([columns + 2 * thickness, 0.9, thickness], [columns / 2, 0.05, rows + thickness / 2]),
    wall([thickness, 0.9, rows], [-thickness / 2, 0.05, rows / 2]),
    wall([thickness, 0.9, rows], [columns + thickness / 2, 0.05, rows / 2]),
  ]
}

function createCross() {
  const top = 0.27
  return new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.Float32BufferAttribute([-0.48, top, -0.48, 0.48, top, 0.48, -0.48, top, 0.48, 0.48, top, -0.48], 3),
    ),
    new THREE.LineBasicMaterial({ color: '#7a0000' }),
  )
}

function createLights({ columns, rows }: BoardSize) {
  const sun = new THREE.DirectionalLight('#ffffff', 2)
  sun.position.set(columns * 0.3, 40, rows * 0.8)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  const reach = Math.max(columns, rows)
  Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, far: 120 })
  return [new THREE.HemisphereLight('#ffffff', '#7a9a6a', 1.8), sun]
}
