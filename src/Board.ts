import { analyzeCircuit, type CircuitState, findLinkedSides, type Side } from './Circuit.ts'

export type Spot = { x: number; z: number }

export type Axis = 'horizontal' | 'vertical'

export type Piece =
  | { kind: 'wire'; spot: Spot }
  | { kind: 'switch'; spot: Spot; axis: Axis; closed: boolean }
  | { kind: 'battery' | 'lamp' | 'motor' | 'buzzer'; spot: Spot; axis: Axis }

export type BoardSize = { columns: number; rows: number }

export class Board {
  readonly size: BoardSize
  private pieces: Piece[] = []
  private readonly undoable: Piece[][] = []
  private stroke: 'none' | 'unchanged' | 'changed' = 'none'
  private circuit?: CircuitState

  constructor(size: BoardSize) {
    this.size = size
  }

  placePiece(piece: Piece) {
    if (!this.hasRoomFor(piece.spot)) return
    this.change([...this.pieces, piece])
  }

  hasRoomFor(spot: Spot) {
    return this.isInside(spot) && !this.findPieceAt(spot)
  }

  eraseAt(spot: Spot) {
    const piece = this.findPieceAt(spot)
    if (!piece) return
    this.change(this.pieces.filter((placed) => placed !== piece))
  }

  toggleSwitchAt(spot: Spot) {
    const piece = this.findPieceAt(spot)
    if (piece?.kind !== 'switch') return
    this.change(this.pieces.map((placed) => (placed === piece ? { ...piece, closed: !piece.closed } : placed)))
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
    this.pieces = previous
    this.circuit = undefined
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

  listLinkedSides(spot: Spot): Side[] {
    return findLinkedSides(this.pieces, spot)
  }

  isPoweredAt(spot: Spot) {
    return this.measureCircuit().powered.some((powered) => powered.x === spot.x && powered.z === spot.z)
  }

  hasShortCircuit() {
    return this.measureCircuit().short
  }

  isInside({ x, z }: Spot) {
    return x >= 0 && x < this.size.columns && z >= 0 && z < this.size.rows
  }

  private measureCircuit() {
    this.circuit ??= analyzeCircuit(this.pieces)
    return this.circuit
  }

  private change(pieces: Piece[]) {
    if (this.stroke !== 'changed') this.undoable.push(this.pieces)
    if (this.stroke === 'unchanged') this.stroke = 'changed'
    this.pieces = pieces
    this.circuit = undefined
  }
}
