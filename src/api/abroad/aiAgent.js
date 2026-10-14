import request from '@/utils/request'

// 查询 Agent 列表
export function listAiAgent(query) {
  return request({
    url: '/abroad/aiAgent/list',
    method: 'get',
    params: query
  })
}

// 查询 Agent 详细
export function getAiAgent(agentId) {
  return request({
    url: '/abroad/aiAgent/' + agentId,
    method: 'get'
  })
}

// 修改 Agent 配置
export function updateAiAgent(data) {
  return request({
    url: '/abroad/aiAgent',
    method: 'put',
    data: data
  })
}

// 试运行 Agent（input、knownNames、facts，经网关完整执行一次并记调用日志）
export function testAiAgent(agentCode, data) {
  return request({
    url: '/abroad/aiAgent/test/' + agentCode,
    method: 'post',
    data: data
  })
}
