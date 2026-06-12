<script setup>
defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    default: ''
  },
  pending: {
    type: Boolean,
    default: false
  },
  lastSavedAt: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <section class="cloud-panel">
    <div>
      <p class="eyebrow">Cloud Sync</p>
      <h2>Edge Functions + KV 自动保存</h2>
      <p class="cloud-help">
        卡片会先保存到本地 IndexedDB，然后自动通过 <code>/api/memos</code> 写入 EdgeOne KV。
      </p>
      <p class="sync-badge" :class="{ pending, loading }">
        <span v-if="loading">正在同步</span>
        <span v-else-if="pending">等待自动保存</span>
        <span v-else>自动保存已开启</span>
        <template v-if="lastSavedAt"> · 上次保存 {{ lastSavedAt }}</template>
      </p>
    </div>

    <div class="cloud-controls">
      <p v-if="status" class="cloud-status">{{ status }}</p>
      <p class="cloud-tip">
        新增、编辑、删除、置顶、归档、导入后都会自动保存到 KV。新设备首次输入密码进入，且本地没有卡片时，会自动从 KV 恢复。
      </p>
    </div>
  </section>
</template>
