<script setup>
import { ref } from 'vue'

defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['submit'])
const password = ref('')

function handleSubmit() {
  const value = password.value.trim()
  if (!value) return
  emit('submit', value)
}
</script>

<template>
  <main class="password-page">
    <section class="password-card">
      <p class="eyebrow">Card Memo</p>
      <h1>请输入访问密码</h1>

      <form class="password-form" @submit.prevent="handleSubmit">
        <input
          v-model="password"
          type="password"
          placeholder="输入访问密码"
          autocomplete="current-password"
          autofocus
        />
        <button class="primary-button" type="submit" :disabled="loading || !password.trim()">
          {{ loading ? '验证中...' : '进入备忘录' }}
        </button>
      </form>

      <p v-if="error" class="password-error">{{ error }}</p>
    </section>
  </main>
</template>
