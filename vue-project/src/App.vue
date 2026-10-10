<script lang="ts">
import Tiles from './components/Tiles.vue'
import Reasons from './components/Reasons.vue'

export default {
  components: {
    Tiles,
    Reasons
  },

  data() {
    return {
      // tile_typeごとの選択（捨て牌）中の牌の番号
      selected_numbers: { 1: [], 2: [], 3: [] } as { [tile_type: number]: number[] }
    }
  }
}
</script>

<template>
  <!-- <main> -->
    <div>
      <Tiles class="tiles" :tile_type="1" @change="selected_numbers[1] = $event">ワンズ</Tiles>
      <Tiles class="tiles" :tile_type="2" @change="selected_numbers[2] = $event">ピンズ</Tiles>
      <Tiles class="tiles" :tile_type="3" @change="selected_numbers[3] = $event">ソーズ</Tiles>
      <Reasons :selected_numbers="selected_numbers" />
    </div>
  <!-- </main> -->
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  /* header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  } */

  .logo {
    margin: 0 2rem 0 0;
  }

  /* .tiles {
    margin: 10px
  } */

  /* header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  } */

  /* body {
    overflow-x: hidden;
  } */
}
</style>
