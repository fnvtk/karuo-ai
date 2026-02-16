import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as dataSourceApi from '@/api/dataSource'
import type { DataSource } from '@/api/dataSource'
import { ElMessage } from 'element-plus'

export const useDataSourceStore = defineStore('dataSource', () => {
  const dataSources = ref<DataSource[]>([])
  const currentDataSource = ref<DataSource | null>(null)

  // 获取数据源列表
  const fetchDataSources = async (params?: {
    type?: string
    status?: number
    name?: string
    page?: number
    page_size?: number
  }) => {
    try {
      const response = await dataSourceApi.getDataSourceList(params)
      dataSources.value = response.data.data_sources
      return response.data
    } catch (error: any) {
      ElMessage.error(error.message || '获取数据源列表失败')
      throw error
    }
  }

  // 获取数据源详情
  const fetchDataSourceDetail = async (dataSourceId: string) => {
    try {
      const response = await dataSourceApi.getDataSourceDetail(dataSourceId)
      currentDataSource.value = response.data
      return response.data
    } catch (error: any) {
      ElMessage.error(error.message || '获取数据源详情失败')
      throw error
    }
  }

  // 创建数据源
  const createDataSource = async (data: Partial<DataSource>) => {
    try {
      const response = await dataSourceApi.createDataSource(data)
      ElMessage.success('数据源创建成功')
      return response.data
    } catch (error: any) {
      ElMessage.error(error.message || '创建数据源失败')
      throw error
    }
  }

  // 更新数据源
  const updateDataSource = async (dataSourceId: string, data: Partial<DataSource>) => {
    try {
      await dataSourceApi.updateDataSource(dataSourceId, data)
      ElMessage.success('数据源更新成功')
    } catch (error: any) {
      ElMessage.error(error.message || '更新数据源失败')
      throw error
    }
  }

  // 删除数据源
  const deleteDataSource = async (dataSourceId: string) => {
    try {
      await dataSourceApi.deleteDataSource(dataSourceId)
      ElMessage.success('数据源删除成功')
    } catch (error: any) {
      ElMessage.error(error.message || '删除数据源失败')
      throw error
    }
  }

  // 测试连接
  const testConnection = async (data: {
    type: string
    host: string
    port: number
    database: string
    username?: string
    password?: string
    auth_source?: string
    options?: Record<string, any>
  }) => {
    try {
      const response = await dataSourceApi.testDataSourceConnection(data)
      // 只返回结果，不显示消息，由调用方决定是否显示
      return response.data.connected
    } catch (error: any) {
      ElMessage.error(error.message || '连接测试失败')
      return false
    }
  }

  return {
    dataSources,
    currentDataSource,
    fetchDataSources,
    fetchDataSourceDetail,
    createDataSource,
    updateDataSource,
    deleteDataSource,
    testConnection,
  }
})

