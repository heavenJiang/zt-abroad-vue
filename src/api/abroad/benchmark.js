import request from '@/utils/request'

// 查询参考线列表
export function listBenchmark(query) {
  return request({
    url: '/abroad/benchmark/list',
    method: 'get',
    params: query
  })
}

// 查询参考线详细
export function getBenchmark(benchmarkId) {
  return request({
    url: '/abroad/benchmark/' + benchmarkId,
    method: 'get'
  })
}

// 新增参考线
export function addBenchmark(data) {
  return request({
    url: '/abroad/benchmark',
    method: 'post',
    data: data
  })
}

// 修改参考线
export function updateBenchmark(data) {
  return request({
    url: '/abroad/benchmark',
    method: 'put',
    data: data
  })
}

// 删除参考线
export function delBenchmark(benchmarkIds) {
  return request({
    url: '/abroad/benchmark/' + benchmarkIds,
    method: 'delete'
  })
}
