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
        { id: id++, text: 1, selected: false },
        { id: id++, text: 2, selected: false },
        { id: id++, text: 3, selected: false },
        { id: id++, text: 4, selected: false },
        { id: id++, text: 5, selected: false },
        { id: id++, text: 6, selected: false },
        { id: id++, text: 7, selected: false },
        { id: id++, text: 8, selected: false },
        { id: id++, text: 9, selected: false }
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
    },

    // 選択した牌をすべて未選択に変更
    clearSelectedTiles() {
      this.tiles.forEach((tile: any, index: number) => {
        tile.selected = false
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
        <button v-bind:class="{selected: tile.selected}" @click="clickTile(tile)">{{tile.text}}</button>
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
      <!-- <div>
        {{tiles}}
      </div> -->
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
  color: red;
}

.big-checkbox {
  width: 20px;
  height: 20px;
}

</style>
