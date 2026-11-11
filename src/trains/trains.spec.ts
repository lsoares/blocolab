import { expect, test } from '@playwright/test'
import { GamePage } from '../GamePage.ts'
import { buildRingOfTrack } from './buildRingOfTrack.ts'

test('the train game starts with the track chosen', async ({ page }) => {
  const game = new GamePage(page)

  await game.open('comboio')

  await expect(page.getByRole('radio', { name: 'Carril' })).toBeChecked()
})

test('the first train challenge asks for the train to run', async ({ page }) => {
  const game = new GamePage(page)

  await game.open('comboio')

  await expect(game.getChallenge()).toContainText('Põe o comboio a andar.')
})

test('a track appears while it is still being dragged', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('comboio')
  await game.pressBoardAt(-100, 0)

  await game.dragBoardTo(100, 0)

  await expect(game.getStatus()).toHaveText(/^[2-9] peças$/)
})

test('a train on a closed loop goes round', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('comboio')
  await buildRingOfTrack(game, true)
  await game.choosePiece('Comboio')

  await game.placeAtCursor()

  await expect(game.getStatus()).toHaveText('8 peças, comboio a dar voltas')
})

test('a train on a line with an end heads for the end', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('comboio')
  await buildRingOfTrack(game, false)
  await game.choosePiece('Comboio')

  await game.placeAtCursor()

  await expect(game.getStatus()).toHaveText('7 peças, comboio a caminho do fim da linha')
})

test('a train running completes the first challenge', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('comboio')
  await buildRingOfTrack(game, true)
  await game.choosePiece('Comboio')

  await game.placeAtCursor()

  await expect(game.getChallenge()).toContainText('Conseguiste!')
})

test('the next train challenge asks for a loop', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('comboio')
  await buildRingOfTrack(game, true)
  await game.choosePiece('Comboio')
  await game.placeAtCursor()

  await game.getNextChallengeButton().click()

  await expect(game.getChallenge()).toContainText('Faz o comboio dar a volta.')
})

test('hovering a track says what it is', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('comboio')
  await game.pressBoardAt(-100, 0)
  await game.dragBoardTo(100, 0)
  await game.releaseBoard()

  await game.hoverBoard()

  await expect(game.getPieceName()).toHaveText('Carril')
})

test('a signal turns green when it is tapped', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('comboio')
  await game.choosePiece('Semáforo')
  await game.getBoard().click()
  await game.getBoard().click()

  await game.hoverBoard()

  await expect(game.getPieceName()).toHaveText('Semáforo (verde)')
})

test('placing a station over a track replaces it', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('comboio')
  await game.pressBoardAt(-100, 0)
  await game.dragBoardTo(100, 0)
  await game.releaseBoard()
  await game.choosePiece('Estação')
  await game.getBoard().click()

  await game.hoverBoard()

  await expect(game.getPieceName()).toHaveText('Estação')
})

test('a station stretches over three cells', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('comboio')
  await game.choosePiece('Estação')

  await game.placeAtCursor()

  await expect(game.getStatus()).toHaveText('3 peças')
})

test('a mountain covers a block of cells', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('comboio')
  await game.choosePiece('Montanha')

  await game.placeAtCursor()

  await expect(game.getStatus()).toHaveText('9 peças')
})

test('undo takes back a whole mountain at once', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('comboio')
  await game.choosePiece('Montanha')
  await game.placeAtCursor()

  await page.getByRole('button', { name: 'Desfazer' }).click()

  await expect(game.getStatus()).toHaveText('0 peças')
})

test('the lava is offered among the pieces', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('comboio')

  await expect(page.getByRole('radio', { name: 'Lava' })).toBeVisible()
})

test('undo takes back a whole dragged track', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('comboio')
  await game.pressBoardAt(-100, 0)
  await game.dragBoardTo(100, 0)
  await game.releaseBoard()

  await page.getByRole('button', { name: 'Desfazer' }).click()

  await expect(game.getStatus()).toHaveText('0 peças')
})

test('placing points says where they point', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('comboio')
  await game.choosePiece('Agulha')
  await game.getBoard().click()

  await game.hoverBoard()

  await expect(game.getPieceName()).toHaveText(/^Agulha \(para /)
})

test('a river appears while it is still being dragged', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('comboio')
  await game.choosePiece('Rio')
  await game.pressBoardAt(-100, 0)

  await game.dragBoardTo(100, 0)

  await expect(game.getStatus()).toHaveText(/^[2-9] peças$/)
})

test('a river says what it is', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('comboio')
  await game.choosePiece('Rio')
  await game.pressBoardAt(-100, 0)
  await game.dragBoardTo(100, 0)
  await game.releaseBoard()

  await game.hoverBoard()

  await expect(game.getPieceName()).toHaveText('Rio')
})

test('a track dragged across a river makes a bridge by itself', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('comboio')
  await game.choosePiece('Rio')
  await game.pressBoardAt(0, -60)
  await game.dragBoardTo(0, 60)
  await game.releaseBoard()
  await game.choosePiece('Carril')
  await game.pressBoardAt(-100, 0)
  await game.dragBoardTo(100, 0)
  await game.releaseBoard()

  await game.hoverBoard()

  await expect(game.getPieceName()).toHaveText('Ponte')
})

test('a track dragged across lava makes a bridge by itself', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('comboio')
  await game.choosePiece('Lava')
  await game.pressBoardAt(0, -60)
  await game.dragBoardTo(0, 60)
  await game.releaseBoard()
  await game.choosePiece('Carril')
  await game.pressBoardAt(-100, 0)
  await game.dragBoardTo(100, 0)
  await game.releaseBoard()

  await game.hoverBoard()

  await expect(game.getPieceName()).toHaveText('Ponte')
})

test('a road dragged across a track makes a bridge by itself', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('comboio')
  await game.choosePiece('Carril')
  await game.pressBoardAt(-100, 0)
  await game.dragBoardTo(100, 0)
  await game.releaseBoard()
  await game.choosePiece('Estrada')
  await game.pressBoardAt(0, -60)
  await game.dragBoardTo(0, 60)
  await game.releaseBoard()

  await game.hoverBoard()

  await expect(game.getPieceName()).toHaveText('Ponte')
})

test('the train game offers the road and the lava', async ({ page }) => {
  const game = new GamePage(page)

  await game.open('comboio')

  await expect(page.getByRole('radio', { name: 'Estrada' })).toBeVisible()
})

test('the manual bridge is gone', async ({ page }) => {
  const game = new GamePage(page)

  await game.open('comboio')

  await expect(page.getByRole('radio', { name: 'Ponte' })).toHaveCount(0)
})
