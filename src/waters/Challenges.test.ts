import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { Board, type Piece } from '../loops/Board.ts'
import { isMet } from '../loops/Challenge.ts'
import { challenges } from './Challenges.ts'

describe('Water challenges', () => {
  test('a fountain in a working loop meets the first challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBw', 'w.w', 'wLw'])

    const met = isMet(board, challenges[0])

    assert.equal(met, true)
  })

  test('a fountain in a loop with a gap does not meet the first challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBw', 'w..', 'wLw'])

    const met = isMet(board, challenges[0])

    assert.equal(met, false)
  })

  test('a turning wheel meets the wheel challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBw', 'w.w', 'wMw'])

    const met = isMet(board, challenges[1])

    assert.equal(met, true)
  })

  test('a bubbling bubbler meets the bubbler challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBw', 'w.w', 'wZw'])

    const met = isMet(board, challenges[2])

    assert.equal(met, true)
  })

  test('two fountains one after the other meet the stop challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBww', 'w..w', 'wLLw'])

    const met = isMet(board, challenges[8])

    assert.equal(met, true)
  })

  test('a pipe straight across the pump meets the no resistance challenge', () => {
    const board = new Board({ columns: 8, rows: 6 })
    draw(board, ['wBw', 'www'])

    const met = isMet(board, challenges[13])

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
  return kind ? { kind, spot, axis } : undefined
}
