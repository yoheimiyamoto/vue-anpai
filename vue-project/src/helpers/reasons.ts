import {get_anpai, get_omote_suji, get_naka_suji, get_ura_suji, get_matagi_suji} from './suji'

// 牌に色が付いている理由
export type Reason = {
  status: 'safe' | 'danger'  // 画面の色（safe: スジ・青、danger: 危険牌・赤）
  numbers: number[]          // この理由で色が付いている牌
  title: string
}

// 選択（捨て牌）から、スジ（青）と危険牌（赤）になっている理由を取得
export function get_reasons(numbers: number[]): Reason[] {
  const selected = [...new Set(numbers)].sort((a, b) => a - b)
  const safe_numbers = get_anpai(selected)
  const reasons: Reason[] = []

  // 画面では 選択（緑）> スジ（青）> 危険牌（赤）の順に色が優先されるので、別の色で表示される牌は除く
  const add = (status: Reason['status'], targets: Iterable<number>, excludes: number[], title: string) => {
    const shown = [...new Set(targets)].filter(n => !excludes.includes(n)).sort((a, b) => a - b)
    if (shown.length) {
      reasons.push({ status, numbers: shown, title })
    }
  }

  // 表スジ
  selected.forEach(n => add('safe', get_omote_suji([n]), selected, `${n}の表スジ`))

  // 中スジ（1と7 => 4 のように、両側が切られている真ん中の牌）
  get_naka_suji(selected).forEach(m => add('safe', [m], selected, `${m-3}と${m+3}の中スジ`))

  // 裏スジ・跨ぎスジ
  const excludes = [...selected, ...safe_numbers]
  selected.forEach(n => {
    add('danger', get_ura_suji([n]), excludes, `${n}の裏スジ`)
    add('danger', get_matagi_suji([n]), excludes, `${n}の跨ぎスジ`)
  })

  return reasons
}
