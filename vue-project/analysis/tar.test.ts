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

  it('解凍できないファイルは error を付けて返し、続きを読む', () => {
    const path = write_tar(make_tar([
      { name: 'a/2025010100gm-00a9-0000-aaaaaaaa.mjai.json.zst', body: Buffer.from('not zstd') },
      { name: 'a/2025010100gm-00a9-0000-bbbbbbbb.mjai.json.zst', body: compressed('{"type":"end_game"}\n') },
    ]))
    const logs = [...read_game_logs(path)]
    expect(logs[0].id).toBe('2025010100gm-00a9-0000-aaaaaaaa')
    expect(logs[0].error).toBeTruthy()
    expect(logs[1]).toEqual({ id: '2025010100gm-00a9-0000-bbbbbbbb', text: '{"type":"end_game"}\n' })
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
