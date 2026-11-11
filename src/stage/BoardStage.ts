import * as THREE from 'three'
import { BoardCamera } from './BoardCamera.ts'
import type { BoardSize, Spot } from './Grid.ts'
import { box, paint } from './Parts.ts'

export class BoardStage {
  readonly surface = new THREE.Group()
  private readonly camera: BoardCamera
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly raycaster = new THREE.Raycaster()

  constructor(
    private readonly canvas: HTMLCanvasElement,
    size: BoardSize,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.shadowMap.enabled = true
    this.camera = new BoardCamera(size)

    this.surface.position.set(-size.columns / 2, 0, -size.rows / 2)
    this.surface.add(createPlate(size), createStuds(size), ...createRimWall(size))
    this.scene.add(this.surface, ...createLights(size))

    new ResizeObserver(() => this.fitToCanvas()).observe(canvas)
    this.fitToCanvas()
  }

  start(onFrame: (elapsedSeconds: number) => void) {
    const timer = new THREE.Timer()
    this.renderer.setAnimationLoop((timestamp) => {
      timer.update(timestamp)
      onFrame(timer.getElapsed())
      this.renderer.render(this.scene, this.camera.camera)
    })
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

  private fitToCanvas() {
    const { clientWidth, clientHeight } = this.canvas
    this.renderer.setSize(clientWidth, clientHeight, false)
    this.camera.fitTo(clientWidth, clientHeight)
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

function createLights({ columns, rows }: BoardSize) {
  const sun = new THREE.DirectionalLight('#ffffff', 2)
  sun.position.set(columns * 0.3, 40, rows * 0.8)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  const reach = Math.max(columns, rows)
  Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, far: 120 })
  return [new THREE.HemisphereLight('#ffffff', '#7a9a6a', 1.8), sun]
}
