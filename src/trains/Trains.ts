import type { Game, GameSession } from '../Game.ts'
import { measureBoardThatFits } from '../stage/BoardCamera.ts'
import { challenges } from './Challenges.ts'
import { Journey } from './Journey.ts'
import { Laying, type Tool } from './Laying.ts'
import { type Piece, Railway } from './Railway.ts'
import { RailwayView } from './RailwayView.ts'

export const trains: Game = {
  id: 'comboio',
  name: 'Comboio',
  icon: '🚂',
  tools: [
    {
      value: 'track',
      name: 'Carril',
      icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="1" y="7" width="22" height="10" rx="1.5" fill="var(--wood)" /><path d="M1 10h22M1 14h22" stroke="var(--rail)" stroke-width="1.6" /></svg>`,
    },
    {
      value: 'train',
      name: 'Comboio',
      icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="2" y="10" width="13" height="7" rx="1.5" fill="var(--train)" /><rect x="12" y="6" width="7" height="11" rx="1" fill="var(--train-dark)" /><rect x="4" y="5" width="3" height="5" fill="var(--rail-dark)" /><circle cx="7" cy="18" r="2.2" fill="var(--rail-dark)" /><circle cx="16" cy="18" r="2.2" fill="var(--rail-dark)" /></svg>`,
    },
    {
      value: 'station',
      name: 'Estação',
      icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="9" fill="var(--station)" /><path d="M1.5 12 12 4l10.5 8z" fill="var(--roof)" /><rect x="9.5" y="14" width="5" height="6" fill="var(--rail-dark)" /></svg>`,
    },
    {
      value: 'tunnel',
      name: 'Túnel',
      icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M2 20v-7a10 10 0 0 1 20 0v7z" fill="var(--stone)" /><path d="M7 20v-5a5 5 0 0 1 10 0v5z" fill="var(--rail-dark)" /></svg>`,
    },
    {
      value: 'bridge',
      name: 'Ponte',
      icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M1 19h4Q12 3 19 19h4" fill="none" stroke="var(--wood)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" /><path d="M1 21.5h22" stroke="var(--rail)" stroke-width="1.5" /></svg>`,
    },
    {
      value: 'points',
      name: 'Agulha',
      icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M2 18h12M14 18 21 9M14 18h8" stroke="var(--wood)" stroke-width="3.6" stroke-linecap="round" fill="none" /><path d="M17 4.5l5 3.5-5 3z" fill="#f0a020" /></svg>`,
    },
    {
      value: 'signal',
      name: 'Semáforo',
      icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="10.5" y="10" width="3" height="12" fill="var(--rail-dark)" /><rect x="7" y="1.5" width="10" height="11" rx="2" fill="var(--rail-dark)" /><circle cx="12" cy="5.5" r="2.2" fill="var(--signal-red)" /><circle cx="12" cy="9.8" r="2.2" fill="var(--signal-green)" /></svg>`,
    },
    {
      value: 'tree',
      name: 'Árvore',
      icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 1.5 5 11.5h4L4 18.5h16l-5-7h4z" fill="var(--leaf)" /><rect x="11" y="18" width="2" height="4.5" fill="var(--rail)" /></svg>`,
    },
  ],
  goals: challenges.map(({ goal }) => goal),
  startSession,
}

function startSession(canvas: HTMLCanvasElement, onChanged: () => void): GameSession {
  const railway = new Railway(measureBoardThatFits(canvas.clientWidth, canvas.clientHeight))
  const view = new RailwayView(canvas, railway.size)
  const journey = new Journey(railway)
  const show = () => {
    journey.sync()
    view.show(railway)
    view.showTrain(journey.listCars())
    onChanged()
  }
  const laying = new Laying(railway, view, () => journey.findEngineSpot(), show)
  laying.listenTo(canvas)
  view.show(railway)
  let lastSeconds = 0
  view.start((seconds) => {
    journey.advance(Math.min(seconds - lastSeconds, 0.1))
    lastSeconds = seconds
    view.showTrain(journey.listCars())
  })

  return {
    describeBoard: () => describeRailway(railway),
    isChallengeMet: (level) => challenges[level].isMet(railway),
    canUndo: () => railway.canUndo(),
    undo: () => {
      railway.undo()
      show()
    },
    startOver: () => {
      railway.startOver()
      show()
    },
    chooseTool: (value) => laying.chooseTool(value as Tool),
    nameUnder: (pointer) => {
      const spot = view.pickSpot(pointer)
      if (!spot) return undefined
      const underTheTrain = journey
        .listCars()
        .some((car) => !car.hidden && Math.floor(car.x) === spot.x && Math.floor(car.z) === spot.z)
      const piece = railway.findPieceAt(spot)
      return underTheTrain ? 'Comboio' : piece && nameOf(piece)
    },
  }
}

function describeRailway(railway: Railway) {
  const count = railway.listPieces().length
  const route = railway.planRoute()
  const train = route ? [describeRoute(route)] : []
  return [`${count} ${new Intl.PluralRules('pt-PT').select(count) === 'one' ? 'peça' : 'peças'}`, ...train].join(', ')
}

function describeRoute(route: NonNullable<ReturnType<Railway['planRoute']>>) {
  if (route.visits.length < 2) return 'comboio parado'
  return route.closed ? 'comboio a dar voltas' : 'comboio a caminho do fim da linha'
}

function nameOf(piece: Piece) {
  if (piece.kind === 'points') {
    return `Agulha (para ${{ north: 'cima', east: 'a direita', south: 'baixo', west: 'a esquerda' }[piece.side]})`
  }
  return {
    track: 'Carril',
    station: 'Estação',
    tunnel: 'Túnel',
    bridge: 'Ponte',
    signal: `Semáforo (${piece.kind === 'signal' && piece.go ? 'verde' : 'vermelho'})`,
    tree: 'Árvore',
  }[piece.kind]
}
