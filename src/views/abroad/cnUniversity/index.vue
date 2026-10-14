<template>
  <div class="app-container">
    <!-- 模糊匹配测试：与问卷、选校引擎识别本科院校用的是同一个搜索接口 -->
    <el-card shadow="never" class="search-test mb8">
      <div class="search-test-row">
        <span class="search-test-title">搜索测试</span>
        <el-input
          v-model="testKeyword"
          placeholder="输入简称、别名或全称，如 北大、PKU"
          clearable
          style="width: 300px"
          @keyup.enter="handleSearchTest"
        />
        <el-button type="primary" plain icon="Search" @click="handleSearchTest" v-hasPermi="['abroad:cnUniversity:query']">匹配</el-button>
        <span v-if="testSearched && !testResult.length" class="search-test-empty">无匹配，按“双非”处理</span>
      </div>
      <ol v-if="testResult.length" class="search-test-result">
        <li v-for="(u, i) in testResult" :key="u.cnUniversityId">
          <span :class="{ 'top-match': i === 0 }">{{ u.universityName }}</span>
          <dict-tag :options="abr_undergrad_tier" :value="u.tier" class="inline-tag" />
          <span class="sub-text">{{ u.campusType === "1" ? "分校区" : "校本部" }}<template v-if="u.aliases"> · 别名 {{ u.aliases }}</template></span>
        </li>
      </ol>
    </el-card>

    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="名称" prop="universityName">
        <el-input
          v-model="queryParams.universityName"
          placeholder="全称或别名"
          clearable
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="省份" prop="province">
        <el-input
          v-model="queryParams.province"
          placeholder="如 北京"
          clearable
          style="width: 120px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="层次" prop="tier">
        <el-select v-model="queryParams.tier" placeholder="请选择" clearable style="width: 130px">
          <el-option v-for="dict in tierOptions" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="校区" prop="campusType">
        <el-select v-model="queryParams.campusType" placeholder="请选择" clearable style="width: 120px">
          <el-option v-for="c in CAMPUS_TYPES" :key="c.value" :label="c.label" :value="c.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择" clearable style="width: 100px">
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
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['abroad:cnUniversity:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['abroad:cnUniversity:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['abroad:cnUniversity:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['abroad:cnUniversity:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="universityList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="45" align="center" />
      <el-table-column label="高校全称" align="left" prop="universityName" min-width="150" :show-overflow-tooltip="true" />
      <el-table-column label="别名" align="left" prop="aliases" min-width="140" :show-overflow-tooltip="true" />
      <el-table-column label="省份" align="center" prop="province" width="80" />
      <el-table-column label="城市" align="center" prop="city" width="80" />
      <el-table-column label="层次" align="center" prop="tier" width="90">
        <template #default="scope">
          <dict-tag :options="abr_undergrad_tier" :value="scope.row.tier" />
        </template>
      </el-table-column>
      <el-table-column label="C9" align="center" prop="isC9" width="60">
        <template #default="scope">
          <el-tag :type="scope.row.isC9 === 'Y' ? 'success' : 'info'" size="small">{{ yesNo(scope.row.isC9) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="985" align="center" prop="is985" width="60">
        <template #default="scope">
          <el-tag :type="scope.row.is985 === 'Y' ? 'success' : 'info'" size="small">{{ yesNo(scope.row.is985) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="211" align="center" prop="is211" width="60">
        <template #default="scope">
          <el-tag :type="scope.row.is211 === 'Y' ? 'success' : 'info'" size="small">{{ yesNo(scope.row.is211) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="双一流" align="center" prop="isDoubleFirstClass" width="70">
        <template #default="scope">
          <el-tag :type="scope.row.isDoubleFirstClass === 'Y' ? 'success' : 'info'" size="small">{{ yesNo(scope.row.isDoubleFirstClass) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="校区" align="center" prop="campusType" width="80">
        <template #default="scope">
          <span>{{ campusLabel(scope.row.campusType) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status" width="70">
        <template #default="scope">
          <dict-tag :options="sys_normal_disable" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="130" fixed="right" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['abroad:cnUniversity:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['abroad:cnUniversity:remove']">删除</el-button>
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

    <!-- 添加或修改国内高校对话框 -->
    <el-dialog :title="title" v-model="open" width="680px" append-to-body>
      <el-form ref="universityRef" :model="form" :rules="rules" label-width="90px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="高校全称" prop="universityName">
              <el-input v-model="form.universityName" placeholder="请输入高校全称" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="层次" prop="tier">
              <el-select v-model="form.tier" placeholder="请选择" style="width: 100%">
                <el-option v-for="dict in tierOptions" :key="dict.value" :label="dict.label" :value="dict.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="别名" prop="aliases">
              <el-input v-model="form.aliases" placeholder="简称、英文缩写、曾用名，用 | 分隔，如 北大|PKU" maxlength="500" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="省份" prop="province">
              <el-input v-model="form.province" placeholder="如 北京" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="城市" prop="city">
              <el-input v-model="form.city" placeholder="如 北京" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="C9" prop="isC9">
              <el-switch v-model="form.isC9" active-value="Y" inactive-value="N" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="985" prop="is985">
              <el-switch v-model="form.is985" active-value="Y" inactive-value="N" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="211" prop="is211">
              <el-switch v-model="form.is211" active-value="Y" inactive-value="N" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="双一流" prop="isDoubleFirstClass">
              <el-switch v-model="form.isDoubleFirstClass" active-value="Y" inactive-value="N" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="校区" prop="campusType">
              <el-radio-group v-model="form.campusType">
                <el-radio v-for="c in CAMPUS_TYPES" :key="c.value" :value="c.value">{{ c.label }}</el-radio>
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
            <el-form-item label="来源" prop="source">
              <el-input v-model="form.source" placeholder="名单出处，如 教育部 211 工程学校名单" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="说明" prop="note">
              <el-input v-model="form.note" type="textarea" placeholder="如：分校区单独列出的原因" />
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

<script setup name="CnUniversity">
import { listCnUniversity, getCnUniversity, delCnUniversity, addCnUniversity, updateCnUniversity, searchCnUniversity } from "@/api/abroad/cnUniversity"

const { proxy } = getCurrentInstance()
const { abr_undergrad_tier, sys_yes_no, sys_normal_disable } = useDict("abr_undergrad_tier", "sys_yes_no", "sys_normal_disable")

// 校区类型（列注释：0 校本部 1 分校区，无对应字典）
const CAMPUS_TYPES = [
  { value: "0", label: "校本部" },
  { value: "1", label: "分校区" }
]
// 国内高校库只录入重点院校：层次不含“双非”“海本”（后端同样拒绝）
const EXCLUDED_TIERS = ["non_key", "overseas"]

const universityList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const testKeyword = ref("")
const testResult = ref([])
const testSearched = ref(false)

const tierOptions = computed(() => abr_undergrad_tier.value.filter(d => !EXCLUDED_TIERS.includes(d.value)))

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    universityName: undefined,
    province: undefined,
    tier: undefined,
    campusType: undefined,
    status: undefined
  },
  rules: {
    universityName: [{ required: true, message: "高校全称不能为空", trigger: "blur" }],
    tier: [{ required: true, message: "层次不能为空", trigger: "change" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** Y/N 显示名（字典 sys_yes_no） */
function yesNo(v) {
  return proxy.selectDictLabel(sys_yes_no.value, v) || v
}

/** 校区显示名 */
function campusLabel(v) {
  const c = CAMPUS_TYPES.find(x => x.value === v)
  return c ? c.label : v
}

/** 搜索测试 */
function handleSearchTest() {
  const kw = (testKeyword.value || "").trim()
  if (!kw) {
    testResult.value = []
    testSearched.value = false
    return
  }
  searchCnUniversity(kw, 10).then(response => {
    testResult.value = response.data || []
    testSearched.value = true
  })
}

/** 查询国内高校列表 */
function getList() {
  loading.value = true
  listCnUniversity(queryParams.value).then(response => {
    universityList.value = response.rows
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
    cnUniversityId: undefined,
    universityName: undefined,
    aliases: undefined,
    province: undefined,
    city: undefined,
    isC9: "N",
    is985: "N",
    is211: "N",
    isDoubleFirstClass: "N",
    tier: undefined,
    campusType: "0",
    source: undefined,
    note: undefined,
    status: "0"
  }
  proxy.resetForm("universityRef")
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
  ids.value = selection.map(item => item.cnUniversityId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加国内高校"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const cnUniversityId = row.cnUniversityId || ids.value
  getCnUniversity(cnUniversityId).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改国内高校"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["universityRef"].validate(valid => {
    if (valid) {
      if (form.value.cnUniversityId != undefined) {
        updateCnUniversity(form.value).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addCnUniversity(form.value).then(() => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

/** 删除按钮操作 */
function handleDelete(row) {
  const cnUniversityIds = row.cnUniversityId || ids.value
  proxy.$modal.confirm('是否确认删除国内高校编号为"' + cnUniversityIds + '"的数据项？').then(function() {
    return delCnUniversity(cnUniversityIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download("abroad/cnUniversity/export", {
    ...queryParams.value
  }, `cnUniversity_${new Date().getTime()}.xlsx`)
}

getList()
</script>

<style scoped>
.search-test :deep(.el-card__body) {
  padding: 12px 16px;
}
.search-test-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.search-test-title {
  font-weight: 600;
}
.search-test-empty {
  color: var(--el-color-warning);
  font-size: 13px;
}
.search-test-result {
  margin: 8px 0 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 26px;
}
.top-match {
  font-weight: 600;
}
.inline-tag {
  display: inline-block;
  margin: 0 6px;
}
.sub-text {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
