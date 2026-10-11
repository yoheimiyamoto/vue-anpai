import { describe, it, expect } from 'vitest'
import { rate_text, bar_widths, rate_text_of_status, sort_by_rate, COLOR_OF_ROW } from './report'

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

describe('rate_text_of_status', () => {
  const rows = [
    { row: '濃い青', n: 2194842, hits: 39385 },
    { row: '薄い青', n: 11735518, hits: 498999 },
    { row: '薄い赤', n: 64309733, hits: 5868024 },
    { row: '濃い赤', n: 20269057, hits: 2720439 },
  ]

  it('理由の色（safe・likely_safe・caution・danger）に対応する行の振込率を出す', () => {
    expect(rate_text_of_status(rows, 'safe')).toBe('1.8%')
    expect(rate_text_of_status(rows, 'likely_safe')).toBe('4.3%')
    expect(rate_text_of_status(rows, 'caution')).toBe('9.1%')
    expect(rate_text_of_status(rows, 'danger')).toBe('13.4%')
  })

  it('集計結果にその行がなければ「-」', () => {
    expect(rate_text_of_status([], 'safe')).toBe('-')
  })
})

describe('sort_by_rate', () => {
  const rows = [
    { row: '濃い青', n: 2194842, hits: 39385 },
    { row: '薄い青', n: 11735518, hits: 498999 },
    { row: '薄い赤', n: 64309733, hits: 5868024 },
    { row: '濃い赤', n: 20269057, hits: 2720439 },
  ]

  it('理由を振込率の低い順に並べ、同じ色の中では元の順を保つ', () => {
    const reasons = [
      { status: 'safe', title: '1の表スジ' },
      { status: 'likely_safe', title: '4の表スジ' },
      { status: 'danger', title: '両面待ちが2通り' },
      { status: 'caution', title: '両面待ちが1通り' },
      { status: 'likely_safe', title: '1と7の中スジ' },
    ]
    expect(sort_by_rate(reasons, rows).map(r => r.title))
      .toEqual(['1の表スジ', '4の表スジ', '1と7の中スジ', '両面待ちが1通り', '両面待ちが2通り'])
  })

  it('集計結果にない色の理由は最後に回す', () => {
    const reasons = [{ status: 'danger', title: 'a' }, { status: 'safe', title: 'b' }]
    expect(sort_by_rate(reasons, rows.filter(s => s.row != '濃い青')).map(r => r.title)).toEqual(['a', 'b'])
  })
})
