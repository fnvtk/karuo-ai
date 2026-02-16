<template>

		<view v-if="show" class="supply-detail-container">
			<!-- 头部 -->
			<view class="header">
				<view class="back-icon" @tap="closePage">
					<u-icon name="arrow-left" color="#333" size="26"></u-icon>
				</view>
				<view class="title">{{detailData.name || packageData.name}}</view>
				<view class="close-icon" @tap="closePage">
					<u-icon name="close" color="#333" size="24"></u-icon>
				</view>
			</view>
			
			<!-- 加载状态 -->
			<view v-if="loading" class="loading-container">
				<!-- <u-loading size="34" mode="circle" color="#FF6600"></u-loading> -->
				<text class="loading-text">加载中...</text>
			</view>
			
			<!-- 错误提示 -->
			<view v-else-if="error" class="error-container">
				<u-icon name="error-circle" size="40" color="#ff4d4f"></u-icon>
				<text class="error-text">{{error}}</text>
				<button class="retry-button" @tap="fetchVendorDetail">重试</button>
			</view>
			
			<template v-else>
				<!-- 套餐价格信息 -->
				<view class="price-card">
					<view class="price-title">套餐价格</view>
					<view class="price-info">
						<view class="current-price">
							<text class="price-symbol">¥</text>
							<text class="price-value">{{detailData.price || packageData.price}}</text>
						</view>
						<view class="original-price" v-if="(detailData.originalPrice || packageData.originalPrice) !== (detailData.price || packageData.price)">¥{{detailData.originalPrice || packageData.originalPrice}}</view>
					</view>
					<view class="advance-info" v-if="detailData.advancePayment || packageData.advancePayment">
						预付款: ¥{{detailData.advancePayment || packageData.advancePayment}}
					</view>
					
					<!-- 标签 -->
					<view class="tags-container" v-if="detailData.tags && detailData.tags.length > 0">
						<view class="tag-item" v-for="(tag, index) in detailData.tags" :key="index">
							{{tag}}
						</view>
					</view>
					
					<!-- 描述信息 -->
					<view class="description" v-if="detailData.description">
						{{detailData.description}}
					</view>
				</view>
				
				<!-- 项目列表 -->
				<view class="service-section" v-if="detailData.projects && detailData.projects.length > 0">
					<view class="section-title">项目列表</view>
					<view class="service-count">共{{detailData.projects.length}}个项目</view>
					
					<!-- 项目列表 -->
					<view class="service-list">
						<view 
							v-for="(project, index) in detailData.projects" 
							:key="project.id"
							class="service-item"
						>
							<view class="service-left">
								<image v-if="project.image" :src="project.image" mode="aspectFill" class="service-image"></image>
								<view v-else class="service-icon">
									<u-icon name="heart" color="#FF6600" size="24"></u-icon>
								</view>
							</view>
							<view class="service-right">
								<view class="service-name">{{project.name}}</view>
								<view class="service-price">
									<text class="price-symbol">¥</text>
									<text class="service-price-value">{{project.price}}</text>
									<text class="service-original-price" v-if="project.originalPrice">¥{{project.originalPrice}}</text>
								</view>
								<view class="service-duration" v-if="project.duration">{{project.duration}}分钟</view>
								<view class="service-detail" v-if="project.detail">{{project.detail}}</view>
							</view>
						</view>
					</view>
				</view>
				
				<!-- 原始服务列表 (如果没有项目列表，则显示原有的服务列表) -->
				<view class="service-section" v-else-if="packageData.services && packageData.services.length > 0">
					<view class="section-title">套餐内容</view>
					<view class="service-count">共{{packageData.services.length}}个服务</view>
					
					<!-- 服务列表 -->
					<view class="service-list">
						<view 
							v-for="(service, index) in packageData.services" 
							:key="index"
							class="service-item"
						>
							<view class="service-left">
								<view class="service-icon">
									<u-icon name="heart" color="#FF6600" size="24"></u-icon>
								</view>
							</view>
							<view class="service-right">
								<view class="service-name">{{service.name}}</view>
								<view class="service-price">
									<text class="price-symbol">¥</text>
									<text class="service-price-value">{{service.price}}</text>
									<text class="service-original-price" v-if="service.originalPrice">¥{{service.originalPrice}}</text>
								</view>
								<view class="service-duration">{{service.duration}}</view>
							</view>
						</view>
					</view>
				</view>
				
				<!-- 购买按钮 -->
				<view class="buy-button-container">
					<button class="buy-button" @tap="handleBuy">立即购买</button>
				</view>
				
				<!-- 购买说明 -->
				<view class="buy-notice">
					<text class="notice-text">订单将由操作人处理，详情请联系客服</text>
				</view>
			</template>
		</view>
	
</template>

<script>
	import { supplyApi } from '../api/modules/supply';
	
	export default {
		name: 'SupplyItemDetail',
		props: {
			show: {
				type: Boolean,
				default: false
			},
			packageData: {
				type: Object,
				default: () => ({
					id: 1,
					name: '基础套餐',
					price: '2980',
					originalPrice: '3725',
					advancePayment: '745',
					discount: '8折',
					services: [
						{
							name: '头部护理SPA',
							price: '598',
							originalPrice: '718',
							duration: '60分钟',
							image: '/static/spa1.png'
						},
						{
							name: '臂油SPA',
							price: '618',
							originalPrice: '838',
							duration: '90分钟',
							image: '/static/spa2.png'
						},
						{
							name: '法/LAWF型颜度护理',
							price: '1580',
							originalPrice: '1896',
							duration: '120分钟',
							image: '/static/spa3.png'
						}
					]
				})
			}
		},
		data() {
			return {
				// 详情数据
				detailData: {},
				// 加载状态
				loading: false,
				// 错误信息
				error: null
			}
		},
		watch: {
			show(newVal) {
				if (newVal && this.packageData && this.packageData.id) {
					this.fetchVendorDetail();
				}
			},
			'packageData.id'(newVal) {
				if (newVal && this.show) {
					this.fetchVendorDetail();
				}
			}
		},
		methods: {
			closePage() {
				this.$emit('close');
			},
			// 获取供应商详情
			async fetchVendorDetail() {
				if (this.loading || !this.packageData || !this.packageData.id) return;
				
				this.loading = true;
				this.error = null;
				
				try {
					const response = await supplyApi.getVendorDetail(this.packageData.id);
					
					if (response.code === 200) {
						this.detailData = response.data;
					} else {
						this.error = response.msg || '获取详情失败';
						console.error('获取详情失败:', response.msg);
					}
				} catch (err) {
					this.error = '获取详情失败，请稍后重试';
					console.error('获取详情错误:', err);
				} finally {
					this.loading = false;
				}
			},
			handleBuy() {
				uni.showLoading({
					title: '处理中...'
				});
				
				// 获取packageId
				const packageId = this.detailData.id || this.packageData.id;
				if (!packageId) {
					uni.showToast({
						title: '参数错误',
						icon: 'none'
					});
					uni.hideLoading();
					return;
				}
				
				// 提交订单
				supplyApi.submitOrder(packageId)
					.then(response => {
						uni.hideLoading();
						if (response.code === 200) {
							uni.showToast({
								title: '购买成功',
								icon: 'success'
							});
							
							// 延迟关闭页面
							setTimeout(() => {
								this.closePage();
							}, 1500);
						} else {
							uni.showToast({
								title: response.msg || '购买失败',
								icon: 'none'
							});
						}
					})
					.catch(err => {
						uni.hideLoading();
						console.error('订单提交错误:', err);
						uni.showToast({
							title: '购买失败，请稍后重试',
							icon: 'none'
						});
					});
			}
		}
	}
</script>

<style lang="scss">
	.supply-detail-container {
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
	
	.price-card {
		margin: 15px;
		padding: 15px;
		background-color: #FFFBE6;
		border-radius: 10px;
	}
	
	.price-title {
		font-size: 14px;
		color: #333;
		margin-bottom: 10px;
	}
	
	.price-info {
		display: flex;
		align-items: baseline;
	}
	
	.current-price {
		display: flex;
		align-items: baseline;
	}
	
	.price-symbol {
		font-size: 16px;
		font-weight: bold;
		color: #FF6600;
	}
	
	.price-value {
		font-size: 28px;
		font-weight: bold;
		color: #FF6600;
	}
	
	.original-price {
		margin-left: 10px;
		font-size: 16px;
		color: #999;
		text-decoration: line-through;
	}
	
	.advance-info {
		margin-top: 8px;
		font-size: 14px;
		color: #666;
	}
	
	.tags-container {
		display: flex;
		flex-wrap: wrap;
		margin-top: 10px;
	}
	
	.tag-item {
		background-color: #FCF0E3;
		color: #FF6600;
		font-size: 12px;
		padding: 3px 8px;
		border-radius: 4px;
		margin-right: 8px;
		margin-bottom: 8px;
	}
	
	.description {
		margin-top: 10px;
		font-size: 14px;
		color: #666;
		line-height: 1.5;
	}
	
	.service-section {
		margin: 15px;
		background-color: #fff;
		border-radius: 10px;
		overflow: hidden;
		position: relative;
	}
	
	.section-title {
		padding: 15px;
		border-bottom: 1px solid #f5f5f5;
		font-size: 16px;
		font-weight: 500;
	}
	
	.service-count {
		position: absolute;
		right: 15px;
		top: 15px;
		font-size: 12px;
		color: #666;
		background-color: #f5f5f5;
		padding: 2px 8px;
		border-radius: 10px;
	}
	
	.service-list {
		padding: 0 15px;
	}
	
	.service-item {
		display: flex;
		padding: 15px 0;
		border-bottom: 1px solid #f5f5f5;
	}
	
	.service-item:last-child {
		border-bottom: none;
	}
	
	.service-left {
		width: 60px;
		height: 60px;
		border-radius: 8px;
		overflow: hidden;
		margin-right: 15px;
		background-color: #f5f5f5;
	}
	
	.service-icon {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	
	.service-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	
	.service-right {
		flex: 1;
	}
	
	.service-name {
		font-size: 15px;
		font-weight: 500;
		color: #333;
		margin-bottom: 5px;
	}
	
	.service-price {
		display: flex;
		align-items: baseline;
		margin-bottom: 5px;
	}
	
	.service-price-value {
		font-size: 16px;
		font-weight: bold;
		color: #FF6600;
	}
	
	.service-original-price {
		font-size: 14px;
		color: #999;
		text-decoration: line-through;
		margin-left: 5px;
	}
	
	.service-duration {
		font-size: 12px;
		color: #999;
		margin-bottom: 5px;
	}
	
	.service-detail {
		font-size: 12px;
		color: #666;
		line-height: 1.5;
	}
	
	.buy-button-container {
		margin: 20px 15px;
	}
	
	.buy-button {
		width: 100%;
		height: 45px;
		line-height: 45px;
		text-align: center;
		background-color: #FFBE00;
		color: #ffffff;
		font-size: 16px;
		font-weight: 500;
		border-radius: 25px;
		border: none;
	}
	
	.buy-notice {
		text-align: center;
		margin-bottom: 30px;
	}
	
	.notice-text {
		font-size: 12px;
		color: #999;
	}
	
	.supply-detail-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
	}
	
	/* 加载状态 */
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 60px 0;
	}
	
	.loading-text {
		margin-top: 15px;
		font-size: 14px;
		color: #666;
	}
	
	/* 错误提示 */
	.error-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 60px 0;
	}
	
	.error-text {
		margin: 15px 0;
		font-size: 14px;
		color: #ff4d4f;
	}
	
	.retry-button {
		padding: 6px 20px;
		font-size: 14px;
		color: #fff;
		background-color: #FF6600;
		border-radius: 4px;
	}
</style> 