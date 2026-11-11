import type { Game, GameSession } from '../Game.ts'
import { Board, type Piece } from '../loops/Board.ts'
import { isMet } from '../loops/Challenge.ts'
import { Placing, type Tool } from '../loops/Placing.ts'
import { measureBoardThatFits } from '../stage/BoardCamera.ts'
import { challenges } from './Challenges.ts'
import { WaterSound } from './WaterSound.ts'
import { WaterView } from './WaterView.ts'

export const waters: Game = {
  id: 'agua',
  name: 'Água',
  icon: '💧',
  tools: [
    {
      value: 'wire',
      name: 'Cano',
      icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="1" y="8" width="22" height="8" rx="4" fill="var(--steel)" opacity="0.7" /><rect x="3" y="10" width="18" height="4" rx="2" fill="var(--water)" /></svg>`,
    },
    {
      value: 'battery',
      name: 'Bomba',
      icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="1" y="10.5" width="6" height="5" fill="var(--steel)" /><rect x="17" y="10.5" width="6" height="5" fill="var(--steel)" /><circle cx="12" cy="13" r="7.5" fill="var(--pump)" /><path d="M12 7v12M6 13h12" stroke="white" stroke-width="2" stroke-linecap="round" /></svg>`,
    },
    {
      value: 'switch',
      name: 'Torneira',
      icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="1" y="14" width="22" height="6" rx="3" fill="var(--steel)" /><rect x="9" y="10" width="6" height="6" fill="var(--rail-dark)" /><rect x="10.5" y="5" width="3" height="6" fill="var(--rail-dark)" /><rect x="6" y="3" width="12" height="3" rx="1.5" fill="var(--train)" /></svg>`,
    },
    {
      value: 'lamp',
      name: 'Chafariz',
      icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><ellipse cx="12" cy="19.5" rx="9.5" ry="3" fill="var(--stone)" /><path d="M12 18V7M12 7c-3.5 0-5.5 2.5-6.5 7M12 7c3.5 0 5.5 2.5 6.5 7" stroke="var(--water)" stroke-width="2.2" fill="none" stroke-linecap="round" /></svg>`,
    },
    {
      value: 'motor',
      name: 'Roda de água',
      icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="var(--wood)" stroke-width="2" /><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" stroke="var(--wood)" stroke-width="2" /><circle cx="12" cy="12" r="2.8" fill="var(--water)" /></svg>`,
    },
    {
      value: 'buzzer',
      name: 'Borbulhador',
      icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="6" y="3.5" width="12" height="17.5" rx="3" fill="none" stroke="var(--steel)" stroke-width="2" /><rect x="7.5" y="11" width="9" height="9" rx="2" fill="var(--water)" /><circle cx="10" cy="8.5" r="1.4" fill="var(--water)" /><circle cx="14" cy="6" r="1.1" fill="var(--water)" /></svg>`,
    },
  ],
  goals: challenges.map(({ goal }) => goal),
  startSession,
}

function startSession(canvas: HTMLCanvasElement, onChanged: () => void): GameSession {
  const board = new Board(measureBoardThatFits(canvas.clientWidth, canvas.clientHeight))
  const view = new WaterView(canvas, board.size, matchMedia('(prefers-reduced-motion: reduce)'))
  const sound = new WaterSound()
  document.addEventListener('visibilitychange', () => document.hidden && sound.silence())
  const show = () => {
    if (isWaterRunning(board)) sound.play()
    else sound.silence()
    view.show(board)
    onChanged()
  }
  const placing = new Placing(board, view, show)
  placing.listenTo(canvas)
  view.show(board)
  view.start()

  return {
    describeBoard: () => describeBoard(board),
    isChallengeMet: (level) => isMet(board, challenges[level]),
    canUndo: () => board.canUndo(),
    undo: () => {
      board.undo()
      show()
    },
    startOver: () => {
      board.startOver()
      show()
    },
    saveBoard: () => board.listPieces(),
    restoreBoard: (saved) => {
      board.restorePieces(saved)
      show()
    },
    chooseTool: (value) => placing.chooseTool(value as Tool),
    nameUnder: (pointer) => {
      const spot = view.pickSpot(pointer)
      const piece = spot && board.findPieceAt(spot)
      return piece ? nameOf(piece, board) : undefined
    },
  }
}

function describeBoard(board: Board) {
  const pieces = board.listPieces()
  const working = (kind: string) =>
    pieces.filter((piece) => piece.kind === kind && board.isPoweredAt(piece.spot)).length
  const parts = [
    pluralize(pieces.length, ['peça', 'peças']),
    ...(board.hasShortCircuit() ? ['bomba sem resistência'] : []),
    ...[
      { count: working('lamp'), words: ['chafariz a jorrar', 'chafarizes a jorrar'] },
      { count: working('motor'), words: ['roda a girar', 'rodas a girar'] },
      { count: working('buzzer'), words: ['borbulhador a borbulhar', 'borbulhadores a borbulhar'] },
    ]
      .filter(({ count }) => count > 0)
      .map(({ count, words }) => pluralize(count, words)),
  ]
  return parts.join(', ')
}

function pluralize(count: number, [one, other]: string[]) {
  return `${count} ${new Intl.PluralRules('pt-PT').select(count) === 'one' ? one : other}`
}

function nameOf(piece: Piece, board: Board) {
  const working = board.isPoweredAt(piece.spot)
  const strength = board.measureStrengthAt(piece.spot)
  const weak = strength < 0.75
  const strong = strength > 1.3
  return {
    wire: 'Cano',
    battery: `Bomba (${working ? 'a bombear' : 'parada'})`,
    switch: `Torneira (${piece.kind === 'switch' && piece.closed ? 'aberta' : 'fechada'})`,
    lamp: `Chafariz (${working ? `a jorrar${weak ? ' fraco' : strong ? ' forte' : ''}` : 'seco'})`,
    motor: `Roda de água (${working ? `a girar${weak ? ' devagar' : strong ? ' depressa' : ''}` : 'parada'})`,
    buzzer: `Borbulhador (${working ? 'a borbulhar' : 'calado'})`,
  }[piece.kind]
}

function isWaterRunning(board: Board) {
  const users = ['lamp', 'motor', 'buzzer']
  return board.listPieces().some((piece) => users.includes(piece.kind) && board.isPoweredAt(piece.spot))
}
