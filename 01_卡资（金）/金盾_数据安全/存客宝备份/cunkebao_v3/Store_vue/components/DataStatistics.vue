<template>
	
	<view v-if="show" class="data-statistics-container">
			<!-- 头部 -->
			<view class="header">
				<view class="back-icon" @tap="closePage">
					<u-icon name="arrow-left" color="#333" size="26"></u-icon>
				</view>
				<view class="title">数据统计</view>
				<view class="close-icon" @tap="closePage">
					<u-icon name="close" color="#333" size="24"></u-icon>
				</view>
			</view>
			
		<!-- 上方区域：数据概览 -->
		<view class="top-section" style="position: relative;">
			<!-- 概览标题和时间选择 -->
			<view class="overview-header">
				<view class="overview-title">数据概览</view>
				<view class="overview-actions">
					<view class="time-selector">
						<view class="selector-content" @tap="showDateSelector">
							<text>{{ dateRange }}</text>
							<u-icon name="arrow-down-fill" size="14" color="#666"></u-icon>
						</view>
					</view>
					<view class="custom-date-btn" @tap="showCustomDatePicker" v-if="false">
						<u-icon name="calendar" size="14" color="#666" style="margin-right: 4px;"></u-icon>
						<text>自定义</text>
					</view>
				</view>
			</view>
			
			<!-- 概览卡片 -->
			<view class="overview-grid">
				<view class="overview-item">
					<view class="overview-item-content">
						<view class="item-header">
							<text class="item-label">账号价值估值</text>
							<view class="item-icon blue">
								<text class="iconfont icon-shuju1" style="color: #0080ff; font-size: 20px;"></text>
							</view>
						</view>
						<view class="item-value">{{ overviewData.accountValue.toFixed(1) }}</view>
						<view class="item-desc">RFM平均评分(满分10分)</view>
					</view>
				</view>
				<view class="overview-item">
					<view class="overview-item-content">
						<view class="item-header">
							<text class="item-label">新增客户</text>
							<view class="item-icon green">
								<text class="iconfont icon-shuju-xinzengyonghu" style="color: #18b566; font-size: 20px;"></text>
							</view>
						</view>
						<view class="item-value">{{ overviewData.newCustomers.toLocaleString() }}</view>
						<view class="item-change" :class="overviewData.newCustomersChange >= 0 ? 'up' : 'down'">
							{{ (overviewData.newCustomersChange >= 0 ? '+' : '') + overviewData.newCustomersChange.toFixed(1) }}% 较上期
						</view>
					</view>
				</view>
				<view class="overview-item">
					<view class="overview-item-content">
						<view class="item-header">
							<text class="item-label">互动次数</text>
							<view class="item-icon orange">
								<text class="iconfont icon-xiaoxi" style="color: #ff9900; font-size: 20px;"></text>
							</view>
						</view>
						<view class="item-value">{{ overviewData.interactions.toLocaleString() }}</view>
						<view class="item-change" :class="overviewData.interactionsChange >= 0 ? 'up' : 'down'">
							{{ (overviewData.interactionsChange >= 0 ? '+' : '') + overviewData.interactionsChange.toFixed(1) }}% 较上期
						</view>
					</view>
				</view>
				<view class="overview-item">
					<view class="overview-item-content">
						<view class="item-header">
							<text class="item-label">转化率</text>
							<view class="item-icon blue">
								<text class="iconfont icon-shejihuan" style="color: #0080ff; font-size: 20px;"></text>
							</view>
						</view>
						<view class="item-value">{{ overviewData.conversionRate.toFixed(1) }}%</view>
						<view class="item-change" :class="overviewData.conversionRateChange >= 0 ? 'up' : 'down'">
							{{ (overviewData.conversionRateChange >= 0 ? '+' : '') + overviewData.conversionRateChange.toFixed(1) }}% 较上期
						</view>
					</view>
				</view>
			</view>
			
			<!-- 数据概览区域遮罩层 -->
			<view v-if="isLoadingOverview" class="section-loading-mask">
				<view class="section-loading-content">
					<view class="section-spinner"></view>
					<text class="section-loading-text">加载中...</text>
				</view>
			</view>
		</view>
		
		<!-- 下方区域：综合分析 -->
		<view class="bottom-section" style="position: relative;">
			<view class="comprehensive-analysis-card">
				<!-- 标题 -->
				<view class="analysis-title">综合分析</view>
				
				<!-- 客户平均转化金额 -->
				<view class="avg-conversion-card">
					<text class="avg-conversion-label">客户平均转化金额</text>
					<text class="avg-conversion-value">¥{{ comprehensiveData.avgConversionAmount.toFixed(2) }}</text>
				</view>
				
				<!-- 价值指标和增长趋势 -->
				<view class="metrics-grid">
					<!-- 价值指标 -->
					<view class="metrics-column">
						<view class="metrics-header">
							<text class="iconfont icon-shuju1" style="color: #999; font-size: 14px; margin-right: 4px;"></text>
							<text class="metrics-title">价值指标</text>
						</view>
						<view class="metrics-item">
							<text class="metrics-label">销售总额</text>
							<text class="metrics-value">¥{{ comprehensiveData.totalSales.toLocaleString() }}</text>
						</view>
						<view class="metrics-item">
							<text class="metrics-label">平均订单金额</text>
							<text class="metrics-value">¥{{ comprehensiveData.avgOrderAmount.toFixed(2) }}</text>
						</view>
						<view class="metrics-item">
							<text class="metrics-label">高价值客户</text>
							<text class="metrics-value">{{ comprehensiveData.highValueCustomers.toFixed(1) }}%</text>
						</view>
					</view>
					
					<!-- 增长趋势 -->
					<view class="metrics-column">
						<view class="metrics-header">
							<text class="iconfont icon-shuju1" style="color: #999; font-size: 14px; margin-right: 4px;"></text>
							<text class="metrics-title">增长趋势</text>
						</view>
						<view class="metrics-item">
							<text class="metrics-label">周收益增长</text>
							<text class="metrics-value up">{{ comprehensiveData.weeklyRevenueGrowth > 0 ? '+' : '' }}¥{{ comprehensiveData.weeklyRevenueGrowth.toLocaleString() }}</text>
						</view>
						<view class="metrics-item">
							<text class="metrics-label">新客转化</text>
							<text class="metrics-value up">{{ comprehensiveData.newCustomerConversion > 0 ? '+' : '' }}{{ comprehensiveData.newCustomerConversion }}人</text>
						</view>
						<view class="metrics-item">
							<text class="metrics-label">活跃客户增长</text>
							<text class="metrics-value up">{{ comprehensiveData.activeCustomerGrowth > 0 ? '+' : '' }}{{ comprehensiveData.activeCustomerGrowth }}人</text>
						</view>
					</view>
				</view>
				
				<!-- 客户活跃度和转化客户来源 -->
				<view class="metrics-grid bottom-section">
					<!-- 客户活跃度 -->
					<view class="metrics-column">
						<view class="metrics-header">
							<text class="iconfont icon-shujucanmou" style="color: #666; font-size: 16px; margin-right: 4px;"></text>
							<text class="metrics-title">客户活跃度</text>
						</view>
						<view class="activity-item" v-for="(item, index) in comprehensiveData.customerActivity" :key="index">
							<view class="activity-dot" :class="getActivityDotClass(item.name)"></view>
							<text class="activity-label">{{ item.name }}</text>
							<text class="activity-value">{{ item.value }}</text>
						</view>
					</view>
					
					<!-- 转化客户来源 -->
					<view class="metrics-column">
						<view class="metrics-header">
							<text class="iconfont icon-shuju1" style="color: #666; font-size: 16px; margin-right: 4px;"></text>
							<text class="metrics-title">转化客户来源</text>
						</view>
						<view class="source-item-new" v-for="(item, index) in comprehensiveData.conversionSource" :key="index">
							<text class="iconfont" :class="getSourceIconClass(item.name)" style="color: #666; font-size: 14px; margin-right: 6px;"></text>
							<text class="source-label">{{ item.name }}</text>
							<text class="source-value">{{ item.count.toLocaleString() }}</text>
						</view>
					</view>
				</view>
			</view>
			
			<!-- 综合分析区域遮罩层 -->
			<view v-if="isLoadingComprehensive" class="section-loading-mask">
				<view class="section-loading-content">
					<view class="section-spinner"></view>
					<text class="section-loading-text">加载中...</text>
				</view>
			</view>
		</view>
		
		<!-- 日期选择弹窗 -->
			<u-popup :show="showDatePopup" mode="bottom" @close="showDatePopup = false">
				<view class="date-selector-popup">
					<view class="date-selector-header">
						<text>选择时间范围</text>
						<view class="date-close-btn" @tap="showDatePopup = false">
							<text class="iconfont icon-guanbi" style="color: #999; font-size: 16px;"></text>
						</view>
					</view>
					<view class="date-selector-list">
						<view 
							v-for="(option, index) in dateOptions" 
							:key="index"
							class="date-option" 
							@tap="selectDateRange(option.label)"
						>
							<text class="date-option-text">{{ option.label }}</text>
							<view class="date-option-check" v-if="dateRange === option.label">
								<text class="iconfont icon-duigou" style="color: #0080ff; font-size: 16px;"></text>
							</view>
						</view>
					</view>
				</view>
			</u-popup>
			
			<!-- 自定义日期选择弹窗 -->
			<u-popup :show="showCustomDatePopup" mode="bottom" @close="showCustomDatePopup = false">
				<view class="custom-date-popup">
					<view class="date-selector-header">
						<text>选择日期范围</text>
						<view class="date-close-btn" @tap="showCustomDatePopup = false">
							<text class="iconfont icon-guanbi" style="color: #999; font-size: 16px;"></text>
						</view>
					</view>
					<view class="custom-date-content">
						<view class="date-range-item">
							<text class="date-range-label">开始日期</text>
							<view class="date-picker-trigger" @tap="openStartDatePicker">
								<text>{{ startDate || '请选择' }}</text>
								<text class="iconfont icon-rili" style="color: #666; font-size: 14px;"></text>
							</view>
						</view>
						<view class="date-range-item">
							<text class="date-range-label">结束日期</text>
							<view class="date-picker-trigger" @tap="openEndDatePicker">
								<text>{{ endDate || '请选择' }}</text>
								<text class="iconfont icon-rili" style="color: #666; font-size: 14px;"></text>
							</view>
						</view>
						<view class="date-action-btns">
							<u-button text="取消" type="info" plain size="medium" @click="showCustomDatePopup = false"></u-button>
							<u-button text="确定" type="primary" size="medium" @click="confirmCustomDateRange"></u-button>
						</view>
					</view>
				</view>
			</u-popup>
			
			<!-- 日期选择器 - 开始日期 -->
			<u-datetime-picker
				:show="showStartDatePicker"
				v-model="tempStartDate"
				mode="date"
				:min-date="minDate"
				:max-date="maxDate"
				@confirm="confirmStartDate"
				@cancel="showStartDatePicker = false"
			></u-datetime-picker>
			
			<!-- 日期选择器 - 结束日期 -->
			<u-datetime-picker
				:show="showEndDatePicker"
				v-model="tempEndDate"
				mode="date"
				:min-date="minDate"
				:max-date="maxDate"
				@confirm="confirmEndDate"
				@cancel="showEndDatePicker = false"
			></u-datetime-picker>
			
		</view>
	
</template>

<script>
	import { request } from '@/api/config';
	
	export default {
		name: 'DataStatistics',
		props: {
			show: {
				type: Boolean,
				default: false
			}
		},
		data() {
			const today = new Date();
			return {
				isLoadingOverview: false, // 数据概览区域加载状态
				isLoadingComprehensive: false, // 综合分析区域加载状态
				dateRange: '本周',
				timeType: 'this_week',
				showDatePopup: false,
				showCustomDatePopup: false,
				showStartDatePicker: false,
				showEndDatePicker: false,
				startDate: '',
				endDate: '',
				tempStartDate: parseInt(today.getTime()),
				tempEndDate: parseInt(today.getTime()),
				minDate: parseInt(new Date(new Date().getFullYear() - 1, 0, 1).getTime()),
				maxDate: parseInt(new Date().getTime()),
				subsectionList: ['客户分析', '互动分析'/* , '转化分析', '收入分析' */],
				currentSubsection: 0,
				overviewData: {
					accountValue: 0,
					newCustomers: 0,
					newCustomersChange: 0,
					interactions: 0,
					interactionsChange: 0,
					conversionRate: 0,
					conversionRateChange: 0
				},
				comprehensiveData: {
					avgConversionAmount: 0,
					totalSales: 0,
					avgOrderAmount: 0,
					highValueCustomers: 0,
					weeklyRevenueGrowth: 0,
					newCustomerConversion: 0,
					activeCustomerGrowth: 0,
					customerActivity: [], // 改为数组，存储API返回的原始数据
					conversionSource: [] // 改为数组，存储API返回的原始数据
				},
				dateOptions: [
					{ label: '今日', value: 'today' },
					{ label: '昨日', value: 'yesterday' },
					{ label: '本周', value: 'this_week' },
					{ label: '上周', value: 'last_week' },
					{ label: '本月', value: 'this_month' },
					{ label: '本季度', value: 'this_quarter' },
					{ label: '本年度', value: 'this_year' }
				],
				customerAnalysis: {
					trend: {
						total: 0,
						new: 0,
						lost: 0
					},
					sourceDistribution: []
				},
				interactionAnalysis: {
					frequencyAnalysis: {
						highFrequency: 0,
						midFrequency: 0,
						lowFrequency: 0,
						chartData: []
					},
					contentAnalysis: {
						textMessages: 0,
						imgInteractions: 0,
						groupInteractions: 0,
						productInquiries: 0,
						chartData: []
					}
				}
			}
		},
		mounted() {
			this.isLoadingOverview = true;
			this.isLoadingComprehensive = true;
			Promise.all([
				this.fetchOverviewData(),
				this.fetchCustomerAnalysis()
			]);
		},
		methods: {
			async fetchOverviewData() {
				try {
					const res = await request({
						url: '/v1/store/statistics/overview',
						method: 'GET',
						data: {
							time_type: this.timeType
						}
					});
					
					if (res.code === 200 && res.data) {
						this.overviewData = {
							accountValue: res.data.account_value?.avg_rfm || this.overviewData.accountValue,
							newCustomers: res.data.new_customers?.value || this.overviewData.newCustomers,
							newCustomersChange: res.data.new_customers?.growth || this.overviewData.newCustomersChange,
							interactions: res.data.interaction_count?.value || this.overviewData.interactions,
							interactionsChange: res.data.interaction_count?.growth || this.overviewData.interactionsChange,
							conversionRate: res.data.conversion_rate?.value || this.overviewData.conversionRate,
							conversionRateChange: res.data.conversion_rate?.growth || this.overviewData.conversionRateChange
						};
					} else {
						uni.showToast({
							title: res.msg || '获取数据失败',
							icon: 'none'
						});
					}
				} catch (error) {
					console.error('获取概览数据失败:', error);
					uni.showToast({
						title: '网络异常，请稍后重试',
						icon: 'none'
					});
				} finally {
					this.isLoadingOverview = false;
				}
			},
			async fetchCustomerAnalysis() {
				try {
					const res = await request({
						url: '/v1/store/statistics/comprehensive-analysis',
						method: 'GET',
						data: {
							time_type: this.timeType
						}
					});
		
					if (res.code === 200 && res.data) {
						// 处理高价值客户百分比字符串（如"0.0%"转为0.0）
						let highValueCustomers = 0;
						if (res.data.value_indicators?.high_value_customers) {
							const highValueStr = res.data.value_indicators.high_value_customers;
							highValueCustomers = parseFloat(highValueStr.replace('%', '')) || 0;
						}
						
						// 更新综合分析数据，直接存储数组数据
						this.comprehensiveData = {
							...this.comprehensiveData,
							avgConversionAmount: res.data.avg_conversion_amount ?? this.comprehensiveData.avgConversionAmount,
							totalSales: res.data.value_indicators?.total_sales ?? this.comprehensiveData.totalSales,
							avgOrderAmount: res.data.value_indicators?.avg_order_amount ?? this.comprehensiveData.avgOrderAmount,
							highValueCustomers: highValueCustomers ?? this.comprehensiveData.highValueCustomers,
							weeklyRevenueGrowth: res.data.growth_trend?.weekly_revenue_growth ?? this.comprehensiveData.weeklyRevenueGrowth,
							newCustomerConversion: res.data.growth_trend?.new_customer_conversion ?? this.comprehensiveData.newCustomerConversion,
							activeCustomerGrowth: res.data.growth_trend?.active_customer_growth ?? this.comprehensiveData.activeCustomerGrowth,
							customerActivity: res.data.frequency_analysis || [],
							conversionSource: res.data.source_distribution || []
						};
				
					} else {
						uni.showToast({
							title: res.msg || '获取客户分析数据失败',
							icon: 'none'
						});
					}
				} catch (error) {
					console.error('获取客户分析数据失败:', error);
					uni.showToast({
						title: '网络异常，请稍后重试',
						icon: 'none'
					});
				} finally {
					this.isLoadingComprehensive = false;
				}
			},
			async fetchInteractionAnalysis() {
				try {
					const res = await request({
						url: '/v1/store/statistics/interaction-analysis',
						method: 'GET',
						data: {
							time_type: this.timeType
						}
					});
					
					if (res.code === 200 && res.data) {
						// 更新频率分析数据
						this.interactionAnalysis.frequencyAnalysis = {
							highFrequency: res.data.frequency_analysis.high_frequency || 0,
							midFrequency: res.data.frequency_analysis.mid_frequency || 0,
							lowFrequency: res.data.frequency_analysis.low_frequency || 0,
							chartData: res.data.frequency_analysis.chart_data || []
						};
						
						// 更新内容分析数据
						this.interactionAnalysis.contentAnalysis = {
							textMessages: res.data.content_analysis.text_messages || 0,
							imgInteractions: res.data.content_analysis.img_interactions || 0,
							groupInteractions: res.data.content_analysis.group_interactions || 0,
							productInquiries: res.data.content_analysis.product_inquiries || 0,
							chartData: res.data.content_analysis.chart_data || []
						};
					} else {
						uni.showToast({
							title: res.msg || '获取互动分析数据失败',
							icon: 'none'
						});
					}
				} catch (error) {
					console.error('获取互动分析数据失败:', error);
					uni.showToast({
						title: '网络异常，请稍后重试',
						icon: 'none'
					});
				} finally {
					this.isLoadingComprehensive = false;
				}
			},
			async changeSubsection(index) {
				this.currentSubsection = index;
				
				// 根据不同的分段加载不同的数据
				this.isLoadingComprehensive = true;
				try {
					if (index === 0) {
						await this.fetchCustomerAnalysis();
					} else if (index === 1) {
						await this.fetchInteractionAnalysis();
					}
				} finally {
					this.isLoadingComprehensive = false;
				}
			},
			closePage() {
				this.$emit('close');
			},
			// 根据客户活跃度名称返回对应的dot颜色class
			getActivityDotClass(name) {
				if (!name) return 'gray';
				// 优先精确匹配
				if (name === '高频') return 'red';
				if (name === '中频') return 'orange';
				if (name === '低频') return 'gray';
				// 模糊匹配
				if (name.includes('高频')) return 'red';
				if (name.includes('中频')) return 'orange';
				if (name.includes('低频')) return 'gray';
				return 'gray'; // 默认灰色
			},
			// 根据转化客户来源名称返回对应的图标class
			getSourceIconClass(name) {
				if (!name) return 'icon-yonghu';
				// 优先精确匹配
				if (name === '朋友推荐') return 'icon-yonghu';
				if (name === '微信搜索') return 'icon-sousuo';
				if (name === '微信群') return 'icon-yonghuqun';
				// 模糊匹配
				if (name.includes('推荐')) return 'icon-yonghu';
				if (name.includes('搜索')) return 'icon-sousuo';
				if (name.includes('群')) return 'icon-yonghuqun';
				return 'icon-yonghu'; // 默认图标
			},
			showDateSelector() {
				this.showDatePopup = true;
			},
			async selectDateRange(range) {
				const option = this.dateOptions.find(opt => opt.label === range);
				if (option) {
					this.timeType = option.value;
					this.dateRange = range;
					this.showDatePopup = false;
					
					// 重新获取数据
					this.isLoadingOverview = true;
					this.isLoadingComprehensive = true;
					try {
						await this.fetchOverviewData();
						
						// 根据当前选中的分段重新加载对应数据
						if (this.currentSubsection === 0) {
							await this.fetchCustomerAnalysis();
						} else if (this.currentSubsection === 1) {
							await this.fetchInteractionAnalysis();
						}
					} finally {
						// 加载状态在各自的 fetch 方法中控制
					}
				}
			},
			showCustomDatePicker() {
				this.showCustomDatePopup = true;
			},
			openStartDatePicker() {
				if (!this.tempStartDate) {
					this.tempStartDate = parseInt(new Date().getTime());
				}
				this.showStartDatePicker = true;
			},
			openEndDatePicker() {
				if (!this.tempEndDate) {
					this.tempEndDate = parseInt(new Date().getTime());
				}
				this.showEndDatePicker = true;
			},
			confirmStartDate(value) {
				console.log('确认开始日期', value);
				
				if (!value) {
					uni.showToast({
						title: '请选择有效日期',
						icon: 'none'
					});
					return;
				}
				
				try {
					let timestamp;
					if (typeof value === 'object' && value.value !== undefined) {
						timestamp = parseInt(value.value);
					} else {
						timestamp = parseInt(value);
					}
					
					const date = new Date(timestamp);
					
					if (isNaN(date.getTime())) {
						throw new Error('无效日期');
					}
					
					this.startDate = this.formatDate(date);
					this.tempStartDate = timestamp;
					this.showStartDatePicker = false;
					
					if (this.endDate && new Date(this.endDate) < date) {
						this.endDate = '';
						this.tempEndDate = timestamp;
					}
				} catch (error) {
					console.error('处理开始日期错误:', error, value);
					uni.showToast({
						title: '日期选择出错，请重试',
						icon: 'none'
					});
				}
			},
			confirmEndDate(value) {
				console.log('确认结束日期', value);
				
				if (!value) {
					uni.showToast({
						title: '请选择有效日期',
						icon: 'none'
					});
					return;
				}
				
				try {
					let timestamp;
					if (typeof value === 'object' && value.value !== undefined) {
						timestamp = parseInt(value.value);
					} else {
						timestamp = parseInt(value);
					}
					
					const date = new Date(timestamp);
					
					if (isNaN(date.getTime())) {
						throw new Error('无效日期');
					}
					
					this.endDate = this.formatDate(date);
					this.tempEndDate = timestamp;
					this.showEndDatePicker = false;
				} catch (error) {
					console.error('处理结束日期错误:', error, value);
					uni.showToast({
						title: '日期选择出错，请重试',
						icon: 'none'
					});
				}
			},
			confirmCustomDateRange() {
				if (!this.startDate || !this.endDate) {
					uni.showToast({
						title: '请选择开始和结束日期',
						icon: 'none'
					});
					return;
				}
				
				if (new Date(this.endDate) < new Date(this.startDate)) {
					uni.showToast({
						title: '结束日期必须大于等于开始日期',
						icon: 'none'
					});
					return;
				}
				
				this.dateRange = '自定义';
				this.showCustomDatePopup = false;
				
				uni.showToast({
					title: `已设置日期范围`,
					icon: 'none'
				});
			},
			formatDate(date) {
				if (!(date instanceof Date) || isNaN(date.getTime())) {
					console.error('formatDate 收到无效的日期对象:', date);
					return '请选择';
				}
				
				try {
					const year = date.getFullYear();
					const month = String(date.getMonth() + 1).padStart(2, '0');
					const day = String(date.getDate()).padStart(2, '0');
					return `${year}-${month}-${day}`;
				} catch (error) {
					console.error('日期格式化错误:', error);
					return '请选择';
				}
			},
			exportReport() {
				uni.showLoading({
					title: '正在导出...'
				});
				
				setTimeout(() => {
					uni.hideLoading();
					uni.showToast({
						title: '报表已导出',
						icon: 'success'
					});
				}, 1500);
			},
			// 获取来源颜色
			getSourceColor(index) {
				const colors = ['#2979ff', '#19be6b', '#9c26b0', '#ff9900'];
				return colors[index % colors.length];
			}
		}
	}
</script>

<style lang="scss">
	.data-statistics-container {
		position: fixed;
		top: 0;
		right: 0;
		width: 100%;
		height: 100%;
		background-color: #f5f7fa;
		z-index: 10000;
		overflow-y: auto;
		transform-origin: right;
		animation: slideInFromRight 0.3s ease;
	}
	
	@keyframes slideInFromRight {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}
	
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 15px;
		background-color: #fff;
		border-bottom: 1px solid #eee;
		position: sticky;
		top: 0;
		z-index: 1;
	}
	
	.back-icon {
		width: 60px;
		font-size: 15px;
		color: #333;
	}
	
	.title {
		font-size: 17px;
		font-weight: 500;
		flex: 1;
		text-align: center;
	}
	
	.close-icon {
		width: 60px;
		text-align: right;
		display: flex;
		justify-content: flex-end;
		padding-right: 10px;
	}
	
	/* 上方区域：数据概览 */
	.top-section {
		background-color: #fff;
		padding-bottom: 15px;
		margin-bottom: 15px;
		border-bottom: 8px solid #f5f7fa;
	}
	
	/* 下方区域：综合分析 */
	.bottom-section {
		background-color: #f5f7fa;
		padding-top: 0;
		padding-bottom: 20px;
	}
	
	.overview-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 15px 15px 5px;
	}
	
	.overview-title {
		font-size: 16px;
		font-weight: 600;
		color: #333;
	}
	
	.overview-actions {
		display: flex;
		align-items: center;
	}
	
	.time-selector {
		margin-right: 10px;
	}
	
	.selector-content {
		height: 32px;
		display: flex;
		align-items: center;
		background-color: #fff;
		border-radius: 16px;
		padding: 0 12px;
		font-size: 14px;
		color: #333;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}
	
	.selector-content text {
		margin-right: 4px;
	}
	
	.custom-date-btn {
		height: 32px;
		display: flex;
		align-items: center;
		background-color: #fff;
		border-radius: 16px;
		padding: 0 12px;
		font-size: 14px;
		color: #333;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}
	
	.overview-grid {
		display: flex;
		flex-wrap: wrap;
		padding: 10px;
		margin: 0 5px;
	}
	
	.overview-item {
		width: 50%;
		padding: 5px;
		box-sizing: border-box;
	}
	
	.overview-item-content {
		background-color: #fff;
		border-radius: 8px;
		padding: 15px;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
	}
	
	.item-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
	}
	
	.item-label {
		font-size: 14px;
		color: #333;
	}
	
	.item-icon {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	
	.item-value {
		font-size: 22px;
		font-weight: 600;
		color: #333;
		margin-bottom: 5px;
	}
	
	.item-change {
		font-size: 12px;
	}
	
	.item-desc {
		font-size: 12px;
		color: #999;
		margin-top: 4px;
	}
	
	.up {
		color: #18b566;
	}
	
	.down {
		color: #fa3534;
	}
	
	.blue {
		background-color: #ecf5ff;
	}
	
	.green {
		background-color: #e5fff2;
	}
	
	.orange {
		background-color: #fff7ec;
	}
	
	.red {
		background-color: #ffecec;
	}
	
	/* 日期选择弹窗样式 */
	.date-selector-popup {
		background-color: #fff;
		padding-bottom: 10px;
	}
	
	.date-selector-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 15px;
		border-bottom: 1px solid #eee;
	}
	
	.date-close-btn {
		padding: 5px;
	}
	
	.date-selector-list {
		padding: 5px 0;
	}
	
	.date-option {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 15px;
		border-bottom: 1px solid #f5f5f5;
	}
	
	.date-option:last-child {
		border-bottom: none;
	}
	
	.date-option-text {
		font-size: 15px;
		color: #333;
	}
	
	.date-option-check {
		color: #0080ff;
	}
	
	.section-card {
		margin: 15px;
		padding: 15px;
		background-color: #fff;
		border-radius: 10px;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
	}
	
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 15px;
	}
	
	.section-title {
		font-size: 16px;
		font-weight: 500;
		color: #333;
	}
	
	.section-action {
		display: flex;
		align-items: center;
		font-size: 14px;
		color: #999;
	}
	
	.chart-container {
		height: 200px;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: #f9f9f9;
		border-radius: 8px;
	}
	
	.chart-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		color: #999;
	}
	
	.chart-desc {
		font-size: 12px;
		margin-top: 5px;
	}
	
	.data-list {
		margin-top: 10px;
	}
	
	.data-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 15px 0;
		border-bottom: 1px solid #f5f5f5;
	}
	
	.data-item:last-child {
		border-bottom: none;
	}
	
	.data-item-left {
		display: flex;
		align-items: center;
	}
	
	.data-icon {
		width: 40px;
		height: 40px;
		border-radius: 8px;
		display: flex;
		justify-content: center;
		align-items: center;
		margin-right: 10px;
	}
	
	.data-info {
		display: flex;
		flex-direction: column;
	}
	
	.data-name {
		font-size: 14px;
		color: #333;
		margin-bottom: 5px;
	}
	
	.data-value {
		font-size: 16px;
		font-weight: 500;
		color: #333;
	}
	
	.change {
		font-size: 12px;
		margin-left: 5px;
	}
	
	.sales-container {
		margin-top: 10px;
	}
	
	.sales-progress {
		margin-bottom: 20px;
	}
	
	.progress-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 10px;
		font-size: 14px;
	}
	
	.progress-bar {
		height: 10px;
		background-color: #f0f0f0;
		border-radius: 5px;
		margin-bottom: 10px;
		overflow: hidden;
	}
	
	.progress-inner {
		height: 100%;
		background-color: #0080ff;
		border-radius: 5px;
	}
	
	.progress-footer {
		display: flex;
		justify-content: space-between;
		font-size: 12px;
		color: #999;
	}
	
	.sales-ranking {
		padding-top: 10px;
	}
	
	.ranking-title {
		font-size: 14px;
		font-weight: 500;
		margin-bottom: 10px;
	}
	
	.ranking-list {
		display: flex;
		flex-direction: column;
	}
	
	.ranking-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 0;
		border-bottom: 1px solid #f5f5f5;
	}
	
	.ranking-item:last-child {
		border-bottom: none;
	}
	
	.ranking-info {
		display: flex;
		align-items: center;
	}
	
	.ranking-num {
		width: 20px;
		height: 20px;
		background-color: #f0f0f0;
		border-radius: 50%;
		text-align: center;
		line-height: 20px;
		font-size: 12px;
		margin-right: 10px;
	}
	
	.ranking-name {
		font-size: 14px;
	}
	
	.ranking-value {
		font-size: 14px;
		font-weight: 500;
	}
	
	.export-section {
		padding: 15px 30px 30px;
	}
	
	.data-statistics-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
	}
	
	/* 自定义日期选择弹窗样式 */
	.custom-date-popup {
		background-color: #fff;
		padding-bottom: 20px;
	}
	
	.custom-date-content {
		padding: 15px;
	}
	
	.date-range-item {
		margin-bottom: 20px;
	}
	
	.date-range-label {
		display: block;
		font-size: 15px;
		color: #333;
		margin-bottom: 8px;
	}
	
	.date-picker-trigger {
		height: 44px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 12px;
		background-color: #f5f7fa;
		border-radius: 4px;
		border: 1px solid #eee;
	}
	
	.date-action-btns {
		display: flex;
		justify-content: space-between;
		margin-top: 30px;
	}
	
	.date-action-btns .u-button {
		flex: 1;
		margin: 0 10px;
	}
	
	/* 分段器样式 */
	.subsection-container {
		padding: 15px 15px 10px;
		background-color: #fff;
	}
	
	/* 分析内容区域样式 */
	.analysis-content {
		padding: 10px;
	}
	
	.analysis-grid {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
	}
	
	.analysis-card {
		width: 48.5%;
		margin-bottom: 10px;
		background-color: #fff;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
		overflow: hidden;
	}
	
	.card-header {
		padding: 15px;
		border-bottom: 1px solid #f5f5f5;
	}
	
	.card-title {
		font-size: 16px;
		font-weight: 500;
		color: #333;
		display: block;
	}
	
	.card-subtitle {
		font-size: 12px;
		color: #999;
		margin-top: 4px;
		display: block;
	}
	
	.card-content {
		padding: 15px;
	}
	
	.chart-placeholder {
		height: 150px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		background-color: #f9f9f9;
		border-radius: 8px;
		margin-bottom: 15px;
	}
	
	.chart-text {
		font-size: 14px;
		color: #999;
		margin-top: 10px;
	}
	
	/* 客户统计样式 */
	.customer-stats {
		padding: 5px 0;
	}
	
	.customer-item {
		display: flex;
		align-items: center;
		margin-bottom: 10px;
	}
	
	.customer-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		margin-right: 8px;
	}
	
	.customer-label {
		font-size: 14px;
		color: #666;
		flex: 1;
	}
	
	.customer-value {
		font-size: 14px;
		font-weight: 500;
		color: #333;
	}
	
	/* 来源分布样式 */
	.source-distribution {
		padding: 5px 0;
	}
	
	.source-item {
		display: flex;
		align-items: center;
		margin-bottom: 10px;
	}
	
	.source-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		margin-right: 8px;
	}
	
	.source-name {
		font-size: 14px;
		color: #666;
		flex: 1;
	}
	
	.source-value {
		font-size: 14px;
		color: #333;
		font-weight: 500;
	}
	
	/* 空数据样式 */
	.empty-data {
		height: 320px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		background-color: #fff;
		border-radius: 8px;
		margin-bottom: 15px;
	}
	
	.empty-text {
		font-size: 14px;
		color: #909399;
		margin-top: 10px;
	}
	
	/* 互动频率分析样式 */
	.interaction-stats {
		padding: 5px 0;
	}
	
	.interaction-row {
		display: flex;
		justify-content: space-between;
		margin-bottom: 10px;
	}
	
	.interaction-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 1;
	}
	
	.interaction-label {
		font-size: 14px;
		color: #333;
		margin-bottom: 5px;
	}
	
	.interaction-value {
		font-size: 18px;
		font-weight: 500;
		color: #333;
	}
	
	.interaction-label-small {
		font-size: 12px;
		color: #999;
	}
	
	/* 互动内容分析样式 */
	.content-distribution {
		padding: 5px 0;
	}
	
	.content-item {
		display: flex;
		align-items: center;
		margin-bottom: 12px;
	}
	
	.content-icon {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		display: flex;
		justify-content: center;
		align-items: center;
		margin-right: 8px;
	}
	
	.content-name {
		font-size: 14px;
		color: #666;
		flex: 1;
	}
	
	.content-value {
		font-size: 14px;
		font-weight: 500;
		color: #333;
	}
	
	.blue {
		background-color: #ecf5ff;
	}
	
	.green {
		background-color: #e5fff2;
	}
	
	.purple {
		background-color: #f5e8ff;
	}
	
	.orange {
		background-color: #fff7ec;
	}
	
	/* 转化漏斗样式 */
	.funnel-stats {
		padding: 5px 0;
	}
	
	.funnel-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}
	
	.funnel-label {
		font-size: 14px;
		color: #333;
		width: 40px;
	}
	
	.funnel-value {
		font-size: 14px;
		font-weight: 500;
		color: #333;
		flex: 1;
		padding-left: 10px;
	}
	
	.funnel-percent {
		font-size: 14px;
		color: #666;
		width: 50px;
		text-align: right;
	}
	
	/* 转化效率样式 */
	.efficiency-stats {
		padding: 5px 0;
	}
	
	.efficiency-item {
		margin-bottom: 15px;
	}
	
	.efficiency-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 5px;
	}
	
	.efficiency-label {
		font-size: 14px;
		color: #333;
	}
	
	.efficiency-value {
		font-size: 16px;
		font-weight: 500;
		color: #333;
	}
	
	.efficiency-percent {
		display: flex;
		justify-content: flex-end;
	}
	
	.percent-change {
		font-size: 12px;
	}
	
	/* 收入趋势样式 */
	.income-stats {
		padding: 5px 0;
	}
	
	.income-stat-item {
		display: flex;
		flex-direction: column;
	}
	
	.income-label {
		font-size: 14px;
		color: #333;
		margin-bottom: 4px;
	}
	
	.income-main-value {
		font-size: 20px;
		font-weight: bold;
		color: #333;
		margin-bottom: 2px;
	}
	
	.income-change {
		font-size: 12px;
	}
	
	.income-change.up {
		color: #18b566;
	}
	
	/* 产品销售分布样式 */
	.product-distribution {
		padding: 5px 0;
	}
	
	.product-item {
		display: flex;
		align-items: center;
	}
	
	.product-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		margin-right: 8px;
	}
	
	.product-name {
		font-size: 14px;
		color: #333;
		flex: 1;
	}
	
	.product-percent {
		font-size: 14px;
		color: #333;
		margin-left: 5px;
	}
	
	.product-value {
		font-size: 14px;
		color: #666;
		padding-left: 16px;
		margin-top: 4px;
		margin-bottom: 8px;
	}
	
	/* 综合分析区域样式 - 整体卡片 */
	.comprehensive-analysis-card {
		background-color: #fff;
		border-radius: 10px;
		padding: 15px;
		margin: 15px;
		margin-top: 10px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}
	
	.analysis-title {
		font-size: 16px;
		font-weight: 600;
		color: #333;
		margin-bottom: 15px;
	}
	
	/* 客户平均转化金额卡片 */
	.avg-conversion-card {
		background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
		border-radius: 8px;
		padding: 15px 20px;
		margin-bottom: 15px;
		display: flex;
		flex-direction: column;
	}
	
	.avg-conversion-label {
		font-size: 14px;
		color: #333;
		margin-bottom: 8px;
	}
	
	.avg-conversion-value {
		font-size: 28px;
		font-weight: bold;
		color: #2e7d32;
	}
	
	/* 指标网格 */
	.metrics-grid {
		display: flex;
		justify-content: space-between;
		gap: 20px;
	}
	
	/* 底部部分增加上边距 */
	.metrics-grid.bottom-section {
		margin-top: 30px;
		padding-top: 25px;
		border-top: 1px solid #f0f0f0;
	}
	
	.metrics-column {
		flex: 1;
		background-color: transparent;
		border-radius: 0;
		padding: 0;
		box-shadow: none;
	}
	
	.metrics-column:first-child {
		padding-right: 20px;
	}
	
	.metrics-column:last-child {
		padding-left: 20px;
	}
	
	.metrics-header {
		display: flex;
		align-items: center;
		margin-bottom: 16px;
	}
	
	.metrics-title {
		font-size: 14px;
		font-weight: 500;
		color: #333;
	}
	
	.metrics-item {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		margin-bottom: 20px;
	}
	
	.metrics-item:last-child {
		margin-bottom: 0;
	}
	
	.metrics-label {
		font-size: 14px;
		color: #666;
		margin-bottom: 6px;
	}
	
	.metrics-value {
		font-size: 22px;
		font-weight: bold;
		color: #333;
		line-height: 1.3;
	}
	
	.metrics-value.up {
		color: #18b566;
	}
	
	/* 客户活跃度样式 */
	.activity-item {
		display: flex;
		align-items: center;
		margin-bottom: 14px;
		padding: 2px 0;
	}
	
	.activity-item:last-child {
		margin-bottom: 0;
	}
	
	.activity-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		margin-right: 8px;
	}
	
	.activity-dot.red {
		background-color: #fa3534;
	}
	
	.activity-dot.orange {
		background-color: #ff9900;
	}
	
	.activity-dot.gray {
		background-color: #c0c4cc;
	}
	
	.activity-label {
		font-size: 14px;
		color: #666;
		flex: 1;
	}
	
	.activity-value {
		font-size: 14px;
		font-weight: 500;
		color: #333;
	}
	
	/* 转化客户来源样式 */
	.source-item-new {
		display: flex;
		align-items: center;
		margin-bottom: 14px;
		padding: 2px 0;
	}
	
	.source-item-new:last-child {
		margin-bottom: 0;
	}
	
	.source-label {
		font-size: 14px;
		color: #666;
		flex: 1;
	}
	
	.source-value {
		font-size: 14px;
		font-weight: 500;
		color: #333;
	}
	
	/* 区域遮罩层样式 */
	.section-loading-mask {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(255, 255, 255, 0.9);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 100;
		border-radius: 8px;
	}
	
	.section-loading-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	
	.section-spinner {
		width: 40px;
		height: 40px;
		border: 4px solid rgba(0, 128, 255, 0.2);
		border-top-color: #0080ff;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin-bottom: 12px;
	}
	
	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
	
	.section-loading-text {
		font-size: 14px;
		color: #666;
	}
</style> 