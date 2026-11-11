import { expect, test } from '@playwright/test'
import { buildLoopAround, CircuitPage } from './CircuitPage.ts'

test('tapping the board places the chosen piece', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()

  await circuit.getBoard().click()

  await expect(circuit.getStatus()).toHaveText('1 peça')
})

test('a wire appears while it is still being dragged', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()
  await circuit.choosePiece('Fio')
  await circuit.pressBoardAt(-100, 0)

  await circuit.dragBoardTo(100, 0)

  await expect(circuit.getStatus()).toHaveText(/^[2-9] peças$/)
})

test('a dragged wire can turn corners', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()
  await circuit.choosePiece('Fio')
  await circuit.pressBoardAt(-100, -60)
  await circuit.dragBoardTo(60, -60)
  await circuit.dragBoardTo(60, 60)

  await circuit.releaseBoard()

  await expect(circuit.getStatus()).toHaveText(/^([5-9]|1\d) peças$/)
})

test('undo takes back a whole dragged wire', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()
  await circuit.choosePiece('Fio')
  await circuit.pressBoardAt(-100, 0)
  await circuit.dragBoardTo(100, 0)
  await circuit.releaseBoard()

  await page.getByRole('button', { name: 'Desfazer' }).click()

  await expect(circuit.getStatus()).toHaveText('0 peças')
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

test('hovering a piece says what it is', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()
  await circuit.getBoard().click()

  await circuit.hoverBoard()

  await expect(circuit.getPieceName()).toHaveText('Pilha')
})

test('placing a piece over another one replaces it', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()
  await circuit.getBoard().click()
  await circuit.choosePiece('Lâmpada')
  await circuit.getBoard().click()

  await circuit.hoverBoard()

  await expect(circuit.getPieceName()).toHaveText('Lâmpada (apagada)')
})

test('pieces turn by themselves to meet the wires around them', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()
  await circuit.choosePiece('Pilha')
  await circuit.moveCursor('ArrowLeft')
  await circuit.placeAtCursor()
  await circuit.choosePiece('Lâmpada')
  await circuit.moveCursor('ArrowRight', 'ArrowRight')
  await circuit.placeAtCursor()
  await circuit.choosePiece('Fio')
  await circuit.moveCursor('ArrowUp')
  await circuit.placeAtCursor()
  await circuit.moveCursor('ArrowLeft')
  await circuit.placeAtCursor()
  await circuit.moveCursor('ArrowLeft')
  await circuit.placeAtCursor()
  await circuit.moveCursor('ArrowDown', 'ArrowDown')
  await circuit.placeAtCursor()
  await circuit.moveCursor('ArrowRight')
  await circuit.placeAtCursor()
  await circuit.moveCursor('ArrowRight')

  await circuit.placeAtCursor()

  await expect(circuit.getStatus()).toHaveText('8 peças, 1 lâmpada acesa')
})

test('hovering a tool says its name', async ({ page }) => {
  const circuit = new CircuitPage(page)
  await circuit.open()

  await circuit.hoverTool('Lâmpada')

  await expect(circuit.getPieceName()).toHaveText('Lâmpada')
})
