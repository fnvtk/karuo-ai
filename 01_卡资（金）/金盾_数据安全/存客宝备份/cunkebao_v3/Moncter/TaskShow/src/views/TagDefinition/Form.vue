<template>
  <div class="tag-definition-form">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>{{ isEdit ? '编辑标签定义' : '创建标签定义' }}</span>
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
        <el-form-item label="标签编码" prop="tag_code">
          <el-input v-model="form.tag_code" placeholder="例如: consumer_level" :disabled="isEdit" />
          <div class="form-tip">唯一标识，创建后不可修改</div>
        </el-form-item>
        <el-form-item label="标签名称" prop="tag_name">
          <el-input v-model="form.tag_name" placeholder="例如: 消费等级" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" placeholder="请选择分类（可选）" clearable>
            <el-option label="消费能力" value="消费能力" />
            <el-option label="活跃度" value="活跃度" />
            <el-option label="风险等级" value="风险等级" />
            <el-option label="生命周期" value="生命周期" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入标签描述（可选）"
          />
        </el-form-item>
        <el-form-item label="更新频率" prop="update_frequency">
          <el-select v-model="form.update_frequency" placeholder="请选择更新频率（可选）" clearable>
            <el-option label="实时" value="real_time" />
            <el-option label="每日" value="daily" />
            <el-option label="每周" value="weekly" />
            <el-option label="每月" value="monthly" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :label="0">启用</el-radio>
            <el-radio :label="1">禁用</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 规则配置 -->
        <el-divider>规则配置</el-divider>
        
        <!-- 数据列表选择 -->
        <el-form-item label="数据列表" prop="data_list_id">
          <el-select
            v-model="form.data_list_id"
            placeholder="请选择数据列表"
            filterable
            @change="handleDataListChange"
            :loading="dataListLoading"
          >
            <el-option
              v-for="list in dataLists"
              :key="list.list_id"
              :label="list.list_name"
              :value="list.list_id"
            />
          </el-select>
          <div class="form-tip">选择数据列表后，将显示该列表的字段供选择</div>
        </el-form-item>

        <!-- 规则类型选择 -->
        <el-form-item label="规则类型" prop="rule_type">
          <el-radio-group v-model="form.rule_type" @change="handleRuleTypeChange">
            <el-radio label="simple">运算规则</el-radio>
            <el-radio label="regex">正则规则</el-radio>
          </el-radio-group>
          <div class="form-tip">
            <span v-if="form.rule_type === 'simple'">运算规则：使用运算符比较字段值</span>
            <span v-else>正则规则：使用正则表达式匹配字符串字段</span>
          </div>
        </el-form-item>

        <!-- 规则条件 -->
        <el-form-item label="规则条件" prop="conditions">
          <el-button type="primary" @click="handleAddCondition" :disabled="!form.data_list_id">
            <el-icon><Plus /></el-icon>
            添加条件
          </el-button>
          <div v-if="!form.data_list_id" class="form-tip" style="color: #f56c6c;">
            请先选择数据列表
          </div>
          <el-table
            :data="form.rule_config.conditions"
            border
            style="margin-top: 10px"
            v-if="form.rule_config.conditions && form.rule_config.conditions.length > 0"
          >
            <el-table-column label="字段" width="200">
              <template #default="{ row }">
                <el-select
                  v-model="row.field"
                  placeholder="请选择字段"
                  @change="handleFieldChange(row)"
                  :loading="fieldsLoading"
                >
                  <el-option
                    v-for="field in fields"
                    :key="field.field_name"
                    :label="field.field"
                    :value="field.field"
                    :disabled="field.type === 'object' || field.type === 'array'"
                  >
                    <span>{{ field.field }}</span>
                    <span style="color: #909399; margin-left: 8px;">({{ field.type }})</span>
                  </el-option>
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="运算符" width="180">
              <template #default="{ row }">
                <!-- 运算规则运算符 -->
                <el-select
                  v-if="form.rule_type === 'simple'"
                  v-model="row.operator"
                  placeholder="请选择运算符"
                >
                  <el-option label="大于" value=">" />
                  <el-option label="大于等于" value=">=" />
                  <el-option label="小于" value="<" />
                  <el-option label="小于等于" value="<=" />
                  <el-option label="等于" value="=" />
                  <el-option label="不等于" value="!=" />
                  <el-option label="在列表中" value="in" />
                  <el-option label="不在列表中" value="not_in" />
                </el-select>
                <!-- 正则规则运算符 -->
                <el-input
                  v-else
                  v-model="row.operator"
                  placeholder="例如: /淘宝/"
                >
                  <template #prepend>正则</template>
                </el-input>
              </template>
            </el-table-column>
            <el-table-column label="值" width="200">
              <template #default="{ row }">
                <!-- 运算规则值 -->
                <el-input-number
                  v-if="form.rule_type === 'simple' && row.operator !== 'in' && row.operator !== 'not_in'"
                  v-model="row.value"
                  style="width: 100%"
                  :precision="0"
                />
                <el-input
                  v-else-if="form.rule_type === 'simple'"
                  v-model="row.value"
                  placeholder='例如: ["值1","值2"]'
                  type="textarea"
                  :rows="2"
                />
                <!-- 正则规则值 -->
                <el-switch
                  v-else
                  v-model="row.value"
                  active-text="匹配"
                  inactive-text="不匹配"
                />
              </template>
            </el-table-column>
            <el-table-column label="标签值" width="200">
              <template #default="{ row }">
                <el-input
                  v-model="row.tag_value"
                  placeholder="满足条件时的标签值"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ $index }">
                <el-button
                  type="danger"
                  size="small"
                  @click="handleRemoveCondition($index)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="form.rule_config.conditions && form.rule_config.conditions.length > 0" class="form-tip">
            注意：一个item代表一个条件，满足任一条件即使用该条件的标签值
          </div>
        </el-form-item>

        <!-- 操作按钮 -->
        <el-form-item>
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
import { Plus } from '@element-plus/icons-vue'
import { useTagDefinitionStore } from '@/store'
import { getTagDefinitionDetail, createTagDefinition, updateTagDefinition } from '@/api/tagDefinition'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()
const formRef = ref<InstanceType<typeof ElForm>>()
const store = useTagDefinitionStore()

const isEdit = computed(() => !!route.params.id)
const submitting = ref(false)
const dataListLoading = ref(false)
const fieldsLoading = ref(false)

// 数据列表
const dataLists = ref<Array<{ list_id: string; list_name: string }>>([])
const fields = ref<Array<{ field: string; field_name: string; type: string; description?: string }>>([])

// 表单数据
const form = reactive({
  tag_code: '',
  tag_name: '',
  category: '',
  description: '',
  rule_type: 'simple' as 'simple' | 'regex',
  data_list_id: '',
  data_list_name: '',
  rule_config: {
    rule_type: 'simple' as 'simple' | 'regex',
    data_list_id: '',
    data_list_name: '',
    conditions: [] as Array<{
      field: string
      field_name: string
      operator: string
      value: any
      tag_value: string
    }>
  },
  update_frequency: 'real_time',
  status: 0
})

// 验证规则
const rules = {
  tag_code: [{ required: true, message: '请输入标签编码', trigger: 'blur' }],
  tag_name: [{ required: true, message: '请输入标签名称', trigger: 'blur' }],
  data_list_id: [{ required: true, message: '请选择数据列表', trigger: 'change' }],
  conditions: [
    {
      validator: (rule: any, value: any[], callback: Function) => {
        if (!value || value.length === 0) {
          callback(new Error('至少添加一个规则条件'))
        } else {
          // 验证每个条件
          for (let i = 0; i < value.length; i++) {
            const condition = value[i]
            if (!condition.field) {
              callback(new Error(`第${i + 1}个条件：请选择字段`))
              return
            }
            if (!condition.operator) {
              callback(new Error(`第${i + 1}个条件：请选择运算符`))
              return
            }
            if (condition.value === undefined || condition.value === null || condition.value === '') {
              callback(new Error(`第${i + 1}个条件：请输入值`))
              return
            }
            if (!condition.tag_value) {
              callback(new Error(`第${i + 1}个条件：请输入标签值`))
              return
            }
          }
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

// 加载数据列表
const loadDataLists = async () => {
  try {
    dataListLoading.value = true
    
    // TODO: 替换为真实API
    // const response = await request.get('/tag-data-lists', { status: 1 })
    
    // Mock数据
    await new Promise(resolve => setTimeout(resolve, 300))
    dataLists.value = [
      {
        list_id: 'list_001',
        list_name: '消费记录表'
      },
      {
        list_id: 'list_002',
        list_name: '用户档案表'
      }
    ]
    
  } catch (error: any) {
    ElMessage.error(error.message || '加载数据列表失败')
  } finally {
    dataListLoading.value = false
  }
}

// 数据列表变化
const handleDataListChange = async (listId: string) => {
  if (!listId) {
    fields.value = []
    form.data_list_name = ''
    form.rule_config.data_list_id = ''
    form.rule_config.data_list_name = ''
    form.rule_config.conditions = []
    return
  }

  const selectedList = dataLists.value.find(l => l.list_id === listId)
  if (selectedList) {
    form.data_list_name = selectedList.list_name
    form.rule_config.data_list_id = listId
    form.rule_config.data_list_name = selectedList.list_name
  }

  // 加载字段列表
  await loadFields(listId)
}

// 加载字段列表
const loadFields = async (listId: string) => {
  try {
    fieldsLoading.value = true
    
    // TODO: 替换为真实API
    // const response = await request.get(`/tag-data-lists/${listId}/fields`)
    
    // Mock数据
    await new Promise(resolve => setTimeout(resolve, 300))
    if (listId === 'list_001') {
      // 消费记录表字段
      fields.value = [
        { field: '交易金额', field_name: 'amount', type: 'number', description: '交易金额' },
        { field: '店铺名称', field_name: 'shop_name', type: 'string', description: '店铺名称' },
        { field: '交易状态', field_name: 'status', type: 'string', description: '交易状态' },
        { field: '手机号', field_name: 'phone', type: 'string', description: '手机号' },
        { field: '用户ID', field_name: 'user_id', type: 'string', description: '用户ID' }
      ]
    } else if (listId === 'list_002') {
      // 用户档案表字段
      fields.value = [
        { field: '用户ID', field_name: 'user_id', type: 'string', description: '用户ID' },
        { field: '总消费金额', field_name: 'total_amount', type: 'number', description: '总消费金额' },
        { field: '总消费次数', field_name: 'total_count', type: 'number', description: '总消费次数' },
        { field: '最后消费时间', field_name: 'last_consume_time', type: 'datetime', description: '最后消费时间' }
      ]
    } else {
      fields.value = []
    }
    
  } catch (error: any) {
    ElMessage.error(error.message || '加载字段列表失败')
    fields.value = []
  } finally {
    fieldsLoading.value = false
  }
}

// 字段变化
const handleFieldChange = (row: any) => {
  const field = fields.value.find(f => f.field === row.field)
  if (field) {
    row.field_name = field.field_name
  }
}

// 规则类型变化
const handleRuleTypeChange = (type: string) => {
  form.rule_config.rule_type = type as 'simple' | 'regex'
  // 重置所有条件
  form.rule_config.conditions.forEach(condition => {
    condition.operator = ''
    condition.value = type === 'regex' ? true : ''
  })
}

// 添加条件
const handleAddCondition = () => {
  if (!form.data_list_id) {
    ElMessage.warning('请先选择数据列表')
    return
  }

  form.rule_config.conditions = form.rule_config.conditions || []
  form.rule_config.conditions.push({
    field: '',
    field_name: '',
    operator: form.rule_type === 'regex' ? '/淘宝/' : '>=',
    value: form.rule_type === 'regex' ? true : '',
    tag_value: ''
  })
}

// 删除条件
const handleRemoveCondition = (index: number) => {
  form.rule_config.conditions?.splice(index, 1)
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        // 准备提交数据
        const submitData = {
          tag_code: form.tag_code,
          tag_name: form.tag_name,
          category: form.category || undefined,
          description: form.description || undefined,
          rule_type: form.rule_type,
          rule_config: {
            rule_type: form.rule_type,
            data_list_id: form.data_list_id,
            data_list_name: form.data_list_name,
            conditions: form.rule_config.conditions.map(condition => ({
              field: condition.field,
              field_name: condition.field_name,
              operator: condition.operator,
              value: condition.value,
              tag_value: condition.tag_value
            }))
          },
          update_frequency: form.update_frequency || undefined,
          status: form.status
        }

        if (isEdit.value) {
          await updateTagDefinition(route.params.id as string, submitData)
          ElMessage.success('标签定义更新成功')
        } else {
          await createTagDefinition(submitData)
          ElMessage.success('标签定义创建成功')
        }
        router.push('/tag-definitions')
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

// 加载标签详情
const loadTagDetail = async () => {
  if (!isEdit.value) return

  try {
    const tag = await getTagDefinitionDetail(route.params.id as string)
    if (tag) {
      Object.assign(form, {
        tag_code: tag.tag_code,
        tag_name: tag.tag_name,
        category: tag.category || '',
        description: tag.description || '',
        rule_type: tag.rule_type || 'simple',
        update_frequency: tag.update_frequency || 'real_time',
        status: tag.status
      })

      // 设置规则配置
      if (tag.rule_config) {
        form.rule_config = {
          rule_type: tag.rule_config.rule_type || tag.rule_type || 'simple',
          data_list_id: tag.rule_config.data_list_id || '',
          data_list_name: tag.rule_config.data_list_name || '',
          conditions: tag.rule_config.conditions || []
        }
        form.data_list_id = form.rule_config.data_list_id
        form.data_list_name = form.rule_config.data_list_name

        // 加载字段列表
        if (form.data_list_id) {
          await loadFields(form.data_list_id)
        }
      }
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载标签详情失败')
  }
}

onMounted(async () => {
  await loadDataLists()
  if (isEdit.value) {
    await loadTagDetail()
  }
})
</script>

<style scoped lang="scss">
.tag-definition-form {
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
