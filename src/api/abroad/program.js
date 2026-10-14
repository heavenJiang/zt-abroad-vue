import request from '@/utils/request'

// 查询项目列表
export function listProgram(query) {
  return request({
    url: '/abroad/program/list',
    method: 'get',
    params: query
  })
}

// 查询项目详细
export function getProgram(programId) {
  return request({
    url: '/abroad/program/' + programId,
    method: 'get'
  })
}

// 新增项目
export function addProgram(data) {
  return request({
    url: '/abroad/program',
    method: 'post',
    data: data
  })
}

// 修改项目
export function updateProgram(data) {
  return request({
    url: '/abroad/program',
    method: 'put',
    data: data
  })
}

// 删除项目
export function delProgram(programId) {
  return request({
    url: '/abroad/program/' + programId,
    method: 'delete'
  })
}

// 确认导入项目（预览返回的 token，30 分钟内有效，只能使用一次）
export function importConfirm(token) {
  return request({
    url: '/abroad/program/importConfirm/' + token,
    method: 'post'
  })
}
