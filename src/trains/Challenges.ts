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
    goal: 'Faz o comboio passar por um túnel.',
    isMet: (railway) => visitedPieces(railway).some((piece) => piece.kind === 'tunnel'),
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
  { goal: 'Faz um oito: o comboio passa pelo cruzamento nos dois sentidos.', isMet: passesACrossingBothWays },
  { goal: 'Planta três árvores ao lado da linha.', isMet: (railway) => treesBesideTheLine(railway) >= 3 },
]

function visitedPieces(railway: Railway): Piece[] {
  return (railway.planRoute()?.visits ?? []).flatMap(({ spot }) => railway.findPieceAt(spot) ?? [])
}

function passesACrossingBothWays(railway: Railway) {
  const visits = railway.planRoute()?.visits ?? []
  return visits.some(({ spot }) => {
    if (railway.listLinkedSides(spot).length < 4) return false
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
