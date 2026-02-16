/**
 * 通用类型定义
 */

// API 响应结构
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

// 分页响应
export interface PageResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// 数据采集任务
export interface LookupConfig {
  from: string
  local_field: string
  foreign_field: string
  as: string
  unwrap?: boolean
  preserve_null?: boolean
}

export interface DataCollectionTask {
  task_id: string
  name: string
  description?: string
  data_source_id: string // 源数据源ID
  database: string // 源数据库
  collection?: string // 源集合（单集合模式）
  collections?: string[] // 源集合列表（多集合模式）
  multi_collection?: boolean
  target_data_source_id?: string // 目标数据源ID
  target_database?: string // 目标数据库
  target_collection?: string // 目标集合
  target_type?: string // 目标类型：consumption_record=消费记录，generic=通用集合
  mode: 'batch' | 'realtime'
  field_mappings: FieldMapping[]
  collection_field_mappings?: Record<string, FieldMapping[]>
  lookups?: LookupConfig[]
  collection_lookups?: Record<string, LookupConfig[]>
  filter_conditions?: FilterCondition[]
  schedule: ScheduleConfig
  status: 'pending' | 'running' | 'paused' | 'stopped' | 'error'
  progress: TaskProgress
  statistics?: TaskStatistics
  created_by?: string
  created_at: string
  updated_at: string
}

// 字段映射
export interface FieldMapping {
  source_field: string
  target_field: string
  transform?: string
  value_mapping?: Array<{
    source_value: string
    target_value: number
  }>
}

// 过滤条件
export interface FilterCondition {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin'
  value: any
}

// 调度配置
export interface ScheduleConfig {
  enabled: boolean
  cron?: string
}

// 任务进度
export interface TaskProgress {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error'
  processed_count?: number
  success_count?: number
  error_count?: number
  total_count?: number
  percentage?: number
  start_time?: string
  end_time?: string
  last_sync_time?: string
}

// 任务统计
export interface TaskStatistics {
  total_processed?: number
  total_success?: number
  total_error?: number
  last_run_time?: string
}

// 数据源
export interface DataSource {
  id: string
  name?: string
  type: string
  host: string
  port: number
  database: string
}

// 标签任务
export interface TagTask {
  task_id: string
  name: string
  description?: string
  task_type: 'full' | 'incremental' | 'specific'
  target_tag_ids: string[]
  user_scope: UserScope
  schedule: ScheduleConfig
  config: TagTaskConfig
  status: 'pending' | 'running' | 'paused' | 'stopped' | 'completed' | 'error'
  progress: TagTaskProgress
  statistics?: TagTaskStatistics
  created_by?: string
  created_at: string
  updated_at: string
}

// 用户范围
export interface UserScope {
  type: 'all' | 'list' | 'filter'
  user_ids?: string[]
  filter_conditions?: FilterCondition[]
}

// 标签任务配置
export interface TagTaskConfig {
  concurrency: number
  batch_size: number
  error_handling: 'skip' | 'stop' | 'retry'
}

// 标签任务进度
export interface TagTaskProgress {
  total_users: number
  processed_users: number
  success_count: number
  error_count: number
  percentage: number
}

// 标签任务统计
export interface TagTaskStatistics {
  total_executions: number
  success_executions: number
  failed_executions: number
  last_run_time?: string
}

// 任务执行记录
export interface TaskExecution {
  execution_id: string
  task_id: string
  started_at: string
  finished_at?: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  processed_users?: number
  success_count?: number
  error_count?: number
  error_message?: string
}

// 标签定义
export interface TagDefinition {
  tag_id: string
  tag_code: string
  tag_name: string
  category: string
  description?: string
  rule_type: 'simple' | 'pipeline' | 'custom'
  rule_config: RuleConfig
  update_frequency: 'real_time' | 'daily' | 'weekly' | 'monthly'
  status: number // 0-启用，1-禁用
  priority?: number
  version?: number
  created_at?: string
  updated_at?: string
}

// 规则配置
export interface RuleConfig {
  rule_type: 'simple' | 'pipeline' | 'custom'
  conditions: RuleCondition[]
  tag_value?: any
  confidence?: number
}

// 规则条件
export interface RuleCondition {
  field: string
  operator: '>' | '>=' | '<' | '<=' | '=' | '!=' | 'in' | 'not_in'
  value: any
}

// 标签条件（用于筛选）
export interface TagCondition {
  tag_code: string
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'not_contains'
  value: any
}

// 用户标签
export interface UserTag {
  tag_id: string
  tag_code?: string
  tag_name?: string
  category?: string
  tag_value: string
  tag_value_type: string
  confidence: number
  effective_time?: string
  expire_time?: string
  update_time: string
}

// 用户信息
export interface UserInfo {
  user_id: string
  name?: string
  phone?: string
  total_amount?: number
  total_count?: number
  last_consume_time?: string
}

// 标签统计信息
export interface TagStatistics {
  value_distribution: Array<{
    value: string
    count: number
  }>
  trend_data: Array<{
    date: string
    count: number
  }>
  coverage_stats: Array<{
    tag_id: string
    tag_name: string
    total_users: number
    tagged_users: number
    coverage_rate: number
  }>
}

// 标签历史记录
export interface TagHistoryItem {
  user_id: string
  tag_id: string
  tag_name: string | null
  old_value?: string | null
  new_value: string
  change_reason?: string | null
  change_time: string | null
  operator?: string | null
}

// 标签历史响应
export interface TagHistoryResponse {
  items: TagHistoryItem[]
  total: number
  page: number
  page_size: number
}

// 人群快照
export interface TagCohort {
  cohort_id: string
  name: string
  description?: string
  conditions: TagCondition[]
  logic: 'AND' | 'OR'
  user_ids: string[]
  user_count: number
  created_by?: string
  created_at: string
  updated_at?: string
}

// 人群快照列表项
export interface TagCohortListItem {
  cohort_id: string
  name: string
  user_count: number
  created_at: string
}

