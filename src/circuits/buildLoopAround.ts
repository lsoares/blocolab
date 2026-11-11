import type { GamePage } from '../GamePage.ts'

export async function buildLoopAround(
  circuit: GamePage,
  bottomPiece: string,
  names = { wire: 'Fio', source: 'Pilha' },
) {
  await circuit.choosePiece(names.wire)
  await circuit.moveCursor('ArrowUp', 'ArrowLeft')
  await circuit.placeAtCursor()
  await circuit.moveCursor('ArrowDown')
  await circuit.placeAtCursor()
  await circuit.moveCursor('ArrowDown')
  await circuit.placeAtCursor()
  await circuit.choosePiece(bottomPiece)
  await circuit.moveCursor('ArrowRight')
  await circuit.placeAtCursor()
  await circuit.choosePiece(names.wire)
  await circuit.moveCursor('ArrowRight')
  await circuit.placeAtCursor()
  await circuit.moveCursor('ArrowUp')
  await circuit.placeAtCursor()
  await circuit.moveCursor('ArrowUp')
  await circuit.placeAtCursor()
  await circuit.choosePiece(names.source)
  await circuit.moveCursor('ArrowLeft')
  await circuit.placeAtCursor()
}
