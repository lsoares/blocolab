export type Spot = { x: number; z: number }

export type Size = { width: number; height: number; depth: number }

export type Facing = 'north' | 'east' | 'south' | 'west'

export type Block =
  | { kind: 'cube'; origin: Spot; size: Size }
  | { kind: 'ramp'; origin: Spot; size: Size; facing: Facing }

export class World {
  readonly size: Size
  private blocks: Block[] = []
  private readonly undoable: Block[][] = []
  private stroke: 'none' | 'unchanged' | 'changed' = 'none'

  constructor(size: Size) {
    this.size = size
  }

  placeBlock(block: Block) {
    if (!this.fits(block) || this.blocks.some((placed) => overlaps(placed, block))) return
    this.change([...this.blocks, block])
  }

  eraseBlockAt(spot: Spot) {
    const block = this.findBlockAt(spot)
    if (!block) return
    this.change(this.blocks.filter((placed) => placed !== block))
  }

  startStroke() {
    this.stroke = 'unchanged'
  }

  endStroke() {
    this.stroke = 'none'
  }

  undo() {
    const previous = this.undoable.pop()
    if (previous) this.blocks = previous
  }

  canUndo() {
    return this.undoable.length > 0
  }

  findBlockAt(spot: Spot) {
    return this.blocks.find((block) => overlaps(block, { origin: spot, size: { width: 1, height: 1, depth: 1 } }))
  }

  listBlocks() {
    return [...this.blocks]
  }

  isInside({ x, z }: Spot) {
    return x >= 0 && x < this.size.width && z >= 0 && z < this.size.depth
  }

  private fits({ origin, size }: Block) {
    return (
      this.isInside(origin) &&
      this.isInside({ x: origin.x + size.width - 1, z: origin.z + size.depth - 1 }) &&
      size.height <= this.size.height
    )
  }

  private change(blocks: Block[]) {
    if (this.stroke !== 'changed') this.undoable.push(this.blocks)
    if (this.stroke === 'unchanged') this.stroke = 'changed'
    this.blocks = blocks
  }
}

function overlaps(a: Pick<Block, 'origin' | 'size'>, b: Pick<Block, 'origin' | 'size'>) {
  return (
    a.origin.x < b.origin.x + b.size.width &&
    b.origin.x < a.origin.x + a.size.width &&
    a.origin.z < b.origin.z + b.size.depth &&
    b.origin.z < a.origin.z + a.size.depth
  )
}
