<template>
	<view class="login-container" v-if="show">
		<view class="login-wrapper">
			<!-- 标签切换 -->
			<u-tabs
				:list="tabList"
				:current="currentTab === 'verification' ? 0 : 1"
				@change="tabChange"
				:is-scroll="false"
				inactive-color="#666"
				active-color="#333"
				item-style="height: 45px;"
				bg-color="#f5f7fa"
			></u-tabs>
			
			<!-- 提示文本 -->
			<view class="tip-text">
				您所在地区仅支持 手机号 / 微信 / Apple 登录
			</view>
			
			<!-- 手机号输入 -->
			<u-input
				v-model="phoneNumber"
				:clearable="true"
				type="number"
				placeholder="手机号"
				prefixIcon="phone"
				:border="true"
				maxlength="11"
			>
				<template slot="prefix">
					<text style="margin-right: 10px; color: #333; padding-right: 10px; border-right: 1px solid #eee">+86</text>
				</template>
			</u-input>
			
			<!-- 验证码或密码输入 -->
			<view v-if="currentTab === 'verification'" style="margin-top: 15px;">
				<u-input
					v-model="verificationCode"
					:clearable="true"
					type="number"
					placeholder="验证码"
					:border="true"
					maxlength="6"
				>
					<template slot="suffix">
						<u-button
							size="mini"
							:text="codeSending ? `${countDown}秒后重发` : '发送验证码'"
							type="primary"
							:disabled="codeSending || !phoneNumber || phoneNumber.length !== 11"
							@click="sendVerificationCode"
							style="margin-left: 5px; min-width: 100px;"
						></u-button>
					</template>
				</u-input>
			</view>
			
			<view v-if="currentTab === 'password'" style="margin-top: 15px;">
				<u-input
					v-model="password"
					type="password"
					:password="!showPassword"
					placeholder="密码"
					:border="true"
				>
					<template slot="suffix">
						<u-icon
							:name="showPassword ? 'eye-fill' : 'eye-off'"
							size="22"
							color="#c0c4cc"
							@click="showPassword = !showPassword"
						></u-icon>
					</template>
				</u-input>
			</view>
			
			<!-- 用户协议 -->
			<view class="agreement-container">
				<u-checkbox
					v-model="agreedTerms"
					shape="circle"
					active-color="#4080ff"
				></u-checkbox>
				<text class="agreement-text">已阅读并同意</text>
				<text class="agreement-link" @tap="openProtocol">用户协议</text>
				<text class="agreement-text">与</text>
				<text class="agreement-link" @tap="openPrivacy">隐私政策</text>
			</view>
			
			<!-- 登录按钮 -->
			<u-button 
				text="登录" 
				type="primary" 
				shape="circle"
				:disabled="!isFormValid"
				@click="handleLogin"
				:custom-style="{marginTop: '20px', marginBottom: '25px'}"
			></u-button>
			
			<!-- 分隔线 -->
			<u-divider text="或" :hairline="true"></u-divider>
			
			<!-- 第三方登录 -->
			<view class="third-party-login">
				<u-button
					text="使用微信登录"
					shape="circle"
					@click="handleWechatLogin"
					:ripple="true"
					:custom-style="{backgroundColor: '#07c160', color: '#ffffff', marginBottom: '15px'}"
				>
					<template slot="default">
						<u-icon name="weixin-fill" color="#ffffff" size="18" style="margin-right: 5px;"></u-icon>
						<text>使用微信登录</text>
					</template>
				</u-button>
				
				<u-button
					text="使用 Apple 登录"
					shape="circle"
					@click="handleAppleLogin"
					:ripple="true"
					:custom-style="{backgroundColor: '#000000', color: '#ffffff'}"
				>
					<template slot="default">
						<u-icon name="apple-fill" color="#ffffff" size="18" style="margin-right: 5px;"></u-icon>
						<text>使用 Apple 登录</text>
					</template>
				</u-button>
			</view>
			
			<!-- 联系我们 -->
			<view class="contact-us" @tap="handleContact">
				联系我们
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'LoginRegister',
		props: {
			show: {
				type: Boolean,
				default: false
			}
		},
		data() {
			return {
				tabList: [{name: '验证码登录'}, {name: '密码登录'}],
				currentTab: 'verification', // verification 或 password
				phoneNumber: '',
				verificationCode: '',
				password: '',
				showPassword: false,
				agreedTerms: false,
				codeSending: false,
				countDown: 60
			}
		},
		computed: {
			isFormValid() {
				const phoneValid = this.phoneNumber && this.phoneNumber.length === 11;
				
				if (this.currentTab === 'verification') {
					return phoneValid && this.verificationCode && this.agreedTerms;
				} else {
					return phoneValid && this.password && this.agreedTerms;
				}
			}
		},
		methods: {
			tabChange(index) {
				this.currentTab = index === 0 ? 'verification' : 'password';
			},
			openProtocol() {
				uni.showToast({
					title: '打开用户协议',
					icon: 'none'
				});
			},
			openPrivacy() {
				uni.showToast({
					title: '打开隐私政策',
					icon: 'none'
				});
			},
			sendVerificationCode() {
				if (this.codeSending) return;
				if (!this.phoneNumber || this.phoneNumber.length !== 11) {
					uni.showToast({
						title: '请输入正确的手机号',
						icon: 'none'
					});
					return;
				}
				
				this.codeSending = true;
				this.countDown = 60;
				
				// 模拟发送验证码
				uni.showToast({
					title: '验证码已发送',
					icon: 'success'
				});
				
				// 倒计时
				const timer = setInterval(() => {
					this.countDown--;
					if (this.countDown <= 0) {
						clearInterval(timer);
						this.codeSending = false;
					}
				}, 1000);
			},
			handleLogin() {
				if (!this.isFormValid) return;
				
				// 验证手机号格式
				if (!/^1\d{10}$/.test(this.phoneNumber)) {
					uni.showToast({
						title: '请输入正确的手机号',
						icon: 'none'
					});
					return;
				}
				
				// 根据当前登录方式验证
				if (this.currentTab === 'verification') {
					if (!this.verificationCode || this.verificationCode.length !== 6) {
						uni.showToast({
							title: '请输入6位验证码',
							icon: 'none'
						});
						return;
					}
				} else {
					if (!this.password || this.password.length < 6) {
						uni.showToast({
							title: '密码不能少于6位',
							icon: 'none'
						});
						return;
					}
				}
				
				// 模拟登录过程
				uni.showLoading({
					title: '登录中...'
				});
				
				setTimeout(() => {
					uni.hideLoading();
					uni.showToast({
						title: '登录成功',
						icon: 'success',
						duration: 1500,
						success: () => {
							// 登录成功后关闭登录页
							setTimeout(() => {
								this.$emit('close');
								
								// 模拟返回用户信息
								const userInfo = {
									id: '123456',
									nickname: '用户_' + Math.floor(Math.random() * 10000),
									phone: this.phoneNumber,
									avatar: ''
								};
								
								this.$emit('login-success', userInfo);
							}, 1500);
						}
					});
				}, 1500);
			},
			handleWechatLogin() {
				uni.showToast({
					title: '微信登录功能暂未实现',
					icon: 'none'
				});
			},
			handleAppleLogin() {
				uni.showToast({
					title: 'Apple登录功能暂未实现',
					icon: 'none'
				});
			},
			handleContact() {
				uni.showToast({
					title: '联系方式: support@example.com',
					icon: 'none'
				});
			}
		}
	}
</script>

<style lang="scss">
	.login-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 10001;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	
	.login-wrapper {
		width: 100%;
		height: 100%;
		background-color: #fff;
		border-radius: 0;
		padding: 20px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		animation: slideInFromBottom 0.3s ease;
	}
	
	@keyframes slideInFromBottom {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
	
	.tip-text {
		font-size: 14px;
		color: #666;
		margin: 15px 0 20px;
		line-height: 1.5;
	}
	
	.agreement-container {
		display: flex;
		align-items: center;
		margin-top: 15px;
	}
	
	.agreement-text {
		font-size: 12px;
		color: #999;
		margin-left: 5px;
	}
	
	.agreement-link {
		font-size: 12px;
		color: #4080ff;
		margin: 0 4px;
	}
	
	.third-party-login {
		display: flex;
		flex-direction: column;
		margin: 20px 0 30px;
	}
	
	.contact-us {
		text-align: center;
		color: #666;
		font-size: 14px;
		margin-top: auto;
		padding: 15px 0;
	}
</style> 