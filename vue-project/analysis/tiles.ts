// 牌の番号（34種類）
// 0〜8: 萬子1〜9、9〜17: 筒子1〜9、18〜26: 索子1〜9、27〜33: 東南西北白發中
// mjaiの表記: 萬子 1m〜9m、筒子 1p〜9p、索子 1s〜9s、赤5 は 5mr・5pr・5sr、字牌 E S W N P F C

const HONORS = ['E', 'S', 'W', 'N', 'P', 'F', 'C']
const HONOR_LABELS = ['東', '南', '西', '北', '白', '發', '中']
const SUITS = ['m', 'p', 's']
const SUIT_LABELS = ['萬', '筒', '索']

// mjaiの表記を牌の番号にする（赤5は5と同じ番号）
export function tile_id(pai: string): number {
  const honor = HONORS.indexOf(pai)
  if (honor >= 0) {
    return 27 + honor
  }

  const match = /^([1-9])([mps])r?$/.exec(pai)
  if (!match) {
    throw new Error(`牌の表記が読めません: ${pai}`)
  }
  return SUITS.indexOf(match[2]) * 9 + Number(match[1]) - 1
}

export function is_honor(tile: number): boolean {
  return tile >= 27
}

// 数牌の種類（0: 萬子、1: 筒子、2: 索子）
export function suit_of(tile: number): number {
  return Math.floor(tile / 9)
}

// 数牌の数字（1〜9）
export function number_of(tile: number): number {
  return tile % 9 + 1
}

// 画面に出す名前（5萬・東 など）
export function tile_label(tile: number): string {
  return is_honor(tile) ? HONOR_LABELS[tile - 27] : `${number_of(tile)}${SUIT_LABELS[suit_of(tile)]}`
}
