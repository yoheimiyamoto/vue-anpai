<script lang="ts">
import Tiles from './components/Tiles.vue'

export default {
  components: {
    Tiles
  }
}
</script>

<template>
  <header>
  </header>

  <main>
    <div>
      <Tiles class="tiles">ワンズ</Tiles>
      <Tiles class="tiles">ピンズ</Tiles>
      <Tiles class="tiles">ソーズ</Tiles>
    </div>
  </main>
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
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  .tiles {
    margin: 10px
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  body {
    overflow-x: hidden;
  }
}
</style>
