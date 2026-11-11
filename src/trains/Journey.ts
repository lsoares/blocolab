import { opposite, type Side, type Spot, stepFrom } from '../stage/Grid.ts'
import { chooseExit, findStartTraversal, type Traversal, terminalSidesOf } from './Rails.ts'
import type { Piece, Railway } from './Railway.ts'

export type Car = { x: number; z: number; heading: number; hidden: boolean; lift: number }

type Point = { x: number; z: number }

export class Journey {
  private traversal?: Traversal
  private travelled = 0
  private alternation = 0
  private waitRemaining = 0
  private stationDone = true
  private startedAt?: Spot
  private trail: Point[] = []
  private readonly railway: Railway

  constructor(railway: Railway) {
    this.railway = railway
    this.restart()
  }

  sync() {
    const start = this.railway.findTrainSpot()
    const stillOnTrack = this.traversal && this.cellStillMeets(this.traversal)
    if (!start) return this.clear()
    if (!this.startedAt || start.x !== this.startedAt.x || start.z !== this.startedAt.z || !stillOnTrack) {
      this.restart()
    }
  }

  advance(seconds: number) {
    let time = seconds
    for (let guard = 0; guard < 20000 && time > 1e-9 && this.traversal; guard++) {
      if (this.waitRemaining > 0) {
        const waited = Math.min(time, this.waitRemaining)
        this.waitRemaining -= waited
        time -= waited
        continue
      }
      const length = lengthOf(this.traversal)
      if (length - this.travelled <= 1e-9) {
        if (!this.arrive()) break
        continue
      }
      const step = Math.min(time * speed, length - this.travelled, 0.05, this.distanceToStationStop(length))
      this.travelled += step
      time -= step / speed
      this.record(pointAlong(this.traversal, this.travelled))
      if (this.isAtStationStop(length)) {
        this.stationDone = true
        this.waitRemaining = 2
      }
    }
  }

  listCars(): Car[] {
    if (!this.traversal || this.trail.length === 0) return []
    return [0, 1, 2].map((index) => {
      const { point, heading } = this.findPointBehind(index * carSpacing)
      const piece = this.railway.findPieceAt({ x: Math.floor(point.x), z: Math.floor(point.z) })
      return { ...point, heading, hidden: piece?.kind === 'tunnel', lift: liftOver(piece, point, heading) }
    })
  }

  findEngineSpot(): Spot | undefined {
    const engine = this.trail.at(-1)
    return engine && { x: Math.floor(engine.x), z: Math.floor(engine.z) }
  }

  private restart() {
    const start = this.railway.findTrainSpot()
    this.startedAt = start
    this.traversal = start && findStartTraversal(this.railway.listPieces(), start)
    this.alternation = 0
    this.waitRemaining = 0
    this.stationDone = true
    this.trail = []
    if (!this.traversal) return
    this.travelled = lengthOf(this.traversal) / 2
    this.record(pointAlong(this.traversal, this.travelled))
  }

  private clear() {
    this.startedAt = undefined
    this.traversal = undefined
    this.trail = []
  }

  private cellStillMeets({ spot, enter, exit }: Traversal) {
    const piece = this.railway.findPieceAt(spot)
    const sides = piece ? terminalSidesOf(piece) : []
    return sides.includes(exit) && (sides.includes(enter) || this.travelled <= 0.5)
  }

  private arrive() {
    if (!this.traversal) return false
    const pieces = this.railway.listPieces()
    if (this.traversal.isEnd) return this.leaveTheEndOfTheLine(this.traversal, pieces)
    const next = stepFrom(this.traversal.spot, this.traversal.exit)
    const nextPiece = this.railway.findPieceAt(next)
    const enter = opposite[this.traversal.exit]
    if (!nextPiece || !terminalSidesOf(nextPiece).includes(enter)) return false
    if (nextPiece.kind === 'signal' && !nextPiece.go) return false
    const choice = chooseExit(pieces, next, enter, this.alternation)
    this.travelled = 0
    this.stationDone = nextPiece.kind !== 'station'
    if (!choice) {
      this.traversal = { spot: next, enter, exit: opposite[enter], isEnd: true }
      return true
    }
    this.alternation = choice.alternation
    this.traversal = { spot: next, enter, exit: choice.exit, isEnd: false }
    return true
  }

  private leaveTheEndOfTheLine({ spot, enter }: Traversal, pieces: Parameters<typeof chooseExit>[0]) {
    const choice = chooseExit(pieces, spot, enter, this.alternation)
    if (!choice) return false
    this.alternation = choice.alternation
    this.traversal = { spot, enter, exit: choice.exit, isEnd: false }
    this.travelled = lengthOf(this.traversal) / 2
    return true
  }

  private distanceToStationStop(length: number) {
    const stop = length / 2
    return this.isStationCell() && !this.stationDone && this.travelled < stop
      ? stop - this.travelled
      : Number.POSITIVE_INFINITY
  }

  private isAtStationStop(length: number) {
    return this.isStationCell() && !this.stationDone && Math.abs(this.travelled - length / 2) < 1e-9
  }

  private isStationCell() {
    return this.traversal !== undefined && this.railway.findPieceAt(this.traversal.spot)?.kind === 'station'
  }

  private record(point: Point) {
    const last = this.trail.at(-1)
    if (last && Math.hypot(point.x - last.x, point.z - last.z) < 1e-6) return
    this.trail.push(point)
    let kept = 0
    for (let index = this.trail.length - 1; index > 0; index--) {
      kept += Math.hypot(this.trail[index].x - this.trail[index - 1].x, this.trail[index].z - this.trail[index - 1].z)
      if (kept > carSpacing * 3) return void this.trail.splice(0, index - 1)
    }
  }

  private findPointBehind(distance: number) {
    let remaining = distance
    for (let index = this.trail.length - 1; index > 0; index--) {
      const to = this.trail[index]
      const from = this.trail[index - 1]
      const segment = Math.hypot(to.x - from.x, to.z - from.z)
      if (remaining <= segment) {
        const along = segment === 0 ? 0 : remaining / segment
        return {
          point: { x: to.x + (from.x - to.x) * along, z: to.z + (from.z - to.z) * along },
          heading: Math.atan2(to.z - from.z, to.x - from.x),
        }
      }
      remaining -= segment
    }
    const first = this.trail[0]
    return { point: first, heading: this.headingAtStart() }
  }

  private headingAtStart() {
    if (!this.traversal) return 0
    const behind = pointAlong(this.traversal, Math.max(this.travelled - 0.01, 0))
    const ahead = pointAlong(this.traversal, this.travelled + 0.01)
    return Math.atan2(ahead.z - behind.z, ahead.x - behind.x)
  }
}

export const bridgeRise = 0.5
const speed = 1.5
const carSpacing = 0.8

function liftOver(piece: Piece | undefined, point: Point, heading: number) {
  if (piece?.kind !== 'bridge') return 0
  const alongTheBridge =
    piece.axis === 'horizontal' ? Math.abs(Math.cos(heading)) > 0.7 : Math.abs(Math.sin(heading)) > 0.7
  if (!alongTheBridge) return 0
  const across = piece.axis === 'horizontal' ? point.x - Math.floor(point.x) : point.z - Math.floor(point.z)
  return (bridgeRise * (1 - Math.cos(2 * Math.PI * across))) / 2
}

function lengthOf({ enter, exit, isEnd }: Traversal) {
  if (isEnd) return 0.5
  return exit === opposite[enter] ? 1 : Math.PI / 4
}

function vectorOf(side: Side) {
  return { north: { x: 0, z: -1 }, east: { x: 1, z: 0 }, south: { x: 0, z: 1 }, west: { x: -1, z: 0 } }[side]
}

function pointAlong({ spot, enter, exit }: Traversal, travelled: number): Point {
  const centre = { x: spot.x + 0.5, z: spot.z + 0.5 }
  const entry = vectorOf(enter)
  const way = vectorOf(exit)
  if (exit === opposite[enter]) {
    return { x: centre.x + entry.x * (0.5 - travelled), z: centre.z + entry.z * (0.5 - travelled) }
  }
  const corner = { x: centre.x + 0.5 * entry.x + 0.5 * way.x, z: centre.z + 0.5 * entry.z + 0.5 * way.z }
  const angle = travelled / 0.5
  return {
    x: corner.x + 0.5 * (-way.x * Math.cos(angle) - entry.x * Math.sin(angle)),
    z: corner.z + 0.5 * (-way.z * Math.cos(angle) - entry.z * Math.sin(angle)),
  }
}
