<template>
	<view>
		<!-- 更新弹窗 - 放在组件外层，确保即使侧边栏关闭也能显示 -->
		<!-- #ifdef APP-PLUS -->
		<view v-if="showUpdateDialog" class="update-dialog-mask" @tap="closeUpdateDialog">
			<view class="update-dialog" @tap.stop>
				<!-- 火箭图标 -->
				<view class="update-rocket">
					<text class="iconfont" style="font-size: 80px; color: #5096ff;">🚀</text>
				</view>
				
				<!-- 版本信息 -->
				<view class="update-version-info">
					<text class="update-version-text">发现新版本 {{ updateInfo.version }}</text>
				</view>
				
				<!-- 更新内容列表 -->
				<view class="update-content-list">
					<view 
						class="update-content-item" 
						v-for="(item, index) in updateInfo.updateContent" 
						:key="index"
					>
						<text class="update-item-number">{{ index + 1 }}.</text>
						<text class="update-item-text">{{ item }}</text>
					</view>
				</view>
				
				<!-- 下载进度条 -->
				<view v-if="downloading" class="download-progress-wrapper">
					<view class="download-progress-bar">
						<view class="download-progress-fill" :style="{ width: downloadProgress + '%' }"></view>
					</view>
					<text class="download-progress-text">{{ downloadProgress }}%</text>
				</view>
				
				<!-- 升级按钮 -->
				<view class="update-button-wrapper">
					<view 
						class="update-button" 
						:class="{ 'update-button-disabled': downloading }"
						@tap="startDownload"
					>
						<text class="update-button-text">{{ downloading ? '下载中...' : '即刻升级' }}</text>
					</view>
				</view>
				
				<!-- 关闭按钮 -->
				<view v-if="!updateInfo.forceUpdate && !downloading" class="update-close-btn" @tap="closeUpdateDialog">
					<text class="update-close-icon">✕</text>
				</view>
			</view>
		</view>
		<!-- #endif -->
		
		<view v-if="show" class="side-menu-container">
			<view class="side-menu-mask" @tap="closeSideMenu" @touchstart="closeSettingsDropdown"></view>
			<view class="side-menu">
			<view class="side-menu-header">
				<text class="side-menu-title">AI数智员工</text>
				<!-- #ifdef APP-PLUS -->
				<view class="header-right">
					<view class="settings-btn" @tap="toggleSettingsDropdown">
						<view class="settings-btn-content">
							<u-icon name="setting" color="#333" size="24"></u-icon>
							<text v-if="!checkingUpdate && hasNewVersion" class="version-badge">新</text>
						</view>
					</view>
					<!-- 设置下拉菜单 -->
					<view v-if="showSettingsDropdown" class="settings-dropdown">
						<view class="dropdown-item combined-item" @tap="handleCheckUpdate(false)">
							<view class="icon-container">
								<u-icon name="reload" color="#5096ff" size="24"></u-icon>
							</view>
							<view class="text-container">
								<view class="text-top">
									<text class="main-text">检查更新</text>
									<text v-if="!checkingUpdate && hasNewVersion" class="update-badge">新</text>
								</view>
								<view class="text-bottom">
									<text class="version-info">当前版本 {{ currentVersion }}</text>
								</view>
							</view>
						</view>
					</view>
				</view>
				<!-- #endif -->
			</view>
			
		
			
			<!-- 功能模块 -->
			<view class="function-module">
				<view class="function-grid">
					<!-- 第一行 -->
					<view class="function-row">
						<view class="function-item pink" :class="{'function-item-disabled': !functionStatus['autoLike']}" @tap="handleFunctionClick('autoLike')">
							<text class="iconfont icon-dianzan function-icon" style="color: #ff6699; font-size: 26px;"></text>
							<text class="function-name">自动点赞</text>
							<text class="function-status" :style="functionStatus['autoLike'] ? 'color: #ff6699; font-size: 12px;' : 'color: #999; font-size: 12px;'">
								{{ functionStatus['autoLike'] ? '已启用' : '已禁用' }}
							</text>
						</view>
						<view class="function-item purple" :class="{'function-item-disabled': !functionStatus['momentsSync']}" @tap="handleFunctionClick('momentsSync')">
							<text class="iconfont icon-tupian function-icon" style="color: #9966ff; font-size: 26px;"></text>
							<text class="function-name">朋友圈同步</text>
							<text class="function-status" :style="functionStatus['momentsSync'] ? 'color: #9966ff; font-size: 12px;' : 'color: #999; font-size: 12px;'">
								{{ functionStatus['momentsSync'] ? '已启用' : '已禁用' }}
							</text>
						</view>
						<view class="function-item green" :class="{'function-item-disabled': !functionStatus['autoCustomerDev']}" @tap="handleFunctionClick('autoCustomerDev')">
							<text class="iconfont icon-yonghu function-icon" style="color: #33cc99; font-size: 26px;"></text>
							<text class="function-name">自动开发客户</text>
							<text class="function-status" :style="functionStatus['autoCustomerDev'] ? 'color: #33cc99; font-size: 12px;' : 'color: #999; font-size: 12px;'">
								{{ functionStatus['autoCustomerDev'] ? '已启用' : '已禁用' }}
							</text>
						</view>
					</view>
					<!-- 第二行 -->
					<view class="function-row">
						<view class="function-item orange" :class="{'function-item-disabled': !functionStatus['groupMessageDeliver']}" @tap="handleFunctionClick('groupMessageDeliver')">
							<text class="iconfont icon-xiaoxi function-icon" style="color: #ff9966; font-size: 26px;"></text>
							<text class="function-name">群消息推送</text>
							<text class="function-status" :style="functionStatus['groupMessageDeliver'] ? 'color: #ff9966; font-size: 12px;' : 'color: #999; font-size: 12px;'">
								{{ functionStatus['groupMessageDeliver'] ? '已启用' : '已禁用' }}
							</text>
						</view>
						<view class="function-item blue" :class="{'function-item-disabled': !functionStatus['autoGroup']}" @tap="handleFunctionClick('autoGroup')">
							<text class="iconfont icon-yonghuqun function-icon" style="color: #6699ff; font-size: 26px;"></text>
							<text class="function-name">自动建群</text>
							<text class="function-status" :style="functionStatus['autoGroup'] ? 'color: #6699ff; font-size: 12px;' : 'color: #999; font-size: 12px;'">
								{{ functionStatus['autoGroup'] ? '已启用' : '已禁用' }}
							</text>
						</view>
						<view class="function-item" style="visibility: hidden;">
							<!-- 空白占位 -->
						</view>
					</view>
				</view>
			</view>
			
			<!-- 采购中心 -->
			<view class="module-section" v-if='hide'>
				<view class="module-title">采购中心</view>
				<view class="module-list">
					<view class="module-item" @tap="showTrafficPurchase">
						<view class="module-left">
							<view class="module-icon blue">
								<text class="iconfont icon-shangsheng" style="color: #5096ff; font-size: 24px;"></text>
							</view>
							<view class="module-info">
								<text class="module-name">流量采购</text>
								<text class="module-desc">自动导入流量到微信</text>
							</view>
						</view>
					</view>
					<view class="module-item" @tap="showSupplyChainPurchase">
						<view class="module-left">
							<view class="module-icon yellow">
								<text class="iconfont icon-gouwuchekong" style="color: #ffc107; font-size: 24px;"></text>
							</view>
							<view class="module-info">
								<text class="module-name">供应链采购</text>
								<text class="module-desc">管理供应链业务</text>
							</view>
						</view>
					</view>
				</view>
			</view>
			
			<!-- 数据中心 -->
			<view class="module-section">
				<view class="module-title">数据中心</view>
				<view class="module-list">
					<view class="module-item" @tap="showDataStatistics">
						<view class="module-left">
							<view class="module-icon blue">
								<text class="iconfont icon-shujutongji" style="color: #5096ff; font-size: 24px;"></text>
							</view>
							<view class="module-info">
								<text class="module-name">数据统计</text>
								<text class="module-desc">查看业务数据统计</text>
							</view>
						</view>
					</view>
					<view class="module-item" @tap="showCustomerManagement">
						<view class="module-left">
							<view class="module-icon blue">
								<text class="iconfont icon-yonghuqun" style="color: #5096ff; font-size: 24px;"></text>
							</view>
							<view class="module-info">
								<text class="module-name">客户管理</text>
								<text class="module-desc">管理客户资料信息</text>
							</view>
						</view>
					</view>

					<view class="module-item" @tap="showSettings" v-if='hide'>
						<view class="module-left">
							<view class="module-icon gray">
								<text class="iconfont icon-shezhi" style="color: #888; font-size: 24px;"></text>
							</view>
							<view class="module-info">
								<text class="module-name">系统设置</text>
								<text class="module-desc">配置系统参数</text>
							</view>
						</view>
					</view>
				</view>
			</view>
			
			<!-- 底部登录按钮 -->
			<view class="bottom-button" @tap="isLoggedIn ? logout() : showLoginPage()">
				<text class="iconfont" :class="isLoggedIn ? 'icon-tuichu' : 'icon-denglu'" :style="isLoggedIn ? 'color: #333; font-size: 18px;' : 'color: #333; font-size: 18px;'"></text>
				<text class="login-text">{{ isLoggedIn ? '退出登录' : '登录/注册' }}</text>
			</view>
		</view>
		
		<!-- 流量采购页面 -->
		<traffic-purchase :show="showTrafficPage" @close="closeTrafficPurchase" style="top:20px"></traffic-purchase>
		
		<!-- 供应链采购页面 -->
		<supply-chain-purchase :show="showSupplyChainPage" @close="closeSupplyChainPurchase" style="top:20px"></supply-chain-purchase>
		
		<!-- 系统设置页面 -->
		<system-settings :show="showSystemSettingsPage" @close="closeSystemSettings" style="top:20px"></system-settings>
		
		<!-- 数据统计页面 -->
		<data-statistics :show="showDataStatisticsPage" @close="closeDataStatistics" style="top:20px"></data-statistics>
		
		<!-- 客户管理页面 -->
		<customer-management :show="showCustomerManagementPage" @close="closeCustomerManagement" style="top:20px"></customer-management>
		
		<!-- 登录注册页面 -->
		<login-register 
			:show="showLoginPageFlag" 
			@close="closeLoginPage"
			@login-success="handleLoginSuccess"
		></login-register>
		
		</view>
	</view>
</template>

<script>
	import TrafficPurchase from './TrafficPurchase.vue';
	import SupplyChainPurchase from './SupplyChainPurchase.vue';
	import SystemSettings from './SystemSettings.vue';
	import LoginRegister from './LoginRegister.vue';
	import DataStatistics from './DataStatistics.vue';
	import CustomerManagement from './CustomerManagement.vue';
	import { hasValidToken, clearToken, redirectToLogin } from '../api/utils/auth';
	import { request, APP_CONFIG } from '../api/config';
	
	export default {
		name: "SideMenu",
		components: {
			TrafficPurchase,
			SupplyChainPurchase,
			SystemSettings,
			LoginRegister,
			DataStatistics,
			CustomerManagement
		},
		props: {
			show: {
				type: Boolean,
				default: false
			}
		},
		data() {
			return {
				hide : false,
				showSettingsDropdown: false, // 控制设置下拉菜单显示
				functionStatus: {
					'autoLike': false,
					'momentsSync': false,
					'autoCustomerDev': false,
					'groupMessageDeliver': false,
					'autoGroup': false
				},
				showTrafficPage: false,
				showSupplyChainPage: false,
				showSystemSettingsPage: false,
				showDataStatisticsPage: false,
				showCustomerManagementPage: false,
				showLoginPageFlag: false,
				isLoggedIn: false, // 用户登录状态
				userInfo: null, // 用户信息
				// 版本更新相关
				currentVersion: '', // 当前版本
				latestVersion: '', // 最新版本
				hasNewVersion: false, // 是否有新版本
				checkingUpdate: false, // 是否正在检查更新
				showUpdateDialog: false, // 是否显示更新弹窗
				updateInfo: {
					version: '', // 新版本号
					updateContent: [], // 更新内容列表
					downloadUrl: '', // 下载地址
					forceUpdate: false // 是否强制更新
				},
				// 下载相关
				downloading: false, // 是否正在下载
				downloadProgress: 0, // 下载进度 0-100
				downloadTask: null // 下载任务对象
			}
		},
		watch: {
			// 侧边栏显示时检查登录状态
			show(newVal) {
				if (newVal) {
					this.checkLoginStatus();
				}
			}
		},
		onShow() {
			// 获取用户登录状态
			this.checkLoginStatus();
			// 获取功能开关状态
			this.getFunctionStatus();
		},
		created() {
			// 获取用户登录状态
			this.checkLoginStatus();
			// 获取功能开关状态
			this.getFunctionStatus();
			// 获取当前版本号并自动检查更新
			this.getCurrentVersionAndCheckUpdate();
		},
		methods: {
			// 检查登录状态
			checkLoginStatus() {
				// 使用token判断登录状态
				this.isLoggedIn = hasValidToken();
				
				// 如果已登录，尝试获取用户信息
				if (this.isLoggedIn) {
					try {
						const memberStr = uni.getStorageSync('member');
						if (memberStr) {
							this.userInfo = JSON.parse(memberStr);
						}
					} catch (e) {
						console.error('获取用户信息失败', e);
						this.userInfo = null;
					}
				} else {
					this.userInfo = null;
				}

				console.log(this.userInfo);
			},
			
			// 退出登录
			logout() {
				// 清除token和用户信息
				clearToken();
				
				// 清除旧的userInfo（兼容）
				try {
					uni.removeStorageSync('userInfo');
				} catch(e) {
					console.error('清除用户信息失败', e);
				}
				
				// 重置登录状态
				this.userInfo = null;
				this.isLoggedIn = false;
				
				// 关闭侧边栏
				//this.closeSideMenu();
				
				// 提示退出成功
				uni.showToast({
					title: '已退出登录',
					icon: 'success',
					duration: 1500
				});
				
				// 跳转到登录页
				setTimeout(() => {
					redirectToLogin();
				}, 1000);
			},
			closeSideMenu() {
				this.$emit('close');
				// 关闭设置下拉菜单
				this.showSettingsDropdown = false;
			},
			
			// 切换设置下拉菜单
			toggleSettingsDropdown() {
				this.showSettingsDropdown = !this.showSettingsDropdown;
			},
			
			// 点击页面其他区域关闭下拉菜单
			closeSettingsDropdown() {
				this.showSettingsDropdown = false;
			},
			// 获取功能开关状态
			async getFunctionStatus() {
				try {
					const res = await request({
						url: '/v1/store/system-config/switch-status',
						method: 'GET'
					});
					
					if (res.code === 200 && res.data) {
						// 更新功能状态
						this.functionStatus = {
							'autoLike': res.data.autoLike || false,
							'momentsSync': res.data.momentsSync || false,
							'autoCustomerDev': res.data.autoCustomerDev || false,
							'groupMessageDeliver': res.data.groupMessageDeliver || false,
							'autoGroup': res.data.autoGroup || false
						};
						
						console.log('功能状态已更新:', this.functionStatus);
					} else {
						console.error('获取功能状态失败:', res.msg);
					}
				} catch (err) {
					console.error('获取功能状态异常:', err);
				}
			},
			handleFunctionClick(name) {
				// 切换功能状态
				this.functionStatus[name] = !this.functionStatus[name];
				
				// 显示提示的中文名称映射
				const nameMap = {
					'autoLike': '自动点赞',
					'momentsSync': '朋友圈同步',
					'autoCustomerDev': '自动开发客户',
					'groupMessageDeliver': '群消息推送',
					'autoGroup': '自动建群'
				};
				
			
				
				// 准备更新状态
				const newStatus = this.functionStatus[name];
				
				// 调用接口更新状态
				request({
					url: '/v1/store/system-config/update-switch-status',
					method: 'POST',
					data: {
						switchName: name,
					}
				}).then(res => {
					if (res.code === 200) {
						// 更新本地状态
						this.functionStatus[name] = newStatus;
						
						// 显示提示
						uni.showToast({
							title: newStatus ? `${nameMap[name]}已启用` : `${nameMap[name]}已禁用`,
							icon: 'none'
						});
						
						// 重新获取所有功能状态
						this.getFunctionStatus();
					} else {
						// 显示错误提示
						uni.showToast({
							title: res.msg || '操作失败',
							icon: 'none'
						});
					}
				}).catch(err => {
					console.error('更新功能状态失败:', err);
					uni.showToast({
						title: '网络异常，请稍后重试',
						icon: 'none'
					});
				});
			},
			handleModuleClick(name) {
				if (name === '供应链采购') {
					this.showSupplyChainPage = true;
				} else if (name === '数据统计') {
					this.showDataStatistics();
				} else if (name === '客户管理') {
					this.showCustomerManagement();
				} else {
					uni.showToast({
						title: `访问${name}`,
						icon: 'none'
					});
				}
			},
			showTrafficPurchase() {
				// 显示流量采购页面
				this.showTrafficPage = true;
			},
			closeTrafficPurchase() {
				// 只关闭流量采购页面，保持侧边菜单打开
				this.showTrafficPage = false;
			},
			showSupplyChainPurchase() {
				// 显示供应链采购页面
				this.showSupplyChainPage = true;
			},
			closeSupplyChainPurchase() {
				// 只关闭供应链采购页面，保持侧边菜单打开
				this.showSupplyChainPage = false;
			},
			showSystemSettings() {
				// 显示系统设置页面
				this.showSystemSettingsPage = true;
			},
			closeSystemSettings() {
				// 关闭系统设置页面
				this.showSystemSettingsPage = false;
			},
			showDataStatistics() {
				// 显示数据统计页面
				this.showDataStatisticsPage = true;
			},
			closeDataStatistics() {
				// 关闭数据统计页面
				this.showDataStatisticsPage = false;
			},
			showCustomerManagement() {
				// 显示客户管理页面
				this.showCustomerManagementPage = true;
			},
			closeCustomerManagement() {
				// 关闭客户管理页面
				this.showCustomerManagementPage = false;
			},
			showLoginPage() {
				// 关闭侧边菜单
				this.closeSideMenu();
				
				// 跳转到登录页面
				redirectToLogin();
			},
			closeLoginPage() {
				// 关闭登录/注册页面
				this.showLoginPageFlag = false;
			},
			handleLoginSuccess(userInfo) {
				// 处理登录成功事件
				this.isLoggedIn = true;
				this.userInfo = userInfo;
				uni.showToast({
					title: '登录成功',
					icon: 'success'
				});
			},
			handleLogin() {
				// 修改原有方法，调用显示登录页面
				this.showLoginPage();
			},
			goToUserCenter() {
				// 跳转到用户中心页面
				uni.navigateTo({
					url: '/pages/login/user'
				});
				
				// 关闭侧边栏
				this.closeSideMenu();
			},
			showSettings() {
				// 显示系统设置页面
				this.showSystemSettingsPage = true;
			},
			
			// 获取当前版本号
			getCurrentVersion() {
				// #ifdef APP-PLUS
				plus.runtime.getProperty(plus.runtime.appid, (info) => {
					this.currentVersion = info.version || '1.0.0';
				});
				// #endif
				
				// #ifndef APP-PLUS
				this.currentVersion = '1.0.0';
				// #endif
			},
			
			// 获取当前版本号并自动检查更新
			getCurrentVersionAndCheckUpdate() {
				// #ifdef APP-PLUS
				plus.runtime.getProperty(plus.runtime.appid, (info) => {
					this.currentVersion = info.version || '1.0.0';
					console.log('获取到当前版本号:', this.currentVersion);
					// 版本号获取完成后，自动检查更新（延迟500ms，确保应用已完全启动）
					setTimeout(() => {
						this.handleCheckUpdate(true); // 传入 true 表示自动检查，不显示"已是最新版本"提示
					}, 500);
				});
				// #endif
				
				// #ifndef APP-PLUS
				this.currentVersion = '1.0.0';
				// #endif
			},
			
			// 检查更新
			// autoCheck: true 表示自动检查（应用启动时），不显示"已是最新版本"提示
			// autoCheck: false 表示手动检查（用户点击按钮），显示所有提示
			async handleCheckUpdate(autoCheck = false) {
				// #ifdef APP-PLUS
				if (this.checkingUpdate) {
					return; // 正在检查中，避免重复请求
				}
				
				// 如果版本号还没获取到，先获取版本号
				if (!this.currentVersion) {
					// #ifdef APP-PLUS
					plus.runtime.getProperty(plus.runtime.appid, (info) => {
						this.currentVersion = info.version || '1.0.0';
						// 版本号获取完成后，继续检查更新
						setTimeout(() => {
							this.handleCheckUpdate(autoCheck);
						}, 100);
					});
					// #endif
					return;
				}
				
				this.checkingUpdate = true;
				
				try {
					console.log('开始检查更新，当前版本:', this.currentVersion);
					
					// 调用检查更新接口
					const res = await request({
						url: '/v1/app/update',
						method: 'GET',
						data: {
							version: this.currentVersion,
							type: 'aiStore'
						}
					});
					
					console.log('更新检测结果:', res);
					
					if (res.code === 200 && res.data) {
						const data = res.data;
						this.latestVersion = data.version || '';
						
						// 比较版本号
						const compareResult = this.compareVersion(this.latestVersion, this.currentVersion);
						
						if (compareResult > 0) {
							// 线上版本大于本地版本，有新版本
							this.hasNewVersion = true;
							
							// 设置更新信息
							this.updateInfo = {
								version: data.version || '',
								updateContent: this.parseUpdateContent(data.updateContent || data.content || ''),
								downloadUrl: data.downloadUrl || data.url || '',
								forceUpdate: data.forceUpdate || false
							};
							
							// 根据检查类型决定是否显示弹窗
							// autoCheck === false 表示手动检查，autoCheck === true 表示自动检查
							if (autoCheck === false) {
								// 手动检查：有新版本时总是显示弹窗（不受每日限制）
								console.log('手动检查更新，直接显示弹窗');
								this.showUpdateDialog = true;
							} else {
								// 自动检查：每天只能弹出一次
								console.log('自动检查更新，检查今日是否已显示过弹窗');
								if (this.shouldShowUpdateDialog()) {
									this.showUpdateDialog = true;
									this.recordUpdateDialogShown();
								} else {
									console.log('今天已显示过更新弹窗，不再自动弹出');
								}
							}
						} else {
							// 已是最新版本
							this.hasNewVersion = false;
							// 只有手动检查时才显示"已是最新版本"提示
							if (!autoCheck) {
								uni.showToast({
									title: '已是最新版本',
									icon: 'success',
									duration: 2000
								});
							}
						}
					} else {
						// 只有手动检查时才显示错误提示
						if (!autoCheck) {
							uni.showToast({
								title: res.msg || '检查更新失败',
								icon: 'none',
								duration: 2000
							});
						}
					}
				} catch (error) {
					console.error('检查更新失败:', error);
					// 只有手动检查时才显示错误提示
					if (!autoCheck) {
						uni.showToast({
							title: '检查更新失败，请稍后重试',
							icon: 'none',
							duration: 2000
						});
					}
				} finally {
					this.checkingUpdate = false;
				}
				// #endif
				
				// #ifndef APP-PLUS
				if (!autoCheck) {
					uni.showToast({
						title: '此功能仅在APP中可用',
						icon: 'none',
						duration: 2000
					});
				}
				// #endif
			},
			
			// 比较版本号，返回 1 表示 version1 > version2，返回 -1 表示 version1 < version2，返回 0 表示相等
			compareVersion(version1, version2) {
				if (!version1 || !version2) return 0;
				
				const v1Parts = version1.split('.').map(Number);
				const v2Parts = version2.split('.').map(Number);
				const maxLength = Math.max(v1Parts.length, v2Parts.length);
				
				for (let i = 0; i < maxLength; i++) {
					const v1Part = v1Parts[i] || 0;
					const v2Part = v2Parts[i] || 0;
					
					if (v1Part > v2Part) return 1;
					if (v1Part < v2Part) return -1;
				}
				
				return 0;
			},
			
			// 解析更新内容，将字符串转换为数组
			parseUpdateContent(content) {
				if (!content) return [];
				
				// 如果已经是数组，直接返回
				if (Array.isArray(content)) {
					return content;
				}
				
				// 如果是字符串，尝试按换行符或分号分割
				if (typeof content === 'string') {
					// 先尝试按换行符分割
					let items = content.split(/\n+/).filter(item => item.trim());
					
					// 如果没有换行，尝试按分号分割
					if (items.length === 1) {
						items = content.split(/[;；]/).filter(item => item.trim());
					}
					
					// 清理每个项目，移除可能的编号前缀（如 "1. ", "1、", "- " 等）
					return items.map(item => {
						return item.replace(/^[\d一二三四五六七八九十]+[\.、\s\-]*/, '').trim();
					}).filter(item => item);
				}
				
				return [];
			},
			
			// 检查今天是否应该显示更新弹窗（用于自动检查）
			shouldShowUpdateDialog() {
				try {
					const lastShownDate = uni.getStorageSync('updateDialogLastShownDate');
					if (!lastShownDate) {
						return true; // 从未显示过，可以显示
					}
					
					// 获取今天的日期字符串（格式：YYYY-MM-DD）
					const today = new Date();
					const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
					
					// 如果今天已经显示过，则不显示
					return lastShownDate !== todayStr;
				} catch (e) {
					console.error('检查更新弹窗显示状态失败:', e);
					return true; // 出错时默认允许显示
				}
			},
			
			// 记录今天已显示更新弹窗
			recordUpdateDialogShown() {
				try {
					const today = new Date();
					const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
					uni.setStorageSync('updateDialogLastShownDate', todayStr);
					console.log('已记录更新弹窗显示日期:', todayStr);
				} catch (e) {
					console.error('记录更新弹窗显示日期失败:', e);
				}
			},
			
			// 关闭更新弹窗
			closeUpdateDialog() {
				if (!this.updateInfo.forceUpdate) {
					this.showUpdateDialog = false;
				} else {
					uni.showToast({
						title: '此版本为重要更新，请升级后使用',
						icon: 'none',
						duration: 2000
					});
				}
			},
			
			// 开始下载更新
			startDownload() {
				// #ifdef APP-PLUS
				if (!this.updateInfo.downloadUrl) {
					uni.showToast({
						title: '下载地址无效',
						icon: 'none',
						duration: 2000
					});
					return;
				}
				
				if (this.downloading) {
					return; // 已经在下载中
				}
				
				this.downloading = true;
				this.downloadProgress = 0;
				
				// 创建下载任务
				const downloadPath = '_downloads/update_' + Date.now() + '.apk';
				this.downloadTask = plus.downloader.createDownload(this.updateInfo.downloadUrl, {
					filename: downloadPath // 下载文件名
				}, (download, status) => {
					if (status === 200) {
						// 下载成功
						console.log('下载成功:', download.filename);
						this.downloading = false;
						this.downloadProgress = 100;
						
						// 安装APK
						setTimeout(() => {
							this.installAPK(download.filename);
						}, 500);
					} else {
						// 下载失败
						console.error('下载失败:', status);
						this.downloading = false;
						this.downloadProgress = 0;
						uni.showToast({
							title: '下载失败，请稍后重试',
							icon: 'none',
							duration: 2000
						});
					}
				});
				
				// 监听下载进度
				this.downloadTask.addEventListener('statechanged', (download, status) => {
					switch (download.state) {
						case 1: // 开始下载
							console.log('开始下载...');
							break;
						case 2: // 连接到服务器
							console.log('连接到服务器...');
							break;
						case 3: // 下载中
							if (download.totalSize > 0) {
								const progress = Math.floor((download.downloadedSize / download.totalSize) * 100);
								this.downloadProgress = Math.min(progress, 99); // 最大99，完成时再设为100
								console.log('下载进度:', this.downloadProgress + '%', '已下载:', download.downloadedSize, '总大小:', download.totalSize);
							}
							break;
						case 4: // 下载完成
							console.log('下载完成');
							this.downloadProgress = 100;
							break;
					}
				});
				
				// 开始下载
				this.downloadTask.start();
				// #endif
			},
			
			// 安装APK
			installAPK(filePath) {
				// #ifdef APP-PLUS
				try {
					// 获取文件的完整路径
					const fullPath = plus.io.convertLocalFileSystemURL(filePath);
					console.log('准备安装APK:', fullPath);
					
					plus.runtime.install(fullPath, {}, () => {
						console.log('安装成功');
						uni.showToast({
							title: '安装成功',
							icon: 'success',
							duration: 1500
						});
						// 关闭弹窗
						setTimeout(() => {
							this.showUpdateDialog = false;
						}, 1500);
					}, (error) => {
						console.error('安装失败:', error);
						uni.showToast({
							title: '安装失败，请到下载文件夹手动安装',
							icon: 'none',
							duration: 3000
						});
					});
				} catch (error) {
					console.error('安装异常:', error);
					uni.showToast({
						title: '安装异常，请到下载文件夹手动安装',
						icon: 'none',
						duration: 3000
					});
				}
				// #endif
			}
			
		}
	}
</script>

<style lang="scss">
	.side-menu-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 9999;
	}
	
	.side-menu-mask {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 1;
	}
	
	.side-menu {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: #fff;
		z-index: 2;
		display: flex;
		flex-direction: column;
	}
	
	.side-menu-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px 15px;
		border-bottom: 1px solid #f5f5f5;
		position: relative;
	}
	
	.side-menu-title {
		font-size: 18px;
		font-weight: 500;
	}
	
	.close-icon {
		font-size: 24px;
		color: #666;
		padding: 0 10px;
	}
	
	.header-right {
		position: relative;
	}
	
	.settings-btn {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		position: relative;
	}
	
	.settings-btn-content {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.version-badge {
		position: absolute;
		top: 0;
		right: 0;
		font-size: 10px;
		color: #fff;
		background-color: #ff6699;
		border-radius: 8px;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		font-weight: bold;
		display: flex;
		align-items: center;
		justify-content: center;
		transform: translate(50%, -30%);
	}
	
	.settings-dropdown {
		position: absolute;
		top: 100%;
		right: 0;
		width: 160px;
		background-color: #fff;
		border-radius: 8px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
		z-index: 100;
		margin-top: 5px;
		overflow: hidden;
	}
	
	.dropdown-item {
		display: flex;
		align-items: center;
		padding: 12px 15px;
		transition: background-color 0.2s;
	}
	
	.dropdown-item:active {
		background-color: #f5f5f5;
	}
	
	.combined-item {
		display: flex;
		align-items: center;
		padding: 12px 15px;
	}
	
	.icon-container {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 12px;
	}
	
	.text-container {
		flex: 1;
	}
	
	.text-top {
		display: flex;
		align-items: center;
		margin-bottom: 4px;
	}
	
	
	.main-text {
		font-size: 14px;
		color: #333;
		font-weight: 500;
	}
	
	.version-info {
		font-size: 12px;
		color: #999;
	}
	
	.dropdown-text {
		font-size: 14px;
		color: #333;
		margin-left: 8px;
		flex: 1;
	}
	
	.update-badge {
		font-size: 12px;
		color: #fff;
		background-color: #ff6699;
		border-radius: 10px;
		padding: 2px 6px;
		font-weight: bold;
	}
	
	.function-module {
		padding: 15px;
	}
	
	.function-grid {
		display: flex;
		flex-direction: column;
		margin: 0 -5px;
	}
	
	.function-row {
		display: flex;
		width: 100%;
		margin-bottom: 10px;
	}
	
	.function-item {
		flex: 1;
		margin: 0 5px;
		border-radius: 10px;
		padding: 15px 12px;
		display: flex;
		flex-direction: column;
		align-items: center;
		box-sizing: border-box;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
		border: 1px solid rgba(0, 0, 0, 0.05);
	}
	
	.function-icon {
		font-size: 24px;
		margin-bottom: 8px;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	
	.iconfont.function-icon {
		font-size: 28px;
		color: inherit;
		height: 28px;
		width: 28px;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	
	.function-name {
		font-size: 12px;
		color: #333;
		margin-bottom: 5px;
		font-weight: 500;
	}
	
	.function-status {
		font-size: 12px;
		color: #666;
		padding: 2px 0;
	}
	
	.function-item-disabled {
		opacity: 0.7;
		background-color: #f5f5f5 !important;
	}
	
	.pink {
		background-color: #ffecf1;
	}
	
	.purple {
		background-color: #f5ecff;
	}
	
	.green {
		background-color: #e5fff2;
	}
	
	.orange {
		background-color: #fff7ec;
	}
	
	.blue {
		background-color: #ecf5ff;
	}
	
	.yellow {
		background-color: #fffcec;
	}
	
	.gray {
		background-color: #f5f5f5;
	}
	
	.module-section {
		padding: 10px 15px;
	}
	
	.module-title {
		font-size: 16px;
		font-weight: 500;
		margin-bottom: 10px;
	}
	
	.module-list {
		border-radius: 10px;
		background-color: #fff;
		overflow: hidden;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
	}
	
	.module-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 15px;
		border-bottom: 1px solid #f5f5f5;
	}
	
	.module-item:last-child {
		border-bottom: none;
	}
	
	.module-left {
		display: flex;
		align-items: center;
	}
	
	.module-icon {
		width: 40px;
		height: 40px;
		border-radius: 8px;
		display: flex;
		justify-content: center;
		align-items: center;
		margin-right: 10px;
		font-size: 20px;
	}
	
	.module-info {
		display: flex;
		flex-direction: column;
	}
	
	.module-name {
		font-size: 16px;
		color: #333;
		margin-bottom: 3px;
	}
	
	.module-desc {
		font-size: 12px;
		color: #999;
	}
	
	.bottom-button {
		margin-top: auto;
		margin: 20px 15px;
		padding: 12px 0;
		border-radius: 5px;
		background-color: #fff;
		border: 1px solid #e5e5e5;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	
	.login-icon {
		font-size: 16px;
		margin-right: 5px;
	}
	
	.login-text {
		font-size: 15px;
		color: #333;
	}
	
	.user-info {
		display: flex;
		align-items: center;
		padding: 15px;
		border-bottom: 1px solid #f5f5f5;
	}
	
	.avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		margin-right: 10px;
	}
	
	.user-details {
		flex: 1;
	}
	
	.nickname {
		font-size: 16px;
		color: #333;
		margin-bottom: 5px;
	}
	
	.member-info {
		font-size: 12px;
		color: #999;
	}
	
	.level-tag {
		padding: 2px 5px;
		border-radius: 5px;
		background-color: #e5e5e5;
		margin-right: 5px;
	}
	
	.vip {
		background-color: #ffd700;
	}
	
	.points {
		font-size: 12px;
		color: #999;
	}
	
	.not-logged-in {
		padding: 15px;
		border-bottom: 1px solid #f5f5f5;
	}
	
	.login-tip {
		font-size: 12px;
		color: #999;
	}
	
	/* 更新弹窗样式 */
	.update-dialog-mask {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 10000;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	
	.update-dialog {
		position: relative;
		width: 85%;
		max-width: 600px;
		background-color: #fff;
		border-radius: 20px;
		padding: 40px 30px 30px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
	}
	
	/* 手机上最大宽度80% */
	@media screen and (max-width: 768px) {
		.update-dialog {
			width: 80%;
			max-width: 80%;
		}
	}
	
	.update-rocket {
		position: absolute;
		top: -40px;
		left: 50%;
		transform: translateX(-50%);
		width: 80px;
		height: 80px;
		display: flex;
		justify-content: center;
		align-items: center;
		background: linear-gradient(135deg, #5096ff 0%, #6b7fff 100%);
		border-radius: 50%;
		box-shadow: 0 4px 15px rgba(80, 150, 255, 0.3);
	}
	
	.update-rocket text {
		font-size: 50px;
		line-height: 1;
	}
	
	.update-version-info {
		text-align: center;
		margin-top: 20px;
		margin-bottom: 25px;
	}
	
	.update-version-text {
		font-size: 18px;
		font-weight: 600;
		color: #333;
	}
	
	.update-content-list {
		margin-bottom: 30px;
		max-height: 300px;
		overflow-y: auto;
	}
	
	.update-content-item {
		display: flex;
		align-items: flex-start;
		margin-bottom: 12px;
		padding: 0 5px;
	}
	
	.update-item-number {
		font-size: 15px;
		color: #5096ff;
		font-weight: 600;
		margin-right: 8px;
		min-width: 20px;
	}
	
	.update-item-text {
		font-size: 15px;
		color: #666;
		line-height: 1.6;
		flex: 1;
	}
	
	.download-progress-wrapper {
		margin-bottom: 20px;
		padding: 0 5px;
	}
	
	.download-progress-bar {
		width: 100%;
		height: 8px;
		background-color: #f0f0f0;
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 8px;
	}
	
	.download-progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #5096ff 0%, #6b7fff 100%);
		border-radius: 4px;
		transition: width 0.3s ease;
	}
	
	.download-progress-text {
		display: block;
		text-align: center;
		font-size: 13px;
		color: #5096ff;
		font-weight: 500;
	}
	
	.update-button-wrapper {
		margin-top: 10px;
	}
	
	.update-button {
		width: 100%;
		height: 50px;
		background: linear-gradient(135deg, #5096ff 0%, #6b7fff 100%);
		border-radius: 25px;
		display: flex;
		justify-content: center;
		align-items: center;
		box-shadow: 0 4px 15px rgba(80, 150, 255, 0.3);
		transition: all 0.3s ease;
	}
	
	.update-button:active {
		transform: scale(0.98);
		box-shadow: 0 2px 8px rgba(80, 150, 255, 0.2);
	}
	
	.update-button-disabled {
		opacity: 0.7;
	}
	
	.update-button-text {
		font-size: 17px;
		font-weight: 600;
		color: #fff;
	}
	
	.update-close-btn {
		position: absolute;
		bottom: -50px;
		left: 50%;
		transform: translateX(-50%);
		width: 40px;
		height: 40px;
		background-color: rgba(255, 255, 255, 0.9);
		border-radius: 50%;
		display: flex;
		justify-content: center;
		align-items: center;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	}
	
	.update-close-icon {
		font-size: 20px;
		color: #666;
		font-weight: 300;
		line-height: 1;
	}
</style> 