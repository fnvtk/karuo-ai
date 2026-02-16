import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TagDefinition } from '@/types'
import * as tagDefinitionApi from '@/api/tagDefinition'

export const useTagDefinitionStore = defineStore('tagDefinition', () => {
  const definitions = ref<TagDefinition[]>([])
  const currentDefinition = ref<TagDefinition | null>(null)
  const loading = ref(false)

  // 获取标签定义列表
  const fetchDefinitions = async (params?: {
    name?: string
    category?: string
    status?: number
    page?: number
    page_size?: number
  }) => {
    loading.value = true
    try {
      const response = await tagDefinitionApi.getTagDefinitionList(params)
      definitions.value = response.data.definitions
      return response.data
    } catch (error) {
      console.error('获取标签定义列表失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 获取标签定义详情
  const fetchDefinitionDetail = async (tagId: string) => {
    loading.value = true
    try {
      const response = await tagDefinitionApi.getTagDefinitionDetail(tagId)
      currentDefinition.value = response.data
      return response.data
    } catch (error) {
      console.error('获取标签定义详情失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 创建标签定义
  const createDefinition = async (data: Partial<TagDefinition>) => {
    try {
      const response = await tagDefinitionApi.createTagDefinition(data)
      await fetchDefinitions()
      return response.data
    } catch (error) {
      console.error('创建标签定义失败:', error)
      throw error
    }
  }

  // 更新标签定义
  const updateDefinition = async (tagId: string, data: Partial<TagDefinition>) => {
    try {
      const response = await tagDefinitionApi.updateTagDefinition(tagId, data)
      await fetchDefinitions()
      return response.data
    } catch (error) {
      console.error('更新标签定义失败:', error)
      throw error
    }
  }

  // 删除标签定义
  const deleteDefinition = async (tagId: string) => {
    try {
      await tagDefinitionApi.deleteTagDefinition(tagId)
      await fetchDefinitions()
    } catch (error) {
      console.error('删除标签定义失败:', error)
      throw error
    }
  }

  // 获取启用的标签定义列表（用于下拉选择）
  const getActiveDefinitions = async () => {
    return await fetchDefinitions({ status: 0 })
  }

  // 重置当前标签定义
  const resetCurrentDefinition = () => {
    currentDefinition.value = null
  }

  return {
    definitions,
    currentDefinition,
    loading,
    fetchDefinitions,
    fetchDefinitionDetail,
    createDefinition,
    updateDefinition,
    deleteDefinition,
    getActiveDefinitions,
    resetCurrentDefinition
  }
})

