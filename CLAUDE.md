# zt-abroad-vue 项目说明

- 留学智能体平台管理后台前端，基于 RuoYi-Vue3 3.9.2（与 `../zt-vue` 同一套脚手架）：Vue 3 + Vite + Element Plus + Pinia，JavaScript。
- 前端规范 `doc/前端开发规范.md` **必须遵守**；后端规范与设计文档在 `../zt-abroad-parent/doc/`（技术口径以 `doc/研发/00-RuoYi落地对照.md` 为准，页面清单与验收标准见 `doc/研发/04-模块拆分.md`）。
- 业务页面放 `src/views/abroad/<资源>/index.vue`，接口放 `src/api/abroad/<资源>.js`；权限标识 `abroad:资源:操作`，字典 `abr_含义`，与后端路径 `/abroad/资源` 一致。
- 开发代理 `/dev-api` → `http://localhost:8090`（可用环境变量 `ZT_BACKEND` 覆盖）。
- 不引入新的第三方依赖（须评审）；不硬编码可配置枚举，一律用字典。
- AI 生成内容页面上标明“AI 生成，待审核 / 已审核”；学生只看冲 / 稳 / 保分档，不展示录取概率百分比。
- `bin/*.bat` 保持 GBK + CRLF，编辑时按字节处理。
- 提交前执行 `npm run build:prod`，不得有编译错误。
