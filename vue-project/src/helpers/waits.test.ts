import { describe, it, expect } from 'vitest';
import {get_waits, get_tile_statuses} from './waits';

describe('get_waits', () => {
  it('端の牌は両面1通り・単騎・シャンポン', () => {
    expect(get_waits(1)).toEqual([
      { shape: '両面', tiles: [1,4] },
      { shape: '単騎', tiles: [1] },
      { shape: 'シャンポン', tiles: [1] },
    ])
    expect(get_waits(9)).toEqual([
      { shape: '両面', tiles: [6,9] },
      { shape: '単騎', tiles: [9] },
      { shape: 'シャンポン', tiles: [9] },
    ])
  })

  it('3・7は辺張でも当たる', () => {
    expect(get_waits(3)).toEqual([
      { shape: '両面', tiles: [3,6] },
      { shape: '嵌張', tiles: [3] },
      { shape: '辺張', tiles: [3] },
      { shape: '単騎', tiles: [3] },
      { shape: 'シャンポン', tiles: [3] },
    ])
    expect(get_waits(7).map(w => w.shape)).toEqual(['両面', '嵌張', '辺張', '単騎', 'シャンポン'])
  })

  it('4・5・6は両面2通り', () => {
    expect(get_waits(5)).toEqual([
      { shape: '両面', tiles: [5,8] },
      { shape: '両面', tiles: [2,5] },
      { shape: '嵌張', tiles: [5] },
      { shape: '単騎', tiles: [5] },
      { shape: 'シャンポン', tiles: [5] },
    ])
  })
})

describe('get_tile_statuses', () => {
  it('捨て牌がなければ色を付けない', () => {
    expect(Object.values(get_tile_statuses([]))).toEqual(Array(9).fill('default'))
  })

  it('残っている待ちの形で 濃い青・薄い青・薄い赤・濃い赤 に分ける', () => {
    // 4を切ると 1-4・4-7 の両面がフリテン
    // 1は単騎・シャンポンだけ、7は嵌張(68)・辺張(89)が残る
    expect(get_tile_statuses([4])).toEqual({
      1: 'safe', 2: 'caution', 3: 'caution',
      4: 'selected', 5: 'danger', 6: 'danger',
      7: 'likely_safe', 8: 'caution', 9: 'caution',
    })
  })

  it('片スジの4・5・6は薄い赤', () => {
    // 1だけ切られた4は、4-7の両面が残る
    expect(get_tile_statuses([1])[4]).toBe('caution')
  })

  it('スジでも嵌張が残る2〜8は薄い青', () => {
    expect(get_tile_statuses([5])[2]).toBe('likely_safe')
    expect(get_tile_statuses([5])[8]).toBe('likely_safe')
    expect(get_tile_statuses([6])[3]).toBe('likely_safe')
    expect(get_tile_statuses([6])[9]).toBe('safe')
  })

  it('中スジの4・5・6は嵌張が残るので薄い青', () => {
    expect(get_tile_statuses([1,7])[4]).toBe('likely_safe')
    expect(get_tile_statuses([2,8])[5]).toBe('likely_safe')
    expect(get_tile_statuses([3,9])[6]).toBe('likely_safe')
  })
})
