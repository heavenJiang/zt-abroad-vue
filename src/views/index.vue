<template>
  <div class="app-container home">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card shadow="never">
          <h2>{{ title }}</h2>
          <p class="desc">留学智能体管理平台，欢迎使用。</p>
          <p class="version"><b>当前版本：</b><span>v{{ version }}</span></p>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup name="Index">
const title = import.meta.env.VITE_APP_TITLE
const version = ref('3.9.2')
</script>

<style scoped lang="scss">
.home {
  h2 {
    margin-top: 10px;
    font-size: 24px;
    font-weight: 400;
  }

  .desc {
    color: var(--el-text-color-regular);
    font-size: 14px;
  }

  .version {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}
</style>
