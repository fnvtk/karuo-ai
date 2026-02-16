<template>
	<view v-if="show" class="package-detail-container">
		<!-- 头部 -->
		<view class="header">
			<view class="back-icon" @tap="closePage">
				<u-icon name="arrow-left" color="#333" size="26"></u-icon>
			</view>
			<view class="title">{{packageData.name}}</view>
			<view class="close-icon" @tap="closePage">
				<u-icon name="close" color="#333" size="24"></u-icon>
			</view>
		</view>
		
		<!-- 套餐价格 -->
		<view class="price-card">
			<view class="price-title">套餐价格</view>
			<view class="price-content">
				<view class="main-price">
					<text class="price-symbol">¥</text>
					<text class="price-value">{{packageData.price}}</text>
				</view>
				<view class="original-price-tag">原价</view>
			</view>
			<view class="original-price" v-if="packageData.originalPrice !== packageData.price">
				<text class="crossed-price">¥{{packageData.originalPrice}}</text>
			</view>
		</view>
		
		<!-- 套餐详情 -->
		<view class="detail-card">
			<view class="detail-title">套餐详情</view>
			<view class="detail-item" v-for="item in packageData.details" :key="item.label">
				<text class="detail-label">{{item.label}}</text>
				<text class="detail-value">{{item.value}}</text>
			</view>
		</view>
		
		<!-- 套餐特权 -->
		<view class="privilege-card">
			<view class="detail-title">套餐特权</view>
			<view class="privilege-item" v-for="item in packageData.privileges" :key="item">
				<view class="privilege-icon">
					<u-icon name="checkmark" color="#0080ff" size="16"></u-icon>
				</view>
				<text class="privilege-text">{{item}}</text>
			</view>
		</view>
		
		<!-- 立即购买按钮 -->
		<view class="buy-button">
			<u-button 
				type="primary" 
				text="立即购买" 
				shape="circle"
				@click="handleBuy"
				:custom-style="{
					width: '90%',
					height: '44px',
					marginTop: '20px',
					marginBottom: '30px'
				}"
			></u-button>
		</view>
		
		<!-- 购买说明 -->
		<view class="purchase-info">
			<text class="info-text">流量将在购买后24小时内接入</text>
		</view>
	</view>
</template>

<script>
	import { trafficApi } from '../api/modules/traffic';
	
	export default {
		name: 'PackageDetail',
		props: {
			show: {
				type: Boolean,
				default: false
			},
			packageData: {
				type: Object,
				default: () => ({
					id: 1,
					name: '基础流量包',
					price: 980,
					originalPrice: 990,
					specs: '20人/月·30天',
					details: [
						{ label: '每月流量', value: '20人/月' },
						{ label: '套餐时长', value: '30天' },
						{ label: '总流量', value: '600人' }
					],
					privileges: [
						'引流到微信',
						'每日流量报告',
						'基础客户标签'
					]
				})
			}
		},
		data() {
			return {
				// 订单信息
				orderInfo: null,
				// 购买状态
				buying: false
			}
		},
		methods: {
			closePage() {
				this.$emit('close');
			},
			async handleBuy() {
				if (this.buying) return;
				
				this.buying = true;
				
				uni.showLoading({
					title: '创建订单...',
					mask: true
				});
				
				try {
					// 调用创建订单接口
					const response = await trafficApi.createOrder(this.packageData.id);
					
					// 隐藏加载中
					uni.hideLoading();
					
					if (response.code === 200) {
						this.orderInfo = response.data;
						
						// 显示订单创建成功提示
						uni.showToast({
							title: '订单创建成功',
							icon: 'success',
							duration: 2000
						});
						
						// 模拟跳转到支付页面
						setTimeout(() => {
							this.showPaymentModal();
						}, 1000);
					} else {
						// 显示错误信息
						uni.showToast({
							title: response.msg || '创建订单失败',
							icon: 'none',
							duration: 2000
						});
					}
				} catch (err) {
					// 隐藏加载中
					uni.hideLoading();
					
					// 显示错误信息
					uni.showToast({
						title: '网络异常，请稍后重试',
						icon: 'none',
						duration: 2000
					});
					console.error('创建订单错误:', err);
				} finally {
					this.buying = false;
				}
			},
			// 显示支付弹窗
			showPaymentModal() {
				if (!this.orderInfo) return;
				
				uni.showModal({
					title: '订单支付',
					content: `订单号: ${this.orderInfo.orderNo}\n金额: ¥${this.orderInfo.amount}\n支付方式: ${this.orderInfo.payType === 'wechat' ? '微信支付' : '其他支付方式'}`,
					confirmText: '去支付',
					cancelText: '取消',
					success: (res) => {
						if (res.confirm) {
							// 模拟支付成功
							uni.showLoading({
								title: '支付处理中'
							});
							
							setTimeout(() => {
								uni.hideLoading();
								uni.showToast({
									title: '支付成功',
									icon: 'success',
									duration: 2000
								});
								
								// 关闭页面
								setTimeout(() => {
									this.closePage();
									
									// 触发购买成功事件，通知父组件刷新数据
									this.$emit('buy-success');
								}, 1500);
							}, 2000);
						}
					}
				});
			}
		}
	}
</script>

<style lang="scss">
	.package-detail-container {
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
		background-color: #e6f4ff;
		border-radius: 10px;
	}
	
	.price-title {
		font-size: 15px;
		font-weight: 500;
		color: #333;
		margin-bottom: 10px;
	}
	
	.price-content {
		display: flex;
		align-items: center;
	}
	
	.main-price {
		display: flex;
		align-items: baseline;
	}
	
	.price-symbol {
		font-size: 18px;
		font-weight: bold;
		color: #0080ff;
	}
	
	.price-value {
		font-size: 28px;
		font-weight: bold;
		color: #0080ff;
	}
	
	.original-price-tag {
		margin-left: 15px;
		padding: 2px 10px;
		background-color: #fff;
		border-radius: 4px;
		font-size: 12px;
		color: #666;
	}
	
	.original-price {
		margin-top: 5px;
	}
	
	.crossed-price {
		font-size: 14px;
		color: #999;
		text-decoration: line-through;
	}
	
	.detail-card, .privilege-card {
		margin: 15px;
		padding: 15px;
		background-color: #fff;
		border-radius: 10px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}
	
	.detail-title {
		font-size: 15px;
		font-weight: 500;
		color: #333;
		margin-bottom: 15px;
	}
	
	.detail-item {
		display: flex;
		justify-content: space-between;
		padding: 10px 0;
		border-bottom: 1px solid #f5f5f5;
	}
	
	.detail-item:last-child {
		border-bottom: none;
	}
	
	.detail-label {
		color: #333;
		font-size: 14px;
	}
	
	.detail-value {
		color: #666;
		font-size: 14px;
	}
	
	.privilege-item {
		display: flex;
		align-items: center;
		margin-bottom: 12px;
	}
	
	.privilege-icon {
		margin-right: 8px;
		display: flex;
		align-items: center;
	}
	
	.privilege-text {
		font-size: 14px;
		color: #333;
	}
	
	.buy-button {
		display: flex;
		justify-content: center;
		margin-top: 20px;
	}
	
	.purchase-info {
		text-align: center;
		margin-bottom: 30px;
	}
	
	.info-text {
		font-size: 12px;
		color: #999;
	}
</style> 