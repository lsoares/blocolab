import { describe, expect, test } from 'vitest'
import { World } from './World'

describe('World', () => {
  test('a placed cube stays in the world', () => {
    const world = new World({ width: 4, height: 4, depth: 4 })

    world.placeCube({ x: 1, y: 0, z: 2 })

    expect(world.listCubes()).toEqual([{ x: 1, y: 0, z: 2 }])
  })

  test('placing on an occupied spot keeps a single cube', () => {
    const world = new World({ width: 4, height: 4, depth: 4 })
    world.placeCube({ x: 1, y: 0, z: 2 })

    world.placeCube({ x: 1, y: 0, z: 2 })

    expect(world.listCubes()).toHaveLength(1)
  })

  test('cubes cannot be placed outside the world', () => {
    const world = new World({ width: 4, height: 4, depth: 4 })

    world.placeCube({ x: 0, y: 4, z: 0 })

    expect(world.listCubes()).toEqual([])
  })

  test('an erased cube leaves the world', () => {
    const world = new World({ width: 4, height: 4, depth: 4 })
    world.placeCube({ x: 1, y: 0, z: 2 })

    world.eraseCube({ x: 1, y: 0, z: 2 })

    expect(world.hasCube({ x: 1, y: 0, z: 2 })).toBe(false)
  })
})
