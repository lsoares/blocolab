import './style.css'
import { Painting, type Shape } from './Painting.ts'
import { type Block, World } from './World.ts'
import { WorldView } from './WorldView.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#world')
if (!canvas) throw new Error('The page has no #world canvas')
if (document.createElement('canvas').getContext('webgl2')) startGame(canvas)
else showThatThe3dWorldIsUnavailable(canvas)

function startGame(canvas: HTMLCanvasElement) {
  const world = new World({ width: 32, height: 3, depth: 32 })
  const view = new WorldView(canvas, world.size, matchMedia('(prefers-reduced-motion: reduce)'))
  const blockCount = document.querySelector('output')
  const undoButton = document.querySelector<HTMLButtonElement>('.undo')
  const showWorld = () => {
    view.show(world)
    if (blockCount) blockCount.textContent = describeBlocks(world.listBlocks())
    if (undoButton) undoButton.disabled = !world.canUndo()
  }
  const painting = new Painting(world, view, showWorld)
  painting.listenTo(canvas)

  for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="tool"]')) {
    radio.addEventListener('change', () => {
      if (radio.value === 'eraser') painting.chooseEraser()
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

  showWorld()
  view.start()
}

function showThatThe3dWorldIsUnavailable(canvas: HTMLCanvasElement) {
  canvas.hidden = true
  document.querySelector<HTMLElement>('.toolbar')?.setAttribute('hidden', '')
  document.querySelector<HTMLElement>('.no-3d')?.removeAttribute('hidden')
}

function describeBlocks(blocks: Block[]) {
  if (blocks.length === 0) return '0 blocos'
  const plural = new Intl.PluralRules('pt-PT')
  const names = { cube: ['cubo', 'cubos'], ramp: ['rampa', 'rampas'] }
  const counts = (['cube', 'ramp'] as const)
    .map((kind) => ({ kind, count: blocks.filter((block) => block.kind === kind).length }))
    .filter(({ count }) => count > 0)
    .map(({ kind, count }) => `${count} ${names[kind][plural.select(count) === 'one' ? 0 : 1]}`)
  return new Intl.ListFormat('pt-PT').format(counts)
}
