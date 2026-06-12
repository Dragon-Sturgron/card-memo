<script setup>
defineProps({
  query: {
    type: String,
    default: ''
  },
  categories: {
    type: Array,
    default: () => []
  },
  activeCategory: {
    type: String,
    default: '全部'
  },
  viewMode: {
    type: String,
    default: 'active'
  },
  total: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits([
  'update:query',
  'update:active-category',
  'update:view-mode',
  'add',
  'settings'
])
</script>

<template>
  <section class="toolbar">
    <div class="toolbar-row">
      <div class="search-box">
        <span>🔎</span>
        <input
          :value="query"
          placeholder="搜索标题、内容、分类..."
          @input="emit('update:query', $event.target.value)"
        />
      </div>

      <div class="toolbar-actions">
        <button class="secondary-button" @click="emit('settings')">⚙ 设置</button>
        <button class="primary-button" @click="emit('add')">+ 新增卡片</button>
      </div>
    </div>

    <div class="toolbar-row subtle-row">
      <div class="tabs">
        <button
          class="chip"
          :class="{ active: viewMode === 'active' }"
          @click="emit('update:view-mode', 'active')"
        >
          当前卡片
        </button>
        <button
          class="chip"
          :class="{ active: viewMode === 'archived' }"
          @click="emit('update:view-mode', 'archived')"
        >
          归档
        </button>
      </div>
    </div>

    <div class="tag-filter">
      <button
        class="tag-chip"
        :class="{ active: activeCategory === '全部' }"
        @click="emit('update:active-category', '全部')"
      >
        全部 {{ total }}
      </button>
      <button
        v-for="category in categories"
        :key="category.name"
        class="tag-chip"
        :class="{ active: activeCategory === category.name }"
        @click="emit('update:active-category', category.name)"
      >
        {{ category.name }} {{ category.count }}
      </button>
    </div>
  </section>
</template>
