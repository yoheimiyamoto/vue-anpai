import { describe, it, expect } from 'vitest'
import { tile_id, is_honor, suit_of, number_of, tile_label } from './tiles'

describe('tile_id', () => {
  it('数牌は種類と番号から決まる', () => {
    expect(tile_id('1m')).toBe(0)
    expect(tile_id('9m')).toBe(8)
    expect(tile_id('1p')).toBe(9)
    expect(tile_id('9s')).toBe(26)
  })

  it('赤5は5と同じ', () => {
    expect(tile_id('5mr')).toBe(tile_id('5m'))
    expect(tile_id('5pr')).toBe(tile_id('5p'))
    expect(tile_id('5sr')).toBe(tile_id('5s'))
  })

  it('字牌は東南西北白發中の順', () => {
    expect(['E', 'S', 'W', 'N', 'P', 'F', 'C'].map(tile_id)).toEqual([27, 28, 29, 30, 31, 32, 33])
  })

  it('読めない表記はエラー', () => {
    expect(() => tile_id('0m')).toThrow()
    expect(() => tile_id('?')).toThrow()
  })
})

describe('suit_of / number_of / is_honor', () => {
  it('牌の番号から種類と数字を取り出す', () => {
    expect(suit_of(tile_id('7p'))).toBe(1)
    expect(number_of(tile_id('7p'))).toBe(7)
    expect(is_honor(tile_id('7p'))).toBe(false)
    expect(is_honor(tile_id('E'))).toBe(true)
  })
})

describe('tile_label', () => {
  it('数牌は番号と種類、字牌は漢字', () => {
    expect(tile_label(tile_id('5mr'))).toBe('5萬')
    expect(tile_label(tile_id('1p'))).toBe('1筒')
    expect(tile_label(tile_id('9s'))).toBe('9索')
    expect(tile_label(tile_id('F'))).toBe('發')
  })
})
