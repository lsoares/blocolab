import type { Block, Facing, Spot, World } from './World.ts'
import type { WorldView } from './WorldView.ts'

export type Shape = { kind: Block['kind']; height: number }

export class Painting {
  private tool: Shape | 'eraser' = { kind: 'cube', height: 1 }
  private gesture: 'none' | 'drawing' | 'erasing' = 'none'
  private drawingFrom: Spot = { x: 0, z: 0 }
  private cursor: Spot

  constructor(
    private readonly world: World,
    private readonly view: WorldView,
    private readonly onWorldChanged: () => void,
  ) {
    this.cursor = { x: Math.floor(world.size.width / 2), z: Math.floor(world.size.depth / 2) }
  }

  chooseShape(shape: Shape) {
    this.tool = shape
    this.view.hideGhost()
  }

  chooseEraser() {
    this.tool = 'eraser'
    this.view.hideGhost()
  }

  listenTo(canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', (event) => this.press(event, canvas))
    canvas.addEventListener('pointermove', (event) => this.move(event))
    canvas.addEventListener('pointerup', (event) => this.release(event))
    canvas.addEventListener('pointercancel', () => this.cancel())
    canvas.addEventListener('pointerleave', () => this.view.hideGhost())
    canvas.addEventListener('keydown', (event) => this.pressKey(event))
    canvas.addEventListener('focus', () => this.preview(this.cursor))
    canvas.addEventListener('blur', () => this.view.hideGhost())
  }

  private press(event: PointerEvent, canvas: HTMLCanvasElement) {
    if (!event.isPrimary || event.button !== 0) return
    const spot = this.findSpot(event)
    if (!spot) return
    canvas.setPointerCapture(event.pointerId)
    if (this.tool === 'eraser') return this.startErasing(spot)
    this.gesture = 'drawing'
    this.drawingFrom = spot
    this.previewBlock(this.draw(this.tool, spot))
  }

  private move(event: PointerEvent) {
    if (!event.isPrimary) return
    const spot = this.findSpot(event)
    if (!spot) return
    if (this.gesture === 'erasing') return this.erase(spot)
    if (this.gesture === 'drawing' && this.tool !== 'eraser') this.previewBlock(this.draw(this.tool, spot))
    else this.preview(spot)
  }

  private release(event: PointerEvent) {
    if (!event.isPrimary) return
    if (this.gesture === 'drawing' && this.tool !== 'eraser')
      this.placeBlock(this.draw(this.tool, this.findSpot(event) ?? this.drawingFrom))
    if (this.gesture === 'erasing') this.world.endStroke()
    this.gesture = 'none'
  }

  private cancel() {
    if (this.gesture === 'erasing') this.world.endStroke()
    this.gesture = 'none'
    this.view.hideGhost()
  }

  private startErasing(spot: Spot) {
    this.gesture = 'erasing'
    this.world.startStroke()
    this.erase(spot)
  }

  private erase(spot: Spot) {
    this.world.eraseBlockAt(spot)
    this.onWorldChanged()
    this.view.hideGhost()
  }

  private placeBlock(block: Block) {
    this.world.placeBlock(block)
    this.onWorldChanged()
    this.view.hideGhost()
  }

  private preview(spot: Spot) {
    const block = this.world.findBlockAt(spot)
    if (this.tool !== 'eraser') this.previewBlock(this.draw(this.tool, spot))
    else if (block) this.view.showErasureGhost(block)
    else this.view.hideGhost()
  }

  private previewBlock(block: Block) {
    if (this.world.hasRoomFor(block)) this.view.showPlacementGhost(block)
    else this.view.showBlockedGhost(block)
  }

  private findSpot(event: PointerEvent) {
    const spot = this.view.pickSpot(event)
    return spot && this.world.isInside(spot) ? spot : undefined
  }

  private draw(shape: Shape, to: Spot): Block {
    const from = this.gesture === 'drawing' ? this.drawingFrom : to
    const origin = { x: Math.min(from.x, to.x), z: Math.min(from.z, to.z) }
    const size = { width: Math.abs(to.x - from.x) + 1, height: shape.height, depth: Math.abs(to.z - from.z) + 1 }
    if (shape.kind === 'ramp') return { kind: 'ramp', origin, size, facing: facingOf(from, to) }
    return { kind: 'cube', origin, size }
  }

  private pressKey(event: KeyboardEvent) {
    const step = arrowSteps[event.key]
    if (step) this.moveCursor(step)
    else if (event.key === 'Enter' || event.key === ' ') this.useToolAtCursor()
    else return
    event.preventDefault()
    this.preview(this.cursor)
  }

  private moveCursor(step: Step) {
    const { dx, dz } = turnStep(step, this.view.camera.countQuarterTurns())
    const next = { x: this.cursor.x + dx, z: this.cursor.z + dz }
    if (this.world.isInside(next)) this.cursor = next
  }

  private useToolAtCursor() {
    if (this.tool === 'eraser') this.world.eraseBlockAt(this.cursor)
    else this.world.placeBlock(this.draw(this.tool, this.cursor))
    this.onWorldChanged()
  }
}

function facingOf(from: Spot, to: Spot): Facing {
  const dx = to.x - from.x
  const dz = to.z - from.z
  if (Math.abs(dz) > Math.abs(dx)) return dz > 0 ? 'south' : 'north'
  return dx < 0 ? 'west' : 'east'
}

type Step = { dx: number; dz: number }

const arrowSteps: Record<string, Step> = {
  ArrowUp: { dx: 0, dz: -1 },
  ArrowRight: { dx: 1, dz: 0 },
  ArrowDown: { dx: 0, dz: 1 },
  ArrowLeft: { dx: -1, dz: 0 },
}

function turnStep(step: Step, quarterTurns: number): Step {
  const turns = ((quarterTurns % 4) + 4) % 4
  return turns === 0 ? step : turnStep({ dx: step.dz, dz: -step.dx }, turns - 1)
}
