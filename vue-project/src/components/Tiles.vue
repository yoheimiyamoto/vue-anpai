<script lang="ts">
import {get_suji} from '../helpers/suji'
let id: number = 0

export default {
  data(): {
    tiles: any
    safe_tiles: number[]
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

      safe_tiles: []
    }
  },

  methods: {
    // 選択した牌をすべて未選択に変更
    clearSelectedTiles() {
      this.tiles.forEach((tile: any, index: number) => {
        tile.selected = false
      })
      this.safe_tiles = []
    },
    changed(tile: any) {
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
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><slot></slot></h5>
      <form>
        <fieldset class="tiles" v-for="tile in tiles" :key="tile.id">
          <p class="h5">{{ tile.text }}</p>  
          <input type="checkbox" v-model="tile.selected" @change="changed(tile)">
        </fieldset>
      </form>
      <div class="suji">
        <div v-if="safe_tiles.length">{{safe_tiles.join(',')}}</div>
        <div v-else>なし</div>
      </div>
      <button class="btn btn-primary" @click="clearSelectedTiles">Clear</button>
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

</style>
