import { expect, test } from 'vitest'

test('a', () => {
  snap('test1')
})

test('b', () => {
  snap('test2')
})

function snap(value: unknown) {
  expect(value).toMatchInlineSnapshot()
}
