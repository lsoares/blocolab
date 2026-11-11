import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { type Card, followCards } from './Cards.ts'
import { buildCourse } from './Course.ts'

const size = { columns: 8, rows: 6 }

describe('Following the cards', () => {
  test('forward cards walk the robot to the star', () => {
    const course = buildCourse(['>..*'], size)

    const run = followCards(course, ['forward', 'forward', 'forward'])

    assert.equal(run.outcome, 'reached-star')
  })

  test('the robot stops as soon as it reaches the star', () => {
    const course = buildCourse(['>.*.'], size)

    const run = followCards(course, ['forward', 'forward', 'forward'])

    assert.equal(run.poses.length, 3)
  })

  test('turning right makes an eastward robot face south', () => {
    const course = buildCourse(['>...'], size)

    const run = followCards(course, ['turn-right'])

    assert.equal(run.poses[1].heading, 'south')
  })

  test('turning left makes an eastward robot face north', () => {
    const course = buildCourse(['>...'], size)

    const run = followCards(course, ['turn-left'])

    assert.equal(run.poses[1].heading, 'north')
  })

  test('a rock in the way makes the robot bump', () => {
    const course = buildCourse(['>#.*'], size)

    const run = followCards(course, ['forward'])

    assert.equal(run.outcome, 'bumped')
  })

  test('the robot stays where it was when it bumps', () => {
    const course = buildCourse(['>#.*'], size)

    const run = followCards(course, ['forward'])

    assert.deepEqual(run.poses.at(-1)?.spot, course.start.spot)
  })

  test('walking off the board makes the robot bump', () => {
    const course = buildCourse(['>', '*'], size)
    const cards: Card[] = ['forward', 'forward', 'forward', 'forward', 'forward']

    const run = followCards(course, cards)

    assert.equal(run.outcome, 'bumped')
  })

  test('cards that stop short of the star end short', () => {
    const course = buildCourse(['>..*'], size)

    const run = followCards(course, ['forward'])

    assert.equal(run.outcome, 'ended-short')
  })

  test('turns and steps carry the robot around a rock to the star', () => {
    const course = buildCourse(['>.#.', '...*'], size)

    const run = followCards(course, ['forward', 'turn-right', 'forward', 'turn-left', 'forward', 'forward'])

    assert.equal(run.outcome, 'reached-star')
  })
})
