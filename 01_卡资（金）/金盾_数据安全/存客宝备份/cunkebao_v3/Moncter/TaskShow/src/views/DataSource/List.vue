<template>
  <div class="data-source-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>数据源列表</span>
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon>
            添加数据源
          </el-button>
        </div>
      </template>

      <!-- 筛选条件 -->
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="类型">
          <el-select v-model="filters.type" placeholder="请选择类型" clearable @change="loadDataSources">
            <el-option label="MongoDB" value="mongodb" />
            <el-option label="MySQL" value="mysql" />
            <el-option label="PostgreSQL" value="postgresql" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="请选择状态" clearable @change="loadDataSources">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="filters.name" placeholder="请输入名称" clearable @change="loadDataSources" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadDataSources">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 数据源列表 -->
      <el-table :data="dataSources" border v-loading="loading">
        <el-table-column prop="name" label="名称" width="200" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.type === 'mongodb'" type="success">MongoDB</el-tag>
            <el-tag v-else-if="row.type === 'mysql'" type="primary">MySQL</el-tag>
            <el-tag v-else-if="row.type === 'postgresql'" type="info">PostgreSQL</el-tag>
            <el-tag v-else>{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="host" label="主机" width="150" />
        <el-table-column prop="port" label="端口" width="100" />
        <el-table-column prop="database" label="数据库" width="150" />
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="success">启用</el-tag>
            <el-tag v-else type="danger">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="is_tag_engine" label="标签引擎" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.is_tag_engine" type="warning">是</el-tag>
            <el-tag v-else type="info">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
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
          @size-change="loadDataSources"
          @current-change="loadDataSources"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useDataSourceStore } from '@/store/dataSource'
import type { DataSource } from '@/api/dataSource'

const router = useRouter()
const store = useDataSourceStore()

const loading = ref(false)
const dataSources = ref<DataSource[]>([])

const filters = reactive({
  type: '',
  status: undefined as number | undefined,
  name: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const loadDataSources = async () => {
  loading.value = true
  try {
    const result = await store.fetchDataSources({
      type: filters.type || undefined,
      status: filters.status,
      name: filters.name || undefined,
      page: pagination.page,
      page_size: pagination.pageSize,
    })
    dataSources.value = result.data_sources
    pagination.total = result.total
  } catch (error) {
    console.error('加载数据源列表失败:', error)
  } finally {
    loading.value = false
  }
}

const handleCreate = () => {
  router.push('/data-sources/create')
}

const handleEdit = (row: DataSource) => {
  router.push(`/data-sources/${row.data_source_id}/edit`)
}

const handleDelete = async (row: DataSource) => {
  try {
    await ElMessageBox.confirm(`确定要删除数据源 "${row.name}" 吗？`, '提示', {
      type: 'warning',
    })
    await store.deleteDataSource(row.data_source_id)
    await loadDataSources()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除数据源失败:', error)
    }
  }
}

const handleReset = () => {
  filters.type = ''
  filters.status = undefined
  filters.name = ''
  pagination.page = 1
  loadDataSources()
}

onMounted(() => {
  loadDataSources()
})
</script>

<style scoped lang="scss">
.data-source-list {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .filter-form {
    margin-bottom: 20px;
  }

  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>

