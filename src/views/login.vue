<template>
  <div class="login">
    <!-- 背景 -->
    <div class="bg">
      <div class="glow glow-1"></div>
      <div class="glow glow-2"></div>
      <div class="grid"></div>
    </div>

    <main class="main">
      <div class="card">
        <div class="brand">
          <img :src="logo" class="logo" alt="logo" />
          <span class="brand-name">{{ title }}</span>
        </div>
        <p class="card-desc">留学智能体 · AI 驱动的留学服务平台</p>

        <el-form ref="loginRef" :model="loginForm" :rules="loginRules" class="login-form">
          <el-form-item prop="username">
            <el-input
              v-model="loginForm.username"
              type="text"
              size="large"
              auto-complete="off"
              placeholder="账号"
            >
              <template #prefix><svg-icon icon-class="user" class="input-icon" /></template>
            </el-input>
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              size="large"
              auto-complete="off"
              placeholder="密码"
              show-password
              @keyup.enter="handleLogin"
            >
              <template #prefix><svg-icon icon-class="password" class="input-icon" /></template>
            </el-input>
          </el-form-item>
          <el-form-item prop="code" v-if="captchaEnabled">
            <div class="code-row">
              <el-input
                v-model="loginForm.code"
                size="large"
                auto-complete="off"
                placeholder="验证码"
                @keyup.enter="handleLogin"
              >
                <template #prefix><svg-icon icon-class="validCode" class="input-icon" /></template>
              </el-input>
              <div class="login-code" title="看不清？点击刷新">
                <img :src="codeUrl" @click="getCode" class="login-code-img" />
              </div>
            </div>
          </el-form-item>
          <div class="form-extra">
            <el-checkbox v-model="loginForm.rememberMe">记住密码</el-checkbox>
            <router-link v-if="register" class="link" :to="'/register'">立即注册</router-link>
          </div>
          <el-button
            :loading="loading"
            size="large"
            type="primary"
            class="submit"
            @click.prevent="handleLogin"
          >
            <span v-if="!loading">登 录</span>
            <span v-else>登 录 中...</span>
          </el-button>
        </el-form>
      </div>
    </main>

    <footer class="footer">{{ footerContent }}</footer>
  </div>
</template>

<script setup>
import { getCodeImg } from "@/api/login"
import Cookies from "js-cookie"
import { encrypt, decrypt } from "@/utils/jsencrypt"
import useUserStore from '@/store/modules/user'
import defaultSettings from '@/settings'
import logo from '@/assets/logo/logo.svg'

const title = import.meta.env.VITE_APP_TITLE
const footerContent = defaultSettings.footerContent
const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const { proxy } = getCurrentInstance()

const loginForm = ref({
  username: "admin",
  password: "admin123",
  rememberMe: false,
  code: "",
  uuid: ""
})

const loginRules = {
  username: [{ required: true, trigger: "blur", message: "请输入您的账号" }],
  password: [{ required: true, trigger: "blur", message: "请输入您的密码" }],
  code: [{ required: true, trigger: "change", message: "请输入验证码" }]
}

const codeUrl = ref("")
const loading = ref(false)
// 验证码开关
const captchaEnabled = ref(true)
// 注册开关
const register = ref(false)
const redirect = ref(undefined)

watch(route, (newRoute) => {
    redirect.value = newRoute.query && newRoute.query.redirect
}, { immediate: true })

function handleLogin() {
  proxy.$refs.loginRef.validate(valid => {
    if (valid) {
      loading.value = true
      // 勾选了需要记住密码设置在 cookie 中设置记住用户名和密码
      if (loginForm.value.rememberMe) {
        Cookies.set("username", loginForm.value.username, { expires: 30 })
        Cookies.set("password", encrypt(loginForm.value.password), { expires: 30 })
        Cookies.set("rememberMe", loginForm.value.rememberMe, { expires: 30 })
      } else {
        // 否则移除
        Cookies.remove("username")
        Cookies.remove("password")
        Cookies.remove("rememberMe")
      }
      // 调用action的登录方法
      userStore.login(loginForm.value).then(() => {
        const query = route.query
        const otherQueryParams = Object.keys(query).reduce((acc, cur) => {
          if (cur !== "redirect") {
            acc[cur] = query[cur]
          }
          return acc
        }, {})
        router.push({ path: redirect.value || "/", query: otherQueryParams })
      }).catch(() => {
        loading.value = false
        // 重新获取验证码
        if (captchaEnabled.value) {
          getCode()
        }
      })
    }
  })
}

function getCode() {
  getCodeImg().then(res => {
    captchaEnabled.value = res.captchaEnabled === undefined ? true : res.captchaEnabled
    if (captchaEnabled.value) {
      codeUrl.value = "data:image/gif;base64," + res.img
      loginForm.value.uuid = res.uuid
    }
  })
}

function getCookie() {
  const username = Cookies.get("username")
  const password = Cookies.get("password")
  const rememberMe = Cookies.get("rememberMe")
  loginForm.value = {
    username: username === undefined ? loginForm.value.username : username,
    password: password === undefined ? loginForm.value.password : decrypt(password),
    rememberMe: rememberMe === undefined ? false : Boolean(rememberMe)
  }
}

getCode()
getCookie()
</script>

<style lang='scss' scoped>
.login {
  --c1: #2b6bff;
  --c2: #00c2d4;
  --text: #0f172a;
  --text-2: #64748b;
  --text-3: #94a3b8;
  --page-bg: #f7f9fc;
  --card-bg: rgba(255, 255, 255, 0.82);
  --card-border: rgba(15, 23, 42, 0.06);
  --input-bg: #f2f4f8;
  --grid-line: rgba(15, 23, 42, 0.05);

  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 600px;
  overflow: hidden;
  background: var(--page-bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif;
}

/* ---------- 背景：光晕集中在内容后方 ---------- */
.bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.glow {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 50%;
  filter: blur(80px);
  animation: breathe 10s ease-in-out infinite;
}
.glow-1 {
  width: 640px; height: 420px;
  transform: translate(-62%, -58%);
  background: radial-gradient(circle, rgba(43, 107, 255, 0.28), transparent 70%);
}
.glow-2 {
  width: 560px; height: 380px;
  transform: translate(-38%, -38%);
  background: radial-gradient(circle, rgba(0, 194, 212, 0.22), transparent 70%);
  animation-delay: -5s;
}
.grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(ellipse 60% 55% at 50% 45%, #000 10%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 60% 55% at 50% 45%, #000 10%, transparent 75%);
}
@keyframes breathe {
  0%, 100% { opacity: 0.85; }
  50% { opacity: 1; }
}

/* ---------- 主体 ---------- */
.main {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
}
.card {
  width: 100%;
  max-width: 400px;
  padding: 36px 36px 32px;
  box-sizing: border-box;
  border-radius: 20px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 20px 50px -16px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.logo {
  width: 28px;
  height: 28px;
  border-radius: 7px;
}
.brand-name {
  font-size: 18px;
  font-weight: 600;
  line-height: 28px;
  letter-spacing: 0.5px;
}
.card-desc {
  margin: 0 0 32px;
  font-size: 13px;
  color: var(--text-2);
}

.login-form {
  :deep(.el-form-item) { margin-bottom: 18px; }
  :deep(.el-input__wrapper) {
    height: 46px;
    padding: 0 14px;
    border-radius: 12px;
    background: var(--input-bg);
    box-shadow: 0 0 0 1px transparent inset;
    transition: box-shadow 0.2s, background 0.2s;
  }
  :deep(.el-input__wrapper:hover) {
    box-shadow: 0 0 0 1px rgba(43, 107, 255, 0.25) inset;
  }
  :deep(.el-input__wrapper.is-focus) {
    background: transparent;
    box-shadow: 0 0 0 1px var(--c1) inset, 0 0 0 4px rgba(43, 107, 255, 0.12);
  }
  :deep(.el-form-item.is-error .el-input__wrapper) {
    box-shadow: 0 0 0 1px var(--el-color-danger) inset;
  }
  :deep(.el-input__inner) { color: var(--text); }
  .input-icon {
    width: 15px; height: 15px;
    color: var(--text-3);
  }
}
.code-row {
  display: flex;
  gap: 12px;
  width: 100%;
  .el-input { flex: 1; }
}
.login-code {
  flex: 0 0 116px;
  height: 46px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--card-border);
  box-sizing: border-box;
  cursor: pointer;
}
.login-code-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.form-extra {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -2px 0 22px;
  :deep(.el-checkbox__label) { color: var(--text-2); font-weight: 400; }
}
.link {
  font-size: 14px;
  color: var(--c1);
  &:hover { opacity: 0.8; }
}
.submit {
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 2px;
  background: linear-gradient(90deg, var(--c1), #3d8bff);
  box-shadow: 0 8px 20px -8px rgba(43, 107, 255, 0.6);
  transition: filter 0.2s, transform 0.15s;
  &:hover { filter: brightness(1.06); }
  &:active { transform: translateY(1px); }
}

.footer {
  position: relative;
  z-index: 1;
  padding: 0 16px 24px;
  text-align: center;
  font-size: 12px;
  color: var(--text-3);
}

@media (max-width: 480px) {
  .card { padding: 28px 20px 24px; }
}

@media (prefers-reduced-motion: reduce) {
  .glow { animation: none; }
}

/* ---------- 暗色 ---------- */
html.dark .login {
  --text: #e5e7eb;
  --text-2: #94a3b8;
  --text-3: #64748b;
  --page-bg: #0a0d14;
  --card-bg: rgba(22, 27, 38, 0.72);
  --card-border: rgba(255, 255, 255, 0.08);
  --input-bg: rgba(255, 255, 255, 0.05);
  --grid-line: rgba(255, 255, 255, 0.04);
  .card { box-shadow: 0 24px 60px -16px rgba(0, 0, 0, 0.6); }
}
</style>
