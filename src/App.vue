<script setup>
import { MONTHS } from './constants.js'
</script>

<template>
  <h1>Project Roadmap</h1>
  <p>Months: {{ MONTHS.join(', ') }}</p>
</template>

<style scoped>
h1 { font-family: system-ui, sans-serif; }
</style>
