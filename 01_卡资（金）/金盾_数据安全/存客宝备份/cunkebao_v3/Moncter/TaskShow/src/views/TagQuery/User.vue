<template>
  <div class="user-tag-query">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>用户标签查询</span>
        </div>
      </template>

      <!-- 查询表单 -->
      <el-form :inline="true" :model="queryForm" @submit.prevent="handleQuery">
        <el-form-item label="用户ID">
          <el-input
            v-model="queryForm.user_id"
            placeholder="请输入用户ID"
            clearable
          />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input
            v-model="queryForm.phone"
            placeholder="请输入手机号"
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery" :loading="loading">
            查询
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 用户信息 -->
      <div class="user-info" v-if="userInfo">
        <el-descriptions title="用户基本信息" :column="2" border>
          <el-descriptions-item label="用户ID">{{ userInfo.user_id }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ userInfo.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ maskPhone(userInfo.phone) }}</el-descriptions-item>
          <el-descriptions-item label="总消费金额">
            ¥{{ userInfo.total_amount?.toFixed(2) || '0.00' }}
          </el-descriptions-item>
          <el-descriptions-item label="消费次数">{{ userInfo.total_count || 0 }}</el-descriptions-item>
          <el-descriptions-item label="最后消费时间">
            {{ userInfo.last_consume_time || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 标签列表 -->
      <div class="tags-section" v-if="tags.length > 0">
        <div class="section-header">
          <h3>用户标签</h3>
          <el-button type="primary" @click="handleRecalculate">
            重新计算标签
          </el-button>
        </div>
        <el-table :data="tags" border>
          <el-table-column prop="tag_name" label="标签名称" width="150" />
          <el-table-column prop="tag_code" label="标签编码" width="180" />
          <el-table-column prop="category" label="分类" width="120" />
          <el-table-column prop="tag_value" label="标签值" width="150" />
          <el-table-column prop="confidence" label="置信度" width="100">
            <template #default="{ row }">
              <el-progress :percentage="row.confidence" :show-text="false" />
              <span style="margin-left: 10px;">{{ row.confidence }}%</span>
            </template>
          </el-table-column>
          <el-table-column prop="update_time" label="更新时间" width="180" />
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button type="primary" @click="handleViewHistory(row.tag_id)">
                查看历史
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 空状态 -->
      <el-empty v-if="!loading && !userInfo && !queryForm.user_id && !queryForm.phone" description="请输入用户ID或手机号进行查询" />
      <el-empty v-if="!loading && userInfo && tags.length === 0" description="该用户暂无标签" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { UserInfo, UserTag } from '@/types'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const userInfo = ref<UserInfo | null>(null)
const tags = ref<UserTag[]>([])

const queryForm = reactive({
  user_id: '',
  phone: ''
})

const handleQuery = async () => {
  if (!queryForm.user_id && !queryForm.phone) {
    ElMessage.warning('请输入用户ID或手机号')
    return
  }

  loading.value = true
  try {
    // TODO: 根据用户ID或手机号查询用户信息
    // 然后调用标签查询API
    // const response = await request.get(`/users/${userId}/tags`)
    // tags.value = response.data.tags
    
    // 模拟数据
    userInfo.value = {
      user_id: queryForm.user_id || 'user-1',
      name: '张三',
      phone: '13800138000',
      total_amount: 5000,
      total_count: 10
    }
    tags.value = []
  } catch (error) {
    ElMessage.error('查询失败')
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  queryForm.user_id = ''
  queryForm.phone = ''
  userInfo.value = null
  tags.value = []
}

const handleRecalculate = async () => {
  if (!userInfo.value) return
  
  try {
    // TODO: 调用重新计算API
    // await request.put(`/users/${userInfo.value.user_id}/tags`)
    ElMessage.success('标签重新计算成功')
    handleQuery()
  } catch (error) {
    ElMessage.error('重新计算失败')
  }
}

const handleViewHistory = (tagId: string) => {
  router.push(`/tag-query/history?user_id=${userInfo.value?.user_id}&tag_id=${tagId}`)
}

const maskPhone = (phone?: string) => {
  if (!phone) return '-'
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

onMounted(() => {
  // 如果URL中有user_id参数，自动查询
  const userId = route.query.user_id as string
  if (userId) {
    queryForm.user_id = userId
    handleQuery()
  }
})
</script>

<style scoped lang="scss">
.user-tag-query {
  .card-header {
    font-weight: 500;
    font-size: 16px;
  }

  .user-info {
    margin-top: 20px;
    margin-bottom: 30px;
  }

  .tags-section {
    margin-top: 30px;

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        color: #303133;
      }
    }
  }
}
</style>

