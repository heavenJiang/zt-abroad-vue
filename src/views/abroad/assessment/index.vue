<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="测评ID" prop="assessmentId">
        <el-input v-model="queryParams.assessmentId" placeholder="测评ID" clearable style="width: 120px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="assessmentStatus">
        <el-select v-model="queryParams.assessmentStatus" placeholder="全部状态" clearable style="width: 120px">
          <el-option v-for="dict in abr_assessment_status" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="渠道码" prop="channelCode">
        <el-input v-model="queryParams.channelCode" placeholder="渠道码" clearable style="width: 140px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="未成年" prop="isMinor">
        <el-select v-model="queryParams.isMinor" placeholder="全部" clearable style="width: 100px">
          <el-option v-for="dict in sys_yes_no" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="开始时间" style="width: 308px">
        <el-date-picker v-model="dateRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始日期" end-placeholder="结束日期" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="assessmentList">
      <el-table-column label="测评ID" align="center" prop="assessmentId" width="80" />
      <el-table-column label="问卷" align="left" min-width="170" :show-overflow-tooltip="true">
        <template #default="scope">
          <span class="mono">{{ scope.row.questionnaireCode }} v{{ scope.row.questionnaireVersion }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="assessmentStatus" width="90">
        <template #default="scope">
          <dict-tag :options="abr_assessment_status" :value="scope.row.assessmentStatus" />
        </template>
      </el-table-column>
      <el-table-column label="已答" align="right" prop="answerCount" width="60" class-name="num" />
      <el-table-column label="渠道" align="left" prop="channelCode" width="110" :show-overflow-tooltip="true">
        <template #default="scope">
          <span class="mono">{{ scope.row.channelCode }}</span>
        </template>
      </el-table-column>
      <el-table-column label="未成年" align="center" prop="isMinor" width="70">
        <template #default="scope">
          <el-tag v-if="scope.row.isMinor === 'Y'" type="warning" size="small">是</el-tag>
          <span v-else class="text-muted">否</span>
        </template>
      </el-table-column>
      <el-table-column label="院校层次" align="center" prop="undergradTier" width="90">
        <template #default="scope">
          <dict-tag v-if="scope.row.undergradTier" :options="abr_undergrad_tier" :value="scope.row.undergradTier" />
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="均分" align="right" prop="gpaPercent" width="70" class-name="num">
        <template #default="scope">{{ scope.row.gpaPercent ?? "-" }}</template>
      </el-table-column>
      <el-table-column label="雅思等效" align="right" prop="ieltsEquivTotal" width="85" class-name="num">
        <template #default="scope">{{ scope.row.ieltsEquivTotal ?? "-" }}</template>
      </el-table-column>
      <el-table-column label="开始时间" align="center" prop="createTime" width="160">
        <template #default="scope">
          <span>{{ parseTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="最近保存" align="center" prop="updateTime" width="160">
        <template #default="scope">
          <span>{{ parseTime(scope.row.updateTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="170" fixed="right" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="handleView(scope.row)" v-hasPermi="['abroad:assessment:query']">查看</el-button>
          <el-button link type="primary" icon="Refresh" v-if="scope.row.assessmentStatus !== 'terminated'" @click="handleNormalize(scope.row)" v-hasPermi="['abroad:assessment:normalize']">归一化</el-button>
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

    <!-- 测评详情：背景档案 + 答案 -->
    <el-drawer v-model="viewOpen" :title="viewTitle" size="780px" append-to-body>
      <template v-if="detail">
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="状态"><dict-tag :options="abr_assessment_status" :value="detail.assessmentStatus" /></el-descriptions-item>
          <el-descriptions-item label="问卷"><span class="mono">{{ detail.questionnaireCode }} v{{ detail.questionnaireVersion }}</span></el-descriptions-item>
          <el-descriptions-item label="断点"><span class="mono">{{ detail.currentScreen || "-" }}</span></el-descriptions-item>
          <el-descriptions-item label="渠道"><span class="mono">{{ detail.channelCode }}</span> {{ detail.clientPlatform }}</el-descriptions-item>
          <el-descriptions-item label="隐私政策">{{ detail.policyVersion }}，{{ parseTime(detail.consentTime) }}</el-descriptions-item>
          <el-descriptions-item label="未成年">{{ detail.isMinor === "Y" ? "是" : "否" }}</el-descriptions-item>
        </el-descriptions>

        <div class="block-title">
          背景档案
          <span v-if="profile" class="text-muted">（{{ parseTime(profile.normalizedTime) }} 归一化）</span>
          <el-button v-if="detail.assessmentStatus !== 'terminated'" link type="primary" icon="Refresh" @click="handleNormalize(detail, true)" v-hasPermi="['abroad:assessment:normalize']">重新归一化</el-button>
        </div>
        <el-empty v-if="!profile" description="尚未归一化" :image-size="60" />
        <template v-else>
          <el-alert v-for="w in warnings" :key="w" type="warning" :closable="false" show-icon class="mb4" :title="warningText(w)" />
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="院校层次"><dict-tag :options="abr_undergrad_tier" :value="profile.undergradTier" /></el-descriptions-item>
            <el-descriptions-item label="百分制均分">{{ profile.gpaPercent ?? "-" }}<span class="text-muted">（原始 {{ full.gpaRaw ?? "-" }} {{ full.gpaScale || "" }}）</span></el-descriptions-item>
            <el-descriptions-item label="专业排名">{{ profile.classRank || "-" }}</el-descriptions-item>
            <el-descriptions-item label="专业相关度">{{ relevanceText(profile.majorRelevance) }}<span v-if="full.majorRelevanceSource === 'self_reported'" class="text-muted">（自评）</span></el-descriptions-item>
            <el-descriptions-item label="雅思等效">{{ profile.ieltsEquivTotal ?? "-" }}<span class="text-muted"> / 小分 {{ profile.ieltsEquivMinSub ?? "-" }}</span></el-descriptions-item>
            <el-descriptions-item label="英语原始">{{ full.englishTest || profile.englishStatus || "-" }} {{ full.englishTotal ?? "" }}{{ full.englishEstimated ? "（预估）" : "" }}</el-descriptions-item>
            <el-descriptions-item label="标化">{{ profile.stdTestType || "-" }} {{ profile.stdTestTotal ?? "" }}</el-descriptions-item>
            <el-descriptions-item label="目标">{{ profile.targetCountries }} · {{ profile.targetDegree }} · {{ profile.targetField }}（{{ profile.targetFieldGroup }}）</el-descriptions-item>
            <el-descriptions-item label="距入学">{{ profile.monthsToIntake != null ? profile.monthsToIntake + " 个月" : "-" }}</el-descriptions-item>
            <el-descriptions-item label="科研">{{ full.researchLevel || "-" }} × {{ full.researchCount ?? 0 }}</el-descriptions-item>
            <el-descriptions-item label="实习 / 工作">{{ full.workMonths ?? 0 }} 个月 {{ full.workCompanyTier || "" }} {{ full.workRelevant === "yes" ? "相关" : "" }}</el-descriptions-item>
            <el-descriptions-item label="竞赛等">{{ full.awardsLevel || "-" }} × {{ full.awardsCount ?? 0 }}</el-descriptions-item>
          </el-descriptions>
        </template>

        <div class="block-title">答案（{{ answerRows.length }} 题）</div>
        <el-table :data="answerRows" size="small" border>
          <el-table-column label="题目" min-width="180" :show-overflow-tooltip="true">
            <template #default="scope">
              <div>{{ scope.row.title }}</div>
              <div class="mono text-muted">{{ scope.row.id }}</div>
            </template>
          </el-table-column>
          <el-table-column label="答案" min-width="260">
            <template #default="scope">
              <pre class="answer">{{ scope.row.value }}</pre>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="Assessment">
import { listAssessment, getAssessment, normalizeAssessment } from "@/api/abroad/assessment"
import { getQuestionnaire } from "@/api/abroad/questionnaire"

const { proxy } = getCurrentInstance()
const { abr_assessment_status, abr_undergrad_tier, sys_yes_no } = useDict("abr_assessment_status", "abr_undergrad_tier", "sys_yes_no")

// 归一化提示码（engine.ProfileNormalizer / SubScoreCalculator）
const WARNING_TEXT = {
  tier_unknown: "院校层次待核定：学生搜不到学校或学校不在层次表中，引擎暂按双非计算",
  gpa_low_confidence: "均分按“其他满分”比例换算，可信度低，请人工核对",
  gpa_unconverted: "均分无法换算（缺少分制或满分）",
  major_self_reported: "专业相关度为学生自评，请复核",
  prereq_unverified: "跨专业：先修课待核实",
  target_field_from_major: "目标方向未定，已按本科专业推荐",
  english_none: "英语未考且无预估分：不按语言门槛过滤，项目标“语言待考”",
  english_unmapped: "该英语考试暂无雅思对照表（如托福新分制），请人工判断"
}
const RELEVANCE_TEXT = { same: "本专业", related: "相近", cross: "跨专业" }

const assessmentList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const dateRange = ref([])
const viewOpen = ref(false)
const detail = ref(null)
const profile = ref(null)
const questionnaire = ref(null)

const data = reactive({
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    assessmentId: undefined,
    assessmentStatus: undefined,
    channelCode: undefined,
    isMinor: undefined
  }
})

const { queryParams } = toRefs(data)

const viewTitle = computed(() => detail.value ? "测评 #" + detail.value.assessmentId : "测评")

/** 完整背景档案（JSON） */
const full = computed(() => parseJson(profile.value && profile.value.profile, {}))

/** 提示码列表 */
const warnings = computed(() => parseJson(profile.value && profile.value.warnings, []))

/** 答案按问卷题目顺序列出（问卷不可见时按题目 id） */
const answerRows = computed(() => {
  const answers = parseJson(detail.value && detail.value.answers, {})
  const questions = (questionnaire.value && questionnaire.value.questions) || []
  const rows = []
  questions.forEach(q => {
    if (Object.prototype.hasOwnProperty.call(answers, q.id)) {
      rows.push({ id: q.id, title: q.title, value: formatValue(answers[q.id]) })
    }
  })
  Object.keys(answers).filter(id => !rows.some(r => r.id === id)).forEach(id => {
    rows.push({ id: id, title: id, value: formatValue(answers[id]) })
  })
  return rows
})

/** 解析 JSON 文本 */
function parseJson(text, fallback) {
  if (!text) {
    return fallback
  }
  try {
    return JSON.parse(text)
  } catch (e) {
    return fallback
  }
}

/** 答案显示：字符串原样，其他按 JSON */
function formatValue(v) {
  return typeof v === "string" ? v : JSON.stringify(v)
}

/** 提示码文字 */
function warningText(code) {
  return WARNING_TEXT[code] || code
}

/** 专业相关度文字 */
function relevanceText(v) {
  return RELEVANCE_TEXT[v] || v || "-"
}

/** 查询测评列表 */
function getList() {
  loading.value = true
  listAssessment(proxy.addDateRange(queryParams.value, dateRange.value)).then(response => {
    assessmentList.value = response.rows
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

/** 重置按钮操作 */
function resetQuery() {
  dateRange.value = []
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 查看详情 */
function handleView(row) {
  getAssessment(row.assessmentId).then(response => {
    detail.value = response.data
    profile.value = response.profile
    viewOpen.value = true
    if (!questionnaire.value || questionnaire.value.id !== response.data.questionnaireId) {
      questionnaire.value = null
      if (proxy.$auth.hasPermi("abroad:questionnaire:query")) {
        getQuestionnaire(response.data.questionnaireId).then(res => {
          const d = parseJson(res.data && res.data.definition, {})
          questionnaire.value = { id: response.data.questionnaireId, questions: d.questions || [] }
        })
      }
    }
  })
}

/** 重新归一化 */
function handleNormalize(row, inDrawer) {
  proxy.$modal.confirm("按当前换算表与院校层次重新计算测评 #" + row.assessmentId + " 的背景档案？").then(() => {
    return normalizeAssessment(row.assessmentId)
  }).then(response => {
    proxy.$modal.msgSuccess("已重新归一化")
    if (inDrawer) {
      profile.value = response.data
    }
    getList()
  }).catch(() => {})
}

getList()
</script>

<style scoped>
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
.mb4 {
  margin-bottom: 4px;
}
.block-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 0 8px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.answer {
  margin: 0;
  font-family: Menlo, Consolas, monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
