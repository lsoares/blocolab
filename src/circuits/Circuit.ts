import { opposite, type Side, type Spot, stepFrom } from '../stage/Grid.ts'
import type { Piece } from './Board.ts'

export type CircuitState = { short: boolean; powered: Spot[]; strengths: { spot: Spot; strength: number }[] }

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
    return { short: true, powered: [], strengths: [] }
  }

  const powered = findBlocks(branches.filter(({ from, to }) => from !== to))
    .filter((block) => block.some(({ piece }) => piece.kind === 'battery'))
    .flat()
    .map(({ piece }) => piece.spot)
  const strengths = measureStrengths(branches).filter(({ spot }) =>
    powered.some((working) => working.x === spot.x && working.z === spot.z),
  )
  return { short: false, powered, strengths }
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

function terminalSidesOf(piece: Piece): Side[] {
  if (piece.kind === 'wire') return ['north', 'east', 'south', 'west']
  return piece.axis === 'horizontal' ? ['west', 'east'] : ['north', 'south']
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

const batteryVoltage = 1
const batteryInnerResistance = 0.1

function resistanceOf(piece: Piece) {
  return { battery: batteryInnerResistance, lamp: 1, motor: 0.8, buzzer: 1.2, wire: 0, switch: 0 }[piece.kind]
}

function measureStrengths(branches: Branch[]) {
  const nodeNumbers = new Map<string, number>()
  for (const { from, to } of branches) {
    for (const node of [from, to]) if (!nodeNumbers.has(node)) nodeNumbers.set(node, nodeNumbers.size)
  }
  const batteryCount = branches.filter(({ piece }) => piece.kind === 'battery').length
  const orientations = chooseOrientations(batteryCount, (flips) => loadPowerOf(branches, nodeNumbers, flips))
  const voltages = solveVoltages(branches, nodeNumbers, orientations)
  return branches
    .filter(({ piece }) => piece.kind !== 'battery')
    .map(({ piece, from, to }) => {
      const resistance = resistanceOf(piece)
      const current =
        Math.abs(voltageAt(voltages, nodeNumbers, from) - voltageAt(voltages, nodeNumbers, to)) / resistance
      return { spot: piece.spot, strength: current / (batteryVoltage / (resistance + batteryInnerResistance)) }
    })
}

function chooseOrientations(batteryCount: number, powerOf: (flips: boolean[]) => number) {
  if (batteryCount > 4) return Array.from({ length: batteryCount }, () => false)
  const choices = Array.from({ length: 2 ** batteryCount }, (_, bits) =>
    Array.from({ length: batteryCount }, (_, battery) => (bits >> battery) % 2 === 1),
  )
  return choices.reduce((best, choice) => (powerOf(choice) > powerOf(best) + 1e-9 ? choice : best), choices[0])
}

function loadPowerOf(branches: Branch[], nodeNumbers: Map<string, number>, flips: boolean[]) {
  const voltages = solveVoltages(branches, nodeNumbers, flips)
  return branches
    .filter(({ piece }) => piece.kind !== 'battery')
    .reduce((total, { piece, from, to }) => {
      const drop = voltageAt(voltages, nodeNumbers, from) - voltageAt(voltages, nodeNumbers, to)
      return total + (drop * drop) / resistanceOf(piece)
    }, 0)
}

function voltageAt(voltages: number[], nodeNumbers: Map<string, number>, node: string) {
  return voltages[nodeNumbers.get(node) ?? 0] ?? 0
}

function solveVoltages(branches: Branch[], nodeNumbers: Map<string, number>, flips: boolean[]) {
  const size = nodeNumbers.size
  const equations = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size + 1 }, (_, column) => (row === column ? 1e-9 : 0)),
  )
  let batteryNumber = 0
  for (const { piece, from, to } of branches) {
    const a = nodeNumbers.get(from) ?? 0
    const b = nodeNumbers.get(to) ?? 0
    const conductance = 1 / resistanceOf(piece)
    equations[a][a] += conductance
    equations[b][b] += conductance
    equations[a][b] -= conductance
    equations[b][a] -= conductance
    if (piece.kind === 'battery') {
      const [plus, minus] = flips[batteryNumber++] ? [a, b] : [b, a]
      equations[plus][size] += batteryVoltage * conductance
      equations[minus][size] -= batteryVoltage * conductance
    }
  }
  return eliminate(equations)
}

function eliminate(equations: number[][]) {
  const size = equations.length
  for (let column = 0; column < size; column++) {
    let pivot = column
    for (let row = column + 1; row < size; row++) {
      if (Math.abs(equations[row][column]) > Math.abs(equations[pivot][column])) pivot = row
    }
    ;[equations[column], equations[pivot]] = [equations[pivot], equations[column]]
    for (let row = column + 1; row < size; row++) {
      const factor = equations[row][column] / equations[column][column]
      for (let entry = column; entry <= size; entry++) equations[row][entry] -= factor * equations[column][entry]
    }
  }
  const voltages = Array.from({ length: size }, () => 0)
  for (let row = size - 1; row >= 0; row--) {
    let rest = equations[row][size]
    for (let column = row + 1; column < size; column++) rest -= equations[row][column] * voltages[column]
    voltages[row] = rest / equations[row][row]
  }
  return voltages
}
