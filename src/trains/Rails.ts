import { opposite, type Side, type Spot, stepFrom } from '../stage/Grid.ts'
import type { Piece } from './Railway.ts'

export type Traversal = { spot: Spot; enter: Side; exit: Side; isEnd: boolean }

export type Route = { visits: { spot: Spot; enter: Side; exit?: Side }[]; closed: boolean }

export function terminalSidesOf(piece: Piece): Side[] {
  if (piece.kind === 'track' || piece.kind === 'bridge' || piece.kind === 'points') {
    return ['north', 'east', 'south', 'west']
  }
  if (piece.kind === 'tree') return []
  return piece.axis === 'horizontal' ? ['west', 'east'] : ['north', 'south']
}

export function findLinkedSides(pieces: Piece[], spot: Spot): Side[] {
  const pieceAt = indexBySpot(pieces)
  const here = pieceAt.get(keyOf(spot))
  return here ? linkedSidesOf(pieceAt, here) : []
}

export function turnToMeetNeighbours(pieces: Piece[]): Piece[] {
  let turned = pieces
  for (let pass = 0; pass < 3; pass++) {
    const pieceAt = indexBySpot(turned)
    turned = turned.map((piece) => turnIfNothingMeetsIt(piece, pieceAt))
  }
  return turned
}

export function aimPoints(pieces: Piece[]): Piece[] {
  const pieceAt = indexBySpot(pieces)
  return pieces.map((piece) => {
    if (piece.kind !== 'points') return piece
    const linked = linkedSidesOf(pieceAt, piece)
    return linked.length > 0 && !linked.includes(piece.side) ? { ...piece, side: linked[0] } : piece
  })
}

export function chooseExit(pieces: Piece[], spot: Spot, enter: Side, alternation: number) {
  const options = findLinkedSides(pieces, spot).filter((side) => side !== enter)
  if (options.length === 0) return undefined
  const here = pieces.find((piece) => piece.spot.x === spot.x && piece.spot.z === spot.z)
  if (here?.kind === 'bridge')
    return options.includes(opposite[enter]) ? { exit: opposite[enter], alternation } : undefined
  if (here?.kind === 'points' && options.includes(here.side)) return { exit: here.side, alternation }
  if (options.includes(opposite[enter])) return { exit: opposite[enter], alternation }
  if (options.length === 1) return { exit: options[0], alternation }
  return { exit: options[alternation % options.length], alternation: alternation + 1 }
}

export function findStartTraversal(pieces: Piece[], spot: Spot): Traversal | undefined {
  const linked = findLinkedSides(pieces, spot)
  if (linked.length === 0) return undefined
  if (linked.includes('west') && linked.includes('east')) return { spot, enter: 'west', exit: 'east', isEnd: false }
  if (linked.includes('north') && linked.includes('south')) return { spot, enter: 'north', exit: 'south', isEnd: false }
  if (linked.length === 1) return { spot, enter: opposite[linked[0]], exit: linked[0], isEnd: false }
  return { spot, enter: linked[0], exit: linked[1], isEnd: false }
}

export function walkRoute(pieces: Piece[], start: Spot): Route {
  const first = findStartTraversal(pieces, start)
  if (!first) return { visits: [], closed: false }
  const pieceAt = indexBySpot(pieces)
  const visits: Route['visits'] = []
  const seen = new Set<string>()
  let alternation = 0
  let traversal: Traversal | undefined = first
  for (let guard = 0; guard < 4000 && traversal; guard++) {
    const { spot, enter, exit }: Traversal = traversal
    const state = `${keyOf(spot)}${enter}${exit}${alternation % 2}`
    if (seen.has(state)) return { visits, closed: true }
    seen.add(state)
    visits.push({ spot, enter, exit })
    const next = stepFrom(spot, exit)
    const nextPiece = pieceAt.get(keyOf(next))
    if (!nextPiece || !terminalSidesOf(nextPiece).includes(opposite[exit])) return { visits, closed: false }
    const choice = chooseExit(pieces, next, opposite[exit], alternation)
    if (!choice) {
      visits.push({ spot: next, enter: opposite[exit] })
      return { visits, closed: false }
    }
    alternation = choice.alternation
    traversal = { spot: next, enter: opposite[exit], exit: choice.exit, isEnd: false }
  }
  return { visits, closed: false }
}

function linkedSidesOf(pieceAt: Map<string, Piece>, piece: Piece) {
  return terminalSidesOf(piece).filter((side) => {
    const next = pieceAt.get(keyOf(stepFrom(piece.spot, side)))
    return next !== undefined && terminalSidesOf(next).includes(opposite[side])
  })
}

function turnIfNothingMeetsIt(piece: Piece, pieceAt: Map<string, Piece>): Piece {
  if (piece.kind === 'track' || piece.kind === 'tree' || piece.kind === 'points') return piece
  if (piece.kind === 'bridge') return turnBridgeToItsLine(piece, pieceAt)
  const turned = { ...piece, axis: piece.axis === 'horizontal' ? 'vertical' : 'horizontal' } as Piece
  return linkedSidesOf(pieceAt, piece).length === 0 && linkedSidesOf(pieceAt, turned).length > 0 ? turned : piece
}

function turnBridgeToItsLine(piece: Extract<Piece, { kind: 'bridge' }>, pieceAt: Map<string, Piece>): Piece {
  const along = piece.axis === 'horizontal' ? ['west', 'east'] : ['north', 'south']
  const linked = linkedSidesOf(pieceAt, piece)
  const alongCount = linked.filter((side) => along.includes(side)).length
  const across = linked.length - alongCount
  return alongCount === 0 && across > 0
    ? { ...piece, axis: piece.axis === 'horizontal' ? 'vertical' : 'horizontal' }
    : piece
}

function indexBySpot(pieces: Piece[]) {
  return new Map(pieces.map((piece) => [keyOf(piece.spot), piece]))
}

function keyOf({ x, z }: Spot) {
  return `${x},${z},`
}
