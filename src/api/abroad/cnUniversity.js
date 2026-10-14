import request from '@/utils/request'

// 查询国内高校列表
export function listCnUniversity(query) {
  return request({
    url: '/abroad/cnUniversity/list',
    method: 'get',
    params: query
  })
}

// 查询国内高校详细
export function getCnUniversity(cnUniversityId) {
  return request({
    url: '/abroad/cnUniversity/' + cnUniversityId,
    method: 'get'
  })
}

// 新增国内高校
export function addCnUniversity(data) {
  return request({
    url: '/abroad/cnUniversity',
    method: 'post',
    data: data
  })
}

// 修改国内高校
export function updateCnUniversity(data) {
  return request({
    url: '/abroad/cnUniversity',
    method: 'put',
    data: data
  })
}

// 删除国内高校
export function delCnUniversity(cnUniversityId) {
  return request({
    url: '/abroad/cnUniversity/' + cnUniversityId,
    method: 'delete'
  })
}

// 按名称或别名模糊搜索国内高校（按匹配度排序）
export function searchCnUniversity(keyword, limit) {
  return request({
    url: '/abroad/cnUniversity/search',
    method: 'get',
    params: { keyword: keyword, limit: limit }
  })
}
