<script setup>
import { computed, ref, watch } from 'vue'
import { normalizeCategories } from '../utils'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  categories: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'save'])

const rows = ref([])
const newCategory = ref('')

watch(
  () => [props.open, props.categories],
  () => {
    if (!props.open) return
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
  <Teleport to="body">
    <div v-if="open" class="modal-mask" @click.self="emit('close')">
      <section class="editor-panel settings-panel">
        <header class="editor-header">
          <div>
            <p class="eyebrow">设置</p>
            <h2>分类设置</h2>
          </div>
          <button class="icon-button close-button" @click="emit('close')">✕</button>
        </header>

        <p class="settings-help">在这里维护卡片分类。新增或修改后，新增/编辑卡片时会以下拉框选择分类。</p>

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

        <footer class="editor-footer">
          <button class="secondary-button" @click="emit('close')">取消</button>
          <button class="primary-button" :disabled="!canSave" @click="submit">保存设置</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
