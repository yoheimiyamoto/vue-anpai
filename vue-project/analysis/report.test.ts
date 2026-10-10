import { describe, it, expect } from 'vitest'
import { render_report, tile_image_css, type ReportData } from './report'
import { Tally, ROWS } from './tally'
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
    rows: tally.row_stats(), strategy: tally.strategy(),
    row_examples: ROWS.filter(row => row != '現物').map(row => ({ row, scenes: tally.row_examples[ROWS.indexOf(row)].items })),
    strategy_examples: tally.strategy_examples(3),
  }
}

describe('render_report', () => {
  it('当たり率の表・振込率・実例を含むHTMLを作る', () => {
    const html = render_report(make_data(), '')
    expect(html).toContain('<table class="rates">')
    expect(html).toContain('1打ごとの振込率')
    expect(html).toContain('href="https://tenhou.net/0/?log=2025010100gm-00a9-0000-test&amp;tw=1&amp;ts=2"')
    expect(html).toContain('東3局 7巡目')
    // 切る人の手牌の 2m は薄い赤で、当たり牌の枠が付く
    expect(html).toContain('class="tile tile-0-2-caution hit"')
    // リーチ宣言牌（2枚目の S）は横向き
    expect(html).toContain('class="tile honor default riichi"')
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
