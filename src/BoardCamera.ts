import * as THREE from 'three'
import type { BoardSize } from './Board.ts'

export class BoardCamera {
  readonly camera = new THREE.OrthographicCamera()

  constructor(private readonly board: BoardSize) {}

  fitTo(width: number, height: number) {
    const halfWidth = (this.board.columns + margin) / 2
    const halfHeight = Math.max((this.board.rows * Math.sin(elevation) + margin) / 2, halfWidth / (width / height))
    Object.assign(this.camera, {
      left: (-halfHeight * width) / height,
      right: (halfHeight * width) / height,
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

export function measureBoardThatFits(width: number, height: number): BoardSize {
  const cellPixels = 46
  return {
    columns: Math.min(Math.max(Math.round(width / cellPixels - margin), 8), 30),
    rows: Math.min(Math.max(Math.round((height / cellPixels - margin) / Math.sin(elevation)), 6), 20),
  }
}

const elevation = (70 * Math.PI) / 180
const margin = 2.4
