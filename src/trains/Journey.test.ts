import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { Journey } from './Journey.ts'
import { type Piece, Railway } from './Railway.ts'

describe('The train on its way', () => {
  test('the train rolls along the track', () => {
    const railway = new Railway({ columns: 10, rows: 6 })
    draw(railway, ['Mtttt'])
    const journey = new Journey(railway)

    journey.advance(1)

    assert.ok((journey.listCars()[0]?.x ?? 0) > 1.5)
  })

  test('the train stops at the end of an open line', () => {
    const railway = new Railway({ columns: 10, rows: 6 })
    draw(railway, ['Mtttt'])
    const journey = new Journey(railway)

    journey.advance(30)

    assert.ok(Math.abs((journey.listCars()[0]?.x ?? 0) - 4.5) < 0.05)
  })

  test('on a closed loop the train keeps going', () => {
    const railway = new Railway({ columns: 10, rows: 6 })
    draw(railway, ['Mtt', 't.t', 'ttt'])
    const journey = new Journey(railway)
    journey.advance(30)
    const before = journey.listCars()[0]

    journey.advance(0.5)

    const after = journey.listCars()[0]
    assert.ok(Math.hypot((after?.x ?? 0) - (before?.x ?? 0), (after?.z ?? 0) - (before?.z ?? 0)) > 0.3)
  })

  test('the train follows the track round a corner', () => {
    const railway = new Railway({ columns: 10, rows: 6 })
    draw(railway, ['Mtt', '..t', '..t'])
    const journey = new Journey(railway)

    journey.advance(30)

    assert.ok(Math.abs((journey.listCars()[0]?.z ?? 0) - 2.5) < 0.05)
  })

  test('a station keeps the train waiting', () => {
    const railway = new Railway({ columns: 10, rows: 6 })
    draw(railway, ['MtEtt'])
    const journey = new Journey(railway)
    journey.advance(1.4)

    journey.advance(1.5)

    assert.ok(Math.abs((journey.listCars()[0]?.x ?? 0) - 2.5) < 0.1)
  })

  test('the train leaves the station after waiting', () => {
    const railway = new Railway({ columns: 10, rows: 6 })
    draw(railway, ['MtEtt'])
    const journey = new Journey(railway)
    journey.advance(1.4)

    journey.advance(3.5)

    assert.ok((journey.listCars()[0]?.x ?? 0) > 3)
  })

  test('a red signal stops the train before it', () => {
    const railway = new Railway({ columns: 10, rows: 6 })
    draw(railway, ['MtRtt'])
    const journey = new Journey(railway)

    journey.advance(10)

    const x = journey.listCars()[0]?.x ?? 0
    assert.ok(x > 1.9 && x <= 2.01, `the train stopped at x=${x}`)
  })

  test('a green signal lets the train pass', () => {
    const railway = new Railway({ columns: 10, rows: 6 })
    draw(railway, ['MtGtt'])
    const journey = new Journey(railway)

    journey.advance(10)

    assert.ok(Math.abs((journey.listCars()[0]?.x ?? 0) - 4.5) < 0.05)
  })

  test('turning a red signal green lets the waiting train go', () => {
    const railway = new Railway({ columns: 10, rows: 6 })
    draw(railway, ['MtRtt'])
    const journey = new Journey(railway)
    journey.advance(10)
    railway.toggleSignalAt({ x: 2, z: 0 })

    journey.advance(10)

    assert.ok((journey.listCars()[0]?.x ?? 0) > 4)
  })

  test('the train goes on when the line is made longer', () => {
    const railway = new Railway({ columns: 10, rows: 6 })
    draw(railway, ['Mtt'])
    const journey = new Journey(railway)
    journey.advance(10)
    railway.placePiece({ kind: 'track', spot: { x: 3, z: 0 } })
    railway.placePiece({ kind: 'track', spot: { x: 4, z: 0 } })

    journey.advance(10)

    assert.ok(Math.abs((journey.listCars()[0]?.x ?? 0) - 4.5) < 0.05)
  })

  test('the wagons follow behind the engine', () => {
    const railway = new Railway({ columns: 10, rows: 6 })
    draw(railway, ['Mtttt'])
    const journey = new Journey(railway)

    journey.advance(2.5)

    const [engine, first, second] = journey.listCars()
    assert.ok(engine.x > first.x && first.x > second.x, `cars at ${engine.x}, ${first.x}, ${second.x}`)
  })

  test('the train is hidden inside a tunnel', () => {
    const railway = new Railway({ columns: 10, rows: 6 })
    draw(railway, ['MtUtt'])
    const journey = new Journey(railway)

    journey.advance(1.34)

    assert.equal(journey.listCars()[0]?.hidden, true)
  })

  test('the train is in plain view outside the tunnel', () => {
    const railway = new Railway({ columns: 10, rows: 6 })
    draw(railway, ['MtUtt'])
    const journey = new Journey(railway)

    journey.advance(0.3)

    assert.equal(journey.listCars()[0]?.hidden, false)
  })

  test('erasing the track the train started on takes the train away', () => {
    const railway = new Railway({ columns: 10, rows: 6 })
    draw(railway, ['Mtt'])
    const journey = new Journey(railway)
    railway.eraseAt({ x: 0, z: 0 })

    journey.sync()

    assert.deepEqual(journey.listCars(), [])
  })

  test('a train put somewhere else starts from there', () => {
    const railway = new Railway({ columns: 10, rows: 6 })
    draw(railway, ['Mtttt'])
    const journey = new Journey(railway)
    journey.advance(1)
    railway.placeTrain({ x: 3, z: 0 })

    journey.sync()

    assert.ok(Math.abs((journey.listCars()[0]?.x ?? 0) - 3.5) < 0.05)
  })
})

describe('The train on a bridge', () => {
  test('the train rises to the top of the bridge', () => {
    const railway = new Railway({ columns: 10, rows: 6 })
    draw(railway, ['.t.', 'MBt', '.t.'])
    const journey = new Journey(railway)

    journey.advance(0.67)

    assert.ok((journey.listCars()[0]?.lift ?? 0) > 0.4)
  })

  test('the train does not rise while passing under the bridge', () => {
    const railway = new Railway({ columns: 10, rows: 6 })
    draw(railway, ['.M.', 'tBt', '.t.'])
    const journey = new Journey(railway)

    journey.advance(0.67)

    assert.equal(journey.listCars()[0]?.lift, 0)
  })

  test('the train is level again after the bridge', () => {
    const railway = new Railway({ columns: 10, rows: 6 })
    draw(railway, ['MBttt'])
    const journey = new Journey(railway)

    journey.advance(3)

    assert.equal(journey.listCars()[0]?.lift, 0)
  })

  test('points send the train down the branch', () => {
    const railway = new Railway({ columns: 10, rows: 6 })
    draw(railway, ['MPt', '.t.'])
    railway.turnPointsAt({ x: 1, z: 0 })
    railway.turnPointsAt({ x: 1, z: 0 })
    const journey = new Journey(railway)

    journey.advance(10)

    assert.ok(Math.abs((journey.listCars()[0]?.z ?? 0) - 1.5) < 0.05)
  })
})

function draw(railway: Railway, rows: string[]) {
  let train: { x: number; z: number } | undefined
  rows.forEach((row, z) => {
    for (const [x, symbol] of [...row].entries()) {
      const piece = pieceFor(symbol, { x, z })
      if (piece) railway.placePiece(piece)
      if (symbol === 'G') railway.toggleSignalAt({ x, z })
      if (symbol === 'M') train = { x, z }
    }
  })
  if (train) railway.placeTrain(train)
}

function pieceFor(symbol: string, spot: { x: number; z: number }): Piece | undefined {
  if (symbol === 't' || symbol === 'M') return { kind: 'track', spot }
  if (symbol === 'E') return { kind: 'station', spot, axis: 'horizontal' }
  if (symbol === 'U') return { kind: 'tunnel', spot, axis: 'horizontal' }
  if (symbol === 'B') return { kind: 'bridge', spot, axis: 'horizontal' }
  if (symbol === 'P') return { kind: 'points', spot, side: 'east' }
  if (symbol === 'R' || symbol === 'G') return { kind: 'signal', spot, axis: 'horizontal', go: false }
  return undefined
}
