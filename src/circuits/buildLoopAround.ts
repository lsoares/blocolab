import type { GamePage } from '../GamePage.ts'

export async function buildLoopAround(circuit: GamePage, bottomPiece: string) {
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
