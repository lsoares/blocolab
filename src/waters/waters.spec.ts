import { expect, test } from '@playwright/test'
import { buildLoopAround } from '../circuits/buildLoopAround.ts'
import { GamePage } from '../GamePage.ts'

const names = { wire: 'Cano', source: 'Bomba' }

test('the water game starts with the pipe chosen', async ({ page }) => {
  const game = new GamePage(page)

  await game.open('agua')

  await expect(page.getByRole('radio', { name: 'Cano' })).toBeChecked()
})

test('the first water challenge asks for the fountain', async ({ page }) => {
  const game = new GamePage(page)

  await game.open('agua')

  await expect(game.getChallenge()).toContainText('Faz o chafariz jorrar.')
})

test('a closed loop makes the fountain spout', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('agua')

  await buildLoopAround(game, 'Chafariz', names)

  await expect(game.getStatus()).toHaveText('8 peças, 1 chafariz a jorrar')
})

test('a closed loop makes the water wheel turn', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('agua')

  await buildLoopAround(game, 'Roda de água', names)

  await expect(game.getStatus()).toHaveText('8 peças, 1 roda a girar')
})

test('a closed loop makes the bubbler bubble', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('agua')

  await buildLoopAround(game, 'Borbulhador', names)

  await expect(game.getStatus()).toHaveText('8 peças, 1 borbulhador a borbulhar')
})

test('a spouting fountain completes the first challenge', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('agua')

  await buildLoopAround(game, 'Chafariz', names)

  await expect(game.getChallenge()).toContainText('Conseguiste!')
})

test('hovering a tap says whether it is open', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('agua')
  await game.choosePiece('Torneira')
  await game.getBoard().click()

  await game.hoverBoard()

  await expect(game.getPieceName()).toHaveText('Torneira (fechada)')
})

test('a fountain without water says it is dry', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('agua')
  await game.choosePiece('Chafariz')
  await game.getBoard().click()

  await game.hoverBoard()

  await expect(game.getPieceName()).toHaveText('Chafariz (seco)')
})
