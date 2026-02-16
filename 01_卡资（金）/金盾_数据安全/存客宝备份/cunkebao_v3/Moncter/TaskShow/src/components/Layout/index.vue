<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '200px'" class="sidebar">
      <div class="logo">
        <h2 v-if="!isCollapse">TaskShow</h2>
        <h2 v-else>T</h2>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :collapse-transition="false"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          <template #title>首页</template>
        </el-menu-item>

        <el-sub-menu index="data-collection">
          <template #title>
            <el-icon><Document /></el-icon>
            <span>数据采集</span>
          </template>
          <el-menu-item index="/data-collection/tasks">任务列表</el-menu-item>
          <el-menu-item index="/data-sources">数据源配置</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="tag-tasks">
          <template #title>
            <el-icon><PriceTag /></el-icon>
            <span>标签任务</span>
          </template>
          <el-menu-item index="/tag-tasks">任务列表</el-menu-item>
          <el-menu-item index="/tag-definitions">标签定义</el-menu-item>
          <el-menu-item index="/tag-data-lists">数据列表管理</el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/tag-filter">
          <el-icon><Filter /></el-icon>
          <template #title>标签筛选</template>
        </el-menu-item>

        <el-sub-menu index="tag-query">
          <template #title>
            <el-icon><Search /></el-icon>
            <span>标签查询</span>
          </template>
          <el-menu-item index="/tag-query/user">用户标签</el-menu-item>
          <el-menu-item index="/tag-query/statistics">标签统计</el-menu-item>
          <el-menu-item index="/tag-query/history">标签历史</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <!-- 顶部导航栏 -->
      <el-header class="header">
        <div class="header-left">
          <el-button
            :icon="isCollapse ? Expand : Fold"
            circle
            @click="toggleCollapse"
          />
        </div>
        <div class="header-right">
          <el-dropdown>
            <span class="user-info">
              <el-icon><User /></el-icon>
              <span>管理员</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>个人设置</el-dropdown-item>
                <el-dropdown-item divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容区域 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  HomeFilled,
  Document,
  PriceTag,
  Filter,
  Search,
  User,
  Fold,
  Expand
} from '@element-plus/icons-vue'

const route = useRoute()
const isCollapse = ref(false)

const activeMenu = computed(() => {
  return route.path
})

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}
</script>

<style scoped lang="scss">
.layout-container {
  height: 100vh;
}

.sidebar {
  background-color: #304156;
  transition: width 0.3s;
  overflow: hidden;

  .logo {
    height: 60px;
    line-height: 60px;
    text-align: center;
    background-color: #2b3a4a;
    color: #fff;
    font-size: 18px;
    font-weight: bold;
  }

  .el-menu {
    border-right: none;
    height: calc(100vh - 60px);
    overflow-y: auto;
  }
}

.header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);

  .header-left {
    display: flex;
    align-items: center;
  }

  .header-right {
    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      color: #606266;
    }
  }
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
</style>

