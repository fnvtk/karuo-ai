<template>
  <div class="tag-task-form">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>{{ isEdit ? '编辑标签任务' : '创建标签任务' }}</span>
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
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item label="任务描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入任务描述"
          />
        </el-form-item>
        <el-form-item label="任务类型" prop="task_type">
          <el-radio-group v-model="form.task_type" @change="handleTaskTypeChange">
            <el-radio label="full">全量计算</el-radio>
            <el-radio label="incremental">增量计算</el-radio>
            <el-radio label="specific">指定用户</el-radio>
          </el-radio-group>
          <div class="form-tip">
            <span v-if="form.task_type === 'full'">全量计算：计算所有用户的标签</span>
            <span v-else-if="form.task_type === 'incremental'">增量计算：只计算有数据变更的用户</span>
            <span v-else-if="form.task_type === 'specific'">指定用户：只计算指定范围的用户</span>
          </div>
        </el-form-item>
        <el-form-item label="目标标签" prop="target_tag_ids">
          <el-select
            v-model="form.target_tag_ids"
            multiple
            placeholder="请选择要计算的标签"
            style="width: 100%"
          >
            <el-option
              v-for="tag in tagDefinitions"
              :key="tag.tag_id"
              :label="tag.tag_name"
              :value="tag.tag_id"
            />
          </el-select>
        </el-form-item>

        <!-- 用户范围配置 -->
        <el-divider>用户范围配置</el-divider>
        <el-form-item label="用户范围" prop="user_scope.type">
          <el-radio-group v-model="form.user_scope.type" @change="handleUserScopeTypeChange">
            <el-radio label="all">全部用户</el-radio>
            <el-radio label="list">指定用户列表</el-radio>
            <el-radio label="filter">按条件筛选</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 指定用户列表 -->
        <el-form-item
          v-if="form.user_scope.type === 'list'"
          label="用户ID列表"
          prop="user_scope.user_ids"
        >
          <el-input
            v-model="userIdsText"
            type="textarea"
            :rows="5"
            placeholder="请输入用户ID，每行一个"
            @blur="handleUserIdsChange"
          />
        </el-form-item>

        <!-- 按条件筛选 -->
        <el-form-item
          v-if="form.user_scope.type === 'filter'"
          label="筛选条件"
        >
          <el-button type="primary" @click="handleAddFilterCondition">
            <el-icon><Plus /></el-icon>
            添加条件
          </el-button>
          <el-table
            :data="form.user_scope.filter_conditions"
            border
            style="margin-top: 10px"
          >
            <el-table-column label="字段" width="200">
              <template #default="{ row }">
                <el-input v-model="row.field" placeholder="字段名" />
              </template>
            </el-table-column>
            <el-table-column label="运算符" width="150">
              <template #default="{ row }">
                <el-select v-model="row.operator">
                  <el-option label="大于" value="gt" />
                  <el-option label="大于等于" value="gte" />
                  <el-option label="小于" value="lt" />
                  <el-option label="小于等于" value="lte" />
                  <el-option label="等于" value="eq" />
                  <el-option label="不等于" value="ne" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="值">
              <template #default="{ row }">
                <el-input v-model="row.value" placeholder="值" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ $index }">
                <el-button
                  type="danger"
                  size="small"
                  @click="handleRemoveFilterCondition($index)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>

        <!-- 调度配置 -->
        <el-divider>调度配置</el-divider>
        <el-form-item label="启用调度">
          <el-switch v-model="form.schedule.enabled" />
        </el-form-item>
        <el-form-item
          v-if="form.schedule.enabled"
          label="Cron表达式"
          prop="schedule.cron"
        >
          <el-input
            v-model="form.schedule.cron"
            placeholder="例如: 0 2 * * * (每天凌晨2点)"
          />
        </el-form-item>

        <!-- 高级配置 -->
        <el-divider>高级配置</el-divider>
        <el-form-item label="并发数">
          <el-input-number
            v-model="form.config.concurrency"
            :min="1"
            :max="100"
          />
        </el-form-item>
        <el-form-item label="批量大小">
          <el-input-number
            v-model="form.config.batch_size"
            :min="1"
            :max="10000"
          />
        </el-form-item>
        <el-form-item label="错误处理">
          <el-select v-model="form.config.error_handling">
            <el-option label="跳过错误继续" value="skip" />
            <el-option label="遇到错误停止" value="stop" />
            <el-option label="重试" value="retry" />
          </el-select>
        </el-form-item>

        <!-- 操作按钮 -->
        <el-form-item>
          <el-button type="primary" @click="handleSubmit">保存</el-button>
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
import { Plus } from '@element-plus/icons-vue'
import { useTagTaskStore } from '@/store'
import { useTagDefinitionStore } from '@/store'
import type { TagTask, TagDefinition } from '@/types'

const route = useRoute()
const router = useRouter()
const formRef = ref<InstanceType<typeof ElForm>>()
const tagTaskStore = useTagTaskStore()
const tagDefinitionStore = useTagDefinitionStore()

const isEdit = computed(() => !!route.params.id)

const tagDefinitions = ref<TagDefinition[]>([])
const userIdsText = ref('')

const form = reactive<Partial<TagTask>>({
  name: '',
  description: '',
  task_type: 'full',
  target_tag_ids: [],
  user_scope: {
    type: 'all',
    user_ids: [],
    filter_conditions: []
  },
  schedule: {
    enabled: false,
    cron: ''
  },
  config: {
    concurrency: 10,
    batch_size: 100,
    error_handling: 'skip'
  }
})

const rules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  task_type: [{ required: true, message: '请选择任务类型', trigger: 'change' }],
  'target_tag_ids': [{ required: true, message: '请选择目标标签', trigger: 'change' }],
  'user_scope.user_ids': [
    {
      validator: (rule: any, value: any, callback: any) => {
        if (form.user_scope?.type === 'list') {
          if (!value || value.length === 0) {
            callback(new Error('请至少输入一个用户ID'))
          } else {
            callback()
          }
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  'user_scope.filter_conditions': [
    {
      validator: (rule: any, value: any, callback: any) => {
        if (form.user_scope?.type === 'filter') {
          if (!value || value.length === 0) {
            callback(new Error('请至少添加一个筛选条件'))
          } else {
            // 验证每个条件是否完整
            const incomplete = value.some((cond: any) => !cond.field || !cond.operator || cond.value === '')
            if (incomplete) {
              callback(new Error('请完善所有筛选条件'))
            } else {
              callback()
            }
          }
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ],
  'schedule.cron': [
    {
      validator: (rule: any, value: any, callback: any) => {
        if (form.schedule?.enabled) {
          if (!value || value.trim() === '') {
            callback(new Error('启用调度时必须填写Cron表达式'))
          } else {
            callback()
          }
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const loadTagDefinitions = async () => {
  try {
    await tagDefinitionStore.getActiveDefinitions()
    tagDefinitions.value = tagDefinitionStore.definitions
  } catch (error: any) {
    ElMessage.error(error.message || '加载标签定义失败')
  }
}

const handleUserIdsChange = () => {
  if (userIdsText.value) {
    form.user_scope!.user_ids = userIdsText.value
      .split('\n')
      .map(id => id.trim())
      .filter(id => id)
  } else {
    form.user_scope!.user_ids = []
  }
}

// 在提交前同步用户ID列表（防止用户没有触发blur事件）
const syncUserIdsBeforeSubmit = () => {
  if (form.user_scope?.type === 'list') {
    handleUserIdsChange()
  }
}

const handleAddFilterCondition = () => {
  form.user_scope!.filter_conditions = form.user_scope!.filter_conditions || []
  form.user_scope!.filter_conditions.push({
    field: '',
    operator: 'eq',
    value: ''
  })
}

const handleRemoveFilterCondition = (index: number) => {
  form.user_scope!.filter_conditions?.splice(index, 1)
}

// 处理任务类型变化
const handleTaskTypeChange = () => {
  // 当任务类型为 specific（指定用户）时，如果用户范围是 all，自动切换为 list
  if (form.task_type === 'specific' && form.user_scope?.type === 'all') {
    form.user_scope.type = 'list'
  }
  // 当任务类型为 full（全量计算）时，自动切换用户范围为 all
  else if (form.task_type === 'full' && form.user_scope?.type !== 'all') {
    form.user_scope!.type = 'all'
    // 清理不需要的数据
    form.user_scope!.user_ids = []
    form.user_scope!.filter_conditions = []
  }
}

// 处理用户范围类型变化
const handleUserScopeTypeChange = () => {
  if (!form.user_scope) return
  
  // 清理不需要的数据
  if (form.user_scope.type === 'all') {
    form.user_scope.user_ids = []
    form.user_scope.filter_conditions = []
    userIdsText.value = ''
  } else if (form.user_scope.type === 'list') {
    form.user_scope.filter_conditions = []
  } else if (form.user_scope.type === 'filter') {
    form.user_scope.user_ids = []
    userIdsText.value = ''
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  // 提交前同步用户ID列表
  syncUserIdsBeforeSubmit()
  
  // 清理不需要的数据
  if (form.user_scope) {
    if (form.user_scope.type === 'all') {
      // 全量计算时，清除用户ID列表和筛选条件
      form.user_scope.user_ids = []
      form.user_scope.filter_conditions = []
    } else if (form.user_scope.type === 'list') {
      // 指定用户列表时，清除筛选条件
      form.user_scope.filter_conditions = []
    } else if (form.user_scope.type === 'filter') {
      // 按条件筛选时，清除用户ID列表
      form.user_scope.user_ids = []
    }
  }
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (isEdit.value) {
          await tagTaskStore.updateTask(route.params.id as string, form)
          ElMessage.success('任务更新成功')
        } else {
          await tagTaskStore.createTask(form)
          ElMessage.success('任务创建成功')
        }
        router.push('/tag-tasks')
      } catch (error: any) {
        ElMessage.error(error.message || '保存失败')
      }
    }
  })
}

const handleCancel = () => {
  router.back()
}

const loadTaskDetail = async () => {
  if (!isEdit.value) return
  
  try {
    const task = await tagTaskStore.fetchTaskDetail(route.params.id as string)
    if (task) {
      Object.assign(form, {
        name: task.name,
        description: task.description,
        task_type: task.task_type,
        target_tag_ids: task.target_tag_ids || [],
        user_scope: task.user_scope || { type: 'all' },
        schedule: task.schedule || { enabled: false, cron: '' },
        config: task.config || {
          concurrency: 10,
          batch_size: 100,
          error_handling: 'skip'
        }
      })
      
      if (task.user_scope?.user_ids && task.user_scope.user_ids.length > 0) {
        userIdsText.value = task.user_scope.user_ids.join('\n')
      }
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载任务详情失败')
  }
}

onMounted(() => {
  loadTagDefinitions()
  if (isEdit.value) {
    loadTaskDetail()
  }
})
</script>

<style scoped lang="scss">
.tag-task-form {
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

