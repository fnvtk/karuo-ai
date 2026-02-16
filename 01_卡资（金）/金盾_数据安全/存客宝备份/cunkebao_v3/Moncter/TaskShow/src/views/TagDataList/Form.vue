<template>
  <div class="tag-data-list-form">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>{{ isEdit ? '编辑数据列表' : '创建数据列表' }}</span>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
      >
        <!-- 基本信息 -->
        <el-divider>基本信息</el-divider>
        <el-form-item label="列表名称" prop="list_name">
          <el-input v-model="form.list_name" placeholder="例如: 消费记录表" />
          <div class="form-tip">数据列表的显示名称</div>
        </el-form-item>
        <el-form-item label="列表编码" prop="list_code">
          <el-input v-model="form.list_code" placeholder="例如: consumption_records" :disabled="isEdit" />
          <div class="form-tip">唯一标识，创建后不可修改</div>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入数据列表描述（可选）"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 查询配置 -->
        <el-divider>查询配置</el-divider>
        <div class="form-tip" style="margin-bottom: 20px;">
          通过可视化界面配置MongoDB查询，支持过滤条件、联表查询、排序等功能
        </div>

        <QueryBuilder v-model="queryConfig" />

        <!-- 操作按钮 -->
        <el-form-item style="margin-top: 30px;">
          <el-button type="primary" @click="handleSubmit" :loading="submitting">保存</el-button>
          <el-button @click="handleCancel">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElForm } from 'element-plus'
import QueryBuilder from '@/components/QueryBuilder/QueryBuilder.vue'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()
const formRef = ref<InstanceType<typeof ElForm>>()
const submitting = ref(false)

const isEdit = computed(() => !!route.params.id)

// 表单数据
const form = reactive({
  list_name: '',
  list_code: '',
  description: '',
  status: 1
})

// 查询配置
const queryConfig = reactive({
  data_source_id: '',
  database: '',
  collection: '',
  filter: [],
  lookups: [],
  sort_field: '',
  sort_order: '1',
  limit: 1000
})

// 验证规则
const rules = {
  list_name: [{ required: true, message: '请输入列表名称', trigger: 'blur' }],
  list_code: [{ required: true, message: '请输入列表编码', trigger: 'blur' }]
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  // 验证查询配置
  const hasCollection = queryConfig.multi_collection 
    ? (queryConfig.collections && queryConfig.collections.length > 0)
    : queryConfig.collection
    
  if (!queryConfig.data_source_id || !queryConfig.database || !hasCollection) {
    ElMessage.warning('请完成查询配置（数据源、数据库、集合）')
    return
  }

  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        const submitData = {
          list_name: form.list_name,
          list_code: form.list_code,
          description: form.description || undefined,
          status: form.status,
          data_source_id: queryConfig.data_source_id,
          database: queryConfig.database,
          collection: queryConfig.multi_collection ? (queryConfig.collections[0] || '') : queryConfig.collection,
          multi_collection: queryConfig.multi_collection,
          collections: queryConfig.multi_collection ? queryConfig.collections : undefined,
          query_config: {
            filter: queryConfig.filter,
            lookups: queryConfig.lookups,
            sort: queryConfig.sort_field ? {
              [queryConfig.sort_field]: parseInt(queryConfig.sort_order)
            } : undefined,
            limit: queryConfig.limit
          }
        }

        // TODO: 替换为真实API
        // if (isEdit.value) {
        //   await request.put(`/tag-data-lists/${route.params.id}`, submitData)
        // } else {
        //   await request.post('/tag-data-lists', submitData)
        // }
        
        // Mock保存
        await new Promise(resolve => setTimeout(resolve, 500))
        console.log('保存的数据：', submitData)
        ElMessage.success(isEdit.value ? '数据列表更新成功（Mock）' : '数据列表创建成功（Mock）')
        
        router.push('/tag-data-lists')
      } catch (error: any) {
        ElMessage.error(error.message || '保存失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

// 取消
const handleCancel = () => {
  router.back()
}

// 加载详情
const loadDetail = async () => {
  if (!isEdit.value) return

  try {
    const response = await request.get(`/tag-data-lists/${route.params.id}`)
    if (response.code === 200) {
      const data = response.data
      Object.assign(form, {
        list_name: data.list_name || '',
        list_code: data.list_code || '',
        description: data.description || '',
        status: data.status ?? 1
      })

      // 加载查询配置
      if (data.query_config) {
        Object.assign(queryConfig, {
          data_source_id: data.data_source_id || '',
          database: data.database || '',
          collection: data.collection || '',
          multi_collection: data.multi_collection || false,
          collections: data.collections || [],
          filter: data.query_config.filter || [],
          lookups: data.query_config.lookups || [],
          sort_field: data.query_config.sort ? Object.keys(data.query_config.sort)[0] : '',
          sort_order: data.query_config.sort ? String(Object.values(data.query_config.sort)[0]) : '1',
          limit: data.query_config.limit || 1000
        })
      }
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载详情失败')
  }
}

onMounted(() => {
  if (isEdit.value) {
    loadDetail()
  }
})
</script>

<style scoped lang="scss">
.tag-data-list-form {
  .card-header {
    font-weight: 500;
    font-size: 16px;
  }

  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 5px;
    line-height: 1.5;
  }
}
</style>
