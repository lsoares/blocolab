import type { Board, Piece } from './Board.ts'

export type Challenge = {
  goal: string
  hint: string
  needs: {
    litLamps?: number
    runningMotors?: number
    soundingBuzzers?: number
    switches?: number
    maxBatteries?: number
  }
}

export const challenges: Challenge[] = [
  {
    goal: 'Acende a lâmpada.',
    hint: 'Liga a pilha à lâmpada com fios, a fazer um anel fechado.',
    needs: { litLamps: 1 },
  },
  {
    goal: 'Faz o motor rodar.',
    hint: 'O motor também precisa de um anel fechado com a pilha.',
    needs: { runningMotors: 1 },
  },
  {
    goal: 'Faz a campainha tocar.',
    hint: 'A campainha toca quando o anel fecha.',
    needs: { soundingBuzzers: 1 },
  },
  {
    goal: 'Acende a lâmpada e controla-a com um interruptor.',
    hint: 'Põe um interruptor no anel e toca nele para ligar.',
    needs: { litLamps: 1, switches: 1 },
  },
  {
    goal: 'Acende duas lâmpadas com uma só pilha.',
    hint: 'Põe as duas lâmpadas no mesmo anel, uma a seguir à outra.',
    needs: { litLamps: 2, maxBatteries: 1 },
  },
  {
    goal: 'Faz a lâmpada acender e o motor rodar ao mesmo tempo.',
    hint: 'Podes pôr os dois no mesmo anel.',
    needs: { litLamps: 1, runningMotors: 1 },
  },
  {
    goal: 'Faz a lâmpada acender, o motor rodar e a campainha tocar.',
    hint: 'Junta os três no mesmo anel e liga tudo de uma vez.',
    needs: { litLamps: 1, runningMotors: 1, soundingBuzzers: 1 },
  },
]

export function isMet(board: Board, { needs }: Challenge) {
  const pieces = board.listPieces()
  const count = (kind: Piece['kind']) => pieces.filter((piece) => piece.kind === kind).length
  const working = (kind: Piece['kind']) =>
    pieces.filter((piece) => piece.kind === kind && board.isPoweredAt(piece.spot)).length
  return (
    working('lamp') >= (needs.litLamps ?? 0) &&
    working('motor') >= (needs.runningMotors ?? 0) &&
    working('buzzer') >= (needs.soundingBuzzers ?? 0) &&
    count('switch') >= (needs.switches ?? 0) &&
    count('battery') <= (needs.maxBatteries ?? Number.POSITIVE_INFINITY)
  )
}
