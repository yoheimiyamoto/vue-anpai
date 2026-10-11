import { get_tile_statuses, type TileStatus } from '../src/helpers/waits'
import { is_honor, suit_of, number_of } from './tiles'
import type { Scene } from './replay'

// 表の行（シミュレーターの色。字牌は色が付かないので別の行）
export const ROWS = ['現物', '濃い青', '薄い青', '薄い赤', '濃い赤', '無地', '字牌'] as const
export type Row = typeof ROWS[number]

const ROW_OF_STATUS: { [status in TileStatus]: Row } = {
  selected: '現物',
  safe: '濃い青',
  likely_safe: '薄い青',
  caution: '薄い赤',
  danger: '濃い赤',
  default: '無地',
}

// リーチ者の捨て牌から、34種類の牌それぞれの行を決める
// 数牌は種類ごとに、その種類の捨て牌の数字だけをアプリの判定に渡す
export function classify(riichi_discards: number[]): Row[] {
  const rows: Row[] = []
  for (let suit = 0; suit < 3; suit++) {
    const numbers = riichi_discards.filter(t => !is_honor(t) && suit_of(t) == suit).map(number_of)
    const statuses = get_tile_statuses(numbers)
    for (let n = 1; n <= 9; n++) {
      rows.push(ROW_OF_STATUS[statuses[n]])
    }
  }
  for (let tile = 27; tile < 34; tile++) {
    rows.push(riichi_discards.includes(tile) ? '現物' : '字牌')
  }
  return rows
}

// その牌を切ったらリーチ者に当たるか
export function is_hit(scene: Scene, tile: number): boolean {
  return !scene.riichi.furiten && scene.riichi.waits.includes(tile)
}

// 切る人の手にある牌の種類（同じ牌は1つ）
export type Candidate = { tile: number, row: Row, hit: boolean }

export function get_candidates(scene: Scene): Candidate[] {
  const rows = classify(scene.riichi.discards)
  return [...new Set(scene.hand)]
    .sort((a, b) => a - b)
    .map(tile => ({ tile, row: rows[tile], hit: is_hit(scene, tile) }))
}

export type RowStat = { row: Row, n: number, hits: number }

export type StrategyStat = {
  order: Row[]       // 切る順番（当たり率の低い順）
  decisions: number  // 場面の数
  deal_ins: number   // 振り込みの数（同じ行に複数あるときは平均なので小数になる）
  by_row: { row: Row, decisions: number, deal_ins: number }[]  // 切ることになった行ごと（order の順）
}

export class Tally {
  scenes = 0
  ron_mismatches = 0  // 牌譜ではリーチ者がロンしたのに、判定が当たりでなかった打牌
  missed_rons = 0     // 判定は当たりなのに、牌譜ではロンされなかった打牌

  private n = ROWS.map(() => 0)
  private hits = ROWS.map(() => 0)
  // 場面の形（行ごとの「手にある種類数」と「そのうち当たりの数」）ごとの場面の数
  // シミュレーターに従ったときの振込率は形だけで決まるので、切る順番が決まってからここで計算する
  private shapes = new Map<string, number>()

  add(scene: Scene) {
    this.scenes++

    const n = ROWS.map(() => 0)
    const hits = ROWS.map(() => 0)
    get_candidates(scene).forEach(c => {
      const r = ROWS.indexOf(c.row)
      n[r]++
      if (c.hit) {
        hits[r]++
      }
    })

    ROWS.forEach((_, r) => {
      this.n[r] += n[r]
      this.hits[r] += hits[r]
    })

    const key = [...n, ...hits].join(',')
    this.shapes.set(key, (this.shapes.get(key) ?? 0) + 1)

    const hit = is_hit(scene, scene.discarded)
    if (scene.ronned && !hit) {
      this.ron_mismatches++
    }
    if (!scene.ronned && hit) {
      this.missed_rons++
    }
  }

  row_stats(): RowStat[] {
    return ROWS.map((row, r) => ({ row, n: this.n[r], hits: this.hits[r] }))
  }

  // 当たり率の低い順。母数0の行は最後、同じ当たり率なら ROWS の順
  order(): Row[] {
    const rate = (s: RowStat) => s.n ? s.hits / s.n : Infinity
    return this.row_stats()
      .sort((a, b) => rate(a) == rate(b) ? 0 : rate(a) < rate(b) ? -1 : 1)
      .map(s => s.row)
  }

  strategy(): StrategyStat {
    const order = this.order()
    const order_indexes = order.map(row => ROWS.indexOf(row))
    const by_row = ROWS.map(row => ({ row: row as Row, decisions: 0, deal_ins: 0 }))
    let decisions = 0
    let deal_ins = 0

    this.shapes.forEach((count, key) => {
      const values = key.split(',').map(Number)
      const n = values.slice(0, ROWS.length)
      const hits = values.slice(ROWS.length)
      const r = order_indexes.find(r => n[r] > 0)!
      const deal_in = hits[r] / n[r] * count
      decisions += count
      deal_ins += deal_in
      by_row[r].decisions += count
      by_row[r].deal_ins += deal_in
    })

    return { order, decisions, deal_ins, by_row: order_indexes.map(r => by_row[r]) }
  }
}
