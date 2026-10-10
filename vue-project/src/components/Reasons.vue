<script lang="ts">
import {get_reasons} from '../helpers/reasons'

// tile_type（画像フォルダ images/{tile_type}）ごとの牌の種類
const suit_names: { [tile_type: number]: string } = {
  1: '索子',
  2: '萬子',
  3: '筒子',
}

export default {
  props: {
    // tile_typeごとの選択（捨て牌）中の牌の番号
    selected_numbers: {
      type: Object,
      required: true
    }
  },

  computed: {
    suits() {
      return Object.keys(this.selected_numbers)
        .map(Number)
        .filter(tile_type => this.selected_numbers[tile_type].length)
        .map(tile_type => ({
          tile_type,
          name: suit_names[tile_type],
          discards: [...this.selected_numbers[tile_type]].sort((a: number, b: number) => a - b),
          reasons: get_reasons(this.selected_numbers[tile_type]),
        }))
    }
  }
}
</script>

<template>
  <div class="reasons">
    <p class="text-muted text-center" v-if="!suits.length">捨て牌をタップすると、ここに判定理由が表示されます</p>
    <section v-for="suit in suits" :key="suit.tile_type">
      <h2 class="h6 fw-bold">{{ suit.name }}（捨て牌: {{ suit.discards.join('・') }}）</h2>
      <p class="text-muted" v-if="!suit.reasons.length">スジ・危険牌なし</p>
      <ul>
        <li v-for="reason in suit.reasons" :key="reason.title">
          <span class="numbers" :class="reason.status">{{ reason.numbers.join('・') }}</span>
          <span class="fw-bold">{{ reason.title }}</span>
          <p class="detail text-muted">{{ reason.detail }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>

/* 牌の行（最大 50px×9枚 + 間隔4px×8 = 482px）と左右の端をそろえる */
.reasons {
  max-width: calc(482px + 24px);
  margin: 24px auto 0;
  padding: 0 12px;
  font-size: 14px;
  /* 日本語フォントを明示して、初回表示時のフォント探索で最初のタップが遅れないようにする */
  font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", Meiryo, sans-serif;
}
section + section {
  margin-top: 16px;
}
h2 {
  margin-bottom: 4px;
}
ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
li + li {
  margin-top: 8px;
}

/* 牌画像と同じ色で、どの牌の理由かを示す */
.numbers {
  display: inline-block;
  min-width: 2.5em;
  margin-right: 6px;
  padding: 0 6px;
  border-radius: 4px;
  color: #fff;
  font-weight: bold;
  text-align: center;
}
.numbers.safe {
  background-color: #007aff;
}
.numbers.danger {
  background-color: #ff3b30;
}
.detail {
  margin: 2px 0 0;
  font-size: 13px;
}

/* スマホの横画面は牌で画面がいっぱいなので表示しない */
@media (orientation: landscape) and (max-height: 500px) {
  .reasons {
    display: none;
  }
}

</style>
