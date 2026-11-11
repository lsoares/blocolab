export type Spot = { x: number; z: number }

export type Size = { width: number; height: number; depth: number }

export type Facing = 'north' | 'east' | 'south' | 'west'

export type Block =
  | { kind: 'cube'; origin: Spot; size: Size }
  | { kind: 'ramp'; origin: Spot; size: Size; facing: Facing }

export type Piece =
  | { kind: 'cube'; spot: Spot; height: number }
  | { kind: 'ramp'; spot: Spot; facing: Facing; low: number; high: number }

export class World {
  readonly size: Size
  private placed: Placed[] = []
  private balls: Spot[] = []
  private readonly undoable: { placed: Placed[]; balls: Spot[] }[] = []
  private stroke: 'none' | 'unchanged' | 'changed' = 'none'

  constructor(size: Size) {
    this.size = size
  }

  placeBlock(block: Block) {
    if (!this.hasRoomFor(block)) return
    this.change({ placed: [...this.placed, { block, erased: [] }] })
  }

  placeBall(spot: Spot) {
    if (!this.isInside(spot) || this.balls.some((ball) => isSameSpot(ball, spot))) return
    this.change({ balls: [...this.balls, spot] })
  }

  hasRoomFor(block: Block) {
    return this.fits(block) && spotsOf(block).every((spot) => !this.findBlockAt(spot))
  }

  eraseAt(spot: Spot) {
    if (this.balls.some((ball) => isSameSpot(ball, spot))) {
      return this.change({ balls: this.balls.filter((ball) => !isSameSpot(ball, spot)) })
    }
    const target = this.placed.find((placed) => covers(placed, spot))
    if (!target) return
    const erased = [...target.erased, spot]
    const rest = this.placed.filter((placed) => placed !== target)
    if (erased.length === spotsOf(target.block).length) this.change({ placed: rest })
    else this.change({ placed: [...rest, { block: target.block, erased }] })
  }

  startStroke() {
    this.stroke = 'unchanged'
  }

  endStroke() {
    this.stroke = 'none'
  }

  undo() {
    const previous = this.undoable.pop()
    if (!previous) return
    this.placed = previous.placed
    this.balls = previous.balls
  }

  canUndo() {
    return this.undoable.length > 0
  }

  findPieceAt(spot: Spot) {
    return this.listPieces().find((piece) => piece.spot.x === spot.x && piece.spot.z === spot.z)
  }

  measureHeightAt(spot: Spot) {
    const piece = this.findPieceAt(spot)
    if (!piece) return 0
    return piece.kind === 'cube' ? piece.height : (piece.low + piece.high) / 2
  }

  listBalls() {
    return [...this.balls]
  }

  listBlocks() {
    return this.placed.map(({ block }) => block)
  }

  listPieces(): Piece[] {
    return this.placed.flatMap(({ block, erased }) =>
      spotsOf(block)
        .filter((spot) => !erased.some((gone) => isSameSpot(gone, spot)))
        .map((spot) => cutPiece(block, spot)),
    )
  }

  isInside({ x, z }: Spot) {
    return x >= 0 && x < this.size.width && z >= 0 && z < this.size.depth
  }

  private findBlockAt(spot: Spot) {
    return this.placed.find((placed) => covers(placed, spot))?.block
  }

  private fits({ origin, size }: Block) {
    return (
      this.isInside(origin) &&
      this.isInside({ x: origin.x + size.width - 1, z: origin.z + size.depth - 1 }) &&
      size.height <= this.size.height
    )
  }

  private change({ placed = this.placed, balls = this.balls }: { placed?: Placed[]; balls?: Spot[] }) {
    if (this.stroke !== 'changed') this.undoable.push({ placed: this.placed, balls: this.balls })
    if (this.stroke === 'unchanged') this.stroke = 'changed'
    this.placed = placed
    this.balls = balls
  }
}

type Placed = { block: Block; erased: Spot[] }

function covers({ block, erased }: Placed, spot: Spot) {
  const { origin, size } = block
  const inside =
    spot.x >= origin.x && spot.x < origin.x + size.width && spot.z >= origin.z && spot.z < origin.z + size.depth
  return inside && !erased.some((gone) => isSameSpot(gone, spot))
}

function spotsOf({ origin, size }: Block) {
  return Array.from({ length: size.width * size.depth }, (_, index) => ({
    x: origin.x + (index % size.width),
    z: origin.z + Math.floor(index / size.width),
  }))
}

function cutPiece(block: Block, spot: Spot): Piece {
  if (block.kind === 'cube') return { kind: 'cube', spot, height: block.size.height }
  const { origin, size, facing } = block
  const length = facing === 'east' || facing === 'west' ? size.width : size.depth
  const step = {
    east: spot.x - origin.x,
    west: origin.x + size.width - 1 - spot.x,
    south: spot.z - origin.z,
    north: origin.z + size.depth - 1 - spot.z,
  }[facing]
  return {
    kind: 'ramp',
    spot,
    facing,
    low: (size.height * step) / length,
    high: (size.height * (step + 1)) / length,
  }
}

function isSameSpot(a: Spot, b: Spot) {
  return a.x === b.x && a.z === b.z
}
