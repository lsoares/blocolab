import type { Piece, Spot } from './Board.ts'

export type Side = 'north' | 'east' | 'south' | 'west'

export type CircuitState = { short: boolean; powered: Spot[] }

export function analyzeCircuit(pieces: Piece[]): CircuitState {
  const pieceAt = indexBySpot(pieces)
  const nodes = new DisjointSets()
  for (const piece of pieces) {
    const own = terminalSidesOf(piece)
    if (piece.kind === 'wire' || (piece.kind === 'switch' && piece.closed)) {
      for (const side of own) nodes.join(terminalOf(piece, own[0]), terminalOf(piece, side))
    }
    for (const side of own) {
      const next = pieceAt.get(keyOf(stepFrom(piece.spot, side)))
      if (next && terminalSidesOf(next).includes(opposite[side])) {
        nodes.join(terminalOf(piece, side), terminalOf(next, opposite[side]))
      }
    }
  }

  const branches = pieces
    .filter((piece) => piece.kind !== 'wire' && piece.kind !== 'switch')
    .map((piece) => {
      const [first, second] = terminalSidesOf(piece)
      return { piece, from: nodes.find(terminalOf(piece, first)), to: nodes.find(terminalOf(piece, second)) }
    })
  if (branches.some(({ piece, from, to }) => piece.kind === 'battery' && from === to)) {
    return { short: true, powered: [] }
  }

  const powered = findBlocks(branches.filter(({ from, to }) => from !== to))
    .filter((block) => block.some(({ piece }) => piece.kind === 'battery'))
    .flat()
    .map(({ piece }) => piece.spot)
  return { short: false, powered }
}

export function turnToMeetNeighbours(pieces: Piece[]): Piece[] {
  let turned = pieces
  for (let pass = 0; pass < 3; pass++) {
    const pieceAt = indexBySpot(turned)
    turned = turned.map((piece) => turnIfNothingMeetsIt(piece, pieceAt))
  }
  return turned
}

export function findLinkedSides(pieces: Piece[], spot: Spot): Side[] {
  const pieceAt = indexBySpot(pieces)
  const here = pieceAt.get(keyOf(spot))
  if (!here) return []
  return terminalSidesOf(here).filter((side) => {
    const next = pieceAt.get(keyOf(stepFrom(spot, side)))
    return next !== undefined && terminalSidesOf(next).includes(opposite[side])
  })
}

function turnIfNothingMeetsIt(piece: Piece, pieceAt: Map<string, Piece>): Piece {
  if (piece.kind === 'wire') return piece
  const turned = { ...piece, axis: piece.axis === 'horizontal' ? 'vertical' : 'horizontal' } as Piece
  return countLinks(piece, pieceAt) === 0 && countLinks(turned, pieceAt) > 0 ? turned : piece
}

function countLinks(piece: Piece, pieceAt: Map<string, Piece>) {
  return terminalSidesOf(piece).filter((side) => {
    const next = pieceAt.get(keyOf(stepFrom(piece.spot, side)))
    return next !== undefined && terminalSidesOf(next).includes(opposite[side])
  }).length
}

type Branch = { piece: Piece; from: string; to: string }

const opposite: Record<Side, Side> = { north: 'south', east: 'west', south: 'north', west: 'east' }

function terminalSidesOf(piece: Piece): Side[] {
  if (piece.kind === 'wire') return ['north', 'east', 'south', 'west']
  return piece.axis === 'horizontal' ? ['west', 'east'] : ['north', 'south']
}

function stepFrom({ x, z }: Spot, side: Side): Spot {
  const steps = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] }[side]
  return { x: x + steps[0], z: z + steps[1] }
}

function terminalOf(piece: Piece, side: Side) {
  return `${keyOf(piece.spot)}${side}`
}

function keyOf({ x, z }: Spot) {
  return `${x},${z},`
}

function indexBySpot(pieces: Piece[]) {
  return new Map(pieces.map((piece) => [keyOf(piece.spot), piece]))
}

class DisjointSets {
  private readonly parents = new Map<string, string>()

  find(item: string): string {
    const parent = this.parents.get(item)
    if (parent === undefined || parent === item) return item
    const root = this.find(parent)
    this.parents.set(item, root)
    return root
  }

  join(a: string, b: string) {
    this.parents.set(this.find(a), this.find(b))
  }
}

function findBlocks(branches: Branch[]): Branch[][] {
  const around = new Map<string, Branch[]>()
  for (const branch of branches) {
    around.set(branch.from, [...(around.get(branch.from) ?? []), branch])
    around.set(branch.to, [...(around.get(branch.to) ?? []), branch])
  }
  const discovered = new Map<string, number>()
  const lowest = new Map<string, number>()
  const trail: Branch[] = []
  const blocks: Branch[][] = []
  let clock = 0

  const visit = (node: string, arrivedBy?: Branch) => {
    clock += 1
    discovered.set(node, clock)
    lowest.set(node, clock)
    for (const branch of around.get(node) ?? []) {
      if (branch === arrivedBy) continue
      const other = branch.from === node ? branch.to : branch.from
      const seen = discovered.get(other)
      if (seen === undefined) {
        trail.push(branch)
        visit(other, branch)
        lowest.set(node, Math.min(lowest.get(node) ?? clock, lowest.get(other) ?? clock))
        if ((lowest.get(other) ?? clock) >= (discovered.get(node) ?? 0)) blocks.push(takeTrailUntil(branch))
      } else if (seen < (discovered.get(node) ?? 0)) {
        trail.push(branch)
        lowest.set(node, Math.min(lowest.get(node) ?? clock, seen))
      }
    }
  }

  const takeTrailUntil = (last: Branch) => {
    const block: Branch[] = []
    let taken = trail.pop()
    while (taken) {
      block.push(taken)
      if (taken === last) break
      taken = trail.pop()
    }
    return block
  }

  for (const node of around.keys()) if (!discovered.has(node)) visit(node)
  return blocks
}
