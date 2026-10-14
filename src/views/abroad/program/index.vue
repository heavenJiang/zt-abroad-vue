<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="院校" prop="schoolId">
        <el-select v-model="queryParams.schoolId" placeholder="全部院校" clearable filterable style="width: 220px" @change="handleQuery">
          <el-option v-for="s in schoolOptions" :key="s.schoolId" :label="schoolLabel(s)" :value="s.schoolId" />
        </el-select>
      </el-form-item>
      <el-form-item label="国家" prop="country">
        <el-select v-model="queryParams.country" placeholder="请选择" clearable style="width: 120px">
          <el-option v-for="dict in abr_country" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="学位" prop="degree">
        <el-select v-model="queryParams.degree" placeholder="请选择" clearable style="width: 120px">
          <el-option v-for="dict in abr_degree" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="学科大类" prop="fieldGroup">
        <el-select v-model="queryParams.fieldGroup" placeholder="请选择" clearable style="width: 130px">
          <el-option v-for="dict in abr_field_group" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="专业方向" prop="majorDirection">
        <el-select v-model="queryParams.majorDirection" placeholder="请选择" clearable style="width: 180px">
          <el-option v-for="dict in abr_major_direction" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="难度档" prop="difficulty">
        <el-select v-model="queryParams.difficulty" placeholder="请选择" clearable style="width: 120px">
          <el-option v-for="dict in abr_program_difficulty" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择" clearable style="width: 100px">
          <el-option v-for="dict in sys_normal_disable" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="关键词" prop="programName">
        <el-input
          v-model="queryParams.programName"
          placeholder="项目中文名或英文名"
          clearable
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="只看超过 90 天未核对" label-width="150px">
        <el-switch v-model="verifyExpired" @change="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['abroad:program:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['abroad:program:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['abroad:program:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['abroad:program:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="programList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="45" align="center" />
      <el-table-column label="院校" align="left" min-width="170" :show-overflow-tooltip="true">
        <template #default="scope">
          <dict-tag :options="abr_country" :value="scope.row.country" class="inline-tag" />
          <span>{{ scope.row.schoolName }}</span>
          <div class="sub-text">{{ scope.row.schoolNameEn }}</div>
        </template>
      </el-table-column>
      <el-table-column label="项目" align="left" min-width="200" :show-overflow-tooltip="true">
        <template #default="scope">
          <div>{{ scope.row.programNameEn }}</div>
          <div class="sub-text">{{ scope.row.programName }}</div>
        </template>
      </el-table-column>
      <el-table-column label="学位" align="center" prop="degree" width="70">
        <template #default="scope">
          <dict-tag :options="abr_degree" :value="scope.row.degree" />
        </template>
      </el-table-column>
      <el-table-column label="学科大类" align="center" prop="fieldGroup" width="90">
        <template #default="scope">
          <dict-tag :options="abr_field_group" :value="scope.row.fieldGroup" />
        </template>
      </el-table-column>
      <el-table-column label="难度档" align="center" prop="difficulty" width="90">
        <template #default="scope">
          <dict-tag :options="abr_program_difficulty" :value="scope.row.difficulty" />
        </template>
      </el-table-column>
      <el-table-column label="学费" align="right" prop="tuition" width="120">
        <template #default="scope">
          <span v-if="scope.row.tuition != null">{{ formatMoney(scope.row.tuition) }} {{ scope.row.currency }}</span>
        </template>
      </el-table-column>
      <el-table-column label="最近核对" align="center" prop="verifiedTime" width="160">
        <template #default="scope">
          <el-tooltip v-if="isVerifyExpired(scope.row.verifiedTime)" placement="top"
            :content="scope.row.verifiedTime ? '超过 90 天未核对申请要求，请重新核对来源' : '申请要求尚未核对（未保存过带来源的要求）'">
            <el-text type="warning" class="verify-expired">
              <el-icon><Warning /></el-icon>
              {{ scope.row.verifiedTime ? parseTime(scope.row.verifiedTime, "{y}-{m}-{d}") : "未核对" }}
            </el-text>
          </el-tooltip>
          <el-tooltip v-else placement="top" :content="'核对人：' + (scope.row.verifiedBy || '-')">
            <span>{{ parseTime(scope.row.verifiedTime, "{y}-{m}-{d}") }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status" width="70">
        <template #default="scope">
          <dict-tag :options="sys_normal_disable" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="210" fixed="right" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Document" @click="handleRequirement(scope.row)" v-hasPermi="['abroad:program:edit']">申请要求</el-button>
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['abroad:program:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['abroad:program:remove']">删除</el-button>
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

    <!-- 添加或修改项目对话框 -->
    <el-dialog :title="title" v-model="open" width="760px" append-to-body>
      <el-form ref="programRef" :model="form" :rules="rules" label-width="96px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="院校" prop="schoolId">
              <el-select v-model="form.schoolId" placeholder="输入中英文名筛选" filterable style="width: 100%">
                <el-option v-for="s in schoolOptions" :key="s.schoolId" :label="schoolLabel(s)" :value="s.schoolId" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="英文名" prop="programNameEn">
              <el-input v-model="form.programNameEn" placeholder="如 MSc Finance" maxlength="300" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="中文名" prop="programName">
              <el-input v-model="form.programName" placeholder="如 金融学硕士" maxlength="200" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="学位" prop="degree">
              <el-select v-model="form.degree" placeholder="请选择" style="width: 100%">
                <el-option v-for="dict in abr_degree" :key="dict.value" :label="dict.label" :value="dict.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="学科大类" prop="fieldGroup">
              <el-select v-model="form.fieldGroup" placeholder="请选择" style="width: 100%">
                <el-option v-for="dict in abr_field_group" :key="dict.value" :label="dict.label" :value="dict.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="专业方向" prop="majorDirection">
              <el-select v-model="form.majorDirection" placeholder="请选择" clearable style="width: 100%">
                <el-option v-for="dict in abr_major_direction" :key="dict.value" :label="dict.label" :value="dict.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="难度档" prop="difficulty">
              <el-select v-model="form.difficulty" placeholder="请选择" clearable style="width: 100%">
                <el-option v-for="dict in abr_program_difficulty" :key="dict.value" :label="dict.label" :value="dict.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="学制（月）" prop="durationMonths">
              <el-input-number v-model="form.durationMonths" controls-position="right" :min="1" :max="120" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="授课语言" prop="teachingLanguage">
              <el-select v-model="form.teachingLanguage" placeholder="请选择" style="width: 100%">
                <el-option v-for="dict in abr_teaching_language" :key="dict.value" :label="dict.label" :value="dict.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="学费（年）" prop="tuition">
              <el-input-number v-model="form.tuition" controls-position="right" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="币种" prop="currency">
              <el-input v-model="form.currency" placeholder="3 位代码，如 GBP" maxlength="3" @blur="form.currency = form.currency ? form.currency.toUpperCase() : form.currency" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="入学季" prop="intakeList">
              <el-checkbox-group v-model="form.intakeList">
                <el-checkbox v-for="dict in abr_intake" :key="dict.value" :value="dict.value">{{ dict.label }}</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="需要 APS" prop="apsRequired">
              <el-radio-group v-model="form.apsRequired">
                <el-radio v-for="dict in sys_yes_no" :key="dict.value" :value="dict.value">{{ dict.label }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="官网" prop="website">
              <el-input v-model="form.website" placeholder="https://" maxlength="500" />
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
              <el-input v-model="form.remark" type="textarea" placeholder="请输入内容" />
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
  </div>
</template>

<script setup name="Program">
import { listProgram, getProgram, delProgram, addProgram, updateProgram } from "@/api/abroad/program"
import { listSchool } from "@/api/abroad/school"

const { proxy } = getCurrentInstance()
const route = useRoute()
const router = useRouter()
const {
  abr_country, abr_degree, abr_field_group, abr_major_direction, abr_program_difficulty,
  abr_teaching_language, abr_intake, sys_yes_no, sys_normal_disable
} = useDict(
  "abr_country", "abr_degree", "abr_field_group", "abr_major_direction", "abr_program_difficulty",
  "abr_teaching_language", "abr_intake", "sys_yes_no", "sys_normal_disable"
)

// 超过多少天未核对显示黄色提醒（与后端 params[verifyExpired] 的 90 天一致）
const VERIFY_EXPIRE_DAYS = 90

const programList = ref([])
const schoolOptions = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const verifyExpired = ref(false)

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    schoolId: undefined,
    country: undefined,
    degree: undefined,
    fieldGroup: undefined,
    majorDirection: undefined,
    difficulty: undefined,
    status: undefined,
    programName: undefined,
    params: {}
  },
  rules: {
    schoolId: [{ required: true, message: "院校不能为空", trigger: "change" }],
    programNameEn: [{ required: true, message: "英文名不能为空", trigger: "blur" }],
    degree: [{ required: true, message: "学位不能为空", trigger: "change" }],
    fieldGroup: [{ required: true, message: "学科大类不能为空", trigger: "change" }],
    currency: [{ pattern: /^[A-Za-z]{3}$/, message: "币种为 3 位代码", trigger: "blur" }],
    website: [{ pattern: /^https?:\/\/.+/i, message: "官网应以 http:// 或 https:// 开头", trigger: "blur" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 院校下拉显示名 */
function schoolLabel(s) {
  return s.schoolName + " / " + s.schoolNameEn
}

/** 核对时间为空或超过 90 天 */
function isVerifyExpired(time) {
  if (!time) {
    return true
  }
  const t = new Date(String(time).replace(/-/g, "/")).getTime()
  return Date.now() - t > VERIFY_EXPIRE_DAYS * 24 * 3600 * 1000
}

/** 金额千分位 */
function formatMoney(v) {
  return Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 })
}

/** 加载院校下拉（数量有限，一次加载 1000 条） */
function getSchoolOptions() {
  listSchool({ pageNum: 1, pageSize: 1000 }).then(response => {
    schoolOptions.value = response.rows
  })
}

/** 查询项目列表 */
function getList() {
  loading.value = true
  queryParams.value.params = verifyExpired.value ? { verifyExpired: "Y" } : {}
  listProgram(queryParams.value).then(response => {
    programList.value = response.rows
    total.value = response.total
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
    programId: undefined,
    schoolId: queryParams.value.schoolId,
    programName: undefined,
    programNameEn: undefined,
    degree: "master",
    fieldGroup: undefined,
    majorDirection: undefined,
    durationMonths: undefined,
    intakeList: [],
    tuition: undefined,
    currency: undefined,
    teachingLanguage: "en",
    website: undefined,
    apsRequired: "N",
    difficulty: undefined,
    status: "0",
    remark: undefined
  }
  proxy.resetForm("programRef")
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef")
  queryParams.value.schoolId = undefined
  verifyExpired.value = false
  handleQuery()
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.programId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加项目"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const programId = row.programId || ids.value
  getProgram(programId).then(response => {
    form.value = response.data
    form.value.intakeList = response.data.intakes ? response.data.intakes.split(",") : []
    open.value = true
    title.value = "修改项目"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["programRef"].validate(valid => {
    if (!valid) {
      return
    }
    const payload = { ...form.value, intakes: form.value.intakeList.join(",") }
    delete payload.intakeList
    if (payload.programId != undefined) {
      updateProgram(payload).then(() => {
        proxy.$modal.msgSuccess("修改成功")
        open.value = false
        getList()
      })
    } else {
      addProgram(payload).then(() => {
        proxy.$modal.msgSuccess("新增成功")
        open.value = false
        getList()
      })
    }
  })
}

/** 申请要求编辑 */
function handleRequirement(row) {
  router.push("/abroad/program-requirement/index/" + row.programId)
}

/** 删除按钮操作 */
function handleDelete(row) {
  const programIds = row.programId || ids.value
  proxy.$modal.confirm('是否确认删除项目编号为"' + programIds + '"的数据项？其申请要求将一并删除。').then(function() {
    return delProgram(programIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download("abroad/program/export", {
    ...queryParams.value
  }, `program_${new Date().getTime()}.xlsx`)
}

/** 从院校页跳转时带 schoolId 过滤 */
function applyRouteQuery() {
  if (route.query.schoolId) {
    queryParams.value.schoolId = Number(route.query.schoolId)
    queryParams.value.pageNum = 1
  }
}

// 页面被缓存时，再次进入（如从院校页点项目数、从申请要求页返回）刷新列表
let firstActivate = true
onActivated(() => {
  if (firstActivate) {
    firstActivate = false
    return
  }
  applyRouteQuery()
  getSchoolOptions()
  getList()
})

applyRouteQuery()
getSchoolOptions()
getList()
</script>

<style scoped>
.sub-text {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.inline-tag {
  display: inline-block;
  margin-right: 4px;
}
.verify-expired {
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
</style>
