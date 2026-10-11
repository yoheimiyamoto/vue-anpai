import { readFileSync } from 'node:fs'
import type { TileStatus } from '../src/helpers/waits'
import type { Row, RowStat } from './tally'
import { is_honor, suit_of, number_of, tile_label } from './tiles'

// レポートに載せる集計結果
export type ReportData = {
  source: string                 // 牌譜のファイル名
  games: number                  // 読めた半荘の数
  skipped_games: number          // 読めずに飛ばした半荘の数
  kyokus: number
  riichis: number
  riichis_without_waits: number
  scenes: number
  ron_mismatches: number
  missed_rons: number
  rows: RowStat[]
}

// 行に対応する牌画像の色（字牌の行は画像がないので default の見た目）
const STATUS_OF_ROW: { [row in Row]: TileStatus } = {
  現物: 'selected',
  濃い青: 'safe',
  薄い青: 'likely_safe',
  薄い赤: 'caution',
  濃い赤: 'danger',
  無地: 'default',
  字牌: 'default',
}

// 牌画像のフォルダ（1: 索子、2: 萬子、3: 筒子）を suit_of の順（萬子・筒子・索子）に並べたもの
const IMAGE_FOLDERS = [2, 3, 1]
const STATUSES: TileStatus[] = ['default', 'selected', 'safe', 'likely_safe', 'caution', 'danger']

// 牌画像を埋め込むCSS。.tile-{種類}-{数字}-{色} の背景に画像を出す
export function tile_image_css(images_dir: URL): string {
  const rules: string[] = []
  for (let suit = 0; suit < 3; suit++) {
    for (let n = 1; n <= 9; n++) {
      for (const status of STATUSES) {
        const png = readFileSync(new URL(`${IMAGE_FOLDERS[suit]}/${status}/${n}.png`, images_dir))
        rules.push(`.tile-${suit}-${n}-${status}{background-image:url(data:image/png;base64,${png.toString('base64')})}`)
      }
    }
  }
  return rules.join('\n')
}

const escape_html = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
const percent = (x: number) => `${(x * 100).toFixed(1)}%`
const rate_text = (hits: number, n: number) => n ? percent(hits / n) : '-'
const count = (x: number) => x.toLocaleString('ja-JP')

// 牌1枚。数牌は画像、字牌は文字で描く
function tile_html(tile: number, status: TileStatus = 'default'): string {
  const label = tile_label(tile)
  return is_honor(tile)
    ? `<span class="tile honor" title="${label}">${label}</span>`
    : `<span class="tile tile-${suit_of(tile)}-${number_of(tile)}-${status}" title="${label}"></span>`
}

// 色ごとの振込率（表の右端に横棒を描く）
function rates_html(rows: RowStat[]): string {
  const max = Math.max(...rows.map(s => s.n ? s.hits / s.n : 0), 0.0001)
  const body = rows.map(s => {
    const rate = s.n ? s.hits / s.n : 0
    // 行の色の見本: 字牌の行は東、それ以外は 5萬 をその色で出す
    const sample = s.row == '字牌' ? tile_html(27) : tile_html(4, STATUS_OF_ROW[s.row])
    return `<tr title="${s.row}: 母数 ${count(s.n)}・振り込み ${count(s.hits)}">`
      + `<th scope="row"><span class="row-name">${sample}${s.row}</span></th>`
      + `<td class="num">${count(s.n)}</td><td class="num">${count(s.hits)}</td><td class="num">${rate_text(s.hits, s.n)}</td>`
      + `<td class="bar-cell"><span class="bar" style="width:${(rate / max * 100).toFixed(1)}%"></span></td>`
      + `</tr>`
  }).join('\n')
  return `<table class="rates">
<thead><tr><th scope="col">行</th><th scope="col" class="num">母数</th><th scope="col" class="num">振り込み</th><th scope="col" class="num">振込率</th><th scope="col" class="bar-cell"></th></tr></thead>
<tbody>
${body}
</tbody>
</table>`
}

// 集計の確認
function checks_html(data: ReportData): string {
  const items: [string, number, string][] = [
    ['牌譜でリーチ者がロンしたのに、判定が「当たり」でなかった打牌', data.ron_mismatches, '0になるはず'],
    ['判定は「当たり」なのに、牌譜ではロンされなかった打牌（見逃し）', data.missed_rons,
      `場面全体の${data.scenes ? (data.missed_rons / data.scenes * 100).toFixed(3) : 0}%。オーラスの着順のための見逃しや切断などで起きる`],
    ['待ちが計算できなかったリーチ', data.riichis_without_waits, '0になるはず'],
    ['読めずに飛ばした半荘', data.skipped_games, ''],
  ]
  return `<table><tbody>
${items.map(([label, value, note]) => `<tr><th scope="row">${label}</th><td class="num">${count(value)}</td><td class="muted">${note}</td></tr>`).join('\n')}
</tbody></table>`
}

const STYLE = `
:root {
  color-scheme: light;
  --surface: #fcfcfb;
  --text: #0b0b0b;
  --text-muted: #52514e;
  --border: #dddcd6;
  --bar: #2a78d6;
  --honor: #ecebe6;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --surface: #1a1a19;
      --text: #ffffff;
    --text-muted: #c3c2b7;
    --border: #3a3a37;
    --bar: #3987e5;
      --honor: #d9d8d2;
    }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --surface: #1a1a19;
  --text: #ffffff;
  --text-muted: #c3c2b7;
  --border: #3a3a37;
  --bar: #3987e5;
  --honor: #d9d8d2;
}
body {
  margin: 0;
  background: var(--surface);
  color: var(--text);
  font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", Meiryo, sans-serif;
  line-height: 1.6;
}
main { max-width: 880px; margin: 0 auto; padding: 24px 16px 64px; }
h1 { font-size: 1.5rem; margin: 0 0 16px; }
h2 { font-size: 1.15rem; margin: 40px 0 12px; padding-bottom: 4px; border-bottom: 1px solid var(--border); }
.muted { color: var(--text-muted); font-size: 0.9rem; }
table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
th, td { padding: 6px 8px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: middle; font-weight: normal; }
thead th { color: var(--text-muted); font-size: 0.85rem; }
.num { text-align: right; white-space: nowrap; }
.bar-cell { width: 40%; }
.bar { display: block; height: 12px; min-width: 1px; background: var(--bar); border-radius: 0 4px 4px 0; }
.row-name { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.row-name .tile { width: 18px; }
.row-name .tile.honor { font-size: 11px; line-height: 25px; }
.tile { display: inline-block; width: 30px; aspect-ratio: 143 / 197; background-size: cover; border-radius: 3px; vertical-align: middle; }
.tile.honor { background: var(--honor); color: #0b0b0b; text-align: center; font-weight: 700; font-size: 18px; line-height: 41px; }
@media (max-width: 560px) {
  .bar-cell { display: none; }
}
`

export function render_report(data: ReportData, image_css: string): string {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>安牌シミュレーター振込率</title>
<style>
${STYLE}
${image_css}
</style>
</head>
<body>
<main>
<h1>安牌シミュレーターの振込率</h1>

<section>
<h2>概要</h2>
<p>天鳳鳳凰卓の牌譜 <code>${escape_html(data.source)}</code> から、${count(data.games)} 半荘・${count(data.kyokus)} 局を読み込みました。成立したリーチは ${count(data.riichis)} 回、対象の場面（リーチ者が1人のときに、ほかの人が牌を切る直前）は ${count(data.scenes)} 回です。</p>
<p class="muted">振込率は、対象の場面で切る人の手にある牌（同じ牌は1回）を「切ったらリーチ者に振り込むか」で数えたものです。実際に切った牌だけでなく、手にある牌すべてを「もし切ったら」で数えています。色はリーチ者の捨て牌だけを使い、アプリと同じ判定で付けています。</p>
</section>

<section>
<h2>色ごとの振込率</h2>
${rates_html(data.rows)}
</section>

<section>
<h2>集計の確認</h2>
${checks_html(data)}
</section>

</main>
</body>
</html>
`
}
