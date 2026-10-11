import { describe, it, expect } from 'vitest'
import { classify, is_hit, get_candidates, Tally } from './tally'
import { tile_id } from './tiles'
import type { Scene } from './replay'

const tiles = (s: string) => s ? s.split(' ').map(tile_id) : []

function make_scene(o: { hand: string, riichi_discards: string, waits: string, furiten?: boolean, discarded?: string, ronned?: boolean }): Scene {
  const hand = tiles(o.hand)
  return {
    game_id: 'g', kyoku_index: 0, kyoku_label: '東1局', seat: 1, junme: 5,
    hand, discarded: o.discarded ? tile_id(o.discarded) : hand[0], ronned: o.ronned ?? false,
    riichi: { seat: 0, discards: tiles(o.riichi_discards), riichi_index: 0, hand: [], waits: tiles(o.waits), furiten: o.furiten ?? false },
  }
}

describe('classify', () => {
  it('捨て牌がなければ数牌は無地、字牌は字牌', () => {
    const rows = classify([])
    expect(rows.slice(0, 27).every(r => r == '無地')).toBe(true)
    expect(rows.slice(27).every(r => r == '字牌')).toBe(true)
  })

  it('数牌はその種類の捨て牌だけで、アプリと同じ色を付ける', () => {
    const rows = classify(tiles('4m E'))
    expect(rows.slice(0, 9)).toEqual(['濃い青', '薄い赤', '薄い赤', '現物', '濃い赤', '濃い赤', '薄い青', '薄い赤', '薄い赤'])
    expect(rows[tile_id('5p')]).toBe('無地')
    expect(rows[tile_id('E')]).toBe('現物')
    expect(rows[tile_id('S')]).toBe('字牌')
  })
})

describe('is_hit', () => {
  it('待ち牌で、フリテンでなければ当たり', () => {
    const scene = make_scene({ hand: '5m', riichi_discards: '4m', waits: '5m 8m' })
    expect(is_hit(scene, tile_id('5m'))).toBe(true)
    expect(is_hit(scene, tile_id('6m'))).toBe(false)
    expect(is_hit({ ...scene, riichi: { ...scene.riichi, furiten: true } }, tile_id('5m'))).toBe(false)
  })
})

describe('get_candidates', () => {
  it('手にある牌の種類ごとに1つ、行と当たりを付ける', () => {
    const scene = make_scene({ hand: '5m 1m 5mr E', riichi_discards: '4m', waits: '5m 8m' })
    expect(get_candidates(scene)).toEqual([
      { tile: tile_id('1m'), row: '濃い青', hit: false },
      { tile: tile_id('5m'), row: '濃い赤', hit: true },
      { tile: tile_id('E'), row: '字牌', hit: false },
    ])
  })
})

describe('Tally', () => {
  it('行ごとに母数と当たりを数え、当たり率の低い順に並べる（母数0の行は最後）', () => {
    const tally = new Tally()
    tally.add(make_scene({ hand: '1m 5m 8m 9m E', riichi_discards: '4m', waits: '5m 8m' }))
    tally.add(make_scene({ hand: '2m 3m 8m', riichi_discards: '4m', waits: '2m' }))
    const stats = Object.fromEntries(tally.row_stats().map(s => [s.row, [s.n, s.hits]]))
    expect(stats).toEqual({ 現物: [0, 0], 濃い青: [1, 0], 薄い青: [0, 0], 薄い赤: [5, 2], 濃い赤: [1, 1], 無地: [0, 0], 字牌: [1, 0] })
    expect(tally.order()).toEqual(['濃い青', '字牌', '薄い赤', '濃い赤', '現物', '薄い青', '無地'])
  })

  it('シミュレーター通りに切ったときの振込率（同じ行に複数あれば平均）', () => {
    const tally = new Tally()
    tally.add(make_scene({ hand: '1m 5m 8m 9m E', riichi_discards: '4m', waits: '5m 8m' }))  // 濃い青の1mを切る → 0
    tally.add(make_scene({ hand: '2m 3m 8m', riichi_discards: '4m', waits: '2m' }))          // 薄い赤3種類のうち1つが当たり → 1/3
    const strategy = tally.strategy()
    expect(strategy.order).toEqual(tally.order())
    expect(strategy.decisions).toBe(2)
    expect(strategy.deal_ins).toBeCloseTo(1 / 3)
    expect(strategy.by_row.find(r => r.row == '濃い青')).toEqual({ row: '濃い青', decisions: 1, deal_ins: 0 })
    expect(strategy.by_row.find(r => r.row == '薄い赤')!.deal_ins).toBeCloseTo(1 / 3)
  })

  it('牌譜のロンと判定の食い違い・見逃しを数える', () => {
    const tally = new Tally()
    tally.add(make_scene({ hand: '6m', riichi_discards: '4m', waits: '5m', discarded: '6m', ronned: true }))
    tally.add(make_scene({ hand: '5m', riichi_discards: '4m', waits: '5m', discarded: '5m', ronned: false }))
    tally.add(make_scene({ hand: '5m', riichi_discards: '4m', waits: '5m', discarded: '5m', ronned: true }))
    expect(tally.scenes).toBe(3)
    expect(tally.ron_mismatches).toBe(1)
    expect(tally.missed_rons).toBe(1)
  })
})
