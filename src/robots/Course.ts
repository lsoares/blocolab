import type { BoardSize, Side, Spot } from '../stage/Grid.ts'

export type Pose = { spot: Spot; heading: Side }

export type Course = { size: BoardSize; start: Pose; star: Spot; rocks: Spot[] }

const robotHeadings: Record<string, Side> = { '^': 'north', '>': 'east', v: 'south', '<': 'west' }

export function buildCourse(drawing: string[], size: BoardSize): Course {
  const left = Math.floor((size.columns - drawing[0].length) / 2)
  const top = Math.floor((size.rows - drawing.length) / 2)
  const spots = (symbol: (character: string) => boolean) =>
    drawing.flatMap((row, z) =>
      [...row].flatMap((character, x) => (symbol(character) ? [{ x: left + x, z: top + z }] : [])),
    )
  const [start] = spots((character) => character in robotHeadings)
  const [star] = spots((character) => character === '*')
  const heading =
    robotHeadings[drawing.flatMap((row) => [...row]).find((character) => character in robotHeadings) ?? '>']
  return { size, start: { spot: start, heading }, star, rocks: spots((character) => character === '#') }
}
