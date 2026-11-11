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

export const challenges: Challenge[] = [
  {
    goal: 'Acende a lâmpada.',
    needs: { litLamps: 1 },
  },
  {
    goal: 'Faz o motor rodar.',
    needs: { runningMotors: 1 },
  },
  {
    goal: 'Faz a campainha tocar.',
    needs: { soundingBuzzers: 1 },
  },
  {
    goal: 'Acende a lâmpada e controla-a com um interruptor.',
    needs: { litLamps: 1, mainSwitch: true },
  },
  {
    goal: 'Acende duas lâmpadas com uma só pilha.',
    needs: { litLamps: 2, maxBatteries: 1 },
  },
  {
    goal: 'Faz a lâmpada acender e o motor rodar ao mesmo tempo.',
    needs: { litLamps: 1, runningMotors: 1 },
  },
  {
    goal: 'Faz a lâmpada acender, o motor rodar e a campainha tocar.',
    needs: { litLamps: 1, runningMotors: 1, soundingBuzzers: 1 },
  },
  {
    goal: 'Acende duas lâmpadas de modo a que, se tirares uma, a outra continue acesa.',
    needs: { litLamps: 2, lampsEachOnTheirOwnPath: true },
  },
  {
    goal: 'Acende duas lâmpadas de modo a que, se tirares uma, a outra se apague.',
    needs: { litLamps: 2, lampsOneAfterTheOther: true },
  },
  {
    goal: 'Faz dois motores rodar com uma só pilha.',
    needs: { runningMotors: 2, maxBatteries: 1 },
  },
  {
    goal: 'Faz um interruptor geral: a lâmpada, o motor e a campainha ligam e desligam todos com ele.',
    needs: { litLamps: 1, runningMotors: 1, soundingBuzzers: 1, mainSwitch: true },
  },
  {
    goal: 'Faz a lâmpada brilhar mais forte do que com uma só pilha.',
    needs: { litLamps: 1, everyLampAtLeast: 1.5 },
  },
  {
    goal: 'Acende duas lâmpadas, cada uma tão forte como se estivesse sozinha.',
    needs: { litLamps: 2, everyLampAtLeast: 0.85 },
  },
  {
    goal: 'Faz um curto-circuito de propósito.',
    needs: { shortCircuit: true },
  },
]

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
