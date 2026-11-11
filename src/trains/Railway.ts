import type { Axis, BoardSize, Side, Spot } from '../stage/Grid.ts'
import {
  aimPoints,
  alignMountains,
  bridgeCrossings,
  findLinkedSides,
  findWaterSides,
  isRailPiece,
  type Route,
  turnToMeetNeighbours,
  walkRoute,
} from './Rails.ts'

export type Piece =
  | { kind: 'track'; spot: Spot }
  | { kind: 'station'; spot: Spot; axis: Axis }
  | { kind: 'mountain'; spot: Spot; axis: Axis }
  | { kind: 'bridge'; spot: Spot; axis: Axis }
  | { kind: 'points'; spot: Spot; side: Side }
  | { kind: 'signal'; spot: Spot; axis: Axis; go: boolean }
  | { kind: 'tree'; spot: Spot }
  | { kind: 'river'; spot: Spot }
  | { kind: 'lava'; spot: Spot }
  | { kind: 'road'; spot: Spot }

export class Railway {
  readonly size: BoardSize
  private pieces: Piece[] = []
  private train?: Spot
  private readonly undoable: { pieces: Piece[]; train?: Spot }[] = []
  private stroke: 'none' | 'unchanged' | 'changed' = 'none'
  private signalChanges = 0

  constructor(size: BoardSize) {
    this.size = size
  }

  placePiece(piece: Piece) {
    if (!this.isInside(piece.spot)) return
    const replaced = this.findPieceAt(piece.spot)
    if (replaced && isSamePiece(replaced, piece)) return
    this.change({ pieces: [...this.pieces.filter((placed) => placed !== replaced), piece] })
  }

  hasRoomFor(spot: Spot) {
    return this.isInside(spot) && !this.findPieceAt(spot)
  }

  placeTrain(spot: Spot) {
    if (!this.isRailAt(spot) || (this.train?.x === spot.x && this.train.z === spot.z)) return
    this.change({ train: spot })
  }

  removeTrain() {
    if (this.train) this.change({ train: null })
  }

  eraseAt(spot: Spot) {
    const piece = this.findPieceAt(spot)
    if (piece) this.change({ pieces: this.pieces.filter((placed) => placed !== piece) })
  }

  toggleSignalAt(spot: Spot) {
    const piece = this.findPieceAt(spot)
    if (piece?.kind !== 'signal') return
    this.change({ pieces: this.pieces.map((placed) => (placed === piece ? { ...piece, go: !piece.go } : placed)) })
  }

  countSignalChanges() {
    return this.signalChanges
  }

  showSignalAt(spot: Spot, go: boolean) {
    const piece = this.findPieceAt(spot)
    if (piece?.kind !== 'signal' || piece.go === go) return
    this.pieces = this.pieces.map((placed) => (placed === piece ? { ...piece, go } : placed))
    this.signalChanges++
  }

  turnPointsAt(spot: Spot) {
    const piece = this.findPieceAt(spot)
    if (piece?.kind !== 'points') return
    const linked = findLinkedSides(this.pieces, spot)
    if (linked.length < 2) return
    const side = linked[(linked.indexOf(piece.side) + 1) % linked.length]
    this.change({ pieces: this.pieces.map((placed) => (placed === piece ? { ...piece, side } : placed)) })
  }

  restore(saved: unknown) {
    const { pieces, train } = (saved ?? {}) as { pieces?: unknown; train?: Partial<Spot> }
    if (!Array.isArray(pieces)) return
    this.startOver()
    for (const piece of pieces.filter(isPiece)) this.placePiece(piece)
    if (typeof train?.x === 'number' && typeof train.z === 'number') this.placeTrain({ x: train.x, z: train.z })
    this.undoable.length = 0
  }

  startOver() {
    this.pieces = []
    this.train = undefined
    this.undoable.length = 0
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
    this.pieces = previous.pieces
    this.train = previous.train
  }

  canUndo() {
    return this.undoable.length > 0
  }

  findPieceAt(spot: Spot) {
    return this.pieces.find((piece) => piece.spot.x === spot.x && piece.spot.z === spot.z)
  }

  listPieces() {
    return [...this.pieces]
  }

  listLinkedSides(spot: Spot) {
    return findLinkedSides(this.pieces, spot)
  }

  listWaterSides(spot: Spot) {
    return findWaterSides(this.pieces, spot)
  }

  isRailAt(spot: Spot) {
    const piece = this.findPieceAt(spot)
    return piece !== undefined && isRailPiece(piece)
  }

  findTrainSpot() {
    return this.train
  }

  planRoute(): Route | undefined {
    return this.train && walkRoute(this.pieces, this.train)
  }

  isInside({ x, z }: Spot) {
    return x >= 0 && x < this.size.columns && z >= 0 && z < this.size.rows
  }

  private change(changes: { pieces?: Piece[]; train?: Spot | null }) {
    if (this.stroke !== 'changed') this.undoable.push({ pieces: this.pieces, train: this.train })
    if (this.stroke === 'unchanged') this.stroke = 'changed'
    this.pieces = aimPoints(turnToMeetNeighbours(alignMountains(bridgeCrossings(changes.pieces ?? this.pieces))))
    const train = changes.train === undefined ? this.train : (changes.train ?? undefined)
    this.train = train && this.isRailAt(train) ? train : undefined
  }
}

function isPiece(value: unknown): value is Piece {
  const piece = value as Partial<Record<'kind' | 'axis' | 'side' | 'spot', unknown>> | null
  if (typeof piece !== 'object' || piece === null) return false
  const spot = piece.spot as Partial<Spot> | undefined
  if (typeof spot?.x !== 'number' || typeof spot.z !== 'number') return false
  if (['track', 'tree', 'river', 'lava', 'road'].includes(piece.kind as string)) return true
  if (piece.kind === 'points') return typeof piece.side === 'string'
  const alongAnAxis = ['station', 'mountain', 'bridge', 'signal']
  return alongAnAxis.includes(piece.kind as string) && (piece.axis === 'horizontal' || piece.axis === 'vertical')
}

function isSamePiece(a: Piece, b: Piece) {
  if (a.kind !== b.kind) return false
  return !('axis' in a) || !('axis' in b) || a.axis === b.axis
}
