<script lang="ts">
import {get_suji} from '../helpers/suji'
let id: number = 0

export default {
  data() {
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

      safe_tiles: []
    }
  },

  methods: {
    // 選択した牌をすべて未選択に変更
    clearSelectedTiles() {
      this.tiles.forEach((tile: any, index: number) => {
        tile.selected = false
      })
    },
    changed(tile: number) {
      // 選択しているNumberの取得
      const selected_tiles = this.tiles.filter((t: any) => t.selected == true)
      const selected_number = selected_tiles.map(selected_tile => selected_tile.text)

      // 安牌の取得
      this.safe_tiles = get_suji(selected_number)
    }
  }
}
</script>

<template>
  <div>
    <ul>
      <li v-for="tile in tiles" :key="tile.id">
        <input type="checkbox" v-model="tile.selected" @change="changed(tile)">
        <span :class="{ done: tile.done }">{{ tile.text }}</span>
      </li>
    </ul>

    <button @click="clearSelectedTiles">Clear</button>

    <p>safe tiles</p>
    <p>{{safe_tiles}}</p>
  </div>
</template>

<style>
.title {
  color: red;
}
</style>
