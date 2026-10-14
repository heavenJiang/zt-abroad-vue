import request from '@/utils/request'

// 查询问卷版本列表
export function listQuestionnaire(query) {
  return request({
    url: '/abroad/questionnaire/list',
    method: 'get',
    params: query
  })
}

// 查询问卷版本详细（含问卷定义 JSON）
export function getQuestionnaire(questionnaireId) {
  return request({
    url: '/abroad/questionnaire/' + questionnaireId,
    method: 'get'
  })
}

// 校验问卷 JSON（导入前预览，不保存）
export function checkQuestionnaire(data) {
  return request({
    url: '/abroad/questionnaire/check',
    method: 'post',
    data: data
  })
}

// 导入问卷版本（保存为草稿）
export function importQuestionnaire(data) {
  return request({
    url: '/abroad/questionnaire',
    method: 'post',
    data: data
  })
}

// 启用问卷版本（同编码的上一个启用版本自动停用）
export function activateQuestionnaire(questionnaireId) {
  return request({
    url: '/abroad/questionnaire/activate/' + questionnaireId,
    method: 'put'
  })
}

// 删除问卷草稿
export function delQuestionnaire(questionnaireIds) {
  return request({
    url: '/abroad/questionnaire/' + questionnaireIds,
    method: 'delete'
  })
}
