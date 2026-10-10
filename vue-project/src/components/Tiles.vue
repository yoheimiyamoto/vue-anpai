<script lang="ts">
import {get_tile_statuses} from '../helpers/waits'
let id: number = 0

// 先読みした画像がキャッシュから破棄されないよう参照を保持しておく
const preloaded_images: HTMLImageElement[] = []

export default {
  props: {
    tile_type: Number
  },

  // 選択（捨て牌）が変わったときに、選択中の牌の番号を通知する
  emits: ['change'],

  data(): {
    tiles: any
  } {
    return {
      tiles: [
        { id: id++, text: 1, img: '1.png', selected: false, status: 'default' },
        { id: id++, text: 2, img: '2.png', selected: false, status: 'default' },
        { id: id++, text: 3, img: '3.png', selected: false, status: 'default' },
        { id: id++, text: 4, img: '4.png', selected: false, status: 'default' },
        { id: id++, text: 5, img: '5.png', selected: false, status: 'default' },
        { id: id++, text: 6, img: '6.png', selected: false, status: 'default' },
        { id: id++, text: 7, img: '7.png', selected: false, status: 'default' },
        { id: id++, text: 8, img: '8.png', selected: false, status: 'default' },
        { id: id++, text: 9, img: '9.png', selected: false, status: 'default' }
      ],
    }
  },

  mounted() {
    // クリック時に画像の読み込み待ちで色の切り替えが遅れないよう、default以外の画像を先読みする
    for (const status of ['selected', 'safe', 'likely_safe', 'caution', 'danger']) {
      for (const tile of this.tiles) {
        const image = new Image()
        image.src = this.imagePath(status, tile)
        preloaded_images.push(image)
      }
    }
  },

  methods: {
    imagePath(status: string, tile: any): string {
      return `./images/${this.tile_type}/${status}/${tile.img}`
    },

    clickTile(tile) {
      tile.selected = ! tile.selected

      // 選択しているNumberの取得
      const selected_tiles = this.tiles.filter((t: any) => t.selected == true)
      const selected_number = selected_tiles.map(selected_tile => selected_tile.text)

      // 捨て牌から各牌の色（選択・濃い青・薄い青・薄い赤・濃い赤）を設定
      const statuses = get_tile_statuses(selected_number)
      this.tiles.forEach((t: any) => {
        t.status = statuses[t.text]
      })

      this.$emit('change', selected_number)
    },

    // 選択した牌をすべて未選択に変更
    clearSelectedTiles() {
      this.tiles.forEach((tile: any, index: number) => {
        tile.selected = false
        tile.status = 'default'
      })
    }
  }
}
</script>

<template>
  <div class="container-fluid text-center">

    <div class="tile-row">
      <div v-for="tile in tiles" :key="tile.id">
        <img class="tile" @click="clickTile(tile)" :src="imagePath(tile.status, tile)" rel="preload">
      </div>
    </div>
    <!-- <button class="btn btn-primary" @click="clearSelectedTiles">Clear</button> -->
    <!-- <div>
      {{tiles}}
    </div> -->
  </div>
</template>

<style>

/* 牌9枚を1行に並べる。画面が広いときは間隔を空けずに中央へ寄せ、狭いときは9枚が収まるよう縮小する */
.tile-row {
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 50px));
  justify-content: center;
  gap: 4px;
  margin-bottom: 10px;
}
.tile {
  width: 100%;
}

/* スマホの横画面では、3段すべてが画面に収まる範囲で牌をめいっぱい大きくする */
@media (orientation: landscape) and (max-height: 500px) {
  .tile-row {
    /* 牌の幅 = 次の小さい方
       - 横: (画面幅 - 左右余白24px - 間隔4px×8) / 9枚
       - 縦: (画面高さ - 上下余白16px(main.css) - 段の間隔4px×3) / 3段 を縦横比143:197で幅に換算 */
    grid-template-columns: repeat(9, min((100vw - 56px) / 9, (100vh - 28px) / 3 * 143 / 197));
    grid-template-columns: repeat(9, min((100vw - 56px) / 9, (100dvh - 28px) / 3 * 143 / 197));
    margin-bottom: 4px;
  }
  .tile {
    display: block;
  }
}

</style>
