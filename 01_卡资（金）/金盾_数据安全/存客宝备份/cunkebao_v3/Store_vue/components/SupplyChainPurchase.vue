<template>
	
		<view v-if="show" class="supply-chain-container">
			<!-- 头部 -->
			<view class="header">
				<view class="back-icon" @tap="closePage">
					<u-icon name="arrow-left" color="#333" size="26"></u-icon>
				</view>
				<view class="title">供应链采购</view>
				<view class="close-icon" @tap="closePage">
					<u-icon name="close" color="#333" size="24"></u-icon>
				</view>
			</view>
			
			<!-- 加载状态 -->
			<view v-if="loading && packages.length === 0" class="loading-container">
				<!-- <u-loading size="34" mode="circle" color="#CA8A04"></u-loading> -->
				<text class="loading-text">加载中...</text>
			</view>
			
			<!-- 错误提示 -->
			<view v-else-if="error" class="error-container">
				<u-icon name="error-circle" size="40" color="#ff4d4f"></u-icon>
				<text class="error-text">{{error}}</text>
				<button class="retry-button" @tap="fetchVendorList">重试</button>
			</view>
			
			<!-- 套餐卡片区域 -->
			<view v-else class="package-list">
				<view 
					v-for="item in packages" 
					:key="item.id" 
					class="package-card"
					@tap="openPackageDetail(item)"
				>
					<view class="package-content">
						<view class="cart-icon">
							<text class="cart-text">
                            <u-icon name="shopping-cart" size='35px' color='#CA8A04'></u-icon>
                            </text>
						</view>
						<view class="package-info">
							<view class="package-name">
								{{item.name}}
								<text v-if="item.tags && item.tags.length > 0" class="special-tag">{{item.tags[0]}}</text>
							</view>
							<view class="package-price">
								<text class="price-value">¥{{item.price}}</text>
								<text class="original-price" v-if="item.originalPrice !== item.price">¥{{item.originalPrice}}</text>
							</view>
							<view class="advance-payment" v-if="item.advancePayment">预付款: ¥{{item.advancePayment}}</view>
						</view>
						<view class="discount-tag" v-if="item.discount">{{(parseFloat(item.discount) * 10).toFixed(2)}}折</view>
					</view>
				</view>
				
				<!-- 加载更多 -->
				<view class="load-more" v-if="hasMore">
					<u-loadmore
						:status="loadMoreStatus"
						@loadmore="loadMore"
						icon-type="flower"
						color="#CA8A04"
					></u-loadmore>
				</view>
				
				<!-- 无数据提示 -->
				<view v-if="packages.length === 0 && !loading" class="no-data">
					<u-empty text="暂无供应商数据" mode="data"></u-empty>
				</view>
			</view>
			
			<!-- 套餐详情页面 -->
			<supply-item-detail 
				:show="showPackageDetail" 
				:package-data="currentPackage" 
				@close="closePackageDetail"
			></supply-item-detail>
				
		</view>
		

</template>

<script>
	import SupplyItemDetail from './SupplyItemDetail.vue';
	import { supplyApi } from '../api/modules/supply';
	
	export default {
		name: 'SupplyChainPurchase',
		components: {
			'supply-item-detail': SupplyItemDetail
		},
		props: {
			show: {
				type: Boolean,
				default: false
			}
		},
		data() {
			return {
				// 套餐数据
				packages: [],
				// 套餐详情页面
				showPackageDetail: false,
				// 当前选中的套餐
				currentPackage: null,
				// 分页相关
				currentPage: 1,
				pageSize: 10,
				total: 0,
				hasMore: true,
				// 加载状态
				loading: false,
				loadMoreStatus: 'loading', // 'loading', 'nomore', 'loadmore'
				// 错误信息
				error: null
			}
		},
		watch: {
			show(newVal) {
				if (newVal && this.packages.length === 0) {
					this.fetchVendorList();
				}
			}
		},
		methods: {
			closePage() {
				this.$emit('close');
			},
			// 打开套餐详情
			openPackageDetail(packageData) {
				this.currentPackage = packageData;
				this.showPackageDetail = true;
			},
			// 关闭套餐详情
			closePackageDetail() {
				this.showPackageDetail = false;
			},
			// 获取供应商套餐数据
			async fetchVendorList(isLoadMore = false) {
				if (this.loading) return;
				
				this.loading = true;
				if (!isLoadMore) this.error = null;
				
				if (!isLoadMore) {
					uni.showLoading({
						title: '加载中...',
						mask: true
					});
				}
				
				try {
					const response = await supplyApi.getVendorList(this.currentPage, this.pageSize);
					
					if (response.code === 200) {
						// 处理返回的数据，注意接口返回的数据有嵌套的list字段
						const list = response.data.list || [];
						const newPackages = list.map(item => ({
							id: item.id,
							userId: item.userId,
							companyId: item.companyId,
							name: item.name,
							price: parseFloat(item.price).toFixed(2),
							originalPrice: parseFloat(item.originalPrice).toFixed(2),
							discount: item.discount,
							advancePayment: item.advancePayment ? parseFloat(item.advancePayment).toFixed(2) : '',
							tags: item.tags,
							description: item.description,
							cover: item.cover,
							status: item.status,
							createTime: item.createTime,
							updateTime: item.updateTime
						}));
						
						if (isLoadMore) {
							this.packages = [...this.packages, ...newPackages];
						} else {
							this.packages = newPackages;
						}
						
						// 更新分页信息
						this.total = response.data.total || 0;
						this.hasMore = this.packages.length < this.total;
						this.loadMoreStatus = this.hasMore ? 'loadmore' : 'nomore';
					} else {
						this.error = response.msg || '获取数据失败';
					}
				} catch (err) {
					this.error = '获取供应商数据失败，请稍后重试';
					console.error('获取供应商数据错误:', err);
				} finally {
					this.loading = false;
					if (!isLoadMore) uni.hideLoading();
				}
			},
			// 加载更多
			loadMore() {
				if (!this.hasMore || this.loading) return;
				
				this.loadMoreStatus = 'loading';
				this.currentPage++;
				this.fetchVendorList(true);
			}
		}
	}
</script>

<style lang="scss">
	.supply-chain-container {
		position: fixed;
		top: 0;
		right: 0;
		width: 100%;
		height: 100%;
		background-color: #fff;
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
	
	.package-list {
		padding: 15px;
	}
	
	.package-card {
		margin-bottom: 15px;
		background-color: #fff;
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
		border: 1px solid #FFEDA0;
	}

	.package-card:hover {
		background-color: #FFFEF0;
	}

	
	.package-content {
		padding: 18px 15px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		position: relative;
	}


	
	.cart-icon {
		position: relative;
		left: 0;
		top: 0;
		width: 50px;
		height: 50px;
		background-color: #FFFDD0;
		border-radius: 50%;
		display: flex;
		justify-content: center;
		align-items: center;
		margin-right: 15px;
	}
	
	.cart-text {
		font-size: 20px;
		color: #E8A317;
	}
	
	.package-info {
		flex: 1;
		padding-left: 0;
		margin-right: 45px;
	}
	
	.package-name {
		font-size: 16px;
		font-weight: 500;
		color: #333;
		margin-bottom: 5px;
		display: flex;
		align-items: center;
	}
	
	.package-price {
		display: flex;
		align-items: baseline;
		margin-bottom: 5px;
	}
	
	.price-value {
		font-size: 22px;
		font-weight: bold;
		color: #E8A317;
	}
	
	.original-price {
		font-size: 15px;
		color: #999;
		text-decoration: line-through;
		margin-left: 8px;
	}
	
	.advance-payment {
		font-size: 14px;
		color: #666;
		margin-top: 5px;
	}
	
	.discount-tag {
		position: absolute;
		right: 15px;
		top: 50%;
		transform: translateY(-50%);
		padding:0 20px;
		height: 30px;
		background-color: #FFE55A;
		color: #c35300;
		border-radius: 30px;
		font-size: 16px;
		font-weight: 500;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	
	.special-tag {
		position: relative;
		display: inline-block;
		margin-left: 8px;
		padding: 2px 6px;
		background-color: #FFDF32;
		color: #333;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
		line-height: 1;
	}
	
	.supply-chain-wrapper {
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
		background-color: #CA8A04;
		border-radius: 4px;
	}
	
	/* 加载更多 */
	.load-more {
		padding: 10px 0;
		text-align: center;
	}
	
	/* 无数据提示 */
	.no-data {
		padding: 40px 0;
		text-align: center;
	}
</style> 