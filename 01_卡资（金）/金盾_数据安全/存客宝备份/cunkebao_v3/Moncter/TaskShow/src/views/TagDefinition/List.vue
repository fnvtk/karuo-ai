<template>
  <div class="tag-definition-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>标签定义列表</span>
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon>
            创建标签
          </el-button>
        </div>
      </template>

      <!-- 搜索和筛选 -->
      <div class="filter-bar">
        <el-form :inline="true" :model="filters">
          <el-form-item label="标签名称">
            <el-input
              v-model="filters.name"
              placeholder="请输入标签名称"
              clearable
              @clear="handleSearch"
            />
          </el-form-item>
          <el-form-item label="分类">
            <el-select
              v-model="filters.category"
              placeholder="请选择分类"
              clearable
              @change="handleSearch"
            >
              <el-option label="消费能力" value="消费能力" />
              <el-option label="活跃度" value="活跃度" />
              <el-option label="风险等级" value="风险等级" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select
              v-model="filters.status"
              placeholder="请选择状态"
              clearable
              @change="handleSearch"
            >
              <el-option label="启用" :value="0" />
              <el-option label="禁用" :value="1" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 标签列表 -->
      <el-table :data="tagList" v-loading="loading" style="width: 100%">
        <el-table-column prop="tag_code" label="标签编码" width="180" />
        <el-table-column prop="tag_name" label="标签名称" min-width="150" />
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column prop="rule_type" label="规则类型" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.rule_type === 'simple'" type="primary">简单规则</el-tag>
            <el-tag v-else type="info">{{ row.rule_type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="update_frequency" label="更新频率" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.update_frequency === 'real_time'" type="success">实时</el-tag>
            <el-tag v-else-if="row.update_frequency === 'daily'" type="warning">每日</el-tag>
            <el-tag v-else>{{ row.update_frequency }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 0" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.updated_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="handleView(row)"
            >
              查看
            </el-button>
            <el-button
              type="info"
              size="small"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useTagDefinitionStore } from '@/store'
import { formatDateTime } from '@/utils'
import type { TagDefinition } from '@/types'

const router = useRouter()
const store = useTagDefinitionStore()

const filters = ref({
  name: '',
  category: '',
  status: undefined as number | undefined
})
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})

const tagList = computed(() => store.definitions)
const loading = computed(() => store.loading)

const loadTags = async () => {
  try {
    const result = await store.fetchDefinitions({
      ...filters.value,
      page: pagination.value.page,
      page_size: pagination.value.pageSize
    })
    pagination.value.total = result.total
  } catch (error: any) {
    ElMessage.error(error.message || '加载标签列表失败')
  }
}

const handleSearch = () => {
  pagination.value.page = 1
  loadTags()
}

const handleReset = () => {
  filters.value = {
    name: '',
    category: '',
    status: undefined
  }
  handleSearch()
}

const handleCreate = () => {
  router.push('/tag-definitions/create')
}

const handleView = (row: any) => {
  router.push(`/tag-definitions/${row.tag_id}`)
}

const handleEdit = (row: any) => {
  router.push(`/tag-definitions/${row.tag_id}/edit`)
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除该标签定义吗？', '提示', {
      type: 'warning'
    })
    await store.deleteDefinition(row.tag_id)
    ElMessage.success('标签定义已删除')
    await loadTags()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除标签定义失败')
    }
  }
}

const handleSizeChange = () => {
  loadTags()
}

const handlePageChange = () => {
  loadTags()
}

onMounted(() => {
  loadTags()
})
</script>

<style scoped lang="scss">
.tag-definition-list {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .filter-bar {
    margin-bottom: 20px;
  }

  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>

