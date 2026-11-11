import * as THREE from 'three'
import type { BoardSize } from './Board.ts'

export class BoardCamera {
  readonly camera = new THREE.OrthographicCamera()
  private zoomLevel = 0
  private zoomSpeed = 0
  private aspect = 1

  constructor(
    private readonly board: BoardSize,
    private readonly reducedMotion: MediaQueryList,
  ) {}

  zoomIn() {
    this.pushZoom(0.35)
  }

  zoomOut() {
    this.pushZoom(-0.35)
  }

  zoomWithWheel(scrolledPixels: number) {
    this.pushZoom(-scrolledPixels * 0.0015)
  }

  fitTo(width: number, height: number) {
    this.aspect = width / height
  }

  advance(seconds: number) {
    const glidedLevel = this.zoomLevel + this.zoomSpeed * seconds
    this.zoomLevel = clampZoomLevel(glidedLevel)
    this.zoomSpeed = glidedLevel === this.zoomLevel ? this.zoomSpeed * Math.exp(-seconds * zoomFrictionPerSecond) : 0
    this.camera.zoom = Math.exp(this.zoomLevel)
    this.placeCamera()
  }

  private pushZoom(distance: number) {
    if (this.reducedMotion.matches) this.zoomLevel = clampZoomLevel(this.zoomLevel + distance)
    else this.zoomSpeed += distance * zoomFrictionPerSecond
  }

  private placeCamera() {
    const elevation = (70 * Math.PI) / 180
    const halfWidth = (this.board.columns + 3) / 2
    const halfHeight = Math.max((this.board.rows * Math.sin(elevation) + 3) / 2, halfWidth / this.aspect)
    Object.assign(this.camera, {
      left: -halfHeight * this.aspect,
      right: halfHeight * this.aspect,
      top: halfHeight,
      bottom: -halfHeight,
      near: 0.1,
      far: 500,
    })
    this.camera.position.set(0, 100 * Math.sin(elevation), 100 * Math.cos(elevation))
    this.camera.lookAt(0, 0, 0)
    this.camera.updateProjectionMatrix()
  }
}

const zoomFrictionPerSecond = 4

function clampZoomLevel(level: number) {
  return Math.min(Math.max(level, Math.log(0.7)), Math.log(2))
}
