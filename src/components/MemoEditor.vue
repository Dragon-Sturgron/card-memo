<script setup>
import { computed, reactive, watch } from 'vue'
import { CARD_COLORS } from '../utils'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  memo: {
    type: Object,
    default: null
  },
  categories: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'save'])

const form = reactive({
  title: '',
  content: '',
  category: '',
  color: CARD_COLORS[0],
  pinned: false
})

const isEditing = computed(() => Boolean(props.memo?.id))
const canSave = computed(() => form.title.trim() || form.content.trim())
const firstCategory = computed(() => props.categories[0] || '')
const categoryChoices = computed(() => props.categories.map((item) => String(item || '').trim()).filter(Boolean))

watch(
  () => [props.open, props.memo, props.categories],
  () => {
    if (!props.open || !props.memo) return
    form.title = props.memo.title || ''
    form.content = props.memo.content || ''
    const candidateCategory = props.memo.category || props.memo.tags?.[0] || firstCategory.value
    form.category = categoryChoices.value.includes(candidateCategory) ? candidateCategory : firstCategory.value
    form.color = props.memo.color || CARD_COLORS[0]
    form.pinned = Boolean(props.memo.pinned)
  },
  { immediate: true, deep: true }
)

function submit() {
  if (!canSave.value) return

  emit('save', {
    ...props.memo,
    title: form.title.trim(),
    content: form.content.trim(),
    category: categoryChoices.value.includes(form.category) ? form.category : firstCategory.value,
    color: form.color,
    pinned: form.pinned,
    updatedAt: new Date().toISOString()
  })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-mask" @click.self="emit('close')">
      <section class="editor-panel">
        <header class="editor-header">
          <div>
            <p class="eyebrow">{{ isEditing ? '编辑卡片' : '新增卡片' }}</p>
            <h2>{{ isEditing ? '修改记录内容' : '记录一条新内容' }}</h2>
          </div>
          <button class="icon-button close-button" @click="emit('close')">✕</button>
        </header>

        <label class="field-label">
          标题，可不填
          <input v-model="form.title" class="field-input" placeholder="例如：客户沟通记录" />
        </label>

        <label class="field-label">
          内容
          <textarea
            v-model="form.content"
            class="field-textarea"
            rows="9"
            autofocus
            placeholder="输入你想记录的内容..."
          />
        </label>

        <label class="field-label">
          分类
          <select v-model="form.category" class="field-input field-select">
            <option v-for="category in categoryChoices" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </label>

        <div class="editor-options">
          <div>
            <span class="option-title">卡片颜色</span>
            <div class="color-list">
              <button
                v-for="color in CARD_COLORS"
                :key="color"
                class="color-dot"
                :class="{ active: form.color === color }"
                :style="{ background: color }"
                :aria-label="`选择颜色 ${color}`"
                @click="form.color = color"
              />
            </div>
          </div>

          <label class="checkbox-line">
            <input v-model="form.pinned" type="checkbox" />
            置顶这张卡片
          </label>
        </div>

        <footer class="editor-footer">
          <button class="secondary-button" @click="emit('close')">取消</button>
          <button class="primary-button" :disabled="!canSave" @click="submit">
            保存卡片
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
