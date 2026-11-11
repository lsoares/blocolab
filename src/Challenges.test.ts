import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { Board, type Piece } from './Board.ts'
import { challenges, isMet } from './Challenges.ts'

describe('Challenges', () => {
  test('an empty board does not meet the first challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })

    const met = isMet(board, challenges[0])

    assert.equal(met, false)
  })

  test('a lit lamp meets the first challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBw', 'w.w', 'wLw'])

    const met = isMet(board, challenges[0])

    assert.equal(met, true)
  })

  test('a loop with a gap does not meet the first challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBw', 'w..', 'wLw'])

    const met = isMet(board, challenges[0])

    assert.equal(met, false)
  })

  test('a running motor meets the motor challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBw', 'w.w', 'wMw'])

    const met = isMet(board, challenges[1])

    assert.equal(met, true)
  })

  test('a sounding buzzer meets the buzzer challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBw', 'w.w', 'wZw'])

    const met = isMet(board, challenges[2])

    assert.equal(met, true)
  })

  test('a lit lamp without a switch does not meet the switch challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBw', 'w.w', 'wLw'])

    const met = isMet(board, challenges[3])

    assert.equal(met, false)
  })

  test('a lit lamp with a switch meets the switch challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBw', 'c.w', 'wLw'])

    const met = isMet(board, challenges[3])

    assert.equal(met, true)
  })

  test('two lit lamps on one battery meet the two lamps challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBww', 'w..w', 'wLLw'])

    const met = isMet(board, challenges[4])

    assert.equal(met, true)
  })

  test('two lamps on two batteries do not meet the one battery challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBBw', 'w..w', 'wLLw'])

    const met = isMet(board, challenges[4])

    assert.equal(met, false)
  })

  test('a lamp and a motor working together meet the lamp and motor challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBww', 'w..w', 'wLMw'])

    const met = isMet(board, challenges[5])

    assert.equal(met, true)
  })

  test('a lamp, a motor and a buzzer working together meet the last challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBwww', 'w...w', 'wLMZw'])

    const met = isMet(board, challenges[6])

    assert.equal(met, true)
  })
})

describe('Challenges about how the pieces are joined', () => {
  test('two lamps each on their own path meet the parallel challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBw', 'wLw', 'wLw'])

    const met = isMet(board, challenges[7])

    assert.equal(met, true)
  })

  test('two lamps one after the other do not meet the parallel challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBww', 'w..w', 'wLLw'])

    const met = isMet(board, challenges[7])

    assert.equal(met, false)
  })

  test('two lamps one after the other meet the series challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBww', 'w..w', 'wLLw'])

    const met = isMet(board, challenges[8])

    assert.equal(met, true)
  })

  test('two lamps each on their own path do not meet the series challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBw', 'wLw', 'wLw'])

    const met = isMet(board, challenges[8])

    assert.equal(met, false)
  })

  test('two motors on one battery meet the two motors challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBww', 'w..w', 'wMMw'])

    const met = isMet(board, challenges[9])

    assert.equal(met, true)
  })

  test('a switch that puts the lamp out when opened meets the switch challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBw', 'c.w', 'wLw'])

    const met = isMet(board, challenges[3])

    assert.equal(met, true)
  })

  test('a switch off the loop does not meet the switch challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBw', 'w.w', 'wLw'])
    board.placePiece({ kind: 'switch', spot: { x: 5, z: 2 }, axis: 'horizontal', closed: true })

    const met = isMet(board, challenges[3])

    assert.equal(met, false)
  })

  test('one switch that stops the lamp, the motor and the buzzer meets the main switch challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBwww', 'c...w', 'wLMZw'])

    const met = isMet(board, challenges[10])

    assert.equal(met, true)
  })

  test('three working pieces without a switch do not meet the main switch challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBwww', 'w...w', 'wLMZw'])

    const met = isMet(board, challenges[10])

    assert.equal(met, false)
  })

  test('a wire straight across the battery meets the short circuit challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBw', 'www'])

    const met = isMet(board, challenges[11])

    assert.equal(met, true)
  })

  test('a working loop does not meet the short circuit challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBw', 'w.w', 'wLw'])

    const met = isMet(board, challenges[11])

    assert.equal(met, false)
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
  if (symbol.toLowerCase() === 'c') return { kind: 'switch', spot, axis, closed: true }
  return kind ? { kind, spot, axis } : undefined
}
