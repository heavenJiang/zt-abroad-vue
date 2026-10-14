<template>
  <div class="source-field" :class="{ 'is-error': !!error }" :data-source-field="field">
    <div class="source-row">
      <span class="source-label">
        <span v-if="required" class="required-star">*</span>来源<span v-if="label" class="source-for">（{{ label }}）</span>
      </span>
      <el-input
        v-model="source.sourceUrl"
        size="small"
        class="source-url"
        placeholder="官网链接 https://…"
        clearable
        @input="handleEdit"
      />
      <el-button link size="small" type="primary" @click="showQuote = !showQuote">
        {{ showQuote ? "收起引文" : (source.quote ? "引文 ✓" : "引文") }}
      </el-button>
      <el-tag v-if="source.sourceUrl && source.origin" size="small" :type="source.origin === '1' ? 'warning' : 'info'" class="source-origin">{{ selectDictLabel(abr_source_origin, source.origin) }}</el-tag>
      <span v-if="source.verifiedBy" class="source-verified">
        核对：{{ source.verifiedBy }} {{ parseTime(source.verifiedTime, "{y}-{m}-{d} {h}:{i}") }}
      </span>
      <el-link v-if="isHttp(source.sourceUrl)" :href="source.sourceUrl" target="_blank" type="info" :underline="false" class="source-open">
        <el-icon><Link /></el-icon>
      </el-link>
    </div>
    <el-input
      v-if="showQuote"
      v-model="source.quote"
      type="textarea"
      :rows="2"
      size="small"
      class="source-quote"
      placeholder="可选：粘贴官网原文，便于下次核对"
      @input="handleEdit"
    />
    <div v-if="error" class="source-error">{{ error }}</div>
    <div v-else-if="!hasValue && source.sourceUrl" class="source-hint">该字段为空，保存时不保留来源</div>
  </div>
</template>

<script setup>
/**
 * 申请要求单个字段的来源（官网链接 + 引文 + 来源方式 + 最近核对）。
 * source 为父组件中的响应式对象，本组件直接维护其 sourceUrl / quote / origin。
 */
const props = defineProps({
  // 字段属性名（与后端 fieldName 一致）
  field: { type: String, required: true },
  // 来源对象 { sourceUrl, quote, origin, verifiedBy, verifiedTime }
  source: { type: Object, required: true },
  // 显示在“来源”后的字段名（同组多个字段时区分）
  label: { type: String, default: "" },
  // 关键字段（有值时必须填来源链接）
  required: { type: Boolean, default: false },
  // 字段当前是否有值
  hasValue: { type: Boolean, default: false },
  // 校验错误信息
  error: { type: String, default: "" }
})
const emit = defineEmits(["edit"])

const { abr_source_origin } = useDict("abr_source_origin")
const showQuote = ref(!!props.source.quote)

/** 是否为 http(s) 链接 */
function isHttp(url) {
  return /^https?:\/\/\S+/i.test((url || "").trim())
}

/** 人工修改过来源：来源方式改为“人工”，并通知父组件清除错误 */
function handleEdit() {
  props.source.origin = "0"
  emit("edit", props.field)
}
</script>

<style scoped>
.source-field {
  margin: 4px 0 10px;
  padding: 6px 10px;
  background: var(--el-fill-color-light);
  border-left: 3px solid var(--el-border-color);
  border-radius: 2px;
}
.source-field.is-error {
  border-left-color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}
.source-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.source-label {
  font-size: 12px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}
.source-for {
  color: var(--el-text-color-secondary);
}
.required-star {
  color: var(--el-color-danger);
  margin-right: 2px;
}
.source-url {
  flex: 1;
  min-width: 260px;
}
.source-verified {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}
.source-quote {
  margin-top: 6px;
}
.source-error {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-color-danger);
}
.source-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
