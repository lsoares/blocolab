import { type Side, stepFrom } from '../stage/Grid.ts'
import type { Course, Pose } from './Course.ts'

export type Card = 'forward' | 'turn-left' | 'turn-right'

export type Run = { poses: Pose[]; outcome: 'reached-star' | 'bumped' | 'ended-short' }

export function followCards(course: Course, cards: Card[]): Run {
  const poses = [course.start]
  for (const card of cards) {
    const { spot, heading } = poses[poses.length - 1]
    if (card !== 'forward') {
      poses.push({ spot, heading: turned(heading, card) })
      continue
    }
    const ahead = stepFrom(spot, heading)
    if (isBlocked(course, ahead)) return { poses: [...poses, { spot, heading }], outcome: 'bumped' }
    poses.push({ spot: ahead, heading })
    if (ahead.x === course.star.x && ahead.z === course.star.z) return { poses, outcome: 'reached-star' }
  }
  return { poses, outcome: 'ended-short' }
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
