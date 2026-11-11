import './style.css'
import { Board } from './Board.ts'
import { BoardView } from './BoardView.ts'
import { challenges, isMet } from './Challenges.ts'
import { Placing, type Tool } from './Placing.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#world')
if (!canvas) throw new Error('The page has no #world canvas')
if (document.createElement('canvas').getContext('webgl2')) startGame(canvas)
else showThatThe3dBoardIsUnavailable(canvas)

function startGame(canvas: HTMLCanvasElement) {
  const board = new Board(
    canvas.clientHeight > canvas.clientWidth ? { columns: 8, rows: 12 } : { columns: 12, rows: 8 },
  )
  const view = new BoardView(canvas, board.size, matchMedia('(prefers-reduced-motion: reduce)'))
  const status = document.querySelector('output')
  const undoButton = document.querySelector<HTMLButtonElement>('.undo')
  const panel = document.querySelector<HTMLElement>('.challenge')
  const goal = panel?.querySelector('.goal')
  const hint = panel?.querySelector('.hint')
  const nextButton = panel?.querySelector<HTMLButtonElement>('.next')
  let level = recallLevel()
  let achieved = false
  const showChallenge = () => {
    const challenge = challenges[level]
    if (challenge && isMet(board, challenge)) achieved = true
    if (goal) {
      goal.textContent = challenge
        ? `Desafio ${level + 1} de ${challenges.length}: ${challenge.goal}${achieved ? ' ✓ Conseguiste!' : ''}`
        : 'Fizeste todos os desafios! Agora constrói o que quiseres.'
    }
    if (hint) hint.textContent = challenge ? `Dica: ${challenge.hint}` : ''
    if (nextButton) nextButton.hidden = !achieved
    panel?.classList.toggle('done', achieved)
  }
  const showBoard = () => {
    showChallenge()
    view.show(board)
    if (status) status.textContent = describeBoard(board)
    if (undoButton) undoButton.disabled = !board.canUndo()
  }
  const placing = new Placing(board, view, showBoard)
  placing.listenTo(canvas)

  for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="tool"]')) {
    radio.addEventListener('change', () => placing.chooseTool(radio.value as Tool))
  }

  nextButton?.addEventListener('click', () => {
    level += 1
    achieved = false
    board.startOver()
    rememberLevel(level)
    showBoard()
    canvas.focus()
  })

  const undo = () => {
    board.undo()
    showBoard()
  }
  undoButton?.addEventListener('click', undo)
  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return
    event.preventDefault()
    undo()
  })

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-camera]')) {
    button.addEventListener('click', () =>
      button.dataset.camera === 'zoom-in' ? view.camera.zoomIn() : view.camera.zoomOut(),
    )
  }
  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault()
      view.camera.zoomWithWheel(event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 16 : event.deltaY)
    },
    { passive: false },
  )

  showBoard()
  view.start()
}

function showThatThe3dBoardIsUnavailable(canvas: HTMLCanvasElement) {
  canvas.hidden = true
  document.querySelector<HTMLElement>('.toolbar')?.setAttribute('hidden', '')
  document.querySelector<HTMLElement>('.no-3d')?.removeAttribute('hidden')
}

function describeBoard(board: Board) {
  const pieces = board.listPieces()
  const working = (kind: string) =>
    pieces.filter((piece) => piece.kind === kind && board.isPoweredAt(piece.spot)).length
  const parts = [
    pluralize(pieces.length, ['peça', 'peças']),
    ...(board.hasShortCircuit() ? ['curto-circuito'] : []),
    ...[
      { count: working('lamp'), words: ['lâmpada acesa', 'lâmpadas acesas'] },
      { count: working('motor'), words: ['motor a rodar', 'motores a rodar'] },
      { count: working('buzzer'), words: ['campainha a tocar', 'campainhas a tocar'] },
    ]
      .filter(({ count }) => count > 0)
      .map(({ count, words }) => pluralize(count, words)),
  ]
  return parts.join(', ')
}

function pluralize(count: number, [one, other]: string[]) {
  return `${count} ${new Intl.PluralRules('pt-PT').select(count) === 'one' ? one : other}`
}

function recallLevel() {
  try {
    return Math.min(Number(localStorage.getItem('blocolab-level')) || 0, challenges.length)
  } catch {
    return 0
  }
}

function rememberLevel(level: number) {
  try {
    localStorage.setItem('blocolab-level', String(level))
  } catch {
    return
  }
}
