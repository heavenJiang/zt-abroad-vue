import request from '@/utils/request'

// 查询测评列表
export function listAssessment(query) {
  return request({
    url: '/abroad/assessment/list',
    method: 'get',
    params: query
  })
}

// 查询测评详细（答案 + 背景档案）
export function getAssessment(assessmentId) {
  return request({
    url: '/abroad/assessment/' + assessmentId,
    method: 'get'
  })
}

// 重新归一化（按当前换算表与院校层次重算背景档案）
export function normalizeAssessment(assessmentId) {
  return request({
    url: '/abroad/assessment/' + assessmentId + '/normalize',
    method: 'post'
  })
}

// 计算（或重新计算）选校结果（重新归一化后按启用的引擎配置、院校库与参考线计算）
export function computeAssessment(assessmentId) {
  return request({
    url: '/abroad/assessment/' + assessmentId + '/compute',
    method: 'post'
  })
}
