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
