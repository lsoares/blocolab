import { type Side, stepFrom } from '../stage/Grid.ts'
import type { Course, Pose } from './Course.ts'

export type Card = 'forward' | 'turn-left' | 'turn-right' | 'repeat'

export type Run = { poses: Pose[]; cardOfStep: number[]; outcome: 'reached-star' | 'bumped' | 'ended-short' }

export function followCards(course: Course, cards: Card[]): Run {
  const poses = [course.start]
  const cardOfStep: number[] = []
  for (const { card, index } of listSteps(cards)) {
    cardOfStep.push(index)
    const { spot, heading } = poses[poses.length - 1]
    if (card !== 'forward') {
      poses.push({ spot, heading: turned(heading, card) })
      continue
    }
    const ahead = stepFrom(spot, heading)
    if (isBlocked(course, ahead)) return { poses: [...poses, { spot, heading }], cardOfStep, outcome: 'bumped' }
    poses.push({ spot: ahead, heading })
    if (ahead.x === course.star.x && ahead.z === course.star.z) return { poses, cardOfStep, outcome: 'reached-star' }
  }
  return { poses, cardOfStep, outcome: 'ended-short' }
}

function listSteps(cards: Card[]) {
  return cards.flatMap((card, index) => {
    if (card !== 'repeat') return [{ card, index }]
    const before = cards[index - 1]
    return before === undefined || before === 'repeat' ? [] : [before, before].map((again) => ({ card: again, index }))
  })
}

function turned(heading: Side, card: 'turn-left' | 'turn-right'): Side {
  const clockwise: Side[] = ['north', 'east', 'south', 'west']
  const turn = card === 'turn-right' ? 1 : 3
  return clockwise[(clockwise.indexOf(heading) + turn) % 4]
}

function isBlocked({ size, rocks }: Course, { x, z }: { x: number; z: number }) {
  const outside = x < 0 || z < 0 || x >= size.columns || z >= size.rows
  return outside || rocks.some((rock) => rock.x === x && rock.z === z)
}
