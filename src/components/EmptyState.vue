<script setup>
defineEmits(['add'])
</script>

<template>
  <section class="empty-state">
    <div class="empty-icon">🗂️</div>
    <h2>还没有卡片</h2>
    <p>点击“新增卡片”，记录客户沟通、开发思路、待办事项或任何临时内容。</p>
    <button class="primary-button" @click="$emit('add')">新增第一张卡片</button>
  </section>
</template>
