// 待ちの形
export type Wait = {
  shape: '両面' | '嵌張' | '辺張' | '単騎' | 'シャンポン'
  tiles: number[]  // 待ち牌（両面は2種類）。どれかが捨て牌にあればフリテンでロンできない
}

// 画面の牌の色（画像フォルダ images/{tile_type}/{status}）
// selected: 捨て牌（緑）、safe: 濃い青、likely_safe: 薄い青、caution: 薄い赤、danger: 濃い赤
export type TileStatus = 'default' | 'selected' | 'safe' | 'likely_safe' | 'caution' | 'danger'

// 牌nで当たる待ちの形をすべて数え上げる
export function get_waits(n: number): Wait[] {
  const waits: Wait[] = []

  // 両面（例: 5は 67 の 5-8待ち と 34 の 2-5待ち）
  if (n + 3 <= 9) {
    waits.push({ shape: '両面', tiles: [n, n + 3] })
  }
  if (n - 3 >= 1) {
    waits.push({ shape: '両面', tiles: [n - 3, n] })
  }

  // 嵌張（例: 46 の 5待ち）
  if (2 <= n && n <= 8) {
    waits.push({ shape: '嵌張', tiles: [n] })
  }

  // 辺張（12 の 3待ち、89 の 7待ち）
  if (n == 3 || n == 7) {
    waits.push({ shape: '辺張', tiles: [n] })
  }

  waits.push({ shape: '単騎', tiles: [n] })
  waits.push({ shape: 'シャンポン', tiles: [n] })

  return waits
}

// 捨て牌から、1〜9それぞれの牌の色を決める
// 捨て牌で増減するのは両面待ちだけ（嵌張・辺張・単騎・シャンポンはその牌自体が切られない限り残る）なので、
// 両面待ちが残っていれば その数で 1: 薄い赤、2: 濃い赤 とする
// 両面待ちがなければスジで、嵌張・辺張が残れば 薄い青、単騎・シャンポンだけなら 濃い青 とする
export function get_tile_statuses(discards: number[]): { [n: number]: TileStatus } {
  const statuses: { [n: number]: TileStatus } = {}

  for (let n = 1; n <= 9; n++) {
    if (!discards.length) {
      statuses[n] = 'default'
    } else if (discards.includes(n)) {
      statuses[n] = 'selected'
    } else {
      const live_waits = get_waits(n).filter(w => !w.tiles.some(t => discards.includes(t)))
      const live_ryanmen = live_waits.filter(w => w.shape == '両面').length

      if (live_ryanmen == 2) {
        statuses[n] = 'danger'
      } else if (live_ryanmen == 1) {
        statuses[n] = 'caution'
      } else if (live_waits.some(w => w.shape == '嵌張' || w.shape == '辺張')) {
        statuses[n] = 'likely_safe'
      } else {
        statuses[n] = 'safe'
      }
    }
  }

  return statuses
}
