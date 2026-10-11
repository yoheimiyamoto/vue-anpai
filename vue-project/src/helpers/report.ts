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

// 行の色の見本（アプリの牌画像の色と同じ。字牌はアプリでも色が付かないので null）
export const COLOR_OF_ROW: { [row: string]: string | null } = {
  現物: '#4cd964',
  濃い青: '#007aff',
  薄い青: '#c7e2ff',
  薄い赤: '#ffd2ce',
  濃い赤: '#ff3b30',
  無地: '#dddddd',
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

// 理由の色（Reasons.vue の status）と、集計結果の行の対応
const ROW_OF_STATUS: { [status: string]: string } = {
  safe: '濃い青',
  likely_safe: '薄い青',
  caution: '薄い赤',
  danger: '濃い赤',
}

// 理由の色の振込率（集計結果にその行がなければ「-」）
export function rate_text_of_status(rows: RowStat[], status: string): string {
  const stat = rows.find(s => s.row == ROW_OF_STATUS[status])
  return stat ? rate_text(stat.hits, stat.n) : '-'
}
