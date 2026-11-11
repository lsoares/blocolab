import type { Game, GameSession } from '../Game.ts'
import { Board, type Piece } from '../loops/Board.ts'
import { isMet } from '../loops/Challenge.ts'
import { Placing, type Tool } from '../loops/Placing.ts'
import { measureBoardThatFits } from '../stage/BoardCamera.ts'
import { BoardView } from './BoardView.ts'
import { BuzzerSound } from './BuzzerSound.ts'
import { challenges } from './Challenges.ts'

export const circuits: Game = {
  id: 'circuitos',
  name: 'Circuitos',
  icon: '⚡',
  tools: [
    {
      value: 'wire',
      name: 'Fio',
      icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14" stroke="var(--wire)" stroke-width="4" stroke-linecap="round" /><circle cx="4" cy="12" r="2.4" fill="var(--gold)" /><circle cx="20" cy="12" r="2.4" fill="var(--gold)" /></svg>`,
    },
    {
      value: 'battery',
      name: 'Pilha',
      icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="2" y="7" width="17" height="10" rx="2" fill="var(--battery)" /><path d="M11 7h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-6z" fill="var(--copper)" /><rect x="19" y="10" width="3.2" height="4" rx="1" fill="var(--socket)" /><path d="M13.5 12h4M15.5 10v4M4.5 12h4" stroke="var(--control)" stroke-width="1.5" stroke-linecap="round" /></svg>`,
    },
    {
      value: 'switch',
      name: 'Interruptor',
      icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="5" cy="17" r="2.4" fill="var(--gold)" /><circle cx="19" cy="17" r="2.4" fill="var(--gold)" /><path d="M5 17 17 7" stroke="var(--switch)" stroke-width="3.2" stroke-linecap="round" /></svg>`,
    },
    {
      value: 'lamp',
      name: 'Lâmpada',
      icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="10" r="7" fill="var(--bulb)" /><rect x="8.5" y="16.5" width="7" height="4.5" rx="1.2" fill="var(--socket)" /></svg>`,
    },
    {
      value: 'motor',
      name: 'Motor',
      icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="var(--motor)" /><path d="M12 4v16M4 12h16" stroke="white" stroke-width="2.6" stroke-linecap="round" transform="rotate(30 12 12)" /></svg>`,
    },
    {
      value: 'buzzer',
      name: 'Campainha',
      icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="8" cy="12" r="5.5" fill="var(--buzzer)" /><path d="M15.5 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14" stroke="var(--buzzer)" fill="none" stroke-width="2.2" stroke-linecap="round" /></svg>`,
    },
  ],
  goals: challenges.map(({ goal }) => goal),
  startSession,
}

function startSession(canvas: HTMLCanvasElement, onChanged: () => void): GameSession {
  const board = new Board(measureBoardThatFits(canvas.clientWidth, canvas.clientHeight))
  const view = new BoardView(canvas, board.size, matchMedia('(prefers-reduced-motion: reduce)'))
  const buzzerSound = new BuzzerSound()
  document.addEventListener('visibilitychange', () => document.hidden && buzzerSound.silence())
  const show = () => {
    if (isABuzzerSounding(board)) buzzerSound.play()
    else buzzerSound.silence()
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
    ...(board.hasShortCircuit() ? ['curto-circuito'] : []),
    ...[
      { count: working('lamp'), words: ['lâmpada acesa', 'lâmpadas acesas'] },
      { count: working('motor'), words: ['motor a rodar', 'motores a rodar'] },
      { count: working('buzzer'), words: ['campainha a tocar', 'campainhas a tocar'] },
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
    battery: 'Pilha',
    wire: 'Fio',
    switch: `Interruptor (${piece.kind === 'switch' && piece.closed ? 'fechado' : 'aberto'})`,
    lamp: `Lâmpada (${working ? `acesa${weak ? ' fraca' : strong ? ' forte' : ''}` : 'apagada'})`,
    motor: `Motor (${working ? `a rodar${weak ? ' devagar' : strong ? ' depressa' : ''}` : 'parado'})`,
    buzzer: `Campainha (${working ? 'a tocar' : 'calada'})`,
  }[piece.kind]
}

function isABuzzerSounding(board: Board) {
  return board.listPieces().some((piece) => piece.kind === 'buzzer' && board.isPoweredAt(piece.spot))
}
