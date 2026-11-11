import { opposite, stepFrom } from '../stage/Grid.ts'
import type { Piece, Railway } from './Railway.ts'

export type Challenge = { goal: string; isMet: (railway: Railway) => boolean }

export const challenges: Challenge[] = [
  { goal: 'Põe o comboio a andar.', isMet: (railway) => (railway.planRoute()?.visits.length ?? 0) >= 2 },
  { goal: 'Faz o comboio dar a volta.', isMet: (railway) => railway.planRoute()?.closed === true },
  {
    goal: 'Faz o comboio passar pela estação.',
    isMet: (railway) => visitedPieces(railway).some((piece) => piece.kind === 'station'),
  },
  {
    goal: 'Faz o comboio atravessar uma montanha.',
    isMet: (railway) => visitedPieces(railway).some((piece) => piece.kind === 'mountain'),
  },
  {
    goal: 'Faz o comboio parar num semáforo vermelho.',
    isMet: (railway) => visitedPieces(railway).some((piece) => piece.kind === 'signal' && !piece.go),
  },
  {
    goal: 'Faz o comboio dar a volta com o semáforo verde.',
    isMet: (railway) =>
      railway.planRoute()?.closed === true &&
      visitedPieces(railway).some((piece) => piece.kind === 'signal' && piece.go),
  },
  {
    goal: 'Faz o comboio passar por uma ponte.',
    isMet: (railway) => visitedPieces(railway).some((piece) => piece.kind === 'bridge'),
  },
  { goal: 'Faz o comboio passar por cima e por baixo da ponte.', isMet: passesABridgeOverAndUnder },
  { goal: 'Faz o comboio atravessar um rio por uma ponte.', isMet: (railway) => crossesAStream(railway, 'river') },
  {
    goal: 'Faz o comboio passar por uma passagem de nível.',
    isMet: (railway) => visitedPieces(railway).some((piece) => piece.kind === 'barrier'),
  },
  {
    goal: 'Põe uma agulha no caminho do comboio.',
    isMet: (railway) => visitedPieces(railway).some((piece) => piece.kind === 'points'),
  },
  { goal: 'Usa a agulha para desviar o comboio.', isMet: isSentDownABranch },
  { goal: 'Faz um oito: o comboio passa pelo cruzamento nos dois sentidos.', isMet: passesACrossingBothWays },
  { goal: 'Planta três árvores ao lado da linha.', isMet: (railway) => treesBesideTheLine(railway) >= 3 },
  {
    goal: 'Faz o comboio atravessar um rio de lava por uma ponte.',
    isMet: (railway) => crossesAStream(railway, 'lava'),
  },
]

function visitedPieces(railway: Railway): Piece[] {
  return (railway.planRoute()?.visits ?? []).flatMap(({ spot }) => railway.findPieceAt(spot) ?? [])
}

function passesABridgeOverAndUnder(railway: Railway) {
  const visits = railway.planRoute()?.visits ?? []
  return visits.some(({ spot }) => {
    const bridge = railway.findPieceAt(spot)
    if (bridge?.kind !== 'bridge') return false
    const along = bridge.axis === 'horizontal' ? ['west', 'east'] : ['north', 'south']
    const entries = visits
      .filter((other) => other.spot.x === spot.x && other.spot.z === spot.z)
      .map(({ enter }) => enter)
    return entries.some((enter) => along.includes(enter)) && entries.some((enter) => !along.includes(enter))
  })
}

function crossesAStream(railway: Railway, kind: 'river' | 'lava') {
  return visitedPieces(railway).some((piece) => {
    if (piece.kind !== 'bridge') return false
    const across = piece.axis === 'horizontal' ? (['north', 'south'] as const) : (['west', 'east'] as const)
    return across.every((side) => railway.findPieceAt(stepFrom(piece.spot, side))?.kind === kind)
  })
}

function isSentDownABranch(railway: Railway) {
  return (railway.planRoute()?.visits ?? []).some(
    ({ spot, enter, exit }) =>
      railway.findPieceAt(spot)?.kind === 'points' && exit !== undefined && exit !== opposite[enter],
  )
}

function passesACrossingBothWays(railway: Railway) {
  const visits = railway.planRoute()?.visits ?? []
  return visits.some(({ spot }) => {
    if (railway.findPieceAt(spot)?.kind !== 'track' || railway.listLinkedSides(spot).length < 4) return false
    const entries = visits
      .filter((other) => other.spot.x === spot.x && other.spot.z === spot.z)
      .map(({ enter }) => enter)
    return (
      entries.some((enter) => enter === 'west' || enter === 'east') &&
      entries.some((enter) => enter === 'north' || enter === 'south')
    )
  })
}

function treesBesideTheLine(railway: Railway) {
  return railway.listPieces().filter((piece) => {
    if (piece.kind !== 'tree') return false
    return [
      { x: 1, z: 0 },
      { x: -1, z: 0 },
      { x: 0, z: 1 },
      { x: 0, z: -1 },
    ].some(({ x, z }) => {
      const neighbour = railway.findPieceAt({ x: piece.spot.x + x, z: piece.spot.z + z })
      return neighbour !== undefined && neighbour.kind !== 'tree'
    })
  }).length
}
