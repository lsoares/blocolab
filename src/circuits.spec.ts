import { expect, test } from '@playwright/test'
import { buildLoopAround, CircuitPage } from './CircuitPage.ts'

test('tapping the board places the chosen piece', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()

  await circuit.getBoard().click()

  await expect(circuit.getStatus()).toHaveText('1 peça')
})

test('dragging with the wire draws a run of wires', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()
  await circuit.choosePiece('Fio')

  await circuit.getBoard().dragTo(circuit.getBoard(), {
    sourcePosition: { x: 300, y: 300 },
    targetPosition: { x: 500, y: 300 },
    steps: 10,
  })

  await expect(circuit.getStatus()).toHaveText(/^[2-9] peças$/)
})

test('the eraser takes the tapped piece away', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()
  await circuit.getBoard().click()
  await circuit.choosePiece('Borracha')

  await circuit.getBoard().click()

  await expect(circuit.getStatus()).toHaveText('0 peças')
})

test('undo takes back the last piece', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()
  await circuit.getBoard().click()

  await page.getByRole('button', { name: 'Desfazer' }).click()

  await expect(circuit.getStatus()).toHaveText('0 peças')
})

test('a closed loop lights the lamp', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()
  await buildLoopAround(circuit, 'Lâmpada')

  await expect(circuit.getStatus()).toHaveText('8 peças, 1 lâmpada acesa')
})

test('a closed loop makes the motor run', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()
  await buildLoopAround(circuit, 'Motor')

  await expect(circuit.getStatus()).toHaveText('8 peças, 1 motor a rodar')
})

test('a closed loop makes the buzzer sound', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()
  await buildLoopAround(circuit, 'Campainha')

  await expect(circuit.getStatus()).toHaveText('8 peças, 1 campainha a tocar')
})

test('a gap in the loop puts the lamp out', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()
  await buildLoopAround(circuit, 'Lâmpada')
  await circuit.choosePiece('Borracha')
  await circuit.moveCursor('ArrowRight', 'ArrowDown')

  await circuit.placeAtCursor()

  await expect(circuit.getStatus()).toHaveText('7 peças')
})

test('an open switch keeps the lamp dark', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()
  await buildLoopAround(circuit, 'Lâmpada')
  await circuit.choosePiece('Borracha')
  await circuit.moveCursor('ArrowLeft', 'ArrowDown')
  await circuit.placeAtCursor()
  await circuit.choosePiece('Interruptor')

  await circuit.placeAtCursor()

  await expect(circuit.getStatus()).toHaveText('8 peças')
})

test('closing the switch lights the lamp', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()
  await buildLoopAround(circuit, 'Lâmpada')
  await circuit.choosePiece('Borracha')
  await circuit.moveCursor('ArrowLeft', 'ArrowDown')
  await circuit.placeAtCursor()
  await circuit.choosePiece('Interruptor')
  await circuit.placeAtCursor()

  await circuit.placeAtCursor()

  await expect(circuit.getStatus()).toHaveText('8 peças, 1 lâmpada acesa')
})

test('a wire straight across the battery is a short circuit', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()
  await circuit.choosePiece('Pilha')
  await circuit.placeAtCursor()
  await circuit.choosePiece('Fio')
  await circuit.moveCursor('ArrowLeft')
  await circuit.placeAtCursor()
  await circuit.moveCursor('ArrowRight', 'ArrowRight')
  await circuit.placeAtCursor()
  await circuit.moveCursor('ArrowDown')
  await circuit.placeAtCursor()
  await circuit.moveCursor('ArrowLeft')
  await circuit.placeAtCursor()
  await circuit.moveCursor('ArrowLeft')

  await circuit.placeAtCursor()

  await expect(circuit.getStatus()).toHaveText('6 peças, curto-circuito')
})
