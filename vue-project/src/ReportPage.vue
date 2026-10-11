<script lang="ts">
import report_json from './data/report.json'
import { STATUS_OF_ROW, rate_text, bar_widths, type ReportData } from './helpers/report'

const report = report_json as ReportData

export default {
  data() {
    return { report }
  },

  computed: {
    // 表の行（振込率の表示、横棒の長さ、色の見本の牌画像）
    rows() {
      const widths = bar_widths(report.rows)
      return report.rows.map((s, i) => {
        const status = STATUS_OF_ROW[s.row]
        return {
          ...s,
          rate: rate_text(s.hits, s.n),
          width: widths[i],
          // 色の見本は5萬（画像フォルダ2）をその色で出す。字牌の行は画像がないので文字で出す
          image: status ? `${import.meta.env.BASE_URL}images/2/${status}/5.png` : null,
        }
      })
    }
  },

  methods: {
    count(x: number): string {
      return x.toLocaleString('ja-JP')
    }
  }
}
</script>

<template>
  <main class="report">
    <h1>安牌シミュレーターの振込率</h1>

    <section>
      <h2>概要</h2>
      <!-- 日本語の文の間に空白が入らないよう、段落は1行で書く -->
      <p>天鳳鳳凰卓の牌譜（{{ report.source }}）から、{{ count(report.games) }} 半荘・{{ count(report.kyokus) }} 局を集計しました。成立したリーチは {{ count(report.riichis) }} 回、対象の場面（リーチ者が1人のときに、ほかの人が牌を切る直前）は {{ count(report.scenes) }} 回です。</p>
      <p class="note">振込率は、対象の場面で切る人の手にある牌（同じ牌は1回）を「切ったらリーチ者に振り込むか」で数えたものです。実際に切った牌だけでなく、手にある牌すべてを「もし切ったら」で数えています。色はリーチ者の捨て牌だけを使い、アプリと同じ判定で付けています。</p>
    </section>

    <section>
      <h2>色ごとの振込率</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">色</th>
            <th scope="col" class="num">母数</th>
            <th scope="col" class="num">振り込み</th>
            <th scope="col" class="num">振込率</th>
            <th scope="col" class="bar-cell"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.row" :title="`${row.row}: 母数 ${count(row.n)}・振り込み ${count(row.hits)}`">
            <th scope="row">
              <span class="row-name">
                <img v-if="row.image" class="tile" :src="row.image" alt="">
                <span v-else class="tile honor">東</span>
                {{ row.row }}
              </span>
            </th>
            <td class="num">{{ count(row.n) }}</td>
            <td class="num">{{ count(row.hits) }}</td>
            <td class="num">{{ row.rate }}</td>
            <td class="bar-cell"><span class="bar" :style="{ width: row.width }"></span></td>
          </tr>
        </tbody>
      </table>
    </section>
  </main>
</template>

<style scoped>

.report {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 16px;
  /* 日本語フォントを明示する（Reasons.vueと同じ） */
  font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", Meiryo, sans-serif;
}
h1 {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-heading);
  margin-bottom: 16px;
}
h2 {
  font-size: 1.15rem;
  font-weight: bold;
  color: var(--color-heading);
  margin: 32px 0 12px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--color-border);
}
p + p {
  margin-top: 8px;
}
.note {
  font-size: 0.9rem;
  opacity: 0.8;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}
th, td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
  vertical-align: middle;
}
thead th {
  font-size: 0.85rem;
  opacity: 0.8;
}
.num {
  text-align: right;
  white-space: nowrap;
}

/* 振込率の横棒（色の意味と混ざらないよう、どの行も同じ灰色にする） */
.bar-cell {
  width: 40%;
}
.bar {
  display: block;
  height: 12px;
  min-width: 1px;
  background-color: #8e8e93;
  border-radius: 0 4px 4px 0;
}

.row-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.tile {
  width: 18px;
  aspect-ratio: 143 / 197;
  border-radius: 2px;
}
/* 字牌は画像がないので、牌の形に文字を描く */
.tile.honor {
  display: inline-block;
  background-color: #e6e6e6;
  color: #333;
  font-size: 11px;
  font-weight: bold;
  line-height: 25px;
  text-align: center;
}

/* スマホでは横棒を出さず、数字だけにする */
@media (max-width: 560px) {
  .bar-cell {
    display: none;
  }
}

</style>
