import { describe, it, expect } from 'vitest'
import { rate_text, bar_widths, COLOR_OF_ROW } from './report'

describe('rate_text', () => {
  it('振込率を小数1桁の%で出し、母数が0なら「-」', () => {
    expect(rate_text(39385, 2194842)).toBe('1.8%')
    expect(rate_text(0, 20517370)).toBe('0.0%')
    expect(rate_text(0, 0)).toBe('-')
  })
})

describe('bar_widths', () => {
  it('一番高い振込率を100%として横棒の長さを決める', () => {
    expect(bar_widths([
      { row: '濃い青', n: 10, hits: 1 },
      { row: '濃い赤', n: 10, hits: 2 },
      { row: '無地', n: 0, hits: 0 },
    ])).toEqual(['50.0%', '100.0%', '0.0%'])
  })

  it('振り込みが1つもなくてもNaNにならない', () => {
    expect(bar_widths([{ row: '現物', n: 5, hits: 0 }])).toEqual(['0.0%'])
  })
})

describe('COLOR_OF_ROW', () => {
  it('7つの行それぞれに、アプリの牌と同じ色を決める（字牌は色なし）', () => {
    expect(COLOR_OF_ROW).toEqual({
      現物: '#4cd964', 濃い青: '#007aff', 薄い青: '#c7e2ff', 薄い赤: '#ffd2ce', 濃い赤: '#ff3b30', 無地: '#dddddd', 字牌: null,
    })
  })
})
