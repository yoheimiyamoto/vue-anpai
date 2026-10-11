import { describe, it, expect } from 'vitest'
import { render_report, tile_image_css, type ReportData } from './report'
import { Tally } from './tally'
import { tile_id } from './tiles'
import type { Scene } from './replay'

const tiles = (s: string) => s.split(' ').map(tile_id)

// 1m・3m の嵌張で 2m 待ちのリーチに対して、2m・3m・8m・E を持っている場面
function make_scene(): Scene {
  return {
    game_id: '2025010100gm-00a9-0000-test', kyoku_index: 2, kyoku_label: '東3局', seat: 1, junme: 7,
    hand: tiles('2m 3m 8m E'), discarded: tile_id('E'), ronned: false,
    riichi: {
      seat: 0, discards: tiles('4m S'), riichi_index: 1,
      hand: tiles('1m 3m 4m 5m 6m 7m 8m 9m 1p 2p 3p E E'), waits: tiles('2m'), furiten: false,
    },
  }
}

function make_data(): ReportData {
  const tally = new Tally()
  tally.add(make_scene())
  return {
    source: 'tenhou-houou-2025.tar', games: 1, skipped_games: 0, kyokus: 8, riichis: 3, riichis_without_waits: 0,
    scenes: tally.scenes, ron_mismatches: tally.ron_mismatches, missed_rons: tally.missed_rons,
    rows: tally.row_stats(),
  }
}

describe('render_report', () => {
  it('色ごとの振込率の表だけを載せ、シミュレーター通りの振込率と実例は載せない', () => {
    const html = render_report(make_data(), '')
    expect(html).toContain('<h2>色ごとの振込率</h2>')
    expect(html).toContain('<table class="rates">')
    expect(html).not.toContain('当たり率')
    expect(html).not.toContain('シミュレーターに従って')
    expect(html).not.toContain('実例')
  })

  it('見逃しの数に、場面全体に占める割合と理由を添える', () => {
    const html = render_report({ ...make_data(), scenes: 1000, missed_rons: 2 }, '')
    expect(html).toContain('場面全体の0.200%')
    expect(html).toContain('オーラスの着順のための見逃しや切断')
  })

  it('母数が0の行は当たり率を「-」にし、NaNを出さない', () => {
    const html = render_report(make_data(), '')
    expect(html).not.toContain('NaN')
    expect(html).toContain('<td class="num">-</td>')
  })
})

describe('tile_image_css', () => {
  it('3種類×9枚×6色ぶんの牌画像を埋め込む', () => {
    const css = tile_image_css(new URL('../public/images/', import.meta.url))
    expect(css.split('\n')).toHaveLength(162)
    expect(css).toContain('.tile-0-5-danger{background-image:url(data:image/png;base64,')
  })
})
