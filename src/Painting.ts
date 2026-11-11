import type { Position, World } from './World.ts'
import type { Pick, WorldView } from './WorldView.ts'

export type Tool = 'brush' | 'eraser'

export class Painting {
  private tool = tools.brush
  private strokeLevel?: number

  constructor(
    private readonly world: World,
    private readonly view: WorldView,
    private readonly onWorldChanged: () => void,
  ) {}

  chooseTool(tool: Tool) {
    this.tool = tools[tool]
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
    const column = this.view.pickColumn(event, this.tool.findSurfaceHeight(this.strokeLevel))
    if (column) this.applyTool({ ...column, y: this.strokeLevel })
  }

  private endStroke() {
    this.strokeLevel = undefined
  }

  private previewTarget(event: PointerEvent) {
    const target = this.findTarget(event)
    if (target) this.tool.preview(this.view, target)
    else this.view.hideGhost()
  }

  private findTarget(event: PointerEvent) {
    const target = this.tool.findTarget(this.view.pick(event))
    return target && this.world.isInside(target) ? target : undefined
  }

  private applyTool(target: Position) {
    this.tool.apply(this.world, target)
    this.onWorldChanged()
    this.view.hideGhost()
  }
}

type PaintingTool = {
  findTarget(pick?: Pick): Position | undefined
  findSurfaceHeight(strokeLevel: number): number
  apply(world: World, target: Position): void
  preview(view: WorldView, target: Position): void
}

const tools: Record<Tool, PaintingTool> = {
  brush: {
    findTarget: (pick) => pick?.nextTo,
    findSurfaceHeight: (strokeLevel) => strokeLevel,
    apply: (world, target) => world.placeCube(target),
    preview: (view, target) => view.showPlacementGhost(target),
  },
  eraser: {
    findTarget: (pick) => pick?.cube,
    findSurfaceHeight: (strokeLevel) => strokeLevel + 1,
    apply: (world, target) => world.eraseCube(target),
    preview: (view, target) => view.showErasureGhost(target),
  },
}
