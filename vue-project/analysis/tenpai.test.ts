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
