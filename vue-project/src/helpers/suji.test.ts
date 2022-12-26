import { describe, it, expect } from 'vitest';
import {get_anpai, get_kiken_hai, get_omote_suji, get_naka_suji, get_ura_suji, get_matagi_suji, frequency_sort} from './suji';

describe('get_anpai', () => {
  it('get_anpai', () => {
    // 表スジ 4 => 1,7
    expect(get_anpai([4])).toEqual([1,7])

    // 中スジ => 4
    expect(get_anpai([1,7])).toEqual([4])
  })
})

describe('get_kiken_hai', () => {
  it('get_kiken_hai', () => {
    // 裏スジ => [2,5]
    // 跨ぎスジ => []
    expect(get_kiken_hai([1])).toEqual([2,5])

    // 裏スジ => [3,6]
    // 跨ぎスジ => [1,4]
    expect(get_kiken_hai([2])).toEqual([1,3,4,6])
  })
})

describe('get_omote_suji', () => {
  it('get_omote_suji', () => {
    expect(get_omote_suji([1])).toEqual(new Set<number>([]))
    expect(get_omote_suji([2])).toEqual(new Set<number>([]))
    expect(get_omote_suji([3])).toEqual(new Set<number>([]))
    expect(get_omote_suji([4])).toEqual(new Set<number>([1,7]))
    expect(get_omote_suji([5])).toEqual(new Set<number>([2,8]))
    expect(get_omote_suji([6])).toEqual(new Set<number>([3,9]))
    expect(get_omote_suji([7])).toEqual(new Set<number>([]))
    expect(get_omote_suji([8])).toEqual(new Set<number>([]))
    expect(get_omote_suji([9])).toEqual(new Set<number>([]))
    expect(get_omote_suji([4,5,6])).toEqual(new Set<number>([1,2,3,7,8,9]))
  })
})

describe('get_naka_suji', () => {
  it('get_naka_suji', () => {
    expect(get_naka_suji([1,2])).toEqual(new Set<number>([]))
    expect(get_naka_suji([1,7])).toEqual(new Set<number>([4]))
    expect(get_naka_suji([2,8])).toEqual(new Set<number>([5]))
    expect(get_naka_suji([3,9])).toEqual(new Set<number>([6]))
    expect(get_naka_suji([1,2,3,7,8,9])).toEqual(new Set<number>([4,5,6]))
  })
})

describe('get_ura_suji', () => {
  it('get_ura_suji', () => {
    expect(get_ura_suji([1])).toEqual(new Set<number>([2,5]))
    expect(get_ura_suji([2])).toEqual(new Set<number>([3,6]))
    expect(get_ura_suji([3])).toEqual(new Set<number>([4,7]))
    expect(get_ura_suji([4])).toEqual(new Set<number>([5,8]))
    expect(get_ura_suji([5])).toEqual(new Set<number>([1,4,6,9]))
    expect(get_ura_suji([6])).toEqual(new Set<number>([2,5]))
    expect(get_ura_suji([7])).toEqual(new Set<number>([3,6]))
    expect(get_ura_suji([8])).toEqual(new Set<number>([4,7]))
    expect(get_ura_suji([9])).toEqual(new Set<number>([5,8]))
    expect(get_ura_suji([1,2])).toEqual(new Set<number>([2,3,5,6]))
  })
})

describe('get_matagi_suji', () => {
  it('get_matagi_suji', () => {
    expect(get_matagi_suji([1])).toEqual(new Set<number>([]))
    expect(get_matagi_suji([2])).toEqual(new Set<number>([1,4]))
    expect(get_matagi_suji([3])).toEqual(new Set<number>([1,2,4,5]))
    expect(get_matagi_suji([4])).toEqual(new Set<number>([2,3,5,6]))
    expect(get_matagi_suji([5])).toEqual(new Set<number>([3,4,6,7]))
    expect(get_matagi_suji([6])).toEqual(new Set<number>([4,5,7,8]))
    expect(get_matagi_suji([7])).toEqual(new Set<number>([5,6,8,9]))
    expect(get_matagi_suji([8])).toEqual(new Set<number>([6,9]))
    expect(get_matagi_suji([9])).toEqual(new Set<number>([]))
    expect(get_matagi_suji([2,3,4])).toEqual(new Set<number>([1,2,3,4,5,6]))
  })
})

describe('frequency_sort', () => {
  it('frequency_sort', () => {
    expect(frequency_sort([1,1,2,3,2,2])).toEqual([2,1,3])
  })
})

