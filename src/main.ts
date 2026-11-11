import './style.css'
import { Board, type Piece } from './Board.ts'
import { measureBoardThatFits } from './BoardCamera.ts'
import { BoardView } from './BoardView.ts'
import { BuzzerSound } from './BuzzerSound.ts'
import { challenges, isMet } from './Challenges.ts'
import { Placing, type Tool } from './Placing.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#world')
if (!canvas) throw new Error('The page has no #world canvas')
if (document.createElement('canvas').getContext('webgl2')) startGame(canvas)
else showThatThe3dBoardIsUnavailable(canvas)

function startGame(canvas: HTMLCanvasElement) {
  const board = new Board(measureBoardThatFits(canvas.clientWidth, canvas.clientHeight))
  const view = new BoardView(canvas, board.size, matchMedia('(prefers-reduced-motion: reduce)'))
  const status = document.querySelector('output')
  const undoButton = document.querySelector<HTMLButtonElement>('.undo')
  const panel = document.querySelector<HTMLElement>('.challenge')
  const goal = panel?.querySelector('.goal')
  const hint = panel?.querySelector('.hint')
  const nextButton = panel?.querySelector<HTMLButtonElement>('.next')
  const skipButton = panel?.querySelector<HTMLButtonElement>('.skip')
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
    if (skipButton) skipButton.hidden = achieved || !challenge
    panel?.classList.toggle('done', achieved)
  }
  const buzzerSound = new BuzzerSound()
  document.addEventListener('visibilitychange', () => document.hidden && buzzerSound.silence())
  const showBoard = () => {
    showChallenge()
    if (isABuzzerSounding(board)) buzzerSound.play()
    else buzzerSound.silence()
    view.show(board)
    if (status) status.textContent = describeBoard(board)
    if (undoButton) undoButton.disabled = !board.canUndo()
  }
  const placing = new Placing(board, view, showBoard)
  placing.listenTo(canvas)

  for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="tool"]')) {
    radio.addEventListener('change', () => placing.chooseTool(radio.value as Tool))
  }

  const goToNextChallenge = () => {
    level += 1
    achieved = false
    board.startOver()
    rememberLevel(level)
    showBoard()
    canvas.focus()
  }
  nextButton?.addEventListener('click', goToNextChallenge)
  skipButton?.addEventListener('click', goToNextChallenge)

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

  const pieceName = document.querySelector<HTMLElement>('.piece-name')
  canvas.addEventListener('pointermove', (event) => {
    const spot = event.buttons === 0 ? view.pickSpot(event) : undefined
    const piece = spot && board.findPieceAt(spot)
    if (!pieceName || !piece) return void pieceName?.setAttribute('hidden', '')
    pieceName.textContent = nameOf(piece, board)
    const area = canvas.getBoundingClientRect()
    pieceName.style.left = `${event.clientX - area.left + 14}px`
    pieceName.style.top = `${event.clientY - area.top + 14}px`
    pieceName.removeAttribute('hidden')
  })
  canvas.addEventListener('pointerleave', () => pieceName?.setAttribute('hidden', ''))
  for (const control of document.querySelectorAll<HTMLElement>('.toolbar [data-name]')) {
    const showBesideControl = () => {
      if (!pieceName) return
      const box = control.getBoundingClientRect()
      const area = canvas.parentElement?.getBoundingClientRect()
      pieceName.textContent = control.dataset.name ?? ''
      pieceName.style.left = `${box.right - (area?.left ?? 0) + 10}px`
      pieceName.style.top = `${box.top - (area?.top ?? 0) + box.height / 2}px`
      pieceName.classList.add('beside')
      pieceName.removeAttribute('hidden')
    }
    const hideName = () => {
      pieceName?.setAttribute('hidden', '')
      pieceName?.classList.remove('beside')
    }
    control.addEventListener('pointerenter', showBesideControl)
    control.addEventListener('pointerleave', hideName)
    control.addEventListener('focusin', showBesideControl)
    control.addEventListener('focusout', hideName)
  }

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

function nameOf(piece: Piece, board: Board) {
  const working = board.isPoweredAt(piece.spot)
  const strength = board.measureStrengthAt(piece.spot)
  const weak = strength < 0.75
  const strong = strength > 1.3
  return {
    battery: 'Pilha',
    wire: 'Fio',
    switch: `Interruptor (${piece.kind === 'switch' && piece.closed ? 'fechado' : 'aberto'})`,
    lamp: `Lâmpada (${working ? `acesa${weak ? ' fraca' : strong ? ' forte' : ''}` : 'apagada'})`,
    motor: `Motor (${working ? `a rodar${weak ? ' devagar' : strong ? ' depressa' : ''}` : 'parado'})`,
    buzzer: `Campainha (${working ? 'a tocar' : 'calada'})`,
  }[piece.kind]
}

function isABuzzerSounding(board: Board) {
  return board.listPieces().some((piece) => piece.kind === 'buzzer' && board.isPoweredAt(piece.spot))
}
