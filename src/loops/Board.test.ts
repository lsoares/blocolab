import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { Board, type Piece } from './Board.ts'

describe('Placing pieces', () => {
  test('a placed piece stays on its spot', () => {
    const board = new Board({ columns: 6, rows: 4 })

    board.placePiece({ kind: 'lamp', spot: { x: 2, z: 1 }, axis: 'vertical' })

    assert.deepEqual(board.listPieces(), [{ kind: 'lamp', spot: { x: 2, z: 1 }, axis: 'vertical' }])
  })

  test('placing on an occupied spot replaces the piece', () => {
    const board = new Board({ columns: 6, rows: 4 })
    board.placePiece({ kind: 'wire', spot: { x: 2, z: 1 } })

    board.placePiece({ kind: 'lamp', spot: { x: 2, z: 1 }, axis: 'horizontal' })

    assert.deepEqual(board.listPieces(), [{ kind: 'lamp', spot: { x: 2, z: 1 }, axis: 'horizontal' }])
  })

  test('placing the same piece again leaves a single piece', () => {
    const board = new Board({ columns: 6, rows: 4 })
    board.placePiece({ kind: 'wire', spot: { x: 2, z: 1 } })

    board.placePiece({ kind: 'wire', spot: { x: 2, z: 1 } })

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

  test('undo brings back the piece that was replaced', () => {
    const board = new Board({ columns: 6, rows: 4 })
    board.placePiece({ kind: 'wire', spot: { x: 2, z: 1 } })
    board.placePiece({ kind: 'lamp', spot: { x: 2, z: 1 }, axis: 'horizontal' })

    board.undo()

    assert.deepEqual(board.listPieces(), [{ kind: 'wire', spot: { x: 2, z: 1 } }])
  })

  test('placing the same piece again leaves nothing extra to undo', () => {
    const board = new Board({ columns: 6, rows: 4 })
    board.placePiece({ kind: 'wire', spot: { x: 2, z: 1 } })
    board.placePiece({ kind: 'wire', spot: { x: 2, z: 1 } })

    board.undo()

    assert.deepEqual(board.listPieces(), [])
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

  test('a lamp placed sideways turns to join the loop', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'w.w', 'wlw'])

    const lit = board.isPoweredAt({ x: 1, z: 2 })

    assert.equal(lit, true)
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

  test('a piece placed sideways turns to meet the wire beside it', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wb'])

    const sides = board.listLinkedSides({ x: 0, z: 0 })

    assert.deepEqual(sides, ['east'])
  })
})

describe('Pieces turning by themselves', () => {
  test('a battery turns to meet the wires above and below it', () => {
    const board = new Board({ columns: 6, rows: 4 })
    board.placePiece({ kind: 'battery', spot: { x: 1, z: 1 }, axis: 'horizontal' })

    board.placePiece({ kind: 'wire', spot: { x: 1, z: 0 } })
    board.placePiece({ kind: 'wire', spot: { x: 1, z: 2 } })

    assert.deepEqual(board.findPieceAt({ x: 1, z: 1 }), { kind: 'battery', spot: { x: 1, z: 1 }, axis: 'vertical' })
  })

  test('a lamp turns to meet a wire placed beside it', () => {
    const board = new Board({ columns: 6, rows: 4 })
    board.placePiece({ kind: 'lamp', spot: { x: 1, z: 1 }, axis: 'vertical' })

    board.placePiece({ kind: 'wire', spot: { x: 2, z: 1 } })

    assert.deepEqual(board.findPieceAt({ x: 1, z: 1 }), { kind: 'lamp', spot: { x: 1, z: 1 }, axis: 'horizontal' })
  })

  test('a piece that already meets a wire keeps its way', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw'])

    board.placePiece({ kind: 'wire', spot: { x: 1, z: 1 } })

    assert.deepEqual(board.findPieceAt({ x: 1, z: 0 }), { kind: 'battery', spot: { x: 1, z: 0 }, axis: 'horizontal' })
  })

  test('a piece with nothing around it keeps the way it was placed', () => {
    const board = new Board({ columns: 6, rows: 4 })

    board.placePiece({ kind: 'lamp', spot: { x: 1, z: 1 }, axis: 'vertical' })

    assert.deepEqual(board.findPieceAt({ x: 1, z: 1 }), { kind: 'lamp', spot: { x: 1, z: 1 }, axis: 'vertical' })
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

describe('Imagining changes', () => {
  test('imagining a board without a piece leaves the real board as it was', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'w.w', 'wLw'])

    board.withPieces(board.listPieces().filter((piece) => piece.kind !== 'lamp'))

    assert.equal(board.isPoweredAt({ x: 1, z: 2 }), true)
  })

  test('an imagined board without the lamp has no lamp to light', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'w.w', 'wLw'])

    const imagined = board.withPieces(board.listPieces().filter((piece) => piece.kind !== 'lamp'))

    assert.equal(imagined.isPoweredAt({ x: 1, z: 2 }), false)
  })
})

describe('Strength of the current', () => {
  test('a lamp alone on a battery shines at full strength', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'w.w', 'wLw'])

    const strength = board.measureStrengthAt({ x: 1, z: 2 })

    assert.ok(Math.abs(strength - 1) < 0.02, `strength was ${strength}`)
  })

  test('two lamps one after the other shine at about half strength', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBww', 'w..w', 'wLLw'])

    const strength = board.measureStrengthAt({ x: 1, z: 2 })

    assert.ok(strength > 0.45 && strength < 0.6, `strength was ${strength}`)
  })

  test('two lamps each on their own path shine almost at full strength', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'wLw', 'wLw'])

    const strength = board.measureStrengthAt({ x: 1, z: 1 })

    assert.ok(strength > 0.85, `strength was ${strength}`)
  })

  test('two batteries one after the other make the lamp shine stronger', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBBw', 'w..w', 'wLLw'])
    board.eraseAt({ x: 2, z: 2 })

    board.placePiece({ kind: 'wire', spot: { x: 2, z: 2 } })

    assert.ok(board.measureStrengthAt({ x: 1, z: 2 }) > 1.5)
  })

  test('two batteries help each other whichever way they were drawn', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'w.l', 'wBw'])

    const strength = board.measureStrengthAt({ x: 2, z: 1 })

    assert.ok(strength > 1.5, `strength was ${strength}`)
  })

  test('a lamp that is dark has no strength', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'w..', 'wLw'])

    const strength = board.measureStrengthAt({ x: 1, z: 2 })

    assert.equal(strength, 0)
  })

  test('a motor alone on a battery runs at full strength', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'w.w', 'wMw'])

    const strength = board.measureStrengthAt({ x: 1, z: 2 })

    assert.ok(Math.abs(strength - 1) < 0.02, `strength was ${strength}`)
  })
})

describe('Wires that carry current', () => {
  test('the wires of a closed loop carry current', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'w.w', 'wLw'])

    const live = board.isLiveAt({ x: 0, z: 1 })

    assert.equal(live, true)
  })

  test('the wires of a loop with a gap carry nothing', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'w..', 'wLw'])

    const live = board.isLiveAt({ x: 0, z: 1 })

    assert.equal(live, false)
  })

  test('wires apart from the loop carry nothing', () => {
    const board = new Board({ columns: 8, rows: 4 })
    draw(board, ['wBw.ww', 'w.w...', 'wLw...'])

    const live = board.isLiveAt({ x: 4, z: 0 })

    assert.equal(live, false)
  })

  test('a closed switch in a working loop carries current', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'c.w', 'wLw'])

    const live = board.isLiveAt({ x: 0, z: 1 })

    assert.equal(live, true)
  })

  test('nothing carries current during a short circuit', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'www'])

    const live = board.isLiveAt({ x: 0, z: 1 })

    assert.equal(live, false)
  })
})

describe('Direction of the flow', () => {
  test('a wire in a working loop has flow leaving on one side and entering on the other', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'w.w', 'wLw'])

    const flows = board.listFlowsAt({ x: 0, z: 1 })

    const north = flows.find(({ side }) => side === 'north')?.out ?? 0
    const south = flows.find(({ side }) => side === 'south')?.out ?? 0
    assert.ok(Math.abs(north) > 0.5 && Math.abs(north + south) < 1e-6, `north ${north}, south ${south}`)
  })

  test('the two sides of a loop flow in opposite directions', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'w.w', 'wLw'])

    const left = board.listFlowsAt({ x: 0, z: 1 }).find(({ side }) => side === 'north')?.out ?? 0
    const right = board.listFlowsAt({ x: 2, z: 1 }).find(({ side }) => side === 'north')?.out ?? 0

    assert.ok(left * right < 0, `left ${left}, right ${right}`)
  })

  test('a loop with a gap has no flow', () => {
    const board = new Board({ columns: 6, rows: 4 })
    draw(board, ['wBw', 'w..', 'wLw'])

    const flows = board.listFlowsAt({ x: 0, z: 1 })

    assert.deepEqual(flows, [])
  })
})
