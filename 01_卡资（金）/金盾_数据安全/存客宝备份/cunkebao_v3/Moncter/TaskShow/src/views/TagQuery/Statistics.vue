<template>
  <div class="tag-statistics">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>标签统计</span>
        </div>
      </template>

      <!-- 筛选条件 -->
      <el-form :inline="true" :model="filters" style="margin-bottom: 20px;">
        <el-form-item label="标签">
          <el-select
            v-model="filters.tag_id"
            placeholder="请选择标签"
            filterable
            clearable
          >
            <el-option
              v-for="tag in tagDefinitions"
              :key="tag.tag_id"
              :label="tag.tag_name"
              :value="tag.tag_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 统计图表 -->
      <div class="charts-section" v-if="hasData">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card>
              <template #header>
                <span>标签值分布</span>
              </template>
              <div id="valueDistributionChart" style="height: 400px;"></div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card>
              <template #header>
                <span>标签趋势</span>
              </template>
              <div id="trendChart" style="height: 400px;"></div>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :span="24">
            <el-card>
              <template #header>
                <span>标签覆盖度统计</span>
              </template>
              <el-table :data="coverageStats" border>
                <el-table-column prop="tag_name" label="标签名称" />
                <el-table-column prop="total_users" label="总用户数" />
                <el-table-column prop="tagged_users" label="已打标签用户数" />
                <el-table-column prop="coverage_rate" label="覆盖率">
                  <template #default="{ row }">
                    <el-progress :percentage="row.coverage_rate" />
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 空状态 -->
      <el-empty v-if="!hasData" description="请选择标签并查询统计数据" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { TagDefinition } from '@/types'
// import * as echarts from 'echarts' // 需要安装 echarts

const tagDefinitions = ref<TagDefinition[]>([])
const hasData = ref(false)
const coverageStats = ref([])

const filters = reactive({
  tag_id: '',
  dateRange: null as [Date, Date] | null
})

const loadTagDefinitions = async () => {
  try {
    // TODO: 调用API加载标签定义列表
    // const response = await request.get('/tag-definitions', { status: 0 })
    // tagDefinitions.value = response.data.definitions
    
    // 模拟数据
    tagDefinitions.value = []
  } catch (error) {
    ElMessage.error('加载标签定义失败')
  }
}

const handleQuery = async () => {
  if (!filters.tag_id) {
    ElMessage.warning('请选择标签')
    return
  }

  try {
    // TODO: 调用统计API
    // const response = await request.get('/tags/statistics', {
    //   tag_id: filters.tag_id,
    //   start_date: filters.dateRange?.[0],
    //   end_date: filters.dateRange?.[1]
    // })
    // 处理统计数据并渲染图表
    
    hasData.value = true
    
    // TODO: 初始化图表
    // initCharts(response.data)
  } catch (error) {
    ElMessage.error('查询统计数据失败')
  }
}

const handleReset = () => {
  filters.tag_id = ''
  filters.dateRange = null
  hasData.value = false
}

onMounted(() => {
  loadTagDefinitions()
})
</script>

<style scoped lang="scss">
.tag-statistics {
  .card-header {
    font-weight: 500;
    font-size: 16px;
  }

  .charts-section {
    margin-top: 20px;
  }
}
</style>

