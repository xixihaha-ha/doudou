<p align="center">
  <img src="./public/doudou-logo.png" width="120" height="120" alt="doudou">
</p>

<h1 align="center">doudou</h1>

<p align="center">Windows 桌面 AI 助手：系统音频转写、回答辅助、屏幕分析与背景资料管理。</p>

doudou 使用 Electron + React 构建悬浮界面，Python 后台负责音频采集与 AI 调用。应用通过你配置的 API 密钥直接请求对应服务商。设置保存在本机；语音转写和 AI 回答需要联网，相关音频、问题、上下文或截图会发送给所选服务商，费用和额度由服务商决定。

## 主要功能

- 采集系统播放的音频，支持中文、英文及自动识别语言的转写。
- 根据问题和背景资料生成回答，支持聊天、回答策略和历史记录。
- 分析截图，导入简历或其他文档作为背景资料。
- 管理六家 AI 服务商的密钥和回答模型。
- 置顶悬浮窗、透明度调整、界面缩放、托盘隐藏和全局快捷键。
- 屏幕保护：开启后请求系统在截图、录屏和屏幕共享中保护 doudou 窗口内容。
- 焦点保护：默认不抢键盘焦点，需要填写内容时可切换输入模式。

## 从源码启动

以下命令在项目根目录的 **Windows PowerShell** 中运行。

环境要求：Windows、Python 3.10+，以及满足当前 Vite 版本要求的 Node.js（20.19+ 的 20.x，或 22.12+）。源码启动固定使用项目内 `.venv\Scripts\python.exe`。

```powershell
npm.cmd install
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-sidecar.txt
npm.cmd run build
npm.cmd run electron
```

`npm.cmd run electron` 执行 `electron .`，同时启动 Electron 界面和 Python 后台，不需要另开终端启动后台。

当前 `main.js` 中 `isDev = false`，Electron 加载的是 **`dist/index.html`**。修改 `src/` 后，需要重新执行 `npm.cmd run build`，再重启应用。

`npm.cmd run dev` 只启动端口为 `5180` 的 Vite 前端开发服务器，不会启动 Electron 或 Python 后台。需要在 Electron 中使用前端热更新时，将 `main.js` 的 `isDev` 改为 `true`，启动 Vite 后另开终端执行 `npm.cmd run electron`；打包前恢复为 `false`。

## 首次配置

1. 启动应用，右键系统托盘中的 doudou 图标，勾选“输入模式（聊天 / 设置时开启）”。
2. 打开“设置 → API 密钥”。
3. 在“实时转写”中保存 Groq 或 OpenAI 密钥。
4. 在“回答”中配置至少一家回答服务商，并选择可用模型。Groq 和 OpenAI 的密钥在两个用途之间共用。
5. 完成输入后取消托盘中的“输入模式”，点击原来的工作窗口继续使用。
6. 播放一段含语音的音频，按 `F2` 切换聆听状态，检查是否出现转写。

默认采集系统输出音频，单纯对着麦克风说话不一定会被采集。需要采集麦克风时，在音频设备设置中选择对应输入设备。

## API 密钥从哪里读取

### 通过 Electron 启动

包括 `npm.cmd run electron` 和打包后的应用。Electron 将 `app.getPath('userData')` 通过 `doudou_USER_DATA` 环境变量传给 Python，后台读取该目录中的 `user_settings.json`。

当前源码启动时，Windows 上通常位于：

```text
%APPDATA%\doudou-electron\user_settings.json
```

例如 Windows 用户名为 `26443` 时：

```text
C:\Users\26443\AppData\Roaming\doudou-electron\user_settings.json
```

打包后的目录以实际应用的 `userData` 路径为准。通过 Electron 启动时，**项目根目录的 `user_settings.json` 不参与读取**。

### 直接运行 Python 后台

未设置 `doudou_USER_DATA` 时，读取当前工作目录中的 `user_settings.json`。在项目根目录直接启动后台，才会使用项目里的这份文件。它是独立运行后台时的配置，并非仅用于检查。

### 读取优先级与保存

后台启动时，非空的配置文件密钥优先于对应环境变量；两者都没有则视为未配置。界面保存密钥会更新运行中的服务，并写入当前使用的配置文件。手动编辑文件后，需要重启应用。

| 服务商 | JSON 字段 | 环境变量 |
|---|---|---|
| Groq | `groq_api_key` | `GROQ_API_KEY` |
| OpenAI | `openai_api_key` | `OPENAI_API_KEY` |
| Anthropic | `anthropic_api_key` | `ANTHROPIC_API_KEY` |
| Gemini | `gemini_api_key` | `GEMINI_API_KEY` |
| DeepSeek | `deepseek_api_key` | `DEEPSEEK_API_KEY` |
| OpenRouter | `openrouter_api_key` | `OPENROUTER_API_KEY` |

PowerShell 中可以为本次终端会话设置环境变量，再从同一终端启动：

```powershell
$env:GROQ_API_KEY = "替换为你的密钥"
npm.cmd run electron
```

配置以明文 JSON 保存。请勿将包含真实密钥的配置文件或日志提交到仓库、公开分享。

## 转写与回答的调用逻辑

### 实时转写

优先调用 Groq 的 `whisper-large-v3-turbo`。未配置 Groq，或 Groq 报错、返回空文字时，尝试已配置的 OpenAI `whisper-1`。这两个密钥都没有时，会提示缺少转写密钥；其他回答服务商的密钥不能代替此处的转写密钥。

### AI 回答

当前后台按以下固定顺序尝试已配置的服务商：

```text
DeepSeek → OpenAI → Anthropic → Gemini → Groq → OpenRouter
```

调用成功后结束，失败后尝试后续服务商；截图请求还受各分支及模型的图像支持限制。模型是否可用取决于服务商和账号权限，界面中列出的模型不代表一定可调用。

**当前限制：**“回答”页面的服务商优先级可以在界面调整并保存，但后台 `AIWorker` 尚未读取该排序，实际调用仍按上述固定顺序执行。

## 屏幕保护与焦点保护

两项功能独立控制：屏幕保护影响窗口能否被屏幕采集，焦点保护影响点击助手时键盘焦点是否转移。

### 屏幕保护

在“设置 → 常规 → 屏幕保护”中开启或关闭，选项保存在 `stealth_mode` 配置中。

开启后，应用调用 Electron 的 `setContentProtection(true)`，请求系统保护 doudou 窗口内容，使其在支持该保护机制的截图、录屏或屏幕共享工具中隐藏或不被采集。本机仍可看到和操作助手。

实际效果取决于 Windows 版本及采集软件，不保证所有截图或共享方式都能隐藏。使用前可通过目标软件的录屏或共享预览确认效果。此开关不会阻止 AI 请求向服务商发送必要数据。

### 焦点保护（默认开启）

主窗口默认使用 `focusable: false`，显示时使用 `showInactive()`。点击按钮、滚动内容或通过快捷键显示助手时，不主动获取键盘焦点。

需要在聊天、设置等输入框中打字时，右键托盘图标，勾选“输入模式（聊天 / 设置时开启）”。结束后取消勾选，再点击原来的窗口。每次启动默认关闭输入模式。

托盘菜单、文件选择对话框和打开外部链接属于独立交互，仍可能改变焦点。实际焦点表现取决于系统和目标应用。

可运行独立的本地焦点实验：

```powershell
npm.cmd run focus-lab
```

实验不启动 AI 后台，操作说明见 [scripts/focus-lab/README.md](scripts/focus-lab/README.md)。

## 默认快捷键

可配置的快捷键可在“设置 → 快捷键”中修改。如果注册失败，界面会提示占用情况。

| 快捷键 | 功能 |
|---|---|
| `F2` | 开始 / 停止聆听 |
| `Alt+Z` | 手动触发回答 |
| `Alt+C` | 打开 / 收起聊天 |
| `Alt+S` | 打开 / 收起策略 |
| `Alt+,` | 打开 / 收起设置 |
| `Alt+X` | 触发屏幕分析 |
| `Alt+H` | 打开 / 收起历史记录 |
| `Alt+R` | 重试回答 |
| `Alt+W` | 关闭当前抽屉 |
| `Alt+Space` | 显示 / 隐藏助手；自定义快捷键占用此组合时，以自定义配置为准 |

关闭窗口会隐藏到托盘。完全退出时，右键托盘图标选择“退出”。

## 项目结构

```text
main.js                    Electron 主进程、窗口、快捷键、后台启动
preload.js                 受限 IPC 桥接
src/                       React + TypeScript 界面
engine_sidecar.py          Python 后台入口、命令分发与服务协调
core/ai_service.py         回答模型调用与服务商回退
core/audio_service.py      音频采集与转写
core/settings_manager.py   配置路径、读取和保存
core/transcript_manager.py 转写记录管理
scripts/focus-lab/          独立焦点实验
scripts/build_sidecar.py   Python 后台打包脚本
tests/run_smoke_tests.py   后台基础冒烟测试
dist/                      前端构建产物
resources/                 打包使用的后台可执行文件
```

通信链路为：React 界面 → preload IPC → Electron 主进程 → Python 子进程。Electron 与 Python 使用标准输入 / 输出传递逐行 JSON 消息。

## 验证与打包

前端构建检查：

```powershell
npm.cmd run build
```

后台基础冒烟测试：

```powershell
.\.venv\Scripts\python.exe tests/run_smoke_tests.py
```

这些检查不替代真实音频设备、服务商 API 和 Windows 窗口交互测试。

先构建 Python 后台，再选择一种 Electron 打包命令：

```powershell
.\.venv\Scripts\python.exe scripts/build_sidecar.py

# 便携版
npm.cmd run dist:portable

# 安装版
npm.cmd run dist:nsis

# 同时生成便携版和安装版
npm.cmd run dist:all
```

后台产物为 `resources/engine_sidecar.exe`，应用输出到 `dist_electron/`。打包版本使用后台 EXE；修改 Python 代码后，需要重新构建后台再打包。

## 常见问题

**修改界面后没有变化**  
当前 Electron 默认读取 `dist/`，执行 `npm.cmd run build` 并重启应用。

**修改项目里的密钥配置没有生效**  
通过 Electron 启动时，应在应用内保存密钥，或修改实际 `userData` 目录下的配置。配置文件中的非空密钥还会覆盖环境变量。

**聊天或设置输入框不能打字**  
先在托盘菜单开启“输入模式”。

**后台引擎启动失败**  
源码运行时检查 `.venv\Scripts\python.exe` 是否存在，并用该解释器安装 `requirements-sidecar.txt` 中的依赖；打包运行时检查后台 EXE 是否已正确构建。

**正在聆听，但没有转写**  
检查 Groq / OpenAI 密钥与网络，再确认所选音频设备确实有声音。默认回环采集优先使用 WASAPI，跟随系统默认输出设备；显式选择麦克风或立体声混音等设备时使用 PyAudio 路径。立体声混音不是所有设备的必需条件。

**转写正常，但无法生成回答**  
检查回答服务商的密钥、模型权限、额度和网络。转写成功仅代表转写接口可用。

Electron 日志 `doudou_debug.log` 位于应用的 `userData` 目录。分享排查材料前，请移除密钥和个人内容。
