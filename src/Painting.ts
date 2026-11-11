import type { Position, World } from './World.ts'
import type { WorldView } from './WorldView.ts'

export type Tool = 'brush' | 'eraser'

export class Painting {
  private tool: Tool = 'brush'
  private strokeLevel?: number

  constructor(
    private readonly world: World,
    private readonly view: WorldView,
  ) {}

  chooseTool(tool: Tool) {
    this.tool = tool
    this.view.hideGhost()
  }

  listenTo(canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', (event) => this.startStroke(event, canvas))
    canvas.addEventListener('pointermove', (event) => this.continueStroke(event))
    canvas.addEventListener('pointerup', () => this.endStroke())
    canvas.addEventListener('pointercancel', () => this.endStroke())
    canvas.addEventListener('pointerleave', () => this.view.hideGhost())
  }

  private startStroke(event: PointerEvent, canvas: HTMLCanvasElement) {
    if (!event.isPrimary || event.button !== 0) return
    const target = this.findTarget(event)
    if (!target) return
    canvas.setPointerCapture(event.pointerId)
    this.strokeLevel = target.y
    this.applyTool(target)
  }

  private continueStroke(event: PointerEvent) {
    if (!event.isPrimary) return
    if (this.strokeLevel === undefined) return this.previewTarget(event)
    const surfaceHeight = this.tool === 'brush' ? this.strokeLevel : this.strokeLevel + 1
    const column = this.view.pickColumn(event, surfaceHeight)
    if (column) this.applyTool({ ...column, y: this.strokeLevel })
  }

  private endStroke() {
    this.strokeLevel = undefined
  }

  private previewTarget(event: PointerEvent) {
    const target = this.findTarget(event)
    if (!target) return this.view.hideGhost()
    if (this.tool === 'brush') this.view.showPlacementGhost(target)
    else this.view.showErasureGhost(target)
  }

  private findTarget(event: PointerEvent) {
    const pick = this.view.pick(event)
    const target = this.tool === 'brush' ? pick?.nextTo : pick?.cube
    return target && this.world.isInside(target) ? target : undefined
  }

  private applyTool(target: Position) {
    if (this.tool === 'brush') this.world.placeCube(target)
    else this.world.eraseCube(target)
    this.view.show(this.world)
    this.view.hideGhost()
  }
}
