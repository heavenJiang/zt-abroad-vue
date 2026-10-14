import request from '@/utils/request'

// 查询项目的申请要求（按申请季，不分页，含字段来源）
export function listRequirement(programId) {
  return request({
    url: '/abroad/requirement/list',
    method: 'get',
    params: { programId: programId }
  })
}

// 查询项目申请要求详细
export function getRequirement(requirementId) {
  return request({
    url: '/abroad/requirement/' + requirementId,
    method: 'get'
  })
}

// 新增项目申请要求
export function addRequirement(data) {
  return request({
    url: '/abroad/requirement',
    method: 'post',
    data: data
  })
}

// 修改项目申请要求
export function updateRequirement(data) {
  return request({
    url: '/abroad/requirement',
    method: 'put',
    data: data
  })
}

// 删除项目申请要求
export function delRequirement(requirementId) {
  return request({
    url: '/abroad/requirement/' + requirementId,
    method: 'delete'
  })
}
