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
