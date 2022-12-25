<script lang="ts">
import {get_anpai, get_kiken_hai} from '../helpers/suji'
let id: number = 0

export default {
  data(): {
    tiles: any
    safe_numbers: number[]
    kiken_numbers: number[]
  } {
    return {
      tiles: [
        { id: id++, text: 1, selected: false, anpai: false,  kiken: false, status: ''},
        { id: id++, text: 2, selected: false, anpai: false,  kiken: false, status: '',  },
        { id: id++, text: 3, selected: false, anpai: false,  kiken: false, status: '' },
        { id: id++, text: 4, selected: false, anpai: false,  kiken: false, status: '' },
        { id: id++, text: 5, selected: false, anpai: false,  kiken: false, status: '' },
        { id: id++, text: 6, selected: false, anpai: false,  kiken: false, status: '' },
        { id: id++, text: 7, selected: false, anpai: false,  kiken: false, status: '' },
        { id: id++, text: 8, selected: false, anpai: false,  kiken: false, status: '' },
        { id: id++, text: 9, selected: false, anpai: false,  kiken: false, status: '' }
      ],

      safe_numbers: [],
      kiken_numbers: []
    }
  },

  methods: {
    clickTile(tile) {
      tile.selected = ! tile.selected

      // 選択しているNumberの取得
      const selected_tiles = this.tiles.filter((t: any) => t.selected == true)
      const selected_number = selected_tiles.map(selected_tile => selected_tile.text)

      // 安牌の取得
      this.safe_numbers = get_anpai(selected_number)
      this.kiken_numbers = get_kiken_hai(selected_number)

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
        if (tile.selected) {
          tile.status = 'selected'
        } else if (tile.anpai) {
          tile.status = 'anpai'
        } else {
          tile.status = 'kiken'
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
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><slot></slot></h5>
      <div class="tiles" v-for="tile in tiles" :key="tile.id">
        <!-- <img src="@/assets/images/blue_11.png" alt="Snow"> -->
        <!-- <button v-bind:class="tile.status" @click="clickTile(tile)">{{tile.text}}</button> -->
        <!-- <button style="background-image:url(@/assets/images/blue_11.png)" @click="clickTile(tile)">{{tile.text}}</button> -->
        <!-- <a href=""> -->
          <img @click="clickTile(tile)" src="@/assets/images/blue_11.png">
        <!-- </a> -->
      </div>
      <div class="suji">
        <p>安牌</p>
        <p class="h5" v-if="safe_numbers.length">{{safe_numbers.join(',')}}</p>
        <p class="h5" v-else>なし</p>
      </div>
      <div class="suji">
        <p>危険牌</p>
        <p class="h5" v-if="kiken_numbers.length">{{kiken_numbers.join(',')}}</p>
        <p class="h5" v-else>なし</p>
      </div>
      <button class="btn btn-primary" @click="clearSelectedTiles">Clear</button>
      <div>
        {{tiles}}
      </div>
    </div>
  </div>
</template>

<style>
.tiles {
  display:inline-block;
  margin-right: 40px;
}

.card{
    margin-bottom: 10px;
}

.suji {
  padding: 5px;
}

span {
  padding: 3px;
}

.selected {
  color: green;
}

.anpai {
  color: blue;
}

.kiken {
  color: red;
}

.big-checkbox {
  width: 20px;
  height: 20px;
}

</style>
