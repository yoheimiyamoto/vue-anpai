import { is_honor } from './tiles'

// 么九牌（国士無双に使う13種類）
const YAOCHU = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33]

// 34種類ごとの枚数
function to_counts(hand: number[]): number[] {
  const counts = Array(34).fill(0)
  hand.forEach(tile => counts[tile]++)
  return counts
}

// 残りの牌がすべて面子（刻子・順子）に分けられるか
// いちばん小さい牌は、刻子か、その牌から始まる順子のどちらかに必ず入るので、その2通りだけ試せばよい
function is_all_mentsu(counts: number[]): boolean {
  const i = counts.findIndex(c => c > 0)
  if (i < 0) {
    return true
  }

  if (counts[i] >= 3) {
    counts[i] -= 3
    const ok = is_all_mentsu(counts)
    counts[i] += 3
    if (ok) {
      return true
    }
  }

  if (!is_honor(i) && i % 9 <= 6 && counts[i + 1] > 0 && counts[i + 2] > 0) {
    counts[i]--; counts[i + 1]--; counts[i + 2]--
    const ok = is_all_mentsu(counts)
    counts[i]++; counts[i + 1]++; counts[i + 2]++
    if (ok) {
      return true
    }
  }

  return false
}

// 和了の形か（雀頭1つ + 面子、七対子、国士無双）
// counts は鳴いていない部分の34種類ごとの枚数で、合計は 3k+2 枚
export function is_complete(counts: number[]): boolean {
  const total = counts.reduce((a, b) => a + b, 0)

  if (total == 14) {
    // 七対子（同じ牌4枚は2組と数えない）
    if (counts.filter(c => c == 2).length == 7) {
      return true
    }
    // 国士無双
    if (YAOCHU.every(t => counts[t] >= 1) && YAOCHU.reduce((a, t) => a + counts[t], 0) == 14) {
      return true
    }
  }

  for (let i = 0; i < 34; i++) {
    if (counts[i] >= 2) {
      counts[i] -= 2
      const ok = is_all_mentsu(counts)
      counts[i] += 2
      if (ok) {
        return true
      }
    }
  }
  return false
}

// 手牌（鳴いていない部分、3k+1 枚）の待ち牌
// 自分で4枚使っている牌は5枚目がないので待ちに含めない
export function get_wait_tiles(hand: number[]): number[] {
  const counts = to_counts(hand)
  const waits: number[] = []
  for (let tile = 0; tile < 34; tile++) {
    if (counts[tile] >= 4) {
      continue
    }
    counts[tile]++
    if (is_complete(counts)) {
      waits.push(tile)
    }
    counts[tile]--
  }
  return waits
}
