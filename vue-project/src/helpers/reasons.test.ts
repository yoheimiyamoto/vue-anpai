import { describe, it, expect } from 'vitest';
import {get_reasons, ura_suji_shapes, matagi_suji_shapes} from './reasons';
import {get_anpai, get_kiken_hai, get_ura_suji, get_matagi_suji} from './suji';

const waits_of = (shapes: { waits: number[] }[]) => new Set<number>(shapes.flatMap(s => s.waits))

describe('ura_suji_shapes', () => {
  it('待ちが裏スジの判定と一致する', () => {
    for (let n = 1; n <= 9; n++) {
      expect(waits_of(ura_suji_shapes(n))).toEqual(get_ura_suji([n]))
    }
  })
})

describe('matagi_suji_shapes', () => {
  it('待ちが跨ぎスジの判定と一致する', () => {
    for (let n = 1; n <= 9; n++) {
      expect(waits_of(matagi_suji_shapes(n))).toEqual(get_matagi_suji([n]))
    }
  })
})

describe('get_reasons', () => {
  it('何も選択していなければ理由はない', () => {
    expect(get_reasons([])).toEqual([])
  })

  it('表スジ・裏スジ・跨ぎスジ', () => {
    expect(get_reasons([4])).toEqual([
      { status: 'safe', numbers: [1,7], title: '4の表スジ', detail: '4が切られているので、1-4待ち・4-7待ちの両面はフリテン。両面待ちには当たらない' },
      { status: 'danger', numbers: [5,8], title: '4の裏スジ', detail: '467から4を切ると67が残り5-8待ちになりうる' },
      { status: 'danger', numbers: [2,3,5,6], title: '4の跨ぎスジ', detail: '344から4を切ると34が残り2-5待ち、445から4を切ると45が残り3-6待ちになりうる' },
    ])
  })

  it('中スジ', () => {
    expect(get_reasons([1,7])).toContainEqual(
      { status: 'safe', numbers: [4], title: '1と7の中スジ', detail: '1と7が両方切られているので、1-4待ち・4-7待ちの両面はどちらもフリテン。両面待ちには当たらない' }
    )
  })

  it('別の色で表示される牌は理由から除く', () => {
    // 4,5を選択 => 1,2,7,8が安牌（青）
    const reasons = get_reasons([4,5])
    // 4の裏スジ5・8は、選択（緑）と安牌（青）なので理由に出さない
    expect(reasons.map(r => r.title)).not.toContain('4の裏スジ')
    // 5の裏スジ1・4・6・9のうち、1（安牌）と4（選択）を除く
    expect(reasons.find(r => r.title == '5の裏スジ')?.numbers).toEqual([6,9])
  })

  it('理由に挙げた牌は画面の色分けと一致する', () => {
    // 1〜9の選択の全組み合わせ
    for (let mask = 0; mask < 512; mask++) {
      const selected = [1,2,3,4,5,6,7,8,9].filter((_, i) => mask & (1 << i))
      const safe = get_anpai(selected).filter(n => !selected.includes(n))
      const danger = get_kiken_hai(selected).filter(n => !selected.includes(n) && !safe.includes(n))

      const reasons = get_reasons(selected)
      const numbers_of = (status: string) => new Set(reasons.filter(r => r.status == status).flatMap(r => r.numbers))
      expect(numbers_of('safe')).toEqual(new Set(safe))
      expect(numbers_of('danger')).toEqual(new Set(danger))
    }
  })
})
