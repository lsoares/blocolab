import type { Page } from '@playwright/test'

export class CircuitPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/')
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

  getNextChallengeButton() {
    return this.page.getByRole('button', { name: 'Próximo desafio' })
  }

  async reload() {
    await this.page.reload()
  }
}

export async function buildLoopAround(circuit: CircuitPage, bottomPiece: string) {
  await circuit.choosePiece('Fio')
  await circuit.moveCursor('ArrowUp', 'ArrowLeft')
  await circuit.placeAtCursor()
  await circuit.moveCursor('ArrowDown')
  await circuit.placeAtCursor()
  await circuit.moveCursor('ArrowDown')
  await circuit.placeAtCursor()
  await circuit.choosePiece(bottomPiece)
  await circuit.moveCursor('ArrowRight')
  await circuit.placeAtCursor()
  await circuit.choosePiece('Fio')
  await circuit.moveCursor('ArrowRight')
  await circuit.placeAtCursor()
  await circuit.moveCursor('ArrowUp')
  await circuit.placeAtCursor()
  await circuit.moveCursor('ArrowUp')
  await circuit.placeAtCursor()
  await circuit.choosePiece('Pilha')
  await circuit.moveCursor('ArrowLeft')
  await circuit.placeAtCursor()
}
