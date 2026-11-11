import type { Axis, Spot } from '../stage/Grid.ts'
import type { Piece, Railway } from './Railway.ts'
import type { RailwayView } from './RailwayView.ts'

export type Tool = Piece['kind'] | 'train' | 'eraser'

export class Laying {
  private tool: Tool = 'track'
  private gesture: 'none' | 'turning' | 'laying' | 'erasing' = 'none'
  private gestureStart: Spot = { x: 0, z: 0 }
  private laidUpTo: Spot = { x: 0, z: 0 }
  private trackStarted = false
  private laidKind: 'track' | 'river' = 'track'
  private cursor: Spot
  private cursorAxis: Axis = 'horizontal'
  private readonly railway: Railway
  private readonly view: RailwayView
  private readonly findEngineSpot: () => Spot | undefined
  private readonly onRailwayChanged: () => void

  constructor(
    railway: Railway,
    view: RailwayView,
    findEngineSpot: () => Spot | undefined,
    onRailwayChanged: () => void,
  ) {
    this.railway = railway
    this.view = view
    this.findEngineSpot = findEngineSpot
    this.onRailwayChanged = onRailwayChanged
    this.cursor = { x: Math.floor(railway.size.columns / 2), z: Math.floor(railway.size.rows / 2) }
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
    if (this.isTappingAControl(spot)) return this.useControl(spot)
    if (this.tool === 'track' || this.tool === 'river') return this.startLaying(spot)
    if (this.tool === 'train') return this.placeTrain(spot)
    this.gesture = 'turning'
    this.gestureStart = spot
    this.previewAt(spot, 'horizontal')
  }

  private move(event: PointerEvent) {
    if (!event.isPrimary) return
    const spot = this.findSpot(event)
    if (!spot) return
    if (this.gesture === 'erasing') return this.erase(spot)
    if (this.gesture === 'laying') return this.extendTrack(spot)
    if (this.gesture === 'turning') return this.previewAt(this.gestureStart, axisOfDrag(this.gestureStart, spot))
    if (this.tool === 'track' || this.tool === 'river') return this.view.hideGhost()
    this.previewAt(spot, 'horizontal')
  }

  private release(event: PointerEvent) {
    if (!event.isPrimary) return
    if (this.gesture === 'turning') {
      const axis = axisOfDrag(this.gestureStart, this.findSpot(event) ?? this.gestureStart)
      this.place(buildPiece(this.tool, this.gestureStart, axis))
    }
    if (this.gesture === 'laying' || this.gesture === 'erasing') this.railway.endStroke()
    this.gesture = 'none'
  }

  private cancel() {
    if (this.gesture === 'laying' || this.gesture === 'erasing') this.railway.endStroke()
    this.gesture = 'none'
    this.view.hideGhost()
  }

  private startLaying(spot: Spot) {
    this.laidKind = this.tool === 'river' ? 'river' : 'track'
    this.gesture = 'laying'
    this.laidUpTo = spot
    this.trackStarted = false
    this.railway.startStroke()
    this.view.hideGhost()
  }

  private extendTrack(spot: Spot) {
    if (spot.x === this.laidUpTo.x && spot.z === this.laidUpTo.z) return
    const cells = this.trackStarted
      ? pathBetween(this.laidUpTo, spot)
      : [this.laidUpTo, ...pathBetween(this.laidUpTo, spot)]
    for (const cell of cells) {
      if (this.railway.hasRoomFor(cell)) this.railway.placePiece({ kind: this.laidKind, spot: cell })
    }
    this.trackStarted = true
    this.laidUpTo = spot
    this.onRailwayChanged()
  }

  private startErasing(spot: Spot) {
    this.gesture = 'erasing'
    this.railway.startStroke()
    this.erase(spot)
  }

  private erase(spot: Spot) {
    const engine = this.findEngineSpot()
    if (engine && engine.x === spot.x && engine.z === spot.z) this.railway.removeTrain()
    else this.railway.eraseAt(spot)
    this.onRailwayChanged()
    this.view.hideGhost()
  }

  private useControl(spot: Spot) {
    this.railway.toggleSignalAt(spot)
    this.railway.turnPointsAt(spot)
    this.onRailwayChanged()
  }

  private placeTrain(spot: Spot) {
    this.railway.placeTrain(spot)
    this.onRailwayChanged()
    this.view.hideGhost()
  }

  private place(piece: Piece | undefined) {
    if (piece) this.railway.placePiece(piece)
    this.onRailwayChanged()
    this.view.hideGhost()
  }

  private isTappingAControl(spot: Spot) {
    const piece = this.railway.findPieceAt(spot)
    return (this.tool === 'signal' && piece?.kind === 'signal') || (this.tool === 'points' && piece?.kind === 'points')
  }

  private previewAt(spot: Spot, axis: Axis) {
    if (this.tool === 'eraser') return this.previewErasure(spot)
    if (this.isTappingAControl(spot)) return this.view.hideGhost()
    if (this.tool === 'train') return this.previewTrain(spot)
    const piece = buildPiece(this.tool, spot, axis)
    if (piece) this.view.showPlacementGhost(piece)
  }

  private previewTrain(spot: Spot) {
    if (this.railway.isRailAt(spot)) this.view.showTrainGhost(spot)
    else this.view.hideGhost()
  }

  private previewErasure(spot: Spot) {
    const engine = this.findEngineSpot()
    const hasTrain = engine?.x === spot.x && engine.z === spot.z
    if (hasTrain || this.railway.findPieceAt(spot)) this.view.showErasureGhost(spot)
    else this.view.hideGhost()
  }

  private findSpot(event: PointerEvent) {
    const spot = this.view.pickSpot(event)
    return spot && this.railway.isInside(spot) ? spot : undefined
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
    if (this.railway.isInside(next)) this.cursor = next
  }

  private useToolAtCursor() {
    if (this.tool === 'eraser') this.erase(this.cursor)
    else if (this.isTappingAControl(this.cursor)) this.useControl(this.cursor)
    else if (this.tool === 'train') this.railway.placeTrain(this.cursor)
    else this.place(buildPiece(this.tool, this.cursor, this.cursorAxis))
    this.onRailwayChanged()
  }
}

const arrowSteps: Record<string, { dx: number; dz: number }> = {
  ArrowUp: { dx: 0, dz: -1 },
  ArrowRight: { dx: 1, dz: 0 },
  ArrowDown: { dx: 0, dz: 1 },
  ArrowLeft: { dx: -1, dz: 0 },
}

function buildPiece(tool: Tool, spot: Spot, axis: Axis): Piece | undefined {
  if (tool === 'track' || tool === 'tree' || tool === 'river') return { kind: tool, spot }
  if (tool === 'signal') return { kind: tool, spot, axis, go: false }
  if (tool === 'station' || tool === 'tunnel' || tool === 'bridge' || tool === 'barrier') {
    return { kind: tool, spot, axis }
  }
  if (tool === 'points') return { kind: tool, spot, side: 'east' }
  return undefined
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
