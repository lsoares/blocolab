import { expect, test } from '@playwright/test'
import { buildLoopAround, CircuitPage } from './CircuitPage.ts'

test('the first challenge asks to light the lamp', async ({ page }) => {
  const circuit = new CircuitPage(page)

  await circuit.open()

  await expect(circuit.getChallenge()).toContainText('Acende a lâmpada.')
})

test('the next challenge waits until the goal is reached', async ({ page }) => {
  const circuit = new CircuitPage(page)

  await circuit.open()

  await expect(circuit.getNextChallengeButton()).toBeHidden()
})

test('lighting the lamp completes the challenge', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()

  await buildLoopAround(circuit, 'Lâmpada')

  await expect(circuit.getChallenge()).toContainText('Conseguiste!')
})

test('a loop that does not light the lamp leaves the challenge open', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()

  await buildLoopAround(circuit, 'Campainha')

  await expect(circuit.getChallenge()).not.toContainText('Conseguiste!')
})

test('the next challenge starts on a clean board', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()
  await buildLoopAround(circuit, 'Lâmpada')

  await circuit.getNextChallengeButton().click()

  await expect(circuit.getStatus()).toHaveText('0 peças')
})

test('the next challenge asks for the motor', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()
  await buildLoopAround(circuit, 'Lâmpada')

  await circuit.getNextChallengeButton().click()

  await expect(circuit.getChallenge()).toContainText('Faz o motor rodar.')
})

test('the challenge reached is remembered on the next visit', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()
  await buildLoopAround(circuit, 'Lâmpada')
  await circuit.getNextChallengeButton().click()

  await circuit.reload()

  await expect(circuit.getChallenge()).toContainText('Faz o motor rodar.')
})
