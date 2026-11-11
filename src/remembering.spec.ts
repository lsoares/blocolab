import { expect, test } from '@playwright/test'
import { GamePage } from './GamePage.ts'

test('the circuit is still there after the page is reloaded', async ({ page }) => {
  const game = new GamePage(page)
  await game.open()
  await game.choosePiece('Fio')
  await game.placeAtCursor()

  await page.reload()

  await expect(game.getStatus()).toHaveText('1 peça')
})

test('the railway is still there after the page is reloaded', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('comboio')
  await game.choosePiece('Montanha')
  await game.placeAtCursor()

  await page.reload()

  await expect(game.getStatus()).toHaveText('9 peças')
})

test('the robot cards are still there after the page is reloaded', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('robo')
  await page.getByRole('button', { name: 'Avançar' }).click()

  await page.reload()

  await expect(game.getStatus()).toHaveText('1 carta')
})

test('each game keeps its own board', async ({ page }) => {
  const game = new GamePage(page)
  await game.open()
  await game.choosePiece('Fio')
  await game.placeAtCursor()
  await page.getByRole('link', { name: 'Água' }).click()

  await expect(game.getStatus()).toHaveText('0 peças')
})
