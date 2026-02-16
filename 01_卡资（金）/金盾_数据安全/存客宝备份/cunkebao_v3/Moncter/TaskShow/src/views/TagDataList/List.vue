<template>
  <div class="tag-data-list-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>数据列表管理</span>
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon>
            创建数据列表
          </el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="列表名称">
          <el-input
            v-model="searchForm.list_name"
            placeholder="请输入列表名称"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable @change="handleSearch">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 数据表格 -->
      <el-table :data="dataList" v-loading="loading" border>
        <el-table-column prop="list_name" label="列表名称" min-width="150" />
        <el-table-column prop="list_code" label="列表编码" width="180" />
        <el-table-column prop="data_source_id" label="数据源ID" width="150" />
        <el-table-column prop="database" label="数据库" width="120" />
        <el-table-column prop="collection" label="主集合" width="150" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="create_time" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.create_time) }}
          </template>
        </el-table-column>
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
          v-model:page-size="pagination.page_size"
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
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { formatDateTime } from '@/utils'

const router = useRouter()

const loading = ref(false)
const dataList = ref<any[]>([])

const searchForm = reactive({
  list_name: '',
  status: undefined as number | undefined
})

const pagination = reactive({
  page: 1,
  page_size: 20,
  total: 0
})

// 加载数据
const loadData = async () => {
  try {
    loading.value = true
    
    // TODO: 替换为真实API
    // const response = await request.get('/tag-data-lists', params)
    
    // Mock数据
    await new Promise(resolve => setTimeout(resolve, 500))
    const mockData = [
      {
        list_id: 'list_001',
        list_code: 'consumption_records',
        list_name: '消费记录表',
        data_source_id: 'source_001',
        database: 'tag_engine',
        collection: 'consumption_records',
        description: '用于标签定义的消费记录数据',
        status: 1,
        create_time: new Date().toISOString()
      },
      {
        list_id: 'list_002',
        list_code: 'user_profile',
        list_name: '用户档案表',
        data_source_id: 'source_001',
        database: 'tag_engine',
        collection: 'user_profile',
        description: '用户基本信息和统计数据',
        status: 1,
        create_time: new Date().toISOString()
      }
    ]
    
    // 应用筛选
    let filteredData = mockData
    if (searchForm.list_name) {
      filteredData = filteredData.filter(item => 
        item.list_name.includes(searchForm.list_name)
      )
    }
    if (searchForm.status !== undefined) {
      filteredData = filteredData.filter(item => item.status === searchForm.status)
    }
    
    dataList.value = filteredData
    pagination.total = filteredData.length
    
  } catch (error: any) {
    ElMessage.error(error.message || '加载数据失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadData()
}

// 重置
const handleReset = () => {
  searchForm.list_name = ''
  searchForm.status = undefined
  handleSearch()
}

// 创建
const handleCreate = () => {
  router.push('/tag-data-lists/create')
}

// 编辑
const handleEdit = (row: any) => {
  router.push(`/tag-data-lists/${row.list_id}/edit`)
}

// 删除
const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除数据列表"${row.list_name}"吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // TODO: 替换为真实API
    // await request.delete(`/tag-data-lists/${row.list_id}`)
    
    // Mock删除
    await new Promise(resolve => setTimeout(resolve, 300))
    ElMessage.success('删除成功（Mock）')
    loadData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

// 分页变化
const handleSizeChange = () => {
  loadData()
}

const handlePageChange = () => {
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.tag-data-list-page {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 500;
    font-size: 16px;
  }

  .search-form {
    margin-bottom: 20px;
  }

  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
