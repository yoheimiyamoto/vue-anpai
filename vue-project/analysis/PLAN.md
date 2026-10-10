# 安牌シミュレーター当たり率計測 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 天鳳鳳凰卓の牌譜を再生し、アプリの色分けごとの当たり率と、シミュレーターに従って切ったときの1打ごとの振込率をHTMLレポートにする。

**Architecture:** `vue-project/analysis/` に、牌の表記・聴牌判定・tar読み込み・牌譜の再生・集計・レポートを1ファイルずつ置く。
色はアプリの `src/helpers/waits.ts` の `get_tile_statuses` をそのまま import して付ける。`main.ts` が tar から1半荘ずつ読み、再生 → 集計 → HTML の順につなぐ。

**Tech Stack:** TypeScript、vite-node（vitestに同梱）、vitest、Node 23 標準の `zlib.zstdDecompressSync`。

**Spec:** `vue-project/analysis/README.md`

## Global Constraints

- 新しいnpmパッケージは追加しない。
- Node は v23.9 以上（`zlib.zstdDecompressSync` / `zstdCompressSync` を使う）。
- 関数名・変数名は `src/helpers` に合わせて snake_case、型名は PascalCase、コメントは日本語。
- 計測コードは `vue-project/analysis/` に置き、アプリの `src/` には手を入れない。
- レポートの出力先 `analysis/out/` はgitに含めない。牌譜データはリポジトリの外（`~/mahjong-data/`）に置く。
- 牌の番号は34種類: 0〜8 萬子1〜9、9〜17 筒子1〜9、18〜26 索子1〜9、27〜33 東南西北白發中。赤5は5と同じ番号。
- 牌画像のフォルダは 1: 索子、2: 萬子、3: 筒子（`public/images/{フォルダ}/{色}/{番号}.png`）。
- テストは `vue-project` で `npx vitest run <ファイル>` で実行する。
- vite-node に引数を渡すときは `--` が必要（`vite-node analysis/main.ts -- <引数>`）。

## Review Focus

1. 実際のtarには各ファイルの前にPAX拡張ヘッダー（種類 `x`）がある → 中身を飛ばし、そこに `path=` があればそのファイル名を使う。Task 3 でテストする。
2. 宣言牌でロンされたリーチ（`reach` → `dahai` → `hora`、`reach_accepted` なし）→ リーチとして数えず、場面も作らない。Task 4 でテストする。
3. ダブロンでリーチ者のロンが2番目の `hora` → その打牌はロンされたと記録する。ほかの人だけのロンは記録しない。Task 4 でテストする。
4. 牌譜と手牌が食い違う半荘 → その半荘だけ飛ばして数え、計測は続ける。Task 4（エラーを投げる）と Task 7（受け止めて数える）。
5. 母数が0の行（データが少ないときの無地など）→ 当たり率は「-」と表示し、`NaN` を出さない。切る順番では最後に回す。Task 5・Task 6 でテストする。

---

### Task 1: 牌の表記（tiles.ts）

**Files:**
- Create: `vue-project/analysis/tiles.ts`
- Test: `vue-project/analysis/tiles.test.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  - `tile_id(pai: string): number` — mjaiの表記（`5m`・`5mr`・`E` など）を34種類の番号にする。読めなければ例外
  - `is_honor(tile: number): boolean`
  - `suit_of(tile: number): number` — 0: 萬子、1: 筒子、2: 索子（数牌のみ）
  - `number_of(tile: number): number` — 1〜9（数牌のみ）
  - `tile_label(tile: number): string` — `5萬`・`1筒`・`9索`・`東`

- [ ] **Step 1: 作業ブランチを作り、仕様書と計画をコミットする**

`vue-project/.gitignore` の末尾に足す（レポートと、確認用の使い捨てスクリプトの置き場所）:

```
# 当たり率計測のレポート
analysis/out/
```

```bash
cd /Users/yoheimiyamoto/Documents/github/yoheimiyamoto/vue-anpai
git checkout -b deal-in-analysis
git add vue-project/analysis/README.md vue-project/analysis/PLAN.md vue-project/.gitignore
git commit -m "Add the spec and plan for measuring tile danger on Tenhou logs"
```

- [ ] **Step 2: 失敗するテストを書く**

`vue-project/analysis/tiles.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { tile_id, is_honor, suit_of, number_of, tile_label } from './tiles'

describe('tile_id', () => {
  it('数牌は種類と番号から決まる', () => {
    expect(tile_id('1m')).toBe(0)
    expect(tile_id('9m')).toBe(8)
    expect(tile_id('1p')).toBe(9)
    expect(tile_id('9s')).toBe(26)
  })

  it('赤5は5と同じ', () => {
    expect(tile_id('5mr')).toBe(tile_id('5m'))
    expect(tile_id('5pr')).toBe(tile_id('5p'))
    expect(tile_id('5sr')).toBe(tile_id('5s'))
  })

  it('字牌は東南西北白發中の順', () => {
    expect(['E', 'S', 'W', 'N', 'P', 'F', 'C'].map(tile_id)).toEqual([27, 28, 29, 30, 31, 32, 33])
  })

  it('読めない表記はエラー', () => {
    expect(() => tile_id('0m')).toThrow()
    expect(() => tile_id('?')).toThrow()
  })
})

describe('suit_of / number_of / is_honor', () => {
  it('牌の番号から種類と数字を取り出す', () => {
    expect(suit_of(tile_id('7p'))).toBe(1)
    expect(number_of(tile_id('7p'))).toBe(7)
    expect(is_honor(tile_id('7p'))).toBe(false)
    expect(is_honor(tile_id('E'))).toBe(true)
  })
})

describe('tile_label', () => {
  it('数牌は番号と種類、字牌は漢字', () => {
    expect(tile_label(tile_id('5mr'))).toBe('5萬')
    expect(tile_label(tile_id('1p'))).toBe('1筒')
    expect(tile_label(tile_id('9s'))).toBe('9索')
    expect(tile_label(tile_id('F'))).toBe('發')
  })
})
```

- [ ] **Step 3: テストが失敗することを確かめる**

Run: `cd vue-project && npx vitest run analysis/tiles.test.ts`
Expected: FAIL（`./tiles` が見つからない）

- [ ] **Step 4: 実装する**

`vue-project/analysis/tiles.ts`:

```ts
// 牌の番号（34種類）
// 0〜8: 萬子1〜9、9〜17: 筒子1〜9、18〜26: 索子1〜9、27〜33: 東南西北白發中
// mjaiの表記: 萬子 1m〜9m、筒子 1p〜9p、索子 1s〜9s、赤5 は 5mr・5pr・5sr、字牌 E S W N P F C

const HONORS = ['E', 'S', 'W', 'N', 'P', 'F', 'C']
const HONOR_LABELS = ['東', '南', '西', '北', '白', '發', '中']
const SUITS = ['m', 'p', 's']
const SUIT_LABELS = ['萬', '筒', '索']

// mjaiの表記を牌の番号にする（赤5は5と同じ番号）
export function tile_id(pai: string): number {
  const honor = HONORS.indexOf(pai)
  if (honor >= 0) {
    return 27 + honor
  }

  const match = /^([1-9])([mps])r?$/.exec(pai)
  if (!match) {
    throw new Error(`牌の表記が読めません: ${pai}`)
  }
  return SUITS.indexOf(match[2]) * 9 + Number(match[1]) - 1
}

export function is_honor(tile: number): boolean {
  return tile >= 27
}

// 数牌の種類（0: 萬子、1: 筒子、2: 索子）
export function suit_of(tile: number): number {
  return Math.floor(tile / 9)
}

// 数牌の数字（1〜9）
export function number_of(tile: number): number {
  return tile % 9 + 1
}

// 画面に出す名前（5萬・東 など）
export function tile_label(tile: number): string {
  return is_honor(tile) ? HONOR_LABELS[tile - 27] : `${number_of(tile)}${SUIT_LABELS[suit_of(tile)]}`
}
```

- [ ] **Step 5: テストが通ることを確かめる**

Run: `cd vue-project && npx vitest run analysis/tiles.test.ts`
Expected: PASS（4 describe・5 tests）

- [ ] **Step 6: コミット**

```bash
git add vue-project/analysis/tiles.ts vue-project/analysis/tiles.test.ts
git commit -m "Read mjai tile notation for the deal-in analysis"
```

---

### Task 2: 待ち牌の計算（tenpai.ts）

**Files:**
- Create: `vue-project/analysis/tenpai.ts`
- Test: `vue-project/analysis/tenpai.test.ts`

**Interfaces:**
- Consumes: `is_honor(tile)`（Task 1）
- Produces:
  - `is_complete(counts: number[]): boolean` — 34種類ごとの枚数（鳴いていない部分、合計 3k+2 枚）が和了形か
  - `get_wait_tiles(hand: number[]): number[]` — 手牌（鳴いていない部分、3k+1 枚）の待ち牌を番号の小さい順に。自分で4枚使っている牌は含めない。聴牌していなければ空配列

- [ ] **Step 1: 失敗するテストを書く**

`vue-project/analysis/tenpai.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { get_wait_tiles } from './tenpai'
import { tile_id } from './tiles'

const tiles = (s: string) => s.split(' ').map(tile_id)

describe('get_wait_tiles', () => {
  it('両面', () => {
    expect(get_wait_tiles(tiles('1m 2m 3m 4m 5m 6m 7m 8m 9m 2p 3p 5s 5s'))).toEqual(tiles('1p 4p'))
  })

  it('嵌張', () => {
    expect(get_wait_tiles(tiles('1m 2m 3m 4m 5m 6m 7m 8m 9m 2p 4p 5s 5s'))).toEqual(tiles('3p'))
  })

  it('辺張', () => {
    expect(get_wait_tiles(tiles('1m 2m 3m 4m 5m 6m 7m 8m 9m 1p 2p 5s 5s'))).toEqual(tiles('3p'))
  })

  it('単騎', () => {
    expect(get_wait_tiles(tiles('1m 2m 3m 4m 5m 6m 7m 8m 9m 1p 2p 3p E'))).toEqual(tiles('E'))
  })

  it('シャンポン', () => {
    expect(get_wait_tiles(tiles('1m 2m 3m 4m 5m 6m 7m 8m 9m 5s 5s E E'))).toEqual(tiles('5s E'))
  })

  it('三面張', () => {
    expect(get_wait_tiles(tiles('2m 3m 4m 5m 6m 1p 2p 3p 7p 8p 9p E E'))).toEqual(tiles('1m 4m 7m'))
  })

  it('九蓮宝燈は9面待ち', () => {
    expect(get_wait_tiles(tiles('1m 1m 1m 2m 3m 4m 5m 6m 7m 8m 9m 9m 9m'))).toEqual(tiles('1m 2m 3m 4m 5m 6m 7m 8m 9m'))
  })

  it('七対子', () => {
    expect(get_wait_tiles(tiles('1m 1m 3m 3m 5p 5p 7p 7p 9s 9s E E C'))).toEqual(tiles('C'))
  })

  it('同じ牌4枚は七対子の2組にならない', () => {
    expect(get_wait_tiles(tiles('1m 1m 1m 1m 3m 3m 5p 5p 7p 7p 9s 9s C'))).toEqual([])
  })

  it('国士無双13面待ち', () => {
    expect(get_wait_tiles(tiles('1m 9m 1p 9p 1s 9s E S W N P F C'))).toEqual(tiles('1m 9m 1p 9p 1s 9s E S W N P F C'))
  })

  it('国士無双の単騎', () => {
    expect(get_wait_tiles(tiles('1m 1m 9m 1p 9p 1s 9s E S W N P F'))).toEqual(tiles('C'))
  })

  it('暗槓の後（鳴いていない部分が10枚）', () => {
    expect(get_wait_tiles(tiles('2m 3m 4m 5p 6p 7p 5s 5s E E'))).toEqual(tiles('5s E'))
  })

  it('自分で4枚使っている牌は待ちにならない', () => {
    expect(get_wait_tiles(tiles('1m 1m 1m 1m 2m 3m 4m 5m 6m 7m 8m 9m E'))).toEqual(tiles('E'))
  })

  it('聴牌していなければ空', () => {
    expect(get_wait_tiles(tiles('1m 4m 7m 1p 4p 7p 1s 4s 7s E S W N'))).toEqual([])
  })
})
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `cd vue-project && npx vitest run analysis/tenpai.test.ts`
Expected: FAIL（`./tenpai` が見つからない）

- [ ] **Step 3: 実装する**

`vue-project/analysis/tenpai.ts`:

```ts
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
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `cd vue-project && npx vitest run analysis/tenpai.test.ts`
Expected: PASS（14 tests）

- [ ] **Step 5: コミット**

```bash
git add vue-project/analysis/tenpai.ts vue-project/analysis/tenpai.test.ts
git commit -m "Compute a hand's waits for the deal-in analysis"
```

---

### Task 3: tarの読み込み（tar.ts）

**Files:**
- Create: `vue-project/analysis/tar.ts`
- Test: `vue-project/analysis/tar.test.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  - `type GameLog = { id: string, text: string }` — `id` は天鳳の牌譜ID（ファイル名から `.mjai.json.zst` を除いたもの）、`text` は解凍したmjai（1行1イベント）
  - `read_game_logs(path: string): Generator<GameLog>` — tarを先頭から読み、`*.mjai.json.zst` だけを順に返す。途中で切れていれば読めたところまで

実際のtar（`tenhou-houou-2025.tar`）は、各ファイルの前に種類 `x` のPAX拡張ヘッダーがあり、magicは `ustar\0`。

- [ ] **Step 1: 失敗するテストを書く**

`vue-project/analysis/tar.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { zstdCompressSync } from 'node:zlib'
import { read_game_logs } from './tar'

// テスト用の最小限のtar（名前・サイズ・種類・magicだけ書く。チェックサムは読む側で使わないので省く）
function make_tar(entries: { name: string, body: Buffer, type?: string }[]): Buffer {
  const blocks: Buffer[] = []
  for (const entry of entries) {
    const header = Buffer.alloc(512)
    header.write(entry.name, 0, 'utf8')
    header.write(entry.body.length.toString(8).padStart(11, '0') + '\0', 124, 'ascii')
    header.write(entry.type ?? '0', 156, 'ascii')
    header.write('ustar\u000000', 257, 'ascii')
    blocks.push(header, entry.body, Buffer.alloc((512 - entry.body.length % 512) % 512))
  }
  blocks.push(Buffer.alloc(1024))
  return Buffer.concat(blocks)
}

function write_tar(tar: Buffer): string {
  const path = join(mkdtempSync(join(tmpdir(), 'tar-test-')), 'test.tar')
  writeFileSync(path, tar)
  return path
}

const compressed = (text: string) => zstdCompressSync(Buffer.from(text))

// PAX拡張ヘッダーの1行（「長さ キー=値\n」。長さは行全体のバイト数）
function pax_record(key: string, value: string): string {
  const body = ` ${key}=${value}\n`
  let length = body.length + 1
  while (String(length).length + body.length != length) {
    length++
  }
  return `${length}${body}`
}

describe('read_game_logs', () => {
  it('牌譜IDと解凍したテキストを順に返し、ディレクトリやほかのファイルは飛ばす', () => {
    const path = write_tar(make_tar([
      { name: 'tenhou-houou-2025/', body: Buffer.alloc(0), type: '5' },
      { name: 'tenhou-houou-2025/2025010100gm-00a9-0000-aaaaaaaa.mjai.json.zst', body: compressed('{"type":"start_game"}\n') },
      { name: 'tenhou-houou-2025/readme.txt', body: Buffer.from('hello') },
      { name: 'tenhou-houou-2025/2025010100gm-00a9-0000-bbbbbbbb.mjai.json.zst', body: compressed('{"type":"end_game"}\n') },
    ]))
    expect([...read_game_logs(path)]).toEqual([
      { id: '2025010100gm-00a9-0000-aaaaaaaa', text: '{"type":"start_game"}\n' },
      { id: '2025010100gm-00a9-0000-bbbbbbbb', text: '{"type":"end_game"}\n' },
    ])
  })

  it('PAX拡張ヘッダーを飛ばし、そこに書かれたファイル名を使う', () => {
    const pax = Buffer.from(pax_record('mtime', '0') + pax_record('path', 'long/2025010100gm-00a9-0000-cccccccc.mjai.json.zst'))
    const path = write_tar(make_tar([
      { name: './PaxHeaders/x', body: pax, type: 'x' },
      { name: 'short-name', body: compressed('{"type":"start_game"}\n') },
    ]))
    expect([...read_game_logs(path)].map(log => log.id)).toEqual(['2025010100gm-00a9-0000-cccccccc'])
  })

  it('途中で切れたtarは、読めたところまで返す', () => {
    const tar = make_tar([
      { name: 'a/2025010100gm-00a9-0000-aaaaaaaa.mjai.json.zst', body: compressed('{"type":"start_game"}\n') },
      { name: 'a/2025010100gm-00a9-0000-bbbbbbbb.mjai.json.zst', body: compressed('{"type":"end_game"}\n') },
    ])
    // 2つ目のファイルのヘッダーの後、本体の1バイト目で切る
    const path = write_tar(tar.subarray(0, 512 * 3 + 1))
    expect([...read_game_logs(path)].map(log => log.id)).toEqual(['2025010100gm-00a9-0000-aaaaaaaa'])
  })
})
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `cd vue-project && npx vitest run analysis/tar.test.ts`
Expected: FAIL（`./tar` が見つからない）

- [ ] **Step 3: 実装する**

`vue-project/analysis/tar.ts`:

```ts
import { openSync, readSync, closeSync } from 'node:fs'
import { zstdDecompressSync } from 'node:zlib'

// tarの中の1半荘分の牌譜
export type GameLog = {
  id: string    // 天鳳の牌譜ID（ファイル名から .mjai.json.zst を除いたもの）
  text: string  // mjaiのイベントを1行1つ並べたJSON
}

const BLOCK = 512

// header の start から length バイトを、NUL の手前までの文字列として読む
function read_string(header: Buffer, start: number, length: number): string {
  const s = header.toString('utf8', start, start + length)
  const end = s.indexOf('\0')
  return end < 0 ? s : s.slice(0, end)
}

// tarファイルを先頭から読み、*.mjai.json.zst を1つずつ解凍して返す
// ファイルが途中で切れていたら、読めたところまでで終わる
export function* read_game_logs(path: string): Generator<GameLog> {
  const fd = openSync(path, 'r')
  const header = Buffer.alloc(BLOCK)
  let position = 0
  let pax_path = ''  // 直前のPAX拡張ヘッダーに書かれていたファイル名

  try {
    while (readSync(fd, header, 0, BLOCK, position) == BLOCK) {
      const name = read_string(header, 0, 100)
      if (!name) {
        return  // 末尾の空ブロック
      }
      const size = parseInt(read_string(header, 124, 12).trim() || '0', 8)
      const type = String.fromCharCode(header[156])
      position += BLOCK

      const body = Buffer.alloc(size)
      if (readSync(fd, body, 0, size, position) < size) {
        return
      }
      position += Math.ceil(size / BLOCK) * BLOCK

      // PAX拡張ヘッダーは次のファイルの情報なので、ファイル名だけ覚えて次へ
      if (type == 'x') {
        pax_path = /(?:^|\n)\d+ path=([^\n]*)\n/.exec(body.toString('utf8'))?.[1] ?? ''
        continue
      }

      // POSIXのtarは、長いファイル名の前半を prefix に分けて入れる
      const prefix = header.toString('latin1', 257, 263) == 'ustar\0' ? read_string(header, 345, 155) : ''
      const file_path = pax_path || (prefix ? `${prefix}/${name}` : name)
      pax_path = ''

      if ((type == '0' || type == '\0') && file_path.endsWith('.mjai.json.zst')) {
        const id = file_path.split('/').pop()!.replace(/\.mjai\.json\.zst$/, '')
        yield { id, text: zstdDecompressSync(body).toString('utf8') }
      }
    }
  } finally {
    closeSync(fd)
  }
}
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `cd vue-project && npx vitest run analysis/tar.test.ts`
Expected: PASS（3 tests）

- [ ] **Step 5: 本物のtarの先頭で確かめる**

HFから先頭3MBだけ取り、読めることを確かめる（途中で切れたtarとして扱われ、読めたところまでが返る）。

```bash
mkdir -p ~/mahjong-data
curl -sL -r 0-3000000 "https://huggingface.co/datasets/nikketryhard/tenhou-houou-mjai/resolve/main/tenhou-houou-2025.tar" -o ~/mahjong-data/head-2025.tar
cd vue-project && mkdir -p analysis/out && cat > analysis/out/read-head.ts <<'EOF'
import { read_game_logs } from '../tar'
const logs = [...read_game_logs(process.argv[2])]
console.log(logs.length, logs[0].id, logs[0].text.split('\n')[0].slice(0, 60))
EOF
npx vite-node analysis/out/read-head.ts -- ~/mahjong-data/head-2025.tar
```

Expected: `420 2025010100gm-00a9-0000-029e0f35 {"type":"start_game","names":[...` のように、400前後の半荘数・牌譜ID・`start_game` の行が出る。

- [ ] **Step 6: コミット**

```bash
git add vue-project/analysis/tar.ts vue-project/analysis/tar.test.ts
git commit -m "Stream Tenhou logs out of the mjai tar shards"
```

---

### Task 4: 牌譜の再生（replay.ts）

**Files:**
- Create: `vue-project/analysis/replay.ts`
- Test: `vue-project/analysis/replay.test.ts`

**Interfaces:**
- Consumes: `tile_id(pai)`（Task 1）、`get_wait_tiles(hand)`（Task 2）
- Produces:
  - `type Riichi = { seat: number, discards: number[], riichi_index: number, hand: number[], waits: number[], furiten: boolean }`
  - `type Scene = { game_id: string, kyoku_index: number, kyoku_label: string, seat: number, junme: number, hand: number[], discarded: number, ronned: boolean, riichi: Riichi }`
  - `type GameResult = { kyokus: number, riichis: number, riichis_without_waits: number, scenes: Scene[] }`
  - `replay_game(game_id: string, events: MjaiEvent[]): GameResult` — 牌譜と手牌が食い違えば例外

mjaiの形式で注意すること（実データで確認済み）:
- `hora` には当たり牌が書かれていない。ロンの牌は直前の `dahai`。ダブロンは `hora` が続く。
- リーチは `reach` → `dahai`（宣言牌）→ `reach_accepted`。宣言牌でロンされると `reach_accepted` は来ない。
- `kakan` の `pai` が手牌から出る1枚、`consumed` はポンしていた3枚（手牌にはない）。

- [ ] **Step 1: 失敗するテストを書く**

`vue-project/analysis/replay.test.ts`:

```ts
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
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `cd vue-project && npx vitest run analysis/replay.test.ts`
Expected: FAIL（`./replay` が見つからない）

- [ ] **Step 3: 実装する**

`vue-project/analysis/replay.ts`:

```ts
import { tile_id } from './tiles'
import { get_wait_tiles } from './tenpai'

// mjaiのイベント（使う項目だけ）
export type MjaiEvent = {
  type: string
  actor?: number
  target?: number
  pai?: string
  consumed?: string[]
  tehais?: string[][]
  bakaze?: string
  kyoku?: number
  honba?: number
}

// 場面の時点のリーチ者
export type Riichi = {
  seat: number
  discards: number[]    // 捨て牌（鳴かれた牌も含む。切った順）
  riichi_index: number  // discards の中のリーチ宣言牌の位置
  hand: number[]        // 手牌（鳴いていない部分。リーチ成立時か暗槓の後）
  waits: number[]       // 待ち牌
  furiten: boolean
}

// 対象の場面（リーチ者が1人だけいるときに、ほかの人が牌を切る直前）
export type Scene = {
  game_id: string
  kyoku_index: number   // 半荘の中で何局目か（0から）
  kyoku_label: string   // 東1局、南2局 1本場 など
  seat: number          // 切る人の席
  junme: number         // 切る人の何巡目の打牌か（1から）
  hand: number[]        // 切る人の手牌（切る直前、鳴いていない部分）
  discarded: number     // 実際に切った牌
  ronned: boolean       // その牌でリーチ者がロンしたか
  riichi: Riichi
}

export type GameResult = {
  kyokus: number
  riichis: number                // 成立したリーチの数
  riichis_without_waits: number  // 待ちが計算できなかったリーチの数
  scenes: Scene[]
}

const WINDS: { [bakaze: string]: string } = { E: '東', S: '南', W: '西', N: '北' }

// 手牌から1枚取り除く（なければ牌譜と食い違っているのでエラー）
function remove_tile(hand: number[], tile: number) {
  const i = hand.indexOf(tile)
  if (i < 0) {
    throw new Error(`手牌にない牌を取り除こうとしました: ${tile}`)
  }
  hand.splice(i, 1)
}

// 1半荘のイベントを再生して、対象の場面を取り出す
export function replay_game(game_id: string, events: MjaiEvent[]): GameResult {
  const result: GameResult = { kyokus: 0, riichis: 0, riichis_without_waits: 0, scenes: [] }
  let hands: number[][] = []
  let discards: number[][] = []
  let riichi_indexes: number[] = []  // リーチを宣言した人の、宣言牌の位置
  let riichis: Riichi[] = []         // この局で成立したリーチ（Riichi.discards は discards[seat] と同じ配列）
  let kyoku_label = ''

  events.forEach((event, i) => {
    const actor = event.actor!

    switch (event.type) {
      case 'start_kyoku':
        result.kyokus++
        hands = event.tehais!.map(tehai => tehai.map(tile_id))
        discards = [[], [], [], []]
        riichi_indexes = [-1, -1, -1, -1]
        riichis = []
        kyoku_label = `${WINDS[event.bakaze!]}${event.kyoku}局` + (event.honba ? ` ${event.honba}本場` : '')
        break

      case 'tsumo':
        hands[actor].push(tile_id(event.pai!))
        break

      case 'dahai': {
        const tile = tile_id(event.pai!)
        const riichi = riichis.length == 1 && riichis[0].seat != actor ? riichis[0] : null

        if (riichi) {
          // 直後のロン（ダブロンなら複数）の中に、リーチ者のロンがあるか
          let ronned = false
          for (let j = i + 1; j < events.length && events[j].type == 'hora'; j++) {
            if (events[j].actor == riichi.seat && events[j].target == actor) {
              ronned = true
            }
          }

          result.scenes.push({
            game_id,
            kyoku_index: result.kyokus - 1,
            kyoku_label,
            seat: actor,
            junme: discards[actor].length + 1,
            hand: [...hands[actor]],
            discarded: tile,
            ronned,
            // 捨て牌はこの後も増えるので写しを取る（hand・waits は暗槓のときに新しい配列に置き換える）
            riichi: { ...riichi, discards: [...riichi.discards] },
          })

          // リーチ後に待ち牌を見逃したら、ずっとフリテン
          if (!ronned && riichi.waits.includes(tile)) {
            riichi.furiten = true
          }
        }

        remove_tile(hands[actor], tile)
        discards[actor].push(tile)

        // リーチ者が自分で待ち牌を捨てたらフリテン
        riichis.forEach(r => {
          if (r.seat == actor && r.waits.includes(tile)) {
            r.furiten = true
          }
        })
        break
      }

      case 'chi':
      case 'pon':
      case 'daiminkan':
        event.consumed!.forEach(pai => remove_tile(hands[actor], tile_id(pai)))
        break

      case 'kakan':
        remove_tile(hands[actor], tile_id(event.pai!))
        break

      case 'ankan':
        event.consumed!.forEach(pai => remove_tile(hands[actor], tile_id(pai)))
        // リーチ後の暗槓は待ちを変えないはずだが、鳴いていない部分が変わるので計算し直す
        riichis.forEach(r => {
          if (r.seat == actor) {
            r.hand = [...hands[actor]]
            r.waits = get_wait_tiles(r.hand)
          }
        })
        break

      case 'reach':
        riichi_indexes[actor] = discards[actor].length
        break

      case 'reach_accepted': {
        const hand = [...hands[actor]]
        const waits = get_wait_tiles(hand)
        result.riichis++
        if (!waits.length) {
          result.riichis_without_waits++
        }
        riichis.push({
          seat: actor,
          discards: discards[actor],
          riichi_index: riichi_indexes[actor],
          hand,
          waits,
          furiten: discards[actor].some(t => waits.includes(t)),
        })
        break
      }
    }
  })

  return result
}
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `cd vue-project && npx vitest run analysis/replay.test.ts`
Expected: PASS（12 tests）

- [ ] **Step 5: 本物の牌譜で確かめる**

先頭3MBの牌譜（Task 3 Step 5 で取得）をすべて再生し、例外が出ないこと、待ちのないリーチが0であることを確かめる。

```bash
cd vue-project && cat > analysis/out/replay-head.ts <<'EOF'
import { read_game_logs } from '../tar'
import { replay_game } from '../replay'
let games = 0, scenes = 0, riichis = 0, without_waits = 0, errors = 0
for (const log of read_game_logs(process.argv[2])) {
  try {
    const result = replay_game(log.id, log.text.trim().split('\n').map(line => JSON.parse(line)))
    games++; scenes += result.scenes.length; riichis += result.riichis; without_waits += result.riichis_without_waits
  } catch (e) { errors++; console.error(log.id, (e as Error).message) }
}
console.log({ games, scenes, riichis, without_waits, errors })
EOF
npx vite-node analysis/out/replay-head.ts -- ~/mahjong-data/head-2025.tar
```

Expected: `errors: 0`、`without_waits: 0`、`riichis` は3000前後、`scenes` は数万。

- [ ] **Step 6: コミット**

```bash
git add vue-project/analysis/replay.ts vue-project/analysis/replay.test.ts
git commit -m "Replay Tenhou games to find discards made against a single riichi"
```

---

### Task 5: 集計（tally.ts）

**Files:**
- Create: `vue-project/analysis/tally.ts`
- Test: `vue-project/analysis/tally.test.ts`

**Interfaces:**
- Consumes: `get_tile_statuses(discards: number[]): { [n: number]: TileStatus }`・`type TileStatus`（`src/helpers/waits.ts`）、`is_honor`・`suit_of`・`number_of`（Task 1）、`type Scene`（Task 4）
- Produces:
  - `ROWS = ['現物', '濃い青', '薄い青', '薄い赤', '濃い赤', '無地', '字牌'] as const`、`type Row`
  - `classify(riichi_discards: number[]): Row[]` — 34種類の牌それぞれの行
  - `is_hit(scene: Scene, tile: number): boolean`
  - `type Candidate = { tile: number, row: Row, hit: boolean }`
  - `get_candidates(scene: Scene): Candidate[]` — 切る人の手にある牌の種類（番号の小さい順）
  - `choose(candidates: Candidate[], order: Row[]): Candidate[]` — order の中で手にある最初の行の牌すべて
  - `seeded_random(seed: number): () => number`、`class Reservoir<T> { items: T[]; offer(item: T): void }`
  - `type RowStat = { row: Row, n: number, hits: number }`
  - `type StrategyStat = { order: Row[], decisions: number, deal_ins: number, by_row: { row: Row, decisions: number, deal_ins: number }[] }`
  - `class Tally`: `add(scene)`、`scenes`、`ron_mismatches`、`missed_rons`、`row_stats(): RowStat[]`、`order(): Row[]`、`strategy(): StrategyStat`、`row_examples: Reservoir<Scene>[]`（ROWS と同じ順）、`strategy_examples(count: number): Scene[]`

- [ ] **Step 1: 失敗するテストを書く**

`vue-project/analysis/tally.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { classify, is_hit, get_candidates, choose, Tally, Reservoir, seeded_random, ROWS } from './tally'
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

describe('choose', () => {
  it('順番の中で、手にある最初の行の牌をすべて返す', () => {
    const candidates = get_candidates(make_scene({ hand: '2m 8m 5m', riichi_discards: '4m', waits: '2m' }))
    expect(choose(candidates, ['現物', '濃い青', '薄い赤', '濃い赤']).map(c => c.tile)).toEqual(tiles('2m 8m'))
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
    expect(tally.strategy_examples(3).map(s => s.hand)).toEqual([tiles('2m 3m 8m')])
  })

  it('行ごとに、その行の牌が当たりだった場面を残す', () => {
    const tally = new Tally()
    const scene = make_scene({ hand: '1m 5m 8m 9m E', riichi_discards: '4m', waits: '5m 8m' })
    tally.add(scene)
    expect(tally.row_examples[ROWS.indexOf('濃い赤')].items).toEqual([scene])
    expect(tally.row_examples[ROWS.indexOf('濃い青')].items).toEqual([])
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

describe('Reservoir', () => {
  it('同じシードなら同じものを選び、size 件を超えない', () => {
    const pick = () => {
      const reservoir = new Reservoir<number>(3, seeded_random(1))
      for (let i = 0; i < 100; i++) {
        reservoir.offer(i)
      }
      return reservoir.items
    }
    expect(pick()).toHaveLength(3)
    expect(pick()).toEqual(pick())
  })
})
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `cd vue-project && npx vitest run analysis/tally.test.ts`
Expected: FAIL（`./tally` が見つからない）

- [ ] **Step 3: 実装する**

`vue-project/analysis/tally.ts`:

```ts
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

// シミュレーターに従って切る牌: order の順で、手にある最初の行の牌（どれを切るかは決まらないので全部）
export function choose(candidates: Candidate[], order: readonly Row[]): Candidate[] {
  for (const row of order) {
    const chosen = candidates.filter(c => c.row == row)
    if (chosen.length) {
      return chosen
    }
  }
  return []
}

// 固定のシードから毎回同じ並びの乱数を出す（mulberry32）
export function seeded_random(seed: number): () => number {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 全部で何件あるかわからない並びから、size 件を等しい確率で選ぶ（リザーバーサンプリング）
export class Reservoir<T> {
  items: T[] = []
  private seen = 0

  constructor(private size: number, private random: () => number) {}

  offer(item: T) {
    this.seen++
    if (this.items.length < this.size) {
      this.items.push(item)
    } else {
      const j = Math.floor(this.random() * this.seen)
      if (j < this.size) {
        this.items[j] = item
      }
    }
  }
}

export type RowStat = { row: Row, n: number, hits: number }

export type StrategyStat = {
  order: Row[]       // 切る順番（当たり率の低い順）
  decisions: number  // 場面の数
  deal_ins: number   // 振り込みの数（同じ行に複数あるときは平均なので小数になる）
  by_row: { row: Row, decisions: number, deal_ins: number }[]  // 切ることになった行ごと（order の順）
}

const EXAMPLES_PER_ROW = 3
const HIT_POOL_SIZE = 2000

export class Tally {
  scenes = 0
  ron_mismatches = 0  // 牌譜ではリーチ者がロンしたのに、判定が当たりでなかった打牌
  missed_rons = 0     // 判定は当たりなのに、牌譜ではロンされなかった打牌

  private n = ROWS.map(() => 0)
  private hits = ROWS.map(() => 0)
  // 場面の形（行ごとの「手にある種類数」と「そのうち当たりの数」）ごとの場面の数
  // シミュレーターに従ったときの振込率は形だけで決まるので、切る順番が決まってからここで計算する
  private shapes = new Map<string, number>()
  private random = seeded_random(20251010)

  // 行ごとの、その行の牌が当たりだった場面（ROWS と同じ順）
  row_examples = ROWS.map(() => new Reservoir<Scene>(EXAMPLES_PER_ROW, this.random))
  // 当たりの牌が手にあった場面。シミュレーター通りに切ると振り込む実例は、集計後にここから選ぶ
  private hit_pool = new Reservoir<Scene>(HIT_POOL_SIZE, this.random)

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
      if (hits[r]) {
        this.row_examples[r].offer(scene)
      }
    })
    if (hits.some(h => h)) {
      this.hit_pool.offer(scene)
    }

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

  // シミュレーター通りに切ると振り込む場面
  strategy_examples(count: number): Scene[] {
    const order = this.order()
    return this.hit_pool.items
      .filter(scene => choose(get_candidates(scene), order).some(c => c.hit))
      .slice(0, count)
  }
}
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `cd vue-project && npx vitest run analysis/tally.test.ts`
Expected: PASS（10 tests）

- [ ] **Step 5: コミット**

```bash
git add vue-project/analysis/tally.ts vue-project/analysis/tally.test.ts
git commit -m "Tally hit rates by simulator color and the deal-in rate of following it"
```

---

### Task 6: HTMLレポート（report.ts）

**Files:**
- Create: `vue-project/analysis/report.ts`
- Test: `vue-project/analysis/report.test.ts`

**Interfaces:**
- Consumes: `ROWS`・`type Row`・`type RowStat`・`type StrategyStat`・`classify`・`get_candidates`・`choose`・`is_hit`（Task 5）、`type Scene`（Task 4）、`is_honor`・`suit_of`・`number_of`・`tile_label`（Task 1）、`type TileStatus`（`src/helpers/waits.ts`）
- Produces:
  - `type ReportData`（下のコードのとおり）
  - `tile_image_css(images_dir: URL): string` — 牌画像162枚をdata URIで埋め込むCSS（`.tile-{種類}-{数字}-{色}`）
  - `render_report(data: ReportData, image_css: string): string` — 1ファイルで完結するHTML

グラフは1系列の横棒（当たり率）なので凡例は付けない。数値は表の列にテキストで出し、横棒はその隣に描く（表がそのままグラフの表形式になる）。
行の色は、棒ではなく行名の横の牌画像で示す。色はCSSの変数で定義し、ダークモードの値も用意する。

- [ ] **Step 1: 失敗するテストを書く**

`vue-project/analysis/report.test.ts`:

```ts
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
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `cd vue-project && npx vitest run analysis/report.test.ts`
Expected: FAIL（`./report` が見つからない）

- [ ] **Step 3: 実装する**

`vue-project/analysis/report.ts`:

```ts
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
    ['判定は「当たり」なのに、牌譜ではロンされなかった打牌（見逃し）', data.missed_rons, 'ほぼ0のはず'],
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
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `cd vue-project && npx vitest run analysis/report.test.ts`
Expected: PASS（3 tests）

- [ ] **Step 5: コミット**

```bash
git add vue-project/analysis/report.ts vue-project/analysis/report.test.ts
git commit -m "Render the deal-in analysis as a self-contained HTML report"
```

---

### Task 7: 実行コマンドと5000半荘での確認（main.ts）

**Files:**
- Create: `vue-project/analysis/main.ts`
- Modify: `vue-project/package.json`（`scripts` に `analyze` を追加）

**Interfaces:**
- Consumes: `read_game_logs`（Task 3）、`replay_game`（Task 4）、`Tally`・`ROWS`（Task 5）、`render_report`・`tile_image_css`（Task 6）
- Produces: `npm run analyze -- <tarのパス> [--limit 半荘数] [--out レポートのパス]`

- [ ] **Step 1: main.ts を書く**

`vue-project/analysis/main.ts`:

```ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { read_game_logs } from './tar'
import { replay_game } from './replay'
import { Tally, ROWS } from './tally'
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

const strategy = tally.strategy()
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
  strategy,
  row_examples: ROWS.filter(row => row != '現物').map(row => ({ row, scenes: tally.row_examples[ROWS.indexOf(row)].items })),
  strategy_examples: tally.strategy_examples(3),
}, tile_image_css(new URL('../public/images/', import.meta.url)))

mkdirSync(dirname(resolve(out)), { recursive: true })
writeFileSync(out, html)

console.log(`${games} 半荘（読めなかった ${skipped_games}）・リーチ ${riichis}・場面 ${tally.scenes}`)
tally.row_stats().forEach(s => console.log(`${s.row}\t母数 ${s.n}\t当たり ${s.hits}\t${s.n ? (s.hits / s.n * 100).toFixed(1) : '-'}%`))
console.log(`切る順番: ${strategy.order.join(' → ')}`)
console.log(`シミュレーター通りに切ったときの1打ごとの振込率: ${(strategy.deal_ins / strategy.decisions * 100).toFixed(2)}%`)
console.log(`確認: ロンと判定の食い違い ${tally.ron_mismatches}・見逃し ${tally.missed_rons}・待ちのないリーチ ${riichis_without_waits}`)
errors.forEach(e => console.error(e))
console.log(`レポート: ${resolve(out)}`)
```

- [ ] **Step 2: npm script を足す**

`vue-project/package.json` の `scripts` に1行足す（vite-node は `--` の後ろの引数をスクリプトに渡す）:

```json
    "test": "vitest",
    "analyze": "vite-node analysis/main.ts --"
```

- [ ] **Step 3: 先頭3MBで動かす**

Run: `cd vue-project && npm run analyze -- ~/mahjong-data/head-2025.tar`
Expected: 400前後の半荘・`読めなかった 0`・7行の当たり率・`ロンと判定の食い違い 0`・`待ちのないリーチ 0` が出て、`analysis/out/report.html` ができる。
食い違いが0でなければ、`tally.ts` の `add` で `ron_mismatches` を数える場面の `game_id`・`kyoku_label`・`junme` を一時的に出して牌譜を確かめ、`replay.ts` を直してから続ける。

- [ ] **Step 4: 2025年の1年分をダウンロードする**

```bash
huggingface-cli download nikketryhard/tenhou-houou-mjai tenhou-houou-2025.tar --repo-type dataset --local-dir ~/mahjong-data
ls -la ~/mahjong-data/tenhou-houou-2025.tar
```

Expected: 1,279,897,600 バイトのファイル。

- [ ] **Step 5: 5000半荘で動かす**

Run: `cd vue-project && time npm run analyze -- ~/mahjong-data/tenhou-houou-2025.tar --limit 5000`
Expected: `5000 半荘（読めなかった 0）`、`ロンと判定の食い違い 0`、`待ちのないリーチ 0`、見逃しは数件以下。かかった時間から1年分（約20万半荘）の時間を見積もる。

- [ ] **Step 6: レポートを目で確かめる**

`analysis/out/report.html` をブラウザで開き、スクリーンショットで次を確かめる。
- 牌画像が表示され、行名の横の牌がアプリと同じ色になっている。
- 横棒が当たり率の大きさどおりに並び、数字と重なっていない。
- 実例の手牌で、当たり牌に赤い枠が付き、リーチ宣言牌が横向きになっている。
- 幅375pxでも横スクロールが出ない。

実例のリンクを1つ開き、天鳳の牌譜ビューアーが同じ局（局名・巡目）を切る人の視点で開くことを確かめる。
違う局が開いたら、`ts` が何を数えているか確かめて `report.ts` の `link` を直す（`report.test.ts` の期待値も合わせて直す）。

- [ ] **Step 7: 全テストを通してコミット**

Run: `cd vue-project && npx vitest run`
Expected: すべてPASS（既存の15テストと analysis の全テスト）

```bash
git add vue-project/analysis/main.ts vue-project/package.json
git commit -m "Add npm run analyze to build the tile danger report from a Tenhou shard"
```

---

### Task 8: 1年分で計測して結果を渡す

**Files:** なし（レポートは `analysis/out/` に出力し、gitには入れない）

- [ ] **Step 1: 1年分で動かす**

Run: `cd vue-project && time npm run analyze -- ~/mahjong-data/tenhou-houou-2025.tar`
Expected: 約20万半荘を読み、`ロンと判定の食い違い 0`・`待ちのないリーチ 0`。読めなかった半荘があれば、表示されたエラーを確かめる（数件なら割り切りとして報告する）。

- [ ] **Step 2: レポートを開いて確かめる**

Task 7 Step 6 と同じ項目を確かめ、次を読み取って報告する。
- 色ごとの当たり率が、濃い青 < 薄い青 < 薄い赤 < 濃い赤 の順になっているか
- 無地と薄い赤のどちらの当たり率が低いか（無地を先に切るべきか）
- シミュレーター通りに切ったときの1打ごとの振込率と、安全な牌がなく薄い赤・濃い赤を切らされた割合
