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

// 可取消的 fetch：取消时返回 { code: 200, canceled: true }，避免 request 拦截器把“canceled”当错误弹出
function cancellableFetch(input, init = {}) {
  const cancel = init.cancelSignal
  const signals = [input && input.signal, init.signal, cancel].filter(Boolean)
  const signal = signals.length > 1 && AbortSignal.any ? AbortSignal.any(signals) : signals[0]
  const options = { ...init, signal: signal }
  delete options.cancelSignal
  return fetch(input, options).catch(err => {
    if (cancel && cancel.aborted) {
      return new Response(JSON.stringify({ code: 200, canceled: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    throw err
  })
}

// AI 预填：抓取官网页面并抽取字段（只返回提议值，不保存）；signal 为 AbortController.signal，用于取消
export function aiPrefillProgram(data, signal) {
  return request({
    url: '/abroad/program/aiPrefill',
    method: 'post',
    data: data,
    timeout: 45000,
    adapter: 'fetch',
    env: { fetch: cancellableFetch },
    fetchOptions: { cancelSignal: signal },
    headers: { repeatSubmit: false }
  })
}
