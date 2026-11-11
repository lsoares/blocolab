import * as THREE from 'three'
import { IsometricCamera } from './IsometricCamera.ts'
import type { Position, World, WorldSize } from './World.ts'

export type Pick = { cube?: Position; nextTo: Position }

export type Column = { x: number; z: number }

export class WorldView {
  readonly camera: IsometricCamera
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly board = new THREE.Group()
  private readonly ground: THREE.Mesh
  private readonly cubes: THREE.InstancedMesh
  private readonly ghost: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>
  private readonly raycaster = new THREE.Raycaster()
  private shownCubes: Position[] = []

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly size: WorldSize,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.shadowMap.enabled = true
    this.scene.background = new THREE.Color('#bfe6ff')
    this.camera = new IsometricCamera(Math.max(size.width, size.depth) * 1.1)

    this.board.position.set(-size.width / 2, 0, -size.depth / 2)
    this.scene.add(this.board)
    this.ground = createGround(size)
    this.cubes = createCubes(size)
    this.ghost = createGhost()
    this.board.add(this.ground, createGridLines(size), this.cubes, this.ghost)
    this.scene.add(...createLights(size))

    new ResizeObserver(() => this.fitToCanvas()).observe(canvas)
    this.fitToCanvas()
  }

  start() {
    const clock = new THREE.Clock()
    this.renderer.setAnimationLoop(() => {
      this.camera.advance(clock.getDelta())
      this.renderer.render(this.scene, this.camera.camera)
    })
  }

  show(world: World) {
    this.shownCubes = world.listCubes()
    const placement = new THREE.Matrix4()
    this.shownCubes.forEach(({ x, y, z }, index) => {
      this.cubes.setMatrixAt(index, placement.makeTranslation(x + 0.5, y + 0.5, z + 0.5))
      this.cubes.setColorAt(index, colorForLevel(y, this.size.height))
    })
    this.cubes.count = this.shownCubes.length
    this.cubes.instanceMatrix.needsUpdate = true
    if (this.cubes.instanceColor) this.cubes.instanceColor.needsUpdate = true
    this.cubes.computeBoundingSphere()
  }

  showPlacementGhost(position: Position) {
    this.showGhost(position, '#ffffff')
  }

  showErasureGhost(position: Position) {
    this.showGhost(position, '#ff4d4d')
  }

  hideGhost() {
    this.ghost.visible = false
  }

  pick(pointer: PointerEvent): Pick | undefined {
    this.aimAt(pointer)
    const [hit] = this.raycaster.intersectObjects([this.cubes, this.ground], false)
    if (!hit) return undefined
    if (hit.object === this.cubes && hit.instanceId !== undefined && hit.face) {
      const cube = this.shownCubes[hit.instanceId]
      const { x, y, z } = hit.face.normal
      return { cube, nextTo: { x: cube.x + x, y: cube.y + y, z: cube.z + z } }
    }
    const { x, z } = this.board.worldToLocal(hit.point.clone())
    return { nextTo: { x: Math.floor(x), y: 0, z: Math.floor(z) } }
  }

  pickColumn(pointer: PointerEvent, atHeight: number): Column | undefined {
    this.aimAt(pointer)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -atHeight)
    const point = this.raycaster.ray.intersectPlane(plane, new THREE.Vector3())
    if (!point) return undefined
    const { x, z } = this.board.worldToLocal(point)
    return { x: Math.floor(x), z: Math.floor(z) }
  }

  private aimAt(pointer: PointerEvent) {
    const bounds = this.canvas.getBoundingClientRect()
    const screenPoint = new THREE.Vector2(
      ((pointer.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((pointer.clientY - bounds.top) / bounds.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(screenPoint, this.camera.camera)
  }

  private showGhost({ x, y, z }: Position, color: string) {
    this.ghost.position.set(x + 0.5, y + 0.5, z + 0.5)
    this.ghost.material.color.set(color)
    this.ghost.visible = true
  }

  private fitToCanvas() {
    const { clientWidth, clientHeight } = this.canvas
    this.renderer.setSize(clientWidth, clientHeight, false)
    this.camera.fitTo(clientWidth, clientHeight)
  }
}

function createGround({ width, depth }: WorldSize) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: '#8fd16a' }),
  )
  ground.position.set(width / 2, 0, depth / 2)
  ground.receiveShadow = true
  return ground
}

function createGridLines({ width, depth }: WorldSize) {
  const grid = new THREE.GridHelper(Math.max(width, depth), Math.max(width, depth), '#6fae4f', '#6fae4f')
  grid.position.set(width / 2, 0.01, depth / 2)
  return grid
}

function createCubes({ width, height, depth }: WorldSize) {
  const cubes = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial(),
    width * height * depth,
  )
  cubes.count = 0
  cubes.castShadow = true
  cubes.receiveShadow = true
  return cubes
}

function createGhost() {
  const ghost = new THREE.Mesh(
    new THREE.BoxGeometry(1.02, 1.02, 1.02),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.45, depthWrite: false }),
  )
  ghost.visible = false
  return ghost
}

function createLights({ width, depth }: WorldSize) {
  const sun = new THREE.DirectionalLight('#ffffff', 2)
  sun.position.set(width * 0.4, 40, depth * 0.7)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  const reach = Math.max(width, depth)
  Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, far: 120 })
  return [new THREE.HemisphereLight('#ffffff', '#7a9a6a', 1.6), sun]
}

function colorForLevel(level: number, height: number) {
  return new THREE.Color().setHSL(0.08 - (level / height) * 0.08, 0.55, 0.45 + (level / height) * 0.35)
}
