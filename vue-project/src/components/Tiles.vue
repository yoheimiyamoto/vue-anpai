<script lang="ts">
import {get_anpai, get_kiken_hai} from '../helpers/suji'
let id: number = 0

// 先読みした画像がキャッシュから破棄されないよう参照を保持しておく
const preloaded_images: HTMLImageElement[] = []

export default {
  props: {
    tile_type: Number
  },

  data(): {
    tiles: any
    safe_numbers: number[]
    kiken_numbers: number[]
  } {
    return {
      tiles: [
        { id: id++, text: 1, img: '1.png', selected: false, anpai: false,  kiken: false, status: 'default'},
        { id: id++, text: 2, img: '2.png', selected: false, anpai: false,  kiken: false, status: 'default',  },
        { id: id++, text: 3, img: '3.png', selected: false, anpai: false,  kiken: false, status: 'default' },
        { id: id++, text: 4, img: '4.png', selected: false, anpai: false,  kiken: false, status: 'default' },
        { id: id++, text: 5, img: '5.png', selected: false, anpai: false,  kiken: false, status: 'default' },
        { id: id++, text: 6, img: '6.png', selected: false, anpai: false,  kiken: false, status: 'default' },
        { id: id++, text: 7, img: '7.png', selected: false, anpai: false,  kiken: false, status: 'default' },
        { id: id++, text: 8, img: '8.png', selected: false, anpai: false,  kiken: false, status: 'default' },
        { id: id++, text: 9, img: '9.png', selected: false, anpai: false,  kiken: false, status: 'default' }
      ],

      safe_numbers: [],
      kiken_numbers: [],
    }
  },

  mounted() {
    // クリック時に画像の読み込み待ちで色の切り替えが遅れないよう、default以外の画像を先読みする
    for (const status of ['selected', 'safe', 'danger']) {
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

      // 安牌の取得
      this.safe_numbers = get_anpai(selected_number)
      this.kiken_numbers = get_kiken_hai(selected_number)

      // フラグの初期化
      this.tiles.forEach((tile: any, index: number) => {
        tile.anpai = false
        tile.kiken = false
        tile.status = 'default'
      })

      // 危険牌のフラグ追加
      for (let i = 0; i < this.kiken_numbers.length; i++) {
        const kiken_number = this.kiken_numbers[i]
        let found = this.tiles.find((tile) => {
          return tile.text == kiken_number
        })
        if(found) {
          found.kiken = true
        }
      }

      // 安牌のフラグ追加
      for (let i = 0; i < this.safe_numbers.length; i++) {
        const safe_number = this.safe_numbers[i]
        let found = this.tiles.find((tile) => {
          return tile.text == safe_number
        })
        if(found) {
          found.anpai = true
        }
      }

      // status設定
      this.tiles.forEach(function(tile){
        tile.status = 'default'

        if (tile.selected) {
          tile.status = 'selected'
        } else if (tile.anpai) {
          tile.status = 'safe'
        } else if (tile.kiken) {
          tile.status = 'danger'
        }
      })
    },

    // 選択した牌をすべて未選択に変更
    clearSelectedTiles() {
      this.tiles.forEach((tile: any, index: number) => {
        tile.selected = false
        tile.anpai = false
        tile.kiken = false
      })
      this.safe_numbers = []
    }
  }
}
</script>

<template>
  <div class="container-fluid text-center">

    <div class="row">
      <div class="col" v-for="tile in tiles" :key="tile.id">
        <img class="tile" @click="clickTile(tile)" :src="imagePath(tile.status, tile)" rel="preload">
      </div>
    </div>
    <!-- <div class="suji">
      <p>安牌</p>
      <p class="h5" v-if="safe_numbers.length">{{safe_numbers.join(',')}}</p>
      <p class="h5" v-else>なし</p>
    </div>
    <div class="suji">
      <p>危険牌</p>
      <p class="h5" v-if="kiken_numbers.length">{{kiken_numbers.join(',')}}</p>
      <p class="h5" v-else>なし</p>
    </div> -->
    <!-- <button class="btn btn-primary" @click="clearSelectedTiles">Clear</button> -->
    <!-- <div>
      {{tiles}}
    </div> -->
  </div>
</template>

<style>

.tile {
  width: 50px;
}
.row {
  margin-bottom: 10px;
}

</style>
