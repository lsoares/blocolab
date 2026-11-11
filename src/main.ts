import './style.css'
import { circuits } from './circuits/Circuits.ts'
import type { Game, GameSession } from './Game.ts'
import { trains } from './trains/Trains.ts'
import { waters } from './waters/Waters.ts'

const games: Game[] = [circuits, waters, trains]
const game = games.find(({ id }) => `#${id}` === location.hash) ?? games[0]

const canvas = document.querySelector<HTMLCanvasElement>('#world')
if (!canvas) throw new Error('The page has no #world canvas')
showTheGames(games, game)
showThePieces(game)
if (document.createElement('canvas').getContext('webgl2')) startGame(game, canvas)
else showThatThe3dBoardIsUnavailable(canvas)
window.addEventListener('hashchange', () => location.reload())

function showTheGames(all: Game[], chosen: Game) {
  const switcher = document.querySelector('.games')
  for (const other of all) {
    switcher?.insertAdjacentHTML(
      'beforeend',
      `<a href="#${other.id}"${other === chosen ? ' aria-current="page"' : ''}><span aria-hidden="true">${other.icon}</span>${other.name}</a>`,
    )
  }
}

function showThePieces(chosen: Game) {
  const pieces = document.querySelector('.pieces')
  if (chosen.tools.length > 8) pieces?.setAttribute('data-columns', '2')
  for (const [index, tool] of chosen.tools.entries()) {
    pieces?.insertAdjacentHTML(
      'beforeend',
      `<label data-name="${tool.name}">
        <input type="radio" name="tool" value="${tool.value}"${index === 0 ? ' checked' : ''} />
        ${tool.icon}
        <span class="visually-hidden">${tool.name}</span>
      </label>`,
    )
  }
}

function startGame(chosen: Game, canvas: HTMLCanvasElement) {
  const status = document.querySelector('output')
  const undoButton = document.querySelector<HTMLButtonElement>('.undo')
  const panel = document.querySelector<HTMLElement>('.challenge')
  const goal = panel?.querySelector('.goal')
  const nextButton = panel?.querySelector<HTMLButtonElement>('.next')
  let session: GameSession | undefined
  let level = recallLevel(chosen)
  let achieved = false
  const refresh = () => {
    if (!session) return
    if (level < chosen.goals.length && session.isChallengeMet(level)) achieved = true
    if (goal) {
      goal.textContent =
        level < chosen.goals.length
          ? `${chosen.goals[level]}${achieved ? ' ✓ Conseguiste!' : ''}`
          : 'Fizeste todos os desafios! Agora constrói o que quiseres.'
    }
    if (nextButton) nextButton.hidden = !achieved
    panel?.classList.toggle('done', achieved)
    if (status) status.textContent = session.describeBoard()
    if (undoButton) undoButton.disabled = !session.canUndo()
  }
  const started = chosen.startSession(canvas, refresh)
  session = started
  started.chooseTool(chosen.tools[0].value)
  refresh()

  for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="tool"]')) {
    radio.addEventListener('change', () => started.chooseTool(radio.value))
  }
  nextButton?.addEventListener('click', () => {
    level += 1
    achieved = false
    rememberLevel(chosen, level)
    started.startOver()
    canvas.focus()
  })
  undoButton?.addEventListener('click', () => started.undo())
  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return
    event.preventDefault()
    started.undo()
  })
  showNames(canvas, started)
}

function showNames(canvas: HTMLCanvasElement, session: GameSession) {
  const pieceName = document.querySelector<HTMLElement>('.piece-name')
  canvas.addEventListener('pointermove', (event) => {
    const name = event.buttons === 0 ? session.nameUnder(event) : undefined
    if (!pieceName || !name) return void pieceName?.setAttribute('hidden', '')
    pieceName.textContent = name
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
}

function showThatThe3dBoardIsUnavailable(canvas: HTMLCanvasElement) {
  canvas.hidden = true
  document.querySelector<HTMLElement>('.toolbar')?.setAttribute('hidden', '')
  document.querySelector<HTMLElement>('.no-3d')?.removeAttribute('hidden')
}

function recallLevel(chosen: Game) {
  try {
    return Math.min(Number(localStorage.getItem(`blocolab-level-${chosen.id}`)) || 0, chosen.goals.length)
  } catch {
    return 0
  }
}

function rememberLevel(chosen: Game, level: number) {
  try {
    localStorage.setItem(`blocolab-level-${chosen.id}`, String(level))
  } catch {
    return
  }
}
