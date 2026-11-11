import { expect, test } from '@playwright/test'

test('tapping the ground places a cube', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('application', { name: 'Mundo' }).click()

  await expect(page.getByRole('status')).toHaveText('1 cubo')
})

test('dragging draws one cube as big as the drag', async ({ page }) => {
  await page.goto('/')
  const world = page.getByRole('application', { name: 'Mundo' })

  await world.dragTo(world, { sourcePosition: { x: 400, y: 300 }, targetPosition: { x: 600, y: 420 }, steps: 10 })

  await expect(page.getByRole('status')).toHaveText('1 cubo')
})

test('dragging with the ramp draws one ramp', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: 'Rampa baixa' }).check()
  const world = page.getByRole('application', { name: 'Mundo' })

  await world.dragTo(world, { sourcePosition: { x: 400, y: 360 }, targetPosition: { x: 600, y: 360 }, steps: 10 })

  await expect(page.getByRole('status')).toHaveText('1 rampa')
})

test('the eraser removes only the tapped square of a block', async ({ page }) => {
  await page.goto('/')
  const world = page.getByRole('application', { name: 'Mundo' })
  await world.dragTo(world, { sourcePosition: { x: 400, y: 300 }, targetPosition: { x: 600, y: 420 }, steps: 10 })
  await page.getByRole('radio', { name: 'Borracha' }).check()

  await world.click({ position: { x: 500, y: 360 } })

  await expect(page.getByRole('status')).toHaveText('1 cubo')
})

test('the eraser removes the tapped block', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('application', { name: 'Mundo' }).click()
  await page.getByRole('radio', { name: 'Borracha' }).check()

  await page.getByRole('application', { name: 'Mundo' }).click()

  await expect(page.getByRole('status')).toHaveText('0 blocos')
})

test('undo takes back what was drawn', async ({ page }) => {
  await page.goto('/')
  const world = page.getByRole('application', { name: 'Mundo' })
  await world.dragTo(world, { sourcePosition: { x: 400, y: 300 }, targetPosition: { x: 600, y: 420 }, steps: 10 })

  await page.getByRole('button', { name: 'Desfazer' }).click()

  await expect(page.getByRole('status')).toHaveText('0 blocos')
})

test('Enter places a cube under the keyboard cursor', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('application', { name: 'Mundo' }).focus()

  await page.keyboard.press('Enter')

  await expect(page.getByRole('status')).toHaveText('1 cubo')
})

test('the arrows move the keyboard cursor along a row', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('application', { name: 'Mundo' }).focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowRight')

  await page.keyboard.press('Enter')

  await expect(page.getByRole('status')).toHaveText('3 cubos')
})

test('Enter with the eraser removes the block under the keyboard cursor', async ({ page }) => {
  await page.goto('/')
  const world = page.getByRole('application', { name: 'Mundo' })
  await world.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('radio', { name: 'Borracha' }).check()
  await world.focus()

  await page.keyboard.press('Enter')

  await expect(page.getByRole('status')).toHaveText('0 blocos')
})

test('drawing on top of a block keeps the block that was there', async ({ page }) => {
  await page.goto('/')
  const world = page.getByRole('application', { name: 'Mundo' })
  await world.dragTo(world, { sourcePosition: { x: 400, y: 300 }, targetPosition: { x: 600, y: 420 }, steps: 10 })
  await page.getByRole('radio', { name: 'Rampa alta' }).check()

  await world.click({ position: { x: 500, y: 350 } })

  await expect(page.getByRole('status')).toHaveText('1 cubo')
})
