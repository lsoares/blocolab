import type { Axis, Board, Piece, Spot } from './Board.ts'
import type { BoardView } from './BoardView.ts'

export type Tool = Piece['kind'] | 'eraser'

export class Placing {
  private tool: Tool = 'battery'
  private gesture: 'none' | 'drawing' | 'erasing' = 'none'
  private drawingFrom: Spot = { x: 0, z: 0 }
  private cursor: Spot
  private cursorAxis: Axis = 'horizontal'

  constructor(
    private readonly board: Board,
    private readonly view: BoardView,
    private readonly onBoardChanged: () => void,
  ) {
    this.cursor = { x: Math.floor(board.size.columns / 2), z: Math.floor(board.size.rows / 2) }
  }

  chooseTool(tool: Tool) {
    this.tool = tool
    this.view.hideGhost()
  }

  listenTo(canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', (event) => this.press(event, canvas))
    canvas.addEventListener('pointermove', (event) => this.move(event))
    canvas.addEventListener('pointerup', (event) => this.release(event))
    canvas.addEventListener('pointercancel', () => this.cancel())
    canvas.addEventListener('pointerleave', () => this.view.hideGhost())
    canvas.addEventListener('keydown', (event) => this.pressKey(event))
    canvas.addEventListener('focus', () => this.preview(this.cursor, this.cursor, this.cursorAxis))
    canvas.addEventListener('blur', () => this.view.hideGhost())
  }

  private press(event: PointerEvent, canvas: HTMLCanvasElement) {
    if (!event.isPrimary || event.button !== 0) return
    const spot = this.findSpot(event)
    if (!spot) return
    canvas.setPointerCapture(event.pointerId)
    if (this.tool === 'eraser') return this.startErasing(spot)
    if (this.board.findPieceAt(spot)?.kind === 'switch') return this.toggleSwitch(spot)
    this.gesture = 'drawing'
    this.drawingFrom = spot
    this.preview(spot, spot, 'horizontal')
  }

  private move(event: PointerEvent) {
    if (!event.isPrimary) return
    const spot = this.findSpot(event)
    if (!spot) return
    if (this.gesture === 'erasing') return this.erase(spot)
    if (this.gesture === 'drawing') return this.preview(this.drawingFrom, spot, 'horizontal')
    if (this.tool === 'eraser') return this.previewErasure(spot)
    this.preview(spot, spot, 'horizontal')
  }

  private release(event: PointerEvent) {
    if (!event.isPrimary) return
    if (this.gesture === 'drawing') this.place(this.drawingFrom, this.findSpot(event) ?? this.drawingFrom, 'horizontal')
    if (this.gesture === 'erasing') this.board.endStroke()
    this.gesture = 'none'
  }

  private cancel() {
    if (this.gesture === 'erasing') this.board.endStroke()
    this.gesture = 'none'
    this.view.hideGhost()
  }

  private startErasing(spot: Spot) {
    this.gesture = 'erasing'
    this.board.startStroke()
    this.erase(spot)
  }

  private erase(spot: Spot) {
    this.board.eraseAt(spot)
    this.onBoardChanged()
    this.view.hideGhost()
  }

  private toggleSwitch(spot: Spot) {
    this.board.toggleSwitchAt(spot)
    this.onBoardChanged()
  }

  private place(from: Spot, to: Spot, tapAxis: Axis) {
    this.board.startStroke()
    for (const piece of this.planPieces(from, to, tapAxis)) this.board.placePiece(piece)
    this.board.endStroke()
    this.onBoardChanged()
    this.view.hideGhost()
  }

  private preview(from: Spot, to: Spot, tapAxis: Axis) {
    if (this.board.findPieceAt(to)?.kind === 'switch' && from === to) return this.view.hideGhost()
    const pieces = this.planPieces(from, to, tapAxis)
    if (pieces.length > 0) return this.view.showPlacementGhost(pieces, false)
    this.view.showPlacementGhost(this.planPieces(from, to, tapAxis, true), true)
  }

  private previewErasure(spot: Spot) {
    if (this.board.findPieceAt(spot)) this.view.showErasureGhost(spot)
    else this.view.hideGhost()
  }

  private planPieces(from: Spot, to: Spot, tapAxis: Axis, ignoringRoom = false): Piece[] {
    if (this.tool === 'eraser') return []
    const axis = from.x === to.x && from.z === to.z ? tapAxis : runAxisOf(from, to)
    const spots = this.tool === 'wire' ? runBetween(from, to, axis) : [from]
    return spots
      .filter((spot) => ignoringRoom || this.board.hasRoomFor(spot))
      .map((spot) => this.buildPiece(spot, axis))
  }

  private buildPiece(spot: Spot, axis: Axis): Piece {
    if (this.tool === 'wire' || this.tool === 'eraser') return { kind: 'wire', spot }
    if (this.tool === 'switch') return { kind: 'switch', spot, axis, closed: false }
    return { kind: this.tool, spot, axis }
  }

  private findSpot(event: PointerEvent) {
    const spot = this.view.pickSpot(event)
    return spot && this.board.isInside(spot) ? spot : undefined
  }

  private pressKey(event: KeyboardEvent) {
    const arrow = arrowSteps[event.key]
    if (arrow) this.moveCursor(arrow)
    else if (event.key === 'Enter' || event.key === ' ') this.useToolAtCursor()
    else return
    event.preventDefault()
    if (this.tool === 'eraser') this.previewErasure(this.cursor)
    else this.preview(this.cursor, this.cursor, this.cursorAxis)
  }

  private moveCursor({ dx, dz }: { dx: number; dz: number }) {
    this.cursorAxis = dx === 0 ? 'vertical' : 'horizontal'
    const next = { x: this.cursor.x + dx, z: this.cursor.z + dz }
    if (this.board.isInside(next)) this.cursor = next
  }

  private useToolAtCursor() {
    if (this.tool === 'eraser') this.board.eraseAt(this.cursor)
    else if (this.board.findPieceAt(this.cursor)?.kind === 'switch') this.board.toggleSwitchAt(this.cursor)
    else for (const piece of this.planPieces(this.cursor, this.cursor, this.cursorAxis)) this.board.placePiece(piece)
    this.onBoardChanged()
  }
}

const arrowSteps: Record<string, { dx: number; dz: number }> = {
  ArrowUp: { dx: 0, dz: -1 },
  ArrowRight: { dx: 1, dz: 0 },
  ArrowDown: { dx: 0, dz: 1 },
  ArrowLeft: { dx: -1, dz: 0 },
}

function runAxisOf(from: Spot, to: Spot): Axis {
  return Math.abs(to.x - from.x) >= Math.abs(to.z - from.z) ? 'horizontal' : 'vertical'
}

function runBetween(from: Spot, to: Spot, axis: Axis): Spot[] {
  const length = axis === 'horizontal' ? to.x - from.x : to.z - from.z
  return Array.from({ length: Math.abs(length) + 1 }, (_, index) => {
    const step = Math.sign(length) * index
    return axis === 'horizontal' ? { x: from.x + step, z: from.z } : { x: from.x, z: from.z + step }
  })
}
