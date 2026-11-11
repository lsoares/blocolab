import type { Position, World } from './World.ts'
import type { Pick, WorldView } from './WorldView.ts'

export type Tool = 'brush' | 'eraser'

export class Painting {
  private tool = tools.brush
  private strokeLevel?: number
  private cursor: Position

  constructor(
    private readonly world: World,
    private readonly view: WorldView,
    private readonly onWorldChanged: () => void,
  ) {
    this.cursor = { x: Math.floor(world.size.width / 2), y: 0, z: Math.floor(world.size.depth / 2) }
  }

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
    canvas.addEventListener('keydown', (event) => this.pressKey(event))
    canvas.addEventListener('focus', () => this.tool.preview(this.view, this.cursor))
    canvas.addEventListener('blur', () => this.view.hideGhost())
  }

  private pressKey(event: KeyboardEvent) {
    const step = arrowSteps[event.key]
    if (step) this.moveCursor(step)
    else if (event.key === 'Enter' || event.key === ' ') this.applyTool(this.cursor)
    else return
    event.preventDefault()
    this.tool.preview(this.view, this.cursor)
  }

  private moveCursor(step: Step) {
    const { dx, dz } = turnStep(step, this.view.camera.countQuarterTurns())
    const next = { ...this.cursor, x: this.cursor.x + dx, z: this.cursor.z + dz }
    if (this.world.isInside(next)) this.cursor = next
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
