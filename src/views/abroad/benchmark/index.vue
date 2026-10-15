<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="项目" prop="programName">
        <el-input v-model="queryParams.programName" placeholder="院校或项目名" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="国家地区" prop="country">
        <el-select v-model="queryParams.country" placeholder="全部" clearable style="width: 130px">
          <el-option v-for="dict in abr_country" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="来源" prop="source">
        <el-select v-model="queryParams.source" placeholder="全部来源" clearable style="width: 130px">
          <el-option v-for="dict in abr_benchmark_source" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['abroad:benchmark:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['abroad:benchmark:remove']">删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-alert type="info" :closable="false" show-icon class="mb8"
      title="参考线 T 是录取者的典型综合分。项目有参考线时选校引擎优先用它；没有时按项目难度档 D1–D5 取引擎配置中的默认 T。来源可信度：工作室案例 > 官方统计 > 顾问定档。稳定度 a 不填则用国家默认值。" />

    <el-table v-loading="loading" :data="benchmarkList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column label="国家地区" align="center" prop="country" width="90">
        <template #default="scope">
          <dict-tag :options="abr_country" :value="scope.row.country" />
        </template>
      </el-table-column>
      <el-table-column label="院校" align="left" prop="schoolName" min-width="150" :show-overflow-tooltip="true" />
      <el-table-column label="项目" align="left" prop="programName" min-width="180" :show-overflow-tooltip="true" />
      <el-table-column label="难度档" align="center" prop="difficulty" width="80">
        <template #default="scope">
          <span>{{ scope.row.difficulty || "-" }}</span>
        </template>
      </el-table-column>
      <el-table-column label="参考线 T" align="right" prop="refLine" width="90" class-name="num" />
      <el-table-column label="稳定度 a" align="right" prop="stability" width="90" class-name="num">
        <template #default="scope">
          <span v-if="scope.row.stability != null">{{ scope.row.stability }}</span>
          <span v-else class="text-muted">国家默认</span>
        </template>
      </el-table-column>
      <el-table-column label="来源" align="center" prop="source" width="100">
        <template #default="scope">
          <dict-tag :options="abr_benchmark_source" :value="scope.row.source" />
        </template>
      </el-table-column>
      <el-table-column label="样本数" align="right" prop="sampleSize" width="75" class-name="num" />
      <el-table-column label="备注" align="left" prop="remark" min-width="140" :show-overflow-tooltip="true" />
      <el-table-column label="更新" align="center" width="160">
        <template #default="scope">
          <div>{{ parseTime(scope.row.updateTime || scope.row.createTime) }}</div>
          <div class="text-muted">{{ scope.row.updateBy || scope.row.createBy }}</div>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="140" fixed="right" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['abroad:benchmark:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['abroad:benchmark:remove']">删除</el-button>
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

    <!-- 新增或修改参考线 -->
    <el-dialog :title="title" v-model="open" width="560px" append-to-body>
      <el-form ref="benchmarkRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="项目" prop="programId">
          <el-select v-if="!form.benchmarkId" v-model="form.programId" filterable remote :remote-method="searchProgram" :loading="searching"
            placeholder="输入项目名搜索" style="width: 100%">
            <el-option v-for="p in programOptions" :key="p.programId" :value="p.programId"
              :label="p.schoolName + ' · ' + p.programName + (p.difficulty ? '（' + p.difficulty + '）' : '')" />
          </el-select>
          <span v-else>{{ form.schoolName }} · {{ form.programName }}</span>
        </el-form-item>
        <el-form-item label="参考线 T" prop="refLine">
          <el-input-number v-model="form.refLine" :min="0" :max="100" :precision="2" :step="1" controls-position="right" style="width: 180px" />
          <span class="form-hint ml8">录取者的典型综合分（0–100）</span>
        </el-form-item>
        <el-form-item label="稳定度 a" prop="stability">
          <el-input-number v-model="form.stability" :min="0.0001" :max="5" :precision="4" :step="0.01" controls-position="right"
            placeholder="国家默认" style="width: 180px" />
          <span class="form-hint ml8">录取越标准化越大；不填用国家默认值</span>
        </el-form-item>
        <el-form-item label="来源" prop="source">
          <el-radio-group v-model="form.source">
            <el-radio v-for="dict in abr_benchmark_source" :key="dict.value" :value="dict.value">{{ dict.label }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="样本数" prop="sampleSize">
          <el-input-number v-model="form.sampleSize" :min="0" :max="100000" controls-position="right" placeholder="选填" style="width: 180px" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" maxlength="500" show-word-limit placeholder="依据或调整原因，如：2026 季 8 例录取的中位数" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :loading="saving" @click="submitForm">确 定</el-button>
          <el-button @click="open = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Benchmark">
import { listBenchmark, getBenchmark, addBenchmark, updateBenchmark, delBenchmark } from "@/api/abroad/benchmark"
import { listProgram } from "@/api/abroad/program"

const { proxy } = getCurrentInstance()
const { abr_country, abr_benchmark_source } = useDict("abr_country", "abr_benchmark_source")

const benchmarkList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const multiple = ref(true)
const total = ref(0)
const open = ref(false)
const title = ref("")
const saving = ref(false)
const searching = ref(false)
const programOptions = ref([])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 20,
    programName: undefined,
    country: undefined,
    source: undefined
  },
  rules: {
    programId: [{ required: true, message: "请选择项目", trigger: "change" }],
    refLine: [{ required: true, message: "参考线 T 不能为空", trigger: "blur" }],
    source: [{ required: true, message: "请选择来源", trigger: "change" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 查询参考线列表 */
function getList() {
  loading.value = true
  listBenchmark(queryParams.value).then(response => {
    benchmarkList.value = response.rows
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

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.benchmarkId)
  multiple.value = !selection.length
}

/** 表单重置 */
function reset() {
  form.value = {
    benchmarkId: undefined,
    programId: undefined,
    refLine: undefined,
    stability: undefined,
    source: "consultant_difficulty",
    sampleSize: undefined,
    remark: undefined
  }
  programOptions.value = []
  proxy.resetForm("benchmarkRef")
}

/** 按项目名搜索项目（新增时选择） */
function searchProgram(keyword) {
  if (!keyword) {
    programOptions.value = []
    return
  }
  searching.value = true
  listProgram({ pageNum: 1, pageSize: 20, programName: keyword }).then(response => {
    programOptions.value = response.rows
  }).finally(() => {
    searching.value = false
  })
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "新增参考线"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  getBenchmark(row.benchmarkId).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改参考线"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["benchmarkRef"].validate(valid => {
    if (!valid) {
      return
    }
    saving.value = true
    const req = form.value.benchmarkId ? updateBenchmark(form.value) : addBenchmark(form.value)
    req.then(() => {
      proxy.$modal.msgSuccess(form.value.benchmarkId ? "修改成功" : "新增成功")
      open.value = false
      getList()
    }).finally(() => {
      saving.value = false
    })
  })
}

/** 删除按钮操作 */
function handleDelete(row) {
  const benchmarkIds = row.benchmarkId || ids.value
  proxy.$modal.confirm("确认删除所选参考线？删除后这些项目按难度档取默认参考线。").then(() => {
    return delBenchmark(benchmarkIds)
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
.text-muted {
  color: var(--el-text-color-secondary);
}
.form-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.ml8 {
  margin-left: 8px;
}
</style>
