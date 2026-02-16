<template>
  <div class="data-source-form">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>{{ isEdit ? '编辑数据源' : '创建数据源' }}</span>
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
        <el-form-item label="数据源名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入数据源名称" />
        </el-form-item>
        <el-form-item label="数据源类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择数据源类型" @change="handleTypeChange">
            <el-option label="MongoDB" value="mongodb" />
            <el-option label="MySQL" value="mysql" />
            <el-option label="PostgreSQL" value="postgresql" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入描述"
          />
        </el-form-item>

        <!-- 连接配置 -->
        <el-divider>连接配置</el-divider>
        <el-form-item label="主机地址" prop="host">
          <el-input v-model="form.host" placeholder="例如: 192.168.1.106" />
        </el-form-item>
        <el-form-item label="端口" prop="port">
          <el-input-number v-model="form.port" :min="1" :max="65535" placeholder="例如: 27017" />
        </el-form-item>
        <el-form-item label="数据库名" prop="database">
          <el-input v-model="form.database" placeholder="请输入数据库名" />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            :placeholder="isEdit ? '留空则不修改密码' : '请输入密码'"
            show-password
          />
        </el-form-item>
        <el-form-item
          v-if="form.type === 'mongodb'"
          label="认证数据库"
          prop="auth_source"
        >
          <el-input v-model="form.auth_source" placeholder="例如: admin" />
          <div class="form-tip">MongoDB认证数据库，默认为admin</div>
        </el-form-item>

        <!-- 标签引擎数据库标识 -->
        <el-form-item label="标签引擎数据库" prop="is_tag_engine">
          <el-switch
            v-model="form.is_tag_engine"
            active-text="是"
            inactive-text="否"
          />
          <div class="form-tip">
            标识此数据源是否为标签引擎数据库（ckb数据库）。设置为"是"时，系统会自动将其他数据源设置为"否"，确保只有一个标签引擎数据库。
          </div>
        </el-form-item>

        <!-- 状态 -->
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 操作按钮 -->
        <el-form-item>
          <el-button type="primary" @click="handleTestConnection" :loading="testing">
            测试连接
          </el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            保存
          </el-button>
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
import { useDataSourceStore } from '@/store/dataSource'
import type { DataSource } from '@/api/dataSource'

const route = useRoute()
const router = useRouter()
const formRef = ref<InstanceType<typeof ElForm>>()
const store = useDataSourceStore()

const isEdit = computed(() => !!route.params.id)
const testing = ref(false)
const submitting = ref(false)

const form = reactive<Partial<DataSource>>({
  name: '',
  type: 'mongodb',
  host: '',
  port: 27017,
  database: '',
  username: '',
  password: '',
  auth_source: 'admin',
  description: '',
  is_tag_engine: false,
  status: 1,
})

const rules = {
  name: [{ required: true, message: '请输入数据源名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择数据源类型', trigger: 'change' }],
  host: [{ required: true, message: '请输入主机地址', trigger: 'blur' }],
  port: [{ required: true, message: '请输入端口', trigger: 'blur' }],
  database: [{ required: true, message: '请输入数据库名', trigger: 'blur' }],
}

const handleTypeChange = () => {
  // 根据类型设置默认端口
  if (form.type === 'mongodb') {
    form.port = 27017
    form.auth_source = 'admin'
  } else if (form.type === 'mysql') {
    form.port = 3306
    form.auth_source = undefined
  } else if (form.type === 'postgresql') {
    form.port = 5432
    form.auth_source = undefined
  }
}

const handleTestConnection = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    testing.value = true
    try {
      const connected = await store.testConnection({
        type: form.type!,
        host: form.host!,
        port: form.port!,
        database: form.database!,
        username: form.username,
        password: form.password,
        auth_source: form.auth_source,
      })
      
      // 统一在这里显示成功/失败消息
      if (connected) {
        ElMessage.success('连接测试成功')
      } else {
        ElMessage.error('连接测试失败')
      }
    } catch (error: any) {
      // store 内部已经显示了错误消息，这里不需要重复显示
      console.error('连接测试失败:', error)
    } finally {
      testing.value = false
    }
  })
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      const formData = { ...form }

      // 如果是编辑且密码为空，则不提交密码字段
      if (isEdit.value && !formData.password) {
        delete formData.password
      }

      if (isEdit.value) {
        await store.updateDataSource(route.params.id as string, formData)
      } else {
        await store.createDataSource(formData)
      }

      router.push('/data-sources')
    } catch (error: any) {
      ElMessage.error(error.message || '保存失败')
    } finally {
      submitting.value = false
    }
  })
}

const handleCancel = () => {
  router.back()
}

const loadDataSourceDetail = async () => {
  if (!isEdit.value) return

  try {
    const dataSource = await store.fetchDataSourceDetail(route.params.id as string)
    if (dataSource) {
      Object.assign(form, {
        name: dataSource.name,
        type: dataSource.type,
        host: dataSource.host,
        port: dataSource.port,
        database: dataSource.database,
        username: dataSource.username || '',
        password: '', // 不加载密码
        auth_source: dataSource.auth_source || 'admin',
        description: dataSource.description || '',
        is_tag_engine: dataSource.is_tag_engine || false,
        status: dataSource.status,
      })
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载数据源详情失败')
  }
}

onMounted(() => {
  if (isEdit.value) {
    loadDataSourceDetail()
  }
})
</script>

<style scoped lang="scss">
.data-source-form {
  .card-header {
    font-weight: 500;
    font-size: 16px;
  }

  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 5px;
  }
}
</style>

