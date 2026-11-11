import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { World } from './World.ts'

describe('Placing blocks', () => {
  test('a placed cube keeps its size', () => {
    const world = new World({ width: 8, height: 3, depth: 8 })

    world.placeBlock({ kind: 'cube', origin: { x: 1, z: 2 }, size: { width: 3, height: 1, depth: 2 } })

    assert.deepEqual(world.listBlocks(), [
      { kind: 'cube', origin: { x: 1, z: 2 }, size: { width: 3, height: 1, depth: 2 } },
    ])
  })

  test('a placed ramp keeps the direction it rises to', () => {
    const world = new World({ width: 8, height: 3, depth: 8 })

    world.placeBlock({
      kind: 'ramp',
      origin: { x: 1, z: 2 },
      size: { width: 1, height: 1, depth: 4 },
      facing: 'north',
    })

    assert.deepEqual(world.listBlocks(), [
      { kind: 'ramp', origin: { x: 1, z: 2 }, size: { width: 1, height: 1, depth: 4 }, facing: 'north' },
    ])
  })

  test('a block cannot be drawn over another one', () => {
    const world = new World({ width: 8, height: 3, depth: 8 })
    world.placeBlock({ kind: 'cube', origin: { x: 0, z: 0 }, size: { width: 3, height: 1, depth: 3 } })

    world.placeBlock({ kind: 'ramp', origin: { x: 2, z: 2 }, size: { width: 2, height: 3, depth: 2 }, facing: 'south' })

    assert.deepEqual(world.listBlocks(), [
      { kind: 'cube', origin: { x: 0, z: 0 }, size: { width: 3, height: 1, depth: 3 } },
    ])
  })

  test('a block over another one has no room', () => {
    const world = new World({ width: 8, height: 3, depth: 8 })
    world.placeBlock({ kind: 'cube', origin: { x: 0, z: 0 }, size: { width: 3, height: 1, depth: 3 } })

    const hasRoom = world.hasRoomFor({ kind: 'cube', origin: { x: 2, z: 2 }, size: { width: 2, height: 1, depth: 2 } })

    assert.equal(hasRoom, false)
  })

  test('a block on free ground has room', () => {
    const world = new World({ width: 8, height: 3, depth: 8 })
    world.placeBlock({ kind: 'cube', origin: { x: 0, z: 0 }, size: { width: 3, height: 1, depth: 3 } })

    const hasRoom = world.hasRoomFor({ kind: 'cube', origin: { x: 3, z: 0 }, size: { width: 2, height: 1, depth: 2 } })

    assert.equal(hasRoom, true)
  })

  test('a block cannot reach outside the world', () => {
    const world = new World({ width: 8, height: 3, depth: 8 })

    world.placeBlock({ kind: 'cube', origin: { x: 6, z: 0 }, size: { width: 3, height: 1, depth: 1 } })

    assert.deepEqual(world.listBlocks(), [])
  })

  test('a block cannot be taller than the world', () => {
    const world = new World({ width: 8, height: 3, depth: 8 })

    world.placeBlock({ kind: 'cube', origin: { x: 0, z: 0 }, size: { width: 1, height: 4, depth: 1 } })

    assert.deepEqual(world.listBlocks(), [])
  })
})

describe('Erasing', () => {
  test('erasing a square of a block leaves the rest of it', () => {
    const world = new World({ width: 8, height: 3, depth: 8 })
    world.placeBlock({ kind: 'cube', origin: { x: 0, z: 0 }, size: { width: 3, height: 2, depth: 1 } })

    world.eraseAt({ x: 1, z: 0 })

    assert.deepEqual(world.listPieces(), [
      { kind: 'cube', spot: { x: 0, z: 0 }, height: 2 },
      { kind: 'cube', spot: { x: 2, z: 0 }, height: 2 },
    ])
  })

  test('a cut ramp keeps the slope of each piece', () => {
    const world = new World({ width: 8, height: 3, depth: 8 })
    world.placeBlock({ kind: 'ramp', origin: { x: 0, z: 0 }, size: { width: 3, height: 3, depth: 1 }, facing: 'east' })

    world.eraseAt({ x: 1, z: 0 })

    assert.deepEqual(world.listPieces(), [
      { kind: 'ramp', spot: { x: 0, z: 0 }, facing: 'east', low: 0, high: 1 },
      { kind: 'ramp', spot: { x: 2, z: 0 }, facing: 'east', low: 2, high: 3 },
    ])
  })

  test('a ramp rising north starts low at its south end', () => {
    const world = new World({ width: 8, height: 3, depth: 8 })

    world.placeBlock({ kind: 'ramp', origin: { x: 0, z: 0 }, size: { width: 1, height: 2, depth: 2 }, facing: 'north' })

    assert.deepEqual(world.listPieces(), [
      { kind: 'ramp', spot: { x: 0, z: 0 }, facing: 'north', low: 1, high: 2 },
      { kind: 'ramp', spot: { x: 0, z: 1 }, facing: 'north', low: 0, high: 1 },
    ])
  })

  test('erasing every square of a block removes the block', () => {
    const world = new World({ width: 8, height: 3, depth: 8 })
    world.placeBlock({ kind: 'cube', origin: { x: 0, z: 0 }, size: { width: 2, height: 1, depth: 1 } })
    world.eraseAt({ x: 0, z: 0 })

    world.eraseAt({ x: 1, z: 0 })

    assert.deepEqual(world.listBlocks(), [])
  })

  test('an erased square has room for a new block', () => {
    const world = new World({ width: 8, height: 3, depth: 8 })
    world.placeBlock({ kind: 'cube', origin: { x: 0, z: 0 }, size: { width: 3, height: 1, depth: 1 } })
    world.eraseAt({ x: 1, z: 0 })

    const hasRoom = world.hasRoomFor({ kind: 'cube', origin: { x: 1, z: 0 }, size: { width: 1, height: 3, depth: 1 } })

    assert.equal(hasRoom, true)
  })
})

describe('Finding pieces', () => {
  test('any spot of a block finds its piece there', () => {
    const world = new World({ width: 8, height: 3, depth: 8 })
    world.placeBlock({ kind: 'cube', origin: { x: 0, z: 0 }, size: { width: 2, height: 2, depth: 2 } })

    const piece = world.findPieceAt({ x: 1, z: 1 })

    assert.deepEqual(piece, { kind: 'cube', spot: { x: 1, z: 1 }, height: 2 })
  })

  test('an empty spot has no piece', () => {
    const world = new World({ width: 8, height: 3, depth: 8 })

    const piece = world.findPieceAt({ x: 3, z: 3 })

    assert.equal(piece, undefined)
  })
})

describe('Undo', () => {
  test('undo takes back the last placed block', () => {
    const world = new World({ width: 8, height: 3, depth: 8 })
    world.placeBlock({ kind: 'cube', origin: { x: 0, z: 0 }, size: { width: 1, height: 1, depth: 1 } })
    world.placeBlock({ kind: 'cube', origin: { x: 4, z: 0 }, size: { width: 1, height: 1, depth: 1 } })

    world.undo()

    assert.deepEqual(world.listBlocks(), [
      { kind: 'cube', origin: { x: 0, z: 0 }, size: { width: 1, height: 1, depth: 1 } },
    ])
  })

  test('undo brings back everything an eraser stroke removed', () => {
    const world = new World({ width: 8, height: 3, depth: 8 })
    world.placeBlock({ kind: 'cube', origin: { x: 0, z: 0 }, size: { width: 1, height: 1, depth: 1 } })
    world.placeBlock({ kind: 'cube', origin: { x: 2, z: 0 }, size: { width: 1, height: 1, depth: 1 } })
    world.startStroke()
    world.eraseAt({ x: 0, z: 0 })
    world.eraseAt({ x: 2, z: 0 })
    world.endStroke()

    world.undo()

    assert.equal(world.listBlocks().length, 2)
  })

  test('a stroke that changes nothing leaves nothing to undo', () => {
    const world = new World({ width: 8, height: 3, depth: 8 })
    world.placeBlock({ kind: 'cube', origin: { x: 0, z: 0 }, size: { width: 1, height: 1, depth: 1 } })
    world.startStroke()
    world.eraseAt({ x: 5, z: 5 })
    world.endStroke()

    world.undo()

    assert.deepEqual(world.listBlocks(), [])
  })

  test('there is nothing to undo in a new world', () => {
    const world = new World({ width: 8, height: 3, depth: 8 })

    const canUndo = world.canUndo()

    assert.equal(canUndo, false)
  })
})
