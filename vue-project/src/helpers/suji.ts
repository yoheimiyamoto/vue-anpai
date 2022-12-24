// 安牌の取得
export function get_anpai (numbers: number[]): number[] {
  /*
  Args:
    numbers: List[int] 捨て牌
  Returns:
    List[int] 安牌 
  */

  let safe_numbers: number[] = [] 

  // 表スジ
  const omote_suji = get_omote_suji(numbers)

  // 中スジ
  const naka_suji = get_naka_suji(numbers)

  // スジを結合
  safe_numbers = safe_numbers.concat(...omote_suji, ...naka_suji)

  // 頻出頻度が高い順に並び替え
  return frequency_sort(safe_numbers)
}

// 表スジの取得
export function get_omote_suji(numbers: number[]): Set<number> {
  const safe_numbers = new Set<number>()

  let rules: { [name: number]: number[] } = {
    4: [1,7],
    5: [2,8],
    6: [3,9]
  }

  numbers.forEach(function (p) {
    if (p in rules) {
      rules[p].forEach(safe_number => safe_numbers.add(safe_number))
    }
  })

  return safe_numbers
}

// 中スジの取得
export function get_naka_suji(numbers: number[]): Set<number> {
  const safe_numbers = new Set<number>()
 
  // 1と7が捨てられれていれば、4が安牌
  if (numbers.includes(1) && numbers.includes(7)) {
    safe_numbers.add(4)
  }

  // 2と8が捨てられれていれば、5が安牌
  if (numbers.includes(2) && numbers.includes(8)) {
    safe_numbers.add(5)
  }

  // 3と9が捨てられれていれば、6が安牌
  if (numbers.includes(3) && numbers.includes(9)) {
    safe_numbers.add(6)
  }

  return safe_numbers
}

// 方スジの取得
// 確率が低いので除外

// 危険牌の取得
export function get_kiken_hai (numbers: number[]): number[] {
  let kiken_numbers: number[] = [] 

  numbers = kiken_numbers.concat(...get_ura_suji(numbers))
  
  return numbers
}

// 裏スジの取得
export function get_ura_suji(numbers: number[]): Set<number> {
  const kiken_numbers = new Set<number>()

  let rules: { [name: number]: number[] } = {
    1: [2,5],
    2: [3,6],
    3: [4,7],
    4: [5,8],
    5: [1,4,6,9],
    6: [2,5],
    7: [3,6],
    8: [4,7],
    9: [5,8]
  }

  numbers.forEach(function (p) {
    if (p in rules) {
      rules[p].forEach(safe_number => kiken_numbers.add(safe_number))
    }
  })

  return kiken_numbers
}

/* ToDo: 実装が汚いので後できれいにする */
export function frequency_sort(numbers: number[]): number[] {
  /*
  出現頻度が多い順に並び替える
  */
  var count_dict: { [key: number]: number } = {}

  for (var i = 0; i < numbers.length; i++) {
    const elm: number = numbers[i]
    count_dict[elm] = (count_dict[elm] || 0) + 1;
  }

  /*
  Dictionalyをkeyとvalueのリストに変換している
  {1:3, 4,5} => [{key:1, value:3}, {key:4, value:5}]
  ToDo: わかりにくいので後で修正する
  */
  let count_array = Object.keys(count_dict).map((e: any)=>({ key: e, value: count_dict[e] }))

  count_array = count_array.sort(function(a,b){
    if(a.value < b.value) return 1
    if(a.value > b.value) return -1
    return 0
  })

  return count_array.map(element => Number(element.key))
}
