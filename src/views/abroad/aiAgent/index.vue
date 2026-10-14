<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="Agent" prop="agentCode">
        <el-input v-model="queryParams.agentCode" placeholder="编码或名称" clearable style="width: 180px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="审核策略" prop="reviewPolicy">
        <el-select v-model="queryParams.reviewPolicy" placeholder="全部策略" clearable style="width: 160px">
          <el-option v-for="dict in abr_ai_review_policy" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="Agent 状态" clearable style="width: 120px">
          <el-option v-for="dict in sys_normal_disable" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['abroad:aiAgent:edit']">修改</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="agentList" highlight-current-row @current-change="handleCurrentChange">
      <el-table-column label="编码" align="left" prop="agentCode" min-width="150" :show-overflow-tooltip="true">
        <template #default="scope">
          <span class="mono">{{ scope.row.agentCode }}</span>
        </template>
      </el-table-column>
      <el-table-column label="名称" align="left" prop="agentName" min-width="110" :show-overflow-tooltip="true" />
      <el-table-column label="审核策略" align="center" prop="reviewPolicy" width="140">
        <template #default="scope">
          <dict-tag :options="abr_ai_review_policy" :value="scope.row.reviewPolicy" />
        </template>
      </el-table-column>
      <el-table-column label="抽检比例" align="right" prop="sampleRate" width="85" class-name="num">
        <template #default="scope">{{ formatRate(scope.row) }}</template>
      </el-table-column>
      <el-table-column label="主模型 / 备用模型" align="left" min-width="170" :show-overflow-tooltip="true">
        <template #default="scope">
          <div class="mono">{{ scope.row.primaryModel }}</div>
          <div class="mono text-muted">{{ scope.row.backupModel || "无备用" }}</div>
        </template>
      </el-table-column>
      <el-table-column label="提示词" align="center" prop="promptVersion" width="100">
        <template #default="scope">
          <span class="mono">{{ scope.row.promptVersion }}</span>
          <el-tooltip v-if="scope.row.promptAvailable === false" content="提示词目录缺失或不完整，调用会失败" placement="top">
            <el-tag type="danger" size="small" class="ml4">缺失</el-tag>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column label="超时(ms)" align="right" prop="timeoutMs" width="90" class-name="num">
        <template #default="scope">{{ formatInt(scope.row.timeoutMs) }}</template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status" width="80">
        <template #default="scope">
          <dict-tag :options="sys_normal_disable" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="150" fixed="right" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['abroad:aiAgent:edit']">修改</el-button>
          <el-button link type="primary" icon="VideoPlay" @click="handleTrial(scope.row)" v-hasPermi="['abroad:aiAgent:edit']">试运行</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />

    <!-- 修改 Agent 配置 -->
    <el-dialog :title="title" v-model="open" width="720px" append-to-body>
      <el-form ref="agentRef" :model="form" :rules="rules" label-width="124px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="Agent 编码" prop="agentCode">
              <el-input v-model="form.agentCode" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Agent 名称" prop="agentName">
              <el-input v-model="form.agentName" placeholder="请输入名称" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="说明" prop="description">
              <el-input v-model="form.description" type="textarea" :rows="2" maxlength="500" show-word-limit placeholder="Agent 用途说明" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="审核策略" prop="reviewPolicy">
              <el-select v-model="form.reviewPolicy" placeholder="请选择审核策略" style="width: 100%" @change="handlePolicyChange">
                <el-option v-for="dict in abr_ai_review_policy" :key="dict.value" :label="dict.label" :value="dict.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="抽检比例" prop="sampleRate">
              <el-input-number v-model="form.sampleRate" controls-position="right" :min="0" :max="1" :step="0.05" :precision="4" style="width: 100%" />
              <div class="form-hint">0–1；仅“直接展示 + 抽检”生效，须大于 0</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="主模型" prop="primaryModel">
              <el-input v-model="form.primaryModel" placeholder="provider:model" maxlength="128" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="备用模型" prop="backupModel">
              <el-input v-model="form.backupModel" placeholder="provider:model，可空" maxlength="128" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="提示词版本" prop="promptVersion">
              <el-input v-model="form.promptVersion" placeholder="如 v1" maxlength="32" />
              <div class="form-hint">切换版本时 prompts/{{ form.agentCode }}/新版本/ 必须完整</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="超时(ms)" prop="timeoutMs">
              <el-input-number v-model="form.timeoutMs" controls-position="right" :min="1000" :max="300000" :step="1000" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="输出 token 上限" prop="maxOutputTokens">
              <el-input-number v-model="form.maxOutputTokens" controls-position="right" :min="1" :max="32000" :step="100" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="采样温度" prop="temperature">
              <el-input-number v-model="form.temperature" controls-position="right" :min="0" :max="2" :step="0.1" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio v-for="dict in sys_normal_disable" :key="dict.value" :value="dict.value">{{ dict.label }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500" placeholder="如失败时的兜底方式" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 试运行 -->
    <el-dialog :title="'试运行：' + trial.agentName + '（' + trial.agentCode + '）'" v-model="trialOpen" width="820px" append-to-body @closed="trialResult = null">
      <el-alert
        title="试运行经 AI 网关完整执行一次：调用所配置的模型（可能产生费用），记入调用日志（业务类型 trial），按审核策略可能进入审核队列。已停用的 Agent 也可试运行。"
        type="info"
        :closable="false"
        show-icon
        class="mb12"
      />
      <el-form ref="trialRef" :model="trial" label-width="90px">
        <el-form-item label="输入 JSON" prop="input">
          <el-input v-model="trial.input" type="textarea" :rows="8" class="json-input" placeholder="{}" @input="trialError = ''" />
        </el-form-item>
        <el-form-item label="已知姓名" prop="knownNames">
          <el-input v-model="trial.knownNames" placeholder="逗号分隔，去标识化时替换为占位符，返回后还原" />
        </el-form-item>
        <el-form-item label="参考事实" prop="facts">
          <el-input v-model="trial.facts" type="textarea" :rows="3" class="json-input" placeholder='可空；JSON 数组，如 [{"text": "…", "source": "https://…"}]' @input="trialError = ''" />
        </el-form-item>
      </el-form>
      <el-alert v-if="trialError" :title="trialError" type="error" :closable="false" show-icon class="mb12" />

      <div v-if="trialResult" class="trial-result">
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="状态"><dict-tag :options="abr_ai_call_status" :value="trialResult.status" /></el-descriptions-item>
          <el-descriptions-item label="模型">
            <span class="mono">{{ trialResult.modelUsed || "-" }}</span>
            <el-tag v-if="trialResult.fallbackUsed" type="warning" size="small" class="ml4">已切换备用</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="尝试次数"><span class="num">{{ trialResult.attempts }}</span></el-descriptions-item>
          <el-descriptions-item label="token 入 / 出"><span class="num">{{ formatInt(trialResult.promptTokens) }} / {{ formatInt(trialResult.completionTokens) }}</span></el-descriptions-item>
          <el-descriptions-item label="费用（元）"><span class="num">{{ formatCost(trialResult.cost) }}</span></el-descriptions-item>
          <el-descriptions-item label="耗时(ms)"><span class="num">{{ formatInt(trialResult.latencyMs) }}</span></el-descriptions-item>
          <el-descriptions-item label="调用日志">
            <el-link v-if="trialResult.callId && $auth.hasPermi('abroad:aiCallLog:list')" type="primary" underline="never" @click="goCallLog(trialResult.callId)">#{{ trialResult.callId }} 查看日志</el-link>
            <span v-else class="num">{{ trialResult.callId || "-" }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="审核记录" :span="2">
            <el-link v-if="trialResult.reviewId && $auth.hasPermi('abroad:aiReview:list')" type="primary" underline="never" @click="goReview(trialResult.reviewId)">#{{ trialResult.reviewId }} 打开审核队列</el-link>
            <span v-else class="num">{{ trialResult.reviewId || "-" }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="说明" :span="3">{{ trialResult.message || "-" }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="trialResult.flags && trialResult.flags.length" class="flag-line">
          过滤命中：
          <el-tag v-for="(f, i) in trialResult.flags" :key="i" type="danger" size="small" effect="plain" class="ml4">
            {{ f.label || f.type }}<span v-if="f.word">：{{ f.word }}</span>
          </el-tag>
        </div>
        <div class="block-title">
          输出
          <el-tag type="info" size="small" effect="plain">AI 生成</el-tag>
          <el-tag v-if="trialResult.status === 'pending_review'" type="warning" size="small" effect="plain">待审核</el-tag>
        </div>
        <pre class="json-box">{{ trialResult.output != null ? JSON.stringify(trialResult.output, null, 2) : "（无输出）" }}</pre>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" icon="VideoPlay" :loading="trialRunning" @click="submitTrial">运 行</el-button>
          <el-button @click="trialOpen = false">关 闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="AiAgent">
import { listAiAgent, getAiAgent, updateAiAgent, testAiAgent } from "@/api/abroad/aiAgent"

const { proxy } = getCurrentInstance()
const router = useRouter()
const { abr_ai_review_policy, abr_ai_call_status, sys_normal_disable } = useDict("abr_ai_review_policy", "abr_ai_call_status", "sys_normal_disable")

// 模型标识 provider:model（与后端 AiProviderRegistry 解析规则一致）
const MODEL_PATTERN = /^[^:\s]+:\S+$/
// 自测 Agent 的试运行样例（prompts/_selftest/v1/user.md：studentName、note、profile、facts）
const SELFTEST_SAMPLE = {
  input: { studentName: "韩梅梅", note: "韩梅梅 手机 13812345678，微信：hmm_2026", profile: { gpa: 86, ielts: 7.0 } },
  knownNames: "韩梅梅",
  facts: [{ text: "UCL MSc CS 雅思 6.5", source: "https://www.ucl.ac.uk/" }]
}

const agentList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const single = ref(true)
const currentRow = ref(null)
const total = ref(0)
const title = ref("")
const trialOpen = ref(false)
const trialRunning = ref(false)
const trialResult = ref(null)
const trialError = ref("")

/** 模型标识校验 */
function validateModel(required) {
  return (rule, value, callback) => {
    const v = value == null ? "" : String(value).trim()
    if (!v) {
      callback(required ? new Error("主模型不能为空") : undefined)
    } else if (!MODEL_PATTERN.test(v)) {
      callback(new Error("格式应为 provider:model，如 mock:default"))
    } else {
      callback()
    }
  }
}

/** 抽检比例校验：直接展示 + 抽检时必须大于 0 */
function validateSampleRate(rule, value, callback) {
  if (value != null && (value < 0 || value > 1)) {
    callback(new Error("抽检比例应在 0–1 之间"))
  } else if (form.value.reviewPolicy === "direct_sample" && !(value > 0)) {
    callback(new Error("审核策略为直接展示 + 抽检时，抽检比例应大于 0"))
  } else {
    callback()
  }
}

const data = reactive({
  form: {},
  trial: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    agentCode: undefined,
    reviewPolicy: undefined,
    status: undefined
  },
  rules: {
    agentName: [{ required: true, whitespace: true, message: "Agent 名称不能为空", trigger: "blur" }],
    reviewPolicy: [{ required: true, message: "审核策略不能为空", trigger: "change" }],
    sampleRate: [{ validator: validateSampleRate, trigger: "change" }],
    primaryModel: [{ required: true, validator: validateModel(true), trigger: "blur" }],
    backupModel: [{ validator: validateModel(false), trigger: "blur" }],
    promptVersion: [
      { required: true, whitespace: true, message: "提示词版本不能为空", trigger: "blur" },
      { pattern: /^\s*[A-Za-z0-9_-]{1,32}\s*$/, message: "提示词版本只能包含字母、数字、下划线、中划线", trigger: "blur" }
    ],
    timeoutMs: [{ required: true, message: "超时不能为空", trigger: "change" }],
    maxOutputTokens: [{ required: true, message: "输出 token 上限不能为空", trigger: "change" }],
    temperature: [{ required: true, message: "采样温度不能为空", trigger: "change" }]
  }
})

const { queryParams, form, rules, trial } = toRefs(data)

/** 整数千分位 */
function formatInt(v) {
  return v == null || v === "" ? "0" : Number(v).toLocaleString("zh-CN")
}

/** 费用（元）：小额保留 6 位小数，大额保留 2 位 */
function formatCost(v) {
  const n = Number(v || 0)
  return n >= 100 ? n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : n.toFixed(n >= 1 ? 4 : 6)
}

/** 抽检比例（百分比；非抽检策略显示 -） */
function formatRate(row) {
  if (row.reviewPolicy !== "direct_sample") {
    return "-"
  }
  return (Number(row.sampleRate || 0) * 100).toFixed(1).replace(/\.0$/, "") + "%"
}

/** 查询 Agent 列表 */
function getList() {
  loading.value = true
  listAiAgent(queryParams.value).then(response => {
    agentList.value = response.rows
    total.value = response.total
    loading.value = false
    currentRow.value = null
    single.value = true
  }).catch(() => {
    loading.value = false
  })
}

/** 取消按钮 */
function cancel() {
  open.value = false
  reset()
}

/** 表单重置 */
function reset() {
  form.value = {
    agentId: undefined,
    agentCode: undefined,
    agentName: undefined,
    description: undefined,
    reviewPolicy: undefined,
    sampleRate: 0,
    primaryModel: undefined,
    backupModel: undefined,
    promptVersion: undefined,
    timeoutMs: 30000,
    maxOutputTokens: 2000,
    temperature: 0.2,
    status: "0",
    remark: undefined
  }
  proxy.resetForm("agentRef")
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 单选当前行 */
function handleCurrentChange(row) {
  currentRow.value = row
  single.value = !row
}

/** 审核策略变化时重新校验抽检比例 */
function handlePolicyChange() {
  proxy.$refs["agentRef"].validateField("sampleRate").catch(() => {})
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const target = row && row.agentId ? row : currentRow.value
  if (!target) {
    return
  }
  getAiAgent(target.agentId).then(response => {
    const d = response.data
    form.value = {
      agentId: d.agentId,
      agentCode: d.agentCode,
      agentName: d.agentName,
      description: d.description,
      reviewPolicy: d.reviewPolicy,
      sampleRate: d.sampleRate == null ? 0 : Number(d.sampleRate),
      primaryModel: d.primaryModel,
      backupModel: d.backupModel,
      promptVersion: d.promptVersion,
      timeoutMs: d.timeoutMs,
      maxOutputTokens: d.maxOutputTokens,
      temperature: d.temperature == null ? 0 : Number(d.temperature),
      status: d.status,
      remark: d.remark
    }
    open.value = true
    title.value = "修改 Agent 配置"
  })
}

/** 提交按钮（修改运行参数影响线上调用，二次确认） */
function submitForm() {
  proxy.$refs["agentRef"].validate(valid => {
    if (!valid) {
      return
    }
    const payload = {
      ...form.value,
      primaryModel: form.value.primaryModel.trim(),
      backupModel: form.value.backupModel ? form.value.backupModel.trim() : "",
      promptVersion: form.value.promptVersion.trim()
    }
    proxy.$modal.confirm("确认修改 Agent「" + payload.agentCode + "」的配置？修改后立即对之后的调用生效。").then(function() {
      return updateAiAgent(payload)
    }).then(() => {
      proxy.$modal.msgSuccess("修改成功")
      open.value = false
      getList()
    }).catch(() => {})
  })
}

/** 试运行按钮操作：自测 Agent 预填样例，其余预填 {} */
function handleTrial(row) {
  const sample = row.agentCode === "_selftest"
  trial.value = {
    agentCode: row.agentCode,
    agentName: row.agentName,
    input: sample ? JSON.stringify(SELFTEST_SAMPLE.input, null, 2) : "{}",
    knownNames: sample ? SELFTEST_SAMPLE.knownNames : "",
    facts: sample ? JSON.stringify(SELFTEST_SAMPLE.facts, null, 2) : ""
  }
  trialResult.value = null
  trialError.value = ""
  trialOpen.value = true
}

/** 运行试运行 */
function submitTrial() {
  let input
  let facts
  try {
    input = JSON.parse(trial.value.input || "{}")
  } catch (e) {
    trialError.value = "输入不是合法的 JSON：" + e.message
    return
  }
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    trialError.value = "输入须是 JSON 对象，如 {}"
    return
  }
  if (trial.value.facts && trial.value.facts.trim()) {
    try {
      facts = JSON.parse(trial.value.facts)
    } catch (e) {
      trialError.value = "参考事实不是合法的 JSON：" + e.message
      return
    }
    if (!Array.isArray(facts) || facts.some(f => f === null || typeof f !== "object" || Array.isArray(f))) {
      trialError.value = "参考事实须是对象数组，如 [{\"text\": \"…\", \"source\": \"…\"}]"
      return
    }
  }
  const knownNames = (trial.value.knownNames || "").split(/[,，]/).map(s => s.trim()).filter(s => s)
  trialError.value = ""
  trialRunning.value = true
  testAiAgent(trial.value.agentCode, { input: input, knownNames: knownNames, facts: facts }).then(response => {
    trialResult.value = response.data
    trialRunning.value = false
  }).catch(() => {
    trialRunning.value = false
  })
}

/** 打开调用日志详细 */
function goCallLog(callId) {
  trialOpen.value = false
  router.push({ path: "/ai/aiCallLog", query: { callId: callId } })
}

/** 打开审核记录 */
function goReview(reviewId) {
  trialOpen.value = false
  router.push({ path: "/ai/aiReview", query: { reviewId: reviewId } })
}

getList()
</script>

<style scoped>
.num {
  font-variant-numeric: tabular-nums;
}
:deep(td.num .cell) {
  font-variant-numeric: tabular-nums;
}
.mono {
  font-family: Menlo, Consolas, monospace;
  font-size: 12px;
}
.text-muted {
  color: var(--el-text-color-secondary);
}
.ml4 {
  margin-left: 4px;
}
.mb12 {
  margin-bottom: 12px;
}
.form-hint {
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}
.flag-line {
  margin-top: 10px;
  font-size: 13px;
}
.block-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 14px 0 6px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.json-box {
  margin: 0;
  max-height: 260px;
  overflow: auto;
  padding: 10px 12px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  font-family: Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
.json-input :deep(textarea) {
  font-family: Menlo, Consolas, monospace;
  font-size: 12px;
}
</style>
