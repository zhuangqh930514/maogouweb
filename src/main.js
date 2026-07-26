import { createApp } from 'vue'
import 'element-plus/theme-chalk/base.css'
// v-loading is a directive, so its CSS is not always discovered by component auto-import.
import 'element-plus/theme-chalk/el-loading.css'
// Empty states are also used from manually imported components in lazy routes.
import 'element-plus/theme-chalk/el-empty.css'
import 'element-plus/theme-chalk/el-message.css'
import 'element-plus/theme-chalk/el-message-box.css'
import App from './App.vue'
import router from './router'
import './styles/index.css'

const app = createApp(App)

app.use(router)

router.isReady().then(() => {
  app.mount('#app')
})
