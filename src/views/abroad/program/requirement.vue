<template>
  <div class="app-container requirement-page">
    <el-page-header @back="goBack" title="返回">
      <template #content>
        <span class="program-title">{{ program.programNameEn || "申请要求" }}</span>
        <span class="program-sub">{{ program.programName }}</span>
      </template>
    </el-page-header>
    <div class="program-meta">
      <dict-tag :options="abr_country" :value="program.country" class="inline-tag" />
      <span>{{ program.schoolName }} / {{ program.schoolNameEn }}</span>
      <dict-tag :options="abr_degree" :value="program.degree" class="inline-tag" />
      <span class="program-verified">
        最近核对：{{ program.verifiedTime ? parseTime(program.verifiedTime, "{y}-{m}-{d} {h}:{i}") + "（" + (program.verifiedBy || "-") + "）" : "未核对" }}
      </span>
    </div>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAddSeason(false)" v-hasPermi="['abroad:program:edit']">新增申请季</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="CopyDocument" :disabled="!editors.length" @click="handleAddSeason(true)" v-hasPermi="['abroad:program:edit']">从上一季复制</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="!current" @click="handleDelete" v-hasPermi="['abroad:program:edit']">删除本季</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="MagicStick" :disabled="!current" @click="openAiPrefill" v-hasPermi="['abroad:program:edit']">AI 预填</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="primary" icon="Check" :disabled="!current || aiPendingCount > 0 || aiRunning" :loading="saving" @click="submitForm" v-hasPermi="['abroad:program:edit']">保存本季</el-button>
      </el-col>
      <el-col :span="1.5" v-if="aiPendingCount > 0">
        <span class="ai-pending-hint">还有 {{ aiPendingCount }} 个 AI 预填字段未确认</span>
      </el-col>
    </el-row>

    <div v-loading="loading">
      <el-empty v-if="!editors.length" description="还没有申请要求，点“新增申请季”开始录入" />
      <el-tabs v-else v-model="activeUid" type="card">
        <el-tab-pane v-for="ed in editors" :key="ed.uid" :name="ed.uid">
          <template #label>
            <span>{{ seasonLabel(ed.season) }}</span>
            <el-tag v-if="!ed.requirementId" size="small" type="warning" class="tab-tag">未保存</el-tag>
          </template>
        </el-tab-pane>
      </el-tabs>

      <ai-prefill-panel
        v-if="aiOpen && current"
        :program="program"
        :result="aiResult"
        :current-values="aiCurrentValues"
        :target-matches="aiTargetMatches"
        :initial-url="program.website || ''"
        @result="onAiResult"
        @apply="applyAiField"
        @running="v => (aiRunning = v)"
        @program-updated="getProgramInfo"
        @close="aiOpen = false"
      />

      <el-form v-if="current" :key="current.uid" ref="requirementRef" :model="current" :rules="rules" label-width="110px" class="requirement-form">
        <el-row>
          <el-col :span="8">
            <el-form-item label="申请季" prop="season">
              <el-input v-model="current.season" placeholder="如 2027-fall" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="current.status">
                <el-radio v-for="dict in sys_normal_disable" :key="dict.value" :value="dict.value">{{ dict.label }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 1 均分要求 -->
        <el-divider content-position="left">均分要求</el-divider>
        <el-row>
          <el-col :span="8" v-for="dict in abr_undergrad_tier" :key="dict.value">
            <el-form-item :label="dict.label">
              <el-input-number v-model="current.gpa[dict.value]" controls-position="right" :min="0" :max="100" :precision="1" placeholder="未要求" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="16">
            <el-form-item label="不接受的层次">
              <el-select v-model="current.tiersNotAccepted" multiple placeholder="不限" style="width: 100%">
                <el-option v-for="dict in abr_undergrad_tier" :key="dict.value" :label="dict.label" :value="dict.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <div class="source-block">
          <source-field v-for="f in GROUPS.gpa" :key="f" v-bind="sourceProps(f)" @edit="clearError" />
        </div>

        <!-- 2 语言 -->
        <el-divider content-position="left">语言</el-divider>
        <el-row>
          <el-col :span="8">
            <el-form-item label="雅思总分">
              <el-input-number v-model="current.ieltsOverall" controls-position="right" :min="0" :max="9" :step="0.5" :precision="1" placeholder="未要求" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="雅思小分" :error="current.fieldErrors.ieltsMinSub">
              <el-input-number v-model="current.ieltsMinSub" controls-position="right" :min="0" :max="9" :step="0.5" :precision="1" placeholder="未要求" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="其他语言考试" :error="current.fieldErrors.otherLanguage">
          <el-table :data="current.otherLangs" size="small" border class="inner-table">
            <el-table-column label="考试" width="160">
              <template #default="scope">
                <el-select v-model="scope.row.test" placeholder="请选择" size="small">
                  <el-option v-for="t in LANGUAGE_TESTS" :key="t.value" :label="t.label" :value="t.value" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="总分" width="120">
              <template #default="scope">
                <el-input-number v-model="scope.row.overall" size="small" controls-position="right" :min="0" :precision="1" style="width: 100%" />
              </template>
            </el-table-column>
            <el-table-column label="单项最低" width="120">
              <template #default="scope">
                <el-input-number v-model="scope.row.minSub" size="small" controls-position="right" :min="0" :precision="1" style="width: 100%" />
              </template>
            </el-table-column>
            <el-table-column label="等级" width="120">
              <template #default="scope">
                <el-input v-model="scope.row.level" size="small" placeholder="如 N2 / B2" />
              </template>
            </el-table-column>
            <el-table-column label="说明" min-width="160">
              <template #default="scope">
                <el-input v-model="scope.row.note" size="small" placeholder="可选" />
              </template>
            </el-table-column>
            <el-table-column label="" width="50" align="center">
              <template #default="scope">
                <el-button link type="danger" icon="Delete" @click="current.otherLangs.splice(scope.$index, 1)" />
              </template>
            </el-table-column>
          </el-table>
          <el-button size="small" icon="Plus" class="mt8" @click="current.otherLangs.push(emptyLangRow())">添加语言考试</el-button>
        </el-form-item>
        <div class="source-block">
          <source-field v-for="f in GROUPS.language" :key="f" v-bind="sourceProps(f)" @edit="clearError" />
          <el-button link type="primary" size="small" @click="syncSources(GROUPS.language)">把第一条来源应用到本组空白来源</el-button>
        </div>

        <!-- 3 标化 -->
        <el-divider content-position="left">标化</el-divider>
        <el-row>
          <el-col :span="24">
            <el-form-item label="GRE / GMAT">
              <el-radio-group v-model="current.testRequirement">
                <el-radio v-for="dict in abr_test_requirement" :key="dict.value" :value="dict.value">{{ dict.label }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="GRE 总分">
              <el-input-number v-model="current.test.gre" controls-position="right" :min="260" :max="340" placeholder="未要求" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="GMAT Focus">
              <el-input-number v-model="current.test.gmat_focus" controls-position="right" :min="205" :max="805" placeholder="未要求" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="GMAT 旧版">
              <el-input-number v-model="current.test.gmat_classic" controls-position="right" :min="200" :max="800" placeholder="未要求" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <div class="source-block">
          <source-field v-for="f in GROUPS.test" :key="f" v-bind="sourceProps(f)" @edit="clearError" />
        </div>

        <!-- 4 先修课 -->
        <el-divider content-position="left">先修课</el-divider>
        <el-form-item label="先修课要求">
          <el-input v-model="current.prerequisites" type="textarea" :rows="2" maxlength="1000" show-word-limit placeholder="如：微积分、线性代数、统计学" />
        </el-form-item>
        <el-form-item label="硬性要求">
          <el-switch v-model="current.prerequisitesRequired" active-value="Y" inactive-value="N" active-text="缺课不能申请" inactive-text="建议具备" />
        </el-form-item>
        <div class="source-block">
          <source-field v-for="f in GROUPS.prerequisites" :key="f" v-bind="sourceProps(f)" @edit="clearError" />
        </div>

        <!-- 5 工作年限、跨专业 -->
        <el-divider content-position="left">工作年限、跨专业</el-divider>
        <el-row>
          <el-col :span="8">
            <el-form-item label="工作年限（年）">
              <el-input-number v-model="current.workYears" controls-position="right" :min="0" :max="30" placeholder="不要求" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="16">
            <el-form-item label="跨专业">
              <el-radio-group v-model="current.acceptCrossMajor">
                <el-radio v-for="dict in abr_cross_major" :key="dict.value" :value="dict.value">{{ dict.label }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <div class="source-block">
          <source-field v-for="f in GROUPS.other" :key="f" v-bind="sourceProps(f)" @edit="clearError" />
        </div>

        <!-- 6 截止日 -->
        <el-divider content-position="left">截止日</el-divider>
        <el-form-item label="滚动录取">
          <el-switch v-model="current.rolling" />
        </el-form-item>
        <el-form-item label="轮次" :error="current.fieldErrors.deadlines">
          <el-table :data="current.rounds" size="small" border class="inner-table rounds-table">
            <el-table-column label="轮次名称" width="200">
              <template #default="scope">
                <el-input v-model="scope.row.name" size="small" placeholder="如 R1" />
              </template>
            </el-table-column>
            <el-table-column label="截止日期" width="200">
              <template #default="scope">
                <el-date-picker v-model="scope.row.date" type="date" size="small" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
              </template>
            </el-table-column>
            <el-table-column label="" width="50" align="center">
              <template #default="scope">
                <el-button link type="danger" icon="Delete" @click="current.rounds.splice(scope.$index, 1)" />
              </template>
            </el-table-column>
          </el-table>
          <el-button size="small" icon="Plus" class="mt8" @click="addRound">添加轮次</el-button>
        </el-form-item>
        <div class="source-block">
          <source-field v-for="f in GROUPS.deadlines" :key="f" v-bind="sourceProps(f)" @edit="clearError" />
        </div>

        <el-divider />
        <el-form-item label="备注">
          <el-input v-model="current.remark" type="textarea" :rows="2" placeholder="请输入内容" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Check" :loading="saving" :disabled="aiPendingCount > 0 || aiRunning" @click="submitForm" v-hasPermi="['abroad:program:edit']">保存本季</el-button>
          <span v-if="aiPendingCount > 0" class="ai-pending-hint">还有 {{ aiPendingCount }} 个 AI 预填字段未确认，确认、修改或忽略后才能保存</span>
          <span v-else class="save-hint">带 <span class="required-star">*</span> 的来源：对应字段有值时必须填写官网链接</span>
        </el-form-item>
      </el-form>
    </div>

    <!-- 新增 / 复制申请季对话框 -->
    <el-dialog :title="seasonDialog.copy ? '从上一季复制' : '新增申请季'" v-model="seasonDialog.open" width="440px" append-to-body>
      <el-form label-width="90px">
        <el-form-item label="入学年份">
          <el-input-number v-model="seasonDialog.year" controls-position="right" :min="2020" :max="2099" style="width: 100%" />
        </el-form-item>
        <el-form-item label="入学季">
          <el-select v-model="seasonDialog.intake" style="width: 100%">
            <el-option v-for="dict in abr_intake" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="复制自">
          <el-select v-model="seasonDialog.copyFrom" clearable placeholder="不复制（空白）" style="width: 100%">
            <el-option v-for="ed in editors" :key="ed.uid" :label="seasonLabel(ed.season)" :value="ed.uid" />
          </el-select>
        </el-form-item>
        <div v-if="seasonDialog.copyFrom" class="save-hint">复制全部字段与来源链接；保存时记为本人核对，请先逐项核对官网。</div>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="confirmAddSeason">确 定</el-button>
          <el-button @click="seasonDialog.open = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="ProgramRequirement">
import { getProgram } from "@/api/abroad/program"
import { listRequirement, addRequirement, updateRequirement, delRequirement } from "@/api/abroad/requirement"
import SourceField from "./sourceField"
import AiPrefillPanel from "./aiPrefillPanel"

const { proxy } = getCurrentInstance()
const route = useRoute()
const {
  abr_country, abr_degree, abr_undergrad_tier, abr_test_requirement, abr_cross_major, abr_intake, sys_normal_disable
} = useDict(
  "abr_country", "abr_degree", "abr_undergrad_tier", "abr_test_requirement", "abr_cross_major", "abr_intake", "sys_normal_disable"
)

/**
 * 其他语言考试（固定列表，与后端 otherLanguage 的键一致）。
 * otherLanguage 序列化形状：{ "<考试>": { overall?, minSub?, level?, note? } }，只写有值的键，例如
 *   {"toefl":{"overall":90,"minSub":20},"jlpt":{"level":"N2"},"testdaf":{"level":"TDN4","note":"每项 4 分"}}
 */
const LANGUAGE_TESTS = [
  { value: "toefl", label: "TOEFL iBT" },
  { value: "pte", label: "PTE Academic" },
  { value: "duolingo", label: "Duolingo" },
  { value: "jlpt", label: "JLPT" },
  { value: "topik", label: "TOPIK" },
  { value: "testdaf", label: "TestDaF" },
  { value: "dsh", label: "DSH" },
  { value: "goethe", label: "Goethe" }
]

/** 关键字段：有值时必须附来源链接（与后端 AbrProgramServiceImpl.KEY_FIELDS 一致） */
const KEY_FIELDS = {
  minGpa: "最低均分",
  ieltsOverall: "雅思总分",
  ieltsMinSub: "雅思小分",
  otherLanguage: "其他语言要求",
  deadlines: "截止日"
}

/** 可附来源的字段名称（与后端 SOURCE_FIELDS 一致） */
const FIELD_LABELS = {
  minGpa: "最低均分",
  tiersNotAccepted: "不接受层次",
  ieltsOverall: "雅思总分",
  ieltsMinSub: "雅思小分",
  otherLanguage: "其他语言",
  testRequirement: "标化要求",
  testDetail: "标化分数",
  prerequisites: "先修课",
  workYears: "工作年限",
  acceptCrossMajor: "跨专业",
  deadlines: "截止日"
}

/** 表单分组 → 组内字段（来源控件按组显示） */
const GROUPS = {
  gpa: ["minGpa", "tiersNotAccepted"],
  language: ["ieltsOverall", "ieltsMinSub", "otherLanguage"],
  test: ["testRequirement", "testDetail"],
  prerequisites: ["prerequisites"],
  other: ["workYears", "acceptCrossMajor"],
  deadlines: ["deadlines"]
}

const program = ref({})
const editors = ref([])
const activeUid = ref("")
const loading = ref(false)
const saving = ref(false)
const programId = ref(Number(route.params.programId))
let uidSeq = 0

/** AI 预填：面板开关、结果（含目标申请季 targetUid）、进行中 */
const aiOpen = ref(false)
const aiResult = ref(null)
const aiRunning = ref(false)

const data = reactive({
  seasonDialog: { open: false, copy: false, year: undefined, intake: "fall", copyFrom: undefined },
  rules: {
    season: [
      { required: true, message: "申请季不能为空", trigger: "blur" },
      { pattern: /^20\d{2}-(fall|spring|summer|winter)$/, message: "格式应为 年份-入学季，如 2027-fall", trigger: "blur" }
    ]
  }
})

const { seasonDialog, rules } = toRefs(data)

const current = computed(() => editors.value.find(ed => ed.uid === activeUid.value))

/** 当前申请季是否为 AI 预填的目标申请季 */
const aiTargetMatches = computed(() => !aiResult.value || (!!current.value && aiResult.value.targetUid === current.value.uid))

/** 当前申请季还未处理（确认 / 修改 / 忽略）的 AI 预填字段数 */
const aiPendingCount = computed(() => {
  if (!aiResult.value || !current.value || aiResult.value.targetUid !== current.value.uid) {
    return 0
  }
  return aiResult.value.fields.filter(f => f.target === "requirement" && f.state === "pending").length
})

/** 当前申请季各字段的取值（AI 预填面板显示“当前”值用） */
const aiCurrentValues = computed(() => {
  const ed = current.value
  return ed ? { ...toValues(ed), prerequisitesRequired: ed.prerequisitesRequired } : {}
})

/** 空值判断（null / undefined / 空串） */
function isBlank(v) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "")
}

/** 解析 JSON 字符串（空或非法时返回 null） */
function parseJson(json) {
  if (isBlank(json)) {
    return null
  }
  try {
    return JSON.parse(json)
  } catch (e) {
    return null
  }
}

/** 申请季显示名：2027-fall → 2027 秋季 */
function seasonLabel(season) {
  if (!season || season.indexOf("-") < 0) {
    return season || "（未命名）"
  }
  const [year, intake] = season.split("-")
  const dict = abr_intake.value.find(d => d.value === intake)
  return year + " " + (dict ? dict.label : intake)
}

/** 空来源 */
function emptySource() {
  return { sourceUrl: "", quote: "", origin: "0", verifiedBy: undefined, verifiedTime: undefined }
}

/** 空语言考试行 */
function emptyLangRow() {
  return { test: undefined, overall: null, minSub: null, level: "", note: "" }
}

/** 后端申请要求 → 编辑模型 */
function toEditor(r) {
  const gpa = parseJson(r.minGpa) || {}
  const lang = parseJson(r.otherLanguage) || {}
  const test = parseJson(r.testDetail) || {}
  const dl = parseJson(r.deadlines) || {}
  const sources = {}
  Object.keys(FIELD_LABELS).forEach(f => {
    sources[f] = emptySource()
  })
  ;(r.sources || []).forEach(s => {
    if (sources[s.fieldName]) {
      Object.assign(sources[s.fieldName], {
        sourceUrl: s.sourceUrl || "",
        quote: s.quote || "",
        origin: s.origin || "0",
        verifiedBy: s.verifiedBy,
        verifiedTime: s.verifiedTime
      })
    }
  })
  return {
    uid: "ed" + (++uidSeq),
    requirementId: r.requirementId,
    programId: programId.value,
    season: r.season,
    status: r.status || "0",
    remark: r.remark,
    gpa: { ...gpa },
    tiersNotAccepted: isBlank(r.tiersNotAccepted) ? [] : r.tiersNotAccepted.split(",").map(t => t.trim()),
    ieltsOverall: r.ieltsOverall ?? null,
    ieltsMinSub: r.ieltsMinSub ?? null,
    otherLangs: Object.keys(lang).map(k => ({
      test: k,
      overall: lang[k].overall ?? null,
      minSub: lang[k].minSub ?? null,
      level: lang[k].level ?? "",
      note: lang[k].note ?? ""
    })),
    testRequirement: r.testRequirement || "none",
    // 保留未知键，只覆盖 gre / gmat_focus / gmat_classic
    test: { ...test, gre: test.gre ?? null, gmat_focus: test.gmat_focus ?? null, gmat_classic: test.gmat_classic ?? null },
    prerequisites: r.prerequisites || "",
    prerequisitesRequired: r.prerequisitesRequired || "N",
    workYears: r.workYears ?? null,
    acceptCrossMajor: r.acceptCrossMajor || "2",
    rolling: !!dl.rolling,
    rounds: (dl.rounds || []).map(x => ({ name: x.name || "", date: x.date || "" })),
    sources: sources,
    sourceErrors: {},
    fieldErrors: {},
    // AI 预填“确认”时的取值快照：保存时取值已被改动的，来源方式改为人工
    aiConfirmed: {}
  }
}

/** 去掉空值后的对象；全空返回 null */
function compactObject(obj) {
  const out = {}
  Object.keys(obj).forEach(k => {
    if (!isBlank(obj[k])) {
      out[k] = typeof obj[k] === "string" ? obj[k].trim() : obj[k]
    }
  })
  return Object.keys(out).length ? out : null
}

/** 编辑模型 → 字段值（空值一律为 null，后端据此清空） */
function toValues(ed) {
  const gpa = {}
  Object.keys(ed.gpa).forEach(k => {
    if (!isBlank(ed.gpa[k])) {
      gpa[k] = ed.gpa[k]
    }
  })
  const lang = {}
  ed.otherLangs.forEach(row => {
    if (!row.test) {
      return
    }
    const v = compactObject({ overall: row.overall, minSub: row.minSub, level: row.level, note: row.note })
    if (v) {
      lang[row.test] = v
    }
  })
  const test = compactObject(ed.test)
  const rounds = ed.rounds.filter(x => !isBlank(x.name) || !isBlank(x.date)).map(x => ({ name: (x.name || "").trim(), date: x.date }))
  return {
    minGpa: Object.keys(gpa).length ? JSON.stringify(gpa) : null,
    tiersNotAccepted: ed.tiersNotAccepted.length ? ed.tiersNotAccepted.join(",") : null,
    ieltsOverall: isBlank(ed.ieltsOverall) ? null : ed.ieltsOverall,
    ieltsMinSub: isBlank(ed.ieltsMinSub) ? null : ed.ieltsMinSub,
    otherLanguage: Object.keys(lang).length ? JSON.stringify(lang) : null,
    testRequirement: ed.testRequirement || null,
    testDetail: test ? JSON.stringify(test) : null,
    prerequisites: isBlank(ed.prerequisites) ? null : ed.prerequisites.trim(),
    workYears: isBlank(ed.workYears) ? null : ed.workYears,
    acceptCrossMajor: ed.acceptCrossMajor || null,
    // 截止日形状：{"rolling":bool,"rounds":[{"name":"R1","date":"2027-01-15"}]}；不滚动且无轮次时为 null
    deadlines: ed.rolling || rounds.length ? JSON.stringify({ rolling: ed.rolling, rounds: rounds }) : null
  }
}

/** 编辑模型 → 提交体 */
function toPayload(ed) {
  const values = toValues(ed)
  const sources = []
  Object.keys(FIELD_LABELS).forEach(f => {
    const s = ed.sources[f]
    if (!isBlank(values[f]) && !isBlank(s.sourceUrl)) {
      let origin = s.origin || "0"
      if (origin === "1" && ed.aiConfirmed && ed.aiConfirmed[f] !== undefined && ed.aiConfirmed[f] !== values[f]) {
        origin = "0"
      }
      sources.push({ fieldName: f, sourceUrl: s.sourceUrl.trim(), quote: isBlank(s.quote) ? null : s.quote.trim(), origin: origin })
    }
  })
  return {
    requirementId: ed.requirementId,
    programId: programId.value,
    season: (ed.season || "").trim(),
    status: ed.status,
    remark: isBlank(ed.remark) ? null : ed.remark,
    prerequisitesRequired: ed.prerequisitesRequired,
    ...values,
    sources: sources
  }
}

/** 来源控件属性 */
function sourceProps(field) {
  const ed = current.value
  return {
    field: field,
    source: ed.sources[field],
    label: FIELD_LABELS[field],
    required: !!KEY_FIELDS[field],
    hasValue: !isBlank(toValues(ed)[field]),
    error: ed.sourceErrors[field] || ""
  }
}

/** 修改来源后清除该字段的错误 */
function clearError(field) {
  if (current.value) {
    delete current.value.sourceErrors[field]
  }
}

/** 把组内第一条有链接的来源复制到同组其他空白来源 */
function syncSources(fields) {
  const ed = current.value
  const first = fields.map(f => ed.sources[f]).find(s => !isBlank(s.sourceUrl))
  if (!first) {
    proxy.$modal.msgWarning("本组还没有填写来源链接")
    return
  }
  fields.forEach(f => {
    const s = ed.sources[f]
    if (isBlank(s.sourceUrl)) {
      s.sourceUrl = first.sourceUrl
      s.quote = first.quote
      s.origin = "0"
      delete ed.sourceErrors[f]
    }
  })
}

/** 添加截止轮次 */
function addRound() {
  current.value.rounds.push({ name: "R" + (current.value.rounds.length + 1), date: "" })
}

/** 前端校验（与后端规则一致）：关键字段有值必须有 http(s) 来源链接；其他字段的来源链接也须为 http(s) */
function validateEditor(ed) {
  const values = toValues(ed)
  const sourceErrors = {}
  const fieldErrors = {}
  Object.keys(FIELD_LABELS).forEach(f => {
    if (isBlank(values[f])) {
      return
    }
    const url = (ed.sources[f].sourceUrl || "").trim()
    if (!url) {
      if (KEY_FIELDS[f]) {
        sourceErrors[f] = "「" + KEY_FIELDS[f] + "」已填写，必须填写来源链接"
      }
    } else if (!/^https?:\/\//i.test(url)) {
      sourceErrors[f] = "来源链接应以 http:// 或 https:// 开头"
    }
  })
  if (values.ieltsOverall != null && values.ieltsMinSub != null && values.ieltsMinSub > values.ieltsOverall) {
    fieldErrors.ieltsMinSub = "雅思小分要求不能高于总分要求"
  }
  const tests = ed.otherLangs.filter(r => r.test).map(r => r.test)
  if (new Set(tests).size !== tests.length) {
    fieldErrors.otherLanguage = "同一种语言考试只能填写一行"
  } else if (ed.otherLangs.some(r => !r.test && (r.overall != null || r.minSub != null || !isBlank(r.level)))) {
    fieldErrors.otherLanguage = "请选择语言考试类型"
  }
  if (ed.rounds.some(x => isBlank(x.name) !== isBlank(x.date))) {
    fieldErrors.deadlines = "每个轮次都要填写名称和日期"
  }
  ed.sourceErrors = sourceErrors
  ed.fieldErrors = fieldErrors
  return Object.keys(sourceErrors).length === 0 && Object.keys(fieldErrors).length === 0
}

/** 读取项目信息 */
function getProgramInfo() {
  getProgram(programId.value).then(response => {
    program.value = response.data || {}
  })
}

/**
 * 读取申请要求；保留尚未保存的新申请季草稿
 * @param selectSeason 读取后选中的申请季
 */
function getList(selectSeason) {
  loading.value = true
  return listRequirement(programId.value).then(response => {
    const drafts = editors.value.filter(ed => !ed.requirementId && ed.season !== selectSeason)
    editors.value = response.data.map(toEditor).concat(drafts)
    const target = editors.value.find(ed => ed.season === selectSeason) || editors.value.find(ed => ed.uid === activeUid.value) || editors.value[0]
    activeUid.value = target ? target.uid : ""
    loading.value = false
    return response.data
  }).catch(() => {
    loading.value = false
  })
}

/** 新增 / 复制申请季 */
function handleAddSeason(copy) {
  const base = copy ? (current.value || editors.value[0]) : null
  let year = new Date().getFullYear() + 1
  let intake = "fall"
  if (base && /^\d{4}-\w+$/.test(base.season)) {
    year = Number(base.season.split("-")[0]) + 1
    intake = base.season.split("-")[1]
  } else if (editors.value.length) {
    const years = editors.value.map(ed => Number((ed.season || "").split("-")[0])).filter(y => y > 0)
    if (years.length) {
      year = Math.max(...years) + 1
    }
  }
  seasonDialog.value = { open: true, copy: copy, year: year, intake: intake, copyFrom: base ? base.uid : undefined }
}

/** 确认新增申请季：生成未保存的草稿页签 */
function confirmAddSeason() {
  const d = seasonDialog.value
  if (!d.year || !d.intake) {
    proxy.$modal.msgError("请填写入学年份和入学季")
    return
  }
  const season = d.year + "-" + d.intake
  if (editors.value.some(ed => ed.season === season)) {
    proxy.$modal.msgError("申请季 " + season + " 已存在")
    return
  }
  let ed
  const from = editors.value.find(x => x.uid === d.copyFrom)
  if (from) {
    ed = toEditor({})
    const copied = JSON.parse(JSON.stringify(from))
    Object.assign(ed, copied, { uid: ed.uid, requirementId: undefined, season: season, sourceErrors: {}, fieldErrors: {} })
    Object.keys(ed.sources).forEach(f => {
      ed.sources[f].verifiedBy = undefined
      ed.sources[f].verifiedTime = undefined
    })
  } else {
    ed = toEditor({ season: season })
  }
  ed.season = season
  editors.value.push(ed)
  activeUid.value = ed.uid
  seasonDialog.value.open = false
}

/** 规范化用于读回比对 */
function canonical(v) {
  if (isBlank(v)) {
    return null
  }
  if (Array.isArray(v)) {
    return v.map(canonical)
  }
  if (typeof v === "object") {
    const out = {}
    Object.keys(v).sort().forEach(k => {
      out[k] = canonical(v[k])
    })
    return out
  }
  return typeof v === "number" ? Number(v) : String(v)
}

/** 保存后读回逐字段比对，返回不一致的字段名 */
function compareReadBack(sent, saved) {
  const diffs = []
  const jsonFields = ["minGpa", "otherLanguage", "testDetail", "deadlines"]
  const plain = {
    season: sent.season,
    tiersNotAccepted: sent.tiersNotAccepted ? sent.tiersNotAccepted.split(",").sort().join(",") : null,
    ieltsOverall: sent.ieltsOverall,
    ieltsMinSub: sent.ieltsMinSub,
    testRequirement: sent.testRequirement || "none",
    prerequisites: sent.prerequisites,
    prerequisitesRequired: sent.prerequisitesRequired || "N",
    workYears: sent.workYears,
    acceptCrossMajor: sent.acceptCrossMajor || "2"
  }
  jsonFields.forEach(f => {
    if (JSON.stringify(canonical(parseJson(sent[f]))) !== JSON.stringify(canonical(parseJson(saved[f])))) {
      diffs.push(FIELD_LABELS[f])
    }
  })
  Object.keys(plain).forEach(f => {
    let got = saved[f]
    if (f === "tiersNotAccepted" && !isBlank(got)) {
      got = got.split(",").sort().join(",")
    }
    const a = canonical(plain[f])
    const b = canonical(got)
    if ((typeof a === "number" || typeof b === "number") ? Number(a) !== Number(b) : a !== b) {
      diffs.push(FIELD_LABELS[f] || f)
    }
  })
  const savedUrls = {}
  ;(saved.sources || []).forEach(s => {
    savedUrls[s.fieldName] = s.sourceUrl
  })
  sent.sources.forEach(s => {
    if (savedUrls[s.fieldName] !== s.sourceUrl) {
      diffs.push("来源（" + FIELD_LABELS[s.fieldName] + "）")
    }
  })
  return diffs
}

/** 保存当前申请季 */
function submitForm() {
  const ed = current.value
  if (!ed) {
    return
  }
  if (aiPendingCount.value > 0) {
    proxy.$modal.msgWarning("还有 " + aiPendingCount.value + " 个 AI 预填字段未确认，请逐个确认、修改或忽略")
    return
  }
  proxy.$refs["requirementRef"].validate(valid => {
    if (!valid) {
      return
    }
    if (!validateEditor(ed)) {
      proxy.$modal.msgError("请先修正标红的字段")
      nextTick(() => {
        const el = document.querySelector(".requirement-form .is-error, .requirement-form .el-form-item.is-error")
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      })
      return
    }
    const payload = toPayload(ed)
    const isNew = !payload.requirementId
    saving.value = true
    const req = isNew ? addRequirement(payload) : updateRequirement(payload)
    req.then(() => {
      // 保存后读回，逐字段比对
      return getList(payload.season).then(list => {
        // 保存后编辑器重建：AI 预填结果跟随到同一申请季
        if (aiResult.value && aiResult.value.targetUid === ed.uid) {
          aiResult.value.targetUid = activeUid.value
        }
        const saved = (list || []).find(r => r.season === payload.season)
        const diffs = saved ? compareReadBack(payload, saved) : ["整条记录"]
        if (diffs.length) {
          proxy.$modal.alertWarning("已保存，但读回与提交不一致：" + diffs.join("、") + "，请检查")
        } else {
          proxy.$modal.msgSuccess(isNew ? "新增成功" : "修改成功")
        }
        getProgramInfo()
      })
    }).finally(() => {
      saving.value = false
    })
  })
}

/** 删除当前申请季 */
function handleDelete() {
  const ed = current.value
  if (!ed) {
    return
  }
  if (aiResult.value && aiResult.value.targetUid === ed.uid && !ed.requirementId) {
    aiResult.value = null
  }
  if (!ed.requirementId) {
    editors.value = editors.value.filter(x => x.uid !== ed.uid)
    activeUid.value = editors.value.length ? editors.value[0].uid : ""
    return
  }
  proxy.$modal.confirm('是否确认删除申请季"' + ed.season + '"的申请要求？').then(function() {
    return delRequirement(ed.requirementId)
  }).then(() => {
    if (aiResult.value && aiResult.value.targetUid === ed.uid) {
      aiResult.value = null
    }
    editors.value = editors.value.filter(x => x.uid !== ed.uid)
    activeUid.value = ""
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 打开 AI 预填面板（需要先有申请季：申请要求字段写入当前申请季） */
function openAiPrefill() {
  if (!current.value) {
    proxy.$modal.msgWarning("请先新增申请季")
    return
  }
  aiOpen.value = true
}

/** 收到 AI 预填结果：绑定到当前申请季 */
function onAiResult(data) {
  data.targetUid = current.value.uid
  data.targetSeason = current.value.season
  aiResult.value = data
}

/**
 * 把 AI 预填的取值写入当前申请季表单并带上来源
 * @param payload { field: 预填字段, mode: confirm（来源方式 AI 预填）| edit（写入后人工修改，来源方式人工）, url: 来源页面 }
 */
function applyAiField(payload) {
  const ed = current.value
  const f = payload.field
  const v = f.value
  switch (f.fieldName) {
    case "minGpa":
      ed.gpa = { ...v }
      break
    case "tiersNotAccepted":
      ed.tiersNotAccepted = [...v]
      break
    case "otherLanguage":
      ed.otherLangs = Object.keys(v).map(k => ({
        test: k,
        overall: v[k].overall ?? null,
        minSub: v[k].minSub ?? null,
        level: v[k].level ?? "",
        note: v[k].note ?? ""
      }))
      break
    case "testDetail":
      ed.test = { ...ed.test, gre: v.gre ?? null, gmat_focus: v.gmat_focus ?? null, gmat_classic: v.gmat_classic ?? null }
      break
    case "deadlines":
      ed.rolling = !!v.rolling
      ed.rounds = (v.rounds || []).map(x => ({ name: x.name || "", date: x.date || "" }))
      break
    default:
      ed[f.fieldName] = v
  }
  const source = ed.sources[f.fieldName]
  if (source) {
    source.sourceUrl = payload.url
    source.quote = f.quote || ""
    source.origin = payload.mode === "confirm" ? "1" : "0"
    delete ed.sourceErrors[f.fieldName]
    ed.aiConfirmed[f.fieldName] = toValues(ed)[f.fieldName]
  }
  delete ed.fieldErrors[f.fieldName]
  if (payload.mode === "edit") {
    // 修改：定位到表单中的字段，录入者在原位改值
    nextTick(() => {
      const anchor = f.fieldName === "prerequisitesRequired" ? "prerequisites" : f.fieldName
      const el = document.querySelector('.requirement-form [data-source-field="' + anchor + '"]')
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        el.classList.add("ai-flash")
        setTimeout(() => el.classList.remove("ai-flash"), 1600)
      }
    })
  }
}

/** 返回项目列表 */
function goBack() {
  const query = program.value.schoolId ? { schoolId: program.value.schoolId } : {}
  proxy.$tab.closeOpenPage({ path: "/catalog/program", query: query })
}

/** 初始化 */
function init() {
  editors.value = []
  activeUid.value = ""
  aiOpen.value = false
  aiResult.value = null
  getProgramInfo()
  getList()
}

watch(() => route.params.programId, id => {
  if (id && Number(id) !== programId.value && route.name === "ProgramRequirement") {
    programId.value = Number(id)
    init()
  }
})

init()
</script>

<style scoped>
.requirement-page {
  max-width: 1200px;
}
.program-title {
  font-weight: 600;
  margin-right: 8px;
}
.program-sub {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.program-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0 12px;
  font-size: 13px;
}
.program-verified {
  color: var(--el-text-color-secondary);
}
.inline-tag {
  display: inline-block;
}
.tab-tag {
  margin-left: 4px;
}
.requirement-form {
  padding-right: 8px;
}
.source-block {
  margin: 0 0 8px 110px;
}
.inner-table {
  width: 100%;
}
.rounds-table {
  max-width: 460px;
}
.mt8 {
  margin-top: 8px;
}
.save-hint {
  margin-left: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.required-star {
  color: var(--el-color-danger);
}
.ai-pending-hint {
  margin-left: 12px;
  font-size: 12px;
  line-height: 32px;
  color: var(--el-color-warning);
}
.requirement-form :deep(.ai-flash) {
  outline: 2px solid var(--el-color-primary-light-3);
  transition: outline 0.3s;
}
</style>
