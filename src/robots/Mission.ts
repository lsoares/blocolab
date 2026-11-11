import type { Side } from '../stage/Grid.ts'
import { type Card, followCards, type Run } from './Cards.ts'
import type { Course } from './Course.ts'

export type RobotPlace = { x: number; z: number; yaw: number }

export class Mission {
  readonly course: Course
  private cards: Card[] = []
  private run?: Run
  private elapsed = 0

  constructor(course: Course) {
    this.course = course
  }

  listCards() {
    return [...this.cards]
  }

  addCard(card: Card) {
    if (this.isRunning() || (card === 'repeat' && !this.canRepeat())) return
    this.run = undefined
    this.cards.push(card)
  }

  canRepeat() {
    const last = this.cards.at(-1)
    return last !== undefined && last !== 'repeat' && !this.isRunning()
  }

  removeLastCard() {
    if (this.isRunning()) return
    this.run = undefined
    this.cards.pop()
  }

  clearCards() {
    this.run = undefined
    this.cards = []
  }

  canRemoveCard() {
    return this.cards.length > 0 && !this.isRunning()
  }

  startRun() {
    if (this.cards.length === 0 || this.isRunning()) return
    this.run = followCards(this.course, this.cards)
    this.elapsed = 0
  }

  advance(seconds: number) {
    if (this.run) this.elapsed = Math.min(this.elapsed + seconds, this.runSeconds())
  }

  isRunning() {
    return this.run !== undefined && this.elapsed < this.runSeconds()
  }

  findCardInProgress() {
    return this.isRunning() ? this.run?.cardOfStep[Math.floor(this.elapsed / stepSeconds)] : undefined
  }

  hasReachedStar() {
    return this.run?.outcome === 'reached-star' && !this.isRunning()
  }

  hasBumped() {
    return this.run?.outcome === 'bumped' && !this.isRunning()
  }

  findRobot(): RobotPlace {
    const poses = this.run?.poses ?? [this.course.start]
    const step = Math.min(Math.floor(this.elapsed / stepSeconds), poses.length - 1)
    const from = poses[step]
    const to = poses[Math.min(step + 1, poses.length - 1)]
    const progress = smooth(Math.min(this.elapsed / stepSeconds - step, 1))
    return {
      x: from.spot.x + 0.5 + (to.spot.x - from.spot.x) * progress,
      z: from.spot.z + 0.5 + (to.spot.z - from.spot.z) * progress,
      yaw: yawOf(from.heading) + shortestTurn(yawOf(from.heading), yawOf(to.heading)) * progress,
    }
  }

  private runSeconds() {
    return ((this.run?.poses.length ?? 1) - 1) * stepSeconds
  }
}

const stepSeconds = 0.6

function smooth(progress: number) {
  return progress * progress * (3 - 2 * progress)
}

function yawOf(heading: Side) {
  return { east: 0, north: Math.PI / 2, west: Math.PI, south: -Math.PI / 2 }[heading]
}

function shortestTurn(from: number, to: number) {
  const turn = (to - from) % (2 * Math.PI)
  if (turn > Math.PI) return turn - 2 * Math.PI
  if (turn < -Math.PI) return turn + 2 * Math.PI
  return turn
}
