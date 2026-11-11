import './style.css'
import { Painting, type Tool } from './Painting.ts'
import { World } from './World.ts'
import { WorldView } from './WorldView.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#world')
if (!canvas) throw new Error('The page has no #world canvas')
const world = new World({ width: 32, height: 1, depth: 32 })
const view = new WorldView(canvas, world.size)
const blockCount = document.querySelector('output')
const blockCountPlural = new Intl.PluralRules('pt-PT')
const showWorld = () => {
  view.show(world)
  const count = world.listCubes().length
  if (blockCount) blockCount.textContent = `${count} ${blockCountPlural.select(count) === 'one' ? 'bloco' : 'blocos'}`
}
const painting = new Painting(world, view, showWorld)
painting.listenTo(canvas)

const toolButtons = document.querySelectorAll<HTMLButtonElement>('[data-tool]')
for (const button of toolButtons) {
  button.addEventListener('click', () => {
    painting.chooseTool(button.dataset.tool as Tool)
    for (const other of toolButtons) other.setAttribute('aria-pressed', String(other === button))
  })
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
    if (event.deltaY < 0) view.camera.zoomIn()
    else view.camera.zoomOut()
  },
  { passive: false },
)

showWorld()
view.start()
