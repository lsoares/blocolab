import assert from 'node:assert/strict'
import { before, describe, test } from 'node:test'
import { preparePhysics, Run } from './Run.ts'
import { World } from './World.ts'

describe('Running the world', () => {
  before(preparePhysics)

  test('a ball on flat ground stays on its spot', () => {
    const world = new World({ width: 8, height: 3, depth: 8 })
    world.placeBall({ x: 4, z: 4 })
    const run = new Run(world)

    run.advance(2)

    const [ball] = run.listBallPositions()
    assert.deepEqual([Math.floor(ball.x), Math.floor(ball.z)], [4, 4])
  })

  test('a ball on a ramp rolls down past its low end', () => {
    const world = new World({ width: 12, height: 3, depth: 8 })
    world.placeBlock({ kind: 'ramp', origin: { x: 4, z: 4 }, size: { width: 4, height: 2, depth: 1 }, facing: 'east' })
    world.placeBall({ x: 7, z: 4 })
    const run = new Run(world)

    run.advance(3)

    const [ball] = run.listBallPositions()
    assert.ok(ball.x < 4, `the ball stopped at x=${ball.x}`)
  })

  test('a cube stops a rolling ball', () => {
    const world = new World({ width: 12, height: 3, depth: 8 })
    world.placeBlock({ kind: 'ramp', origin: { x: 4, z: 4 }, size: { width: 4, height: 2, depth: 1 }, facing: 'east' })
    world.placeBlock({ kind: 'cube', origin: { x: 1, z: 3 }, size: { width: 1, height: 2, depth: 3 } })
    world.placeBall({ x: 7, z: 4 })
    const run = new Run(world)

    run.advance(4)

    const [ball] = run.listBallPositions()
    assert.ok(ball.x >= 2, `the ball went through the cube to x=${ball.x}`)
  })
})
