import './style.css'
import { Painting, type Shape } from './Painting.ts'
import { preparePhysics, Run } from './Run.ts'
import { World } from './World.ts'
import { WorldView } from './WorldView.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#world')
if (!canvas) throw new Error('The page has no #world canvas')
if (document.createElement('canvas').getContext('webgl2')) {
  await preparePhysics()
  startGame(canvas)
} else showThatThe3dWorldIsUnavailable(canvas)

function startGame(canvas: HTMLCanvasElement) {
  const world = new World({ width: 32, height: 3, depth: 32 })
  const view = new WorldView(canvas, world.size, matchMedia('(prefers-reduced-motion: reduce)'))
  const blockCount = document.querySelector('output')
  const undoButton = document.querySelector<HTMLButtonElement>('.undo')
  const showWorld = () => {
    view.show(world)
    if (blockCount) blockCount.textContent = describeWorld(world)
    if (undoButton) undoButton.disabled = !world.canUndo()
  }
  const painting = new Painting(world, view, showWorld)
  painting.listenTo(canvas)

  for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="tool"]')) {
    radio.addEventListener('change', () => {
      if (radio.value === 'eraser') painting.chooseEraser()
      else if (radio.value === 'ball') painting.chooseBall()
      else painting.chooseShape({ kind: radio.value as Shape['kind'], height: Number(radio.dataset.height) })
    })
  }

  const undo = () => {
    world.undo()
    showWorld()
  }
  undoButton?.addEventListener('click', undo)
  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return
    event.preventDefault()
    undo()
  })

  const cameraActions: Record<string, () => void> = {
    rotate: () => view.camera.rotateClockwise(),
    'zoom-in': () => view.camera.zoomIn(),
    'zoom-out': () => view.camera.zoomOut(),
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-camera]')) {
    button.addEventListener('click', () => cameraActions[button.dataset.camera ?? '']())
  }
  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault()
      view.camera.zoomWithWheel(event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 16 : event.deltaY)
    },
    { passive: false },
  )

  const tools = document.querySelector<HTMLFieldSetElement>('.toolbar fieldset')
  const runButton = document.querySelector<HTMLButtonElement>('.run')
  let run: Run | undefined
  const startRunning = () => {
    run = new Run(world)
    painting.pause()
    if (tools) tools.disabled = true
    if (undoButton) undoButton.disabled = true
    runButton?.setAttribute('aria-label', 'Parar')
    if (runButton) runButton.textContent = '■'
  }
  const stopRunning = () => {
    run?.stop()
    run = undefined
    painting.resume()
    if (tools) tools.disabled = false
    runButton?.setAttribute('aria-label', 'Correr')
    if (runButton) runButton.textContent = '▶'
    showWorld()
  }
  runButton?.addEventListener('click', () => (run ? stopRunning() : startRunning()))

  showWorld()
  view.start((seconds) => {
    if (!run) return
    run.advance(Math.min(seconds, 0.1))
    view.showBalls(run.listBallPositions())
  })
}

function showThatThe3dWorldIsUnavailable(canvas: HTMLCanvasElement) {
  canvas.hidden = true
  document.querySelector<HTMLElement>('.toolbar')?.setAttribute('hidden', '')
  document.querySelector<HTMLElement>('.no-3d')?.removeAttribute('hidden')
}

function describeWorld(world: World) {
  const blocks = world.listBlocks()
  const plural = new Intl.PluralRules('pt-PT')
  const counts = [
    { count: blocks.filter((block) => block.kind === 'cube').length, names: ['cubo', 'cubos'] },
    { count: blocks.filter((block) => block.kind === 'ramp').length, names: ['rampa', 'rampas'] },
    { count: world.listBalls().length, names: ['bola', 'bolas'] },
  ]
    .filter(({ count }) => count > 0)
    .map(({ count, names }) => `${count} ${names[plural.select(count) === 'one' ? 0 : 1]}`)
  return counts.length === 0 ? '0 blocos' : new Intl.ListFormat('pt-PT').format(counts)
}
