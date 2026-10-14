import request from '@/utils/request'

// 查询 AI 审核队列列表
export function listAiReview(query) {
  return request({
    url: '/abroad/aiReview/list',
    method: 'get',
    params: query
  })
}

// 查询 AI 审核记录详细
export function getAiReview(reviewId) {
  return request({
    url: '/abroad/aiReview/' + reviewId,
    method: 'get'
  })
}

// 审核通过
export function approveAiReview(reviewId) {
  return request({
    url: '/abroad/aiReview/approve/' + reviewId,
    method: 'put'
  })
}

// 审核驳回（reason 必填）
export function rejectAiReview(reviewId, data) {
  return request({
    url: '/abroad/aiReview/reject/' + reviewId,
    method: 'put',
    data: data
  })
}

// 修改后通过（editedContent 为 JSON 文本，reason 可选）
export function editAiReview(reviewId, data) {
  return request({
    url: '/abroad/aiReview/edit/' + reviewId,
    method: 'put',
    data: data
  })
}
