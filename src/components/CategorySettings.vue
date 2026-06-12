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
  if (!rows.value.some((row) => row.name.trim() === value)) {
    rows.value.push({ original: '', name: value })
  }
  newCategory.value = ''
}

function removeCategory(index) {
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

    <section class="settings-card">
      <div class="settings-card-header">
        <div>
          <h2>分类列表</h2>
          <p class="settings-help">至少保留一个分类。卡片没有分类时，会自动使用第一个分类。</p>
        </div>
      </div>

      <div class="category-list-editor">
        <div v-for="(row, index) in rows" :key="`${row.original}-${index}`" class="category-edit-row">
          <input v-model="row.name" class="field-input" placeholder="分类名称" />
          <button class="secondary-button small danger-outline" @click="removeCategory(index)">删除</button>
        </div>
      </div>

      <div class="category-add-row">
        <input
          v-model="newCategory"
          class="field-input"
          placeholder="新增分类，例如：需求"
          @keydown.enter.prevent="addCategory"
        />
        <button class="secondary-button" @click="addCategory">添加分类</button>
      </div>

      <footer class="settings-footer">
        <button class="secondary-button" @click="emit('back')">取消</button>
        <button class="primary-button" :disabled="!canSave" @click="submit">保存设置</button>
      </footer>
    </section>
  </section>
</template>
