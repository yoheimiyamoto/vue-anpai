import { describe, it, expect } from 'vitest'
import { replay_game } from './replay'
import { tile_id } from './tiles'

const tiles = (s: string) => s.split(' ').map(tile_id)

// 配牌（0番が 5s をツモって E を切ると 1p・4p 待ちのリーチになる）
const TEHAIS = [
  '1m 2m 3m 4m 5m 6m 7m 8m 9m 2p 3p 5s E',
  '1p 1p 4p 9p 2s 3s 7s 8s S S W W N',
  '1s 1s 1s 2s 2s 2s 3s 3s 3s 7m 7m 7m P',
  '4m 4m 5m 5m 6p 6p 7p 7p 8p 8p C C N',
]

const start = (tehais = TEHAIS, bakaze = 'E', kyoku = 1, honba = 0) =>
  ({ type: 'start_kyoku', bakaze, kyoku, honba, tehais: tehais.map(t => t.split(' ')) })
const tsumo = (actor: number, pai: string) => ({ type: 'tsumo', actor, pai })
const dahai = (actor: number, pai: string) => ({ type: 'dahai', actor, pai })
const reach = (actor: number) => ({ type: 'reach', actor })
const reach_accepted = (actor: number) => ({ type: 'reach_accepted', actor })
const hora = (actor: number, target: number) => ({ type: 'hora', actor, target })
const pon = (actor: number, target: number, pai: string) => ({ type: 'pon', actor, target, pai, consumed: [pai, pai] })

// 0番のリーチ（1p・4p 待ち）
const RIICHI_0 = [tsumo(0, '5s'), reach(0), dahai(0, 'E'), reach_accepted(0)]

describe('replay_game', () => {
  it('リーチ後にほかの人が切る場面を取り出す', () => {
    const result = replay_game('g', [start(), ...RIICHI_0, tsumo(1, '9s'), dahai(1, '9s'), { type: 'end_kyoku' }])
    expect(result.kyokus).toBe(1)
    expect(result.riichis).toBe(1)
    expect(result.riichis_without_waits).toBe(0)
    expect(result.scenes).toHaveLength(1)

    const scene = result.scenes[0]
    expect(scene).toMatchObject({
      game_id: 'g', kyoku_index: 0, kyoku_label: '東1局', seat: 1, junme: 1,
      discarded: tile_id('9s'), ronned: false,
    })
    expect(scene.hand).toEqual(tiles('1p 1p 4p 9p 2s 3s 7s 8s S S W W N 9s'))
    expect(scene.riichi).toEqual({
      seat: 0, discards: tiles('E'), riichi_index: 0,
      hand: tiles('1m 2m 3m 4m 5m 6m 7m 8m 9m 2p 3p 5s 5s'), waits: tiles('1p 4p'), furiten: false,
    })
  })

  it('リーチ前の打牌とリーチ者本人の打牌は数えない', () => {
    const result = replay_game('g', [start(), tsumo(1, '9s'), dahai(1, '9s'), ...RIICHI_0, tsumo(0, '9p'), dahai(0, '9p')])
    expect(result.scenes).toHaveLength(0)
  })

  it('待ち牌を見逃したら、その後はフリテン', () => {
    const result = replay_game('g', [start(), ...RIICHI_0,
      tsumo(1, '9s'), dahai(1, '9s'),
      tsumo(2, '1p'), dahai(2, '1p'),
      tsumo(3, 'F'), dahai(3, 'F')])
    expect(result.scenes.map(s => s.riichi.furiten)).toEqual([false, false, true])
  })

  it('リーチ者が自分で待ち牌を捨てたら、その後はフリテン', () => {
    const result = replay_game('g', [start(), ...RIICHI_0,
      tsumo(1, '9s'), dahai(1, '9s'),
      tsumo(0, '4p'), dahai(0, '4p'),
      tsumo(1, 'S'), dahai(1, 'S')])
    expect(result.scenes.map(s => s.riichi.furiten)).toEqual([false, true])
  })

  it('リーチ前に待ち牌を捨てていたら、リーチした時からフリテン', () => {
    const result = replay_game('g', [start(), tsumo(0, '1p'), dahai(0, '1p'), ...RIICHI_0, tsumo(1, '9s'), dahai(1, '9s')])
    expect(result.scenes[0].riichi.furiten).toBe(true)
    expect(result.scenes[0].riichi.riichi_index).toBe(1)
  })

  it('リーチ者のロンを記録する（ダブロンで2番目でも）', () => {
    const result = replay_game('g', [start(TEHAIS, 'S', 2, 1), ...RIICHI_0,
      tsumo(1, '9s'), dahai(1, '4p'), hora(3, 1), hora(0, 1), { type: 'end_kyoku' }])
    expect(result.scenes[0]).toMatchObject({ kyoku_label: '南2局 1本場', discarded: tile_id('4p'), ronned: true })
  })

  it('ほかの人だけのロンは、リーチ者のロンとして記録しない', () => {
    const result = replay_game('g', [start(), ...RIICHI_0, tsumo(1, '9s'), dahai(1, '4p'), hora(3, 1)])
    expect(result.scenes[0].ronned).toBe(false)
  })

  it('鳴かれた牌もリーチ者の捨て牌に残る', () => {
    const result = replay_game('g', [start(), ...RIICHI_0,
      tsumo(1, '9s'), dahai(1, '9s'),
      tsumo(0, 'W'), dahai(0, 'W'),
      pon(1, 0, 'W'), dahai(1, 'S')])
    const scene = result.scenes[1]
    expect(scene.riichi.discards).toEqual(tiles('E W'))
    expect(scene.hand).toHaveLength(11)
    expect(scene.junme).toBe(2)
  })

  it('2人目のリーチが成立した後は数えない（2人目の宣言牌は数える）', () => {
    const tehais = [TEHAIS[0], '1p 2p 3p 4p 5p 6p 7p 8p 9p 2s 3s S S', TEHAIS[2], TEHAIS[3]]
    const result = replay_game('g', [start(tehais), ...RIICHI_0,
      tsumo(1, 'N'), reach(1), dahai(1, 'N'), reach_accepted(1),
      tsumo(2, 'P'), dahai(2, 'P')])
    expect(result.riichis).toBe(2)
    expect(result.scenes.map(s => s.seat)).toEqual([1])
  })

  it('宣言牌でロンされたリーチは数えない', () => {
    const result = replay_game('g', [start(), tsumo(0, '5s'), reach(0), dahai(0, 'E'), hora(1, 0), { type: 'end_kyoku' }])
    expect(result.riichis).toBe(0)
    expect(result.scenes).toHaveLength(0)
  })

  it('暗槓の後は、鳴いていない部分で待ちを計算し直す', () => {
    const tehais = ['1m 1m 1m 4m 5m 6m 7m 8m 9m 2p 3p 5s E', TEHAIS[1], TEHAIS[2], TEHAIS[3]]
    const result = replay_game('g', [start(tehais), ...RIICHI_0,
      tsumo(0, '1m'), { type: 'ankan', actor: 0, consumed: ['1m', '1m', '1m', '1m'] },
      tsumo(0, 'C'), dahai(0, 'C'),
      tsumo(1, '9s'), dahai(1, '9s')])
    expect(result.scenes[0].riichi.hand).toEqual(tiles('4m 5m 6m 7m 8m 9m 2p 3p 5s 5s'))
    expect(result.scenes[0].riichi.waits).toEqual(tiles('1p 4p'))
  })

  it('牌譜と手牌が食い違っていたらエラー', () => {
    expect(() => replay_game('g', [start(), dahai(1, '1m')])).toThrow()
  })
})
