import {get_anpai} from './suji'

// 牌に色が付いている理由
export type Reason = {
  status: 'safe' | 'danger'  // 画面の色（safe: スジ・青、danger: 危険牌・赤）
  numbers: number[]          // この理由で色が付いている牌
  title: string
  detail: string
}

// 捨て牌を含む形と、それを切った後に残る両面とその待ち
type Shape = {
  shape: number[]
  rest: number[]
  waits: number[]
}

// 裏スジの形
// n,n+2,n+3 から n を切ると n+2,n+3 の両面が残る（反対側の n-3,n-2,n も同様）
export function ura_suji_shapes(n: number): Shape[] {
  const shapes: Shape[] = []
  if (n <= 5) {
    shapes.push({ shape: [n, n+2, n+3], rest: [n+2, n+3], waits: [n+1, n+4] })
  }
  if (n >= 5) {
    shapes.push({ shape: [n-3, n-2, n], rest: [n-3, n-2], waits: [n-4, n-1] })
  }
  return shapes
}

// 跨ぎスジの形
// n-1,n,n や n,n,n+1 から n を切っても、n を含む両面が残る
export function matagi_suji_shapes(n: number): Shape[] {
  const shapes: Shape[] = []
  if (n >= 3 && n <= 8) {
    shapes.push({ shape: [n-1, n, n], rest: [n-1, n], waits: [n-2, n+1] })
  }
  if (n >= 2 && n <= 7) {
    shapes.push({ shape: [n, n, n+1], rest: [n, n+1], waits: [n-1, n+2] })
  }
  return shapes
}

function describe_shapes(n: number, shapes: Shape[]): string {
  return shapes
    .map(s => `${s.shape.join('')}から${n}を切ると${s.rest.join('')}が残り${s.waits.join('-')}待ち`)
    .join('、') + 'になりうる'
}

// 選択（捨て牌）から、スジ（青）と危険牌（赤）になっている理由を取得
export function get_reasons(numbers: number[]): Reason[] {
  const selected = [...new Set(numbers)].sort((a, b) => a - b)
  const safe_numbers = get_anpai(selected)
  const reasons: Reason[] = []

  // 画面では 選択（緑）> スジ（青）> 危険牌（赤）の順に色が優先されるので、別の色で表示される牌は除く
  const add = (status: Reason['status'], targets: number[], excludes: number[], title: string, detail: string) => {
    const shown = [...new Set(targets)].filter(n => !excludes.includes(n)).sort((a, b) => a - b)
    if (shown.length) {
      reasons.push({ status, numbers: shown, title, detail })
    }
  }

  // 表スジ
  selected.filter(n => n >= 4 && n <= 6).forEach(n => {
    add('safe', [n-3, n+3], selected, `${n}の表スジ`,
      `${n}が切られているので、${n-3}-${n}待ち・${n}-${n+3}待ちの両面はフリテン。両面待ちには当たらない`)
  })

  // 中スジ
  ;[4, 5, 6].forEach(m => {
    if (selected.includes(m-3) && selected.includes(m+3)) {
      add('safe', [m], selected, `${m-3}と${m+3}の中スジ`,
        `${m-3}と${m+3}が両方切られているので、${m-3}-${m}待ち・${m}-${m+3}待ちの両面はどちらもフリテン。両面待ちには当たらない`)
    }
  })

  // 裏スジ・跨ぎスジ
  const excludes = [...selected, ...safe_numbers]
  selected.forEach(n => {
    const ura = ura_suji_shapes(n)
    add('danger', ura.flatMap(s => s.waits), excludes, `${n}の裏スジ`, describe_shapes(n, ura))

    const matagi = matagi_suji_shapes(n)
    add('danger', matagi.flatMap(s => s.waits), excludes, `${n}の跨ぎスジ`, describe_shapes(n, matagi))
  })

  return reasons
}
