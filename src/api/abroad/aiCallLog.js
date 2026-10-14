import request from '@/utils/request'

// 查询 AI 调用日志列表
export function listAiCallLog(query) {
  return request({
    url: '/abroad/aiCallLog/list',
    method: 'get',
    params: query
  })
}

// 查询 AI 调用日志详细（含去标识化的输入摘要与输出）
export function getAiCallLog(callId) {
  return request({
    url: '/abroad/aiCallLog/' + callId,
    method: 'get'
  })
}

// 查询 AI 用量统计（beginTime、endTime 为 yyyy-MM-dd，按北京时间，含首尾）
export function statAiCallLog(query) {
  return request({
    url: '/abroad/aiCallLog/stats',
    method: 'get',
    params: query
  })
}
