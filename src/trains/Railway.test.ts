import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { type Piece, Railway } from './Railway.ts'

describe('Laying pieces', () => {
  test('a placed track stays on its spot', () => {
    const railway = new Railway({ columns: 8, rows: 6 })

    railway.placePiece({ kind: 'track', spot: { x: 2, z: 1 } })

    assert.deepEqual(railway.listPieces(), [{ kind: 'track', spot: { x: 2, z: 1 } }])
  })

  test('a piece cannot be placed outside the board', () => {
    const railway = new Railway({ columns: 8, rows: 6 })

    railway.placePiece({ kind: 'track', spot: { x: 8, z: 0 } })

    assert.deepEqual(railway.listPieces(), [])
  })

  test('placing on an occupied spot replaces the piece', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    railway.placePiece({ kind: 'track', spot: { x: 2, z: 1 } })

    railway.placePiece({ kind: 'tree', spot: { x: 2, z: 1 } })

    assert.deepEqual(railway.listPieces(), [{ kind: 'tree', spot: { x: 2, z: 1 } }])
  })

  test('an erased piece leaves the board', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    railway.placePiece({ kind: 'track', spot: { x: 2, z: 1 } })

    railway.eraseAt({ x: 2, z: 1 })

    assert.deepEqual(railway.listPieces(), [])
  })

  test('toggling a signal lets the train go', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    railway.placePiece({ kind: 'signal', spot: { x: 2, z: 1 }, axis: 'horizontal', go: false })

    railway.toggleSignalAt({ x: 2, z: 1 })

    assert.deepEqual(railway.listPieces(), [{ kind: 'signal', spot: { x: 2, z: 1 }, axis: 'horizontal', go: true }])
  })

  test('toggling a green signal stops the train again', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    railway.placePiece({ kind: 'signal', spot: { x: 2, z: 1 }, axis: 'horizontal', go: true })

    railway.toggleSignalAt({ x: 2, z: 1 })

    assert.deepEqual(railway.listPieces(), [{ kind: 'signal', spot: { x: 2, z: 1 }, axis: 'horizontal', go: false }])
  })
})

describe('Pieces turning by themselves', () => {
  test('a station turns to meet the track beside it', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    railway.placePiece({ kind: 'station', spot: { x: 1, z: 1 }, axis: 'vertical' })

    railway.placePiece({ kind: 'track', spot: { x: 2, z: 1 } })

    assert.deepEqual(railway.findPieceAt({ x: 1, z: 1 }), {
      kind: 'station',
      spot: { x: 1, z: 1 },
      axis: 'horizontal',
    })
  })

  test('a tunnel that already meets a track keeps its way', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['tUt'])

    railway.placePiece({ kind: 'track', spot: { x: 1, z: 1 } })

    assert.deepEqual(railway.findPieceAt({ x: 1, z: 0 }), { kind: 'tunnel', spot: { x: 1, z: 0 }, axis: 'horizontal' })
  })

  test('a track links to the tracks beside it', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['tt.', 't..'])

    const sides = railway.listLinkedSides({ x: 0, z: 0 })

    assert.deepEqual(sides, ['east', 'south'])
  })

  test('a tree is not part of the line', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['ta'])

    const sides = railway.listLinkedSides({ x: 0, z: 0 })

    assert.deepEqual(sides, [])
  })
})

describe('The train', () => {
  test('the train stands on a track', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    railway.placePiece({ kind: 'track', spot: { x: 1, z: 1 } })

    railway.placeTrain({ x: 1, z: 1 })

    assert.deepEqual(railway.findTrainSpot(), { x: 1, z: 1 })
  })

  test('the train cannot stand on an empty spot', () => {
    const railway = new Railway({ columns: 8, rows: 6 })

    railway.placeTrain({ x: 1, z: 1 })

    assert.equal(railway.findTrainSpot(), undefined)
  })

  test('the train cannot stand on a tree', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    railway.placePiece({ kind: 'tree', spot: { x: 1, z: 1 } })

    railway.placeTrain({ x: 1, z: 1 })

    assert.equal(railway.findTrainSpot(), undefined)
  })

  test('erasing the track under the train takes the train away', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['Mtt'])

    railway.eraseAt({ x: 0, z: 0 })

    assert.equal(railway.findTrainSpot(), undefined)
  })

  test('a station put under the train keeps the train', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['Mtt'])

    railway.placePiece({ kind: 'station', spot: { x: 0, z: 0 }, axis: 'horizontal' })

    assert.deepEqual(railway.findTrainSpot(), { x: 0, z: 0 })
  })

  test('undo takes the train back off', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    railway.placePiece({ kind: 'track', spot: { x: 1, z: 1 } })
    railway.placeTrain({ x: 1, z: 1 })

    railway.undo()

    assert.equal(railway.findTrainSpot(), undefined)
  })

  test('removing the train leaves the track', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['Mtt'])

    railway.removeTrain()

    assert.equal(railway.listPieces().length, 3)
  })
})

describe('Undo', () => {
  test('undo takes back a whole stroke at once', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    railway.startStroke()
    railway.placePiece({ kind: 'track', spot: { x: 1, z: 1 } })
    railway.placePiece({ kind: 'track', spot: { x: 2, z: 1 } })
    railway.endStroke()

    railway.undo()

    assert.deepEqual(railway.listPieces(), [])
  })

  test('placing the same piece again leaves nothing extra to undo', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    railway.placePiece({ kind: 'track', spot: { x: 1, z: 1 } })
    railway.placePiece({ kind: 'track', spot: { x: 1, z: 1 } })

    railway.undo()

    assert.deepEqual(railway.listPieces(), [])
  })

  test('starting over leaves an empty board with nothing to undo', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['Mtt'])

    railway.startOver()

    assert.deepEqual([railway.listPieces(), railway.findTrainSpot(), railway.canUndo()], [[], undefined, false])
  })
})

describe('The route of the train', () => {
  test('a train on a closed loop goes round forever', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['Mtt', 't.t', 'ttt'])

    const route = railway.planRoute()

    assert.equal(route?.closed, true)
  })

  test('a train on a line with an end stops at the end', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['Mttt'])

    const route = railway.planRoute()

    assert.deepEqual([route?.closed, route?.visits.map(({ spot }) => spot.x)], [false, [0, 1, 2, 3]])
  })

  test('a gap in the loop makes the line end there', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['Mtt', 't.t', 'tt.'])

    const route = railway.planRoute()

    assert.equal(route?.closed, false)
  })

  test('a train passes through a station on the loop', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['Mtt', 't.t', 'tEt'])

    const visited = railway.planRoute()?.visits.some(({ spot }) => spot.x === 1 && spot.z === 2)

    assert.equal(visited, true)
  })

  test('a train goes straight across a crossing', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['.t.', 'Mtt', '.t.'])

    const route = railway.planRoute()

    assert.deepEqual(
      route?.visits.map(({ spot }) => [spot.x, spot.z]),
      [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
    )
  })

  test('there is no route without a train', () => {
    const railway = new Railway({ columns: 8, rows: 6 })
    draw(railway, ['ttt'])

    const route = railway.planRoute()

    assert.equal(route, undefined)
  })
})

function draw(railway: Railway, rows: string[]) {
  let train: { x: number; z: number } | undefined
  rows.forEach((row, z) => {
    for (const [x, symbol] of [...row].entries()) {
      const piece = pieceFor(symbol, { x, z })
      if (piece) railway.placePiece(piece)
      if (symbol === 'G' || symbol === 'g') railway.toggleSignalAt({ x, z })
      if (symbol === 'M') train = { x, z }
    }
  })
  if (train) railway.placeTrain(train)
}

function pieceFor(symbol: string, spot: { x: number; z: number }): Piece | undefined {
  const axis = symbol === symbol.toUpperCase() ? 'horizontal' : 'vertical'
  if (symbol === 't' || symbol === 'M') return { kind: 'track', spot }
  if (symbol === 'a') return { kind: 'tree', spot }
  if (symbol.toLowerCase() === 'e') return { kind: 'station', spot, axis }
  if (symbol.toLowerCase() === 'u') return { kind: 'tunnel', spot, axis }
  if (symbol.toLowerCase() === 'r' || symbol.toLowerCase() === 'g') return { kind: 'signal', spot, axis, go: false }
  return undefined
}
