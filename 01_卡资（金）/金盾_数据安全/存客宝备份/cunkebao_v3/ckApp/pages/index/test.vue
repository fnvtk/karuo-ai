<template>
	<view class="content">
		<!-- iframe 容器 -->
		<view class="iframe-container">
			<web-view 
				ref="webviewRef"
				:src="iframeUrl" 
				@message="handleMessage"
				:fullscreen="false"
				:webview-styles="{
					width:'100%',
					height:'406px'
				}"
			></web-view>
		</view>
	

		<!-- 消息控制区域 -->
		<view class="message-controls">
			<text class="control-title">消息控制：</text>
			<view class="control-buttons">
				<button @click="sendMessageToIframe" class="btn-send">发送消息到iframe</button>
			</view>
		</view>


		<!-- 消息显示区域 -->
		<view class="message-area">
			<text class="message-title">接收到的消息：</text>
			<view class="message-list">
				<view v-for="(msg, index) in receivedMessages" :key="index" class="message-item">
					<text class="message-text">{{msg}}</text>
				</view>
			</view>
		</view>
		
	</view>
</template>

<script>
	import { getTopSafeAreaHeightAsync } from '@utils/common';
	const TYPE_EMUE = {
		CONNECT: 0,
		DATA: 1,
		FUNCTION: 2,
		
	}
	export default {
		data() {
			return {
				baseUrl: 'https://kr-op.quwanzhi.com/init', 
				iframeUrl: '', // 动态构建的 URL
				receivedMessages: [],
				messageId: 0,
				urlParams: {}
			}
		},
		onLoad() {
			this.buildIframeUrl();
			setTimeout(() => {
				this.sendMessageToIframeConnect()
			}, 1000);
		},
		methods: {
			// 构建 iframe URL，包含参数
			buildIframeUrl() {
				const params = [];
				Object.keys(this.urlParams).forEach(key => {
					const value = this.urlParams[key];
					if (value !== null && value !== undefined) {
						const encodedKey = encodeURIComponent(key);
						const encodedValue = encodeURIComponent(String(value));
						params.push(`${encodedKey}=${encodedValue}`);
					}
				});
				const queryString = params.join('&');
				this.iframeUrl = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;
			},
			// 发送消息到 iframe（通过URL传参）
			async sendMessageToIframe() {
				const paddingTop = await getTopSafeAreaHeightAsync();
				this.messageId++;
				const message = {
					type: TYPE_EMUE.DATA, // 数据类型：0数据交互 1App功能调用
					data: {
						id: this.messageId,
						content: `Hello，我是 App 发送的消息 ${this.messageId}`,
						timestamp: Date.now(),
						paddingTop: paddingTop
					}
				};
				
				// 将消息添加到URL参数中
				this.urlParams.message = encodeURIComponent(JSON.stringify(message));
				this.buildIframeUrl();
				console.log('[App]SendMessage=>\n' + JSON.stringify(message));
			},
			// 发送消息到 iframe（通过URL传参）
			async sendMessageToIframeConnect() {
				const message = {
					type: TYPE_EMUE.CONNECT, 
					data: {
						action: 'ping',
						content: '联通测试通过',
						timestamp: Date.now()
					}
				};
				
				// 将消息添加到URL参数中
				this.urlParams.message = encodeURIComponent(JSON.stringify(message));
				this.buildIframeUrl();
				console.log('[App]SendMessage=>\n' + JSON.stringify(message));
			},
			// 接收 web-view 发送的消息
			handleMessage(event) {
				console.log("event", event);
				const [ResDetail] = event.detail.data;
				this.receivedMessages.push(`[${new Date().toLocaleTimeString()}] ${JSON.stringify(ResDetail)}`);
				
				switch (ResDetail.type) {
					case TYPE_EMUE.DATA:
						console.log('[App]ReceiveMessage=>\n' + JSON.stringify(ResDetail.data));
						break;
					case TYPE_EMUE.FUNCTION:
						console.log('[App]ReceiveMessage=>\n' + JSON.stringify(ResDetail.data));
						break;
					
				}
			}
		}
	}
</script>

<style lang="scss" scoped>
	.content {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background-color: #f8f9fa;
	}


	.iframe-container {
		overflow: hidden;
		background: white;
		position: relative;
		margin: 20rpx;
		border-radius: 20rpx;
		box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
		height: 800rpx;
		:deep(web-view) {
			width: 100% !important;
			height: 100% !important;
			border: none !important;
			outline: none !important;
			box-shadow: none !important;
		}
		
		:deep(iframe) {
			border: none !important;
			outline: none !important;
			box-shadow: none !important;
		}
	}

	.message-controls {
		padding: 20rpx;
		background: #f0f0f0;
		border-bottom: 2rpx solid #e0e0e0;
		display: flex;
		flex-direction: column;
		gap: 16rpx;
	}

	.control-title {
		font-size: 28rpx;
		color: #333;
		font-weight: 600;
		margin-bottom: 16rpx;
		padding-bottom: 16rpx;
		border-bottom: 2rpx solid #d0d0d0;
	}

	.control-buttons {
		display: flex;
		gap: 16rpx;
	}

	.btn-send {
		flex: 1;
		background: linear-gradient(135deg, #188eee 0%, #096dd9 100%);
		color: white;
		border: none;
		border-radius: 20rpx;
		padding: 20rpx 16rpx;
		font-size: 26rpx;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 4rpx 12rpx rgba(24, 142, 238, 0.3);

		&:active {
			transform: translateY(2rpx);
			box-shadow: 0 2rpx 8rpx rgba(24, 142, 238, 0.4);
		}

		&:hover {
			background: linear-gradient(135deg, #096dd9 0%, #0050b3 100%);
		}
	}

	.message-area {
		flex: 1;
		padding: 20rpx;
		background: white;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.message-title {
		font-size: 28rpx;
		color: #333;
		margin-bottom: 20rpx;
		display: block;
		font-weight: 600;
		border-bottom: 2rpx solid #f0f0f0;
		padding-bottom: 16rpx;
	}

	.message-list {
		flex: 1;
		overflow-y: auto;
		border: 2rpx solid #f0f0f0;
		border-radius: 16rpx;
		padding: 16rpx;
		background: #fafafa;

		&::-webkit-scrollbar {
			width: 8rpx;
		}

		&::-webkit-scrollbar-track {
			background: #f1f1f1;
			border-radius: 4rpx;
		}

		&::-webkit-scrollbar-thumb {
			background: #c1c1c1;
			border-radius: 4rpx;

			&:hover {
				background: #a8a8a8;
			}
		}
	}

	.message-item {
		background: white;
		padding: 20rpx;
		margin-bottom: 16rpx;
		border-radius: 12rpx;
		border-left: 6rpx solid #188eee;
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
		transition: all 0.3s ease;

		&:last-child {
			margin-bottom: 0;
		}

		&:hover {
			transform: translateX(4rpx);
			box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.12);
		}
	}

	.message-text {
		font-size: 24rpx;
		color: #333;
		word-break: break-all;
		line-height: 1.5;
		font-family: "Courier New", monospace;
	}

	@media (max-width: 768rpx) {
		.content {
			padding: 0;
		}

		.iframe-container {
			margin: 16rpx;
			border-radius: 16rpx;
		}

		.message-area {
			padding: 16rpx;
		}

		.message-item {
			padding: 16rpx;
			margin-bottom: 12rpx;
		}
	}
</style>
