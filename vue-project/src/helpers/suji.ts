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
