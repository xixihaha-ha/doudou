<p align="center">
  <img src="./public/doudou-logo.png" width="120" height="120" alt="doudou">
</p>

<h1 align="center">doudou</h1>

<p align="center">Windows 桌面 AI 助手：实时语音转写、回答辅助和屏幕分析。</p>

**无需 VS Code。** 可以从 PowerShell 启动，也可以打包成 EXE 后双击使用。

## 功能

- 豆包双向流式语音识别，边说边显示字幕；也可选择 Groq / OpenAI 分段转写。
- 根据问题、简历和背景资料生成回答，支持聊天与历史记录。
- 截图分析、悬浮窗、透明度调整、全局快捷键和托盘管理。

## 从源码启动

准备 Windows、Python 3.10+ 和 Node.js 22.12+，在项目根目录打开 PowerShell：

```powershell
npm.cmd install
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-sidecar.txt
npm.cmd run build
npm.cmd run electron
```

安装完成后，日常启动只需运行：

```powershell
npm.cmd run electron
```

Electron 会同时启动 Python 后台。修改界面后，重新执行 `npm.cmd run build` 并重启应用。

## 配置与使用

1. 打开「设置 → API 密钥 → 实时转写」，选择「豆包 · 双向流式识别」。
2. 在 [豆包语音控制台](https://console.volcengine.com/speech) 开通流式识别模型 2.0，创建 API Key，在应用中填写并保存。
3. 选择已开通的小时版或并发版。修改豆包配置后，暂停再开始聆听。
4. 在「回答」中配置至少一家服务商的密钥和模型：DeepSeek、OpenAI、Anthropic、Gemini、Groq 或 OpenRouter。
5. 播放含语音的音频，按 `F2` 开始聆听。

默认采集**系统播放的声音**。需要识别麦克风时，在音频设备设置中选择对应输入设备。豆包语音密钥与火山方舟聊天模型密钥不同。

打开聊天或设置时，窗口会允许输入；若仍无法打字，可在托盘菜单开启「输入模式」。关闭窗口会隐藏到托盘，彻底退出请在托盘菜单选择「退出」。

## 打包为 EXE

先完成上面的依赖安装，再在项目根目录依次运行：

```powershell
# 打包 Python 后台
.\.venv\Scripts\python.exe scripts/build_sidecar.py

# 同时生成便携版和安装版
npm.cmd run dist:all
```

输出目录为 `dist_electron/`：

| 文件 | 使用方式 |
|---|---|
| `doudou_v1.3.0_Portable.exe` | 直接双击，无需安装 |
| `doudou_v1.3.0_Setup.exe` | 安装后通过桌面快捷方式启动 |

只生成一种版本时，将最后一条命令换成：

```powershell
npm.cmd run dist:portable  # 仅便携版
npm.cmd run dist:nsis      # 仅安装版
```

打包后的应用**不需要 VS Code、Node.js 或 Python**，仍需联网并配置 API 密钥。Python 代码修改后，必须重新构建后台再打包；后台产物 `resources/engine_sidecar.exe` 不随源码上传 GitHub，需要本地生成。

## 常用快捷键

| 快捷键 | 功能 |
|---|---|
| `F2` | 开始 / 停止聆听 |
| `Alt+Z` | 手动触发回答 |
| `Alt+C` | 打开 / 收起聊天 |
| `Alt+,` | 打开 / 收起设置 |
| `Alt+X` | 屏幕分析 |
| `Alt+R` | 重试回答 |
| `Alt+W` | 关闭当前面板 |

快捷键可在设置中修改；注册失败时检查是否被其他程序占用。

## 排查问题

- **豆包返回 403**：检查流式识别服务是否开通，以及该 API Key 是否有对应资源权限。独立诊断见 [官方示例使用说明](scripts/sauc_python/README.md)。
- **没有转写**：检查音频设备、密钥和网络；默认系统音频采集不会自动录入麦克风声音。
- **能转写但无法回答**：检查回答服务商的密钥、模型权限及额度。当前后台按固定服务商顺序回退，界面中的优先级排序尚未接入后台。
- **后台启动失败**：源码版检查 `.venv` 和 Python 依赖；打包版重新构建后台再打包。
- **中文日志乱码**：在 PowerShell 启动前运行 `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()`。

配置保存在本机的 `user_settings.json`。源码通过 Electron 启动时通常位于 `%APPDATA%\doudou-electron\`，不会读取项目根目录的同名文件；打包版以实际用户数据目录为准。配置中的密钥以明文保存，不要上传配置或带密钥的日志。

语音转写和 AI 回答会将相关音频、问题、背景资料或截图发送给所选服务商，费用由服务商决定。屏幕保护效果取决于 Windows 和录屏工具，不保证所有采集方式都能隐藏窗口。
