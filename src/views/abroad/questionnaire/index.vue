<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="问卷" prop="code">
        <el-input v-model="queryParams.code" placeholder="编码或标题" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="publishStatus">
        <el-select v-model="queryParams.publishStatus" placeholder="全部状态" clearable style="width: 140px">
          <el-option v-for="dict in abr_questionnaire_status" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="info" plain icon="Upload" @click="handleImport" v-hasPermi="['abroad:questionnaire:import']">导入新版本</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['abroad:questionnaire:remove']">删除草稿</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-alert type="info" :closable="false" show-icon class="mb8"
      title="问卷版本导入后不可修改：要改问卷，请在 JSON 中提高 version 后导入新版本。同一问卷只能有一个启用版本，启用后新测评即使用该版本，已完成的测评仍按原版本读取。" />

    <el-table v-loading="loading" :data="questionnaireList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" align="center" :selectable="row => row.publishStatus === 'draft'" />
      <el-table-column label="编码" align="left" prop="code" min-width="170" :show-overflow-tooltip="true">
        <template #default="scope">
          <span class="mono">{{ scope.row.code }}</span>
        </template>
      </el-table-column>
      <el-table-column label="版本" align="center" prop="version" width="70">
        <template #default="scope">
          <span class="mono">v{{ scope.row.version }}</span>
        </template>
      </el-table-column>
      <el-table-column label="版本说明" align="left" prop="versionLabel" min-width="150" :show-overflow-tooltip="true" />
      <el-table-column label="标题" align="left" prop="title" min-width="180" :show-overflow-tooltip="true" />
      <el-table-column label="题目数" align="right" prop="questionCount" width="75" class-name="num" />
      <el-table-column label="状态" align="center" prop="publishStatus" width="90">
        <template #default="scope">
          <dict-tag :options="abr_questionnaire_status" :value="scope.row.publishStatus" />
        </template>
      </el-table-column>
      <el-table-column label="启用" align="center" width="170">
        <template #default="scope">
          <template v-if="scope.row.activatedTime">
            <div>{{ parseTime(scope.row.activatedTime) }}</div>
            <div class="text-muted">{{ scope.row.activatedBy }}</div>
          </template>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="导入时间" align="center" prop="createTime" width="160">
        <template #default="scope">
          <span>{{ parseTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="200" fixed="right" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="handleView(scope.row)" v-hasPermi="['abroad:questionnaire:query']">查看</el-button>
          <el-button link type="primary" icon="CircleCheck" v-if="scope.row.publishStatus !== 'active'" @click="handleActivate(scope.row)" v-hasPermi="['abroad:questionnaire:activate']">启用</el-button>
          <el-button link type="primary" icon="Delete" v-if="scope.row.publishStatus === 'draft'" @click="handleDelete(scope.row)" v-hasPermi="['abroad:questionnaire:remove']">删除</el-button>
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

    <!-- 导入新版本：选择或粘贴 JSON → 校验 → 确认导入 -->
    <el-dialog title="导入问卷新版本" v-model="importOpen" width="780px" append-to-body @closed="resetImport">
      <el-form label-width="90px">
        <el-form-item label="问卷 JSON">
          <div class="full-width">
            <el-upload action="#" :auto-upload="false" :show-file-list="false" accept=".json,application/json" :on-change="handleFileChange">
              <el-button icon="Document">选择 JSON 文件</el-button>
            </el-upload>
            <span class="text-muted ml8">{{ importFileName || "或直接粘贴到下方" }}</span>
            <el-input v-model="importForm.definition" type="textarea" :rows="10" class="json-input mt8"
              placeholder='{"code": "abr_school_assessment", "version": 2, ...}' @input="checkResult = null" />
            <div class="form-hint">格式见后端仓库 seed/questionnaire/README.md；导入后为草稿，启用前不影响线上测评。</div>
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="importForm.remark" maxlength="500" show-word-limit placeholder="如：顾问定稿、调整了均分题的换算" />
        </el-form-item>
      </el-form>

      <template v-if="checkResult">
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="编码"><span class="mono">{{ checkResult.code || "-" }}</span></el-descriptions-item>
          <el-descriptions-item label="版本"><span class="mono">{{ checkResult.version != null ? "v" + checkResult.version : "-" }}</span></el-descriptions-item>
          <el-descriptions-item label="当前启用">{{ checkResult.activeVersion != null ? "v" + checkResult.activeVersion : "无" }}</el-descriptions-item>
          <el-descriptions-item label="标题" :span="2">{{ checkResult.title || "-" }}</el-descriptions-item>
          <el-descriptions-item label="步骤 / 题目">{{ checkResult.stepCount }} / {{ checkResult.questionCount }}</el-descriptions-item>
        </el-descriptions>
        <el-alert v-if="checkResult.existingStatus" type="error" :closable="false" show-icon class="mt8"
          :title="'版本 v' + checkResult.version + ' 已存在，请在 JSON 中提高 version 后再导入'" />
        <el-alert v-if="checkResult.errors.length" type="error" :closable="false" class="mt8"
          :title="'校验未通过（' + checkResult.errors.length + ' 项）'">
          <ul class="error-list">
            <li v-for="(e, i) in checkResult.errors" :key="i">{{ e }}</li>
          </ul>
        </el-alert>
        <el-alert v-if="checkResult.importable" type="success" :closable="false" show-icon class="mt8" title="校验通过，可以导入（导入后为草稿）" />
      </template>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="importOpen = false">取 消</el-button>
          <el-button :loading="checking" :disabled="!importForm.definition" @click="handleCheck">校 验</el-button>
          <el-button type="primary" :loading="importing" :disabled="!checkResult || !checkResult.importable" @click="submitImport">确认导入</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 查看版本 -->
    <el-drawer v-model="viewOpen" :title="viewTitle" size="760px" append-to-body>
      <template v-if="viewRow">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="编码"><span class="mono">{{ viewRow.code }}</span></el-descriptions-item>
          <el-descriptions-item label="版本"><span class="mono">v{{ viewRow.version }}</span> {{ viewRow.versionLabel }}</el-descriptions-item>
          <el-descriptions-item label="状态"><dict-tag :options="abr_questionnaire_status" :value="viewRow.publishStatus" /></el-descriptions-item>
          <el-descriptions-item label="题目数">{{ viewRow.questionCount }}</el-descriptions-item>
          <el-descriptions-item label="导入">{{ parseTime(viewRow.createTime) }} {{ viewRow.createBy }}</el-descriptions-item>
          <el-descriptions-item label="启用">{{ viewRow.activatedTime ? parseTime(viewRow.activatedTime) + " " + viewRow.activatedBy : "-" }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ viewRow.remark || "-" }}</el-descriptions-item>
        </el-descriptions>

        <el-tabs v-model="viewTab" class="mt8">
          <el-tab-pane label="题目一览" name="outline">
            <div v-for="step in outline" :key="step.id" class="mb12">
              <div class="block-title">{{ step.index }}. {{ step.title }} <span class="mono text-muted">{{ step.id }}</span></div>
              <el-table :data="step.questions" size="small" border>
                <el-table-column label="题目 id" prop="id" width="170">
                  <template #default="scope"><span class="mono">{{ scope.row.id }}</span></template>
                </el-table-column>
                <el-table-column label="题干" prop="title" :show-overflow-tooltip="true" />
                <el-table-column label="题型" prop="type" width="120">
                  <template #default="scope"><span class="mono">{{ scope.row.type }}</span></template>
                </el-table-column>
                <el-table-column label="必答" align="center" width="60">
                  <template #default="scope">{{ scope.row.required ? "是" : "否" }}</template>
                </el-table-column>
                <el-table-column label="条件显示" align="center" width="80">
                  <template #default="scope">{{ scope.row.visible_if ? "是" : "-" }}</template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>
          <el-tab-pane label="JSON 原文" name="json">
            <el-button size="small" icon="Download" class="mb8" @click="handleDownload">下载 JSON</el-button>
            <pre class="json-box">{{ prettyDefinition }}</pre>
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="Questionnaire">
import { listQuestionnaire, getQuestionnaire, checkQuestionnaire, importQuestionnaire, activateQuestionnaire, delQuestionnaire } from "@/api/abroad/questionnaire"

const { proxy } = getCurrentInstance()
const { abr_questionnaire_status } = useDict("abr_questionnaire_status")

const questionnaireList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const multiple = ref(true)
const total = ref(0)
const importOpen = ref(false)
const importFileName = ref("")
const checking = ref(false)
const importing = ref(false)
const checkResult = ref(null)
const viewOpen = ref(false)
const viewRow = ref(null)
const viewTab = ref("outline")

const data = reactive({
  importForm: {
    definition: "",
    remark: ""
  },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    code: undefined,
    publishStatus: undefined
  }
})

const { queryParams, importForm } = toRefs(data)

/** 解析后的问卷定义（查看用） */
const parsedDefinition = computed(() => {
  if (!viewRow.value || !viewRow.value.definition) {
    return null
  }
  try {
    return JSON.parse(viewRow.value.definition)
  } catch (e) {
    return null
  }
})

/** 按步骤分组的题目 */
const outline = computed(() => {
  const d = parsedDefinition.value
  if (!d || !Array.isArray(d.steps) || !Array.isArray(d.questions)) {
    return []
  }
  return d.steps.map((step, i) => ({
    id: step.id,
    index: step.index || i + 1,
    title: step.title || step.id,
    questions: d.questions.filter(q => q.step === step.id).sort((a, b) => (a.order || 0) - (b.order || 0))
  }))
})

/** 格式化后的 JSON 原文 */
const prettyDefinition = computed(() => {
  const d = parsedDefinition.value
  return d ? JSON.stringify(d, null, 2) : (viewRow.value && viewRow.value.definition) || ""
})

const viewTitle = computed(() => viewRow.value ? "问卷 " + viewRow.value.code + " v" + viewRow.value.version : "问卷版本")

/** 查询问卷版本列表 */
function getList() {
  loading.value = true
  listQuestionnaire(queryParams.value).then(response => {
    questionnaireList.value = response.rows
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
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 多选框选中数据（只有草稿可选） */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.questionnaireId)
  multiple.value = !selection.length
}

/** 打开导入弹窗 */
function handleImport() {
  resetImport()
  importOpen.value = true
}

/** 清空导入表单 */
function resetImport() {
  importForm.value = { definition: "", remark: "" }
  importFileName.value = ""
  checkResult.value = null
}

/** 读取选择的 JSON 文件 */
function handleFileChange(file) {
  if (file.size > 1024 * 1024) {
    proxy.$modal.msgError("问卷 JSON 不能超过 1MB")
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    importForm.value.definition = String(reader.result || "")
    importFileName.value = file.name
    handleCheck()
  }
  reader.readAsText(file.raw, "utf-8")
}

/** 校验问卷 JSON */
function handleCheck() {
  if (!importForm.value.definition) {
    return
  }
  checking.value = true
  checkQuestionnaire({ definition: importForm.value.definition }).then(response => {
    checkResult.value = response.data
  }).finally(() => {
    checking.value = false
  })
}

/** 确认导入 */
function submitImport() {
  importing.value = true
  importQuestionnaire(importForm.value).then(response => {
    proxy.$modal.msgSuccess("已导入为草稿 v" + response.data.version)
    importOpen.value = false
    getList()
  }).finally(() => {
    importing.value = false
  })
}

/** 查看版本详情 */
function handleView(row) {
  getQuestionnaire(row.questionnaireId).then(response => {
    viewRow.value = response.data
    viewTab.value = "outline"
    viewOpen.value = true
  })
}

/** 下载 JSON 原文 */
function handleDownload() {
  const blob = new Blob([prettyDefinition.value], { type: "application/json;charset=utf-8" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = viewRow.value.code + "_v" + viewRow.value.version + ".json"
  link.click()
  URL.revokeObjectURL(link.href)
}

/** 启用版本 */
function handleActivate(row) {
  const active = questionnaireList.value.find(r => r.code === row.code && r.publishStatus === "active")
  const draftHint = row.publishStatus === "draft" ? "草案须经顾问定稿后再启用。" : ""
  const activeHint = active ? "当前启用的 v" + active.version + " 将改为已停用。" : ""
  proxy.$modal.confirm("启用问卷 " + row.code + " v" + row.version + " 后，新测评立即使用该版本。" + activeHint + draftHint + "确认启用？").then(() => {
    return activateQuestionnaire(row.questionnaireId)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("已启用 v" + row.version)
  }).catch(() => {})
}

/** 删除草稿 */
function handleDelete(row) {
  const questionnaireIds = row.questionnaireId || ids.value
  proxy.$modal.confirm("确认删除所选问卷草稿？启用过的版本不能删除。").then(() => {
    return delQuestionnaire(questionnaireIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
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
.full-width {
  width: 100%;
}
.ml8 {
  margin-left: 8px;
}
.mt8 {
  margin-top: 8px;
}
.mb12 {
  margin-bottom: 12px;
}
.form-hint {
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}
.error-list {
  margin: 4px 0 0;
  padding-left: 18px;
  max-height: 200px;
  overflow: auto;
}
.block-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 6px 0;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.json-box {
  margin: 0;
  max-height: 560px;
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
