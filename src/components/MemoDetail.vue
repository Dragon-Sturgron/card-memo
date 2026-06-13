<script setup>
import { computed } from 'vue'
import { formatDate } from '../utils'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  memo: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'edit', 'toggle-pin', 'toggle-archive', 'remove'])

const displayTitle = computed(() => props.memo?.title || '未命名卡片')
const displayContent = computed(() => props.memo?.content || '暂无内容')
</script>

<template>
  <Teleport to="body">
    <div v-if="open && memo" class="modal-mask" @click.self="emit('close')">
      <section class="detail-panel" :style="{ background: memo.color || '#fffaf2' }">
        <header class="detail-header">
          <div>
            <p class="eyebrow">卡片详情</p>
            <h2>{{ displayTitle }}</h2>
          </div>
          <button class="icon-button close-button" @click="emit('close')">✕</button>
        </header>

        <div class="detail-meta-row">
          <span v-if="memo.category" class="tag">{{ memo.category }}</span>
          <span v-if="memo.pinned" class="detail-pill">已置顶</span>
          <span v-if="memo.archived" class="detail-pill">已归档</span>
        </div>

        <article class="detail-content">{{ displayContent }}</article>

        <div class="detail-time">
          <span>创建：{{ formatDate(memo.createdAt) }}</span>
          <span>更新：{{ formatDate(memo.updatedAt) }}</span>
        </div>

        <footer class="detail-footer">
          <button class="secondary-button" @click="emit('close')">关闭</button>
          <div class="detail-actions">
            <button class="secondary-button" @click="emit('toggle-pin', memo)">
              {{ memo.pinned ? '取消置顶' : '置顶' }}
            </button>
            <button class="secondary-button" @click="emit('toggle-archive', memo)">
              {{ memo.archived ? '恢复' : '归档' }}
            </button>
            <button class="primary-button" @click="emit('edit', memo)">修改卡片</button>
          </div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
