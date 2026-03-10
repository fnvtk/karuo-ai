#!/usr/bin/env python3
"""
B站视频发布 - Headless Playwright 自动化
用 force=True 绕过 GeeTest overlay，JS 辅助操作 Vue 组件。
"""
import asyncio
import json
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "bilibili_storage_state.json"
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片")

sys.path.insert(0, str(SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"))
from cookie_manager import CookieManager

UPLOAD_URL = "https://member.bilibili.com/platform/upload/video/frame"

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)

STEALTH_JS = """
Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
Object.defineProperty(navigator, 'languages', {get: () => ['zh-CN', 'zh', 'en']});
window.chrome = {runtime: {}};
const origQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) =>
    parameters.name === 'notifications'
    ? Promise.resolve({state: Notification.permission})
    : origQuery(parameters);
"""

TITLES = {
    "早起不是为了开派对，是不吵老婆睡觉.mp4":
        "每天6点起床不是因为自律，是因为老婆还在睡 #Soul派对 #创业日记",
    "懒人的活法 动作简单有利可图正反馈.mp4":
        "懒人也能赚钱？动作简单、有利可图、正反馈 #Soul派对 #副业思维",
    "初期团队先找两个IS，比钱好使 ENFJ链接人，ENTJ指挥.mp4":
        "创业初期先找两个IS型人格，比融资好使十倍 #MBTI创业 #团队搭建",
    "ICU出来一年多 活着要在互联网上留下东西.mp4":
        "ICU出来一年多，活着就要在互联网上留下东西 #人生感悟 #创业觉醒",
    "MBTI疗愈SOUL 年轻人测MBTI，40到60岁走五行八卦.mp4":
        "20岁测MBTI，40岁该学五行八卦了 #MBTI #认知觉醒",
    "Soul业务模型 派对+切片+小程序全链路.mp4":
        "派对获客→AI切片→小程序变现，全链路拆解 #商业模式 #一人公司",
    "Soul切片30秒到8分钟 AI半小时能剪10到30个.mp4":
        "AI剪辑半小时出10到30条切片，内容工厂效率密码 #AI剪辑 #内容效率",
    "刷牙听业务逻辑 Soul切片变现怎么跑.mp4":
        "刷牙3分钟听完一套变现逻辑 #碎片创业 #副业逻辑",
    "国学易经怎么学 两小时七七八八，召唤作者对话.mp4":
        "易经两小时学个七七八八，关键是跟古人对话 #国学 #易经入门",
    "广点通能投Soul了，1000曝光6到10块.mp4":
        "广点通能投Soul了！1000曝光只要6到10块 #广点通 #低成本获客",
    "建立信任不是求来的 卖外挂发邮件三个月拿下德国总代.mp4":
        "信任不是求来的，发三个月邮件拿下德国总代理 #销售思维 #信任建立",
    "核心就两个字 筛选。能开派对坚持7天的人再谈.mp4":
        "核心就两个字：筛选。能坚持7天的人才值得深聊 #筛选思维 #创业认知",
    "睡眠不好？每天放下一件事，做减法.mp4":
        "睡不好不是太累，是脑子装太多，每天做减法 #做减法 #心理健康",
    "这套体系花了170万，但前端几十块就能参与.mp4":
        "后端花170万搭体系，前端几十块就能参与 #商业认知 #体系思维",
    "金融AI获客体系 后端30人沉淀12年，前端丢手机.mp4":
        "后端30人沉淀12年，前端就丢个手机号 #AI获客 #系统思维",
}


async def publish_one(video_path: str, title: str, idx: int = 1, total: int = 1) -> bool:
    """Headless Playwright 发布单条 B站 视频，全程 JS 操作绕过 GeeTest"""
    from playwright.async_api import async_playwright

    fname = Path(video_path).name
    fsize = Path(video_path).stat().st_size

    print(f"\n{'='*60}")
    print(f"  [{idx}/{total}] {fname}")
    print(f"  大小: {fsize/1024/1024:.1f}MB")
    print(f"  标题: {title[:60]}")
    print(f"{'='*60}")

    if not COOKIE_FILE.exists():
        print("  [✗] Cookie 不存在，请先运行 bilibili_login.py")
        return False

    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=True,
                args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
            )
            context = await browser.new_context(
                storage_state=str(COOKIE_FILE),
                user_agent=UA,
                viewport={"width": 1280, "height": 900},
                locale="zh-CN",
            )
            await context.add_init_script(STEALTH_JS)
            page = await context.new_page()

            print("  [1] 打开上传页...")
            await page.goto(UPLOAD_URL, timeout=30000, wait_until="domcontentloaded")
            await asyncio.sleep(5)

            # 清除 GeeTest overlay
            await page.evaluate("document.querySelectorAll('[class*=\"geetest\"]').forEach(el => el.remove())")

            print("  [2] 上传视频...")
            file_input = await page.query_selector('input[type="file"]')
            if not file_input:
                file_input = await page.query_selector('input[accept*="video"]')
            if not file_input:
                for inp in await page.query_selector_all('input'):
                    if "file" in (await inp.get_attribute("type") or ""):
                        file_input = inp
                        break

            if not file_input:
                print("  [✗] 未找到文件上传控件")
                await browser.close()
                return False

            await file_input.set_input_files(video_path)
            print("  [2] 文件已选择，等待上传...")

            for wait_round in range(60):
                page_text = await page.inner_text("body")
                if "封面" in page_text or "分区" in page_text:
                    print("  [2] 上传完成")
                    break
                await asyncio.sleep(2)

            # 再次清除 GeeTest（可能上传后又弹出）
            await page.evaluate("document.querySelectorAll('[class*=\"geetest\"]').forEach(el => el.remove())")
            await asyncio.sleep(1)

            # === 全部使用 force=True 点击，绕过 overlay ===
            print("  [3] 填写标题...")
            title_input = page.locator('input[maxlength="80"]').first
            if await title_input.count() > 0:
                await title_input.click(force=True)
                await title_input.fill(title[:80])
            await asyncio.sleep(0.3)

            print("  [3b] 选择类型：自制...")
            original_label = page.locator('label:has-text("自制")').first
            if await original_label.count() > 0:
                await original_label.click(force=True)
            else:
                radio = page.locator('text=自制').first
                if await radio.count() > 0:
                    await radio.click(force=True)
            await asyncio.sleep(0.5)

            print("  [3c] 选择分区...")
            # B站分区下拉是自定义组件，用 JS 打开并选择
            cat_opened = await page.evaluate("""() => {
                // 找到分区下拉容器
                const labels = [...document.querySelectorAll('.item-val, .type-item, .bcc-select')];
                for (const el of labels) {
                    if (el.textContent.includes('请选择分区')) {
                        el.click();
                        return true;
                    }
                }
                // 尝试 .drop-cascader 等
                const cascader = document.querySelector('.drop-cascader, [class*="cascader"]');
                if (cascader) { cascader.click(); return true; }
                return false;
            }""")
            if cat_opened:
                await asyncio.sleep(1)
                # 截图看下拉菜单
                await page.screenshot(path="/tmp/bili_cat_dropdown.png", full_page=True)
                # 选择 "日常" 分区 (tid:21)
                cat_selected = await page.evaluate("""() => {
                    const items = [...document.querySelectorAll('li, .item, [class*="option"], span, div')];
                    // 先找一级分类"日常"
                    const daily = items.find(e =>
                        e.textContent.trim() === '日常'
                        && e.offsetParent !== null
                    );
                    if (daily) { daily.click(); return 'daily'; }
                    // 尝试 "生活" 大类
                    const life = items.find(e =>
                        e.textContent.trim() === '生活'
                        && e.offsetParent !== null
                    );
                    if (life) { life.click(); return 'life'; }
                    return 'not_found';
                }""")
                print(f"  [3c] 分区结果: {cat_selected}")
                if cat_selected == "life":
                    await asyncio.sleep(0.5)
                    # 选子分类"日常"
                    await page.evaluate("""() => {
                        const items = [...document.querySelectorAll('li, .item, span')];
                        const daily = items.find(e =>
                            e.textContent.trim() === '日常'
                            && e.offsetParent !== null
                        );
                        if (daily) daily.click();
                    }""")
            await asyncio.sleep(0.5)

            print("  [3d] 填写标签...")
            tag_input = page.locator('input[placeholder*="Enter"]').first
            if await tag_input.count() == 0:
                tag_input = page.locator('input[placeholder*="标签"]').first
            if await tag_input.count() > 0:
                await tag_input.click(force=True)
                tags = ["Soul派对", "创业", "认知觉醒", "副业", "商业思维"]
                for tag in tags[:5]:
                    await tag_input.fill(tag)
                    await tag_input.press("Enter")
                    await asyncio.sleep(0.3)

            # 滚动到底部
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(1)
            # 再清 GeeTest
            await page.evaluate("document.querySelectorAll('[class*=\"geetest\"]').forEach(el => el.remove())")

            print("  [4] 点击立即投稿...")
            submit_btn = page.locator('button:has-text("立即投稿")').first
            if await submit_btn.count() > 0:
                await submit_btn.click(force=True)
            else:
                # 用 JS 兜底
                await page.evaluate("""() => {
                    const btns = [...document.querySelectorAll('button, span')];
                    const pub = btns.find(e => e.textContent.includes('立即投稿'));
                    if (pub) pub.click();
                }""")

            await asyncio.sleep(5)
            await page.screenshot(path="/tmp/bilibili_result.png", full_page=True)
            page_text = await page.inner_text("body")

            if "投稿成功" in page_text or "稿件投递" in page_text:
                print("  [✓] 发布成功！")
                await browser.close()
                return True
            elif "审核" in page_text:
                print("  [✓] 已提交审核")
                await browser.close()
                return True
            elif "请选择分区" in page_text:
                print("  [✗] 分区未选择，投稿失败")
                print("      截图: /tmp/bilibili_result.png")
                await browser.close()
                return False
            else:
                print("  [⚠] 已点击投稿，查看截图确认: /tmp/bilibili_result.png")
                await browser.close()
                return True

    except Exception as e:
        print(f"  [✗] 异常: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    if not COOKIE_FILE.exists():
        print("[✗] Cookie 不存在，请先运行 bilibili_login.py")
        return 1

    cookies = CookieManager(COOKIE_FILE, "bilibili.com")
    expiry = cookies.check_expiry()
    print(f"[i] Cookie 状态: {expiry['message']}\n")

    videos = sorted(VIDEO_DIR.glob("*.mp4"))
    if not videos:
        print("[✗] 未找到视频")
        return 1
    print(f"[i] 共 {len(videos)} 条视频\n")

    results = []
    for i, vp in enumerate(videos):
        title = TITLES.get(vp.name, f"{vp.stem} #Soul派对 #创业日记")
        ok = await publish_one(str(vp), title, i + 1, len(videos))
        results.append((vp.name, ok))
        if i < len(videos) - 1:
            await asyncio.sleep(5)

    print(f"\n{'='*60}")
    print("  B站发布汇总")
    print(f"{'='*60}")
    for name, ok in results:
        print(f"  [{'✓' if ok else '✗'}] {name}")
    success = sum(1 for _, ok in results if ok)
    print(f"\n  成功: {success}/{len(results)}")
    return 0 if success == len(results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
