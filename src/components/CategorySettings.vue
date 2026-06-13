<script setup>
import { computed, ref, watch } from 'vue'
import { normalizeCategories } from '../utils'

const props = defineProps({
  categories: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['back', 'save'])

const rows = ref([])
const newCategory = ref('')
const noticeOpen = ref(false)

watch(
  () => props.categories,
  () => {
    rows.value = props.categories.map((name) => ({ original: name, name }))
    newCategory.value = ''
  },
  { immediate: true, deep: true }
)

const normalizedNames = computed(() => normalizeCategories(rows.value.map((row) => row.name)))
const canSave = computed(() => normalizedNames.value.length > 0)

function addCategory() {
  const value = newCategory.value.trim()
  if (!value) return

  const existed = rows.value.some((row) => row.name.trim() === value)
  if (!existed) {
    rows.value.push({ original: '', name: value })
  }
  newCategory.value = ''
}

function removeCategory(index) {
  if (rows.value.length <= 1) {
    noticeOpen.value = true
    return
  }
  rows.value.splice(index, 1)
}

function submit() {
  const categories = normalizedNames.value
  if (!categories.length) return

  const renameMap = {}
  for (const row of rows.value) {
    const original = row.original?.trim()
    const name = row.name?.trim()
    if (original && name && original !== name) renameMap[original] = name
  }

  const removed = props.categories.filter((name) => !categories.includes(name) && !renameMap[name])

  emit('save', {
    categories,
    renameMap,
    removed
  })
}
</script>

<template>
  <section class="settings-page">
    <header class="settings-hero">
      <div>
        <p class="eyebrow">Settings</p>
        <h1>分类设置</h1>
        <p class="hero-text">维护卡片分类。新增或编辑卡片时，将从这里配置的分类中选择。</p>
      </div>
      <button class="secondary-button" @click="emit('back')">返回备忘录</button>
    </header>

    <section class="settings-card category-settings-card">
      <div class="settings-card-header">
        <div>
          <h2>分类列表</h2>
          <p class="settings-help">至少保留一个分类。卡片没有分类时，会自动使用第一个分类。</p>
        </div>
      </div>

      <div class="category-grid-editor">
        <div
          v-for="(row, index) in rows"
          :key="`${row.original}-${index}`"
          class="category-token-editor"
        >
          <input
            v-model="row.name"
            class="category-token-input"
            placeholder="分类名称"
            :title="row.name"
          />
          <button
            class="category-remove-button"
            title="删除分类"
            aria-label="删除分类"
            @click="removeCategory(index)"
          >
            ×
          </button>
        </div>
      </div>

      <div class="category-settings-bottom">
        <input
          v-model="newCategory"
          class="category-new-input"
          placeholder="请输入内容，回车添加"
          @keydown.enter.prevent="addCategory"
        />

        <div class="settings-footer category-actions-footer">
          <button class="secondary-button" @click="emit('back')">取消</button>
          <button class="primary-button" :disabled="!canSave" @click="submit">保存设置</button>
        </div>
      </div>
    </section>
  </section>

  <Teleport to="body">
    <div v-if="noticeOpen" class="confirm-mask" @click.self="noticeOpen = false">
      <section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="category-notice-title">
        <button class="confirm-close" aria-label="关闭" @click="noticeOpen = false">×</button>
        <p class="eyebrow">提示</p>
        <h2 id="category-notice-title">至少需要保留一个分类</h2>
        <p class="confirm-text">当前只剩最后一个分类，不能继续删除。你可以先新增其他分类，再删除这个分类。</p>
        <footer class="confirm-footer">
          <button class="primary-button" @click="noticeOpen = false">知道了</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
