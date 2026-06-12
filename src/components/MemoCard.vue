<script setup>
import { computed } from 'vue'
import { formatDate } from '../utils'

const props = defineProps({
  memo: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['edit', 'toggle-pin', 'toggle-archive', 'remove'])

const shortContent = computed(() => {
  const content = props.memo.content || ''
  return content.length > 220 ? `${content.slice(0, 220)}...` : content
})
</script>

<template>
  <article class="memo-card" :style="{ background: memo.color }" @click="emit('edit', memo)">
    <div class="card-header">
      <h3 v-if="memo.title" class="card-title">{{ memo.title }}</h3>
      <h3 v-else class="card-title muted-title">未命名卡片</h3>
      <button
        class="icon-button"
        :title="memo.pinned ? '取消置顶' : '置顶'"
        @click.stop="emit('toggle-pin', memo)"
      >
        {{ memo.pinned ? '📌' : '📍' }}
      </button>
    </div>

    <p class="card-content">{{ shortContent || '点击编辑这张卡片。' }}</p>

    <div v-if="memo.tags?.length" class="tag-row">
      <span v-for="tag in memo.tags" :key="tag" class="tag">#{{ tag }}</span>
    </div>

    <div class="card-footer">
      <span>{{ formatDate(memo.updatedAt) }}</span>
      <div class="card-actions">
        <button class="text-button" @click.stop="emit('toggle-archive', memo)">
          {{ memo.archived ? '恢复' : '归档' }}
        </button>
        <button class="text-button danger" @click.stop="emit('remove', memo)">删除</button>
      </div>
    </div>
  </article>
</template>
