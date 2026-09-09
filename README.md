# 随心起卦 v2.1

Pip-Boy 风格桌面起卦。多种取数方式 + 个人 LLM API 解读（也可仅本地起卦解析）。

## 给朋友：从 GitHub 下载 Win / Mac

1. 打开仓库 **Releases** 页，选最新版本（如 `v2.1.0`）。
2. Windows：下载 `随心起卦-*-win-*.exe`（安装版）或 `*-win-portable.exe`（免安装）。
3. macOS：下载 `随心起卦-*-mac-*.dmg`（或 `.zip`）。未签名时首次打开需在「系统设置 → 隐私与安全性」允许。

**维护者如何发布一次：**

```bash
git tag v2.1.0
git push origin v2.1.0
```

推送 `v*` tag 后，GitHub Actions 会打 Win + Mac 包，并自动挂到该 tag 的 Release。也可在 Actions 里手动 `workflow_dispatch` 只生成 Artifacts（不挂 Release）。

## 安装包（本机）

| 平台 | 命令 | 产物目录 |
|------|------|----------|
| Windows | `npm run dist:win` | `release/`（安装版 `.exe` + 便携版） |
| macOS | `npm run dist:mac`（需在 Mac 上执行） | `release/`（`.dmg` / `.zip`） |

**Windows 捷径与黑窗：**

- **NSIS 安装版**：安装时会**始终**创建桌面 + 开始菜单捷径。
- **解压 / 便携版**：首次运行后自动在桌面建捷径；也可托盘右键「创建桌面捷径」。
- 程序目录内附带 `启动随心起卦.vbs`：双击可**无 CMD 黑窗**启动。

## 开发

```bash
npm install
npm run dev
```

托盘图标左键显示面板。设置里填写 API Key / Base URL / 模型名。

## 起卦方式

| 方式 | 取数 |
|------|------|
| 时间 | 年月日时 |
| 数字 | 三数 / 六爻铜钱 |
| 地理 | GPS / 五大洲→国家→城市 / 地图 / 手输 |
| 天气 | 温湿气压 |
| 颜色 | 蜂巢色盘 → 实际 RGB |
| 随机 | 本机熵随机取数 |

梅花 / 六爻 / 奇门均支持上述取数（奇门数字/颜色/随机用于定局）。

## 隐私与 API Key（上 GitHub 也不会带你的 Key）

| 位置 | 是否含 Key |
|------|------------|
| Git 仓库源码 / `.gitignore` 忽略项 | **否**（Key 不在项目目录） |
| 安装包 / CI Release 产物 | **否**（只打包 `dist` + `dist-electron`） |
| 分享 PNG / 导出配置 JSON | **否**（导出强制 `apiKey: ""`） |
| 本机 `%AppData%...\suixin-store.json` | **是**（仅本机；勿把该文件拷进仓库或发给别人） |

发给别人前：设置 →「清除 API Key」。错误日志会脱敏常见 Key 形态，但仍勿分享 `%AppData%` 目录。

## 代码签名（可选）

当前 `package.json` 已设 `"forceCodeSigning": false` 与 Windows `"signAndEditExecutable": false`，本地打包**不会强制签名**。

| 平台 | 说明 |
|------|------|
| Windows | 未签名可能触发 SmartScreen。正式分发需证书与 `CSC_LINK` 等。 |
| macOS | 减少 Gatekeeper 阻拦需 Apple 证书与公证。当前适合自用 / 朋友间测试包。 |

不签名也可自用；发给他人时建议说明来源。
