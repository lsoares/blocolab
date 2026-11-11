import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { Board, type Piece } from './Board.ts'

describe('Placing pieces', () => {
  test('a placed piece stays on its spot', () => {
    const board = new Board({ columns: 6, rows: 4 })

    board.placePiece({ kind: 'lamp', spot: { x: 2, z: 1 }, axis: 'vertical' })

    assert.deepEqual(board.listPieces(), [{ kind: 'lamp', spot: { x: 2, z: 1 }, axis: 'vertical' }])
  })

  test('a spot holds only one piece', () => {
    const board = new Board({ columns: 6, rows: 4 })
    board.placePiece({ kind: 'wire', spot: { x: 2, z: 1 } })

    board.placePiece({ kind: 'lamp', spot: { x: 2, z: 1 }, axis: 'horizontal' })

    assert.deepEqual(board.listPieces(), [{ kind: 'wire', spot: { x: 2, z: 1 } }])
  })

  test('a piece cannot be placed outside the board', () => {
    const board = new Board({ columns: 6, rows: 4 })

    board.placePiece({ kind: 'wire', spot: { x: 6, z: 0 } })

    assert.deepEqual(board.listPieces(), [])
  })

  test('an erased piece leaves the board', () => {
    const board = new Board({ columns: 6, rows: 4 })
    board.placePiece({ kind: 'wire', spot: { x: 1, z: 1 } })
    board.placePiece({ kind: 'wire', spot: { x: 2, z: 1 } })

    board.eraseAt({ x: 1, z: 1 })

    assert.deepEqual(board.listPieces(), [{ kind: 'wire', spot: { x: 2, z: 1 } }])
  })

  test('toggling a switch closes it', () => {
    const board = new Board({ columns: 6, rows: 4 })
    board.placePiece({ kind: 'switch', spot: { x: 1, z: 1 }, axis: 'horizontal', closed: false })

    board.toggleSwitchAt({ x: 1, z: 1 })

    assert.deepEqual(board.listPieces(), [{ kind: 'switch', spot: { x: 1, z: 1 }, axis: 'horizontal', closed: true }])
  })

  test('toggling a closed switch opens it', () => {
    const board = new Board({ columns: 6, rows: 4 })
    board.placePiece({ kind: 'switch', spot: { x: 1, z: 1 }, axis: 'horizontal', closed: true })

    board.toggleSwitchAt({ x: 1, z: 1 })

    assert.deepEqual(board.listPieces(), [{ kind: 'switch', spot: { x: 1, z: 1 }, axis: 'horizontal', closed: false }])
  })
})

describe('Undo', () => {
  test('undo takes back the last placed piece', () => {
    const board = new Board({ columns: 6, rows: 4 })
    board.placePiece({ kind: 'wire', spot: { x: 1, z: 1 } })
    board.placePiece({ kind: 'wire', spot: { x: 2, z: 1 } })

    board.undo()

    assert.deepEqual(board.listPieces(), [{ kind: 'wire', spot: { x: 1, z: 1 } }])
  })

  test('undo takes back a whole stroke at once', () => {
    const board = new Board({ columns: 6, rows: 4 })
    board.placePiece({ kind: 'wire', spot: { x: 0, z: 3 } })
    board.startStroke()
    board.placePiece({ kind: 'wire', spot: { x: 1, z: 1 } })
    board.placePiece({ kind: 'wire', spot: { x: 2, z: 1 } })
    board.endStroke()

    board.undo()

    assert.deepEqual(board.listPieces(), [{ kind: 'wire', spot: { x: 0, z: 3 } }])
  })

  test('undo brings back an erased piece', () => {
    const board = new Board({ columns: 6, rows: 4 })
    board.placePiece({ kind: 'lamp', spot: { x: 1, z: 1 }, axis: 'horizontal' })
    board.eraseAt({ x: 1, z: 1 })

    board.undo()

    assert.deepEqual(board.listPieces(), [{ kind: 'lamp', spot: { x: 1, z: 1 }, axis: 'horizontal' }])
  })

  test('undo opens a switch that was closed', () => {
    const board = new Board({ columns: 6, rows: 4 })
    board.placePiece({ kind: 'switch', spot: { x: 1, z: 1 }, axis: 'horizontal', closed: false })
    board.toggleSwitchAt({ x: 1, z: 1 })

    board.undo()

    assert.deepEqual(board.listPieces(), [{ kind: 'switch', spot: { x: 1, z: 1 }, axis: 'horizontal', closed: false }])
  })

  test('a stroke that changes nothing leaves nothing to undo', () => {
    const board = new Board({ columns: 6, rows: 4 })
    board.startStroke()
    board.eraseAt({ x: 3, z: 3 })
    board.endStroke()

    const canUndo = board.canUndo()

    assert.equal(canUndo, false)
  })
})

describe('Circuits', () => {
  test('a closed loop lights the lamp', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'w.w', 'wLw'])

    const lit = board.isPoweredAt({ x: 1, z: 2 })

    assert.equal(lit, true)
  })

  test('a loop with a gap leaves the lamp dark', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'w..', 'wLw'])

    const lit = board.isPoweredAt({ x: 1, z: 2 })

    assert.equal(lit, false)
  })

  test('an open switch keeps the lamp dark', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 's.w', 'wLw'])

    const lit = board.isPoweredAt({ x: 1, z: 2 })

    assert.equal(lit, false)
  })

  test('a closed switch lets the lamp light', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'c.w', 'wLw'])

    const lit = board.isPoweredAt({ x: 1, z: 2 })

    assert.equal(lit, true)
  })

  test('two lamps in a row both light', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBww', 'w..w', 'wLLw'])

    const lit = [board.isPoweredAt({ x: 1, z: 2 }), board.isPoweredAt({ x: 2, z: 2 })]

    assert.deepEqual(lit, [true, true])
  })

  test('a motor in a closed loop runs', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'w.w', 'wMw'])

    const running = board.isPoweredAt({ x: 1, z: 2 })

    assert.equal(running, true)
  })

  test('a buzzer in a closed loop sounds', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'w.w', 'wZw'])

    const sounding = board.isPoweredAt({ x: 1, z: 2 })

    assert.equal(sounding, true)
  })

  test('a lamp turned sideways does not join the loop', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'w.w', 'wlw'])

    const lit = board.isPoweredAt({ x: 1, z: 2 })

    assert.equal(lit, false)
  })

  test('a wire straight across the battery is a short circuit', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'www'])

    const short = board.hasShortCircuit()

    assert.equal(short, true)
  })

  test('nothing is powered during a short circuit', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'w.w', 'wLw'])
    board.placePiece({ kind: 'wire', spot: { x: 1, z: 1 } })

    const lit = board.isPoweredAt({ x: 1, z: 2 })

    assert.equal(lit, false)
  })

  test('a working loop is not a short circuit', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'w.w', 'wLw'])

    const short = board.hasShortCircuit()

    assert.equal(short, false)
  })
})

describe('Wire links', () => {
  test('a wire links to the pieces beside it', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['ww.', 'w..'])

    const sides = board.listLinkedSides({ x: 0, z: 0 })

    assert.deepEqual(sides, ['east', 'south'])
  })

  test('a wire does not link to a piece turned sideways', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wb'])

    const sides = board.listLinkedSides({ x: 0, z: 0 })

    assert.deepEqual(sides, [])
  })
})

function draw(board: Board, rows: string[]) {
  rows.forEach((row, z) => {
    for (const [x, symbol] of [...row].entries()) {
      const piece = pieceFor(symbol, { x, z })
      if (piece) board.placePiece(piece)
    }
  })
}

function pieceFor(symbol: string, spot: { x: number; z: number }): Piece | undefined {
  const axis = symbol === symbol.toUpperCase() ? 'horizontal' : 'vertical'
  const kinds = { b: 'battery', l: 'lamp', m: 'motor', z: 'buzzer' } as const
  const kind = kinds[symbol.toLowerCase() as keyof typeof kinds]
  if (symbol === 'w') return { kind: 'wire', spot }
  if (symbol.toLowerCase() === 's') return { kind: 'switch', spot, axis, closed: false }
  if (symbol.toLowerCase() === 'c') return { kind: 'switch', spot, axis, closed: true }
  return kind ? { kind, spot, axis } : undefined
}

describe('Starting over', () => {
  test('starting over empties the board', () => {
    const board = new Board({ columns: 6, rows: 4 })
    board.placePiece({ kind: 'wire', spot: { x: 1, z: 1 } })

    board.startOver()

    assert.deepEqual(board.listPieces(), [])
  })

  test('starting over leaves nothing to undo', () => {
    const board = new Board({ columns: 6, rows: 4 })
    board.placePiece({ kind: 'wire', spot: { x: 1, z: 1 } })

    board.startOver()

    assert.equal(board.canUndo(), false)
  })
})
