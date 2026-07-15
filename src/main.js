import { createApp } from 'vue'
import 'element-plus/theme-chalk/base.css'
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
