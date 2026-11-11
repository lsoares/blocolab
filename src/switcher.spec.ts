import { expect, test } from '@playwright/test'
import { buildLoopAround } from './circuits/buildLoopAround.ts'
import { GamePage } from './GamePage.ts'

test('the game opens on circuits', async ({ page }) => {
  const game = new GamePage(page)

  await game.open()

  await expect(game.getChallenge()).toContainText('Acende a lâmpada.')
})

test('the switcher takes the child to the train game', async ({ page }) => {
  const game = new GamePage(page)
  await game.open()

  await page.getByRole('link', { name: 'Comboio' }).click()

  await expect(game.getChallenge()).toContainText('Põe o comboio a andar.')
})

test('the switcher takes the child back to circuits', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('comboio')

  await page.getByRole('link', { name: 'Circuitos' }).click()

  await expect(game.getChallenge()).toContainText('Acende a lâmpada.')
})

test('the game being played is marked in the switcher', async ({ page }) => {
  const game = new GamePage(page)

  await game.open('comboio')

  await expect(page.getByRole('link', { name: 'Comboio' })).toHaveAttribute('aria-current', 'page')
})

test('each game remembers its own challenge', async ({ page }) => {
  const game = new GamePage(page)
  await game.open()
  await buildLoopAround(game, 'Lâmpada')
  await game.getNextChallengeButton().click()
  await page.getByRole('link', { name: 'Comboio' }).click()

  await page.getByRole('link', { name: 'Circuitos' }).click()

  await expect(game.getChallenge()).toContainText('Faz o motor rodar.')
})

test('the train game starts at its first challenge whatever the circuits reached', async ({ page }) => {
  const game = new GamePage(page)
  await game.open()
  await buildLoopAround(game, 'Lâmpada')
  await game.getNextChallengeButton().click()

  await page.getByRole('link', { name: 'Comboio' }).click()

  await expect(game.getChallenge()).toContainText('Põe o comboio a andar.')
})

test('the switcher offers the three games', async ({ page }) => {
  const game = new GamePage(page)

  await game.open()

  await expect(page.getByRole('navigation', { name: 'Jogos' }).getByRole('link')).toHaveCount(3)
})

test('the switcher takes the child to the water game', async ({ page }) => {
  const game = new GamePage(page)
  await game.open()

  await page.getByRole('link', { name: 'Água' }).click()

  await expect(game.getChallenge()).toContainText('Faz o chafariz jorrar.')
})
