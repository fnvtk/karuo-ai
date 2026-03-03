/**
 * 在已打开的飞书妙记页面（cunkebao.feishu.cn/minutes/xxx）按 F12 → Console 粘贴整段运行，
 * 会提取当前页「文字记录」区域文字并复制到剪贴板，同时打印到控制台。
 */
(function () {
  function getText() {
    const candidates = document.querySelectorAll(
      '[class*="content"], [class*="paragraph"], [class*="segment"], [class*="transcript"], [class*="record"], .ne-doc-body, [role="main"]'
    );
    for (const el of candidates) {
      const t = (el.innerText || el.textContent || "").trim();
      if (t.length > 800 && (t.includes("：") || t.includes(":") || /\d{1,2}:\d{2}:\d{2}/.test(t))) {
        return t;
      }
    }
    return (document.body && (document.body.innerText || document.body.textContent)) || "";
  }
  const text = getText().trim();
  if (!text) {
    console.warn("未找到长文本，请先点击「文字记录」选项卡再运行本脚本。");
    return;
  }
  const title = (document.title || "妙记").replace(/\s*\|\s*.*$/, "");
  const out = "标题: " + title + "\n\n文字记录:\n\n" + text;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(out).then(function () {
      console.log("已复制到剪贴板，共 " + out.length + " 字。可粘贴到记事本保存。");
    }).catch(function () {
      console.log(out.slice(0, 500) + "\n...(共 " + out.length + " 字，请手动选择上方输出复制)");
    });
  } else {
    console.log(out.slice(0, 2000) + "\n...(共 " + out.length + " 字)");
  }
  console.log("前 500 字预览:", out.slice(0, 500));
})();
