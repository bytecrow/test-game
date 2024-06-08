<script setup lang="ts">
import { ref, computed } from 'vue';
import axios from 'axios';

const selectedM = ref(6);
const selectedN = ref(undefined);

const optionsForN = computed(() => {
  let options = [];
  for (let i = 2; i <= selectedM.value * selectedM.value; i++) {
    if (i % 2 !== 0) { 
      options.push(i);
    }
  }
  return options;
});

// TODO: этот код, конечно, лучше вынести в слой бэкенд-api-клиента. 
// А ошибки выводить пользователю, а не в консоль
const createGame = async () => {
  if (selectedM.value && selectedN.value) {
    try {
      const response = await axios.post('//localhost:3000/game', {
        M: selectedM.value,
        N: selectedN.value
      });
      console.log('Response:', response.data);
    } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
    }
  } else {
    console.error('Both field size and diamonds quantity are required.');
  }
};
</script>

<template>
    <h1>Create new game</h1>
  <form @submit.prevent="createGame">
    <label for="m">Select field size:</label>
    <select id="m" v-model="selectedM" required>
      <option v-for="num in [2, 3, 4, 5, 6]" :key="num" :value="num">{{ num }}x{{ num }}</option>
    </select>

    <label for="n">Select diamonds quantity:</label>
    <select id="n" v-model="selectedN" required>
      <option v-for="num in optionsForN" :key="num" :value="num">{{ num }}</option>
    </select>
    <button type="submit">Create</button>
  </form>
</template>

<style scoped>
  form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  select, button {
    width: 100px;
  }
</style>

