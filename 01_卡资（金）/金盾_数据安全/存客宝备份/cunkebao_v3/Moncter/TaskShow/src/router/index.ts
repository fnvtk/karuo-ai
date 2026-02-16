import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Layout from '@/components/Layout/index.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard/index.vue'),
        meta: { title: '首页' }
      }
    ]
  },
  {
    path: '/data-collection',
    component: Layout,
    children: [
      {
        path: 'tasks',
        name: 'DataCollectionTaskList',
        component: () => import('@/views/DataCollection/TaskList.vue'),
        meta: { title: '数据采集任务列表' }
      },
      {
        path: 'tasks/create',
        name: 'DataCollectionTaskCreate',
        component: () => import('@/views/DataCollection/TaskForm.vue'),
        meta: { title: '创建数据采集任务' }
      },
      {
        path: 'tasks/:id',
        name: 'DataCollectionTaskDetail',
        component: () => import('@/views/DataCollection/TaskDetail.vue'),
        meta: { title: '数据采集任务详情' }
      },
      {
        path: 'tasks/:id/edit',
        name: 'DataCollectionTaskEdit',
        component: () => import('@/views/DataCollection/TaskForm.vue'),
        meta: { title: '编辑数据采集任务' }
      }
    ]
  },
  {
    path: '/tag-tasks',
    component: Layout,
    children: [
      {
        path: '',
        name: 'TagTaskList',
        component: () => import('@/views/TagTask/TaskList.vue'),
        meta: { title: '标签任务列表' }
      },
      {
        path: 'create',
        name: 'TagTaskCreate',
        component: () => import('@/views/TagTask/TaskForm.vue'),
        meta: { title: '创建标签任务' }
      },
      {
        path: ':id',
        name: 'TagTaskDetail',
        component: () => import('@/views/TagTask/TaskDetail.vue'),
        meta: { title: '标签任务详情' }
      },
      {
        path: ':id/edit',
        name: 'TagTaskEdit',
        component: () => import('@/views/TagTask/TaskForm.vue'),
        meta: { title: '编辑标签任务' }
      }
    ]
  },
  {
    path: '/tag-definitions',
    component: Layout,
    children: [
      {
        path: '',
        name: 'TagDefinitionList',
        component: () => import('@/views/TagDefinition/List.vue'),
        meta: { title: '标签定义列表' }
      },
      {
        path: 'create',
        name: 'TagDefinitionCreate',
        component: () => import('@/views/TagDefinition/Form.vue'),
        meta: { title: '创建标签定义' }
      },
      {
        path: ':id',
        name: 'TagDefinitionDetail',
        component: () => import('@/views/TagDefinition/Detail.vue'),
        meta: { title: '标签定义详情' }
      },
      {
        path: ':id/edit',
        name: 'TagDefinitionEdit',
        component: () => import('@/views/TagDefinition/Form.vue'),
        meta: { title: '编辑标签定义' }
      }
    ]
  },
  {
    path: '/tag-filter',
    component: Layout,
    children: [
      {
        path: '',
        name: 'TagFilter',
        component: () => import('@/views/TagFilter/index.vue'),
        meta: { title: '标签筛选' }
      }
    ]
  },
  {
    path: '/tag-query',
    component: Layout,
    children: [
      {
        path: 'user',
        name: 'UserTagQuery',
        component: () => import('@/views/TagQuery/User.vue'),
        meta: { title: '用户标签查询' }
      },
      {
        path: 'statistics',
        name: 'TagStatistics',
        component: () => import('@/views/TagQuery/Statistics.vue'),
        meta: { title: '标签统计' }
      },
      {
        path: 'history',
        name: 'TagHistory',
        component: () => import('@/views/TagQuery/History.vue'),
        meta: { title: '标签历史' }
      }
    ]
  },
  {
    path: '/tag-data-lists',
    component: Layout,
    children: [
      {
        path: '',
        name: 'TagDataListList',
        component: () => import('@/views/TagDataList/List.vue'),
        meta: { title: '数据列表管理' }
      },
      {
        path: 'create',
        name: 'TagDataListCreate',
        component: () => import('@/views/TagDataList/Form.vue'),
        meta: { title: '创建数据列表' }
      },
      {
        path: ':id/edit',
        name: 'TagDataListEdit',
        component: () => import('@/views/TagDataList/Form.vue'),
        meta: { title: '编辑数据列表' }
      }
    ]
  },
  {
    path: '/data-sources',
    component: Layout,
    children: [
      {
        path: '',
        name: 'DataSourceList',
        component: () => import('@/views/DataSource/List.vue'),
        meta: { title: '数据源列表' }
      },
      {
        path: 'create',
        name: 'DataSourceCreate',
        component: () => import('@/views/DataSource/Form.vue'),
        meta: { title: '创建数据源' }
      },
      {
        path: ':id/edit',
        name: 'DataSourceEdit',
        component: () => import('@/views/DataSource/Form.vue'),
        meta: { title: '编辑数据源' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
