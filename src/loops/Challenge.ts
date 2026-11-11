import type { Board, Piece } from './Board.ts'

export type Challenge = {
  goal: string
  needs: {
    litLamps?: number
    runningMotors?: number
    soundingBuzzers?: number
    maxBatteries?: number
    everyLampAtLeast?: number
    lampsEachOnTheirOwnPath?: true
    lampsOneAfterTheOther?: true
    mainSwitch?: true
    shortCircuit?: true
  }
}

export function isMet(board: Board, { needs }: Challenge) {
  const pieces = board.listPieces()
  return (
    countWorking(board, 'lamp') >= (needs.litLamps ?? 0) &&
    countWorking(board, 'motor') >= (needs.runningMotors ?? 0) &&
    countWorking(board, 'buzzer') >= (needs.soundingBuzzers ?? 0) &&
    pieces.filter((piece) => piece.kind === 'battery').length <= (needs.maxBatteries ?? Number.POSITIVE_INFINITY) &&
    (needs.everyLampAtLeast === undefined || everyLitLampAtLeast(board, needs.everyLampAtLeast)) &&
    (!needs.lampsEachOnTheirOwnPath || lampsRelation(board) === 'each on their own path') &&
    (!needs.lampsOneAfterTheOther || lampsRelation(board) === 'one after the other') &&
    (!needs.mainSwitch || hasMainSwitch(board)) &&
    (!needs.shortCircuit || board.hasShortCircuit())
  )
}

function countWorking(board: Board, kind: Piece['kind']) {
  return board.listPieces().filter((piece) => piece.kind === kind && board.isPoweredAt(piece.spot)).length
}

function countWorkingLoads(board: Board) {
  return countWorking(board, 'lamp') + countWorking(board, 'motor') + countWorking(board, 'buzzer')
}

function lampsRelation(board: Board) {
  const pieces = board.listPieces()
  const lit = pieces.filter((piece) => piece.kind === 'lamp' && board.isPoweredAt(piece.spot))
  if (lit.length < 2) return 'not enough lamps'
  const stillLit = lit.map((removed) =>
    countWorking(board.withPieces(pieces.filter((piece) => piece !== removed)), 'lamp'),
  )
  if (stillLit.every((count) => count === lit.length - 1)) return 'each on their own path'
  if (stillLit.every((count) => count === 0)) return 'one after the other'
  return 'mixed'
}

function hasMainSwitch(board: Board) {
  if (countWorkingLoads(board) === 0) return false
  const pieces = board.listPieces()
  return pieces.some(
    (piece) =>
      piece.kind === 'switch' &&
      piece.closed &&
      countWorkingLoads(
        board.withPieces(pieces.map((other) => (other === piece ? { ...piece, closed: false } : other))),
      ) === 0,
  )
}

function everyLitLampAtLeast(board: Board, strength: number) {
  return board
    .listPieces()
    .filter((piece) => piece.kind === 'lamp' && board.isPoweredAt(piece.spot))
    .every((lamp) => board.measureStrengthAt(lamp.spot) >= strength)
}
