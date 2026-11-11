import { expect, type Page, test } from '@playwright/test'
import { GamePage } from '../GamePage.ts'

test('the robot game starts with the first challenge', async ({ page }) => {
  const game = new GamePage(page)

  await game.open('robo')

  await expect(game.getChallenge()).toContainText('Leva o robô até à estrela.')
})

test('cards pile up in the program', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('robo')

  await page.getByRole('button', { name: 'Avançar' }).click()

  await expect(game.getStatus()).toHaveText('1 carta')
})

test('the robot reaches the star when the cards lead there', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('robo')
  for (const _ of [1, 2, 3]) await page.getByRole('button', { name: 'Avançar' }).click()

  await page.getByRole('button', { name: 'Executar' }).click()

  await expect(game.getChallenge()).toContainText('✓ Conseguiste!')
})

test('repeat makes the robot take three steps with one card', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('robo')
  await page.getByRole('button', { name: 'Avançar' }).click()
  await page.getByRole('button', { name: 'Repetir ×3' }).click()

  await page.getByRole('button', { name: 'Executar' }).click()

  await expect(game.getChallenge()).toContainText('✓ Conseguiste!')
})

test('repeat is not offered before any card', async ({ page }) => {
  const game = new GamePage(page)

  await game.open('robo')

  await expect(page.getByRole('button', { name: 'Repetir ×3' })).toBeDisabled()
})

test('the robot does not reach the star when the cards fall short', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('robo')
  await page.getByRole('button', { name: 'Avançar' }).click()

  await page.getByRole('button', { name: 'Executar' }).click()

  await expect(game.getStatus()).toHaveText('1 carta')
  await expect(game.getChallenge()).not.toContainText('✓ Conseguiste!')
})

test('undo takes back the last card', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('robo')
  await page.getByRole('button', { name: 'Avançar' }).click()
  await page.getByRole('button', { name: 'Virar à direita' }).click()

  await page.getByRole('button', { name: 'Desfazer' }).click()

  await expect(game.getStatus()).toHaveText('1 carta')
})

test('clearing empties the program', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('robo')
  await page.getByRole('button', { name: 'Avançar' }).click()

  await page.getByRole('button', { name: 'Limpar' }).click()

  await expect(game.getStatus()).toHaveText('0 cartas')
})

test('the next challenge brings a new course', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('robo')
  for (const _ of [1, 2, 3]) await page.getByRole('button', { name: 'Avançar' }).click()
  await page.getByRole('button', { name: 'Executar' }).click()
  await page.getByRole('button', { name: 'Próximo desafio' }).click()

  await expect(game.getChallenge()).toContainText('Vira para chegar à estrela.')
  await expect(game.getStatus()).toHaveText('0 cartas')
})

test('a rock makes the robot bump', async ({ page }) => {
  const game = new GamePage(page)
  await game.open('robo')
  await playCards(page, 'Avançar', 'Avançar', 'Avançar')
  await page.getByRole('button', { name: 'Próximo desafio' }).click()
  await playCards(page, 'Avançar', 'Avançar', 'Avançar', 'Virar à direita', 'Avançar')
  await page.getByRole('button', { name: 'Próximo desafio' }).click()
  for (const name of ['Avançar', 'Avançar']) await page.getByRole('button', { name, exact: true }).click()

  await page.getByRole('button', { name: 'Executar' }).click()

  await expect(game.getStatus()).toHaveText('2 cartas, o robô bateu numa pedra')
})

async function playCards(page: Page, ...names: string[]) {
  for (const name of names) await page.getByRole('button', { name }).click()
  await page.getByRole('button', { name: 'Executar' }).click()
  await expect(page.getByRole('button', { name: 'Próximo desafio' })).toBeVisible()
}
