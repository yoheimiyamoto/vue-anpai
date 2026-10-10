import {get_omote_suji, get_naka_suji} from './suji'
import {get_tile_statuses} from './waits'

// 牌に色が付いている理由
export type Reason = {
  status: 'safe' | 'likely_safe' | 'caution' | 'danger'  // 画面の色（safe: 濃い青、likely_safe: 薄い青、caution: 薄い赤、danger: 濃い赤）
  numbers: number[]                                      // この理由で色が付いている牌
  title: string
}

// 選択（捨て牌）から、スジ（濃い青・薄い青）と危険牌（薄い赤・濃い赤）になっている理由を取得
export function get_reasons(numbers: number[]): Reason[] {
  const selected = [...new Set(numbers)].sort((a, b) => a - b)
  const statuses = get_tile_statuses(selected)
  const reasons: Reason[] = []

  // その色で表示される牌だけを理由に挙げる
  const add = (status: Reason['status'], targets: Iterable<number>, title: string) => {
    const shown = [...new Set(targets)].filter(n => statuses[n] == status).sort((a, b) => a - b)
    if (shown.length) {
      reasons.push({ status, numbers: shown, title })
    }
  }
  const all = [1,2,3,4,5,6,7,8,9]

  // 表スジ（1・9は単騎・シャンポンしか残らないので濃い青、それ以外は嵌張・辺張が残るので薄い青）
  selected.forEach(n => {
    add('safe', get_omote_suji([n]), `${n}の表スジ（単騎・シャンポンのみ）`)
    add('likely_safe', get_omote_suji([n]), `${n}の表スジ`)
  })

  // 中スジ（1と7 => 4 のように、両側が切られている真ん中の牌。嵌張が残るので薄い青）
  get_naka_suji(selected).forEach(m => add('likely_safe', [m], `${m-3}と${m+3}の中スジ`))

  // 危険牌
  add('danger', all, '両面待ちが2通り残っている')
  add('caution', all, '両面待ちが1通り残っている')

  return reasons
}
