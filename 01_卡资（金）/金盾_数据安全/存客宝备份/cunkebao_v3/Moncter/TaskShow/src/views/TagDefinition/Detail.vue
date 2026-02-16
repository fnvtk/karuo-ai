<template>
  <div class="tag-definition-detail">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>标签定义详情</span>
          <el-button type="primary" @click="handleEdit">编辑</el-button>
        </div>
      </template>

      <!-- 基本信息 -->
      <el-descriptions title="基本信息" :column="2" border>
        <el-descriptions-item label="标签编码">{{ tag?.tag_code }}</el-descriptions-item>
        <el-descriptions-item label="标签名称">{{ tag?.tag_name }}</el-descriptions-item>
        <el-descriptions-item label="分类">{{ tag?.category }}</el-descriptions-item>
        <el-descriptions-item label="规则类型">
          <el-tag type="primary">{{ tag?.rule_type }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="更新频率">
          <el-tag v-if="tag?.update_frequency === 'real_time'" type="success">实时</el-tag>
          <el-tag v-else>{{ tag?.update_frequency }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag v-if="tag?.status === 0" type="success">启用</el-tag>
          <el-tag v-else type="info">禁用</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">{{ tag?.description || '-' }}</el-descriptions-item>
      </el-descriptions>

      <!-- 规则配置 -->
      <div class="rule-config-section" v-if="tag?.rule_config">
        <h3>规则配置</h3>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="规则类型">
            {{ tag.rule_config.rule_type }}
          </el-descriptions-item>
          <el-descriptions-item label="标签值">
            {{ tag.rule_config.tag_value }}
          </el-descriptions-item>
          <el-descriptions-item label="置信度">
            {{ tag.rule_config.confidence }}
          </el-descriptions-item>
        </el-descriptions>

        <h4 style="margin-top: 20px; margin-bottom: 10px;">规则条件</h4>
        <el-table :data="tag.rule_config.conditions" border>
          <el-table-column prop="field" label="字段" />
          <el-table-column prop="operator" label="运算符" />
          <el-table-column prop="value" label="值" />
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { TagDefinition } from '@/types'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const tag = ref<TagDefinition | null>(null)

const loadTagDetail = async () => {
  loading.value = true
  try {
    // TODO: 调用API加载标签详情
    // const response = await request.get(`/tag-definitions/${route.params.id}`)
    // tag.value = response.data
    
    // 模拟数据
    tag.value = {
      tag_id: route.params.id as string,
      tag_code: 'high_consumer',
      tag_name: '高消费用户',
      category: '消费能力',
      description: '总消费金额大于等于5000的用户',
      rule_type: 'simple',
      rule_config: {
        rule_type: 'simple',
        conditions: [
          { field: 'total_amount', operator: '>=', value: 5000 }
        ],
        tag_value: 'high',
        confidence: 1.0
      },
      update_frequency: 'real_time',
      status: 0
    }
  } catch (error) {
    ElMessage.error('加载标签详情失败')
  } finally {
    loading.value = false
  }
}

const handleEdit = () => {
  router.push(`/tag-definitions/${route.params.id}/edit`)
}

onMounted(() => {
  loadTagDetail()
})
</script>

<style scoped lang="scss">
.tag-definition-detail {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .rule-config-section {
    margin-top: 30px;

    h3 {
      margin-bottom: 15px;
      font-size: 16px;
      font-weight: 500;
      color: #303133;
    }
  }
}
</style>

