<template>
  <div class="task-form">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>{{ isEdit ? '编辑任务' : '创建任务' }}</span>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="140px"
      >
        <!-- 步骤一：基本信息 -->
        <div class="form-section">
          <div class="section-header">
            <span class="section-number">1</span>
            <span class="section-title">基本信息</span>
          </div>
          <div class="section-content">
        <el-form-item label="任务名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入任务名称" style="width: 400px" />
        </el-form-item>
        <el-form-item label="任务描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入任务描述"
                style="width: 600px"
          />
        </el-form-item>
            <el-form-item label="采集模式" prop="mode">
              <el-radio-group v-model="form.mode">
                <el-radio label="batch">批量采集</el-radio>
                <el-radio label="realtime">实时监听</el-radio>
              </el-radio-group>
              <div class="form-tip">批量采集：定时执行采集任务；实时监听：持续监听数据变化</div>
            </el-form-item>
          </div>
        </div>

        <!-- 步骤二：数据处理Handler配置 -->
        <div class="form-section">
          <div class="section-header">
            <span class="section-number">2</span>
            <span class="section-title">数据处理Handler配置</span>
            <span class="section-desc">选择数据处理Handler，Handler会自动处理数据格式转换、存储等逻辑</span>
          </div>
          <div class="section-content">
            <el-form-item label="数据处理方式（Handler）" prop="target_type">
              <el-select
                v-model="form.target_type"
                placeholder="请选择数据处理Handler"
                @change="handleTargetTypeChange"
                style="width: 500px"
              >
                <el-option label="消费记录处理（ConsumptionCollectionHandler）" value="consumption_record" />
                <el-option label="通用集合处理（GenericCollectionHandler）" value="generic" />
              </el-select>
              <div class="form-tip">
                <div>选择数据处理Handler，不同Handler使用不同的业务逻辑：</div>
                <div style="margin-top: 4px;">
                  <strong>消费记录处理：</strong>自动转换数据格式，通过手机号解析用户ID，自动时间分片存储（按月分表），存储到标签引擎数据库
                </div>
                <div style="margin-top: 4px;">
                  <strong>通用集合处理：</strong>支持自定义字段映射，存储到指定集合（需要配置目标数据源、数据库、集合）
                </div>
              </div>
            </el-form-item>

            <!-- 目标数据源配置（仅通用Handler需要） -->
            <template v-if="form.target_type === 'generic'">
              <div class="subsection" style="margin-top: 24px;">
                <div class="subsection-header">
                  <span class="subsection-title">目标数据源配置</span>
                  <span class="subsection-desc">配置数据存储的目标位置</span>
                </div>
                <el-form-item label="目标数据源" prop="target_data_source_id">
                  <el-select
                    v-model="form.target_data_source_id"
                    placeholder="请选择目标数据源"
                    style="width: 400px"
                  >
                    <el-option
                      v-for="ds in dataSources"
                      :key="ds.id"
                      :label="ds.name || ds.id"
                      :value="ds.id"
                    />
                  </el-select>
                  <div class="form-tip">选择数据存储的目标数据源</div>
                </el-form-item>
                <el-form-item label="目标数据库" prop="target_database">
                  <el-input
                    v-model="form.target_database"
                    placeholder="请输入目标数据库名称"
                    style="width: 400px"
                  />
                  <div class="form-tip">数据存储的目标数据库名称</div>
                </el-form-item>
                <el-form-item label="目标集合" prop="target_collection">
                  <el-input
                    v-model="form.target_collection"
                    placeholder="请输入目标集合名称"
                    style="width: 400px"
                  />
                  <div class="form-tip">数据存储的目标集合名称</div>
                </el-form-item>
              </div>
            </template>
            <!-- 消费记录Handler的目标配置提示 -->
            <template v-else-if="form.target_type === 'consumption_record'">
              <div class="subsection" style="margin-top: 24px;">
                <el-alert
                  title="消费记录Handler会自动存储到标签引擎数据库的消费记录表"
                  type="info"
                  :closable="false"
                />
              </div>
            </template>
          </div>
        </div>

        <!-- 步骤三：源数据配置 -->
        <div class="form-section">
          <div class="section-header">
            <span class="section-number">3</span>
            <span class="section-title">源数据配置</span>
            <span class="section-desc">配置要采集的数据来源，支持多表查询</span>
          </div>
          <div class="section-content">
            <div class="config-flow">
        <el-form-item label="数据源" prop="data_source_id">
          <el-select
            v-model="form.data_source_id"
            placeholder="请选择数据源"
            @change="handleDataSourceChange"
                  style="width: 400px"
          >
            <el-option
              v-for="ds in dataSources"
              :key="ds.id"
              :label="ds.name || ds.id"
              :value="ds.id"
            />
          </el-select>
        </el-form-item>
              
              <div class="flow-arrow">↓</div>
              
        <el-form-item label="数据库" prop="database">
          <el-select
            v-model="form.database"
            placeholder="请选择数据库"
            :disabled="!form.data_source_id"
            @change="handleDatabaseChange"
                  style="width: 400px"
          >
            <el-option
              v-for="db in databases"
              :key="db.id"
              :label="db.name"
              :value="db.name"
            />
          </el-select>
        </el-form-item>

              <div class="flow-arrow">↓</div>

        <!-- 多集合模式切换 -->
        <el-form-item label="多集合模式">
          <el-switch
            v-model="form.multi_collection"
            active-text="启用"
            inactive-text="禁用"
            @change="handleMultiCollectionChange"
          />
          <div class="form-tip">启用后可以同时选择多个集合，每个集合可配置独立的字段映射</div>
        </el-form-item>

              <div class="flow-arrow">↓</div>
        
        <!-- 单集合模式 -->
        <el-form-item
          v-if="!form.multi_collection"
          label="集合"
          prop="collection"
        >
          <el-select
            v-model="form.collection"
            placeholder="请选择集合"
            :disabled="!form.database"
            @change="handleCollectionChange"
                  style="width: 400px"
          >
            <el-option
              v-for="coll in collections"
              :key="coll.id"
              :label="coll.name"
              :value="coll.name"
            />
          </el-select>
        </el-form-item>
        
        <!-- 多集合模式 -->
        <el-form-item
          v-if="form.multi_collection"
          label="集合列表"
          prop="collections"
        >
          <el-checkbox-group
            v-model="form.collections"
            @change="handleCollectionsChange"
                  style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; padding: 10px; border: 1px solid #dcdfe6; border-radius: 4px; width: 400px;"
          >
            <el-checkbox
              v-for="coll in collections"
              :key="coll.id"
              :label="coll.name"
              :disabled="!form.database"
            >
              {{ coll.name }}
            </el-checkbox>
          </el-checkbox-group>
          <div class="form-tip">已选择 {{ form.collections?.length || 0 }} 个集合</div>
        </el-form-item>
            </div>

        <!-- 连表查询配置（仅单集合模式） -->
            <div v-if="!form.multi_collection" class="subsection" style="margin-top: 24px;">
              <div class="subsection-header">
                <span class="subsection-title">连表查询（可选）</span>
                <span class="subsection-desc">支持 MongoDB $lookup 连表查询，可以从其他集合关联数据</span>
              </div>
          <el-form-item>
                <el-button type="primary" @click="handleAddLookup" size="small">
              <el-icon><Plus /></el-icon>
              添加关联查询
            </el-button>
          </el-form-item>
              <el-table :data="form.lookups" border v-if="form.lookups && form.lookups.length > 0" style="margin-top: 10px">
            <el-table-column label="关联集合" width="200">
              <template #default="{ row }">
                <el-select
                  v-model="row.from"
                  placeholder="选择集合"
                  filterable
                >
                  <el-option
                    v-for="coll in collections"
                    :key="coll.id"
                    :label="coll.name"
                    :value="coll.name"
                  />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="主集合字段" width="150">
              <template #default="{ row }">
                <el-input v-model="row.local_field" placeholder="如: user_id" />
              </template>
            </el-table-column>
            <el-table-column label="关联集合字段" width="150">
              <template #default="{ row }">
                <el-input v-model="row.foreign_field" placeholder="如: _id" />
              </template>
            </el-table-column>
            <el-table-column label="结果字段名" width="150">
              <template #default="{ row }">
                <el-input v-model="row.as" placeholder="如: user_info" />
              </template>
            </el-table-column>
            <el-table-column label="解构" width="100">
              <template #default="{ row }">
                <el-switch
                  v-model="row.unwrap"
                  active-text="是"
                  inactive-text="否"
                />
                <div class="form-tip" style="font-size: 11px; margin-top: 2px;">
                  解构后可直接使用 user_info.mobile，否则是数组
                </div>
              </template>
            </el-table-column>
            <el-table-column label="保留空值" width="100">
              <template #default="{ row }">
                <el-switch
                  v-model="row.preserve_null"
                  active-text="是"
                  inactive-text="否"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ $index }">
                <el-button
                  type="danger"
                  size="small"
                  @click="handleRemoveLookup($index)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
            </div>

            <!-- 过滤条件 -->
            <div v-if="!form.multi_collection" class="subsection" style="margin-top: 24px;">
              <div class="subsection-header">
                <span class="subsection-title">过滤条件（可选）</span>
                <span class="subsection-desc">设置数据采集的过滤条件，只采集满足条件的数据</span>
              </div>
        <el-form-item>
                <el-button type="primary" @click="handleAddFilter" size="small">
            <el-icon><Plus /></el-icon>
            添加过滤条件
          </el-button>
        </el-form-item>
              <el-table :data="form.filter_conditions" border v-if="form.filter_conditions && form.filter_conditions.length > 0" style="margin-top: 10px">
          <el-table-column label="字段" width="200">
            <template #default="{ row }">
              <el-input v-model="row.field" placeholder="字段名" />
        </template>
          </el-table-column>
          <el-table-column label="运算符" width="150">
            <template #default="{ row }">
              <el-select v-model="row.operator">
                <el-option label="等于" value="eq" />
                <el-option label="不等于" value="ne" />
                <el-option label="大于" value="gt" />
                <el-option label="大于等于" value="gte" />
                <el-option label="小于" value="lt" />
                <el-option label="小于等于" value="lte" />
                <el-option label="在列表中" value="in" />
                <el-option label="不在列表中" value="nin" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="值">
            <template #default="{ row }">
              <el-input v-model="row.value" placeholder="值" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ $index }">
              <el-button
                type="danger"
                size="small"
                @click="handleRemoveFilter($index)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
            </div>

            <!-- 预览查询结果 -->
            <div v-if="!form.multi_collection" class="subsection" style="margin-top: 24px;">
              <div class="subsection-header">
                <span class="subsection-title">预览查询结果</span>
                <span class="subsection-desc">预览配置的查询将返回的字段和数据（包含过滤条件）</span>
              </div>
              <el-form-item>
                <el-button 
                  type="success" 
                  @click="handlePreviewQuery" 
                  :loading="previewLoading"
                  :disabled="!canPreview"
                >
                  <el-icon><View /></el-icon>
                  预览查询结果
                </el-button>
                <div class="form-tip" style="margin-top: 8px;">
                  点击预览按钮，查看查询后的字段列表和数据样本（最多显示5条）
                </div>
              </el-form-item>
              
              <!-- 预览结果 -->
              <div v-if="previewResult" style="margin-top: 16px;">
                <el-alert
                  :title="`预览成功：共 ${previewResult.count} 条数据，${previewResult.fields.length} 个字段`"
                  type="success"
                  :closable="false"
                  style="margin-bottom: 16px;"
                />
                
                <!-- 字段列表 -->
                <div style="margin-bottom: 16px;">
                  <h4 style="margin-bottom: 8px; font-size: 14px; font-weight: 600;">查询后的字段列表：</h4>
                  <el-tag
                    v-for="field in previewResult.fields"
                    :key="field.name"
                    style="margin-right: 8px; margin-bottom: 8px;"
                  >
                    {{ field.name }} ({{ field.type }})
                  </el-tag>
                </div>
                
                <!-- 数据预览表格 -->
                <el-table :data="previewResult.data" border max-height="400" style="margin-top: 16px;">
                  <el-table-column
                    v-for="field in previewResult.fields"
                    :key="field.name"
                    :prop="field.name"
                    :label="field.name"
                    :min-width="150"
                    show-overflow-tooltip
                  />
                </el-table>
              </div>
            </div>
          </div>
        </div>

        <!-- 步骤四：字段映射配置 -->
        <div class="form-section">
          <div class="section-header">
            <span class="section-number">4</span>
            <span class="section-title">字段映射配置</span>
            <span class="section-desc">将预览查询结果的字段映射到Handler的目标字段</span>
          </div>
          <div class="section-content">
        <!-- 字段映射 -->
            <div class="subsection">
              <div class="subsection-header">
                <span class="subsection-title">字段映射</span>
                <span class="subsection-desc">
                  将步骤三预览查询结果的字段映射到Handler的目标字段
                </span>
              </div>
              <el-alert
                v-if="!previewResult && !form.multi_collection"
                title="请先在步骤三预览查询结果，然后再进行字段映射"
                type="warning"
                :closable="false"
                style="margin-bottom: 16px;"
              />
              <!-- 消费记录Handler的字段映射（基于目标字段列表） -->
              <template v-if="form.target_type === 'consumption_record' && targetFields.length > 0">
                <el-table :data="targetFields" border style="margin-top: 10px">
                  <el-table-column label="目标字段" width="200">
                    <template #default="{ row }">
                      <div>
                        <el-tag v-if="row.required" type="danger" size="small" style="margin-right: 5px;">必填</el-tag>
                        <strong>{{ row.label }}</strong>
                        <div style="font-size: 12px; color: #909399; margin-top: 2px;">
                          {{ row.name }} ({{ row.type }})
                        </div>
                        <div v-if="row.description" style="font-size: 11px; color: #909399; margin-top: 2px;">
                          {{ row.description }}
                        </div>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="源字段/值" width="250">
                    <template #default="{ row }">
                      <!-- 不需要映射的字段（如user_id, store_id） -->
                      <div v-if="row.no_mapping" style="color: #909399; font-size: 12px;">
                        <el-icon><InfoFilled /></el-icon>
                        由Handler自动生成，无需映射
                      </div>
                      <!-- 固定选项字段（如currency） -->
                      <el-select
                        v-else-if="row.fixed_options && row.options"
                        v-model="getTargetFieldMapping(row.name).source_field"
                        placeholder="请选择"
                        style="width: 100%"
                        @change="handleFieldMappingChange(row.name)"
                      >
                        <el-option
                          v-for="option in row.options"
                          :key="option.value"
                          :label="option.label"
                          :value="option.value"
                        />
                      </el-select>
                      <!-- 状态值映射字段（如status） -->
                      <div v-else-if="row.value_mapping" style="width: 100%">
                        <el-select
                          v-model="getTargetFieldMapping(row.name).source_field"
                          placeholder="请选择源状态字段"
                          filterable
                          clearable
                          style="width: 100%; margin-bottom: 8px;"
                          :disabled="!previewResult"
                          @change="handleFieldMappingChange(row.name)"
                        >
                          <el-option
                            v-for="field in previewFields"
                            :key="field.name"
                            :label="field.name"
                            :value="field.name"
                          />
                        </el-select>
                        <el-button
                          type="primary"
                          size="small"
                          @click="handleOpenValueMappingDialog(row)"
                          style="width: 100%"
                        >
                          配置状态值映射
                        </el-button>
                      </div>
                      <!-- 普通字段：从源数据选择 -->
                      <el-select
                        v-else
                        v-model="getTargetFieldMapping(row.name).source_field"
                        placeholder="请选择源字段"
                        filterable
                        clearable
                        style="width: 100%"
                        :disabled="!previewResult"
                        @change="handleFieldMappingChange(row.name)"
                      >
                        <el-option
                          v-for="field in previewFields"
                          :key="field.name"
                          :label="field.name"
                          :value="field.name"
                        />
                      </el-select>
                    </template>
                  </el-table-column>
                  <el-table-column label="转换函数" width="150">
                    <template #default="{ row }">
                      <!-- 不需要映射、固定选项或状态值映射的字段，不显示转换函数 -->
                      <el-select 
                        v-if="!row.no_mapping && !row.fixed_options && !row.value_mapping"
                        v-model="getTargetFieldMapping(row.name).transform" 
                        placeholder="请选择" 
                        clearable
                        style="width: 100%"
                      >
                        <el-option label="解析金额" value="parse_amount" />
                        <el-option label="解析日期时间" value="parse_datetime" />
                        <el-option label="解析手机号" value="parse_phone" />
                      </el-select>
                      <span v-else style="color: #909399; font-size: 12px;">-</span>
                    </template>
                  </el-table-column>
                </el-table>
              </template>
        
              <!-- 通用Handler或单集合模式的字段映射（自由映射） -->
              <template v-else-if="form.target_type === 'generic' || (form.target_type === 'consumption_record' && targetFields.length === 0)">
                <div v-if="!form.multi_collection">
          <el-form-item>
                    <el-button type="primary" @click="handleAddMapping" size="small">
              <el-icon><Plus /></el-icon>
              添加字段映射
            </el-button>
          </el-form-item>
                  <el-table :data="form.field_mappings" border style="margin-top: 10px">
          <el-table-column label="源字段" width="200">
            <template #default="{ row, $index }">
              <el-select
                v-model="row.source_field"
                placeholder="请选择源字段"
                filterable
                clearable
                :disabled="!previewResult"
              >
                <el-option
                  v-for="field in previewFields"
                  :key="field.name"
                  :label="field.name"
                  :value="field.name"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="目标字段" width="200">
            <template #default="{ row }">
              <el-select
                v-model="row.target_field"
                placeholder="请选择或输入目标字段"
                filterable
                allow-create
                default-first-option
                style="width: 100%"
              >
                <el-option
                  v-for="field in availableTargetFields"
                  :key="field"
                  :label="field"
                  :value="field"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="转换函数" width="150">
            <template #default="{ row }">
              <el-select v-model="row.transform" placeholder="请选择" clearable>
                <el-option label="解析金额" value="parse_amount" />
                <el-option label="解析日期时间" value="parse_datetime" />
                <el-option label="解析手机号" value="parse_phone" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ $index }">
              <el-button
                type="danger"
                size="small"
                @click="handleRemoveMapping($index)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
                </div>
        </template>
        
        <!-- 多集合模式的字段映射（使用 Tabs） -->
        <template v-if="form.multi_collection">
                <el-tabs v-model="activeCollectionTab" type="border-card" style="margin-top: 10px">
            <el-tab-pane
              v-for="collName in form.collections"
              :key="collName"
              :label="collName"
              :name="collName"
            >
              <div style="margin-bottom: 10px;">
                <el-button type="primary" size="small" @click="handleAddCollectionMapping(collName)">
                  <el-icon><Plus /></el-icon>
                  添加字段映射
                </el-button>
              </div>
              <el-table
                :data="getCollectionFieldMappings(collName)"
                border
              >
                <el-table-column label="源字段" width="200">
                  <template #default="{ row, $index }">
                    <el-select
                      v-model="row.source_field"
                      placeholder="请选择源字段"
                      filterable
                      clearable
                    >
                      <el-option
                        v-for="field in getCollectionFields(collName)"
                        :key="field.name"
                        :label="field.name"
                        :value="field.name"
                      />
                    </el-select>
                  </template>
                </el-table-column>
                <el-table-column label="目标字段" width="200">
                  <template #default="{ row }">
                    <el-select
                      v-model="row.target_field"
                      placeholder="请选择或输入目标字段"
                      filterable
                      allow-create
                      default-first-option
                      style="width: 100%"
                    >
                      <el-option
                        v-for="field in availableTargetFields"
                        :key="field"
                        :label="field"
                        :value="field"
                      />
                    </el-select>
                  </template>
                </el-table-column>
                <el-table-column label="转换函数" width="150">
                  <template #default="{ row }">
                    <el-select v-model="row.transform" placeholder="请选择" clearable>
                      <el-option label="解析金额" value="parse_amount" />
                      <el-option label="解析日期时间" value="parse_datetime" />
                      <el-option label="解析手机号" value="parse_phone" />
                    </el-select>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="100">
                  <template #default="{ $index }">
                    <el-button
                      type="danger"
                      size="small"
                      @click="handleRemoveCollectionMapping(collName, $index)"
                    >
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </template>
            </div>

          </div>
        </div>

        <!-- 步骤五：调度配置（仅批量模式） -->
        <div v-if="form.mode === 'batch'" class="form-section">
          <div class="section-header">
            <span class="section-number">5</span>
            <span class="section-title">调度配置</span>
            <span class="section-desc">配置批量采集任务的执行计划</span>
          </div>
          <div class="section-content">
          <el-form-item label="启用调度">
            <el-switch v-model="form.schedule.enabled" />
              <div class="form-tip">启用后将按照Cron表达式定时执行采集任务</div>
          </el-form-item>
          <el-form-item
            v-if="form.schedule.enabled"
            label="Cron表达式"
            prop="schedule.cron"
          >
            <el-input
              v-model="form.schedule.cron"
              placeholder="例如: 0 2 * * * (每天凌晨2点)"
                style="width: 400px"
            />
              <div class="form-tip">Cron表达式格式：分 时 日 月 周。例如：0 2 * * * 表示每天凌晨2点执行</div>
          </el-form-item>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e4e7ed;">
          <el-button type="primary" size="large" @click="handleSubmit">保存</el-button>
          <el-button size="large" @click="handleCancel" style="margin-left: 12px;">取消</el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 状态值映射对话框 -->
    <el-dialog
      v-model="valueMappingDialogVisible"
      :title="`配置状态值映射 - ${currentMappingField?.label || ''}`"
      width="700px"
    >
      <div style="margin-bottom: 16px;">
        <el-alert
          title="配置说明"
          type="info"
          :closable="false"
          style="margin-bottom: 16px;"
        >
          <div style="font-size: 12px; line-height: 1.6;">
            <div>将源数据的状态值映射到标准状态值：</div>
            <div style="margin-top: 4px;">• 0 = 正常</div>
            <div>• 1 = 异常</div>
            <div>• 2 = 已删除</div>
            <div style="margin-top: 8px; color: #909399;">提示：源状态值可以是数字、字符串等任意格式</div>
          </div>
        </el-alert>
      </div>
      
      <el-table :data="currentValueMappings" border>
        <el-table-column label="源状态值" width="200">
          <template #default="{ row, $index }">
            <el-input
              v-model="row.source_value"
              placeholder="如: 0, 1, 'paid', 'pending'"
              @blur="handleValueMappingChange"
            />
          </template>
        </el-table-column>
        <el-table-column label="目标状态值" width="200">
          <template #default="{ row }">
            <el-select
              v-model="row.target_value"
              placeholder="请选择"
              style="width: 100%"
              @change="handleValueMappingChange"
            >
              <el-option
                v-for="option in currentMappingField?.target_values"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ $index }">
            <el-button
              type="danger"
              size="small"
              @click="handleRemoveValueMapping($index)"
              :disabled="currentValueMappings.length <= 1"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div style="margin-top: 16px;">
        <el-button type="primary" size="small" @click="handleAddValueMapping">
          <el-icon><Plus /></el-icon>
          添加映射规则
        </el-button>
      </div>
      
      <template #footer>
        <el-button @click="valueMappingDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveValueMapping">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElForm } from 'element-plus'
import { Plus, View, InfoFilled } from '@element-plus/icons-vue'
import { useDataCollectionStore } from '@/store'
import * as dataCollectionApi from '@/api/dataCollection'
import type { DataCollectionTask, FieldMapping, FilterCondition } from '@/types'

const route = useRoute()
const router = useRouter()
const formRef = ref<InstanceType<typeof ElForm>>()
const store = useDataCollectionStore()

const isEdit = computed(() => !!route.params.id)

const dataSources = ref<Array<{ id: string; name?: string; type: string }>>([])
const databases = ref<Array<{ name: string; id: string }>>([])
const collections = ref<Array<{ name: string; id: string }>>([])
// 存储当前选中的数据库和集合的完整信息（包含id）
const selectedDatabase = ref<{ name: string; id: string } | null>(null)
const selectedCollection = ref<{ name: string; id: string } | null>(null)
const sourceFields = ref<Array<{ name: string; type: string }>>([])
const collectionFieldsMap = ref<Record<string, Array<{ name: string; type: string }>>>({})
const activeCollectionTab = ref<string>('')
const targetFields = ref<Array<{
  name: string
  label: string
  type: string
  required: boolean
  description?: string
  no_mapping?: boolean
  fixed_options?: boolean
  options?: Array<{ value: string; label: string }>
  default_value?: string
  value_mapping?: boolean
  target_values?: Array<{ value: number; label: string }>
}>>([])

const form = reactive<Partial<DataCollectionTask>>({
  name: '',
  description: '',
  data_source_id: '',
  database: '',
  collection: '',
  multi_collection: false,
  collections: [],
  target_type: '',
  mode: 'batch',
  field_mappings: [],
  collection_field_mappings: {},
  lookups: [],
  collection_lookups: {},
  filter_conditions: [],
  schedule: {
    enabled: false,
    cron: ''
  }
})

const rules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  data_source_id: [{ required: true, message: '请选择数据源', trigger: 'change' }],
  database: [{ required: true, message: '请选择数据库', trigger: 'change' }],
  target_type: [{ required: true, message: '请选择数据处理方式（Handler）', trigger: 'change' }],
  target_data_source_id: [
    {
      validator: (rule: any, value: any, callback: any) => {
        if (form.target_type === 'generic' && !value) {
          callback(new Error('通用Handler必须配置目标数据源'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ],
  target_database: [
    {
      validator: (rule: any, value: any, callback: any) => {
        if (form.target_type === 'generic' && !value) {
          callback(new Error('通用Handler必须配置目标数据库'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  target_collection: [
    {
      validator: (rule: any, value: any, callback: any) => {
        if (form.target_type === 'generic' && !value) {
          callback(new Error('通用Handler必须配置目标集合'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  collection: [
    {
      validator: (rule: any, value: any, callback: any) => {
        if (!form.multi_collection && !value) {
          callback(new Error('请选择集合'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ],
  collections: [
    {
      validator: (rule: any, value: any, callback: any) => {
        if (form.multi_collection && (!value || value.length === 0)) {
          callback(new Error('请至少选择一个集合'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

const loadDataSources = async () => {
  try {
    await store.fetchDataSources()
    dataSources.value = store.dataSources.map(ds => ({
      id: ds.id,
      name: (ds as any).name || ds.id, // 使用name字段，如果没有则使用id
      type: ds.type
    }))
  } catch (error: any) {
    ElMessage.error(error.message || '加载数据源列表失败')
  }
}

const handleDataSourceChange = async () => {
  form.database = ''
  form.collection = ''
  databases.value = []
  collections.value = []
  sourceFields.value = []
  
  if (form.data_source_id) {
    try {
      const response = await dataCollectionApi.getDatabases(form.data_source_id)
      databases.value = response.data
    } catch (error: any) {
      ElMessage.error(error.message || '加载数据库列表失败')
    }
  }
}

const handleDatabaseChange = async () => {
  // 保存当前选中的集合（如果是编辑模式，避免被清空）
  const previousCollection = form.collection
  form.collection = ''
  collections.value = []
  sourceFields.value = []
  previewResult.value = null // 清空预览结果
  selectedDatabase.value = null
  selectedCollection.value = null
  
  if (form.database && form.data_source_id) {
    try {
      // 找到选中的数据库对象（包含id）
      const db = databases.value.find(d => d.name === form.database)
      if (db) {
        selectedDatabase.value = db
        const response = await dataCollectionApi.getCollections(
          form.data_source_id,
          db // 传入完整对象，API会使用id
        )
        collections.value = response.data
        
        // 如果是编辑模式且之前有选中的集合，尝试恢复
        if (isEdit.value && previousCollection) {
          const foundCollection = collections.value.find(c => c.name === previousCollection)
          if (foundCollection) {
            form.collection = previousCollection
            // 延迟一下，确保集合列表已渲染
            await new Promise(resolve => setTimeout(resolve, 100))
            await handleCollectionChange()
          }
        }
      }
    } catch (error: any) {
      ElMessage.error(error.message || '加载集合列表失败')
    }
  }
}

const handleMultiCollectionChange = () => {
  if (form.multi_collection) {
    // 切换到多集合模式
    form.collection = ''
    form.collections = []
    form.collection_field_mappings = {}
    form.collection_lookups = {}
    sourceFields.value = []
    collectionFieldsMap.value = {}
  } else {
    // 切换到单集合模式
    form.collections = []
    form.collection_field_mappings = {}
    form.collection_lookups = {}
    collectionFieldsMap.value = {}
    if (form.collection) {
      handleCollectionChange()
    }
  }
}

const handleCollectionChange = async () => {
  sourceFields.value = []
  
  if (form.collection && form.database && form.data_source_id) {
    try {
      // 找到选中的集合对象（包含id）
      const coll = collections.value.find(c => c.name === form.collection)
      if (coll && selectedDatabase.value) {
        selectedCollection.value = coll
        const response = await dataCollectionApi.getFields(
          form.data_source_id,
          selectedDatabase.value, // 传入完整对象，API会使用id
          coll // 传入完整对象，API会使用id
        )
        sourceFields.value = response.data
      }
    } catch (error: any) {
      ElMessage.error(error.message || '加载字段列表失败')
    }
  }
}

// lookup配置变化时，扩展字段列表会通过computed自动更新
// 如果需要，可以在这里添加处理逻辑

const handleCollectionsChange = async () => {
  if (!form.multi_collection || !form.collections || form.collections.length === 0) {
    return
  }
  
  // 为每个集合加载字段列表
  for (const collName of form.collections) {
    if (!collectionFieldsMap.value[collName] && form.database && form.data_source_id && selectedDatabase.value) {
      try {
        // 找到对应的集合对象（包含id）
        const coll = collections.value.find(c => c.name === collName)
        if (coll) {
          const response = await dataCollectionApi.getFields(
            form.data_source_id,
            selectedDatabase.value, // 传入完整对象，API会使用id
            coll // 传入完整对象，API会使用id
          )
          collectionFieldsMap.value[collName] = response.data
        }
      } catch (error: any) {
        ElMessage.error(`加载集合 ${collName} 字段列表失败: ${error.message}`)
        collectionFieldsMap.value[collName] = []
      }
    }
  }
  
  // 设置第一个集合为活动标签
  if (form.collections.length > 0 && !activeCollectionTab.value) {
    activeCollectionTab.value = form.collections[0]
  }
}

// 目标类型（Handler）变化处理
const handleTargetTypeChange = async () => {
  // 加载Handler的目标字段列表
  if (form.target_type) {
    try {
      const response = await dataCollectionApi.getHandlerTargetFields(form.target_type)
      targetFields.value = response.data || []
      
      // 如果是消费记录Handler，初始化字段映射（基于目标字段列表）
      if (form.target_type === 'consumption_record' && targetFields.value.length > 0) {
        // 确保field_mappings是基于目标字段的结构
        if (!form.field_mappings || form.field_mappings.length === 0) {
          form.field_mappings = targetFields.value.map(field => {
            // 如果是固定选项字段，设置默认值
            const defaultValue = (field as any).fixed_options && (field as any).default_value ? (field as any).default_value : ''
            const mapping: any = {
              target_field: field.name,
              source_field: defaultValue,
              transform: undefined
            }
            // 如果是状态值映射字段，初始化value_mapping
            if ((field as any).value_mapping) {
              mapping.value_mapping = []
            }
            return mapping
          })
        } else {
          // 合并已有映射和目标字段列表
          const existingMapping = new Map(
            form.field_mappings.map(m => [m.target_field, m])
          )
          form.field_mappings = targetFields.value.map(field => {
            const existing = existingMapping.get(field.name) as any
            if (existing) {
              // 如果已有映射，但字段是固定选项且没有值，设置默认值
              if ((field as any).fixed_options && (field as any).default_value && !existing.source_field) {
                existing.source_field = (field as any).default_value
              }
              return existing
            } else {
              // 新字段，如果是固定选项，设置默认值
              const defaultValue = (field as any).fixed_options && (field as any).default_value ? (field as any).default_value : ''
              const mapping: any = {
                target_field: field.name,
                source_field: defaultValue,
                transform: undefined
              }
              // 如果是状态值映射字段，初始化value_mapping
              if ((field as any).value_mapping) {
                mapping.value_mapping = []
              }
              return mapping
            }
          })
        }
      }
    } catch (error: any) {
      ElMessage.error(error.message || '加载Handler目标字段列表失败')
      targetFields.value = []
    }
  } else {
    targetFields.value = []
  }
}

// 获取目标字段的映射配置
const getTargetFieldMapping = (targetFieldName: string): FieldMapping => {
  if (!form.field_mappings) {
    form.field_mappings = []
  }
  let mapping = form.field_mappings.find(m => m.target_field === targetFieldName)
  if (!mapping) {
    mapping = {
      target_field: targetFieldName,
      source_field: '',
      transform: undefined
    }
    form.field_mappings.push(mapping)
  }
  return mapping
}

// 字段映射变化处理
const handleFieldMappingChange = (_targetFieldName: string) => {
  // 可以在这里添加额外的处理逻辑
}

// 打开状态值映射对话框
const handleOpenValueMappingDialog = (field: any) => {
  currentMappingField.value = {
    name: field.name,
    label: field.label,
    target_values: field.target_values
  }
  
  // 获取当前字段的映射配置
  const mapping = getTargetFieldMapping(field.name) as any
  // 如果已有value_mapping配置，使用它；否则创建新的
  if (mapping.value_mapping && Array.isArray(mapping.value_mapping)) {
    currentValueMappings.value = mapping.value_mapping.map((vm: any) => ({
      source_value: vm.source_value || '',
      target_value: vm.target_value ?? 0
    }))
  } else {
    // 默认创建一个映射规则
    currentValueMappings.value = [{
      source_value: '',
      target_value: field.default_value ?? 0
    }]
  }
  
  valueMappingDialogVisible.value = true
}

// 添加状态值映射规则
const handleAddValueMapping = () => {
  currentValueMappings.value.push({
    source_value: '',
    target_value: currentMappingField.value?.target_values?.[0]?.value ?? 0
  })
}

// 删除状态值映射规则
const handleRemoveValueMapping = (index: number) => {
  if (currentValueMappings.value.length > 1) {
    currentValueMappings.value.splice(index, 1)
  }
}

// 状态值映射变化处理
const handleValueMappingChange = () => {
  // 可以在这里添加验证逻辑
}

// 保存状态值映射
const handleSaveValueMapping = () => {
  if (!currentMappingField.value) return
  
  // 验证：所有源状态值必须填写
  const hasEmpty = currentValueMappings.value.some(vm => !vm.source_value || vm.source_value.trim() === '')
  if (hasEmpty) {
    ElMessage.warning('请填写所有源状态值')
    return
  }
  
  // 验证：源状态值不能重复
  const sourceValues = currentValueMappings.value.map(vm => String(vm.source_value).trim().toLowerCase())
  const uniqueValues = new Set(sourceValues)
  if (sourceValues.length !== uniqueValues.size) {
    ElMessage.warning('源状态值不能重复')
    return
  }
  
  // 保存到字段映射配置
  const mapping = getTargetFieldMapping(currentMappingField.value.name) as any
  mapping.value_mapping = currentValueMappings.value.map(vm => ({
    source_value: String(vm.source_value).trim(),
    target_value: vm.target_value
  }))
  
  valueMappingDialogVisible.value = false
  ElMessage.success('状态值映射配置已保存')
}

const handleAddMapping = () => {
  form.field_mappings = form.field_mappings || []
  form.field_mappings.push({
    source_field: '',
    target_field: '',
    transform: undefined
  })
}

const handleRemoveMapping = (index: number) => {
  form.field_mappings?.splice(index, 1)
}

const handleAddFilter = () => {
  form.filter_conditions = form.filter_conditions || []
  form.filter_conditions.push({
    field: '',
    operator: 'eq',
    value: ''
  })
}

const handleRemoveFilter = (index: number) => {
  form.filter_conditions?.splice(index, 1)
}

// 连表查询相关方法
const handleAddLookup = () => {
  form.lookups = form.lookups || []
  form.lookups.push({
    from: '',
    local_field: '',
    foreign_field: '',
    as: 'joined',
    unwrap: false,
    preserve_null: true
  })
}

const handleRemoveLookup = (index: number) => {
  form.lookups?.splice(index, 1)
}

// 多集合字段映射相关方法
const handleAddCollectionMapping = (collectionName: string) => {
  if (!form.collection_field_mappings) {
    form.collection_field_mappings = {}
  }
  if (!form.collection_field_mappings[collectionName]) {
    form.collection_field_mappings[collectionName] = []
  }
  form.collection_field_mappings[collectionName].push({
    source_field: '',
    target_field: '',
    transform: undefined
  })
}

const handleRemoveCollectionMapping = (collectionName: string, index: number) => {
  if (form.collection_field_mappings?.[collectionName]) {
    form.collection_field_mappings[collectionName].splice(index, 1)
  }
}

const getCollectionFieldMappings = (collectionName: string): FieldMapping[] => {
  if (!form.collection_field_mappings) {
    form.collection_field_mappings = {}
  }
  if (!form.collection_field_mappings[collectionName]) {
    form.collection_field_mappings[collectionName] = []
  }
  return form.collection_field_mappings[collectionName]
}

const getCollectionFields = (collectionName: string): Array<{ name: string; type: string }> => {
  return collectionFieldsMap.value[collectionName] || []
}

// 预览相关
const previewLoading = ref(false)
const previewResult = ref<{
  fields: Array<{ name: string; type: string }>
  data: Array<any>
  count: number
} | null>(null)

// 状态值映射对话框
const valueMappingDialogVisible = ref(false)
const currentMappingField = ref<{
  name: string
  label: string
  target_values?: Array<{ value: number; label: string }>
} | null>(null)
const currentValueMappings = ref<Array<{ source_value: string; target_value: number }>>([])

// 预览字段列表（从预览结果中获取）
const previewFields = computed(() => {
  if (previewResult.value) {
    return previewResult.value.fields
  }
  return []
})

// 可用的目标字段列表（用于下拉选择）
const availableTargetFields = computed(() => {
  const fields = new Set<string>()
  
  // 1. 如果Handler有预定义的目标字段，添加到列表
  if (targetFields.value.length > 0) {
    targetFields.value.forEach(field => {
      fields.add(field.name)
    })
  }
  
  // 2. 从已配置的字段映射中收集目标字段（避免重复输入）
  if (form.field_mappings && form.field_mappings.length > 0) {
    form.field_mappings.forEach((mapping: FieldMapping) => {
      if (mapping.target_field) {
        fields.add(mapping.target_field)
      }
    })
  }
  
  // 3. 从多集合模式的字段映射中收集
  if (form.collection_field_mappings) {
    Object.values(form.collection_field_mappings).forEach((mappings: FieldMapping[]) => {
      mappings.forEach((mapping: FieldMapping) => {
        if (mapping.target_field) {
          fields.add(mapping.target_field)
        }
      })
    })
  }
  
  return Array.from(fields).sort()
})

// 是否可以预览
const canPreview = computed(() => {
  return !!(form.data_source_id && form.database && form.collection && !form.multi_collection)
})

// 预览查询结果
const handlePreviewQuery = async () => {
  if (!canPreview.value) {
    ElMessage.warning('请先选择数据源、数据库和集合')
    return
  }
  
  if (!form.data_source_id || !form.database || !form.collection) {
    ElMessage.warning('请先选择数据源、数据库和集合')
    return
  }
  
  previewLoading.value = true
  try {
    const response = await dataCollectionApi.previewQuery({
      data_source_id: form.data_source_id,
      database: form.database,
      collection: form.collection,
      lookups: form.lookups || [],
      filter_conditions: form.filter_conditions || [],
      limit: 5
    })
    previewResult.value = response.data
    ElMessage.success('预览成功')
  } catch (error: any) {
    ElMessage.error(error.message || '预览失败')
    previewResult.value = null
  } finally {
    previewLoading.value = false
  }
}


const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (isEdit.value) {
          await store.updateTask(route.params.id as string, form)
          ElMessage.success('任务更新成功')
        } else {
          // 创建任务时，确保状态为待启动
          const taskData = {
            ...form,
            status: 'pending' // 明确设置为待启动状态
          }
          await store.createTask(taskData)
          ElMessage.success('任务创建成功')
        }
        router.push('/data-collection/tasks')
      } catch (error: any) {
        ElMessage.error(error.message || '保存失败')
      }
    }
  })
}

const handleCancel = () => {
  router.back()
}

const loadTaskDetail = async () => {
  if (!isEdit.value) return
  
  try {
    const task = await store.fetchTaskDetail(route.params.id as string)
    if (task) {
      // 保存原始值（在调用会清空的方法之前）
      const originalDatabase = task.database || ''
      const originalCollection = task.collection || ''
      
      Object.assign(form, {
        name: task.name,
        description: task.description,
        data_source_id: task.data_source_id,
        database: task.database,
        collection: task.collection || '',
        multi_collection: !!(task.collections && task.collections.length > 0),
        collections: task.collections || [],
        target_type: task.target_type || 'consumption_record',
        target_data_source_id: task.target_data_source_id || '',
        target_database: task.target_database || '',
        target_collection: task.target_collection || '',
        mode: task.mode,
        field_mappings: task.field_mappings || [],
        collection_field_mappings: task.collection_field_mappings || {},
        lookups: task.lookups || [],
        collection_lookups: task.collection_lookups || {},
        filter_conditions: task.filter_conditions || [],
        schedule: task.schedule || { enabled: false, cron: '' }
      })
      
      // 如果是多集合模式，加载字段列表
      if (form.multi_collection && form.collections && form.collections.length > 0) {
        await handleCollectionsChange()
      }
      
      // 加载数据源相关的选项
      await loadDataSources()
      if (task.data_source_id) {
        // 先加载数据库列表（这会清空 form.database 和 form.collection）
        await handleDataSourceChange()
        
        // 恢复数据库选择
        if (originalDatabase && databases.value.length > 0) {
          const foundDatabase = databases.value.find(d => d.name === originalDatabase)
          if (foundDatabase) {
            form.database = originalDatabase
            // 在调用 handleDatabaseChange 之前，先设置 collection（这样 handleDatabaseChange 中的 previousCollection 才能获取到）
            if (originalCollection) {
              form.collection = originalCollection
            }
            // 等待一下，确保数据库选择已设置
            await new Promise(resolve => setTimeout(resolve, 100))
            
            // 加载集合列表（handleDatabaseChange 内部会恢复 collection，如果是编辑模式）
            await handleDatabaseChange()
            
            // 如果 handleDatabaseChange 没有自动恢复集合（比如集合不存在），手动设置
            if (originalCollection && !form.collection && collections.value.length > 0) {
              const foundCollection = collections.value.find(c => c.name === originalCollection)
              if (foundCollection) {
                form.collection = originalCollection
                // 等待一下，确保集合选择已设置
                await new Promise(resolve => setTimeout(resolve, 100))
                await handleCollectionChange()
              }
            }
          }
        }
        
        // 编辑模式下，自动触发预览查询（单集合模式且不是多集合模式）
        if (!form.multi_collection && form.collection && canPreview.value) {
          // 延迟一下，确保所有数据都已加载完成
          await new Promise(resolve => setTimeout(resolve, 200))
          await handlePreviewQuery()
        }
      }
      
      // 加载Handler的目标字段列表
      if (task.target_type) {
        await handleTargetTypeChange()
      }
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载任务详情失败')
  }
}

onMounted(() => {
  loadDataSources()
  if (isEdit.value) {
    loadTaskDetail()
  }
})
</script>

<style scoped lang="scss">
.task-form {
  .card-header {
    font-weight: 500;
    font-size: 16px;
  }

  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 5px;
    line-height: 1.5;
  }

  // 表单区块样式
  .form-section {
    margin-bottom: 32px;
    background: #fafafa;
    border-radius: 8px;
    padding: 24px;
    border: 1px solid #e4e7ed;

    &:last-child {
      margin-bottom: 0;
    }
  }

  // 区块头部
  .section-header {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 2px solid #409eff;

    .section-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: #409eff;
      color: #fff;
      border-radius: 50%;
      font-weight: bold;
      font-size: 14px;
      margin-right: 12px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #303133;
      margin-right: 12px;
    }

    .section-desc {
      font-size: 13px;
      color: #909399;
      font-weight: normal;
    }
  }

  // 区块内容
  .section-content {
    padding-left: 40px;
  }

  // 流程式配置布局
  .config-flow {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  // 流程箭头
  .flow-arrow {
    text-align: center;
    color: #409eff;
    font-size: 24px;
    font-weight: bold;
    margin: -8px 0;
    line-height: 1;
  }

  // 子区块
  .subsection {
    margin-top: 24px;
    padding: 20px;
    background: #fff;
    border-radius: 6px;
    border: 1px solid #e4e7ed;

    &:first-child {
      margin-top: 0;
    }
  }

  .subsection-header {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e4e7ed;

    .subsection-title {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
      margin-right: 12px;
    }

    .subsection-desc {
      font-size: 12px;
      color: #909399;
    }
  }
}
</style>

