import { describe, it, expect } from 'vitest';
import {get_reasons} from './reasons';
import {get_tile_statuses} from './waits';

describe('get_reasons', () => {
  it('何も選択していなければ理由はない', () => {
    expect(get_reasons([])).toEqual([])
  })

  it('表スジ・両面待ちの残り数', () => {
    expect(get_reasons([4])).toEqual([
      { status: 'safe', numbers: [1], title: '4の表スジ（単騎・シャンポンのみ）' },
      { status: 'likely_safe', numbers: [7], title: '4の表スジ' },
      { status: 'danger', numbers: [5,6], title: '両面待ちが2通り残っている' },
      { status: 'caution', numbers: [2,3,8,9], title: '両面待ちが1通り残っている' },
    ])
  })

  it('中スジ', () => {
    expect(get_reasons([1,7])).toContainEqual({ status: 'likely_safe', numbers: [4], title: '1と7の中スジ' })
  })

  it('理由に挙げた牌は画面の色分けと一致する', () => {
    // 1〜9の選択の全組み合わせ
    for (let mask = 0; mask < 512; mask++) {
      const selected = [1,2,3,4,5,6,7,8,9].filter((_, i) => mask & (1 << i))
      const statuses = get_tile_statuses(selected)
      const tiles_of = (status: string) => new Set([1,2,3,4,5,6,7,8,9].filter(n => statuses[n] == status))

      const reasons = get_reasons(selected)
      const numbers_of = (status: string) => new Set(reasons.filter(r => r.status == status).flatMap(r => r.numbers))
      for (const status of ['safe', 'likely_safe', 'caution', 'danger']) {
        expect(numbers_of(status)).toEqual(tiles_of(status))
      }
    }
  })
})
