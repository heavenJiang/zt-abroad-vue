import request from '@/utils/request'

// 查询引擎配置版本列表
export function listEngineConfig(query) {
  return request({
    url: '/abroad/engine/list',
    method: 'get',
    params: query
  })
}

// 查询引擎配置版本详细（含配置 JSON）
export function getEngineConfig(configId) {
  return request({
    url: '/abroad/engine/' + configId,
    method: 'get'
  })
}

// 校验引擎配置 JSON（导入前预览，不保存）
export function checkEngineConfig(data) {
  return request({
    url: '/abroad/engine/check',
    method: 'post',
    data: data
  })
}

// 导入引擎配置版本（保存为草稿）
export function importEngineConfig(data) {
  return request({
    url: '/abroad/engine',
    method: 'post',
    data: data
  })
}

// 启用引擎配置版本（同国家 × 学位的上一个启用版本自动停用）
export function activateEngineConfig(configId) {
  return request({
    url: '/abroad/engine/activate/' + configId,
    method: 'put'
  })
}

// 删除引擎配置草稿
export function delEngineConfig(configIds) {
  return request({
    url: '/abroad/engine/' + configIds,
    method: 'delete'
  })
}
