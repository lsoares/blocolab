import type { Page } from '@playwright/test'

export class GamePage {
  constructor(private readonly page: Page) {}

  async open(gameId = '') {
    await this.page.goto(`/#${gameId}`)
  }

  async choosePiece(name: string) {
    await this.page.getByRole('radio', { name }).check()
    await this.getBoard().focus()
  }

  async moveCursor(...keys: string[]) {
    for (const key of keys) await this.page.keyboard.press(key)
  }

  async placeAtCursor() {
    await this.page.keyboard.press('Enter')
  }

  getBoard() {
    return this.page.getByRole('application', { name: 'Tabuleiro' })
  }

  getStatus() {
    return this.page.getByRole('status')
  }

  getChallenge() {
    return this.page.getByRole('region', { name: 'Desafio' })
  }

  async pressBoardAt(columnsAside: number, rowsAside: number) {
    await this.moveMouseOnBoard(columnsAside, rowsAside)
    await this.page.mouse.down()
  }

  async dragBoardTo(columnsAside: number, rowsAside: number) {
    await this.moveMouseOnBoard(columnsAside, rowsAside)
  }

  async releaseBoard() {
    await this.page.mouse.up()
  }

  private async moveMouseOnBoard(columnsAside: number, rowsAside: number) {
    const box = await this.getBoard().boundingBox()
    await this.page.mouse.move(
      (box?.x ?? 0) + (box?.width ?? 0) / 2 + columnsAside,
      (box?.y ?? 0) + (box?.height ?? 0) / 2 + rowsAside,
      { steps: 8 },
    )
  }

  getPieceName() {
    return this.page.getByRole('tooltip')
  }

  async hoverBoard() {
    await this.page.mouse.move(0, 0)
    await this.getBoard().hover()
  }

  async hoverTool(name: string) {
    await this.page.getByRole('radio', { name }).hover()
  }

  getNextChallengeButton() {
    return this.page.getByRole('button', { name: 'Próximo desafio' })
  }

  async reload() {
    await this.page.reload()
  }
}
