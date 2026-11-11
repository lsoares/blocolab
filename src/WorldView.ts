import * as THREE from 'three'
import { IsometricCamera } from './IsometricCamera.ts'
import type { Block, Size, Spot, World } from './World.ts'

export class WorldView {
  readonly camera: IsometricCamera
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly board = new THREE.Group()
  private readonly ground: THREE.Mesh
  private readonly cubes: THREE.InstancedMesh
  private readonly ramps: THREE.InstancedMesh
  private readonly ghost = createGhost()
  private readonly raycaster = new THREE.Raycaster()
  private readonly shownBlocks = new Map<THREE.Object3D, Block[]>()

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
    this.cubes = createBlocks(new THREE.BoxGeometry(1, 1, 1), '#c9925f', size)
    this.ramps = createBlocks(createRampGeometry(), '#e8b46a', size)
    this.board.add(this.ground, createGridLines(size), this.cubes, this.ramps, this.ghost)
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
    const blocks = world.listBlocks()
    this.showInstances(
      this.cubes,
      blocks.filter((block) => block.kind === 'cube'),
    )
    this.showInstances(
      this.ramps,
      blocks.filter((block) => block.kind === 'ramp'),
    )
  }

  showPlacementGhost(block: Block) {
    this.showShapeGhost(block, this.ghost.placementLook)
  }

  showBlockedGhost(block: Block) {
    this.showShapeGhost(block, this.ghost.blockedLook)
  }

  showErasureGhost(block: Block) {
    this.ghost.cube.visible = false
    this.ghost.ramp.visible = false
    this.ghost.erasure.visible = true
    this.moveGhostOnto(block)
  }

  hideGhost() {
    this.ghost.visible = false
  }

  pickBlock(pointer: PointerEvent): Block | undefined {
    this.aimAt(pointer)
    const [hit] = this.raycaster.intersectObjects([this.cubes, this.ramps, this.ground], false)
    if (hit?.instanceId === undefined) return undefined
    return this.shownBlocks.get(hit.object)?.[hit.instanceId]
  }

  pickSpot(pointer: PointerEvent): Spot | undefined {
    this.aimAt(pointer)
    const [hit] = this.raycaster.intersectObjects([this.cubes, this.ramps, this.ground], false)
    if (!hit) return undefined
    const { x, z } = this.board.worldToLocal(this.raycaster.ray.at(hit.distance + 0.01, new THREE.Vector3()))
    return { x: Math.floor(x), z: Math.floor(z) }
  }

  private showInstances(mesh: THREE.InstancedMesh, blocks: Block[]) {
    this.shownBlocks.set(mesh, blocks)
    blocks.forEach((block, index) => {
      mesh.setMatrixAt(index, placementOf(block))
    })
    mesh.count = blocks.length
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
    this.moveGhostOnto(block)
  }

  private moveGhostOnto(block: Block) {
    this.ghost.matrix.copy(placementOf(block))
    this.ghost.visible = true
  }

  private fitToCanvas() {
    const { clientWidth, clientHeight } = this.canvas
    this.renderer.setSize(clientWidth, clientHeight, false)
    this.camera.fitTo(clientWidth, clientHeight)
  }
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
  const turn = { east: 0, north: Math.PI / 2, west: Math.PI, south: -Math.PI / 2 }[block.facing]
  return center
    .multiply(new THREE.Matrix4().makeRotationY(turn))
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

function createBlocks(geometry: THREE.BufferGeometry, color: string, { width, height, depth }: Size) {
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
