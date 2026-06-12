<script setup>
defineProps({
  query: {
    type: String,
    default: ''
  },
  tags: {
    type: Array,
    default: () => []
  },
  activeTag: {
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

const emit = defineEmits(['update:query', 'update:active-tag', 'update:view-mode', 'add', 'export', 'import'])
</script>

<template>
  <section class="toolbar">
    <div class="toolbar-row">
      <div class="search-box">
        <span>🔎</span>
        <input
          :value="query"
          placeholder="搜索标题、内容、标签..."
          @input="emit('update:query', $event.target.value)"
        />
      </div>
      <button class="primary-button" @click="emit('add')">+ 新增卡片</button>
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

      <div class="import-export">
        <button class="secondary-button small" @click="emit('export')">导出 JSON</button>
        <label class="secondary-button small file-button">
          导入 JSON
          <input type="file" accept="application/json" @change="emit('import', $event)" />
        </label>
      </div>
    </div>

    <div class="tag-filter">
      <button
        class="tag-chip"
        :class="{ active: activeTag === '全部' }"
        @click="emit('update:active-tag', '全部')"
      >
        全部 {{ total }}
      </button>
      <button
        v-for="tag in tags"
        :key="tag.name"
        class="tag-chip"
        :class="{ active: activeTag === tag.name }"
        @click="emit('update:active-tag', tag.name)"
      >
        #{{ tag.name }} {{ tag.count }}
      </button>
    </div>
  </section>
</template>
