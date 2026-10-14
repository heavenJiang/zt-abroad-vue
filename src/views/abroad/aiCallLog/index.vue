<template>
  <div class="app-container">
    <!-- 用量统计：所选日期范围内每日 / 每个 Agent 的调用次数、token 与费用 -->
    <div class="stat-panel" v-loading="statLoading">
      <div class="stat-head">
        <span class="stat-title">用量统计</span>
        <span class="stat-range">{{ stats.beginTime }} 至 {{ stats.endTime }}（北京时间，含首尾）</span>
      </div>
      <el-row :gutter="12">
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-label">调用次数</div>
            <div class="stat-value num">{{ formatInt(stats.total.calls) }}</div>
            <div class="stat-sub num">成功 {{ formatInt(stats.total.successCalls) }} · 错误 {{ formatInt(stats.total.errorCalls) }}</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-label">输入 token</div>
            <div class="stat-value num">{{ formatInt(stats.total.promptTokens) }}</div>
            <div class="stat-sub">提示词 + 输入</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-label">输出 token</div>
            <div class="stat-value num">{{ formatInt(stats.total.completionTokens) }}</div>
            <div class="stat-sub">模型生成</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-label">费用（元）</div>
            <div class="stat-value num">{{ formatCost(stats.total.cost) }}</div>
            <div class="stat-sub">按模型单价估算</div>
          </div>
        </el-col>
      </el-row>
      <el-row :gutter="12" class="mt12">
        <el-col :xs="24" :md="12">
          <el-table :data="stats.daily" size="small" border max-height="220" empty-text="所选范围内无调用">
            <el-table-column label="日期" prop="day" align="center" min-width="100" />
            <el-table-column label="次数" prop="calls" align="right" class-name="num" width="64" />
            <el-table-column label="错误" prop="errorCalls" align="right" class-name="num" width="64" />
            <el-table-column label="token 入 / 出" align="right" class-name="num" min-width="110">
              <template #default="scope">{{ formatInt(scope.row.promptTokens) }} / {{ formatInt(scope.row.completionTokens) }}</template>
            </el-table-column>
            <el-table-column label="费用（元）" align="right" class-name="num" min-width="90">
              <template #default="scope">{{ formatCost(scope.row.cost) }}</template>
            </el-table-column>
          </el-table>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-table :data="stats.agents" size="small" border max-height="220" empty-text="所选范围内无调用">
            <el-table-column label="Agent" align="left" min-width="120" :show-overflow-tooltip="true">
              <template #default="scope">{{ agentLabel(scope.row.agentCode) }}</template>
            </el-table-column>
            <el-table-column label="次数" prop="calls" align="right" class-name="num" width="64" />
            <el-table-column label="错误" prop="errorCalls" align="right" class-name="num" width="64" />
            <el-table-column label="token 入 / 出" align="right" class-name="num" min-width="110">
              <template #default="scope">{{ formatInt(scope.row.promptTokens) }} / {{ formatInt(scope.row.completionTokens) }}</template>
            </el-table-column>
            <el-table-column label="费用（元）" align="right" class-name="num" min-width="90">
              <template #default="scope">{{ formatCost(scope.row.cost) }}</template>
            </el-table-column>
          </el-table>
        </el-col>
      </el-row>
    </div>

    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="Agent" prop="agentCode">
        <el-select v-model="queryParams.agentCode" placeholder="全部 Agent" clearable filterable allow-create style="width: 180px">
          <el-option v-for="a in agentOptions" :key="a.agentCode" :label="a.agentName + '（' + a.agentCode + '）'" :value="a.agentCode" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="调用状态" clearable style="width: 130px">
          <el-option v-for="dict in abr_ai_call_status" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="调用日期" style="width: 308px">
        <el-date-picker
          v-model="dateRange"
          value-format="YYYY-MM-DD"
          type="daterange"
          range-separator="-"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
        ></el-date-picker>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <right-toolbar v-model:showSearch="showSearch" @queryTable="refreshAll"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="callLogList">
      <el-table-column label="时间" align="center" prop="createTime" width="196" class-name="nowrap">
        <template #default="scope">
          <span class="num">{{ parseTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Agent" align="left" prop="agentCode" min-width="140" :show-overflow-tooltip="true">
        <template #default="scope">{{ agentLabel(scope.row.agentCode) }}</template>
      </el-table-column>
      <el-table-column label="模型" align="left" prop="modelUsed" min-width="130" :show-overflow-tooltip="true">
        <template #default="scope">
          <span>{{ scope.row.modelUsed || "-" }}</span>
          <el-tag v-if="scope.row.fallbackUsed === 'Y'" type="warning" size="small" class="ml4">备用</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status" width="90">
        <template #default="scope">
          <dict-tag :options="abr_ai_call_status" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="token 入 / 出" align="right" width="110" class-name="num">
        <template #default="scope">{{ formatInt(scope.row.promptTokens) }} / {{ formatInt(scope.row.completionTokens) }}</template>
      </el-table-column>
      <el-table-column label="费用（元）" align="right" prop="cost" width="100" class-name="num">
        <template #default="scope">{{ formatCost(scope.row.cost) }}</template>
      </el-table-column>
      <el-table-column label="耗时(ms)" align="right" prop="latencyMs" width="85" class-name="num">
        <template #default="scope">{{ formatInt(scope.row.latencyMs) }}</template>
      </el-table-column>
      <el-table-column label="业务" align="left" min-width="110" :show-overflow-tooltip="true">
        <template #default="scope">{{ bizLabel(scope.row) }}</template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="80" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="handleDetail(scope.row)" v-hasPermi="['abroad:aiCallLog:query']">详细</el-button>
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

    <!-- 调用详细 -->
    <el-dialog title="AI 调用详细" v-model="open" width="820px" append-to-body @closed="detail = {}">
      <div v-loading="detailLoading">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="调用 ID"><span class="num">{{ detail.callId }}</span></el-descriptions-item>
          <el-descriptions-item label="时间"><span class="num">{{ parseTime(detail.createTime) }}</span></el-descriptions-item>
          <el-descriptions-item label="Agent">{{ agentLabel(detail.agentCode) }}</el-descriptions-item>
          <el-descriptions-item label="状态"><dict-tag :options="abr_ai_call_status" :value="detail.status" /></el-descriptions-item>
          <el-descriptions-item label="模型">
            {{ detail.modelUsed || "-" }}
            <el-tag v-if="detail.fallbackUsed === 'Y'" type="warning" size="small" class="ml4">已切换备用模型</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="尝试次数"><span class="num">{{ detail.attempts }}</span></el-descriptions-item>
          <el-descriptions-item label="提示词版本">{{ detail.promptVersion || "-" }}</el-descriptions-item>
          <el-descriptions-item label="提示词摘要">
            <span class="hash" :title="detail.promptHash">{{ detail.promptHash ? detail.promptHash.slice(0, 16) + "…" : "-" }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="token 入 / 出"><span class="num">{{ formatInt(detail.promptTokens) }} / {{ formatInt(detail.completionTokens) }}</span></el-descriptions-item>
          <el-descriptions-item label="费用 / 耗时"><span class="num">{{ formatCost(detail.cost) }} 元 / {{ formatInt(detail.latencyMs) }} ms</span></el-descriptions-item>
          <el-descriptions-item label="业务">{{ bizLabel(detail) }}</el-descriptions-item>
          <el-descriptions-item label="调用人">{{ detail.createBy || "-" }}</el-descriptions-item>
          <el-descriptions-item label="审核记录" :span="2">
            <el-link v-if="detail.reviewId" type="primary" underline="never" @click="goReview(detail.reviewId)">#{{ detail.reviewId }} 打开审核队列</el-link>
            <span v-else>-</span>
          </el-descriptions-item>
        </el-descriptions>

        <el-alert
          v-if="detail.errorMsg"
          :title="detail.errorMsg"
          :type="detail.status === 'error' || detail.status === 'filtered' ? 'error' : 'info'"
          :closable="false"
          show-icon
          class="mt12"
        />

        <div class="block-title">输入摘要 <span class="block-hint">已去标识化，姓名、手机号等为占位符</span></div>
        <pre class="json-box">{{ prettyJson(detail.inputSummary) || "（无）" }}</pre>

        <div class="block-title">输出 <el-tag type="info" size="small" effect="plain">AI 生成</el-tag></div>
        <pre class="json-box">{{ prettyJson(detail.output) || "（无输出）" }}</pre>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="open = false">关 闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="AiCallLog">
import { listAiCallLog, getAiCallLog, statAiCallLog } from "@/api/abroad/aiCallLog"
import { listAiAgent } from "@/api/abroad/aiAgent"

const { proxy } = getCurrentInstance()
const route = useRoute()
const router = useRouter()
const { abr_ai_call_status } = useDict("abr_ai_call_status")

const callLogList = ref([])
const agentOptions = ref([])
const open = ref(false)
const loading = ref(true)
const detailLoading = ref(false)
const statLoading = ref(false)
const showSearch = ref(true)
const total = ref(0)
const detail = ref({})
const dateRange = ref(defaultRange())
const stats = ref(emptyStats())

const data = reactive({
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    agentCode: undefined,
    status: undefined
  }
})

const { queryParams } = toRefs(data)

/** 默认日期范围：最近 7 天（北京时间，含今天） */
function defaultRange() {
  const day = 24 * 3600 * 1000
  const today = Date.now() + 8 * 3600 * 1000
  return [new Date(today - 6 * day).toISOString().slice(0, 10), new Date(today).toISOString().slice(0, 10)]
}

/** 空统计 */
function emptyStats() {
  return { beginTime: "", endTime: "", total: {}, daily: [], agents: [] }
}

/** 整数千分位 */
function formatInt(v) {
  return v == null || v === "" ? "0" : Number(v).toLocaleString("zh-CN")
}

/** 费用（元）：小额保留 6 位小数，大额保留 2 位 */
function formatCost(v) {
  const n = Number(v || 0)
  return n >= 100 ? n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : n.toFixed(n >= 1 ? 4 : 6)
}

/** Agent 显示名：名称（编码） */
function agentLabel(code) {
  if (!code) {
    return "-"
  }
  const a = agentOptions.value.find(item => item.agentCode === code)
  return a ? a.agentName + "（" + code + "）" : code
}

/** 业务类型 / 业务ID */
function bizLabel(row) {
  if (!row || !row.bizType) {
    return "-"
  }
  return row.bizId ? row.bizType + " / " + row.bizId : row.bizType
}

/** JSON 文本美化（解析失败时原样返回） */
function prettyJson(text) {
  if (text == null || text === "") {
    return ""
  }
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch (e) {
    return text
  }
}

/** 加载 Agent 下拉（无 Agent 查询权限时只显示编码） */
function getAgents() {
  if (!proxy.$auth.hasPermi("abroad:aiAgent:list")) {
    return
  }
  listAiAgent({ pageNum: 1, pageSize: 100 }).then(response => {
    agentOptions.value = response.rows
  })
}

/** 查询调用日志列表 */
function getList() {
  loading.value = true
  listAiCallLog(proxy.addDateRange({ ...queryParams.value }, dateRange.value)).then(response => {
    callLogList.value = response.rows
    total.value = response.total
    loading.value = false
  }).catch(() => {
    loading.value = false
  })
}

/** 查询用量统计（日期为空时后端默认最近 7 天） */
function getStats() {
  const range = Array.isArray(dateRange.value) ? dateRange.value : []
  statLoading.value = true
  statAiCallLog({ beginTime: range[0], endTime: range[1] }).then(response => {
    stats.value = response.data
    statLoading.value = false
  }).catch(() => {
    statLoading.value = false
  })
}

/** 刷新列表与统计 */
function refreshAll() {
  getList()
  getStats()
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  refreshAll()
}

/** 重置按钮操作 */
function resetQuery() {
  dateRange.value = defaultRange()
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 详细按钮操作 */
function handleDetail(row) {
  detail.value = { callId: row.callId }
  open.value = true
  detailLoading.value = true
  getAiCallLog(row.callId).then(response => {
    detail.value = response.data || {}
    detailLoading.value = false
  }).catch(() => {
    detailLoading.value = false
  })
}

/** 打开审核队列中的记录 */
function goReview(reviewId) {
  open.value = false
  router.push({ path: "/ai/aiReview", query: { reviewId: reviewId } })
}

// 从其他页面带 callId 跳转过来时直接打开详细
watch(() => route.query.callId, callId => {
  if (callId && route.path === "/ai/aiCallLog") {
    handleDetail({ callId: callId })
  }
}, { immediate: true })

getAgents()
refreshAll()
</script>

<style scoped>
:deep(td.nowrap .cell) {
  white-space: nowrap;
}
.num {
  font-variant-numeric: tabular-nums;
}
:deep(td.num .cell),
:deep(th.num .cell) {
  font-variant-numeric: tabular-nums;
}
.stat-panel {
  margin-bottom: 16px;
  padding: 12px 14px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-bg-color);
}
.stat-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 10px;
}
.stat-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.stat-range {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.stat-card {
  padding: 10px 14px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  margin-bottom: 6px;
}
.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.stat-value {
  margin-top: 4px;
  font-size: 22px;
  font-weight: 600;
  line-height: 28px;
  color: var(--el-text-color-primary);
}
.stat-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.mt12 {
  margin-top: 12px;
}
.ml4 {
  margin-left: 4px;
}
.hash {
  font-family: Menlo, Consolas, monospace;
  font-size: 12px;
}
.block-title {
  margin: 14px 0 6px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.block-hint {
  margin-left: 6px;
  font-size: 12px;
  font-weight: normal;
  color: var(--el-text-color-secondary);
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
</style>
