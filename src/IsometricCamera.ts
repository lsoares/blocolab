import * as THREE from 'three'

export class IsometricCamera {
  readonly camera = new THREE.OrthographicCamera()
  private targetQuarterTurns = 0
  private shownQuarterTurns = 0
  private targetZoom = 1
  private aspect = 1

  constructor(private readonly viewHeight: number) {}

  rotateClockwise() {
    this.targetQuarterTurns -= 1
  }

  rotateCounterClockwise() {
    this.targetQuarterTurns += 1
  }

  zoomIn() {
    this.targetZoom = Math.min(this.targetZoom * 1.25, 4)
  }

  zoomOut() {
    this.targetZoom = Math.max(this.targetZoom / 1.25, 0.5)
  }

  fitTo(width: number, height: number) {
    this.aspect = width / height
  }

  advance(seconds: number) {
    const easing = 1 - Math.exp(-seconds * 12)
    this.shownQuarterTurns += (this.targetQuarterTurns - this.shownQuarterTurns) * easing
    this.camera.zoom += (this.targetZoom - this.camera.zoom) * easing
    this.placeCamera()
  }

  private placeCamera() {
    const halfHeight = this.viewHeight / 2
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
