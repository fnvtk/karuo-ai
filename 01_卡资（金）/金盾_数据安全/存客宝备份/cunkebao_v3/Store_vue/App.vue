<script>
	import { hasValidToken, redirectToLogin } from './api/utils/auth';
	
	export default {
		onLaunch: function() {
			console.log('App Launch');
			// 全局检查token
			this.checkToken();
		},
		onShow: function() {
			console.log('App Show');
			// 应用恢复时再次检查token
			this.checkToken();
		},
		onHide: function() {
			console.log('App Hide');
		},
		methods: {
			// 检查token是否有效并处理跳转
			checkToken() {
				// 获取当前页面
				const pages = getCurrentPages();
				const currentPage = pages.length ? pages[pages.length - 1] : null;
				
				// 如果token无效且不在登录页面，则跳转到登录页面
				if (!hasValidToken() && currentPage && currentPage.route !== 'pages/login/index') {
					redirectToLogin();
				}
			}
		}
	}
	
	export function getSafeAreaHeight() {
	  // 1. 优先使用 CSS 环境变量
	  if (CSS.supports("padding-top", "env(safe-area-inset-top)")) {
	    const safeAreaTop = getComputedStyle(
	      document.documentElement,
	    ).getPropertyValue("env(safe-area-inset-top)");
	    const height = parseInt(safeAreaTop) || 0;
	    if (height > 0) return height;
	  }
	
	  // 2. 设备检测
	  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
	  const isAndroid = /Android/.test(navigator.userAgent);
	  const isAppMode = getSetting("isAppMode");
	  if (isIOS && isAppMode) {
	    // iOS 设备
	    const isIPhoneX = window.screen.height >= 812;
	    return isIPhoneX ? 44 : 20;
	  } else if (isAndroid) {
	    // Android 设备
	    return 24;
	  }
	
	  // 3. 默认值
	  return 0;
	}
	
</script>

<style lang="scss">
	/*每个页面公共css */
	@import 'uview-ui/index.scss';
	/* 引入阿里图标库 */
	@import '/static/iconfont/iconfont.css';

	/* 页面通用样式 */
	page {
		font-size: 28rpx;
		color: #333;
		background-color: #fff;
	}

	/* 安全区适配 */
	// .safe-area-inset-bottom {
	// 	padding-bottom: constant(safe-area-inset-bottom);
	// 	padding-bottom: env(safe-area-inset-bottom);
	// }
	
	/* 字体图标支持 */
	@font-face {
		font-family: "SF Pro Display";
		src: url("https://sf.abarba.me/SF-Pro-Display-Regular.otf");
	}
</style>
