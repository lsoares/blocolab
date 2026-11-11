import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { World } from './World.ts'

describe('World', () => {
  test('a placed cube stays in the world', () => {
    const world = new World({ width: 4, height: 4, depth: 4 })

    world.placeCube({ x: 1, y: 0, z: 2 })

    assert.deepEqual(world.listCubes(), [{ x: 1, y: 0, z: 2 }])
  })

  test('placing on an occupied spot keeps a single cube', () => {
    const world = new World({ width: 4, height: 4, depth: 4 })
    world.placeCube({ x: 1, y: 0, z: 2 })

    world.placeCube({ x: 1, y: 0, z: 2 })

    assert.equal(world.listCubes().length, 1)
  })

  test('cubes cannot be placed outside the world', () => {
    const world = new World({ width: 4, height: 4, depth: 4 })

    world.placeCube({ x: 0, y: 4, z: 0 })

    assert.deepEqual(world.listCubes(), [])
  })

  test('an erased cube leaves the world', () => {
    const world = new World({ width: 4, height: 4, depth: 4 })
    world.placeCube({ x: 1, y: 0, z: 2 })
    world.placeCube({ x: 3, y: 0, z: 3 })

    world.eraseCube({ x: 1, y: 0, z: 2 })

    assert.deepEqual(world.listCubes(), [{ x: 3, y: 0, z: 3 }])
  })
})
