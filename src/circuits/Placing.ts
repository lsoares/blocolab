import type { Axis, Spot } from '../stage/Grid.ts'
import type { Board, Piece } from './Board.ts'
import type { BoardView } from './BoardView.ts'

export type Tool = Piece['kind'] | 'eraser'

export class Placing {
  private tool: Tool = 'wire'
  private gesture: 'none' | 'turning' | 'wiring' | 'erasing' = 'none'
  private gestureStart: Spot = { x: 0, z: 0 }
  private wiredUpTo: Spot = { x: 0, z: 0 }
  private wireStarted = false
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
    canvas.addEventListener('focus', () => {
      if (canvas.matches(':focus-visible')) this.previewAt(this.cursor, this.cursorAxis)
    })
    canvas.addEventListener('blur', () => this.view.hideGhost())
  }

  private press(event: PointerEvent, canvas: HTMLCanvasElement) {
    if (!event.isPrimary || event.button !== 0) return
    const spot = this.findSpot(event)
    if (!spot) return
    canvas.setPointerCapture(event.pointerId)
    if (this.tool === 'eraser') return this.startErasing(spot)
    if (this.isTappingASwitchWithTheSwitch(spot)) return this.toggleSwitch(spot)
    if (this.tool === 'wire') return this.startWiring(spot)
    this.gesture = 'turning'
    this.gestureStart = spot
    this.previewAt(spot, 'horizontal')
  }

  private move(event: PointerEvent) {
    if (!event.isPrimary) return
    const spot = this.findSpot(event)
    if (!spot) return
    if (this.gesture === 'erasing') return this.erase(spot)
    if (this.gesture === 'wiring') return this.extendWire(spot)
    if (this.gesture === 'turning') return this.previewAt(this.gestureStart, axisOfDrag(this.gestureStart, spot))
    if (this.tool === 'eraser') return this.previewErasure(spot)
    if (this.tool === 'wire') return this.view.hideGhost()
    this.previewAt(spot, 'horizontal')
  }

  private release(event: PointerEvent) {
    if (!event.isPrimary) return
    if (this.gesture === 'turning')
      this.placeAt(this.gestureStart, axisOfDrag(this.gestureStart, this.findSpot(event) ?? this.gestureStart))
    if (this.gesture === 'wiring') this.board.endStroke()
    if (this.gesture === 'erasing') this.board.endStroke()
    this.gesture = 'none'
  }

  private cancel() {
    if (this.gesture === 'wiring' || this.gesture === 'erasing') this.board.endStroke()
    this.gesture = 'none'
    this.view.hideGhost()
  }

  private startWiring(spot: Spot) {
    this.gesture = 'wiring'
    this.wiredUpTo = spot
    this.wireStarted = false
    this.board.startStroke()
    this.view.hideGhost()
  }

  private extendWire(spot: Spot) {
    if (spot.x === this.wiredUpTo.x && spot.z === this.wiredUpTo.z) return
    const cells = this.wireStarted
      ? pathBetween(this.wiredUpTo, spot)
      : [this.wiredUpTo, ...pathBetween(this.wiredUpTo, spot)]
    for (const cell of cells) {
      if (this.board.hasRoomFor(cell)) this.board.placePiece({ kind: 'wire', spot: cell })
    }
    this.wireStarted = true
    this.wiredUpTo = spot
    this.onBoardChanged()
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

  private placeAt(spot: Spot, axis: Axis) {
    if (this.tool === 'eraser') return
    this.board.placePiece(buildPiece(this.tool, spot, axis))
    this.onBoardChanged()
    this.view.hideGhost()
  }

  private isTappingASwitchWithTheSwitch(spot: Spot) {
    return this.tool === 'switch' && this.board.findPieceAt(spot)?.kind === 'switch'
  }

  private previewAt(spot: Spot, axis: Axis) {
    if (this.tool === 'eraser') return this.previewErasure(spot)
    if (this.isTappingASwitchWithTheSwitch(spot)) return this.view.hideGhost()
    this.view.showPlacementGhost(buildPiece(this.tool, spot, axis))
  }

  private previewErasure(spot: Spot) {
    if (this.board.findPieceAt(spot)) this.view.showErasureGhost(spot)
    else this.view.hideGhost()
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
    this.previewAt(this.cursor, this.cursorAxis)
  }

  private moveCursor({ dx, dz }: { dx: number; dz: number }) {
    this.cursorAxis = dx === 0 ? 'vertical' : 'horizontal'
    const next = { x: this.cursor.x + dx, z: this.cursor.z + dz }
    if (this.board.isInside(next)) this.cursor = next
  }

  private useToolAtCursor() {
    if (this.tool === 'eraser') this.board.eraseAt(this.cursor)
    else if (this.isTappingASwitchWithTheSwitch(this.cursor)) this.board.toggleSwitchAt(this.cursor)
    else this.board.placePiece(buildPiece(this.tool, this.cursor, this.cursorAxis))
    this.onBoardChanged()
  }
}

const arrowSteps: Record<string, { dx: number; dz: number }> = {
  ArrowUp: { dx: 0, dz: -1 },
  ArrowRight: { dx: 1, dz: 0 },
  ArrowDown: { dx: 0, dz: 1 },
  ArrowLeft: { dx: -1, dz: 0 },
}

function buildPiece(kind: Piece['kind'], spot: Spot, axis: Axis): Piece {
  if (kind === 'wire') return { kind, spot }
  if (kind === 'switch') return { kind, spot, axis, closed: false }
  return { kind, spot, axis }
}

function axisOfDrag(from: Spot, to: Spot): Axis {
  return Math.abs(to.x - from.x) >= Math.abs(to.z - from.z) ? 'horizontal' : 'vertical'
}

function pathBetween(from: Spot, to: Spot): Spot[] {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const horizontalFirst = Math.abs(dx) >= Math.abs(dz)
  const horizontal = Array.from({ length: Math.abs(dx) }, (_, index) => ({
    x: from.x + Math.sign(dx) * (index + 1),
    z: horizontalFirst ? from.z : to.z,
  }))
  const vertical = Array.from({ length: Math.abs(dz) }, (_, index) => ({
    x: horizontalFirst ? to.x : from.x,
    z: from.z + Math.sign(dz) * (index + 1),
  }))
  return horizontalFirst ? [...horizontal, ...vertical] : [...vertical, ...horizontal]
}
