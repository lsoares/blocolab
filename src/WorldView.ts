import * as THREE from 'three'
import { IsometricCamera } from './IsometricCamera.ts'
import type { Block, Facing, Piece, Size, Spot, World } from './World.ts'

export class WorldView {
  readonly camera: IsometricCamera
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly board = new THREE.Group()
  private readonly ground: THREE.Mesh
  private readonly cubes: THREE.InstancedMesh
  private readonly rampBases: THREE.InstancedMesh
  private readonly slopes: THREE.InstancedMesh
  private readonly ghost = createGhost()
  private readonly raycaster = new THREE.Raycaster()
  private readonly shownSpots = new Map<THREE.Object3D, Spot[]>()

  constructor(
    private readonly canvas: HTMLCanvasElement,
    size: Size,
    reducedMotion: MediaQueryList,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.shadowMap.enabled = true
    this.camera = new IsometricCamera(Math.max(size.width, size.depth) * 1.1, reducedMotion)

    this.board.position.set(-size.width / 2, 0, -size.depth / 2)
    this.scene.add(this.board)
    this.ground = createGround(size)
    this.cubes = createPieces(new THREE.BoxGeometry(1, 1, 1), '#c9925f', size)
    this.rampBases = createPieces(new THREE.BoxGeometry(1, 1, 1), '#e8b46a', size)
    this.slopes = createPieces(createRampGeometry(), '#e8b46a', size)
    this.board.add(this.ground, createGridLines(size), this.cubes, this.rampBases, this.slopes, this.ghost)
    this.scene.add(...createLights(size))

    new ResizeObserver(() => this.fitToCanvas()).observe(canvas)
    this.fitToCanvas()
  }

  start() {
    const timer = new THREE.Timer()
    this.renderer.setAnimationLoop((timestamp) => {
      timer.update(timestamp)
      this.camera.advance(timer.getDelta())
      this.renderer.render(this.scene, this.camera.camera)
    })
  }

  show(world: World) {
    const pieces = world.listPieces()
    const ramps = pieces.filter((piece) => piece.kind === 'ramp')
    this.showInstances(
      this.cubes,
      pieces
        .filter((piece) => piece.kind === 'cube')
        .map(({ spot, height }) => ({ spot, placement: columnOf(spot, 0, height) })),
    )
    this.showInstances(
      this.rampBases,
      ramps.filter(({ low }) => low > 0).map(({ spot, low }) => ({ spot, placement: columnOf(spot, 0, low) })),
    )
    this.showInstances(
      this.slopes,
      ramps.map((ramp) => ({ spot: ramp.spot, placement: slopeOf(ramp) })),
    )
  }

  showPlacementGhost(block: Block) {
    this.showShapeGhost(block, this.ghost.placementLook)
  }

  showBlockedGhost(block: Block) {
    this.showShapeGhost(block, this.ghost.blockedLook)
  }

  showErasureGhost(piece: Piece) {
    this.ghost.cube.visible = false
    this.ghost.ramp.visible = false
    this.ghost.erasure.visible = true
    this.ghost.matrix.copy(columnOf(piece.spot, 0, piece.kind === 'cube' ? piece.height : piece.high))
    this.ghost.visible = true
  }

  hideGhost() {
    this.ghost.visible = false
  }

  pickTouchedSpot(pointer: PointerEvent): Spot | undefined {
    const hit = this.findHit(pointer)
    if (!hit) return undefined
    return this.findHitPiece(hit) ?? floorOf(this.board.worldToLocal(hit.point.clone()))
  }

  pickSpotInFront(pointer: PointerEvent): Spot | undefined {
    const hit = this.findHit(pointer)
    if (!hit) return undefined
    const piece = this.findHitPiece(hit)
    if (!piece || !hit.face || !(hit.object instanceof THREE.InstancedMesh)) {
      return floorOf(this.board.worldToLocal(hit.point.clone()))
    }
    const placement = new THREE.Matrix4()
    hit.object.getMatrixAt(hit.instanceId ?? 0, placement)
    const normal = hit.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(placement)).normalize()
    if (Math.abs(normal.y) > 0.5) return piece
    return { x: piece.x + Math.round(normal.x), z: piece.z + Math.round(normal.z) }
  }

  private findHit(pointer: PointerEvent) {
    this.aimAt(pointer)
    return this.raycaster.intersectObjects([this.cubes, this.rampBases, this.slopes, this.ground], false)[0]
  }

  private findHitPiece(hit: THREE.Intersection) {
    return hit.instanceId === undefined ? undefined : this.shownSpots.get(hit.object)?.[hit.instanceId]
  }

  private showInstances(mesh: THREE.InstancedMesh, pieces: { spot: Spot; placement: THREE.Matrix4 }[]) {
    this.shownSpots.set(
      mesh,
      pieces.map(({ spot }) => spot),
    )
    pieces.forEach(({ placement }, index) => {
      mesh.setMatrixAt(index, placement)
    })
    mesh.count = pieces.length
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }

  private aimAt(pointer: PointerEvent) {
    const bounds = this.canvas.getBoundingClientRect()
    const screenPoint = new THREE.Vector2(
      ((pointer.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((pointer.clientY - bounds.top) / bounds.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(screenPoint, this.camera.camera)
  }

  private showShapeGhost(block: Block, look: THREE.MeshBasicMaterial) {
    this.ghost.cube.visible = block.kind === 'cube'
    this.ghost.ramp.visible = block.kind === 'ramp'
    this.ghost.cube.material = look
    this.ghost.ramp.material = look
    this.ghost.erasure.visible = false
    this.ghost.matrix.copy(placementOf(block))
    this.ghost.visible = true
  }

  private fitToCanvas() {
    const { clientWidth, clientHeight } = this.canvas
    this.renderer.setSize(clientWidth, clientHeight, false)
    this.camera.fitTo(clientWidth, clientHeight)
  }
}

function floorOf({ x, z }: THREE.Vector3): Spot {
  return { x: Math.floor(x), z: Math.floor(z) }
}

function columnOf(spot: Spot, bottom: number, top: number) {
  return new THREE.Matrix4()
    .makeTranslation(spot.x + 0.5, (bottom + top) / 2, spot.z + 0.5)
    .multiply(new THREE.Matrix4().makeScale(1, top - bottom, 1))
}

function slopeOf({ spot, facing, low, high }: Extract<Piece, { kind: 'ramp' }>) {
  return new THREE.Matrix4()
    .makeTranslation(spot.x + 0.5, (low + high) / 2, spot.z + 0.5)
    .multiply(new THREE.Matrix4().makeRotationY(turnOf(facing)))
    .multiply(new THREE.Matrix4().makeScale(1, high - low, 1))
}

function turnOf(facing: Facing) {
  return { east: 0, north: Math.PI / 2, west: Math.PI, south: -Math.PI / 2 }[facing]
}

function placementOf(block: Block) {
  const { origin, size } = block
  const center = new THREE.Matrix4().makeTranslation(
    origin.x + size.width / 2,
    size.height / 2,
    origin.z + size.depth / 2,
  )
  if (block.kind === 'cube') return center.multiply(new THREE.Matrix4().makeScale(size.width, size.height, size.depth))
  const runsAlongX = block.facing === 'east' || block.facing === 'west'
  return center
    .multiply(new THREE.Matrix4().makeRotationY(turnOf(block.facing)))
    .multiply(
      runsAlongX
        ? new THREE.Matrix4().makeScale(size.width, size.height, size.depth)
        : new THREE.Matrix4().makeScale(size.depth, size.height, size.width),
    )
}

function createGround({ width, depth }: Size) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: '#8fd16a' }),
  )
  ground.position.set(width / 2, 0, depth / 2)
  ground.receiveShadow = true
  return ground
}

function createGridLines({ width, depth }: Size) {
  const grid = new THREE.GridHelper(Math.max(width, depth), Math.max(width, depth), '#6fae4f', '#6fae4f')
  grid.position.set(width / 2, 0.01, depth / 2)
  return grid
}

function createPieces(geometry: THREE.BufferGeometry, color: string, { width, height, depth }: Size) {
  const blocks = new THREE.InstancedMesh(geometry, new THREE.MeshLambertMaterial({ color }), width * height * depth)
  blocks.count = 0
  blocks.castShadow = true
  blocks.receiveShadow = true
  return blocks
}

function createRampGeometry() {
  const side = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(1, 0), new THREE.Vector2(1, 1)])
  return new THREE.ExtrudeGeometry(side, { depth: 1, bevelEnabled: false }).translate(-0.5, -0.5, -0.5)
}

function createGhost() {
  const placementLook = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  })
  const blockedLook = new THREE.MeshBasicMaterial({
    color: '#ff3b3b',
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  })
  const box = new THREE.BoxGeometry(1.02, 1.02, 1.02)
  const cube = new THREE.Mesh(box, placementLook)
  const ramp = new THREE.Mesh(createRampGeometry().scale(1.02, 1.02, 1.02), placementLook)
  const erasure = new THREE.Group().add(
    new THREE.Mesh(
      box,
      new THREE.MeshBasicMaterial({ color: '#ff4d4d', transparent: true, opacity: 0.35, depthWrite: false }),
    ),
    new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: '#7a0000' })),
    createCross(),
  )
  const ghost = Object.assign(new THREE.Group().add(cube, ramp, erasure), {
    cube,
    ramp,
    erasure,
    placementLook,
    blockedLook,
  })
  ghost.matrixAutoUpdate = false
  ghost.visible = false
  return ghost
}

function createCross() {
  const top = 0.52
  return new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.Float32BufferAttribute([-0.5, top, -0.5, 0.5, top, 0.5, -0.5, top, 0.5, 0.5, top, -0.5], 3),
    ),
    new THREE.LineBasicMaterial({ color: '#7a0000' }),
  )
}

function createLights({ width, depth }: Size) {
  const sun = new THREE.DirectionalLight('#ffffff', 2)
  sun.position.set(width * 0.4, 40, depth * 0.7)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  const reach = Math.max(width, depth)
  Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, far: 120 })
  return [new THREE.HemisphereLight('#ffffff', '#7a9a6a', 1.6), sun]
}
