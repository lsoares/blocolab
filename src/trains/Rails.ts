import { type Axis, opposite, type Side, type Spot, stepFrom } from '../stage/Grid.ts'
import type { Piece } from './Railway.ts'

export type Traversal = { spot: Spot; enter: Side; exit: Side; isEnd: boolean }

export type Route = { visits: { spot: Spot; enter: Side; exit?: Side }[]; closed: boolean }

export function isRailPiece(piece: Piece) {
  return piece.kind !== 'tree' && !isStream(piece)
}

export function isStream(piece: Piece): piece is Extract<Piece, { kind: 'river' | 'lava' | 'road' }> {
  return piece.kind === 'river' || piece.kind === 'lava' || piece.kind === 'road'
}

export function terminalSidesOf(piece: Piece): Side[] {
  if (piece.kind === 'track' || piece.kind === 'bridge' || piece.kind === 'points' || isStream(piece)) {
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

export function findWaterSides(pieces: Piece[], spot: Spot): Side[] {
  const pieceAt = indexBySpot(pieces)
  const here = pieceAt.get(keyOf(spot))
  if (!here || (here.kind !== 'bridge' && !isStream(here))) return []
  return terminalSidesOf(here).filter((side) => {
    const next = pieceAt.get(keyOf(stepFrom(spot, side)))
    if (!next) return false
    return here.kind === 'bridge' ? isStream(next) : next.kind === here.kind || next.kind === 'bridge'
  })
}

export function turnToMeetNeighbours(pieces: Piece[]): Piece[] {
  let turned = pieces
  for (let pass = 0; pass < 3; pass++) {
    const pieceAt = indexBySpot(turned)
    turned = turned.map((piece) => turnIfNothingMeetsIt(piece, pieceAt))
  }
  return turned
}

export function bridgeCrossings(pieces: Piece[]): Piece[] {
  const pieceAt = indexBySpot(pieces)
  return pieces.map((piece) => {
    if (piece.kind === 'track') {
      const axis = findCrossedAxis(pieceAt, piece.spot)
      return axis ? { kind: 'bridge', spot: piece.spot, axis } : piece
    }
    if (piece.kind === 'bridge' && !hasSomethingAcross(pieceAt, piece)) return { kind: 'track', spot: piece.spot }
    return piece
  })
}

export function alignMountains(pieces: Piece[]): Piece[] {
  const pieceAt = indexBySpot(pieces)
  const axisAt = new Map<string, Axis>()
  for (const piece of pieces) {
    if (piece.kind !== 'mountain' || axisAt.has(keyOf(piece.spot))) continue
    const range = collectMountainRange(pieceAt, piece)
    const axis = chooseMountainAxis(pieceAt, range) ?? piece.axis
    for (const { spot } of range) axisAt.set(keyOf(spot), axis)
  }
  return pieces.map((piece) =>
    piece.kind === 'mountain' ? { ...piece, axis: axisAt.get(keyOf(piece.spot)) ?? piece.axis } : piece,
  )
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

export function isStationStop(pieces: Piece[], spot: Spot) {
  const pieceAt = indexBySpot(pieces)
  const here = pieceAt.get(keyOf(spot))
  if (here?.kind !== 'station') return false
  const [back, forward]: Side[] = here.axis === 'horizontal' ? ['west', 'east'] : ['north', 'south']
  const platformLength = (toward: Side) => {
    let length = 0
    let next = stepFrom(spot, toward)
    while (isStationAlong(pieceAt.get(keyOf(next)), here.axis)) {
      length++
      next = stepFrom(next, toward)
    }
    return length
  }
  const before = platformLength(back)
  return before === Math.floor((before + platformLength(forward)) / 2)
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
    if (!nextPiece || !isRailPiece(nextPiece) || !terminalSidesOf(nextPiece).includes(opposite[exit])) {
      return { visits, closed: false }
    }
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
  if (!isRailPiece(piece)) return []
  return terminalSidesOf(piece).filter((side) => {
    const next = pieceAt.get(keyOf(stepFrom(piece.spot, side)))
    return next !== undefined && isRailPiece(next) && terminalSidesOf(next).includes(opposite[side])
  })
}

function turnIfNothingMeetsIt(piece: Piece, pieceAt: Map<string, Piece>): Piece {
  if (piece.kind === 'track' || piece.kind === 'tree' || piece.kind === 'points' || isStream(piece)) return piece
  if (piece.kind === 'mountain') return piece
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

function collectMountainRange(pieceAt: Map<string, Piece>, first: Extract<Piece, { kind: 'mountain' }>) {
  const range = [first]
  const seen = new Set([keyOf(first.spot)])
  for (let index = 0; index < range.length; index++) {
    for (const side of ['north', 'east', 'south', 'west'] as const) {
      const next = pieceAt.get(keyOf(stepFrom(range[index].spot, side)))
      if (next?.kind !== 'mountain' || seen.has(keyOf(next.spot))) continue
      seen.add(keyOf(next.spot))
      range.push(next)
    }
  }
  return range
}

function chooseMountainAxis(pieceAt: Map<string, Piece>, range: Piece[]): Axis | undefined {
  const entrances = { horizontal: 0, vertical: 0 }
  for (const { spot } of range) {
    for (const side of ['north', 'east', 'south', 'west'] as const) {
      const outside = pieceAt.get(keyOf(stepFrom(spot, side)))
      if (!outside || outside.kind === 'mountain' || !isRailPiece(outside)) continue
      if (!terminalSidesOf(outside).includes(opposite[side]) || isRunningAlongside(pieceAt, outside, side)) continue
      entrances[side === 'east' || side === 'west' ? 'horizontal' : 'vertical']++
    }
  }
  if (entrances.horizontal > 0 && entrances.vertical === 0) return 'horizontal'
  if (entrances.vertical > 0 && entrances.horizontal === 0) return 'vertical'
  return undefined
}

function isRunningAlongside(pieceAt: Map<string, Piece>, line: Piece, towardMountain: Side) {
  const alongside: Side[] =
    towardMountain === 'east' || towardMountain === 'west' ? ['north', 'south'] : ['east', 'west']
  return alongside.some((side) => {
    const next = pieceAt.get(keyOf(stepFrom(line.spot, side)))
    return next !== undefined && isRailPiece(next)
  })
}

function findCrossedAxis(pieceAt: Map<string, Piece>, spot: Spot): Axis | undefined {
  const streamBetween = (a: Side, b: Side) => {
    const first = pieceAt.get(keyOf(stepFrom(spot, a)))
    const second = pieceAt.get(keyOf(stepFrom(spot, b)))
    return first !== undefined && second !== undefined && isStream(first) && first.kind === second.kind
  }
  const flowsAlongX = streamBetween('west', 'east')
  const flowsAlongZ = streamBetween('north', 'south')
  if (flowsAlongX === flowsAlongZ) return undefined
  return flowsAlongX ? 'vertical' : 'horizontal'
}

function hasSomethingAcross(pieceAt: Map<string, Piece>, bridge: Extract<Piece, { kind: 'bridge' }>) {
  const across: Side[] = bridge.axis === 'horizontal' ? ['north', 'south'] : ['west', 'east']
  return across.some((side) => {
    const next = pieceAt.get(keyOf(stepFrom(bridge.spot, side)))
    return next !== undefined && (isStream(next) || isRailPiece(next))
  })
}

function isStationAlong(piece: Piece | undefined, axis: Axis) {
  return piece?.kind === 'station' && piece.axis === axis
}
