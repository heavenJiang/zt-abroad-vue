<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="院校名称" prop="schoolName">
        <el-input
          v-model="queryParams.schoolName"
          placeholder="中文名或英文名"
          clearable
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="国家" prop="country">
        <el-select v-model="queryParams.country" placeholder="请选择国家" clearable style="width: 160px">
          <el-option v-for="dict in abr_country" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="院校状态" clearable style="width: 120px">
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
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['abroad:school:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['abroad:school:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['abroad:school:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['abroad:school:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="schoolList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column label="中文名" align="left" prop="schoolName" min-width="140" :show-overflow-tooltip="true" />
      <el-table-column label="英文名" align="left" prop="schoolNameEn" min-width="170" :show-overflow-tooltip="true" />
      <el-table-column label="国家" align="center" prop="country" width="90">
        <template #default="scope">
          <dict-tag :options="abr_country" :value="scope.row.country" />
        </template>
      </el-table-column>
      <el-table-column label="城市" align="center" prop="city" width="100" :show-overflow-tooltip="true" />
      <el-table-column label="排名" align="left" prop="rankings" min-width="130">
        <template #default="scope">
          <span v-for="(r, i) in parseRankings(scope.row.rankings)" :key="i" class="ranking-item">{{ r.list }} {{ r.year }}: #{{ r.rank }}</span>
        </template>
      </el-table-column>
      <el-table-column label="教育部认可" align="center" prop="moeRecognized" width="95">
        <template #default="scope">
          <dict-tag :options="sys_yes_no" :value="scope.row.moeRecognized" />
        </template>
      </el-table-column>
      <el-table-column label="项目数" align="center" prop="programCount" width="80">
        <template #default="scope">
          <el-link type="primary" :underline="false" @click="handlePrograms(scope.row)">{{ scope.row.programCount || 0 }}</el-link>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status" width="80">
        <template #default="scope">
          <dict-tag :options="sys_normal_disable" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="220" fixed="right" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="List" @click="handlePrograms(scope.row)" v-hasPermi="['abroad:program:list']">项目</el-button>
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['abroad:school:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['abroad:school:remove']">删除</el-button>
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

    <!-- 添加或修改院校对话框 -->
    <el-dialog :title="title" v-model="open" width="680px" append-to-body>
      <el-form ref="schoolRef" :model="form" :rules="rules" label-width="96px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="中文名" prop="schoolName">
              <el-input v-model="form.schoolName" placeholder="请输入中文名" maxlength="200" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="英文名" prop="schoolNameEn">
              <el-input v-model="form.schoolNameEn" placeholder="请输入英文名" maxlength="200" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="国家" prop="country">
              <el-select v-model="form.country" placeholder="请选择国家" style="width: 100%">
                <el-option v-for="dict in abr_country" :key="dict.value" :label="dict.label" :value="dict.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="城市" prop="city">
              <el-input v-model="form.city" placeholder="请输入城市" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="官网" prop="website">
              <el-input v-model="form.website" placeholder="https://" maxlength="500" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="排名">
              <el-table :data="rankingRows" size="small" border class="ranking-table">
                <el-table-column label="榜单" min-width="140">
                  <template #default="scope">
                    <el-input v-model="scope.row.list" placeholder="如 QS / THE / USNews" />
                  </template>
                </el-table-column>
                <el-table-column label="年份" width="130">
                  <template #default="scope">
                    <el-input-number v-model="scope.row.year" controls-position="right" :min="2000" :max="2100" style="width: 100%" />
                  </template>
                </el-table-column>
                <el-table-column label="名次" width="130">
                  <template #default="scope">
                    <el-input-number v-model="scope.row.rank" controls-position="right" :min="1" :max="9999" style="width: 100%" />
                  </template>
                </el-table-column>
                <el-table-column label="" width="56" align="center">
                  <template #default="scope">
                    <el-button link type="danger" icon="Delete" @click="rankingRows.splice(scope.$index, 1)" />
                  </template>
                </el-table-column>
              </el-table>
              <el-button class="mt8" size="small" icon="Plus" @click="addRanking">添加排名</el-button>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="教育部认可" prop="moeRecognized">
              <el-radio-group v-model="form.moeRecognized">
                <el-radio v-for="dict in sys_yes_no" :key="dict.value" :value="dict.value">{{ dict.label }}</el-radio>
              </el-radio-group>
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

<script setup name="School">
import { listSchool, getSchool, delSchool, addSchool, updateSchool } from "@/api/abroad/school"

const { proxy } = getCurrentInstance()
const router = useRouter()
const { abr_country, sys_yes_no, sys_normal_disable } = useDict("abr_country", "sys_yes_no", "sys_normal_disable")

const schoolList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
// 排名编辑行：[{ list, year, rank }]，提交时序列化为 rankings JSON 数组
const rankingRows = ref([])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    schoolName: undefined,
    country: undefined,
    status: undefined
  },
  rules: {
    schoolName: [{ required: true, message: "中文名不能为空", trigger: "blur" }],
    schoolNameEn: [{ required: true, message: "英文名不能为空", trigger: "blur" }],
    country: [{ required: true, message: "国家不能为空", trigger: "change" }],
    website: [{ pattern: /^https?:\/\/.+/i, message: "官网应以 http:// 或 https:// 开头", trigger: "blur" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 解析排名 JSON（非法时返回空数组） */
function parseRankings(json) {
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

/** 查询院校列表 */
function getList() {
  loading.value = true
  listSchool(queryParams.value).then(response => {
    schoolList.value = response.rows
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
    schoolId: undefined,
    schoolName: undefined,
    schoolNameEn: undefined,
    country: undefined,
    city: undefined,
    rankings: undefined,
    moeRecognized: "Y",
    website: undefined,
    status: "0",
    remark: undefined
  }
  rankingRows.value = []
  proxy.resetForm("schoolRef")
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
  ids.value = selection.map(item => item.schoolId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 添加一行排名 */
function addRanking() {
  rankingRows.value.push({ list: "QS", year: new Date().getFullYear(), rank: undefined })
}

/** 打开该院校的项目列表 */
function handlePrograms(row) {
  router.push({ path: "/catalog/program", query: { schoolId: row.schoolId } })
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加院校"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const schoolId = row.schoolId || ids.value
  getSchool(schoolId).then(response => {
    form.value = response.data
    rankingRows.value = parseRankings(response.data.rankings).map(r => ({ list: r.list, year: r.year, rank: r.rank }))
    open.value = true
    title.value = "修改院校"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["schoolRef"].validate(valid => {
    if (!valid) {
      return
    }
    const rows = rankingRows.value.filter(r => r.list || r.rank)
    if (rows.some(r => !r.list || !r.year || !r.rank)) {
      proxy.$modal.msgError("排名的榜单、年份、名次都要填写")
      return
    }
    form.value.rankings = JSON.stringify(rows.map(r => ({ list: r.list.trim(), year: r.year, rank: r.rank })))
    if (form.value.schoolId != undefined) {
      updateSchool(form.value).then(() => {
        proxy.$modal.msgSuccess("修改成功")
        open.value = false
        getList()
      })
    } else {
      addSchool(form.value).then(() => {
        proxy.$modal.msgSuccess("新增成功")
        open.value = false
        getList()
      })
    }
  })
}

/** 删除按钮操作 */
function handleDelete(row) {
  const schoolIds = row.schoolId || ids.value
  proxy.$modal.confirm('是否确认删除院校编号为"' + schoolIds + '"的数据项？').then(function() {
    return delSchool(schoolIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download("abroad/school/export", {
    ...queryParams.value
  }, `school_${new Date().getTime()}.xlsx`)
}

getList()
</script>

<style scoped>
.ranking-item {
  display: inline-block;
  margin-right: 8px;
  white-space: nowrap;
}
.ranking-table {
  width: 100%;
}
.mt8 {
  margin-top: 8px;
}
</style>
