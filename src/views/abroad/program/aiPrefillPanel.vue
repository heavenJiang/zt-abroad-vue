<template>
  <el-card class="ai-prefill" shadow="never">
    <template #header>
      <div class="ai-head">
        <span class="ai-title"><el-icon><MagicStick /></el-icon> AI 预填</span>
        <el-tag size="small" type="warning" effect="plain">AI 生成</el-tag>
        <span class="ai-sub">粘贴项目官网页面链接，AI 抽取字段并附原文引句；逐字段确认后才写入表单，保存后才入库</span>
        <el-button link icon="Close" class="ai-close" :disabled="running" @click="emit('close')">收起</el-button>
      </div>
    </template>

    <!-- 链接 + 开始 -->
    <div class="ai-url-row">
      <el-input v-model="url" placeholder="https://… 项目官网页面（入学要求、学费所在页面）" clearable :disabled="running" class="ai-url" @keyup.enter="start">
        <template #prepend>官网链接</template>
      </el-input>
      <el-button type="primary" icon="MagicStick" :loading="running" :disabled="running" @click="start">开始预填</el-button>
    </div>

    <!-- 进行中 -->
    <div v-if="running" class="ai-running">
      <el-progress :percentage="progress" :stroke-width="8" :show-text="false" class="ai-progress" />
      <div class="ai-running-text">
        <span>{{ elapsed < 3 ? "正在抓取官网页面…" : "AI 正在抽取字段并核对原文引句…" }}</span>
        <span class="ai-elapsed">已用 {{ elapsed }} 秒（最长 30 秒）</span>
        <el-button size="small" @click="cancel">取消</el-button>
      </div>
    </div>

    <!-- 失败 -->
    <el-alert v-if="error" type="error" :closable="false" show-icon class="ai-error" :title="error">
      <template #default>没有预填任何字段。可以在浏览器中打开官网，对照页面手动录入下方各字段，并为均分、语言、截止日填写来源链接。</template>
    </el-alert>

    <!-- 结果 -->
    <template v-if="result && !running">
      <div class="ai-summary">
        <el-tag size="small" type="warning">AI 生成</el-tag>
        <span>已抽取 {{ result.summary.found }} 个字段，用时 {{ result.elapsedMs < 1000 ? "不到 1" : (result.elapsedMs / 1000).toFixed(1) }} 秒</span>
        <span>· <b class="text-warning">{{ pendingReq.length }}</b> 个申请要求字段待确认</span>
        <span v-if="pendingProgram.length">· {{ pendingProgram.length }} 个基本信息待确认</span>
        <span>· {{ result.summary.not_found }} 个未找到</span>
        <span v-if="result.summary.discarded">· {{ result.summary.discarded }} 个已丢弃</span>
        <span class="ai-source">来源 <el-link :href="result.url" target="_blank" type="primary" :underline="false">{{ shortUrl(result.url) }}</el-link> · 抓取 {{ result.fetchedAt }}</span>
        <el-radio-group v-model="filter" size="small" class="ai-filter">
          <el-radio-button value="all">全部</el-radio-button>
          <el-radio-button value="pending">待确认</el-radio-button>
        </el-radio-group>
      </div>
      <el-alert v-if="!targetMatches" type="info" :closable="false" show-icon class="ai-error"
        :title="'本次预填对应申请季 ' + (result.targetSeason || '（未命名）') + '，切换回该申请季继续确认申请要求字段'" />

      <el-row :gutter="12" class="ai-body">
        <!-- 左：字段 -->
        <el-col :span="14">
          <div class="ai-group-title">申请要求 <span class="ai-group-hint">确认后写入当前申请季的表单，并带上来源链接与引句</span></div>
          <div v-for="f in visible(reqFields)" :key="f.fieldName" class="ai-field" :class="rowClass(f)" :data-ai-field="f.fieldName"
            @click="activeField = f.fieldName" @mouseenter="activeField = f.fieldName">
            <div class="ai-field-label">{{ f.label }}</div>
            <div class="ai-field-values">
              <template v-if="f.status === 'found'">
                <div class="ai-value-line"><span class="ai-k">当前</span><span class="ai-current">{{ display(f.fieldName, currentValues[f.fieldName]) }}</span></div>
                <div class="ai-value-line"><span class="ai-k">建议</span><span class="ai-proposed">{{ display(f.fieldName, f.value) }}</span></div>
              </template>
              <div v-else class="ai-none">{{ f.status === "not_found" ? "没有找到可靠来源，AI 未填写，请手动录入" : f.reason }}</div>
            </div>
            <div class="ai-field-state"><el-tag size="small" :type="stateTag(f).type">{{ stateTag(f).label }}</el-tag></div>
            <div class="ai-field-actions">
              <template v-if="f.status === 'found' && f.state === 'pending'">
                <el-button size="small" type="primary" :disabled="!targetMatches" @click.stop="act(f, 'confirm')">确认</el-button>
                <el-button size="small" :disabled="!targetMatches" @click.stop="act(f, 'edit')">修改</el-button>
                <el-button size="small" link @click.stop="act(f, 'ignore')">忽略</el-button>
              </template>
            </div>
          </div>

          <div class="ai-group-title mt12">
            项目基本信息
            <span class="ai-group-hint">确认后点“更新项目基本信息”单独保存到项目，不影响申请要求表单</span>
          </div>
          <div v-for="f in visible(programFields)" :key="f.fieldName" class="ai-field" :class="rowClass(f)" :data-ai-field="f.fieldName"
            @click="activeField = f.fieldName" @mouseenter="activeField = f.fieldName">
            <div class="ai-field-label">{{ f.label }}</div>
            <div class="ai-field-values">
              <template v-if="f.status === 'found'">
                <div class="ai-value-line"><span class="ai-k">当前</span><span class="ai-current">{{ display(f.fieldName, program[f.fieldName]) }}</span></div>
                <div class="ai-value-line"><span class="ai-k">建议</span><span class="ai-proposed">{{ display(f.fieldName, f.value) }}</span></div>
              </template>
              <div v-else class="ai-none">{{ f.status === "not_found" ? "没有找到可靠来源，AI 未填写" : f.reason }}</div>
            </div>
            <div class="ai-field-state"><el-tag size="small" :type="stateTag(f).type">{{ stateTag(f).label }}</el-tag></div>
            <div class="ai-field-actions">
              <template v-if="f.status === 'found' && f.state === 'pending'">
                <el-button size="small" type="primary" @click.stop="f.state = 'confirmed'">确认</el-button>
                <el-button size="small" link @click.stop="f.state = 'ignored'">忽略</el-button>
              </template>
            </div>
          </div>
          <div class="ai-program-bar">
            <el-button type="success" plain size="small" icon="Upload" :disabled="!programChanges.length" :loading="updatingProgram"
              @click="updateProgramInfo" v-hasPermi="['abroad:program:edit']">更新项目基本信息{{ programChanges.length ? "（" + programChanges.length + " 项）" : "" }}</el-button>
            <span v-if="pendingProgram.length" class="ai-group-hint">还有 {{ pendingProgram.length }} 个基本信息字段未确认或忽略</span>
          </div>
        </el-col>

        <!-- 右：原文引句对照 -->
        <el-col :span="10">
          <div class="ai-quotes" ref="quotesRef">
            <div class="ai-group-title">原文引句对照</div>
            <div v-for="f in quoteList" :key="f.fieldName" class="ai-quote" :class="{ 'is-active': activeField === f.fieldName, 'is-missing': f.status !== 'found' }"
              :data-quote-field="f.fieldName" @click="activeField = f.fieldName">
              <div class="ai-quote-head">
                <span>{{ f.label }}</span>
                <span v-if="activeField === f.fieldName" class="ai-quote-current">当前字段</span>
              </div>
              <blockquote v-if="f.status === 'found'" class="ai-quote-text">“{{ f.quote }}”</blockquote>
              <div v-else class="ai-quote-none">{{ f.status === "not_found" ? "页面中没有找到可靠来源，AI 未填写" : f.reason }}</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </template>
  </el-card>
</template>

<script setup>
/**
 * 项目 AI 预填面板（线框图 07）：输入官网链接 → 调用 /abroad/program/aiPrefill → 左侧逐字段“当前 / 建议”，右侧原文引句对照。
 * - 申请要求字段：确认 / 修改 通过 apply 事件交给父组件写入表单（父组件负责编辑模型与来源）；忽略只改状态。
 * - 项目基本信息字段：确认后由本组件 PUT /abroad/program 单独保存。
 * - 结果对象 result 由父组件持有（用于保存按钮的“未确认”计数），本组件直接维护其 fields[i].state。
 */
import { aiPrefillProgram, updateProgram } from "@/api/abroad/program"

const props = defineProps({
  // 项目（getProgram 返回的对象）
  program: { type: Object, required: true },
  // 预填结果（父组件持有，可为 null）
  result: { type: Object, default: null },
  // 当前申请季编辑器中各字段的取值（与后端字段同名，JSON 字段为对象）
  currentValues: { type: Object, default: () => ({}) },
  // 当前申请季是否为本次预填的目标申请季
  targetMatches: { type: Boolean, default: true },
  // 官网链接初始值
  initialUrl: { type: String, default: "" }
})
const emit = defineEmits(["close", "result", "apply", "program-updated", "running"])

const { proxy } = getCurrentInstance()
const { abr_degree, abr_intake, abr_teaching_language, abr_undergrad_tier, abr_test_requirement, abr_cross_major } = useDict(
  "abr_degree", "abr_intake", "abr_teaching_language", "abr_undergrad_tier", "abr_test_requirement", "abr_cross_major"
)

/** 其他语言考试显示名（与 requirement.vue 一致） */
const LANGUAGE_LABELS = { toefl: "TOEFL", pte: "PTE", duolingo: "Duolingo", jlpt: "JLPT", topik: "TOPIK", testdaf: "TestDaF", dsh: "DSH", goethe: "Goethe" }

const url = ref(props.initialUrl || "")
const running = ref(false)
const elapsed = ref(0)
const error = ref("")
const filter = ref("all")
const activeField = ref("")
const updatingProgram = ref(false)
const quotesRef = ref(null)
let controller = null
let timer = null
let startedAt = 0

watch(() => props.initialUrl, v => {
  if (!url.value && v) {
    url.value = v
  }
})

const fields = computed(() => (props.result ? props.result.fields : []))
const reqFields = computed(() => fields.value.filter(f => f.target === "requirement"))
const programFields = computed(() => fields.value.filter(f => f.target === "program"))
const pendingReq = computed(() => reqFields.value.filter(f => f.state === "pending"))
const pendingProgram = computed(() => programFields.value.filter(f => f.state === "pending"))
const programChanges = computed(() => programFields.value.filter(f => f.state === "confirmed"))
const progress = computed(() => Math.min(99, Math.round(elapsed.value / 30 * 100)))
/** 引句列表：先申请要求后基本信息，与左侧顺序一致 */
const quoteList = computed(() => visible(reqFields.value).concat(visible(programFields.value)))

/** 按筛选条件显示的字段 */
function visible(list) {
  return filter.value === "pending" ? list.filter(f => f.state === "pending") : list
}

/** 开始预填 */
function start() {
  const u = (url.value || "").trim()
  if (!/^https?:\/\/\S+/i.test(u)) {
    proxy.$modal.msgError("请填写以 http:// 或 https:// 开头的官网链接")
    return
  }
  const hasPending = fields.value.some(f => f.state === "pending")
  const go = () => run(u)
  if (hasPending) {
    proxy.$modal.confirm("上一次预填还有未处理的字段，重新预填会丢弃这些建议，是否继续？").then(go).catch(() => {})
  } else {
    go()
  }
}

/** 调用后端预填 */
function run(u) {
  error.value = ""
  running.value = true
  emit("running", true)
  elapsed.value = 0
  startedAt = Date.now()
  timer = setInterval(() => {
    elapsed.value = Math.floor((Date.now() - startedAt) / 1000)
  }, 250)
  controller = new AbortController()
  aiPrefillProgram({ url: u, programId: props.program.programId }, controller.signal).then(res => {
    if (res.canceled) {
      proxy.$modal.msgWarning("已取消 AI 预填")
      return
    }
    const data = res.data
    data.fields.forEach(f => {
      f.state = f.status === "found" ? "pending" : "none"
    })
    filter.value = "all"
    activeField.value = (data.fields.find(f => f.status === "found") || {}).fieldName || ""
    emit("result", data)
  }).catch(e => {
    // 后端的中文原因（页面打不开 / 需要登录或被拒绝 / 不是网页 / 超时 / 页面太大）；拦截器已弹出同样的提示
    error.value = (e && e.message) || "AI 预填失败"
  }).finally(() => {
    clearInterval(timer)
    timer = null
    controller = null
    running.value = false
    emit("running", false)
  })
}

/** 取消正在进行的预填 */
function cancel() {
  if (controller) {
    controller.abort()
  }
}

/** 申请要求字段的操作：确认 / 修改（交给父组件写入表单）/ 忽略 */
function act(f, mode) {
  activeField.value = f.fieldName
  if (mode === "ignore") {
    f.state = "ignored"
    return
  }
  emit("apply", { field: f, mode: mode, url: props.result.url })
  f.state = mode === "confirm" ? "confirmed" : "edited"
}

/** 确认过的基本信息字段 PUT 到项目 */
function updateProgramInfo() {
  const changes = programChanges.value
  const text = changes.map(f => f.label + "：" + display(f.fieldName, props.program[f.fieldName]) + " → " + display(f.fieldName, f.value)).join("；")
  proxy.$modal.confirm("确认更新项目基本信息？" + text).then(() => {
    const data = { ...props.program }
    changes.forEach(f => {
      data[f.fieldName] = Array.isArray(f.value) ? f.value.join(",") : f.value
    })
    updatingProgram.value = true
    return updateProgram(data).then(() => {
      changes.forEach(f => {
        f.state = "applied"
      })
      proxy.$modal.msgSuccess("项目基本信息已更新")
      emit("program-updated")
    }).finally(() => {
      updatingProgram.value = false
    })
  }).catch(() => {})
}

/** 状态标签 */
function stateTag(f) {
  if (f.status === "not_found") {
    return { type: "info", label: "待手填" }
  }
  if (f.status === "discarded") {
    return { type: "danger", label: "已丢弃" }
  }
  return {
    pending: { type: "warning", label: "AI · 待确认" },
    confirmed: { type: "success", label: "已确认" },
    edited: { type: "primary", label: "已修改" },
    ignored: { type: "info", label: "已忽略" },
    applied: { type: "success", label: "已更新到项目" }
  }[f.state] || { type: "info", label: f.state }
}

/** 行样式 */
function rowClass(f) {
  return { "is-active": activeField.value === f.fieldName, "is-pending": f.state === "pending", "is-missing": f.status !== "found" }
}

/** 字典标签 */
function label(options, value) {
  const d = (options.value || []).find(x => x.value === String(value))
  return d ? d.label : value
}

/** 字段值显示 */
function display(field, raw) {
  let v = raw
  if (v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length)) {
    return "（空）"
  }
  if (typeof v === "string" && ["minGpa", "otherLanguage", "testDetail", "deadlines"].includes(field)) {
    try {
      v = JSON.parse(v)
    } catch (e) {
      return v
    }
  }
  if (typeof v === "string" && ["tiersNotAccepted", "intakes"].includes(field)) {
    v = v.split(",").map(x => x.trim()).filter(Boolean)
  }
  switch (field) {
    case "degree":
      return label(abr_degree, v)
    case "teachingLanguage":
      return label(abr_teaching_language, v)
    case "testRequirement":
      return label(abr_test_requirement, v)
    case "acceptCrossMajor":
      return label(abr_cross_major, v)
    case "prerequisitesRequired":
      return v === "Y" ? "硬性要求" : "建议具备"
    case "intakes":
      return v.map(x => label(abr_intake, x)).join("、")
    case "tiersNotAccepted":
      return v.map(x => label(abr_undergrad_tier, x)).join("、")
    case "durationMonths":
      return v + " 个月"
    case "workYears":
      return v + " 年"
    case "tuition":
      return Number(v).toLocaleString("en-US")
    case "ieltsOverall":
    case "ieltsMinSub":
      return Number(v).toFixed(1)
    case "minGpa": {
      // 按字典顺序（C9、985、211…）显示
      const order = (abr_undergrad_tier.value || []).map(d => d.value)
      const keys = Object.keys(v).sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99))
      return keys.map(k => label(abr_undergrad_tier, k) + "：" + v[k]).join("　") || "（空）"
    }
    case "otherLanguage":
      return Object.keys(v).map(k => {
        const x = v[k] || {}
        const parts = []
        if (x.overall != null) parts.push("总分 " + x.overall)
        if (x.minSub != null) parts.push("单项 " + x.minSub)
        if (x.level) parts.push(x.level)
        if (x.note) parts.push(x.note)
        return (LANGUAGE_LABELS[k] || k) + " " + parts.join(" / ")
      }).join("；") || "（空）"
    case "testDetail":
      return [["gre", "GRE"], ["gmat_focus", "GMAT Focus"], ["gmat_classic", "GMAT"]].filter(([k]) => v[k] != null).map(([k, n]) => n + " " + v[k]).join("　") || "（空）"
    case "deadlines": {
      const rounds = (v.rounds || []).map(r => r.name + " " + r.date).join("；")
      return (v.rolling ? "滚动录取" : "") + (v.rolling && rounds ? "；" : "") + rounds || "（空）"
    }
    default:
      return String(v)
  }
}

/** 链接缩略显示 */
function shortUrl(u) {
  return u && u.length > 60 ? u.slice(0, 40) + "…" + u.slice(-16) : u
}

/** 当前字段变化时，右侧引句滚动到可见 */
watch(activeField, field => {
  nextTick(() => {
    const box = quotesRef.value
    const el = box && box.querySelector('[data-quote-field="' + field + '"]')
    if (el) {
      const top = el.offsetTop - box.offsetTop
      if (top < box.scrollTop || top + el.offsetHeight > box.scrollTop + box.clientHeight) {
        box.scrollTo({ top: Math.max(0, top - 40), behavior: "smooth" })
      }
    }
  })
})

onBeforeUnmount(() => {
  cancel()
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style scoped>
.ai-prefill {
  margin-bottom: 12px;
  border-color: var(--el-color-warning-light-5);
}
.ai-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ai-title {
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.ai-sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.ai-close {
  margin-left: auto;
}
.ai-url-row {
  display: flex;
  gap: 8px;
}
.ai-url {
  flex: 1;
}
.ai-running {
  margin-top: 10px;
}
.ai-running-text {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
  font-size: 13px;
}
.ai-elapsed {
  color: var(--el-text-color-secondary);
}
.ai-error {
  margin-top: 10px;
}
.ai-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 12px 0 8px;
  font-size: 13px;
}
.ai-source {
  color: var(--el-text-color-secondary);
}
.ai-filter {
  margin-left: auto;
}
.text-warning {
  color: var(--el-color-warning);
}
.ai-group-title {
  font-weight: 600;
  font-size: 13px;
  margin: 4px 0 6px;
}
.ai-group-hint {
  font-weight: normal;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-left: 6px;
}
.mt12 {
  margin-top: 12px;
}
.ai-field {
  display: grid;
  grid-template-columns: 96px 1fr 92px 170px;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  margin-bottom: 4px;
  cursor: pointer;
  font-size: 13px;
}
.ai-field.is-pending {
  background: var(--el-color-warning-light-9);
}
.ai-field.is-missing {
  background: var(--el-fill-color-lighter);
}
.ai-field.is-active {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary-light-5);
}
.ai-field-label {
  font-weight: 500;
}
.ai-value-line {
  display: flex;
  gap: 6px;
  line-height: 20px;
}
.ai-k {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  flex: none;
}
.ai-current {
  color: var(--el-text-color-secondary);
}
.ai-proposed {
  color: var(--el-text-color-primary);
  font-weight: 500;
  word-break: break-all;
}
.ai-none {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.ai-field-actions {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
}
.ai-field-actions .el-button + .el-button {
  margin-left: 4px;
}
.ai-program-bar {
  display: flex;
  align-items: center;
  margin-top: 6px;
}
.ai-quotes {
  position: sticky;
  top: 0;
  max-height: 640px;
  overflow-y: auto;
  padding: 0 4px 0 12px;
  border-left: 2px solid var(--el-border-color-lighter);
}
.ai-quote {
  padding: 6px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 13px;
}
.ai-quote.is-active {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
}
.ai-quote-head {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.ai-quote-current {
  color: var(--el-color-primary);
}
.ai-quote-text {
  margin: 4px 0 0;
  padding: 0 0 0 8px;
  border-left: 3px solid var(--el-color-warning-light-5);
  white-space: pre-wrap;
  font-family: Georgia, "Times New Roman", serif;
  line-height: 1.5;
}
.ai-quote.is-missing .ai-quote-none {
  margin-top: 2px;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}
</style>
