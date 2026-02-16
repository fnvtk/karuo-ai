<template>
	<view class="chat-container">
		<!-- 顶部导航栏 -->
		<view class="header">
			<view class="title">AI助理</view>
			<view class="header-right">
				<text style="font-size: 16px;" @click='showMenu'>
                    <u-icon name="list" color="#333" size="28"></u-icon>
                </text>
			</view>
		</view>
		
		<!-- 引入侧边菜单组件 -->
		<side-menu :show="menuVisible" @close="closeMenu" style="top:20px"></side-menu>
		
		<!-- 搜索栏 -->
		<view class="search-container" v-if="false">
			<view class="search-input-wrapper">
				<text class="iconfont search-icon">
                <u-icon name="search"></u-icon>
                </text>
				<input
					type="text"
					v-model="searchText"
					placeholder="搜索消息"
					class="search-input"
					@focus="onSearchFocus"
				/>
			</view>
		</view>
		
		<!-- 消息区域 -->
		<scroll-view 
			scroll-y 
			class="message-list"
			:scroll-into-view="scrollIntoView"
			:scroll-with-animation="true"
			:scroll-top="scrollTop"
			@scroll="onScroll"
			scroll-anchoring
			ref="messageList"
		>
			<view 
				v-for="(message, index) in messages" 
				:key="message.id"
				:id="message.id"
				:class="['message-item', message.type, showContent ? 'fade-in' : '', message.isImage ? 'image-message' : '']"
			>
				<view class="message-content">
					<!-- 图片消息 -->
					<image v-if="message.isImage" :src="message.imagePath" mode="widthFix" @tap="previewImage(message.imagePath)"></image>
					<!-- 文本消息 -->
					<view v-else class="text-content">
						<text v-if="message.isThinking">{{ message.content.replace('...', '') }}</text>
						<text v-else>{{ message.content }}</text>
						<text v-if="message.isThinking" class="thinking-dots">...</text>
					</view>
				</view>
				<view class="message-time">{{ message.time }}</view>
			</view>
		</scroll-view>
		
		<!-- 底部操作区域 -->
		<view class="bottom-area safe-area-inset-bottom" style="border-top: 1px solid #e5e5e5;">
			<!-- 底部按钮区域 -->
			<view class="footer">
				<!-- 艺施内容库按钮 - 动态样式 -->
				<u-button 
					:type="contentLibEnabled ? 'primary' : 'default'"
					class="footer-btn"
					:class="contentLibEnabled ? 'content-btn' : 'content-btn-off'"
					:custom-style="{
						height: '40px', 
						padding: '0 12px', 
						fontSize: '14px',
						backgroundColor: contentLibEnabled ? '#0080FF' : '#fff',
						color: contentLibEnabled ? '#fff' : '#333',
                        border: '1px solid #e5e5e5',
						borderColor: contentLibEnabled ? '#0080FF' : '#e5e5e5'
					}"
					@click="toggleContentLib"
				>
					<view class="btn-content">
						<text class="iconfont">
                        	<u-icon name="file-text" size="24" color="{color: contentLibEnabled ? '#fff' : '#333'}"></u-icon>
                        </text>
						<text style="margin-left: 5px;">内容库</text>
					</view>
				</u-button>
				
				<!-- 自动开发客户按钮 - 动态样式 -->
				<u-button 
					:type="autoCustomerEnabled ? 'primary' : 'default'"
					class="footer-btn"
					:class="autoCustomerEnabled ? 'auto-btn-on' : 'auto-btn'"
					:custom-style="{
						height: '40px', 
						padding: '0 12px', 
						fontSize: '14px',
						backgroundColor: autoCustomerEnabled ? '#0080FF' : '#fff',
						color: autoCustomerEnabled ? '#fff' : '#333',
                        border: '1px solid #e5e5e5',
						borderColor: autoCustomerEnabled ? '#0080FF' : '#e5e5e5'
					}"
					@click="toggleAutoCustomer"
				>
					<view class="btn-content">
						<text class="iconfont" >
                        	<u-icon name="account" size="24" :color="{color: autoCustomerEnabled ? '#fff' : '#333'}"></u-icon>
                        </text>
						<text style="margin-left: 5px;">自动开发客户</text>
					</view>
				</u-button>
			</view>
			
			<!-- 输入框 -->
			<view class="input-container">
				<view class="input-wrapper" style="padding: 0;">
					<!-- 输入框 -->
					<u-input
					style="padding: 0 15px;box-sizing: border-box;"
						v-model="inputText"
						type="text"
						placeholder="发消息、输入@或/选择技能"
						border="none"
						:clearable="false"
						@confirm="sendMessage"
						height="44px"
					>
					</u-input>
					
					<!-- 发送按钮 -->
					<view class="right-btn" style="padding: 0;">
						<u-button style="width: 80px;height: 100%;" v-if="inputText.trim()" @click="sendMessage" text="发送" type="primary" size="larg" shape="circle"></u-button>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import SideMenu from '@/components/SideMenu.vue';
	import { hasValidToken, redirectToLogin } from '@/api/utils/auth';
	import { request } from '@/api/config';
	
	export default {
		components: {
			SideMenu
		},
		data() {
			return {
				searchText: '',
				inputText: '',
				scrollIntoView: '',
				showContent: false,
				contentLibEnabled: true,
				autoCustomerEnabled: false,
				scrollTop: 0,
				menuVisible: true,
				isRecording: false,
				messages: [],
				pageSize: 20,
				currentPage: 1,
				total: 0,
				loading: false,
				conversationId: '',
				isLoadingMore: false,
				hasMore: true,
				lastScrollTime: 0,
				scrollTimer: null
			}
		},
		created() {
			this.checkTokenStatus();
			this.initMessages();
		},
		onShow() {
			this.checkTokenStatus();
			if (this.messages.length === 0) {
				this.initMessages();
			}
		},
		methods: {
			checkTokenStatus() {
				if (!hasValidToken()) {
					console.log('Token无效，重定向到登录页面');
					redirectToLogin();
				}
			},
			async initMessages() {
				try {
					const res = await request({
						url: '/v1/cozeai/message/list',
						method: 'GET',
						data: {
							conversation_id: this.conversationId,
							page: 1,
							page_size: this.pageSize
						}
					});
					
					if (res.code === 200) {
						this.messages = res.data.list || [];
						this.total = res.data.total || 0;
						this.conversationId = res.data.conversation_id;
						this.hasMore = this.messages.length < this.total;
						
						this.$nextTick(() => {
							this.scrollToBottom();
						});
					} else {
						uni.showToast({
							title: res.msg || '获取消息失败',
							icon: 'none'
						});
					}
				} catch (err) {
					console.error('获取消息列表失败:', err);
					uni.showToast({
						title: '网络异常，请稍后重试',
						icon: 'none'
					});
				}
			},
			async loadMoreMessages() {
				if (this.isLoadingMore || !this.hasMore) return;
				
				this.isLoadingMore = true;
				try {
					const res = await request({
						url: '/v1/cozeai/message/list',
						method: 'GET',
						data: {
							conversation_id: this.conversationId,
							page: this.currentPage + 1,
							page_size: this.pageSize
						}
					});
					
					if (res.code === 200) {
						const newMessages = res.data.list || [];
						this.messages = [...newMessages, ...this.messages];
						this.currentPage += 1;
						this.hasMore = this.messages.length < this.total;
						
						this.$nextTick(() => {
							const oldHeight = this.$refs.messageList.scrollHeight;
							setTimeout(() => {
								const newHeight = this.$refs.messageList.scrollHeight;
								this.$refs.messageList.scrollTop = newHeight - oldHeight;
							}, 0);
						});
					} else {
						uni.showToast({
							title: res.msg || '加载更多消息失败',
							icon: 'none'
						});
					}
				} catch (err) {
					console.error('加载更多消息失败:', err);
					uni.showToast({
						title: '网络异常，请稍后重试',
						icon: 'none'
					});
				} finally {
					this.isLoadingMore = false;
				}
			},
			onScroll(e) {
				if (this.scrollTimer) {
					clearTimeout(this.scrollTimer);
				}
				
				this.scrollTimer = setTimeout(() => {
					const currentTime = Date.now();
					if (currentTime - this.lastScrollTime < 100) return;
					
					this.lastScrollTime = currentTime;
					this.scrollTop = e.detail.scrollTop;
					
					if (this.scrollTop <= 50 && !this.isLoadingMore && this.hasMore) {
						this.loadMoreMessages();
					}
				}, 100);
			},
			async sendMessage() {
				if (!this.inputText.trim()) return;
				
				// 保存用户输入
				const userInput = this.inputText;
				
				// 添加用户消息到列表
				const userMsg = {
					id: 'msg' + (this.messages.length + 1),
					type: 'user',
					content: userInput,
					time: this.formatTime(new Date())
				};
				this.messages.push(userMsg);
				
				// 添加思考中的状态消息
				const thinkingMsg = {
					id: 'thinking_' + Date.now(),
					type: 'assistant',
					content: '正在思考中...',
					time: this.formatTime(new Date()),
					isThinking: true // 标记为思考状态
				};
				this.messages.push(thinkingMsg);
				
				// 清空输入框
				this.inputText = '';
				
				// 立即滚动到底部
				this.scrollToBottom();
				
				try {
					// 调用发送消息接口
					const res = await request({
						url: '/v1/cozeai/conversation/createChat',
						method: 'POST',
						data: {
							conversation_id: this.conversationId,
							question: userInput
						}
					});
					
					if (res.code === 200) {
						// 更新会话ID
						if (res.data.conversation_id) {
							this.conversationId = res.data.conversation_id;
						}
						
						// 开始轮询获取结果
						if (res.data.status === 'in_progress') {
							this.pollMessageResult(res.data.id, thinkingMsg.id);
						}
					} else {
						// 显示错误提示
						uni.showToast({
							title: res.msg || '发送失败',
							icon: 'none'
						});
						// 移除思考中的消息
						this.removeThinkingMessage(thinkingMsg.id);
					}
				} catch (err) {
					console.error('发送消息失败:', err);
					uni.showToast({
						title: '网络异常，请稍后重试',
						icon: 'none'
					});
					// 移除思考中的消息
					this.removeThinkingMessage(thinkingMsg.id);
				}
			},
			// 移除思考中的消息
			removeThinkingMessage(thinkingId) {
				const index = this.messages.findIndex(msg => msg.id === thinkingId);
				if (index !== -1) {
					this.messages.splice(index, 1);
				}
			},
			// 更新轮询方法
			async pollMessageResult(messageId, thinkingId) {
				let retryCount = 0;
				const maxRetries = 30;
				const interval = 1000;
				
				const poll = async () => {
					if (retryCount >= maxRetries) {
						uni.showToast({
							title: '响应超时，请重试',
							icon: 'none'
						});
						this.removeThinkingMessage(thinkingId);
						return;
					}
					
					try {
						const statusRes = await request({
							url: '/v1/cozeai/conversation/chatretRieve',
							method: 'GET',
							data: {
								conversation_id: this.conversationId,
								chat_id: messageId
							}
						});
						
						if (statusRes.code === 200) {
							if (statusRes.data.status === 'completed') {
								const messageRes = await request({
									url: '/v1/cozeai/conversation/chatMessage',
									method: 'GET',
									data: {
										conversation_id: this.conversationId,
										chat_id: messageId
									}
								});
								
								if (messageRes.code === 200 && messageRes.data) {
									// 移除思考中的消息
									this.removeThinkingMessage(thinkingId);
									
									// 添加AI回复
									const aiMsg = {
										id: 'msg' + (this.messages.length + 1),
										type: 'assistant',
										content: messageRes.data.content || '抱歉，我现在无法回答您的问题。',
										time: messageRes.data.time || this.formatTime(new Date())
									};
									this.messages.push(aiMsg);
									
									// 滚动到底部
									this.scrollToBottom();
									return;
								} else {
									uni.showToast({
										title: messageRes.msg || '获取消息内容失败',
										icon: 'none'
									});
									this.removeThinkingMessage(thinkingId);
								}
							} else if (statusRes.data.status === 'failed') {
								uni.showToast({
									title: '消息处理失败',
									icon: 'none'
								});
								this.removeThinkingMessage(thinkingId);
								return;
							}
							
							// 如果状态是处理中，继续轮询
							retryCount++;
							setTimeout(poll, interval);
						} else {
							uni.showToast({
								title: statusRes.msg || '检查消息状态失败',
								icon: 'none'
							});
							this.removeThinkingMessage(thinkingId);
						}
					} catch (err) {
						console.error('轮询消息状态失败:', err);
						retryCount++;
						setTimeout(poll, interval);
					}
				};
				
				poll();
			},
			scrollToBottom() {
				if (this.messages.length > 0) {
					this.scrollIntoView = this.messages[this.messages.length - 1].id;
				}
				
				this.$nextTick(() => {
					setTimeout(() => {
						this.scrollTop = 999999;
					}, 50);
				});
			},
			formatTime(date) {
				const hours = date.getHours().toString().padStart(2, '0');
				const minutes = date.getMinutes().toString().padStart(2, '0');
				return hours + ':' + minutes;
			},
			goBack() {
				uni.navigateBack();
			},
			onSearchFocus() {
				uni.showToast({
					title: '搜索功能开发中',
					icon: 'none'
				});
			},
			onSearch() {
				if (!this.searchText.trim()) return;
				uni.showToast({
					title: '搜索"' + this.searchText + '"的结果开发中',
					icon: 'none'
				});
			},
			toggleContentLib() {
				this.contentLibEnabled = !this.contentLibEnabled;
				uni.showToast({
					title: this.contentLibEnabled ? '艺施内容库已开启' : '艺施内容库已关闭',
					icon: 'none'
				});
			},
			toggleAutoCustomer() {
				this.autoCustomerEnabled = !this.autoCustomerEnabled;
				uni.showToast({
					title: this.autoCustomerEnabled ? '自动开发客户已开启' : '自动开发客户已关闭',
					icon: 'none'
				});
			},
			showMenu() {
				this.menuVisible = true;
			},
			closeMenu() {
				this.menuVisible = false;
			},
			previewImage(url) {
				uni.previewImage({
					urls: [url],
					current: url
				});
			},
			beforeDestroy() {
				if (this.scrollTimer) {
					clearTimeout(this.scrollTimer);
				}
			}
		}
	}
</script>

<style lang="scss">
	.chat-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background-color: #fff;
		box-sizing: border-box;
	}
	
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 15px 15px;
		padding-top: calc(var(--status-bar-height) + 15px);
		box-shadow: none;
		background-color: #fff;
		z-index: 1000;
		border-bottom: 1px solid #f5f5f5;
		
		.title {
			font-size: 20px;
			font-weight: 500;
		}
		
		.header-right {
			display: flex;
			align-items: center;
		}
	}
	
	.search-container {
		padding: 10px 15px 15px;
		background-color: #fff;
	}
	
	.search-input-wrapper {
		display: flex;
		align-items: center;
		background-color: #F5F5F5;
		height: 36px;
		border-radius: 18px;
		padding: 0 12px;
	}
	
	.search-icon {
		color: #999;
		font-size: 16px;
		margin-right: 6px;
	}
	
	.search-input {
		flex: 1;
		height: 100%;
		font-size: 14px;
		background-color: transparent;
		border: none;
	}
	
	.message-list {
		flex: 1;
		padding: 10px;
		overflow-y: auto;
		background-color: #fff;
        box-sizing: border-box;
	}
	
	.message-item {
		margin-bottom: 20px;
		
		&.assistant {
			.message-content {
				background-color: #F5F5F5;
				border-radius: 10px;
				padding: 12px 15px;
				font-size: 15px;
				line-height: 1.5;
				color: #333;
				max-width: 85%;
				box-shadow: none;
				word-break: break-word;
			}
			
			.message-time {
				font-size: 12px;
				color: #999;
				margin-top: 5px;
				padding-left: 5px;
			}
		}
		
		&.user {
			display: flex;
			flex-direction: column;
			align-items: flex-end;
			
			.message-content {
				background-color: #0080FF;
				border-radius: 18px;
				padding: 12px 15px;
				font-size: 15px;
				line-height: 1.5;
				color: #fff;
				max-width: 75%;
				word-break: break-word;
			}
			
			.message-time {
				font-size: 12px;
				color: #999;
				margin-top: 5px;
				padding-right: 5px;
			}
			
			&.image-message {
				.message-content {
					padding: 0;
					background-color: transparent;
					overflow: hidden;
					
					image {
						width: 100%;
						max-width: 200px;
						border-radius: 10px;
					}
				}
			}
		}
	}
	
	.bottom-area {
		background-color: #fff;
		border-top: none;
	}
	
	.footer {
		padding: 10px 15px;
		display: flex;
		justify-content: space-between;
		
		.footer-btn {
			flex: 1;
			margin: 0 5px;
			border-radius: 4px;
			height: 40px;
			line-height: 40px;
		}
		
		.content-btn {
			background-color: #0080FF;
			color: #fff;
			border-color: #0080FF;
		}
		
		.content-btn-off {
			background-color: #fff;
			color: #333;
			border-color: #e5e5e5;
		}
		
		.auto-btn-on {
			background-color: #0080FF;
			color: #fff;
			border-color: #0080FF;
		}
		
		.auto-btn {
			background-color: #fff;
			color: #333;
			border-color: #e5e5e5;
		}
	}
	
	.input-container {
		padding: 10px 15px 15px;
		
		.input-wrapper {
			border: 1px solid #e5e5e5;
			border-radius: 40px;
			padding: 0 5px;
			background-color: #fff;
			height: 44px;
			display: flex;
			align-items: center;
		}
		
		.right-btn {
			padding: 0 8px;
			height: 100%;
			display: flex;
			align-items: center;
		}
		
		:deep(.u-input) {
			background-color: transparent;
			flex: 1;
			height: 42px;
		}
		
		:deep(.u-input__content__field-wrapper__field) {
			font-size: 15px;
		}
	}
	
	.fade-in {
		animation: fadeIn 0.5s ease-in-out;
	}
	
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	.btn-content {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.iconfont {
		font-family: "SF Pro Display";
		font-size: 16px;
	}
	
	.icon-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 5px;
	}
	
	.mic-icon {
		color: #333;
		font-size: 24px;
	}
	
	.send-icon {
		color: #0080FF;
		font-size: 24px;
		cursor: pointer;
	}
	
	.recording {
		color: #f00;
		font-weight: bold;
	}
	
	.recording-tip {
		position: fixed;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 150px;
		height: 150px;
		background-color: rgba(0, 0, 0, 0.7);
		border-radius: 10px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		z-index: 999;
		
		.recording-wave {
			display: flex;
			align-items: flex-end;
			height: 50px;
			margin-bottom: 10px;
			
			.wave {
				width: 5px;
				background-color: #0080FF;
				margin: 0 3px;
				border-radius: 3px;
				animation: waveAnimation 0.5s infinite alternate;
				
				&:nth-child(1) {
					height: 15px;
					animation-delay: 0s;
				}
				
				&:nth-child(2) {
					height: 25px;
					animation-delay: 0.2s;
				}
				
				&:nth-child(3) {
					height: 20px;
					animation-delay: 0.4s;
				}
			}
		}
		
		.recording-text {
			color: #fff;
			font-size: 14px;
			margin-bottom: 10px;
		}
		
		.recording-cancel {
			color: #999;
			font-size: 12px;
		}
	}
	
	@keyframes waveAnimation {
		from {
			transform: scaleY(1);
		}
		to {
			transform: scaleY(1.5);
		}
	}
	
	.text-content {
		display: flex;
		align-items: center;
		
		.thinking-dots {
			display: inline-block;
			animation: thinkingDots 2s infinite;
		}
	}
	
	@keyframes thinkingDots {
		0% { opacity: 0.2; }
		20% { opacity: 1; }
		100% { opacity: 0.2; }
	}
</style> 