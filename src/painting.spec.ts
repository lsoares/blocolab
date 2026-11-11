import { expect, test } from '@playwright/test'

test('the brush places a cube where the child taps', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('application', { name: 'Mundo' }).click()

  await expect(page.getByRole('status')).toHaveText('1 bloco')
})

test('the eraser removes the tapped cube', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('application', { name: 'Mundo' }).click()
  await page.getByRole('button', { name: 'Borracha' }).click()

  await page.getByRole('application', { name: 'Mundo' }).click()

  await expect(page.getByRole('status')).toHaveText('0 blocos')
})

test('dragging the brush paints a row of cubes', async ({ page }) => {
  await page.goto('/')
  const world = page.getByRole('application', { name: 'Mundo' })

  await world.dragTo(world, { sourcePosition: { x: 400, y: 360 }, targetPosition: { x: 700, y: 360 }, steps: 30 })

  await expect(page.getByRole('status')).toHaveText('11 blocos')
})

test('Enter places a cube under the keyboard cursor', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('application', { name: 'Mundo' }).focus()

  await page.keyboard.press('Enter')

  await expect(page.getByRole('status')).toHaveText('1 bloco')
})

test('the arrows move the keyboard cursor along a row', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('application', { name: 'Mundo' }).focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowRight')

  await page.keyboard.press('Enter')

  await expect(page.getByRole('status')).toHaveText('3 blocos')
})

test('Enter with the eraser removes the cube under the keyboard cursor', async ({ page }) => {
  await page.goto('/')
  const world = page.getByRole('application', { name: 'Mundo' })
  await world.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Borracha' }).click()
  await world.focus()

  await page.keyboard.press('Enter')

  await expect(page.getByRole('status')).toHaveText('0 blocos')
})
