export type Spot = { x: number; z: number }

export type Axis = 'horizontal' | 'vertical'

export type Side = 'north' | 'east' | 'south' | 'west'

export type BoardSize = { columns: number; rows: number }

export const opposite: Record<Side, Side> = { north: 'south', east: 'west', south: 'north', west: 'east' }

export function stepFrom({ x, z }: Spot, side: Side): Spot {
  const steps = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] }[side]
  return { x: x + steps[0], z: z + steps[1] }
}
