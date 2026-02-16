<template>
	<view v-if="show" class="traffic-purchase-container" >
			<!-- 头部 -->
			<view class="header">
				<view class="back-icon" @tap="closePage">
					<u-icon name="arrow-left" color="#333" size="26"></u-icon>
				</view>
				<view class="title">流量采购</view>
				<view class="close-icon" @tap="closePage">
					<u-icon name="close" color="#333" size="24"></u-icon>
				</view>
			</view>
			
			<!-- 本月使用情况 -->
			<view class="usage-card">
				<view class="usage-title">本月流量使用情况
					<text v-if="usageData.packageName" class="package-type">({{usageData.packageName}})</text>
				</view>
				
				<!-- 使用情况加载中 -->
				<view v-if="usageLoading" class="usage-loading">
					<text>加载使用情况...</text>
				</view>
				
				<!-- 使用情况错误 -->
				<view v-else-if="usageError" class="usage-error">
					<text>{{usageError}}</text>
					<button class="retry-button-small" @tap="fetchRemainingFlow">刷新</button>
				</view>
				
				<!-- 使用情况数据 -->
				<template v-else>
					<view class="usage-row">
						<text>流量使用</text>
						<text>{{usageData.totalFlow - usageData.remainingFlow}}/{{usageData.totalFlow}}人</text>
					</view>
					<view class="usage-progress">
						<view class="progress-bar" :style="{width: usageData.flowPercentage + '%'}"></view>
					</view>
					<view class="usage-row">
						<text>剩余有效期</text>
						<text>{{usageData.remainingDays}}天</text>
					</view>
					<view class="usage-date">
						<text>有效期: {{usageData.startTime}} ~ {{usageData.expireTime}}</text>
					</view>
				</template>
			</view>
			
			<!-- 使用警告 -->
			<view v-if="usageData.flowPercentage > 70 && !usageLoading && !usageError" class="warning-box">
				<view class="warning-icon">
					<text class="iconfont icon-warning" style="color: #fff; font-size: 14px;"></text>
				</view>
				<view class="warning-content">
					<view class="warning-title">流量即将用完</view>
					<view class="warning-text">本月流量仅剩{{usageData.remainingFlow}}人，建议购买流量包以保证业务连续性</view>
				</view>
			</view>
			
			<!-- 套餐选择 -->
			<view class="section-title">选择流量套餐</view>
			
			<!-- 加载状态 -->
			<view v-if="loading" class="loading-container">
				<image src="/static/loading.gif" mode="aspectFit" class="loading-image"></image>
				<text class="loading-text">加载中...</text>
			</view>
			
			<!-- 错误提示 -->
			<view v-else-if="error" class="error-container">
				<image src="/static/error.png" mode="aspectFit" class="error-image"></image>
				<text class="error-text">{{error}}</text>
				<button class="retry-button" @tap="fetchFlowPackages">重试</button>
			</view>
			
			<!-- 使用v-for循环渲染流量包 -->
			<view 
				v-else
				v-for="item in packages" 
				:key="item.id" 
				class="package-card"
				@tap="openPackageDetail(item)"
			>
				<view class="package-header">
					<view class="package-left">
						<view class="package-icon" :style="{backgroundColor: item.iconColor}">
							<text class="iconfont" :class="item.iconClass" style="color: #0080ff; font-size: 24px;"></text>
						</view>
						<view class="package-info">
							<view class="package-name">
								{{item.name}}
								<text v-if="item.specialTag" class="special-tag">{{item.specialTag}}</text>
							</view>
							<view class="package-price">
								<text class="current-price">¥{{item.price}}</text>
								<text class="original-price" v-if="item.originalPrice !== item.price">¥{{item.originalPrice}}</text>
							</view>
							<view class="package-specs">{{item.specs}}</view>
						</view>
					</view>
					<view class="discount-tag">{{item.discount}}</view>
				</view>
			</view>
			
			
			<!-- 流量包详情页面 -->
			<package-detail 
				:show="showPackageDetail" 
				:package-data="currentPackage" 
				@close="closePackageDetail"
				@buy-success="handleBuySuccess"
			></package-detail>
			
	</view>
</template>

<script>
	import PackageDetail from './PackageDetail.vue';
	import { trafficApi } from '../api/modules/traffic';
	
	export default {
		name: 'TrafficPurchase',
		components: {
			'package-detail': PackageDetail
		},
		props: {
			show: {
				type: Boolean,
				default: false
			}
		},
		data() {
			return {
				// 流量包数据
				packages: [],
				// 流量包详情页面
				showPackageDetail: false,
				// 当前选中的流量包
				currentPackage: null,
				// 加载状态
				loading: false,
				// 错误信息
				error: null,
				// 本月使用情况数据
				usageData: {
					packageName: '',
					remainingFlow: 0,
					totalFlow: 0,
					flowPercentage: 0,
					remainingDays: 0,
					totalDays: 0,
					timePercentage: 0,
					expireTime: '',
					startTime: ''
				},
				// 本月使用情况加载状态
				usageLoading: false,
				// 本月使用情况错误信息
				usageError: null
			}
		},
		watch: {
			show(newVal) {
				if (newVal) {
					this.fetchFlowPackages();
					this.fetchRemainingFlow();
				}
			}
		},
		methods: {
			closePage() {
				this.$emit('close');
			},
			// 打开流量包详情
			openPackageDetail(packageData) {
				this.currentPackage = packageData;
				this.showPackageDetail = true;
			},
			// 关闭流量包详情
			closePackageDetail() {
				this.showPackageDetail = false;
			},
			// 获取流量包数据
			async fetchFlowPackages() {
				if (this.loading) return;
				
				this.loading = true;
				this.error = null;
				
				uni.showLoading({
					title: '加载中...',
					mask: true
				});
				
				try {
					const response = await trafficApi.getFlowPackages();
					
					if (response.code === 200) {
						// 处理返回的数据
						this.packages = response.data.map(item => ({
							id: item.id,
							name: item.name,
							price: parseFloat(item.price),
							originalPrice: parseFloat(item.originalPrice),
							specs: `${item.monthlyFlow}人/月·${item.duration}个月`,
							iconClass: this.getIconClass(item.tag),
							iconColor: '#ecf5ff',
							discount: item.discount,
							specialTag: item.tag,
							details: [
								{ label: '每月流量', value: `${item.monthlyFlow}人/月` },
								{ label: '套餐时长', value: `${item.duration}个月` },
								{ label: '总流量', value: `${item.totalFlow}人` }
							],
							privileges: item.privileges
						}));
					} else {
						this.error = response.msg || '获取数据失败';
					}
				} catch (err) {
					this.error = '获取流量包数据失败，请稍后重试';
					console.error('获取流量包数据错误:', err);
				} finally {
					this.loading = false;
					uni.hideLoading();
				}
			},
			// 根据标签获取对应的图标类名
			getIconClass(tag) {
				const iconMap = {
					'入门级': 'icon-shujutongji',
					'热销': 'icon-shuju',
					'尊享': 'icon-data'
				};
				return iconMap[tag] || 'icon-shujutongji';
			},
			// 获取本月流量使用情况
			async fetchRemainingFlow() {
				if (this.usageLoading) return;
				
				this.usageLoading = true;
				this.usageError = null;
				
				try {
					const response = await trafficApi.getRemainingFlow();
					
					if (response.code === 200) {
						this.usageData = response.data;
					} else {
						this.usageError = response.msg || '获取使用情况失败';
						console.error('获取使用情况失败:', response.msg);
					}
				} catch (err) {
					this.usageError = '获取使用情况失败，请稍后重试';
					console.error('获取使用情况错误:', err);
				} finally {
					this.usageLoading = false;
				}
			},
			// 处理购买成功事件
			handleBuySuccess() {
				// 刷新流量使用情况和套餐列表
				this.fetchRemainingFlow();
				this.fetchFlowPackages();
				
				// 提示购买成功
				uni.showToast({
					title: '购买成功，流量已更新',
					icon: 'success',
					duration: 2000
				});
			}
		}
	}
</script>

<style lang="scss">
	.traffic-purchase-container {
		position: fixed;
		top: 0;
		right: 0;
		width: 100%;
		height: 100%;
		background-color: #f5f7fa;
		z-index: 10000;
		overflow-y: auto;
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
	
	.back-text {
		font-weight: 500;
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
	
	.usage-card {
		margin: 15px;
		padding: 15px;
		background-color: #ecf5ff;
		border-radius: 10px;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
		border: 1px solid #d4e8ff;
	}
	
	.usage-title {
		font-size: 16px;
		font-weight: 500;
		margin-bottom: 15px;
		
		.package-type {
			font-size: 14px;
			color: #0080ff;
			font-weight: normal;
			margin-left: 5px;
		}
	}
	
	.usage-row {
		display: flex;
		justify-content: space-between;
		margin-bottom: 10px;
		font-size: 14px;
		color: #333;
	}
	
	.usage-progress {
		height: 10px;
		background-color: #f0f0f0;
		border-radius: 5px;
		margin: 10px 0 15px;
		overflow: hidden;
	}
	
	.progress-bar {
		height: 100%;
		background-color: #0080ff;
		border-radius: 5px;
	}
	
	.warning-box {
		margin: 15px;
		padding: 12px 15px;
		background-color: #fff9e6;
		border-radius: 8px;
		display: flex;
		align-items: center;
	}
	
	.warning-icon {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background-color: #ff9900;
		color: #fff;
		display: flex;
		justify-content: center;
		align-items: center;
		margin-right: 10px;
		flex-shrink: 0;
	}
	
	.warning-content {
		flex: 1;
	}
	
	.warning-title {
		font-size: 14px;
		font-weight: 500;
		color: #ff9900;
		margin-bottom: 5px;
	}
	
	.warning-text {
		font-size: 12px;
		color: #666;
		line-height: 1.5;
	}
	
	.section-title {
		margin: 20px 15px 10px;
		font-size: 16px;
		font-weight: 500;
		color: #333;
	}
	
	.package-card {
		margin: 10px 15px;
		background-color: #fff;
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
		border: 1px solid #e6f4ff;
		position: relative;
		transition: all 0.2s ease;
	}
	
	.package-card:hover {
		background-color: #f8faff;
	}
	
	.package-header {
		padding: 18px 15px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.package-left {
		display: flex;
		align-items: center;
	}
	
	.package-icon {
		width: 45px;
		height: 45px;
		background-color: #f0f7ff;
		border-radius: 50%;
		display: flex;
		justify-content: center;
		align-items: center;
		margin-right: 12px;
		font-size: 18px;
	}
	
	.package-info {
		display: flex;
		flex-direction: column;
	}
	
	.package-name {
		font-size: 15px;
		font-weight: 500;
		color: #333;
		margin-bottom: 4px;
		display: flex;
		align-items: center;
	}
	
	.package-price {
		display: flex;
		align-items: baseline;
		margin-bottom: 4px;
	}
	
	.current-price {
		font-size: 22px;
		font-weight: bold;
		color: #0080ff;
	}
	
	.original-price {
		font-size: 15px;
		color: #999;
		text-decoration: line-through;
		margin-left: 8px;
	}
	
	.package-specs {
		font-size: 12px;
		color: #666;
	}
	
	.original-tag {
		position: relative;
		display: inline-block;
		margin-left: 8px;
		padding: 2px 6px;
		background-color: #f5f5f5;
		border-radius: 4px;
		font-size: 14px;
		color: #666;
		font-weight: 500;
	}
	
	.discount-tag {
		position: absolute;
		right: 15px;
		top: 50%;
		transform: translateY(-50%);
		padding:0 20px;
		height: 30px;
		background-color: #e6f4ff;
		color: #0080ff;
		border-radius: 30px;
		font-size: 16px;
		font-weight: 500;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	
	.special-tag {
		background-color: #BFDBFE;
		color: #3152B8;
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
		margin-left: 8px;
	}
	
	.traffic-purchase-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
	}
	
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 40rpx 0;
		
		.loading-image {
			width: 60rpx;
			height: 60rpx;
		}
		
		.loading-text {
			margin-top: 20rpx;
			font-size: 28rpx;
			color: #666;
		}
	}
	
	.error-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 40rpx 0;
		
		.error-image {
			width: 80rpx;
			height: 80rpx;
		}
		
		.error-text {
			margin: 20rpx 0;
			font-size: 28rpx;
			color: #ff4d4f;
		}
		
		.retry-button {
			margin-top: 20rpx;
			padding: 10rpx 30rpx;
			font-size: 28rpx;
			color: #fff;
			background-color: #2979ff;
			border-radius: 8rpx;
		}
	}
	
	.usage-loading {
		text-align: center;
		color: #666;
		font-size: 14px;
		margin-bottom: 10px;
	}
	
	.usage-error {
		text-align: center;
		color: #ff4d4f;
		font-size: 14px;
		margin-bottom: 10px;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	
	.retry-button-small {
		margin-top: 10px;
		padding: 4px 15px;
		font-size: 14px;
		color: #fff;
		background-color: #2979ff;
		border-radius: 4px;
		display: inline-block;
		line-height: 1.5;
	}
	
	.usage-date {
		font-size: 12px;
		color: #666;
		margin-top: 10px;
		text-align: right;
	}
</style> 