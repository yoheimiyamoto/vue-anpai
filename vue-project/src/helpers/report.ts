import type { TileStatus } from './waits'

// 振込率レポート（/report）に出す集計結果
// 計測スクリプト（analysis/main.ts）が天鳳の牌譜から集計して src/data/report.json に書き出す
export type RowStat = {
  row: string   // 現物・濃い青・薄い青・薄い赤・濃い赤・無地・字牌
  n: number     // 切る人の手にあった牌の数（同じ牌は1回）
  hits: number  // そのうち切ったらリーチ者に振り込む牌の数
}

export type ReportData = {
  source: string   // 牌譜のファイル名
  games: number    // 半荘の数
  kyokus: number   // 局の数
  riichis: number  // 成立したリーチの数
  scenes: number   // リーチ者が1人のときに、ほかの人が牌を切った回数
  rows: RowStat[]
}

// 行の色の見本に使う牌画像の色（字牌は画像がないので null）
export const STATUS_OF_ROW: { [row: string]: TileStatus | null } = {
  現物: 'selected',
  濃い青: 'safe',
  薄い青: 'likely_safe',
  薄い赤: 'caution',
  濃い赤: 'danger',
  無地: 'default',
  字牌: null,
}

// 振込率を小数1桁の%で出す（母数が0なら「-」）
export function rate_text(hits: number, n: number): string {
  return n ? `${(hits / n * 100).toFixed(1)}%` : '-'
}

// 横棒の長さ。一番高い振込率を100%とする
export function bar_widths(rows: RowStat[]): string[] {
  const rates = rows.map(s => s.n ? s.hits / s.n : 0)
  const max = Math.max(...rates)
  return rates.map(rate => `${(max ? rate / max * 100 : 0).toFixed(1)}%`)
}
