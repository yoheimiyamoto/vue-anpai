import { openSync, readSync, closeSync } from 'node:fs'
import { zstdDecompressSync } from 'node:zlib'

// tarの中の1半荘分の牌譜
export type GameLog = {
  id: string      // 天鳳の牌譜ID（ファイル名から .mjai.json.zst を除いたもの）
  text: string    // mjaiのイベントを1行1つ並べたJSON
  error?: string  // 解凍できなかったときの理由（text は空）
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
        // 壊れたファイルがあっても止めずに、読めなかったことを呼び出し側に伝えて次へ進む
        let text = ''
        try {
          text = zstdDecompressSync(body).toString('utf8')
        } catch (e) {
          yield { id, text, error: (e as Error).message }
          continue
        }
        yield { id, text }
      }
    }
  } finally {
    closeSync(fd)
  }
}
