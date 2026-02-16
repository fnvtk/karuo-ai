<template>
	<web-view 
		ref="webviewRef"
		:src="baseUrl" 
		@message="handleMessage"
		:fullscreen="true"
	></web-view>
</template>

<script>
	import { getTopSafeAreaHeightAsync } from '@utils/common';
	import { checkUpdate, downloadAndInstallUpdate, showUpdateDialog } from '@utils/updateService';
	const TYPE_EMUE = {
		CONNECT: 0,
		DATA: 1,
		FUNCTION: 2,
		CONFIG: 3,
	}
	export default {
		data() {
			return {
				baseUrl: 'https://kr-phone.quwanzhi.com', 
				iframeUrl: '', // 动态构建的 URL
				receivedMessages: [],
				messageId: 0,
				urlParams: {},
				appVersion: '1.0.0',
				updateApiUrl: 'https://ckbapi.quwanzhi.com/app/update?type=ai_store' // 更新检查API地址
			}
		},
		onLoad() {
			// this.sendBaseConfig()
			// 检查更新
			// this.checkAppUpdate()
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
			async sendBaseConfig() {
				const message = {
					type: TYPE_EMUE.CONFIG, 
					data: {
						paddingTop: await getTopSafeAreaHeightAsync(),
						appId: '1234567890',
						appName: '存客宝',
						appVersion: this.appVersion,
						isAppMode:true
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
						if (ResDetail.data.action === 'clearCache') {
							this.clearCache();
						}
						break;
					
				}
			},
			clearCache() {
				// 清除 webview 缓存
				if (this.$refs.webviewRef) {
					// 重新加载 webview
					this.$refs.webviewRef.reload();
				}
				// 清除 webview 缓存数据
				uni.clearStorage({
					success: () => {
						console.log('Webview 缓存已清除');
					}
				});
			},
			
			/**
			 * 检查应用更新
			 */
			checkAppUpdate() {
				console.log('检查应用更新...');
				checkUpdate({
					currentVersion: this.appVersion,
					apiUrl: this.updateApiUrl,
					onSuccess: (result) => {
						if (result.hasUpdate) {
							console.log(`发现新版本: ${result.version}`);
							// 显示更新对话框
							showUpdateDialog(result, () => {
								this.downloadUpdate(result.downloadUrl);
							});
						} else {
							console.log('当前已是最新版本');
						}
					},
					onError: (errorMsg, error) => {
						console.error(`检查更新失败: ${errorMsg}`, error);
					}
				});
			},
			
			/**
			 * 下载并安装更新
			 * @param {String} downloadUrl 下载地址
			 */
			downloadUpdate(downloadUrl) {
				// 显示下载进度
				uni.showLoading({
					title: '正在下载更新...',
					mask: true
				});
				
				downloadAndInstallUpdate({
					downloadUrl,
					onProgress: (progress) => {
						uni.showLoading({
							title: `正在下载更新...${progress}%`,
							mask: true
						});
					},
					onSuccess: () => {
						uni.hideLoading();
						// 安装成功或跳转到应用商店成功
						console.log('更新下载成功，准备安装');
					},
					onError: (errorMsg, error) => {
						uni.hideLoading();
						console.error(`更新失败: ${errorMsg}`, error);
						uni.showToast({
							title: `更新失败: ${errorMsg}`,
							icon: 'none',
							duration: 2000
						});
					}
				});
			}
		}
	}
</script>