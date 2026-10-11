import { readFileSync } from 'node:fs'
import type { TileStatus } from '../src/helpers/waits'
import type { Scene } from './replay'
import { classify, get_candidates, choose, is_hit, type Row, type RowStat, type StrategyStat } from './tally'
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
  strategy: StrategyStat
  row_examples: { row: Row, scenes: Scene[] }[]
  strategy_examples: Scene[]
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
const sorted = (tiles: number[]) => [...tiles].sort((a, b) => a - b)

// 牌1枚。数牌は画像、字牌は文字で描く。classes は riichi（宣言牌）・hit（当たり牌）
function tile_html(tile: number, status: TileStatus = 'default', classes = ''): string {
  const label = tile_label(tile)
  const extra = classes ? ` ${classes}` : ''
  return is_honor(tile)
    ? `<span class="tile honor ${status}${extra}" title="${label}">${label}</span>`
    : `<span class="tile tile-${suit_of(tile)}-${number_of(tile)}-${status}${extra}" title="${label}"></span>`
}

// 色ごとの当たり率（表の右端に横棒を描く）
function rates_html(rows: RowStat[]): string {
  const max = Math.max(...rows.map(s => s.n ? s.hits / s.n : 0), 0.0001)
  const body = rows.map(s => {
    const rate = s.n ? s.hits / s.n : 0
    // 行の色の見本: 字牌の行は東、それ以外は 5萬 をその色で出す
    const sample = s.row == '字牌' ? tile_html(27) : tile_html(4, STATUS_OF_ROW[s.row])
    return `<tr title="${s.row}: 母数 ${count(s.n)}・当たり ${count(s.hits)}">`
      + `<th scope="row"><span class="row-name">${sample}${s.row}</span></th>`
      + `<td class="num">${count(s.n)}</td><td class="num">${count(s.hits)}</td><td class="num">${rate_text(s.hits, s.n)}</td>`
      + `<td class="bar-cell"><span class="bar" style="width:${(rate / max * 100).toFixed(1)}%"></span></td>`
      + `</tr>`
  }).join('\n')
  return `<table class="rates">
<thead><tr><th scope="col">行</th><th scope="col" class="num">母数</th><th scope="col" class="num">当たり</th><th scope="col" class="num">当たり率</th><th scope="col" class="bar-cell"></th></tr></thead>
<tbody>
${body}
</tbody>
</table>`
}

// シミュレーターに従って切ったときの振込率
function strategy_html(strategy: StrategyStat): string {
  const total = strategy.decisions
  const rows = strategy.by_row.filter(r => r.decisions).map(r => `<tr>`
    + `<th scope="row">${r.row}</th>`
    + `<td class="num">${count(r.decisions)}</td><td class="num">${rate_text(r.decisions, total)}</td>`
    + `<td class="num">${rate_text(r.deal_ins, r.decisions)}</td>`
    + `</tr>`).join('\n')
  return `<p class="order">切る順番: ${strategy.order.join(' → ')}</p>
<div class="hero"><span class="hero-number">${rate_text(strategy.deal_ins, total)}</span><span class="hero-label">1打ごとの振込率（${count(total)} 打）</span></div>
<table>
<thead><tr><th scope="col">切ることになった行</th><th scope="col" class="num">回数</th><th scope="col" class="num">割合</th><th scope="col" class="num">その行での振込率</th></tr></thead>
<tbody>
${rows}
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

// 実例の1場面
function scene_html(scene: Scene, order: Row[]): string {
  const rows = classify(scene.riichi.discards)
  const candidates = get_candidates(scene)
  const chosen = choose(candidates, order)
  const hit_tiles = new Set(candidates.filter(c => c.hit).map(c => c.tile))
  const link = `https://tenhou.net/0/?log=${encodeURIComponent(scene.game_id)}&amp;tw=${scene.seat}&amp;ts=${scene.kyoku_index}`

  const river = scene.riichi.discards.map((t, i) => tile_html(t, 'default', i == scene.riichi.riichi_index ? 'riichi' : '')).join('')
  const riichi_hand = sorted(scene.riichi.hand).map(t => tile_html(t)).join('')
  const waits = scene.riichi.waits.map(t => tile_html(t)).join('') + (scene.riichi.furiten ? '<span class="tag">フリテン</span>' : '')
  const hand = sorted(scene.hand).map(t => tile_html(t, STATUS_OF_ROW[rows[t]], hit_tiles.has(t) ? 'hit' : '')).join('')
  const discarded_result = scene.ronned ? 'ロンされた' : is_hit(scene, scene.discarded) ? '当たりだが見逃された' : '通った'
  const chosen_tiles = chosen.map(c => tile_html(c.tile, STATUS_OF_ROW[c.row], c.hit ? 'hit' : '')).join('')
  const chosen_rate = percent(chosen.filter(c => c.hit).length / chosen.length)

  return `<article class="scene">
<header><a href="${link}" target="_blank" rel="noopener">${scene.kyoku_label} ${scene.junme}巡目</a><span class="muted">席${scene.seat}が切る（リーチ者は席${scene.riichi.seat}）</span></header>
<dl>
<dt>リーチ者の捨て牌</dt><dd class="tiles">${river}</dd>
<dt>リーチ者の手牌</dt><dd class="tiles">${riichi_hand}</dd>
<dt>待ち（当たり牌）</dt><dd class="tiles">${waits}</dd>
<dt>切る人の手牌</dt><dd class="tiles">${hand}</dd>
<dt>実際に切った牌</dt><dd class="tiles">${tile_html(scene.discarded, STATUS_OF_ROW[rows[scene.discarded]])}<span class="result">${discarded_result}</span></dd>
<dt>シミュレーター通りなら</dt><dd class="tiles">${chosen_tiles}<span class="result">${chosen[0].row}から切る・この1打の振込率 ${chosen_rate}</span></dd>
</dl>
</article>`
}

function scenes_html(title: string, scenes: Scene[], order: Row[]): string {
  const body = scenes.length
    ? scenes.map(scene => scene_html(scene, order)).join('\n')
    : '<p class="muted">該当する場面はありませんでした。</p>'
  return `<h3>${title}</h3>\n${body}`
}

const STYLE = `
:root {
  color-scheme: light;
  --surface: #fcfcfb;
  --surface-2: #f1f0ec;
  --text: #0b0b0b;
  --text-muted: #52514e;
  --border: #dddcd6;
  --bar: #2a78d6;
  --hit: #e34948;
  --honor: #ecebe6;
  --honor-selected: #cfe8cf;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --surface: #1a1a19;
    --surface-2: #262624;
    --text: #ffffff;
    --text-muted: #c3c2b7;
    --border: #3a3a37;
    --bar: #3987e5;
    --hit: #e66767;
    --honor: #d9d8d2;
    --honor-selected: #b9dcb9;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --surface: #1a1a19;
  --surface-2: #262624;
  --text: #ffffff;
  --text-muted: #c3c2b7;
  --border: #3a3a37;
  --bar: #3987e5;
  --hit: #e66767;
  --honor: #d9d8d2;
  --honor-selected: #b9dcb9;
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
h3 { font-size: 1rem; margin: 28px 0 8px; }
a { color: var(--bar); }
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
.order { font-weight: 700; }
.hero { display: flex; flex-wrap: wrap; align-items: baseline; gap: 12px; margin: 16px 0; }
.hero-number { font-size: 2.5rem; font-weight: 700; }
.hero-label { color: var(--text-muted); }
.tile { display: inline-block; width: 30px; aspect-ratio: 143 / 197; background-size: cover; border-radius: 3px; vertical-align: middle; }
.tile.honor { background: var(--honor); color: #0b0b0b; text-align: center; font-weight: 700; font-size: 18px; line-height: 41px; }
.tile.honor.selected { background: var(--honor-selected); }
.tile.riichi { transform: rotate(90deg); margin: 0 7px; }
.tile.hit { outline: 3px solid var(--hit); outline-offset: -1px; }
.tiles { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; margin: 0; }
.result { margin-left: 8px; font-size: 0.9rem; }
.tag { margin-left: 8px; padding: 0 6px; border-radius: 4px; background: var(--surface-2); font-size: 0.85rem; }
.scene { margin: 12px 0; padding: 12px; border: 1px solid var(--border); border-radius: 8px; }
.scene header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; margin-bottom: 8px; }
.scene dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 12px; margin: 0; }
.scene dt { color: var(--text-muted); font-size: 0.85rem; }
.scene dd { margin: 0; }
@media (max-width: 560px) {
  .scene dl { grid-template-columns: 1fr; }
  .tile { width: 24px; }
  .tile.honor { font-size: 14px; line-height: 33px; }
  .bar-cell { display: none; }
}
`

export function render_report(data: ReportData, image_css: string): string {
  const order = data.strategy.order
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>安牌シミュレーター当たり率</title>
<style>
${STYLE}
${image_css}
</style>
</head>
<body>
<main>
<h1>安牌シミュレーターの当たり率</h1>

<section>
<h2>概要</h2>
<p>天鳳鳳凰卓の牌譜 <code>${escape_html(data.source)}</code> から、${count(data.games)} 半荘・${count(data.kyokus)} 局を読み込みました。成立したリーチは ${count(data.riichis)} 回、対象の場面（リーチ者が1人のときに、ほかの人が牌を切る直前）は ${count(data.scenes)} 回です。</p>
<p class="muted">当たり率は、対象の場面で切る人の手にある牌（同じ牌は1回）を「切ったらリーチ者に当たるか」で数えたものです。色はリーチ者の捨て牌だけを使い、アプリと同じ判定で付けています。</p>
</section>

<section>
<h2>色ごとの当たり率</h2>
${rates_html(data.rows)}
</section>

<section>
<h2>シミュレーターに従って切ったときの振込率</h2>
<p class="muted">上の表で当たり率が低い行から順に、手にある一番安全な行の牌を切ったときに、その1打で振り込む確率です。同じ行の牌が複数あるときは平均をとっています。</p>
${strategy_html(data.strategy)}
</section>

<section>
<h2>集計の確認</h2>
${checks_html(data)}
</section>

<section>
<h2>実例</h2>
<p class="muted">リンクは天鳳の牌譜を、切る人の視点・その局で開きます。赤い枠の牌は当たり牌、横向きの牌はリーチ宣言牌です。</p>
${data.row_examples.map(({ row, scenes }) => scenes_html(`${row}の牌が当たりだった場面`, scenes, order)).join('\n')}
${scenes_html('シミュレーター通りに切ると振り込む場面', data.strategy_examples, order)}
</section>
</main>
</body>
</html>
`
}
