import request from '@/utils/request'

// 查询院校列表
export function listSchool(query) {
  return request({
    url: '/abroad/school/list',
    method: 'get',
    params: query
  })
}

// 查询院校详细
export function getSchool(schoolId) {
  return request({
    url: '/abroad/school/' + schoolId,
    method: 'get'
  })
}

// 新增院校
export function addSchool(data) {
  return request({
    url: '/abroad/school',
    method: 'post',
    data: data
  })
}

// 修改院校
export function updateSchool(data) {
  return request({
    url: '/abroad/school',
    method: 'put',
    data: data
  })
}

// 删除院校
export function delSchool(schoolId) {
  return request({
    url: '/abroad/school/' + schoolId,
    method: 'delete'
  })
}
