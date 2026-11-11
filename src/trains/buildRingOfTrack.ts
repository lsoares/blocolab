import type { GamePage } from '../GamePage.ts'

export async function buildRingOfTrack(game: GamePage, closed: boolean) {
  await game.choosePiece('Carril')
  await game.moveCursor('ArrowUp', 'ArrowLeft')
  await game.placeAtCursor()
  await game.moveCursor('ArrowRight')
  await game.placeAtCursor()
  await game.moveCursor('ArrowRight')
  await game.placeAtCursor()
  await game.moveCursor('ArrowDown')
  await game.placeAtCursor()
  await game.moveCursor('ArrowDown')
  await game.placeAtCursor()
  await game.moveCursor('ArrowLeft')
  await game.placeAtCursor()
  await game.moveCursor('ArrowLeft')
  await game.placeAtCursor()
  if (!closed) return
  await game.moveCursor('ArrowUp')
  await game.placeAtCursor()
}
