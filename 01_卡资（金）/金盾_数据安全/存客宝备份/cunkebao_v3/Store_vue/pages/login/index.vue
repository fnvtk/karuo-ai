<template>
	<view class="login-page">
		<!-- 返回按钮 - 只在APP端账号登录模式下显示 -->
		<!-- #ifdef APP-PLUS -->
		<view class="back-btn" v-if="loginType === 'password'" @tap="goBack">
			<u-icon name="arrow-left" size="20" color="#333"></u-icon>
		</view>
		<!-- #endif -->
		
		<!-- 内容区域 -->
		<view class="content-area">
			<!-- App图标和名称 -->
			<view class="app-header">
				<view class="app-icon">
					<image src="/static/logo.png" mode="aspectFit" class="logo-image"></image>
				</view>
				<view class="app-name">AI数智员工</view>
			</view>
			
			<!-- 登录方式选择按钮 - 只在APP端免密登录模式下显示 -->
			<!-- #ifdef APP-PLUS -->
			<view class="login-type-buttons" v-if="loginType === 'code'">
				<!-- 免密登录按钮 -->
				<view 
					class="login-type-btn primary-btn" 
					:class="{ active: loginType === 'code' }"
					@tap="handleCodeLogin"
				>
					免密登录
				</view>
				
				<!-- 账号登录按钮 -->
				<view 
					class="login-type-btn secondary-btn" 
					:class="{ active: loginType === 'password' }"
					@tap="switchLoginType('password')"
				>
					账号登录
				</view>
			</view>
			<!-- #endif -->
			
			<!-- 账号登录表单 -->
			<view class="form-container" v-if="loginType === 'password'">
				<view class="form-title">账号登录</view>
				
				<view class="form-item">
					<view class="input-item">
						<u-input
							type="text" 
							v-model="phone" 
							maxlength="50" 
							placeholder="请输入账号"
							class="input-field"
							border="0"
						/>
					</view>
				</view>
				<view class="form-item">
					<view class="input-item">
						<u-input
							:type="passwordVisible ? 'text' : 'password'" 
							v-model="password" 
							placeholder="请输入密码"
							class="input-field"
							border="0"
						/>
						<view class="password-icon" @tap="passwordVisible = !passwordVisible">
							<u-icon :name="passwordVisible ? 'eye' : 'eye-off'" size="20" color="#999"></u-icon>
						</view>
					</view>
				</view>
			</view>
			
			<!-- 用户协议 -->
			<view class="agreement-container">
				<checkbox-group  @change="checkboxChange">
					<checkbox :value="agreement" :checked="agreement" class="agreement-checkbox" color="#4080ff" />
				</checkbox-group>
				<text class="agreement-text">阅读并同意</text>
				<text class="agreement-link" @tap="openAgreement('user')">《用户协议》</text>
				<text class="agreement-text">与</text>
				<text class="agreement-link" @tap="openAgreement('privacy')">《隐私权限》</text>
			</view>
			
			<!-- 登录按钮 - 只在账号登录模式下显示 -->
			<view 
				v-if="loginType === 'password'"
				class="login-btn" 
				:class="{ active: canLogin }" 
				@tap="handleLogin"
			>
				登录
			</view>
			
			<!-- 分隔线 -->
			<view class="divider" v-if="false">
				<view class="divider-line"></view>
				<text class="divider-text">或</text>
				<view class="divider-line"></view>
			</view>
			
			<!-- 第三方登录 -->
			<view class="third-party-login" v-if="false">
				<u-button
					text="使用微信登录"
					:custom-style="{backgroundColor: '#07c160', color: '#ffffff', marginBottom: '15px'}"
					shape="circle"
					@click="handleThirdLogin('wechat')"
					:ripple="true"
				>
					<template slot="icon">
						<u-icon name="weixin-fill" color="#ffffff" size="18" style="margin-right: 5px;"></u-icon>
					</template>
				</u-button>
				
				<u-button
					text="使用 Apple 登录"
					:custom-style="{backgroundColor: '#000000', color: '#ffffff'}"
					shape="circle"
					@click="handleThirdLogin('apple')"
					:ripple="true"
				>
					<template slot="icon">
						<u-icon name="apple-fill" color="#ffffff" size="18" style="margin-right: 5px;"></u-icon>
					</template>
				</u-button>
			</view>
			
			<!-- 联系我们 -->
			<view class="contact-us" @tap="contactUs">
				联系我们
			</view>
		</view>
	</view>
</template>

<script>
	// 引入API
	import { authApi } from '../../api/modules/auth';
	import { hasValidToken, redirectToChat } from '../../api/utils/auth';
	
	export default {
		data() {
			return {
				loginType: '',            // 登录类型，根据平台动态设置
				phone: '',                // 账号
				password: '',             // 密码
				passwordVisible: false,   // 密码是否可见
				agreement: true,         // 是否同意协议
				deviceId: ''              // 设备ID
			}
		},
		// 页面加载时检查token并获取设备ID
		onLoad() {
			// 根据平台设置默认登录类型
			// #ifdef APP-PLUS
			// APP端默认免密登录
			this.loginType = 'code';
			// #endif
			
			// #ifndef APP-PLUS
			// H5端默认账号密码登录
			this.loginType = 'password';
			// #endif
			
			this.checkTokenStatus();
			this.getDeviceId();
		},
		// 页面显示时检查token
		onShow() {
			this.checkTokenStatus();
		},
		computed: {
			// 验证账号是否有效（支持手机号、邮箱、用户名等格式）
			isAccountValid() {
				return this.phone && this.phone.trim().length >= 2;
			},
			// 验证是否可以登录
			canLogin() {
				if (!this.agreement) {
					return false;
				}
				
				if (this.loginType === 'code') {
					// 免密登录只需要同意协议和设备ID
					return !!this.deviceId;
				} else {
					// 账号登录需要账号和密码
					return this.isAccountValid && this.password && this.password.length >= 6;
				}
			}
		},
		methods: {
			// 检查token状态
			checkTokenStatus() {
				// 如果token有效，则跳转到聊天页面
				if (hasValidToken()) {
					redirectToChat();
				}
			},
			
			// 返回上一页或切换回免密登录
			goBack() {
				// #ifdef APP-PLUS
				// APP端在账号登录模式下，点击返回切换回免密登录
				if (this.loginType === 'password') {
					this.loginType = 'code';
					return;
				}
				// #endif
				uni.navigateBack();
			},
			
			// 切换登录类型
			switchLoginType(type) {
				this.loginType = type;
			},
			
			// 处理免密登录（点击免密登录按钮直接登录）
			handleCodeLogin() {
				// 如果当前不是免密登录类型，先切换
				if (this.loginType !== 'code') {
					this.loginType = 'code';
					// 等待一个事件循环，确保状态更新后再登录
					this.$nextTick(() => {
						this.handleLogin();
					});
				} else {
					// 如果已经是免密登录类型，直接登录
					this.handleLogin();
				}
			},
			
			// 使用Android原生MD5生成32位十六进制字符串
			generateMD5(input) {
				if (!input) return '';
				
				// #ifdef APP-PLUS
				try {
					if (typeof plus !== 'undefined' && plus.os && plus.os.name === 'Android') {
						// 使用Android原生MessageDigest生成MD5
						const MessageDigest = plus.android.importClass('java.security.MessageDigest');
						const md = MessageDigest.getInstance('MD5');
						
						// 将字符串转换为字节数组
						const String = plus.android.importClass('java.lang.String');
						const strObj = new String(input);
						const bytes = strObj.getBytes('UTF-8');
						
						// 更新消息摘要
						md.update(bytes);
						const digest = md.digest();
						
						// 将字节数组转换为十六进制字符串
						let hexString = '';
						for (let i = 0; i < digest.length; i++) {
							const byteValue = digest[i] & 0xFF;
							const hex = byteValue.toString(16).toUpperCase();
							hexString += hex.length === 1 ? '0' + hex : hex;
						}
						
						return hexString;
					}
				} catch (e) {
					console.warn('使用Android原生MD5失败，使用备用方案:', e);
				}
				// #endif
				
				// 备用方案：使用简单的哈希函数生成32位十六进制字符串
				let hash = 0;
				const str = String(input); // JavaScript的String构造函数
				
				for (let i = 0; i < str.length; i++) {
					const char = str.charCodeAt(i);
					hash = ((hash << 5) - hash) + char;
					hash = hash & hash; // 转换为32位整数
				}
				
				// 将哈希值转换为正数，然后转为16进制
				let hexString = Math.abs(hash).toString(16).toUpperCase();
				
				// 如果不够32位，使用输入字符串补充
				if (hexString.length < 32) {
					// 使用输入字符串的字符码填充
					let padding = '';
					for (let i = 0; padding.length < 32 - hexString.length; i++) {
						const charCode = str.charCodeAt(i % str.length);
						padding += charCode.toString(16).toUpperCase().padStart(2, '0');
					}
					hexString = (hexString + padding).substring(0, 32);
				} else if (hexString.length > 32) {
					hexString = hexString.substring(0, 32);
				}
				
				// 确保是32位，不足的话用0填充
				return hexString.padStart(32, '0').toUpperCase();
			},
			
			// 获取设备ID（Android平台 - 唯一且不变的设备标识，32位十六进制格式）
			getDeviceId() {
				// #ifdef APP-PLUS
				try {
					// 获取设备信息
					uni.getSystemInfo({
						success: (res) => {
							console.log('设备信息:', res);
							// 优先使用deviceId，如果没有则使用uuid或其他唯一标识
							this.deviceId = res.deviceId || res.uuid || res.system + '_' + res.model;
							console.log('APP设备ID:', this.deviceId);
						},
						fail: (err) => {
							console.error('获取设备信息失败:', err);
							// 如果获取失败，使用一个临时ID
							this.deviceId = 'unknown_device';
						}
					});
				} catch (err) {
					console.error('获取设备ID异常:', err);
					this.deviceId = 'unknown_device';
				}
				// #endif
				
				// #ifndef APP-PLUS
				// 非APP端不传设备ID
				this.deviceId = '';
				console.log('非APP端：不传设备ID');
				// #endif
			},
			
			checkboxChange(){
				this.agreement = !this.agreement
			},
			
			
			// 处理登录
			async handleLogin() {
				// 检查是否同意协议
				if (!this.agreement) {
					uni.showToast({
						title: '请阅读并同意用户协议和隐私政策',
						icon: 'none',
						duration: 2000
					});
					return;
				}
				
				if (!this.canLogin) {
					// 显示错误原因
					if (this.loginType === 'code' && !this.deviceId) {
						uni.showToast({
							title: '无法获取设备ID，请重试',
							icon: 'none'
						});
						// 重新获取设备ID
						this.getDeviceId();
					} else if (this.loginType === 'password') {
						if (!this.isAccountValid) {
							uni.showToast({
								title: '请输入账号',
								icon: 'none'
							});
						} else if (!this.password || this.password.length < 6) {
							uni.showToast({
								title: '密码不能少于6位',
								icon: 'none'
							});
						}
					}
					return;
				}
				
				uni.showLoading({
					title: '登录中...',
					mask: true
				});
				
				try {
					let response;
					
					if (this.loginType === 'code') {
						// 免密登录：使用设备ID调用接口
						console.log('免密登录，设备ID:', this.deviceId);
						response = await authApi.noPasswordLogin(this.deviceId);
					} else {
						// 账号登录：使用账号和密码，APP端传递设备ID，H5端不传
						console.log('账号登录，账号:', this.phone);
						console.log('账号登录，设备ID:', this.deviceId);
						response = await authApi.login(this.phone, this.password, this.deviceId);
					}
				
					console.log('登录响应:', response);

					if (response.code === 200) { // 成功code是200
						// 登录成功，缓存token信息
						const { token, member, token_expired } = response.data;
						
						// 存储token信息
						uni.setStorageSync('token', token);
						uni.setStorageSync('member', JSON.stringify(member));
						uni.setStorageSync('token_expired', token_expired);

						uni.showToast({
							title: '登录成功',
							icon: 'success'
						});
						
						// 登录成功后跳转到对话页面
						setTimeout(() => {
							redirectToChat();
						}, 1500);
					} else {
						// 登录失败，显示错误信息
						uni.showToast({
							title: response.msg || '登录失败，请重试',
							icon: 'none'
						});
					}
				} catch (err) {
					console.error('登录失败:', err);
					uni.showToast({
						title: '网络异常，请稍后重试',
						icon: 'none'
					});
				} finally {
					uni.hideLoading();
				}
			},
			
			// 第三方登录
			handleThirdLogin(platform) {
				// uni.showToast({
				// 	title: `${platform === 'wechat' ? '微信' : 'Apple'}登录功能暂未实现`,
				// 	icon: 'none'
				// });
			},
			
			// 打开协议
			openAgreement(type) {
				// uni.showToast({
				// 	title: `打开${type === 'user' ? '用户协议' : '隐私政策'}`,
				// 	icon: 'none'
				// });
			},
			
			// 联系我们
			contactUs() {
				uni.showToast({
					title: '联系方式: zhiqun@qq.com',
					icon: 'none',
					duration: 3000
				});
			}
		}
	}
</script>

<style lang="scss">
	.login-page {
		min-height: 100vh;
		background-color: #fff;
		display: flex;
		flex-direction: column;
		position: relative;
	}
	
	.back-btn {
		position: fixed;
		top: 30px;
		left: 20px;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 999;
		background-color: rgba(255, 255, 255, 0.9);
		border-radius: 50%;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}
	
	.content-area {
		flex: 1;
		padding: 60px 30px 30px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	
	.app-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 60px;
	}
	
	.app-icon {
		width: 80px;
		height: 80px;
		border-radius: 16px;
		margin-bottom: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}
	
	.logo-image {
		width: 100%;
		height: 100%;
		border-radius: 16px;
	}
	
	.app-name {
		font-size: 24px;
		font-weight: bold;
		color: #333;
	}
	
	.login-type-buttons {
		width: 100%;
		margin-bottom: 40px;
	}
	
	.login-type-btn {
		width: 100%;
		height: 50px;
		line-height: 50px;
		text-align: center;
		border-radius: 25px;
		font-size: 16px;
		margin-bottom: 15px;
		transition: all 0.3s;
	}
	
	.primary-btn {
		background-color: #4080ff;
		color: #ffffff;
		font-weight: 500;
	}
	
	.primary-btn.active {
		background-color: #4080ff;
		box-shadow: 0 4px 12px rgba(64, 128, 255, 0.3);
	}
	
	.secondary-btn {
		background-color: #f5f5f5;
		color: #333333;
	}
	
	.secondary-btn.active {
		background-color: #e8e8e8;
	}
	
	.form-container {
		width: 100%;
		margin-bottom: 20px;
	}
	
	.no-password-tip {
		text-align: center;
		color: #666;
		font-size: 14px;
		padding: 20px 0;
	}
	
	.form-title {
		font-size: 18px;
		font-weight: bold;
		color: #333;
		margin-bottom: 30px;
		text-align: left;
	}
	
	.tab-container {
		display: flex;
		justify-content: space-between;
		margin-bottom: 20px;
		position: relative;
	}
	
	.tab-item {
		position: relative;
		text-align: center;
		padding: 10px 0;
		font-size: 16px;
		color: #666;
		flex: 1;
	}
	
	.tab-item.active {
		color: #4080ff;
		font-weight: bold;
	}
	
	.tab-item.active::after {
		content: '';
		position: absolute;
		bottom: -2px;
		left: 25%;
		width: 50%;
		height: 3px;
		background-color: #4080ff;
		border-radius: 2px;
	}
	
	.tip-text {
		font-size: 14px;
		color: #666;
		margin-bottom: 20px;
	}
	
	.input-item {
		display: flex;
		align-items: center;
		border-bottom: 1px solid #eee;
		padding: 12px 0;
		height: 24px;
	}
	
	.input-prefix {
		color: #333;
		margin-right: 10px;
		padding-right: 10px;
		border-right: 1px solid #eee;
		font-size: 14px;
	}
	
	.input-field {
		flex: 1;
		height: 24px;
		font-size: 15px;
		width: 100%;
	}
	
	.code-input-box {
		position: relative;
	}
	
	.send-code-btn {
		position: absolute;
		right: 0;
		background-color: #4080ff;
		color: #fff;
		padding: 6px 12px;
		border-radius: 4px;
		font-size: 13px;
		white-space: nowrap;
	}
	
	.send-code-btn.disabled {
		background-color: #ccc;
		color: #999;
	}
	
	.password-icon {
		padding: 0 5px;
		height: 100%;
		display: flex;
		align-items: center;
	}
	
	.agreement-container {
		display: flex;
		align-items: center;
		margin: 15px 0;
	}
	
	.agreement-checkbox {
		transform: scale(0.8);
		margin-right: 5px;
	}
	
	.agreement-text {
		font-size: 13px;
		color: #666;
	}
	
	.agreement-link {
		font-size: 13px;
		color: #4080ff;
	}
	
	.login-btn {
		width: 100%;
		height: 50px;
		line-height: 50px;
		text-align: center;
		background-color: #dddddd;
		color: #ffffff;
		border-radius: 25px;
		margin: 30px 0 20px;
		font-size: 16px;
		font-weight: 500;
		transition: background-color 0.3s;
	}
	
	.login-btn.active {
		background-color: #4080ff;
	}
	
	.divider {
		display: flex;
		align-items: center;
		margin: 20px 0;
	}
	
	.divider-line {
		flex: 1;
		height: 1px;
		background-color: #eee;
	}
	
	.divider-text {
		color: #999;
		padding: 0 15px;
		font-size: 14px;
	}
	
	.third-party-login {
		margin: 20px 0;
	}
	
	.contact-us {
		text-align: center;
		color: #999;
		font-size: 14px;
		margin-top: 40px;
	}
</style> 