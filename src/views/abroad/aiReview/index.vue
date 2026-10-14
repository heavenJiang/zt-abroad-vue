<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="全部状态" clearable style="width: 130px">
          <el-option v-for="dict in abr_ai_review_status" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="Agent" prop="agentCode">
        <el-select v-model="queryParams.agentCode" placeholder="全部 Agent" clearable filterable allow-create style="width: 180px">
          <el-option v-for="a in agentOptions" :key="a.agentCode" :label="a.agentName + '（' + a.agentCode + '）'" :value="a.agentCode" />
        </el-select>
      </el-form-item>
      <el-form-item label="业务类型" prop="bizType">
        <el-input v-model="queryParams.bizType" placeholder="如 trial" clearable style="width: 140px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="reviewList">
      <el-table-column label="时间" align="center" prop="createTime" width="196" class-name="nowrap">
        <template #default="scope">
          <span class="num">{{ parseTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Agent" align="left" prop="agentCode" min-width="140" :show-overflow-tooltip="true">
        <template #default="scope">{{ agentLabel(scope.row.agentCode) }}</template>
      </el-table-column>
      <el-table-column label="业务" align="left" min-width="110" :show-overflow-tooltip="true">
        <template #default="scope">{{ bizLabel(scope.row) }}</template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status" width="90">
        <template #default="scope">
          <dict-tag :options="abr_ai_review_status" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="过滤命中" align="left" min-width="160">
        <template #default="scope">
          <el-tag v-for="(f, i) in parseFlags(scope.row.flags)" :key="i" type="danger" size="small" effect="plain" class="flag-tag">
            {{ f.label || f.type }}<span v-if="f.word">：{{ f.word }}</span>
          </el-tag>
          <span v-if="!parseFlags(scope.row.flags).length" class="text-muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="审核人" align="center" width="150">
        <template #default="scope">
          <div v-if="scope.row.reviewer">{{ scope.row.reviewer }}</div>
          <div v-if="scope.row.reviewTime" class="text-muted num">{{ parseTime(scope.row.reviewTime) }}</div>
          <span v-if="!scope.row.reviewer && !scope.row.reviewTime" class="text-muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="330" fixed="right" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="handleDetail(scope.row)" v-hasPermi="['abroad:aiReview:query']">详细</el-button>
          <template v-if="isOpen(scope.row)">
            <el-button link type="primary" icon="Check" @click="handleApprove(scope.row)" v-hasPermi="['abroad:aiReview:approve']">通过</el-button>
            <el-button link type="primary" icon="Close" @click="handleReject(scope.row)" v-hasPermi="['abroad:aiReview:reject']">驳回</el-button>
            <el-button link type="primary" icon="Edit" @click="handleEdit(scope.row)" v-hasPermi="['abroad:aiReview:edit']">修改后通过</el-button>
          </template>
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

    <!-- 审核详细 -->
    <el-drawer v-model="drawer" title="AI 审核详细" size="640px" append-to-body @closed="detail = {}">
      <div v-loading="detailLoading" class="drawer-body">
        <el-alert
          v-if="detail.status === 'sampled'"
          title="抽检记录：内容已按“直接展示 + 抽检”策略展示给使用者，审核结果用于质量跟踪"
          type="info"
          :closable="false"
          show-icon
          class="mb12"
        />
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="审核 ID"><span class="num">{{ detail.reviewId }}</span></el-descriptions-item>
          <el-descriptions-item label="状态"><dict-tag :options="abr_ai_review_status" :value="detail.status" /></el-descriptions-item>
          <el-descriptions-item label="Agent">{{ agentLabel(detail.agentCode) }}</el-descriptions-item>
          <el-descriptions-item label="提示词版本">{{ detail.promptVersion || "-" }}</el-descriptions-item>
          <el-descriptions-item label="业务">{{ bizLabel(detail) }}</el-descriptions-item>
          <el-descriptions-item label="生成时间"><span class="num">{{ parseTime(detail.createTime) }}</span></el-descriptions-item>
          <el-descriptions-item label="调用日志">
            <el-link v-if="detail.callId && $auth.hasPermi('abroad:aiCallLog:list')" type="primary" underline="never" @click="goCallLog(detail.callId)">#{{ detail.callId }}</el-link>
            <span v-else class="num">{{ detail.callId || "-" }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="审核人">
            {{ detail.reviewer || "-" }}<span v-if="detail.reviewTime" class="text-muted num">（{{ parseTime(detail.reviewTime) }}）</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.reason" label="原因" :span="2">{{ detail.reason }}</el-descriptions-item>
        </el-descriptions>

        <template v-if="detailFlags.length">
          <div class="block-title">过滤命中</div>
          <el-table :data="detailFlags" size="small" border>
            <el-table-column label="规则" prop="label" width="120" />
            <el-table-column label="命中词" prop="word" width="140" />
            <el-table-column label="位置" prop="path" :show-overflow-tooltip="true" />
          </el-table>
        </template>

        <div class="block-title">
          原始内容
          <el-tag type="info" size="small" effect="plain">AI 生成</el-tag>
          <el-tag v-if="isOpen(detail)" type="warning" size="small" effect="plain">待审核</el-tag>
          <el-tag v-else-if="detail.status" type="success" size="small" effect="plain">已审核</el-tag>
        </div>
        <pre class="json-box">{{ prettyJson(detail.content) || "（无内容）" }}</pre>

        <template v-if="detail.editedContent">
          <div class="block-title">修改后内容 <el-tag type="info" size="small" effect="plain">AI 生成，顾问修改</el-tag></div>
          <pre class="json-box">{{ prettyJson(detail.editedContent) }}</pre>
        </template>
      </div>
      <template #footer>
        <div v-if="isOpen(detail)">
          <el-button type="success" icon="Check" @click="handleApprove(detail)" v-hasPermi="['abroad:aiReview:approve']">通 过</el-button>
          <el-button type="danger" icon="Close" @click="handleReject(detail)" v-hasPermi="['abroad:aiReview:reject']">驳 回</el-button>
          <el-button type="primary" icon="Edit" @click="handleEdit(detail)" v-hasPermi="['abroad:aiReview:edit']">修改后通过</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 驳回 -->
    <el-dialog title="驳回 AI 内容" v-model="rejectOpen" width="520px" append-to-body>
      <el-form ref="rejectRef" :model="rejectForm" :rules="rejectRules" label-width="80px">
        <el-form-item label="驳回原因" prop="reason">
          <el-input v-model="rejectForm.reason" type="textarea" :rows="4" maxlength="500" show-word-limit placeholder="请说明驳回原因（必填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :loading="submitting" @click="submitReject">确 定</el-button>
          <el-button @click="rejectOpen = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 修改后通过 -->
    <el-dialog title="修改后通过" v-model="editOpen" width="720px" append-to-body>
      <el-form ref="editRef" :model="editForm" :rules="editRules" label-width="80px">
        <el-form-item label="内容" prop="editedContent">
          <el-input v-model="editForm.editedContent" type="textarea" :rows="14" class="json-input" placeholder="JSON 内容" @input="editError = ''" />
          <div class="form-hint">修改后的内容须是合法 JSON，并符合该 Agent 的输出结构（后端按提示词 schema 校验）</div>
        </el-form-item>
        <el-form-item label="修改原因" prop="reason">
          <el-input v-model="editForm.reason" type="textarea" :rows="2" maxlength="500" show-word-limit placeholder="可选" />
        </el-form-item>
      </el-form>
      <el-alert v-if="editError" :title="editError" type="error" :closable="false" show-icon />
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :loading="submitting" @click="submitEdit">确 定</el-button>
          <el-button @click="editOpen = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="AiReview">
import { listAiReview, getAiReview, approveAiReview, rejectAiReview, editAiReview } from "@/api/abroad/aiReview"
import { listAiAgent } from "@/api/abroad/aiAgent"

const { proxy } = getCurrentInstance()
const route = useRoute()
const router = useRouter()
const { abr_ai_review_status } = useDict("abr_ai_review_status")

const reviewList = ref([])
const agentOptions = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const drawer = ref(false)
const detailLoading = ref(false)
const detail = ref({})
const rejectOpen = ref(false)
const editOpen = ref(false)
const submitting = ref(false)
const editError = ref("")
// 当前驳回 / 修改的审核ID
const actionId = ref(undefined)

const data = reactive({
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    status: "pending",
    agentCode: undefined,
    bizType: undefined
  },
  rejectForm: {},
  editForm: {},
  rejectRules: {
    reason: [{ required: true, whitespace: true, message: "驳回原因不能为空", trigger: "blur" }]
  },
  editRules: {
    editedContent: [{ required: true, whitespace: true, message: "内容不能为空", trigger: "blur" }]
  }
})

const { queryParams, rejectForm, editForm, rejectRules, editRules } = toRefs(data)

const detailFlags = computed(() => parseFlags(detail.value.flags))

/** 待审核、抽检状态可以审核 */
function isOpen(row) {
  return !!row && (row.status === "pending" || row.status === "sampled")
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

/** 解析过滤命中 JSON（[{type,label,word,path}]，非法时返回空数组） */
function parseFlags(json) {
  if (!json) {
    return []
  }
  try {
    const arr = JSON.parse(json)
    return Array.isArray(arr) ? arr : []
  } catch (e) {
    return []
  }
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

/** 查询审核列表 */
function getList() {
  loading.value = true
  listAiReview(queryParams.value).then(response => {
    reviewList.value = response.rows
    total.value = response.total
    loading.value = false
  }).catch(() => {
    loading.value = false
  })
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作（状态回到待审核） */
function resetQuery() {
  proxy.resetForm("queryRef")
  queryParams.value.status = "pending"
  handleQuery()
}

/** 详细按钮操作 */
function handleDetail(row) {
  detail.value = { reviewId: row.reviewId }
  drawer.value = true
  loadDetail(row.reviewId)
}

/** 加载审核详细 */
function loadDetail(reviewId) {
  detailLoading.value = true
  getAiReview(reviewId).then(response => {
    detail.value = response.data || {}
    detailLoading.value = false
  }).catch(() => {
    detailLoading.value = false
  })
}

/** 操作完成后刷新列表与抽屉 */
function afterAction(reviewId) {
  getList()
  if (drawer.value && detail.value.reviewId == reviewId) {
    loadDetail(reviewId)
  }
}

/** 审核通过 */
function handleApprove(row) {
  const reviewId = row.reviewId
  const tip = row.status === "sampled" ? "确认将抽检记录 #" + reviewId + " 标记为审核通过？" : "确认通过审核记录 #" + reviewId + "？通过后内容将按业务流程发出。"
  proxy.$modal.confirm(tip).then(function() {
    return approveAiReview(reviewId)
  }).then(() => {
    proxy.$modal.msgSuccess("已通过")
    afterAction(reviewId)
  }).catch(() => {})
}

/** 驳回按钮操作 */
function handleReject(row) {
  actionId.value = row.reviewId
  rejectForm.value = { reason: undefined }
  proxy.resetForm("rejectRef")
  rejectOpen.value = true
}

/** 提交驳回 */
function submitReject() {
  proxy.$refs["rejectRef"].validate(valid => {
    if (!valid) {
      return
    }
    const reviewId = actionId.value
    submitting.value = true
    rejectAiReview(reviewId, { reason: rejectForm.value.reason.trim() }).then(() => {
      submitting.value = false
      rejectOpen.value = false
      proxy.$modal.msgSuccess("已驳回")
      afterAction(reviewId)
    }).catch(() => {
      submitting.value = false
    })
  })
}

/** 修改后通过按钮操作：预填原始内容 */
function handleEdit(row) {
  actionId.value = row.reviewId
  editError.value = ""
  editOpen.value = true
  editForm.value = { editedContent: "", reason: undefined }
  proxy.resetForm("editRef")
  getAiReview(row.reviewId).then(response => {
    editForm.value.editedContent = prettyJson(response.data && response.data.content)
  })
}

/** 提交修改后通过：先在本地校验 JSON，再由后端按输出结构校验 */
function submitEdit() {
  proxy.$refs["editRef"].validate(valid => {
    if (!valid) {
      return
    }
    let content
    try {
      content = JSON.parse(editForm.value.editedContent)
    } catch (e) {
      editError.value = "内容不是合法的 JSON：" + e.message
      return
    }
    const reviewId = actionId.value
    editError.value = ""
    submitting.value = true
    editAiReview(reviewId, { editedContent: JSON.stringify(content), reason: editForm.value.reason }).then(() => {
      submitting.value = false
      editOpen.value = false
      proxy.$modal.msgSuccess("已修改并通过")
      afterAction(reviewId)
    }).catch(e => {
      submitting.value = false
      // 后端结构校验失败的原因保留在弹窗内，便于对照修改
      editError.value = e && e.message ? e.message : ""
    })
  })
}

/** 打开调用日志详细 */
function goCallLog(callId) {
  drawer.value = false
  router.push({ path: "/ai/aiCallLog", query: { callId: callId } })
}

// 从调用日志带 reviewId 跳转过来时直接打开详细
watch(() => route.query.reviewId, reviewId => {
  if (reviewId && route.path === "/ai/aiReview") {
    handleDetail({ reviewId: reviewId })
  }
}, { immediate: true })

getAgents()
getList()
</script>

<style scoped>
:deep(td.nowrap .cell) {
  white-space: nowrap;
}
.num {
  font-variant-numeric: tabular-nums;
}
.text-muted {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.flag-tag {
  margin: 2px 4px 2px 0;
}
.drawer-body {
  padding: 0 4px;
}
.mb12 {
  margin-bottom: 12px;
}
.block-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 16px 0 6px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.json-box {
  margin: 0;
  max-height: 360px;
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
.form-hint {
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}
</style>
