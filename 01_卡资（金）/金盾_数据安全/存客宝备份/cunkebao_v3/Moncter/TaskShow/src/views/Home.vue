<template>
  <div class="home-container">
    <el-container>
      <el-header>
        <h1>Task Show</h1>
      </el-header>
      <el-main>
        <el-card>
          <template #header>
            <div class="card-header">
              <span>欢迎使用</span>
            </div>
          </template>
          <p>这是一个基于 Vue3 + Element Plus + Pinia + TypeScript + Axios 的基础工程</p>
          <el-button type="primary" @click="handleTestRequest">测试请求</el-button>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { request } from '@/utils/request'
import { useUserStore } from '@/store'

const userStore = useUserStore()

onMounted(() => {
  // 初始化 token
  userStore.initToken()
})

const handleTestRequest = async () => {
  try {
    // 示例：测试 GET 请求
    const response = await request.get('/test', { id: 1 })
    ElMessage.success('请求成功: ' + JSON.stringify(response))
  } catch (error) {
    console.error('请求失败:', error)
  }
}
</script>

<style scoped>
.home-container {
  width: 100%;
  min-height: 100vh;
}

.el-header {
  background-color: #409eff;
  color: white;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.el-header h1 {
  margin: 0;
  font-size: 24px;
}

.el-main {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

