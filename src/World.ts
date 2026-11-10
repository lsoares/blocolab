export type Position = { x: number; y: number; z: number }

export type WorldSize = { width: number; height: number; depth: number }

export class World {
  readonly size: WorldSize
  private readonly cubes = new Map<string, Position>()

  constructor(size: WorldSize) {
    this.size = size
  }

  placeCube(position: Position) {
    if (!this.isInside(position)) return
    this.cubes.set(keyOf(position), position)
  }

  eraseCube(position: Position) {
    this.cubes.delete(keyOf(position))
  }

  hasCube(position: Position) {
    return this.cubes.has(keyOf(position))
  }

  listCubes() {
    return [...this.cubes.values()]
  }

  isInside({ x, y, z }: Position) {
    const { width, height, depth } = this.size
    return x >= 0 && x < width && y >= 0 && y < height && z >= 0 && z < depth
  }
}

function keyOf({ x, y, z }: Position) {
  return `${x},${y},${z}`
}
