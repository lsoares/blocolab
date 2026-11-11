import './style.css'
import { Painting, type Tool } from './Painting.ts'
import { World } from './World.ts'
import { WorldView } from './WorldView.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#world')
if (!canvas) throw new Error('The page has no #world canvas')
if (document.createElement('canvas').getContext('webgl2')) startGame(canvas)
else showThatThe3dWorldIsUnavailable(canvas)

function startGame(canvas: HTMLCanvasElement) {
  const world = new World({ width: 32, height: 1, depth: 32 })
  const view = new WorldView(canvas, world.size, matchMedia('(prefers-reduced-motion: reduce)'))
  const blockCount = document.querySelector('output')
  const blockCountPlural = new Intl.PluralRules('pt-PT')
  const showWorld = () => {
    view.show(world)
    const count = world.listCubes().length
    if (blockCount) blockCount.textContent = `${count} ${blockCountPlural.select(count) === 'one' ? 'bloco' : 'blocos'}`
  }
  const painting = new Painting(world, view, showWorld)
  painting.listenTo(canvas)

  for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="tool"]')) {
    radio.addEventListener('change', () => painting.chooseTool(radio.value as Tool))
  }

  const cameraActions: Record<string, () => void> = {
    'rotate-left': () => view.camera.rotateCounterClockwise(),
    'rotate-right': () => view.camera.rotateClockwise(),
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
