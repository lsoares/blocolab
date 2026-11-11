type ToolDescription = { value: string; name: string; icon: string }

export type GameSession = {
  describeBoard(): string
  isChallengeMet(level: number): boolean
  canUndo(): boolean
  undo(): void
  startOver(): void
  startChallenge?(level: number): void
  chooseTool(value: string): void
  nameUnder(pointer: PointerEvent): string | undefined
}

export type Game = {
  id: string
  name: string
  icon: string
  tools: ToolDescription[]
  goals: string[]
  startSession(canvas: HTMLCanvasElement, onChanged: () => void): GameSession
}
