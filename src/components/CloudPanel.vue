<script setup>
defineProps({
  token: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    default: ''
  },
  total: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:token', 'save-token', 'pull', 'push'])
</script>

<template>
  <section class="cloud-panel">
    <div>
      <p class="eyebrow">Cloud Sync</p>
      <h2>Edge Functions + KV 云端同步</h2>
      <p class="cloud-help">
        本地仍然使用 IndexedDB 保存，云端同步时会通过 <code>/api/memos</code> 读写 EdgeOne KV。
      </p>
    </div>

    <div class="cloud-controls">
      <label class="token-field">
        访问令牌，可选
        <input
          :value="token"
          type="password"
          placeholder="如果你配置了 MEMO_TOKEN，请填这里"
          autocomplete="off"
          @input="emit('update:token', $event.target.value)"
        />
      </label>

      <div class="cloud-actions">
        <button class="secondary-button small" :disabled="loading" @click="emit('save-token')">
          保存令牌
        </button>
        <button class="secondary-button small" :disabled="loading" @click="emit('pull')">
          从云端拉取
        </button>
        <button class="primary-button small" :disabled="loading || total === 0" @click="emit('push')">
          推送到云端
        </button>
      </div>

      <p v-if="status" class="cloud-status">{{ status }}</p>
    </div>
  </section>
</template>
