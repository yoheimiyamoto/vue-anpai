import { mkdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { read_game_logs } from './tar'
import { replay_game } from './replay'
import { Tally } from './tally'
import { render_report, tile_image_css } from './report'

const USAGE = '使い方: npm run analyze -- <tarのパス> [--limit 半荘数] [--out レポートのパス]'

function parse_args(args: string[]) {
  let path = ''
  let limit = Infinity
  let out = 'analysis/out/report.html'
  for (let i = 0; i < args.length; i++) {
    if (args[i] == '--limit') {
      limit = Number(args[++i])
    } else if (args[i] == '--out') {
      out = args[++i]
    } else {
      path = args[i]
    }
  }
  if (!path || !(limit > 0)) {
    throw new Error(USAGE)
  }
  return { path, limit, out }
}

const { path, limit, out } = parse_args(process.argv.slice(2))
const tally = new Tally()
let games = 0
let skipped_games = 0
let kyokus = 0
let riichis = 0
let riichis_without_waits = 0
const errors: string[] = []

for (const log of read_game_logs(path)) {
  if (games + skipped_games >= limit) {
    break
  }
  try {
    if (log.error) {
      throw new Error(`解凍できません: ${log.error}`)
    }
    const events = log.text.trim().split('\n').map(line => JSON.parse(line))
    const result = replay_game(log.id, events)
    // 半荘の最後まで再生できたものだけ数える
    result.scenes.forEach(scene => tally.add(scene))
    games++
    kyokus += result.kyokus
    riichis += result.riichis
    riichis_without_waits += result.riichis_without_waits
  } catch (e) {
    skipped_games++
    if (errors.length < 5) {
      errors.push(`${log.id}: ${(e as Error).message}`)
    }
  }
  if ((games + skipped_games) % 1000 == 0) {
    process.stderr.write(`${games + skipped_games} 半荘\r`)
  }
}

const html = render_report({
  source: basename(path),
  games,
  skipped_games,
  kyokus,
  riichis,
  riichis_without_waits,
  scenes: tally.scenes,
  ron_mismatches: tally.ron_mismatches,
  missed_rons: tally.missed_rons,
  rows: tally.row_stats(),
}, tile_image_css(new URL('../public/images/', import.meta.url)))

mkdirSync(dirname(resolve(out)), { recursive: true })
writeFileSync(out, html)

console.log(`${games} 半荘（読めなかった ${skipped_games}）・リーチ ${riichis}・場面 ${tally.scenes}`)
tally.row_stats().forEach(s => console.log(`${s.row}\t母数 ${s.n}\t振り込み ${s.hits}\t${s.n ? (s.hits / s.n * 100).toFixed(1) : '-'}%`))
console.log(`確認: ロンと判定の食い違い ${tally.ron_mismatches}・見逃し ${tally.missed_rons}・待ちのないリーチ ${riichis_without_waits}`)
errors.forEach(e => console.error(e))
console.log(`レポート: ${resolve(out)}`)
