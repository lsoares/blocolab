import './style.css'
import { Painting, type Tool } from './Painting'
import { World } from './World'
import { WorldView } from './WorldView'

const canvas = document.querySelector<HTMLCanvasElement>('#world')!
const world = new World({ width: 32, height: 12, depth: 32 })
const view = new WorldView(canvas, world.size)
const painting = new Painting(world, view)
painting.listenTo(canvas)

const toolButtons = document.querySelectorAll<HTMLButtonElement>('[data-tool]')
toolButtons.forEach((button) =>
  button.addEventListener('click', () => {
    painting.chooseTool(button.dataset.tool as Tool)
    toolButtons.forEach((other) => other.setAttribute('aria-pressed', String(other === button)))
  }),
)

const cameraActions: Record<string, () => void> = {
  'rotate-left': () => view.camera.rotateCounterClockwise(),
  'rotate-right': () => view.camera.rotateClockwise(),
  'zoom-in': () => view.camera.zoomIn(),
  'zoom-out': () => view.camera.zoomOut(),
}
document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach((button) =>
  button.addEventListener('click', () => cameraActions[button.dataset.camera!]()),
)
canvas.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault()
    if (event.deltaY < 0) view.camera.zoomIn()
    else view.camera.zoomOut()
  },
  { passive: false },
)

view.show(world)
view.start()
