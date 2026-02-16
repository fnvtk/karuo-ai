<template>
	<view v-if="show" class="customer-management-container">
			<!-- 头部 -->
			<view class="header">
				<view class="back-icon" @tap="closePage">
					<u-icon name="arrow-left" color="#333" size="26"></u-icon>
				</view>
				<view class="title">客户管理</view>
				<view class="close-icon">
					<u-icon name="plus" color="#2979ff" size="24" @click="showAddCustomer"></u-icon>
				</view>
			</view>
			
			<!-- 搜索和筛选区域 -->
			<view class="search-filter-area">
				<view class="search-box">
					<u-search 
						placeholder="搜索客户姓名、电话或邮箱..." 
						v-model="searchKeyword" 
						:showAction="false" 
						:clearabled="true"
						shape="round"
						:animation="false"
						height="70rpx"
					></u-search>
				</view>
				<view class="filter-action">
					<u-button v-if="false" icon="filter" type="default" shape="square" size="normal" @click="showFilterPopup">筛选</u-button>
					<u-button v-else type="primary" shape="circle" @click="applyFilter">搜索</u-button>
				</view>
			</view>
			
			<!-- 客户分类标签 -->
			<view class="customer-tabs">
				<u-subsection 
					:list="tabsList" 
					:current="currentTab"
					@change="changeTab"
					mode="button"
					:animation="true"
					activeColor="#2979ff"
					inactiveColor="#333"
					bgColor="#f5f5f5"
				></u-subsection>
			</view>
			
			<!-- 客户列表 -->
			<scroll-view class="customer-list" scroll-y @scrolltolower="loadMore" refresher-enabled :refresher-triggered="refreshing" @refresherpulling="onRefresh">
				<!-- 客户卡片 -->
				<view class="customer-card" v-for="(item, index) in customerList" :key="index" @tap="viewCustomerDetail(item)">
					<view class="card-header">
						<view class="card-left">
							<view class="select-box">
								<u-checkbox v-model="item.selected" @change="checkboxChange" shape="circle"></u-checkbox>
							</view>
							<view class="avatar-box">
								<image :src="item.avatar || '/static/images/default-avatar.png'" class="avatar-image"></image>
							</view>
							<view class="customer-info">
								<view class="customer-name-row">
									<text class="customer-name">{{item.name}}</text>
									<text v-if="getCustomerLevel(item)" :class="['customer-level-'+getCustomerLevel(item)]" class="level-tag">{{getLevelText(getCustomerLevel(item))}}</text>
								</view>
								<view class="customer-contact">
									<text class="contact-method">{{item.contactType}} /</text>
									<text class="contact-value"> {{item.contactValue}}</text>
								</view>
							</view>
						</view>
					</view>
					<view class="card-content">
						<view class="contact-info">
							<text class="phone-number">{{item.phone}}</text>
							<text class="contact-date">通过时间: {{item.createTime}}</text>
						</view>
						<view class="tag-list">
							<text class="tag-title">标签：</text>
							<text class="customer-tag" v-for="(tag, tagIndex) in item.tags" :key="tagIndex">{{tag}}</text>
						</view>
						<view class="remark" v-if="item.remark">
							<text class="remark-title">备注:</text>
							<text class="remark-content">{{item.remark}}</text>
						</view>
					</view>
					<view class="card-footer">
						<view class="value-tag" v-if="item.value">{{item.value}}</view>
						<view class="action-icons">
							<!-- <view class="action-icon" @tap.stop="showMessageModal(item)">
								<u-icon name="chat" size="22" color="#999"></u-icon>
							</view>
							<view class="action-icon">
								<u-icon name="eye" size="22" color="#999"></u-icon>
							</view>
							<view class="action-icon">
								<u-icon name="more-dot-fill" size="22" color="#999"></u-icon>
							</view> -->
						</view>
					</view>
				</view>
				
				<!-- 加载更多 -->
				<view class="load-more" v-if="customerList.length > 0">
					<u-loadmore :status="loadStatus" icon-type="flower" />
				</view>
				
				<!-- 无数据展示 -->
				<view class="empty-box" v-if="customerList.length === 0">
					<u-empty text="暂无客户数据" mode="data"></u-empty>
				</view>
			</scroll-view>
			
			<!-- 筛选弹出层 -->
			<u-popup :show="showFilter" mode="right" @close="closeFilter" width="70%">
				<view class="filter-container">
					<view class="filter-header">
						<text class="filter-title">筛选条件</text>
						<u-icon name="close" size="20" @click="closeFilter"></u-icon>
					</view>
					<view class="filter-content">
						<view class="filter-section">
							<view class="section-title">客户标签</view>
							<view class="tags-container">
								<view 
									class="tag-item" 
									v-for="(tag, index) in filterTags" 
									:key="index"
									:class="{'tag-selected': selectedTags.includes(tag)}"
									@tap="toggleTagSelect(tag)"
								>
									{{tag}}
								</view>
							</view>
						</view>
						
						<view class="filter-section">
							<view class="section-title">状态</view>
							<view class="status-container">
								<u-radio-group v-model="filterStatus">
									<u-radio 
										v-for="(status, index) in statusOptions" 
										:key="index" 
										:name="status"
										:label="status"
										labelSize="28rpx"
									></u-radio>
								</u-radio-group>
							</view>
						</view>
						
						<view class="filter-section">
							<view class="section-title">添加时间</view>
							<view class="date-container">
								<view class="date-input" @tap="showDatePicker('start')">
									<text>{{filterStartDate || '开始日期'}}</text>
									<u-icon name="calendar" size="16"></u-icon>
								</view>
								<text class="date-separator">至</text>
								<view class="date-input" @tap="showDatePicker('end')">
									<text>{{filterEndDate || '结束日期'}}</text>
									<u-icon name="calendar" size="16"></u-icon>
								</view>
							</view>
						</view>
					</view>
					
					<view class="filter-footer">
						<u-button @click="resetFilter">重置</u-button>
						<u-button type="primary" @click="applyFilter">确定</u-button>
					</view>
				</view>
			</u-popup>
			
			<!-- 日期选择器 -->
			<u-datetime-picker
				:show="showDatePickerFlag"
				v-model="tempDate"
				mode="date"
				:min-date="1577808000000"
				:max-date="new Date().getTime()"
				@confirm="confirmDate"
				@cancel="showDatePickerFlag = false"
			></u-datetime-picker>
			
			<!-- 消息弹框 -->
			<u-popup :show="showMessage" mode="center" @close="closeMessageModal" width="100%" :custom-style="{width: '100%'}" borderRadius="0">
				<view class="message-modal" style="width: 100%;">
					<view class="message-modal-header">
						<text class="message-modal-title">发送消息</text>
						<u-icon name="close" size="20" @click="closeMessageModal"></u-icon>
					</view>
					<view class="message-modal-content">
						<view class="message-receiver">
							<text class="receiver-label">收件人：</text>
							<text class="receiver-name">{{currentCustomer && currentCustomer.name}}</text>
						</view>
						<view class="message-input-area">
							<u-textarea v-model="messageContent" placeholder="请输入消息内容..." height="150"></u-textarea>
						</view>
					</view>
					<view class="message-modal-footer">
						<u-button type="default" @click="closeMessageModal">取消</u-button>
						<u-button type="primary" @click="sendMessage">发送</u-button>
					</view>
				</view>
			</u-popup>
			
			<!-- 客户详情弹框 -->
			<u-popup :show="showCustomerDetail" mode="center" @close="closeCustomerDetail" width="100%" :custom-style="{width: '100%'}" borderRadius="0">
				<view class="customer-detail-modal">
					<view class="detail-modal-header">
						<text class="detail-modal-title">客户详细信息</text>
						<u-icon name="close" size="20" @click="closeCustomerDetail"></u-icon>
					</view>
					
					<view class="customer-profile">
						<view class="avatar-area">
							<image :src="currentCustomer && currentCustomer.avatar || '/static/images/default-avatar.png'" class="detail-avatar"></image>
						</view>
						<view class="profile-info">
							<view class="profile-name">{{currentCustomer && currentCustomer.name}}</view>
							<view class="profile-tags">
								<text class="profile-tag active-tag">活跃</text>
								<text class="profile-tag high-value-tag">高价值</text>
							</view>
						</view>
						<view class="total-value">
							<text class="value-label">来自</text>
							<text class="value-amount">{{currentCustomer && currentCustomer.contactValue && currentCustomer.contactValue.replace('¥', '')}}</text>
						</view>
					</view>
					
					<scroll-view scroll-y class="detail-content">
						<view class="detail-section">
							<view class="section-title">基本信息</view>
							<view class="info-grid">
								<!-- <view class="info-item">
									<text class="info-label">手机号码</text>
									<text class="info-value">{{currentCustomer && currentCustomer.phone}}</text>
								</view>
								<view class="info-item">
									<text class="info-label">电子邮箱</text>
									<text class="info-value">{{currentCustomer && currentCustomer.email || 'zhangsan@example.com'}}</text>
								</view> -->
								<view class="info-item" v-if="currentCustomer && currentCustomer.alias">
									<text class="info-label">微信号</text>
									<text class="info-value">{{currentCustomer && currentCustomer.alias}}</text>
								</view>
								<view class="info-item">
									<text class="info-label">微信ID</text>
									<text class="info-value">{{currentCustomer && currentCustomer.wechatId}}</text>
								</view>
								<view class="info-item">
									<text class="info-label">客户来源</text>
									<text class="info-value">{{currentCustomer && currentCustomer.source || '微信'}}</text>
								</view>
								<view class="info-item">
									<text class="info-label">加入时间</text>
									<text class="info-value">{{currentCustomer && currentCustomer.createTime}}</text>
								</view>
							</view>
						</view>
						
						<view class="detail-section">
							<view class="section-title">跟进信息</view>
							<view class="info-grid">

								
								<view class="info-item">
									<text class="info-label">备注</text>
									<text class="info-value">{{currentCustomer && currentCustomer.conRemark}}</text>
								</view>

								<!-- <view class="info-item">
									<text class="info-label">上次联系</text>
									<text class="info-value">{{currentCustomer && currentCustomer.lastContact}}</text>
								</view>
								<view class="info-item">
									<text class="info-label">下次跟进</text>
									<text class="info-value">{{currentCustomer && currentCustomer.nextContact || '2023-06-10'}}</text>
								</view> -->
							</view>
						</view>
						
						<view class="detail-section">
							<view class="section-title">标签</view>
							<view class="tags-list">
								<text class="tag-item" v-for="(tag, index) in currentCustomer && currentCustomer.tags" :key="index">{{tag}}</text>
							</view>
						</view>
					</scroll-view>
					
					<!-- <view class="detail-footer">
						<view class="footer-button" @tap="makePhoneCall">
							<u-icon name="phone" size="18" color="#2979ff"></u-icon>
							<text class="button-text">电话联系</text>
						</view>
						<view class="footer-button" @tap="showMessageModal(currentCustomer)">
							<u-icon name="chat" size="18" color="#2979ff"></u-icon>
							<text class="button-text">发送消息</text>
						</view>
						<view class="footer-button" @tap="editCustomerInfo">
							<u-icon name="edit-pen" size="18" color="#2979ff"></u-icon>
							<text class="button-text">编辑信息</text>
						</view>
						<view class="footer-button add-follow-btn" @tap="addFollowUp">
							<text class="button-text">添加跟进</text>
						</view>
					</view> -->
				</view>
			</u-popup>
			
			<!-- 新增客户弹框 -->
			<u-popup :show="showAddCustomerModal" mode="center" @close="showAddCustomerModal = false" width="90%" :custom-style="{width: '90%'}" borderRadius="8">
				<view class="add-customer-modal">
					<view class="modal-header">
						<text class="modal-title">新增客户</text>
						<u-icon name="close" size="20" @click="showAddCustomerModal = false"></u-icon>
					</view>
					
					<view class="modal-content">
						<view class="form-item">
							<text class="form-label">姓名</text>
							<u-input v-model="newCustomer.name" placeholder="请输入客户姓名" border="bottom"></u-input>
						</view>
						
						<view class="form-item">
							<text class="form-label">手机号码</text>
							<u-input v-model="newCustomer.phone" placeholder="请输入手机号码" border="bottom" type="number"></u-input>
						</view>
						
						<view class="form-item">
							<text class="form-label">电子邮箱</text>
							<u-input v-model="newCustomer.email" placeholder="请输入电子邮箱" border="bottom" type="email"></u-input>
						</view>
						
						<view class="form-item">
							<text class="form-label">客户来源</text>
							<u-input v-model="newCustomer.source" placeholder="请选择客户来源" border="bottom" disabled></u-input>
						</view>
						
						<view class="form-item">
							<text class="form-label">标签</text>
							<view class="tags-select">
								<view 
									class="tag-item" 
									v-for="(tag, index) in filterTags" 
									:key="index"
									:class="{'tag-selected': newCustomer.tags.includes(tag)}"
									@tap="toggleNewCustomerTag(tag)"
								>
									{{tag}}
								</view>
							</view>
						</view>
					</view>
					
					<view class="modal-footer">
						<u-button type="default" @click="showAddCustomerModal = false">取消</u-button>
						<u-button type="primary" @click="addCustomer">确定</u-button>
					</view>
				</view>
			</u-popup>
		</view>

</template>

<script>
	import { request } from '../api/config';
	
	export default {
		name: 'CustomerManagement',
		props: {
			show: {
				type: Boolean,
				default: false
			}
		},
		data() {
			return {
				searchKeyword: '',
				currentTab: 0,
				tabsList: [
					{name: '全部'},
					{name: '待跟进'},
					{name: '已购买'},
					{name: '已流失'}
				],
				customerList: [],
				loadStatus: 'loadmore', // loadmore, loading, nomore
				selectAll: false,
				
				// 分页相关
				pageSize: 10,
				page: 1,
				total: 0,
				
				// 筛选相关
				showFilter: false,
				filterTags: ['潜在客户', '高潜力', 'VIP客户', '新客户', '活跃客户', '沉睡客户'],
				selectedTags: [],
				statusOptions: ['全部', '活跃', '跟进中', '未跟进', 'VIP'],
				filterStatus: '全部',
				filterStartDate: '',
				filterEndDate: '',
				
				// 日期选择器
				showDatePickerFlag: false,
				tempDate: new Date().getTime(),
				currentDateType: 'start', // start 或 end
				
				// 消息相关
				showMessage: false,
				currentCustomer: null,
				messageContent: '',
				
				// 客户详情相关
				showCustomerDetail: false,
				refreshing: false,
				
				// 新增客户相关
				showAddCustomerModal: false,
				newCustomer: {
					name: '',
					phone: '',
					email: '',
					source: '微信',
					tags: []
				}
			}
		},
		watch: {
			show(newVal) {
				if (newVal) {
					this.loadCustomerList();
				}
			}
		},
		methods: {
			closePage() {
				this.$emit('close');
			},
			// 加载客户列表
			async loadCustomerList() {
				if (this.loadStatus === 'loading') return;
				
				this.loadStatus = 'loading';
				
				try {
					const res = await request({
						url: '/v1/store/customers/list',
						method: 'GET',
						data: {
							page: this.page,
							pageSize: this.pageSize,
							keyword: this.searchKeyword,
							status: this.currentTab === 0 ? '' : this.tabsList[this.currentTab].name,
							startDate: this.filterStartDate,
							endDate: this.filterEndDate,
							tags: this.selectedTags.join(',')
						}
					});
					
					if (res.code === 200) {
						const customers = res.data.list || [];
						this.total = res.data.total || 0;
						
						// 如果是加载更多，则追加数据
						if (this.page > 1) {
							this.customerList = [...this.customerList, ...this.formatCustomerData(customers)];
						} else {
							this.customerList = this.formatCustomerData(customers);
						}
						
						// 设置加载状态
						this.loadStatus = this.customerList.length >= this.total ? 'nomore' : 'loadmore';
					} else {
						uni.showToast({
							title: res.msg || '获取客户列表失败',
							icon: 'none'
						});
						this.loadStatus = 'loadmore';
					}
				} catch (err) {
					console.error('获取客户列表失败:', err);
					uni.showToast({
						title: '获取客户列表失败，请稍后重试',
						icon: 'none'
					});
					this.loadStatus = 'loadmore';
				}
				
				// 停止下拉刷新
				if (this.refreshing) {
					this.refreshing = false;
				}
			},
			
			// 格式化客户数据
			formatCustomerData(customers) {
				return customers.map(item => {
					// 处理标签
					let tags = [];
					if (Array.isArray(item.labels)) {
						tags = item.labels;
					} else {
						console.log('labels字段不是数组:', item.labels);
					}
					
					
					
					return {
						id: item.id,
						name: item.nickname || item.alias || '未命名',
						avatar: item.avatar || '',
						contactType: '微信',
						contactValue: item.region ? `${item.region}` : '',
						tags: tags.length > 0 ? tags : ['新客户'],
						status: item.isPassed === 1 ? '活跃' : '未跟进',
						phone: item.phone || '',
						selected: false,
						remark: item.conRemark || item.signature || '',
						passTime: item.passTime || '',
						value: '',
						wechatId: item.wechatId || '',
						email: '',
						source: '微信',
						joinDate: this.formatDate(item.createTime),
						isDeleted: item.isDeleted || false,
						gender: item.gender || '',
						alias: item.alias || '',
						wechatId: item.wechatId || '',
						createTime: item.createTime || '',
						conRemark: item.conRemark || ''
					};
				});
			},
			
			// 格式化日期
			formatDate(dateStr) {
				if (!dateStr || dateStr === 'null' || dateStr === '0001-01-01 00:00:00') return '';
				try {
					// 简单处理日期格式，只保留年月日
					return dateStr.split(' ')[0];
				} catch (e) {
					return '';
				}
			},
			
			changeTab(index) {
				this.currentTab = index;
				// 重置页码并重新加载数据
				this.page = 1;
				this.loadCustomerList();
				// 显示轻微震动反馈（在支持的设备上）
				if(uni.vibrateShort) {
					uni.vibrateShort();
				}
			},
			// 获取客户价值等级
			getCustomerLevel(customer) {
				if (!customer) return '';
				
				// 这里可以根据业务规则判断客户等级
				if (customer.contactValue) {
					const value = parseFloat(customer.contactValue.replace('¥', '').replace(',', ''));
					if (value >= 15000) return 'high';
					if (value >= 8000) return 'medium';
					if (value > 0) return 'normal';
				}
				
				// 根据标签判断
				if (customer.tags) {
					if (customer.tags.includes('VIP客户') || customer.tags.includes('VIP')) return 'high';
					if (customer.tags.includes('高潜力')) return 'medium';
				}
				
				return '';
			},
			// 获取等级文字描述
			getLevelText(level) {
				const levelTextMap = {
					'high': 'VIP',
					'medium': '潜力',
					'normal': '普通'
				};
				return levelTextMap[level] || '';
			},
			
			// 下拉刷新
			onRefresh() {
				this.refreshing = true;
				this.page = 1;
				this.loadCustomerList();
			},
			
			// 加载更多
			loadMore() {
				if(this.loadStatus !== 'loadmore') return;
				
				this.page++;
				this.loadCustomerList();
			},
			
			checkboxChange(e) {
				// 更新全选状态
				this.updateSelectAllStatus();
			},
			updateSelectAllStatus() {
				// 检查是否所有项目都被选中
				this.selectAll = this.customerList.every(item => item.selected);
			},
			selectAllChange(e) {
				// 全选或取消全选所有客户
				const status = e;
				this.customerList.forEach(item => {
					item.selected = status;
				});
			},
			viewCustomerDetail(customer) {
				this.currentCustomer = customer;
				this.showCustomerDetail = true;
			},
			chatWithCustomer(customer) {
				// 与客户聊天功能已移除
			},
			showFilterPopup() {
				this.showFilter = true;
			},
			closeFilter() {
				this.showFilter = false;
			},
			toggleTagSelect(tag) {
				// 切换标签选中状态
				const index = this.selectedTags.indexOf(tag);
				if (index > -1) {
					// 取消选中
					this.selectedTags.splice(index, 1);
				} else {
					// 选中
					this.selectedTags.push(tag);
				}
			},
			resetFilter() {
				// 重置筛选条件
				this.selectedTags = [];
				this.filterStatus = '全部';
				this.filterStartDate = '';
				this.filterEndDate = '';
			},
			applyFilter() {
				// 应用筛选条件
				this.page = 1;
				this.loadCustomerList();
				
				// 关闭筛选弹窗
				this.closeFilter();
				
				// 显示操作成功提示
				uni.showToast({
					title: '筛选条件已应用',
					icon: 'none'
				});
			},
			showDatePicker(type) {
				this.currentDateType = type;
				this.showDatePickerFlag = true;
			},
			confirmDate(e) {
				// 格式化日期
				const date = new Date(e);
				const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
				
				// 根据当前选择类型设置日期
				if (this.currentDateType === 'start') {
					this.filterStartDate = formattedDate;
				} else {
					this.filterEndDate = formattedDate;
				}
				
				// 关闭日期选择器
				this.showDatePickerFlag = false;
			},
			showMessageModal(customer) {
				this.currentCustomer = customer;
				this.messageContent = '';
				this.showMessage = true;
			},
			closeMessageModal() {
				this.showMessage = false;
				this.messageContent = '';
			},
			sendMessage() {
				// 实现发送消息的逻辑
				if(!this.messageContent.trim()) {
					uni.showToast({
						title: '消息内容不能为空',
						icon: 'none'
					});
					return;
				}
				
				// 显示发送中提示
				uni.showLoading({
					title: '发送中...'
				});
				
				// 模拟发送过程
				setTimeout(() => {
					uni.hideLoading();
					uni.showToast({
						title: '发送成功',
						icon: 'success'
					});
					this.closeMessageModal();
				}, 500);
			},
			closeCustomerDetail() {
				this.showCustomerDetail = false;
			},
			makePhoneCall() {
				// 实际拨打电话
				if(this.currentCustomer && this.currentCustomer.phone) {
					uni.makePhoneCall({
						phoneNumber: this.currentCustomer.phone,
						success: () => {
							console.log('拨打电话成功');
						},
						fail: (err) => {
							console.error('拨打电话失败', err);
							uni.showToast({
								title: '拨打电话失败',
								icon: 'none'
							});
						}
					});
				} else {
					uni.showToast({
						title: '电话号码不存在',
						icon: 'none'
					});
				}
			},
			editCustomerInfo() {
				// 编辑当前客户信息
				uni.showToast({
					title: '功能开发中',
					icon: 'none'
				});
			},
			addFollowUp() {
				// 实现添加跟进信息的逻辑
			},
			showAddCustomer() {
				// 重置新客户数据
				this.newCustomer = {
					name: '',
					phone: '',
					email: '',
					source: '微信',
					tags: []
				};
				this.showAddCustomerModal = true;
			},
			addCustomer() {
				// 验证表单
				if(!this.newCustomer.name) {
					uni.showToast({
						title: '请输入客户姓名',
						icon: 'none'
					});
					return;
				}
				
				// 模拟添加客户
				uni.showLoading({
					title: '添加中...'
				});
				
				setTimeout(() => {
					// 生成一个临时ID
					const newId = this.customerList.length + 1;
					
					// 创建新客户对象
					const customer = {
						id: newId,
						name: this.newCustomer.name,
						avatar: '',
						contactType: '微信',
						contactValue: '¥0',
						tags: this.newCustomer.tags.length > 0 ? this.newCustomer.tags : ['新客户'],
						status: '未跟进',
						lastContact: new Date().toISOString().split('T')[0],
						phone: this.newCustomer.phone,
						email: this.newCustomer.email,
						selected: false,
						remark: '',
						value: ''
					};
					
					// 添加到列表前端
					this.customerList.unshift(customer);
					
					uni.hideLoading();
					uni.showToast({
						title: '添加成功',
						icon: 'success'
					});
					
					this.showAddCustomerModal = false;
				}, 500);
			},
			toggleNewCustomerTag(tag) {
				// 切换新客户标签选中状态
				const index = this.newCustomer.tags.indexOf(tag);
				if (index > -1) {
					// 取消选中
					this.newCustomer.tags.splice(index, 1);
				} else {
					// 选中
					this.newCustomer.tags.push(tag);
				}
			}
		}
	}
</script>

<style lang="scss">
	.customer-management-container {
		position: fixed;
		top: 0;
		right: 0;
		width: 100%;
		height: 100%;
		background-color: #f7f8fa; /* 更柔和的背景色 */
		z-index: 10000;
		overflow-y: auto;
		transform-origin: right;
		animation: slideInFromRight 0.3s ease;
		font-size: 28rpx; /* 基础字体大小使用rpx，保证在不同屏幕上的一致性 */
		padding-bottom: constant(safe-area-inset-bottom); /* iOS 11.0 */
		padding-bottom: env(safe-area-inset-bottom); /* iOS 11.2+ */
		padding-top: constant(safe-area-inset-top); /* iOS 11.0 */
		padding-top: env(safe-area-inset-top); /* iOS 11.2+ */
		font-family: "PingFang SC", "Helvetica Neue", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif; /* 添加适合中文显示的字体系列 */
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
		padding: 6px 7px;
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
	
	.search-filter-area {
		padding: 15px;
		background-color: #fff;
		display: flex;
		align-items: center;
		border-bottom: 1px solid #f0f0f0; /* 添加边框增加区域分隔感 */
	}
	
	.search-box {
		flex: 1;
		margin-right: 10px;
	}
	
	.filter-action {
		margin-left: 10px;
	}
	
	.filter-action .u-button {
		padding: 0 15px;
		height: 70rpx;
		display: flex;
		align-items: center;
	}
	
	.customer-tabs {
		padding: 15px;
		background-color: #fff;
		border-bottom: 1px solid #f0f0f0;
	}
	
	.customer-tabs :deep(.u-subsection) {
		width: 100%;
	}
	
	.customer-tabs :deep(.u-subsection__item--button) {
		padding: 10px 0;
		font-size: 15px;
	}
	
	.customer-tabs :deep(.u-subsection__item--button--active) {
		font-weight: 500;
	}
	
	.customer-list {
		padding: 0 15px;
		height: calc(100vh - 180px); /* 减去头部、搜索和标签的高度 */
		padding-bottom: constant(safe-area-inset-bottom); /* iOS 11.0 */
		padding-bottom: env(safe-area-inset-bottom); /* iOS 11.2+ */
		box-sizing: border-box;
	}
	
	.customer-card {
		background-color: #fff;
		border-radius: 12px; /* 更大的圆角，符合现代中国审美 */
		margin-bottom: 15px;
		padding: 15px;
		display: flex;
		flex-direction: column;
		box-shadow: 0 2px 12px rgba(100, 101, 102, 0.08); /* 更柔和的阴影效果 */
		position: relative;
		transition: all 0.2s ease-out;
		border: none; /* 去掉边框，使用阴影区分 */
	}
	
	.customer-card:active {
		transform: scale(0.98);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}
	
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
		border-bottom: 1px solid #f5f5f5; /* 更淡的分隔线 */
		padding-bottom: 10px;
	}
	
	.card-left {
		display: flex;
		align-items: center;
		flex: 1;
	}
	
	.select-box {
		margin-right: 10px;
	}
	
	.avatar-box {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		overflow: hidden;
		margin-right: 10px;
		background-color: #f5f7fa; /* 更改背景色 */
		border: 1px solid #f0f0f0; /* 添加边框 */
	}
	
	.avatar-image {
		width: 100%;
		height: 100%;
	}
	
	.customer-info {
		flex: 1;
	}
	
	.customer-name-row {
		display: flex;
		align-items: center;
		margin-bottom: 5px;
	}
	
	.customer-name {
		font-size: 16px;
		font-weight: 500;
		color: #323233; /* 更深的文字颜色 */
		margin-right: 6px;
	}
	
	.level-tag {
		font-size: 12px;
		padding: 1px 5px;
		border-radius: 4px;
		margin-left: 5px;
		font-weight: 500;
	}
	
	.customer-level-high {
		color: #f5222d; /* 中国红 */
		background-color: #fff1f0;
		border: 1px solid #ffccc7;
	}
	
	.customer-level-medium {
		color: #fa8c16; /* 橙色 */
		background-color: #fff7e6;
		border: 1px solid #ffe7ba;
	}
	
	.customer-level-normal {
		color: #52c41a; /* 翠绿 */
		background-color: #f6ffed;
		border: 1px solid #b7eb8f;
	}
	
	.customer-contact {
		font-size: 14px;
	}
	
	.contact-method {
		color: #999;
	}
	
	.contact-value {
		color: #fa541c; /* 朱砂红，象征积极、向上 */
		font-weight: 500;
	}
	
	.card-content {
		margin-bottom: 15px;
	}
	
	.contact-info {
		display: flex;
		align-items: center;
		margin-bottom: 10px;
		justify-content: space-between;
	}
	
	.phone-number {
		font-size: 14px;
		color: #333;
		margin-right: 15px;
	}
	
	.contact-date {
		font-size: 13px;
		color: #999;
	}
	
	.tag-list {
		display: flex;
		flex-wrap: wrap;
		margin-bottom: 10px;
	}
	
	.tag-title {
		font-size: 14px;
		font-weight: 500;
		color: #333;
		margin-right: 10px;
	}
	
	.customer-tag {
		font-size: 12px;
		color: #1890ff; /* 蚂蚁蓝色系，符合中国互联网审美 */
		background-color: #e6f7ff;
		padding: 2px 8px;
		border-radius: 10px; /* 圆角更大 */
		margin-right: 10px;
		margin-bottom: 5px;
	}
	
	.remark {
		font-size: 13px;
		color: #666;
		line-height: 1.5;
	}
	
	.remark-title {
		color: #999;
		margin-right: 5px;
	}
	
	.remark-content {
		color: #666;
	}
	
	.card-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.value-tag {
		padding: 2px 8px;
		background-color: #fff1f0; /* 淡红色背景 */
		color: #f5222d; /* 红色文字 */
		border-radius: 10px;
		font-size: 12px;
	}
	
	.action-icons {
		display: flex;
		align-items: center;
		margin-left: auto;
	}
	
	.action-icon {
		margin-left: 15px;
		position: relative;
	}
	
	.action-icon:active::after {
		content: '';
		position: absolute;
		top: -8px;
		left: -8px;
		right: -8px;
		bottom: -8px;
		background-color: rgba(0, 0, 0, 0.05);
		border-radius: 50%;
	}
	
	.load-more {
		padding: 20px 0;
	}
	
	.empty-box {
		padding: 40px 0;
	}
	
	/* 筛选弹出层样式 */
	.filter-container {
		height: 100%;
		display: flex;
		flex-direction: column;
		background-color: #f7f8fa; /* 更柔和的背景色 */
	}
	
	.filter-header {
		padding: 15px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid #eee;
	}
	
	.filter-title {
		font-size: 16px;
		font-weight: 500;
	}
	
	.filter-content {
		flex: 1;
		padding: 15px;
		overflow-y: auto;
	}
	
	.filter-section {
		margin-bottom: 20px;
	}
	
	.section-title {
		font-size: 15px;
		font-weight: 500;
		margin-bottom: 10px;
		color: #333;
	}
	
	.tags-container {
		display: flex;
		flex-wrap: wrap;
	}
	
	.tag-item {
		padding: 6px 12px;
		background-color: #f5f5f5;
		border-radius: 15px; /* 更圆润的标签 */
		margin-right: 10px;
		margin-bottom: 10px;
		font-size: 14px;
		border: 1px solid #eeeeee; /* 添加边框 */
	}
	
	.tag-selected {
		background-color: #e6f7ff; /* 蚂蚁蓝系背景 */
		color: #1890ff; /* 蚂蚁蓝色系 */
		border-color: #91d5ff; /* 边框颜色调整 */
	}
	
	.status-container {
		padding: 5px 0;
	}
	
	.date-container {
		display: flex;
		align-items: center;
	}
	
	.date-input {
		flex: 1;
		height: 40px;
		border: 1px solid #eee;
		border-radius: 4px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 10px;
		background-color: #f5f5f5;
	}
	
	.date-separator {
		margin: 0 10px;
		color: #999;
	}
	
	.filter-footer {
		padding: 15px;
		display: flex;
		justify-content: space-between;
		border-top: 1px solid #eee;
	}
	
	.filter-footer .u-button {
		flex: 1;
		margin: 0 5px;
	}
	
	/* 消息弹框样式 */
	.message-modal {
		padding: 16px; /* 增加内边距 */
		width: 100%;
		box-sizing: border-box;
		background-color: #fff;
		border-radius: 16px 16px 0 0; /* 顶部圆角更大 */
	}
	
	.message-modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
	}
	
	.message-modal-title {
		font-size: 16px;
		font-weight: 500;
	}
	
	.message-receiver {
		margin-bottom: 10px;
	}
	
	.receiver-label {
		font-size: 14px;
		font-weight: 500;
		color: #333;
	}
	
	.receiver-name {
		font-size: 14px;
		color: #2979ff;
	}
	
	.message-input-area {
		margin-bottom: 10px;
	}
	
	.message-modal-footer {
		display: flex;
		justify-content: space-between;
	}
	
	.message-modal-footer .u-button, .modal-footer .u-button {
		flex: 1;
		margin: 0 5px;
		border-radius: 8px; /* 调整按钮圆角 */
		height: 44px; /* 增加按钮高度，更易点击 */
	}
	
	/* 客户详情弹框样式 */
	.customer-detail-modal {
		padding: 16px;
		width: 100%;
		box-sizing: border-box;
		background-color: #f7f8fa; /* 更改为浅灰色背景 */
		border-radius: 16px 16px 0 0; /* 顶部圆角更大 */
	}
	
	.detail-modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 15px;
		padding-bottom: 10px;
		border-bottom: 1px solid #eee;
	}
	
	.detail-modal-title {
		font-size: 16px;
		font-weight: 500;
	}
	
	.customer-profile {
		display: flex;
		align-items: center;
		margin-bottom: 20px;
		padding-bottom: 15px;
		border-bottom: 1px solid #eee;
	}
	
	.avatar-area {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		overflow: hidden;
		margin-right: 10px;
		background-color: #f0f0f0;
	}
	
	.detail-avatar {
		width: 100%;
		height: 100%;
	}
	
	.profile-info {
		flex: 1;
	}
	
	.profile-name {
		font-size: 16px;
		font-weight: 500;
		color: #333;
		margin-bottom: 5px;
	}
	
	.profile-tags {
		display: flex;
		flex-wrap: wrap;
	}
	
	.profile-tag {
		font-size: 12px;
		color: #2979ff;
		background-color: #ecf5ff;
		padding: 2px 6px;
		border-radius: 4px;
		margin-right: 10px;
		margin-bottom: 5px;
	}
	
	.active-tag {
		background-color: #e6f7ff; /* 蚂蚁蓝系背景 */
		color: #1890ff; /* 蚂蚁蓝色系 */
	}
	
	.high-value-tag {
		background-color: #fff1f0; /* 淡红色背景 */
		color: #f5222d; /* 中国红色调 */
	}
	
	.total-value {
		display: flex;
		align-items: center;
		margin-top: 5px;
	}
	
	.value-label {
		font-size: 14px;
		font-weight: 500;
		color: #333;
		margin-right: 5px;
	}
	
	.value-amount {
		font-size: 14px;
		color: #fa541c; /* 朱砂红，符合中国传统色彩 */
		font-weight: bold;
	}
	
	.detail-content {
		flex: 1;
		overflow-y: auto;
		height: 280px;
		margin-bottom: 15px;
		padding: 0 5px;
		-webkit-overflow-scrolling: touch;
	}
	
	.detail-section {
		margin-bottom: 20px;
	}
	
	.info-grid {
		display: flex;
		flex-wrap: wrap;
		background-color: #fff;
		padding: 15px; /* 增加内边距 */
		border-radius: 12px; /* 更大的圆角 */
		box-shadow: 0 1px 6px rgba(0, 0, 0, 0.03); /* 添加微弱阴影 */
	}
	
	.info-item {
		width: 50%;
		margin-bottom: 10px;
		display: flex;
		flex-direction: column;
	}
	
	.info-label {
		font-size: 14px;
		color: #999;
		margin-bottom: 5px;
	}
	
	.info-value {
		font-size: 14px;
		color: #333;
	}
	
	.detail-footer {
		display: flex;
		padding-top: 10px;
		border-top: 1px solid #eee;
		justify-content: space-between;
	}
	
	.footer-button {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6px 2px;
		border: 1px solid #e0e0e0;
		border-radius: 8px; /* 更大的圆角 */
		margin: 0 2px;
		flex: 1;
		height: 36px; /* 增加高度 */
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04); /* 微弱阴影 */
	}
	
	.button-text {
		font-size: 12px;
		color: #333;
		margin-left: 3px;
	}
	
	.add-follow-btn {
		background-color: #1890ff; /* 蚂蚁蓝，常用于中国互联网产品 */
		color: #fff;
		border: none;
	}
	
	.tags-list {
		display: flex;
		flex-wrap: wrap;
		background-color: #fff;
		padding: 15px; /* 增加内边距 */
		border-radius: 12px; /* 更大圆角 */
		box-shadow: 0 1px 6px rgba(0, 0, 0, 0.03); /* 微弱阴影 */
	}
	
	.tag-item {
		font-size: 12px;
		color: #1890ff; /* 蚂蚁蓝 */
		background-color: #e6f7ff; /* 蚂蚁蓝淡背景 */
		padding: 4px 10px;
		border-radius: 20px;
		margin-right: 10px;
		margin-bottom: 5px;
		border: 1px solid #91d5ff; /* 添加边框 */
	}
	
	@media screen and (max-width: 480px) {
		.info-grid {
			flex-direction: column;
		}
		
		.info-item {
			width: 100%;
		}
		
		.customer-card {
			padding: 10px;
		}
		
		.avatar-area {
			width: 60px;
			height: 60px;
		}
		
		.detail-content {
			height: 220px;
		}
	}
	
	@media screen and (min-width: 768px) {
		.customer-management-container {
			font-size: 32rpx; /* 平板上增大基础字号 */
		}
		
		.customer-list {
			display: flex;
			flex-wrap: wrap;
			justify-content: space-between;
		}
		
		.customer-card {
			
		}
		
		.customer-detail-modal, .message-modal {
			// max-width: 500px;
			margin: 0 auto;
		}
		
		.button-text {
			font-size: 14px;
		}
		
		.section-title {
			font-size: 18px;
		}
		
		.form-label {
			font-size: 16px;
		}
		
		/* 优化标签和筛选区域 */
		.customer-tabs {
			padding: 15px 15px 20px;
		}
		
		.customer-tabs :deep(.u-subsection__item--button) {
			flex: 1;
			text-align: center;
			height: 50px;
			font-size: 16px;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		
		.filter-action .u-button {
			height: 80rpx;
			padding: 0 20px;
			font-size: 16px;
		}
		
		.filter-action .u-button :deep(.u-icon) {
			margin-right: 5px;
			transform: scale(1.2);
		}
		
		/* 优化弹窗样式 */
		.message-modal, .customer-detail-modal, .add-customer-modal {
			padding: 20px;
		}
		
		.message-input-area {
			margin-bottom: 20px;
		}
		
		.message-input-area :deep(textarea) {
			height: 180px !important;
			font-size: 16px;
		}
		
		.message-modal-footer .u-button, .modal-footer .u-button {
			height: 50px;
			font-size: 16px;
		}
		
		.tag-item {
			padding: 8px 15px;
			font-size: 14px;
			margin-right: 15px;
			margin-bottom: 15px;
		}
		
		.detail-footer {
			padding-top: 15px;
		}
		
		/* 筛选弹出层优化 */
		.filter-container {
			max-width: 500px;
			margin-left: auto;
		}
		
		.filter-title {
			font-size: 20px;
		}
		
		.filter-content {
			padding: 20px;
		}
		
		.date-input {
			height: 50px;
			font-size: 16px;
		}
		
		/* 表单控件优化 */
		.u-input {
			height: 50px;
		}
		
		.u-input :deep(input) {
			font-size: 16px;
			height: 50px;
		}
		
		.u-checkbox :deep(.u-checkbox__icon-wrap) {
			width: 24px;
			height: 24px;
		}
		
		.u-search {
			height: 80rpx;
		}
		
		.u-search :deep(input) {
			font-size: 16px;
		}
		
		.u-radio :deep(.u-radio__icon-wrap) {
			width: 24px;
			height: 24px;
		}
		
		.u-radio :deep(.u-radio__label) {
			font-size: 16px;
		}
		
		/* 调整按钮间距 */
		.footer-button {
			margin: 0 5px;
		}
		
		/* 调整弹窗大小 */
		.u-popup :deep(.u-popup__content) {
			border-radius: 10px;
		}
		
		/* 调整加载更多区域 */
		.load-more {
			padding: 30px 0;
		}
		
		.u-loadmore :deep(.u-loadmore__content__text) {
			font-size: 16px;
		}
	}
	
	/* 大屏幕适配 */
	@media screen and (min-width: 1024px) {
		.customer-card {
			width: calc(33.33% - 20px);
		}
		
		.customer-detail-modal, .message-modal {
			max-width: 700px;
		}
		
		.detail-content {
			height: 400px;
		}
	}

	/* 添加按钮文字样式 */
	.add-follow-btn .button-text {
		color: #fff;
		font-size: 12px;
	}
	
	/* 中国特色节日色彩样式，可在特定节日应用 */
	.chinese-festival-theme {
		--primary-color: #f5222d; /* 中国红 */
		--secondary-color: #faad14; /* 中国金 */
		--success-color: #a0d911; /* 清新绿 */
		--light-bg: #fff1f0; /* 淡红背景 */
	}
	
	/* 新增支付成功动效 */
	@keyframes successPulse {
		0% {
			box-shadow: 0 0 0 0 rgba(250, 84, 28, 0.4);
		}
		70% {
			box-shadow: 0 0 0 10px rgba(250, 84, 28, 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(250, 84, 28, 0);
		}
	}
	
	.payment-success {
		animation: successPulse 1.5s 1;
	}

	/* 新增上拉加载更多过渡动画 */
	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translate3d(0, 30px, 0);
		}
		to {
			opacity: 1;
			transform: translate3d(0, 0, 0);
		}
	}
	
	.fade-in-up {
		animation: fadeInUp 0.4s ease-out;
	}
	
	/* 新增点击波纹效果 */
	.ripple {
		position: relative;
		overflow: hidden;
	}
	
	.ripple:after {
		content: "";
		display: block;
		position: absolute;
		width: 100%;
		height: 100%;
		top: 0;
		left: 0;
		pointer-events: none;
		background-image: radial-gradient(circle, #000 10%, transparent 10.01%);
		background-repeat: no-repeat;
		background-position: 50%;
		transform: scale(10, 10);
		opacity: 0;
		transition: transform .3s, opacity .5s;
	}
	
	.ripple:active:after {
		transform: scale(0, 0);
		opacity: .1;
		transition: 0s;
	}

	/* 新增客户弹框样式 */
	.add-customer-modal {
		padding: 16px; /* 增加内边距 */
		background-color: #fff;
		border-radius: 16px; /* 更大的圆角 */
		box-shadow: 0 2px 12px rgba(100, 101, 102, 0.08); /* 更柔和的阴影效果 */
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 15px;
		padding-bottom: 10px;
		border-bottom: 1px solid #f5f5f5; /* 更淡的分隔线 */
	}

	.modal-title {
		font-size: 16px;
		font-weight: 500;
		color: #323233; /* 符合中国用户审美的深色 */
	}

	.form-item {
		margin-bottom: 15px;
	}

	.form-label {
		font-size: 14px;
		color: #606266; /* 调整颜色为中性灰 */
		margin-bottom: 5px;
		display: block;
	}

	.tags-select {
		display: flex;
		flex-wrap: wrap;
		margin-top: 5px;
	}

	.modal-footer {
		display: flex;
		justify-content: space-between;
		margin-top: 20px;
		padding-top: 15px;
		border-top: 1px solid #f5f5f5; /* 更淡的分隔线 */
	}

	.modal-footer .u-button {
		margin: 0 5px;
		flex: 1;
		border-radius: 8px; /* 更圆的按钮 */
		height: 44px; /* 更高的按钮 */
	}

	/* 暗黑模式支持 */
	@media (prefers-color-scheme: dark) {
		.customer-management-container {
			background-color: #1a1a1a;
		}
		
		.header, .search-filter-area, .customer-tabs, .customer-card, .detail-modal-header, .info-grid, .tags-list {
			background-color: #222;
		}
		
		.title, .customer-name, .info-value, .detail-modal-title, .profile-name, .section-title {
			color: #fff;
		}
		
		.info-label, .contact-date, .contact-method {
			color: #999;
		}
		
		.card-header, .detail-footer, .customer-profile, .detail-modal-header {
			border-color: #333;
		}
		
		.add-customer-modal, .message-modal {
			background-color: #222;
		}
		
		.u-search {
			background-color: #333;
		}
	}

	/* 平板横屏适配 */
	@media screen and (min-width: 768px) and (orientation: landscape) {
		.customer-list {
			height: calc(100vh - 150px);
		}
		
	.customer-card {
		width: calc(33.33% - 20px);
	}
	
	.detail-content {
		height: 250px;
	}
	
	.customer-detail-modal, .message-modal {
		max-width: 600px;
	}
	}
	
	/* 触摸反馈样式 */
	.tag-item:active {
		opacity: 0.7;
	}
	
	.tag-selected:active {
		opacity: 0.8;
	}
	
	.footer-button:active {
		opacity: 0.8;
	}
	
	/* 增强过渡动画效果 */
	.customer-card, .footer-button, .tag-item, .filter-action .u-button,
	.message-modal-footer .u-button, .modal-footer .u-button {
		transition: all 0.2s ease-out;
	}
	
	/* 针对平板的触摸优化 */
	@media (pointer: coarse) {
		.footer-button, .action-icon, .tag-item, .u-button {
			cursor: pointer;
			-webkit-tap-highlight-color: transparent;
		}
		
		.back-icon, .close-icon {
			min-width: 44px;
			min-height: 44px;
			display: flex;
			align-items: center;
			justify-content: center;
		}
	}

	/* 价值等级样式优化，使用中国传统色彩 */
	.customer-level-high {
		color: #f5222d; /* 中国红 */
	}

	.customer-level-medium {
		color: #fa8c16; /* 橙色 */
	}

	.customer-level-normal {
		color: #52c41a; /* 翠绿 */
	}
</style> 
 