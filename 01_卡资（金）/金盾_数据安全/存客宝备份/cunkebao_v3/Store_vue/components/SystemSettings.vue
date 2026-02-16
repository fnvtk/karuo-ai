<template>
	
		<view v-if="show" class="system-settings-container">
			<!-- 头部 -->
			<view class="header">
				<view class="back-icon" @tap="closePage">
					<u-icon name="arrow-left" color="#333" size="26"></u-icon>
				</view>
				<view class="title">系统设置</view>
				<view class="close-icon" @tap="closePage">
					<u-icon name="close" color="#333" size="24"></u-icon>
				</view>
			</view>
			
			<!-- 设置区域 -->
			<view class="settings-section">
				<view class="section-card">
					<u-cell-group :border="false">
						<u-cell title="通知设置" :border-bottom="true" is-link @click="handleSettingTap('通知设置')"></u-cell>
						<u-cell title="消息提醒" :border-bottom="true" is-link @click="handleSettingTap('消息提醒')"></u-cell>
						<u-cell title="声音设置" :border-bottom="true" is-link @click="handleSettingTap('声音设置')"></u-cell>
						<u-cell title="勿扰模式" :border-bottom="false" is-link @click="handleSettingTap('勿扰模式')"></u-cell>
					</u-cell-group>
				</view>
				
				<view class="section-card">
					<u-cell-group :border="false">
						<u-cell title="账号安全" :border-bottom="true" is-link @click="handleSettingTap('账号安全')"></u-cell>
						<u-cell title="修改密码" :border-bottom="true" is-link @click="handleSettingTap('修改密码')"></u-cell>
						<u-cell title="隐私设置" :border-bottom="true" is-link @click="handleSettingTap('隐私设置')"></u-cell>
						<u-cell title="账号绑定" :border-bottom="false" is-link @click="handleSettingTap('账号绑定')"></u-cell>
					</u-cell-group>
				</view>
				
				<view class="section-card">
					<u-cell-group :border="false">
						<u-cell title="通用" :border-bottom="true" is-link @click="handleSettingTap('通用')"></u-cell>
						<u-cell title="清除缓存" :border-bottom="true" is-link @click="handleSettingTap('清除缓存')"></u-cell>
						<u-cell title="检查更新" :border-bottom="true" is-link @click="handleSettingTap('检查更新')"></u-cell>
						<u-cell title="关于我们" :border-bottom="false" is-link @click="handleSettingTap('关于我们')"></u-cell>
					</u-cell-group>
				</view>
			</view>
			
			<!-- 退出登录按钮 -->
			<view class="logout-button-wrapper">
				<u-button type="error" shape="circle" @click="handleLogout">退出登录</u-button>
			</view>
		</view>

</template>

<script>
	export default {
		name: 'SystemSettings',
		props: {
			show: {
				type: Boolean,
				default: false
			}
		},
		data() {
			return {
				
			}
		},
		methods: {
			closePage() {
				this.$emit('close');
			},
			handleSettingTap(setting) {
				// 处理各个设置项的点击事件
				uni.showToast({
					title: `点击了${setting}`,
					icon: 'none'
				});
			},
			handleLogout() {
				// 直接执行退出登录操作，不再使用Modal确认
				
				// 清除用户信息
				try {
					uni.removeStorageSync('userInfo');
					console.log('用户信息已清除');
				} catch(e) {
					console.error('清除用户信息失败', e);
				}
				
				// 关闭设置页面
				this.closePage();
				
				// 提示退出成功
				uni.showToast({
					title: '已退出登录',
					icon: 'success',
					duration: 1500
				});
				
				// 跳转到登录页
				setTimeout(() => {
					uni.reLaunch({
						url: '/pages/login/index'
					});
				}, 1000);
			}
		}
	}
</script>

<style lang="scss">
	.system-settings-container {
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
		display: flex;
		align-items: center;
	}
	
	.title {
		font-size: 17px;
		font-weight: 500;
		flex: 1;
		text-align: center;
	}
	
	.close-icon {
		width: 60px;
		display: flex;
		justify-content: flex-end;
	}
	
	.placeholder-icon {
		width: 60px;
	}
	
	.settings-section {
		padding: 15px;
	}
	
	.section-card {
		background-color: #fff;
		border-radius: 10px;
		overflow: hidden;
		margin-bottom: 15px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
	}
	
	.logout-button-wrapper {
		padding: 20px 30px;
	}
	
	.system-settings-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
	}
</style> 