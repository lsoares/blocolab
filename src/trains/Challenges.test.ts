import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { challenges } from './Challenges.ts'
import { type Piece, Railway } from './Railway.ts'

describe('Train challenges', () => {
  test('a train with nowhere to go does not meet the first challenge', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['M'])

    const met = challenges[0].isMet(railway)

    assert.equal(met, false)
  })

  test('a train on a line meets the first challenge', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['Mtt'])

    const met = challenges[0].isMet(railway)

    assert.equal(met, true)
  })

  test('a line without a train does not meet the first challenge', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['ttt'])

    const met = challenges[0].isMet(railway)

    assert.equal(met, false)
  })

  test('a train on a loop meets the loop challenge', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['Mtt', 't.t', 'ttt'])

    const met = challenges[1].isMet(railway)

    assert.equal(met, true)
  })

  test('a train on a line with an end does not meet the loop challenge', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['Mttt'])

    const met = challenges[1].isMet(railway)

    assert.equal(met, false)
  })

  test('a station on the way meets the station challenge', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['MtEtt'])

    const met = challenges[2].isMet(railway)

    assert.equal(met, true)
  })

  test('a station off the way does not meet the station challenge', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['Mtt', '...', 'E..'])

    const met = challenges[2].isMet(railway)

    assert.equal(met, false)
  })

  test('a tunnel on the way meets the tunnel challenge', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['MtUtt'])

    const met = challenges[3].isMet(railway)

    assert.equal(met, true)
  })

  test('a red signal on the way meets the red signal challenge', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['MtRtt'])

    const met = challenges[4].isMet(railway)

    assert.equal(met, true)
  })

  test('a green signal on the way does not meet the red signal challenge', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['MtGtt'])

    const met = challenges[4].isMet(railway)

    assert.equal(met, false)
  })

  test('a loop with a green signal meets the green signal loop challenge', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['Mtt', 't.t', 'tGt'])

    const met = challenges[5].isMet(railway)

    assert.equal(met, true)
  })

  test('a loop with a red signal does not meet the green signal loop challenge', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['Mtt', 't.t', 'tRt'])

    const met = challenges[5].isMet(railway)

    assert.equal(met, false)
  })

  test('a figure of eight meets the crossing challenge', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['ttt..', 't.t..', 'Mtttt', '..t.t', '..ttt'])

    const met = challenges[6].isMet(railway)

    assert.equal(met, true)
  })

  test('a plain loop does not meet the crossing challenge', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['Mtt', 't.t', 'ttt'])

    const met = challenges[6].isMet(railway)

    assert.equal(met, false)
  })

  test('three trees beside the line meet the trees challenge', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['ttt', 'aaa'])

    const met = challenges[7].isMet(railway)

    assert.equal(met, true)
  })

  test('trees far from the line do not meet the trees challenge', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['ttt', '...', '...', 'aaa'])

    const met = challenges[7].isMet(railway)

    assert.equal(met, false)
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
  if (symbol === 'a') return { kind: 'tree', spot }
  if (symbol === 'E') return { kind: 'station', spot, axis: 'horizontal' }
  if (symbol === 'U') return { kind: 'tunnel', spot, axis: 'horizontal' }
  if (symbol === 'R' || symbol === 'G') return { kind: 'signal', spot, axis: 'horizontal', go: false }
  return undefined
}
