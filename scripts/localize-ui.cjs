const fs = require('fs');
const ts = require('typescript');
const translations = Object.fromEntries(`
SITUATION|情境
TASK|任务
ACTION|行动
RESULT|结果
Set the context: company, team, and problem.|交代背景：公司、团队和遇到的问题。
State the challenge: expectations, goals, and responsibilities.|明确挑战：预期、目标和你的职责。
Describe the details: what did you do, how, and why?|说明细节：做了什么、如何做，以及为什么这样做。
Highlight the outcome: metrics, learnings, and success.|突出成果：具体指标、经验和收获。
STAR steps|STAR 回答步骤
PHASE|阶段
Waiting for stream chunk...|正在等待回答内容…
Generating code solution...|正在生成代码方案…
Explanation|解题说明
Connecting...|正在连接…
doudou Ready|doudou 已就绪
Sidecar connected|后台引擎已连接
Sidecar reconnected|后台引擎已重新连接
QUOTA EXCEEDED (Wait 60s)|额度超限，请等待 60 秒
CONNECTION LOST|连接已断开
Error|发生错误
doudou: LISTENING...|正在聆听…
doudou: STANDBY|待机中
API key saved|API 密钥已保存
HOTKEYS SYNCED|快捷键已同步
doudou: TRIGGERING MANUAL...|正在手动生成回答…
doudou: RETRYING...|正在重新生成…
AI: SCANNING SCREEN...|正在分析屏幕…
SNAPSHOTS CLEARED|屏幕截图已清空
Interview Mode Active (Loopback Audio + STAR Armed)|面试模式已开启（系统音频录制 + STAR 回答）
INTERVIEW MODE ACTIVE|面试模式已开启
Interview Mode Deactivated|面试模式已关闭
BACKEND DISCONNECTED — Restarting doudou or check Python sidecar|后台连接已断开，请重启 doudou 或检查后台引擎
Interview Mode|面试模式
Interview Mode Active: Listening + STAR armed. Click to disarm.|面试模式已开启：聆听系统音频并使用 STAR 回答结构。点击关闭。
One-Click Interview Mode: Arms live loopback listening + STAR answer structure.|一键开启面试模式：聆听系统音频并使用 STAR 回答结构。
Practice Kit|面试题库
52 Indian Placement & Tech Interview practice questions (TCS, Infosys, SDE1, STAR).|52 道印度校招与技术面试练习题，涵盖 TCS、Infosys、SDE1 和 STAR。
Screen Scan|屏幕分析
Analyzing cumulative scrolling context. Click to refine.|结合多次截图分析屏幕内容，点击继续完善。
Capture and analyze current screen content.|截取并分析当前屏幕内容。
Reset|重置
Clear cumulative screen context and start fresh.|清空累计截图，重新开始分析。
Pause|暂停
Start|开始
Stop listening and deactivate doudou.|停止聆听并暂停 doudou。
Activate doudou to begin listening and analyzing.|启动 doudou，开始聆听和分析。
MANUAL ANSWER|立即回答
Force doudou to generate a response based on the current context now.|立即根据当前上下文生成回答。
Settings|设置
Configure screen protection, hotkeys, and display preferences.|配置屏幕保护、快捷键和显示偏好。
Hide|隐藏
Minimize doudou to system tray. It keeps running in the background.|将 doudou 最小化到系统托盘，继续在后台运行。
HEARING|正在聆听
Close Drawer|收起面板
About|关于
doudou Interview AI — Open Source Edition. No cloud account needed.|doudou AI 面试助手开源版，无需注册应用账户。
Response|回答
Strategy|回答策略
Adjust AI behavior, upload resumes, or provide custom job context.|调整回答风格、上传简历或补充岗位背景。
History|历史记录
Browse past questions and answers.|查看之前的问题和回答。
Meeting Notes|会议记录
View transcript, save sessions, and generate AI meeting summaries.|查看转写内容、保存会话并生成 AI 会议摘要。
Guide|使用指南
Getting started with doudou.|了解如何使用 doudou。
SYSTEM STATUS & ABOUT|系统状态与关于
AI Engine|AI 引擎
6 Providers Active (Auto-Fallback)|支持 6 家服务商，失败时自动切换
Audio Pipeline|音频状态
Live Capturing|正在录制
Loopback Standby|系统音频待机
Survival Kit|面试题库
Placement Questions|道校招题
doudou Interview AI — Open Source Edition|doudou AI 面试助手 · 开源版
v1.3.0 OSS • MIT License|v1.3.0 开源版 · MIT 许可证
Privacy-first interview copilot with zero cloud dependency. Run on your own API keys.|使用你自己的 API 密钥连接 AI 服务，本地管理设置与面试记录。
Open Practice Kit (|打开题库（
Configure API Keys|配置 API 密钥
INDIAN TECH INTERVIEW SURVIVAL KIT|印度校招与技术面试题库
Curated Questions|道精选题
Search questions by topic, company (TCS, Infosys, Flipkart), or concept...|按主题、公司（TCS、Infosys、Flipkart）或知识点搜索…
Key points:|答题要点：
Generate Answer (STAR)|生成回答（STAR）
STRATEGY|回答策略
Upload Resume|上传简历
Parse your resume (PDF/Word) to provide the AI with your professional background.|解析 PDF 或 Word 简历，让 AI 了解你的专业背景。
Resume|简历
Fetch URL|读取网页
Provide a job description or company page URL for doudou to analyze.|提供岗位描述或公司网页地址供 doudou 分析。
Website URL:|请输入网页地址：
URL|网页地址
Answer Style|回答风格
Auto-selected:|自动选择：
Paste Job Description, Company Info, or your specific Interview Notes here... doudou will prioritize this context for your answers.|在这里粘贴岗位描述、公司信息或面试笔记，doudou 将优先参考这些内容回答。
Sync Context|同步背景资料
Apply the pasted text or uploaded files to the current AI session.|将粘贴的文字或上传的文件用于当前 AI 会话。
Sync Interview Context|同步面试背景资料
HISTORY|历史记录
No conversation history yet. Questions and answers will appear here.|暂无对话记录，问题和回答将显示在这里。
Q:|问题：
MEETING NOTES|会议记录
SESSION|当前会话
LIVE|进行中
IDLE|未开始
utterances|段发言
questions|个问题
Live Session|实时会话
Save|保存
Session title:|会话标题：
Interview|面试
Session|会话
Notes|生成记录
Clear current transcript?|确定清空当前转写内容吗？
Clear|清空
Refresh|刷新
SAVED NOTES|已保存的记录
No saved notes yet. Start a session and save it.|暂无记录，请先开始会话并保存。
SETTINGS|设置
GENERAL|常规
Auto-Answer|自动回答
Hear a question? doudou answers automatically.|检测到问题后，doudou 会自动生成回答。
PRIVACY|隐私与会话
Automatically arm live loopback listening and STAR structured guidance on launch.|启动时自动聆听系统音频，并启用 STAR 回答结构。
Interview Mode (Auto-Listen + STAR)|面试模式（自动聆听 + STAR）
Screen Protection|屏幕保护
Protect your privacy by hiding the doudou window from screenshots and screen sharing.|在截图和屏幕共享中隐藏 doudou 窗口，保护隐私。
Save Transcripts|保存转写记录
Store your interview transcripts locally for future review and reference.|将面试转写内容保存在本地，方便回顾和查阅。
Low Credit Alert|余额不足提醒
Receive a notification when your credit balance drops below 2 hours.|可用时长不足 2 小时时提醒。
Session End Warning|会话结束提醒
Get a warning alert 5 minutes before your active session expires.|会话到期前 5 分钟提醒。
AUDIO|音频
Default (Auto-detect Loopback)|默认（自动检测系统音频）
Audio Source|音频来源
Input Device|输入设备
DISPLAY|显示
Opacity|不透明度
Change the transparency level of the doudou interface.|调整 doudou 界面的透明程度。
Light Mode|浅色模式
Switch between dark and light themes for the interface.|切换深色或浅色界面主题。
Show Tooltips|显示操作提示
Enable or disable help tooltips across the application.|开启或关闭应用中的帮助提示。
SHORTCUTS|快捷键
Activation|启动 / 暂停
Manual Analyze|手动分析
Toggle Chat|打开 / 收起聊天
Toggle Strategy|打开 / 收起回答策略
Scan Screen|分析屏幕
Toggle Settings|打开 / 收起设置
Toggle History|打开 / 收起历史记录
Retry Answer|重新生成回答
VERSION|版本信息
Software Version|软件版本
Open-source build — updates via GitHub releases.|开源版本，可通过 GitHub 发布页面获取更新。
PROVIDER KEYS|服务商密钥
Add one key to enable answers. Links:|添加一个密钥即可启用回答。申请入口：
API Key|API 密钥
Configured|已配置
Not set|未设置
Model|模型
Open Guide|打开使用指南
View tutorial|查看教程
doudou CHAT|doudou 对话
How can I help you?|有什么可以帮你？
Assistant powered by doudou Intelligence|由 doudou 驱动的 AI 助手
Type your question...|输入你的问题…
Real-time AI interview intelligence.|实时 AI 面试助手。
Set your context for tailored answers.|设置背景资料，获得更贴合你的回答。
LISTEN|聆听
Tap mic or press hotkey to start.|点击麦克风或按快捷键开始。
ANSWER|回答
doudou responds in real-time.|doudou 实时生成回答。
Got it|知道了
Connect Your AI|连接你的 AI 服务
doudou answers using your own API key. It takes about 60 seconds.|配置你自己的 API 密钥，即可使用 doudou 生成回答。
Fastest · Free tier|快速响应 · 免费额度
Free tier|免费额度
Most popular|热门选择
I already have a key — Open Settings|已有密钥，前往设置
doudou is responding...|doudou 正在回答…
Ask me anything...|向我提问吧…
doudou Logo|doudou 标志
TAP ANYWHERE TO CLOSE|点击任意位置关闭
COPIED|已复制
COPY ANSWER|复制回答
COPY CODE|复制代码
Recording...|请按下快捷键…
NONE|未设置
Press keys or ESC to cancel|按下组合键，或按 Esc 取消
Default (Auto)|默认（自动）
`.trim().split('\n').map(line => line.split('|')));

const file = 'src/App.tsx';
let source = fs.readFileSync(file, 'utf8');
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const edits = [];
function visit(node) {
  if (ts.isJsxText(node)) {
    const raw = node.getFullText(ast);
    const value = raw.trim();
    if (translations[value]) edits.push([node.pos, node.end, raw.replace(value, translations[value])]);
  } else if (ts.isStringLiteral(node) && translations[node.text]) {
    edits.push([node.getStart(ast), node.end, JSON.stringify(translations[node.text])]);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
for (const [start, end, value] of edits.sort((a,b) => b[0]-a[0])) source = source.slice(0,start) + value + source.slice(end);
const replacements = {
  'ERROR: ${e.msg}': '错误：${e.msg}',
  'AI: ${p.provider} OK': 'AI：${p.provider} 已完成',
  'REGISTRATION FAILED: ${failed[0].key}': '快捷键注册失败：${failed[0].key}',
  'Notes saved: ${result.path.split': '记录已保存：${result.path.split',
  'PRACTICE: ${q.topic}': '练习：${q.topic}',
  'Loaded ${q.topic} question into AI Copilot': '已加载「${q.topic}」练习题',
  'Audio Level: ${volume}%': '音量：${volume}%',
  'Smart Scan (${snapshotsCount})': '智能分析（${snapshotsCount}）',
  'Notes: ${note.filename}': '记录：${note.filename}',
  '{cat}': '{zhLabel(cat)}',
  '{opt}\n': '{zhLabel(opt)}\n',
  '{detectedStrategy}</strong>': '{zhLabel(detectedStrategy)}</strong>',
  '{item.strategy} ·': '{zhLabel(item.strategy)} ·',
  '打开题库（{questionBank.length})': '打开题库（{questionBank.length}）',
  '}m {sessionStatus.duration_seconds % 60}s': '} 分 {sessionStatus.duration_seconds % 60} 秒',
};
for (const [from,to] of Object.entries(replacements)) source = source.replaceAll(from,to);
source = "import { zhLabel } from './locale'\n" + source;
fs.writeFileSync(file, source);
console.log(`Translated ${edits.length} UI text occurrences.`);
