<template>
  <el-dialog title="项目批量导入" v-model="visible" :width="step === 1 ? '1100px' : '640px'" append-to-body :close-on-click-modal="false" @close="handleClose">
    <el-steps :active="step" finish-status="success" simple class="mb8">
      <el-step title="上传文件" />
      <el-step title="预览校验" />
      <el-step title="导入结果" />
    </el-steps>

    <!-- 第 1 步：上传 -->
    <div v-show="step === 0">
      <el-alert v-if="expired" type="warning" :closable="false" show-icon class="mb8" title="预览已过期或已使用（30 分钟内有效），请重新上传文件" />
      <el-upload
        ref="uploadRef"
        :limit="1"
        accept=".xlsx, .xls"
        :headers="headers"
        :action="uploadUrl"
        :disabled="isUploading"
        :auto-upload="false"
        :on-change="handleFileChange"
        :on-remove="handleFileRemove"
        :on-progress="handleProgress"
        :on-success="handleSuccess"
        :on-error="handleError"
        drag
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">
            仅允许导入 xls、xlsx 格式文件，请使用导入模板填写。
            <el-link type="primary" underline="never" class="template-link" @click="handleDownloadTemplate">下载模板</el-link>
          </div>
        </template>
      </el-upload>
      <div class="import-rules">
        <div class="import-rules-title">填写规则</div>
        <ul>
          <li><b>必填列：</b>国家、院校英文名、项目英文名、学位、学科大类；院校不存在时还需填写院校中文名（将新建院校）。</li>
          <li><b>来源链接：</b>填写了均分、雅思或截止日时，“申请季”（如 2027-fall）和“来源链接”（以 http:// 或 https:// 开头）必填。</li>
          <li><b>截止日：</b>滚动录取填 <code>滚动</code>；分轮次填 <code>R1:2027-01-15;R2:2027-03-01</code>。</li>
          <li><b>重复：</b>同院校、同英文名、同学位视为同一项目，已存在的项目和申请季跳过，不会覆盖。</li>
          <li>先预览校验，确认后才写入；单次最多 2000 行。</li>
        </ul>
      </div>
    </div>

    <!-- 第 2 步：预览 -->
    <div v-if="step === 1">
      <div class="summary-row">
        <el-radio-group v-model="actionFilter" size="small">
          <el-radio-button value="">全部 {{ rows.length }}</el-radio-button>
          <el-radio-button v-for="a in ACTIONS" :key="a.value" :value="a.value">
            {{ a.label }} <span class="summary-count" :class="'count-' + a.value">{{ summary[a.value] || 0 }}</span>
          </el-radio-button>
        </el-radio-group>
        <span class="summary-tip">只导入“新建项目”和“补充申请季”的行；跳过和错误的行不写入。</span>
      </div>
      <el-table :data="filteredRows" :row-class-name="rowClassName" size="small" border max-height="460" class="import-table">
        <el-table-column label="行号" prop="rowNo" width="60" align="center" />
        <el-table-column label="结果" prop="action" width="116" align="center">
          <template #default="scope">
            <el-tag :type="actionOf(scope.row.action).type" size="small">{{ actionOf(scope.row.action).label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="院校" min-width="210">
          <template #default="scope">
            <div>
              <dict-tag v-if="isDictValue(abr_country, scope.row.country)" :options="abr_country" :value="scope.row.country" class="inline-tag" />
              <span v-else-if="scope.row.country" class="raw-value">{{ scope.row.country }}</span>
              <span>{{ scope.row.schoolNameEn }}</span>
              <el-tag v-if="scope.row.newSchool" type="warning" size="small" effect="plain" class="new-school">新建院校</el-tag>
            </div>
            <div class="sub-text">{{ scope.row.schoolName }}</div>
          </template>
        </el-table-column>
        <el-table-column label="项目" min-width="190">
          <template #default="scope">
            <div>{{ scope.row.programNameEn }}</div>
            <div class="sub-text">{{ scope.row.programName }}</div>
          </template>
        </el-table-column>
        <el-table-column label="学位" prop="degree" width="80" align="center">
          <template #default="scope">
            <dict-tag v-if="isDictValue(abr_degree, scope.row.degree)" :options="abr_degree" :value="scope.row.degree" />
            <span v-else class="raw-value">{{ scope.row.degree }}</span>
          </template>
        </el-table-column>
        <el-table-column label="申请季" prop="season" width="100" align="center" />
        <el-table-column label="说明" min-width="260">
          <template #default="scope">
            <div v-for="(m, i) in scope.row.messages" :key="i" :class="{ 'msg-error': scope.row.action === 'error' }">{{ m }}</div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 第 3 步：结果 -->
    <div v-if="step === 2">
      <el-result icon="success" title="导入完成">
        <template #sub-title>
          <div class="result-counts">
            <span>新建院校 <b>{{ result.schoolsCreated || 0 }}</b></span>
            <span>新建项目 <b>{{ result.programsCreated || 0 }}</b></span>
            <span>新增申请要求 <b>{{ result.requirementsCreated || 0 }}</b></span>
            <span>跳过 <b>{{ result.skipped || 0 }}</b></span>
          </div>
        </template>
      </el-result>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <template v-if="step === 0">
          <el-button type="primary" :loading="isUploading" @click="handleUpload">上传并校验</el-button>
          <el-button @click="visible = false">取 消</el-button>
        </template>
        <template v-else-if="step === 1">
          <el-button @click="restart">重新上传</el-button>
          <el-button type="primary" :disabled="importable === 0" :loading="confirming" @click="handleConfirm">
            确认导入{{ importable > 0 ? " " + importable + " 行" : "" }}
          </el-button>
        </template>
        <template v-else>
          <el-button @click="restart">继续导入</el-button>
          <el-button type="primary" @click="visible = false">关 闭</el-button>
        </template>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { getToken } from "@/utils/auth"
import { importConfirm } from "@/api/abroad/program"

const { proxy } = getCurrentInstance()
const emit = defineEmits(["success"])
const { abr_country, abr_degree } = useDict("abr_country", "abr_degree")

// 逐行处理结果（后端 AbrProgramImportRow.action 固定取值，非可配置枚举）
const ACTIONS = [
  { value: "create", label: "新建项目", type: "success" },
  { value: "add_requirement", label: "补充申请季", type: "primary" },
  { value: "skip", label: "跳过（重复）", type: "info" },
  { value: "error", label: "错误", type: "danger" }
]
// 预览 token 有效期（与后端一致）
const TOKEN_MINUTES = 30

const uploadRef = ref(null)
const visible = ref(false)
const step = ref(0)
const isUploading = ref(false)
const confirming = ref(false)
const selectedFile = ref(null)
const expired = ref(false)
const token = ref("")
const previewAt = ref(0)
const rows = ref([])
const summary = ref({})
const result = ref({})
const actionFilter = ref("")
const headers = { Authorization: "Bearer " + getToken() }
const uploadUrl = import.meta.env.VITE_APP_BASE_API + "/abroad/program/importPreview"

const importable = computed(() => (summary.value.create || 0) + (summary.value.add_requirement || 0))
const filteredRows = computed(() => actionFilter.value ? rows.value.filter(r => r.action === actionFilter.value) : rows.value)

/** 结果标签 */
function actionOf(action) {
  return ACTIONS.find(a => a.value === action) || { label: action, type: "info" }
}

/** 是否为已识别的字典编码（未识别时后端返回原文，原样显示） */
function isDictValue(options, value) {
  return !!value && options.some(d => d.value === value)
}

/** 错误行高亮 */
function rowClassName({ row }) {
  return row.action === "error" ? "import-error-row" : ""
}

/** 打开对话框（供父组件通过 ref 调用） */
function open() {
  restart()
  expired.value = false
  visible.value = true
}

/** 回到第 1 步，清空预览 */
function restart() {
  step.value = 0
  token.value = ""
  rows.value = []
  summary.value = {}
  result.value = {}
  actionFilter.value = ""
  isUploading.value = false
  selectedFile.value = null
  nextTick(() => {
    uploadRef.value?.clearFiles()
  })
}

/** 关闭时清理 */
function handleClose() {
  restart()
}

/** 下载模板 */
function handleDownloadTemplate() {
  proxy.download("abroad/program/importTemplate", {}, `program_template_${new Date().getTime()}.xlsx`)
}

/** 文件选择 */
function handleFileChange(file) {
  selectedFile.value = file
}

/** 文件移除 */
function handleFileRemove() {
  selectedFile.value = null
}

/** 上传中 */
function handleProgress() {
  isUploading.value = true
}

/** 上传并预览 */
function handleUpload() {
  const file = selectedFile.value
  if (!file || !/\.(xls|xlsx)$/i.test(file.name)) {
    proxy.$modal.msgError("请选择后缀为 “xls”或“xlsx”的文件。")
    return
  }
  expired.value = false
  uploadRef.value.submit()
}

/** 上传返回：code 不为 200 时提示原因并允许重新选择文件 */
function handleSuccess(response) {
  isUploading.value = false
  if (response.code !== 200) {
    proxy.$modal.msgError(response.msg || "文件校验失败")
    selectedFile.value = null
    uploadRef.value?.clearFiles()
    return
  }
  token.value = response.data.token
  rows.value = response.data.rows || []
  summary.value = response.data.summary || {}
  previewAt.value = Date.now()
  actionFilter.value = ""
  step.value = 1
}

/** 上传失败（网络等） */
function handleError() {
  isUploading.value = false
  proxy.$modal.msgError("上传失败，请重试")
  selectedFile.value = null
  uploadRef.value?.clearFiles()
}

/** 预览过期：回到第 1 步重新上传 */
function backToUpload() {
  restart()
  expired.value = true
}

/** 确认导入 */
function handleConfirm() {
  if (Date.now() - previewAt.value > TOKEN_MINUTES * 60 * 1000) {
    backToUpload()
    return
  }
  const errors = summary.value.error || 0
  const ask = errors > 0
    ? proxy.$modal.confirm("错误的 " + errors + " 行不会导入，跳过的 " + (summary.value.skip || 0) + " 行不会重复创建。是否导入其余 " + importable.value + " 行？")
    : Promise.resolve()
  ask.then(() => {
    confirming.value = true
    return importConfirm(token.value).then(response => {
      result.value = response.data || {}
      step.value = 2
      emit("success")
    }).catch(e => {
      const msg = e && e.message ? e.message : ""
      if (msg.indexOf("过期") >= 0 || msg.indexOf("重新上传") >= 0) {
        backToUpload()
      }
    }).finally(() => {
      confirming.value = false
    })
  }).catch(() => {})
}

defineExpose({ open })
</script>

<style scoped>
.template-link {
  font-size: 12px;
  vertical-align: baseline;
}
.import-rules {
  margin-top: 12px;
  padding: 10px 14px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  font-size: 12px;
  line-height: 22px;
  color: var(--el-text-color-regular);
}
.import-rules-title {
  font-weight: 600;
}
.import-rules ul {
  margin: 4px 0 0;
  padding-left: 18px;
}
.import-rules code {
  padding: 0 4px;
  background: var(--el-fill-color-darker);
  border-radius: 2px;
}
.summary-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 10px;
}
.summary-count {
  display: inline-block;
  min-width: 18px;
  margin-left: 4px;
  padding: 0 5px;
  border-radius: 9px;
  font-size: 12px;
  line-height: 18px;
  color: #fff;
  background: var(--el-color-info);
}
.count-create {
  background: var(--el-color-success);
}
.count-add_requirement {
  background: var(--el-color-primary);
}
.count-error {
  background: var(--el-color-danger);
}
.summary-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.import-table :deep(.import-error-row > td.el-table__cell) {
  background: var(--el-color-danger-light-9);
}
.inline-tag {
  display: inline-block;
  margin-right: 4px;
}
.new-school {
  margin-left: 4px;
}
.sub-text {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.raw-value {
  margin-right: 4px;
  color: var(--el-color-danger);
}
.msg-error {
  color: var(--el-color-danger);
}
.result-counts {
  display: flex;
  justify-content: center;
  gap: 24px;
  font-size: 14px;
}
.result-counts b {
  font-size: 18px;
  margin-left: 4px;
}
</style>
