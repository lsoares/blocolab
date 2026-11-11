import * as THREE from 'three'

export class IsometricCamera {
  readonly camera = new THREE.OrthographicCamera()
  private targetQuarterTurns = 0
  private shownQuarterTurns = 0
  private zoomLevel = 0
  private zoomSpeed = 0
  private aspect = 1

  constructor(
    private readonly viewHeight: number,
    private readonly reducedMotion: MediaQueryList,
  ) {}

  rotateClockwise() {
    this.targetQuarterTurns -= 1
  }

  rotateCounterClockwise() {
    this.targetQuarterTurns += 1
  }

  countQuarterTurns() {
    return this.targetQuarterTurns
  }

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
    const easing = this.reducedMotion.matches ? 1 : 1 - Math.exp(-seconds * 12)
    this.shownQuarterTurns += (this.targetQuarterTurns - this.shownQuarterTurns) * easing
    this.glideZoom(seconds)
    this.placeCamera()
  }

  private pushZoom(distance: number) {
    if (this.reducedMotion.matches) this.zoomLevel = clampZoomLevel(this.zoomLevel + distance)
    else this.zoomSpeed += distance * zoomFrictionPerSecond
  }

  private glideZoom(seconds: number) {
    const glidedLevel = this.zoomLevel + this.zoomSpeed * seconds
    this.zoomLevel = clampZoomLevel(glidedLevel)
    this.zoomSpeed = glidedLevel === this.zoomLevel ? this.zoomSpeed * Math.exp(-seconds * zoomFrictionPerSecond) : 0
    this.camera.zoom = Math.exp(this.zoomLevel)
  }

  private placeCamera() {
    const halfHeight = Math.max(this.viewHeight / 2, (this.viewHeight * 0.7) / this.aspect)
    Object.assign(this.camera, {
      left: -halfHeight * this.aspect,
      right: halfHeight * this.aspect,
      top: halfHeight,
      bottom: -halfHeight,
      near: 0.1,
      far: 500,
    })
    const azimuth = Math.PI / 4 + (this.shownQuarterTurns * Math.PI) / 2
    const elevation = Math.atan(1 / Math.SQRT2)
    const distance = 100
    this.camera.position.set(
      distance * Math.cos(elevation) * Math.sin(azimuth),
      distance * Math.sin(elevation),
      distance * Math.cos(elevation) * Math.cos(azimuth),
    )
    this.camera.lookAt(0, 0, 0)
    this.camera.updateProjectionMatrix()
  }
}

const zoomFrictionPerSecond = 4

function clampZoomLevel(level: number) {
  return Math.min(Math.max(level, Math.log(0.5)), Math.log(4))
}
