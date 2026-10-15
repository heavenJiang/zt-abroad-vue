<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="配置" prop="configCode">
        <el-input v-model="queryParams.configCode" placeholder="编码或版本" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="国家地区" prop="country">
        <el-select v-model="queryParams.country" placeholder="全部" clearable style="width: 130px">
          <el-option v-for="dict in abr_country" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="publishStatus">
        <el-select v-model="queryParams.publishStatus" placeholder="全部状态" clearable style="width: 130px">
          <el-option v-for="dict in abr_engine_status" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="info" plain icon="Upload" @click="handleImport" v-hasPermi="['abroad:engine:import']">导入新版本</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['abroad:engine:remove']">删除草稿</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-alert type="info" :closable="false" show-icon class="mb8"
      title="每个「国家 / 地区 × 学位」一份配置，导入后不可修改：改参数请在 JSON 中提高 version 后导入新版本。只有顾问已确认（文件状态 confirmed）的版本可以启用；同一国家 × 学位只有一个启用版本，没有启用版本的国家不对学生计算。" />

    <el-table v-loading="loading" :data="configList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" align="center" :selectable="row => row.publishStatus === 'draft'" />
      <el-table-column label="国家地区" align="center" prop="country" width="90">
        <template #default="scope">
          <dict-tag :options="abr_country" :value="scope.row.country" />
        </template>
      </el-table-column>
      <el-table-column label="学位" align="center" prop="degree" width="70">
        <template #default="scope">
          <dict-tag :options="abr_degree" :value="scope.row.degree" />
        </template>
      </el-table-column>
      <el-table-column label="版本" align="left" prop="version" min-width="220" :show-overflow-tooltip="true">
        <template #default="scope">
          <span class="mono">{{ scope.row.version }}</span>
        </template>
      </el-table-column>
      <el-table-column label="文件状态" align="center" prop="fileStatus" width="100">
        <template #default="scope">
          <el-tag v-if="scope.row.fileStatus === 'confirmed'" type="success">顾问已确认</el-tag>
          <el-tag v-else type="info">草案</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="发布状态" align="center" prop="publishStatus" width="90">
        <template #default="scope">
          <dict-tag :options="abr_engine_status" :value="scope.row.publishStatus" />
        </template>
      </el-table-column>
      <el-table-column label="警告" align="center" width="70">
        <template #default="scope">
          <el-tooltip v-if="warningsOf(scope.row).length" placement="top" :content="warningsOf(scope.row).join('；')">
            <el-tag type="warning">{{ warningsOf(scope.row).length }}</el-tag>
          </el-tooltip>
          <span v-else class="text-muted">-</span>
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
          <el-button link type="primary" icon="View" @click="handleView(scope.row)" v-hasPermi="['abroad:engine:query']">查看</el-button>
          <el-button link type="primary" icon="CircleCheck" v-if="scope.row.publishStatus !== 'active' && scope.row.fileStatus === 'confirmed'" @click="handleActivate(scope.row)" v-hasPermi="['abroad:engine:activate']">启用</el-button>
          <el-button link type="primary" icon="Delete" v-if="scope.row.publishStatus === 'draft'" @click="handleDelete(scope.row)" v-hasPermi="['abroad:engine:remove']">删除</el-button>
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
    <el-dialog title="导入引擎配置新版本" v-model="importOpen" width="780px" append-to-body @closed="resetImport">
      <el-form label-width="90px">
        <el-form-item label="配置 JSON">
          <div class="full-width">
            <el-upload action="#" :auto-upload="false" :show-file-list="false" accept=".json,application/json" :on-change="handleFileChange">
              <el-button icon="Document">选择 JSON 文件</el-button>
            </el-upload>
            <span class="text-muted ml8">{{ importFileName || "或直接粘贴到下方" }}</span>
            <el-input v-model="importForm.config" type="textarea" :rows="10" class="json-input mt8"
              placeholder='{"schema": "abr-engine-config/1.0", "config_code": "UK_MASTER", ...}' @input="checkResult = null" />
            <div class="form-hint">格式见后端仓库 seed/engine-config/README.md；校验时会用示例背景试算一遍，缺参数会报错。</div>
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="importForm.remark" maxlength="500" show-word-limit placeholder="如：顾问确认英国权重与兜底均分" />
        </el-form-item>
      </el-form>

      <template v-if="checkResult">
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="编码"><span class="mono">{{ checkResult.configCode || "-" }}</span></el-descriptions-item>
          <el-descriptions-item label="国家 / 学位">{{ checkResult.country || "-" }} / {{ checkResult.degree || "-" }}</el-descriptions-item>
          <el-descriptions-item label="文件状态">{{ checkResult.fileStatus === "confirmed" ? "顾问已确认" : (checkResult.fileStatus || "-") }}</el-descriptions-item>
          <el-descriptions-item label="版本" :span="2"><span class="mono">{{ checkResult.version || "-" }}</span></el-descriptions-item>
          <el-descriptions-item label="当前启用"><span class="mono">{{ checkResult.activeVersion || "无" }}</span></el-descriptions-item>
        </el-descriptions>
        <el-alert v-if="checkResult.existingStatus" type="error" :closable="false" show-icon class="mt8"
          :title="'版本 ' + checkResult.version + ' 已存在，请在 JSON 中提高 version 后再导入'" />
        <el-alert v-if="checkResult.errors.length" type="error" :closable="false" class="mt8"
          :title="'校验未通过（' + checkResult.errors.length + ' 项）'">
          <ul class="error-list">
            <li v-for="(e, i) in checkResult.errors" :key="i">{{ e }}</li>
          </ul>
        </el-alert>
        <el-alert v-if="checkResult.warnings.length" type="warning" :closable="false" class="mt8" title="警告（不影响导入）">
          <ul class="error-list">
            <li v-for="(w, i) in checkResult.warnings" :key="i">{{ w }}</li>
          </ul>
        </el-alert>
        <el-alert v-if="checkResult.importable" type="success" :closable="false" show-icon class="mt8"
          :title="checkResult.activatable ? '校验通过，可以导入（导入后为草稿，可启用）' : '校验通过，可以导入为草稿（草案不能启用，只供测试台试算）'" />
      </template>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="importOpen = false">取 消</el-button>
          <el-button :loading="checking" :disabled="!importForm.config" @click="handleCheck">校 验</el-button>
          <el-button type="primary" :loading="importing" :disabled="!checkResult || !checkResult.importable" @click="submitImport">确认导入</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 查看版本 -->
    <el-drawer v-model="viewOpen" :title="viewTitle" size="820px" append-to-body>
      <template v-if="viewRow">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="编码"><span class="mono">{{ viewRow.configCode }}</span></el-descriptions-item>
          <el-descriptions-item label="版本"><span class="mono">{{ viewRow.version }}</span></el-descriptions-item>
          <el-descriptions-item label="国家 / 学位">
            <dict-tag :options="abr_country" :value="viewRow.country" class="inline" /> / <dict-tag :options="abr_degree" :value="viewRow.degree" class="inline" />
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <dict-tag :options="abr_engine_status" :value="viewRow.publishStatus" class="inline" />
            <span class="text-muted ml8">{{ viewRow.fileStatus === "confirmed" ? "顾问已确认" : "草案" }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="确认人">{{ parsed && parsed.confirmed_by ? parsed.confirmed_by + " " + (parsed.confirmed_at || "") : "-" }}</el-descriptions-item>
          <el-descriptions-item label="启用">{{ viewRow.activatedTime ? parseTime(viewRow.activatedTime) + " " + viewRow.activatedBy : "-" }}</el-descriptions-item>
          <el-descriptions-item label="导入">{{ parseTime(viewRow.createTime) }} {{ viewRow.createBy }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ viewRow.remark || "-" }}</el-descriptions-item>
        </el-descriptions>
        <el-alert v-for="(w, i) in warningsOf(viewRow)" :key="i" type="warning" :closable="false" class="mt8" :title="w" />

        <el-tabs v-model="viewTab" class="mt8">
          <el-tab-pane label="参数摘要" name="summary">
            <div class="block-title">维度权重</div>
            <el-table :data="weightRows" size="small" border>
              <el-table-column label="权重组" prop="group" width="120" />
              <el-table-column v-for="d in DIMENSIONS" :key="d.key" :label="d.label" align="right" class-name="num">
                <template #default="scope">{{ scope.row[d.key] }}</template>
              </el-table-column>
            </el-table>

            <div class="block-title mt12">参考线与分档</div>
            <el-descriptions :column="3" border size="small">
              <el-descriptions-item label="默认稳定度 a">{{ prob.a_default ?? "-" }}</el-descriptions-item>
              <el-descriptions-item label="参考线偏移">{{ prob.t_offset ?? 0 }}</el-descriptions-item>
              <el-descriptions-item label="冲 / 保分界">P &lt; {{ cutoffs.reach_below }} 冲；P &gt; {{ cutoffs.safety_above }} 保</el-descriptions-item>
            </el-descriptions>
            <el-table :data="difficultyRows" size="small" border class="mt8">
              <el-table-column label="难度档" prop="level" width="80" align="center" />
              <el-table-column label="默认参考线 T" prop="t" width="120" align="right" class-name="num" />
              <el-table-column label="说明" prop="description" :show-overflow-tooltip="true" />
            </el-table>

            <div class="block-title mt12">推荐组合</div>
            <div>默认 {{ mix.reach ?? "-" }} 冲 + {{ mix.match ?? "-" }} 稳 + {{ mix.safety ?? "-" }} 保</div>
          </el-tab-pane>
          <el-tab-pane label="JSON 原文" name="json">
            <el-button size="small" icon="Download" class="mb8" @click="handleDownload">下载 JSON</el-button>
            <pre class="json-box">{{ prettyConfig }}</pre>
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="EngineConfig">
import { listEngineConfig, getEngineConfig, checkEngineConfig, importEngineConfig, activateEngineConfig, delEngineConfig } from "@/api/abroad/engine"

const { proxy } = getCurrentInstance()
const { abr_engine_status, abr_country, abr_degree } = useDict("abr_engine_status", "abr_country", "abr_degree")

/** 维度（与后端 SubScoreCalculator.DIMENSIONS 一致） */
const DIMENSIONS = [
  { key: "academic", label: "院校+均分" },
  { key: "major_relevance", label: "专业相关" },
  { key: "test_scores", label: "标化" },
  { key: "research", label: "科研" },
  { key: "work_experience", label: "实习" },
  { key: "other_soft", label: "其他软背景" },
  { key: "course_match", label: "课程匹配" }
]

const configList = ref([])
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
const viewTab = ref("summary")

const data = reactive({
  importForm: {
    config: "",
    remark: ""
  },
  queryParams: {
    pageNum: 1,
    pageSize: 20,
    configCode: undefined,
    country: undefined,
    publishStatus: undefined
  }
})

const { queryParams, importForm } = toRefs(data)

/** 解析后的配置（查看用） */
const parsed = computed(() => {
  if (!viewRow.value || !viewRow.value.config) {
    return null
  }
  try {
    return JSON.parse(viewRow.value.config)
  } catch (e) {
    return null
  }
})

const prob = computed(() => (parsed.value && parsed.value.probability) || {})
const cutoffs = computed(() => (parsed.value && parsed.value.tier_cutoffs) || {})
const mix = computed(() => (parsed.value && parsed.value.portfolio && parsed.value.portfolio.default_mix) || {})

/** 权重表：默认一行 + 每个专业大类一行 */
const weightRows = computed(() => {
  const w = parsed.value && parsed.value.weights
  if (!w) {
    return []
  }
  const rows = [{ group: "默认", ...w.default }]
  Object.keys(w.by_field || {}).forEach(k => rows.push({ group: k, ...w.by_field[k] }))
  return rows
})

/** 难度档默认参考线 */
const difficultyRows = computed(() => {
  const levels = parsed.value && parsed.value.benchmark_defaults && parsed.value.benchmark_defaults.difficulty_levels
  if (!levels) {
    return []
  }
  return Object.keys(levels).map(k => ({ level: k, t: levels[k].t, description: levels[k].description }))
})

const prettyConfig = computed(() => parsed.value ? JSON.stringify(parsed.value, null, 2) : (viewRow.value && viewRow.value.config) || "")

const viewTitle = computed(() => viewRow.value ? "引擎配置 " + viewRow.value.version : "引擎配置")

/** 警告列表 */
function warningsOf(row) {
  if (!row || !row.warnings) {
    return []
  }
  try {
    const list = JSON.parse(row.warnings)
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

/** 查询配置版本列表 */
function getList() {
  loading.value = true
  listEngineConfig(queryParams.value).then(response => {
    configList.value = response.rows
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
  ids.value = selection.map(item => item.configId)
  multiple.value = !selection.length
}

/** 打开导入弹窗 */
function handleImport() {
  resetImport()
  importOpen.value = true
}

/** 清空导入表单 */
function resetImport() {
  importForm.value = { config: "", remark: "" }
  importFileName.value = ""
  checkResult.value = null
}

/** 读取选择的 JSON 文件 */
function handleFileChange(file) {
  if (file.size > 1024 * 1024) {
    proxy.$modal.msgError("引擎配置 JSON 不能超过 1 MB")
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    importForm.value.config = String(reader.result || "")
    importFileName.value = file.name
    handleCheck()
  }
  reader.readAsText(file.raw, "utf-8")
}

/** 校验配置 JSON */
function handleCheck() {
  if (!importForm.value.config) {
    return
  }
  checking.value = true
  checkEngineConfig({ config: importForm.value.config }).then(response => {
    checkResult.value = response.data
  }).finally(() => {
    checking.value = false
  })
}

/** 确认导入 */
function submitImport() {
  importing.value = true
  importEngineConfig(importForm.value).then(response => {
    proxy.$modal.msgSuccess("已导入为草稿 " + response.data.version)
    importOpen.value = false
    getList()
  }).finally(() => {
    importing.value = false
  })
}

/** 查看版本详情 */
function handleView(row) {
  getEngineConfig(row.configId).then(response => {
    viewRow.value = response.data
    viewTab.value = "summary"
    viewOpen.value = true
  })
}

/** 下载 JSON 原文 */
function handleDownload() {
  const blob = new Blob([prettyConfig.value], { type: "application/json;charset=utf-8" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = viewRow.value.version + ".json"
  link.click()
  URL.revokeObjectURL(link.href)
}

/** 启用版本 */
function handleActivate(row) {
  const active = configList.value.find(r => r.country === row.country && r.degree === row.degree && r.publishStatus === "active")
  const activeHint = active ? "当前启用的 " + active.version + " 将改为已停用。" : ""
  proxy.$modal.confirm("启用 " + row.version + " 后，该国家 / 地区的新测评和重新计算立即使用这套参数。" + activeHint + "确认启用？").then(() => {
    return activateEngineConfig(row.configId)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("已启用 " + row.version)
  }).catch(() => {})
}

/** 删除草稿 */
function handleDelete(row) {
  const configIds = row.configId || ids.value
  proxy.$modal.confirm("确认删除所选配置草稿？启用过的版本不能删除。").then(() => {
    return delEngineConfig(configIds)
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
.inline {
  display: inline-block;
}
.ml8 {
  margin-left: 8px;
}
.mt8 {
  margin-top: 8px;
}
.mt12 {
  margin-top: 12px;
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
