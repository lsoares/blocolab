import { expect, test } from '@playwright/test'

test('the brush places a cube where the child taps', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('Mundo').click()

  await expect(page.getByRole('status')).toHaveText('1 bloco')
})

test('the eraser removes the tapped cube', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Mundo').click()
  await page.getByRole('button', { name: 'Borracha' }).click()

  await page.getByLabel('Mundo').click()

  await expect(page.getByRole('status')).toHaveText('0 blocos')
})

test('dragging the brush paints a row of cubes', async ({ page }) => {
  await page.goto('/')
  const world = page.getByLabel('Mundo')

  await world.dragTo(world, { sourcePosition: { x: 400, y: 360 }, targetPosition: { x: 700, y: 360 }, steps: 30 })

  await expect(page.getByRole('status')).toHaveText('11 blocos')
})
