const fs = require('fs');
function replace(file, map) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [a,b] of Object.entries(map)) text = text.replaceAll(a,b);
  fs.writeFileSync(file,text);
}
replace('src/App.tsx', {
  'Listen From': '聆听设备', 'Select the device doudou should listen to.': '选择 doudou 要聆听的音频设备。',
  'VISUALS': '界面显示', 'GETTING STARTED': '快速入门', 'WELCOME TO doudou': '欢迎使用 doudou',
  'v1.3.0 OSS': 'v1.3.0 开源版',
});
replace('index.html', {'lang="en"': 'lang="zh-CN"', '<title>doudou</title>': '<title>doudou AI 面试助手</title>'});
for (const file of ['src/index.css','src/App.css']) replace(file, {
  "'Inter', system-ui": "'Inter', 'Microsoft YaHei', 'PingFang SC', system-ui",
  "'Outfit', sans-serif": "'Outfit', 'Microsoft YaHei', 'PingFang SC', sans-serif",
  '"Outfit", sans-serif': '"Outfit", "Microsoft YaHei", "PingFang SC", sans-serif',
});
replace('main.js', {
  "label: 'Show Assistant'": "label: '显示助手'", "label: 'Hide Assistant'": "label: '隐藏助手'", "label: 'Quit'": "label: '退出'",
  "name: 'Documents'": "name: '文档'", 'doudou - Build Error': 'doudou - 构建错误',
  'UI bundle not found at:': '找不到界面构建文件：', "Run 'npx vite build' in the app directory.": "请在项目目录运行 npm.cmd run build。",
  'Sidecar failed to start: ${err.message}. Check Python setup.': '后台引擎启动失败：${err.message}。请检查 Python 环境。',
  "msg: 'Sidecar failed to start - check the logs'": "msg: '后台引擎启动失败，请查看日志'",
  'msg: `Sidecar restarting (${sidecarRestartAttempts})...`': 'msg: `正在重启后台引擎（第 ${sidecarRestartAttempts} 次）…`',
  'msg: `EVENT: ${key}`': 'msg: `快捷键：${key}`', 'msg: `HOTKEY ${key} BUSY`': 'msg: `快捷键 ${key} 已被占用`',
  '<h1 style="color:#e44">Build Error</h1>': '<h1 style="color:#e44">构建错误</h1>',
  '<p>UI bundle not found.</p>': '<p>找不到界面构建文件。</p>', 'Run <code>npx vite build</code>': '请运行 <code>npm.cmd run build</code>',
  '>UI Load Error</h1>': '>界面加载失败</h1>', "e.message || 'Unknown error'": "e.message || '未知错误'",
});
replace('engine_sidecar.py', {
  'doudou: Refining Answer...':'正在完善回答…', 'doudou: Thinking...':'正在思考…', 'doudou Ready':'doudou 已就绪',
  'AI Error: {error}':'AI 错误：{error}', 'Opening Portal...':'正在打开网页…',
  'Failed to parse file format or unsupported extension':'文件解析失败或不支持此文件格式', 'Invalid file path':'文件路径无效',
  'Session recording started':'已开始记录会话', 'Session saved: {os.path.basename(path)}':'会话已保存：{os.path.basename(path)}',
  'No transcript to save':'没有可保存的转写内容', 'Transcript saved: {os.path.basename(path)}':'转写内容已保存：{os.path.basename(path)}',
  'Notes generation:':'记录生成失败：', 'Meeting notes ready':'会议记录已生成', 'Transcript cleared':'转写内容已清空',
  'Thinking (Manual)...':'正在思考（手动触发）…', 'No question detected yet':'尚未检测到问题', 'Unknown command: {action}':'未知指令：{action}',
  'Invalid URL scheme (only http/https allowed)':'网址协议无效（仅支持 http/https）', 'Invalid URL host':'网址主机名无效',
  'URL blocked: internal or unsupported address':'网址已被阻止：内部地址或不支持的地址',
  'URL blocked: could not resolve hostname':'网址已被阻止：无法解析主机名', 'URL Load Failed:':'网页加载失败：',
  'Scrape Error:':'网页读取失败：', 'AI Analyzing Context...':'AI 正在分析背景资料…', 'Vision Error:':'图像分析失败：',
});

const rows = `
ind-cs-1|面向对象基础|面向对象编程中，抽象和封装有什么区别？|抽象隐藏实现细节，关注“做什么”；封装将数据与方法绑定，控制状态的访问。可用汽车或 ATM 举例。
ind-cs-2|多态|结合示例解释 Java/C++ 中的编译时多态与运行时多态。|编译时多态包括方法重载、运算符重载；运行时多态通过虚函数或动态方法分派实现方法重写。
ind-cs-3|数据库 / SQL|SQL 数据库中的聚簇索引和非聚簇索引有什么区别？|聚簇索引决定数据行的存储顺序，每张表通常只有一个；非聚簇索引使用独立的索引结构指向数据，可创建多个。
ind-cs-4|数据库事务|数据库事务的 ACID 特性是什么？为什么它们对金融系统至关重要？|原子性：全部成功或全部失败；一致性：保持有效状态；隔离性：控制并发事务的干扰；持久性：提交后即使崩溃也能保留数据。
ind-cs-5|操作系统|解释进程与线程的区别，以及两者上下文切换的差异。|进程拥有独立的虚拟地址空间；线程共享进程内存与堆，但有各自的栈和寄存器。同一进程内线程切换通常无需切换页表，开销更小。
ind-cs-6|计算机网络|在浏览器输入 https://google.com 并按回车后，背后会发生什么？|DNS 解析 → TCP 三次握手 → TLS 协商 → HTTP 请求 → 服务器处理 → 响应渲染 → 资源缓存。
ind-cs-7|数据结构|数组与链表有什么区别？什么情况下选择其中一种？|数组支持 O(1) 随机访问，连续内存有利于缓存；链表在已知节点处插入可达 O(1)，大小灵活，但有指针内存开销。
ind-cs-8|Java 基础|Java 中的 String 为什么不可变？字符串常量池是什么？|考虑安全性、线程安全、HashMap 中哈希值缓存，以及通过字符串驻留减少重复对象。
ind-cs-9|SQL 查询|不使用 LIMIT/TOP，如何查询 Employee 表中第 N 高的工资？|使用关联子查询统计高于当前工资的不同工资数量，或使用 DENSE_RANK() 窗口函数。
ind-cs-10|操作系统|什么是死锁？死锁发生需要满足哪四个 Coffman 条件？|互斥、占有并等待、不可抢占、循环等待。处理方式包括预防、避免（银行家算法）、检测与恢复。
dsa-1|双指针 / 数组|给定整数数组 nums 和整数 target，返回两个和为 target 的元素下标。|先解释 O(n²) 暴力解法，再用哈希表记录补数，将时间和空间复杂度优化到 O(n)。
dsa-2|滑动窗口|求字符串 s 中不含重复字符的最长子串长度。|使用左右指针维护滑动窗口，并用哈希表记录字符最近出现的位置，实现 O(n) 时间复杂度。
dsa-3|链表|如何检测单链表中的环，并找到环的入口节点？|使用 Floyd 快慢指针算法。相遇后将一个指针移回头节点，两指针每次前进一步，再次相遇处即为入口。
dsa-4|树与递归|给定二叉树根节点，判断它是否为有效的二叉搜索树（BST）。|检查中序遍历是否严格递增，或递归地向子节点传递允许的最小值和最大值边界。
dsa-5|动态规划|解释 0/1 背包问题，并说明如何建立状态转移方程。|dp[i][w] 表示前 i 个物品在容量 w 下的最大价值；比较不选与选当前物品的收益，可用一维数组优化空间。
dsa-6|图 / BFS / DFS|如何求非负权重图中的最短路径？请解释 Dijkstra 算法。|使用最小堆优先队列与距离数组，复杂度 O((V+E) log V)。说明负权边为何会使其失效，以及 Bellman-Ford 的适用场景。
dsa-7|栈 / 单调栈|给定每日温度数组，返回每一天需要等待多少天才能遇到更高温度。|维护存储下标的单调递减栈；遇到更高温度时弹出下标并记录距离，时间复杂度 O(n)。
dsa-8|堆 / 优先队列|求无序数组中第 K 大的元素。|使用大小为 K 的最小堆，复杂度 O(N log K)；或使用平均 O(N) 的快速选择算法。
dsa-9|二分查找|如何在旋转后的有序数组中，以 O(log n) 时间查找指定元素？|判断左右哪一半有序，再检查目标值是否落在该有序区间，据此移动二分边界。
dsa-10|区间 / 贪心|给定会议开始与结束时间区间，求所需会议室的最少数量。|分别排序开始和结束时间并使用双指针，或维护结束时间最小堆，求最大并发重叠数。
sys-1|幂等性|支付系统如何保证幂等性，避免重复扣款？|请求头传递幂等键，使用 Redis 或数据库唯一约束保存；扣款前原子化处理，重试时返回已缓存的结果。
sys-2|缓存与 Redis|解释 LRU、LFU 缓存淘汰策略，以及如何应对缓存击穿引发的惊群。|LRU 可用哈希表和双向链表实现；可通过互斥锁、概率性提前过期和后台刷新减少并发回源。
sys-3|数据库扩展|纵向扩容与水平分片有什么区别？如何处理跨分片查询？|按哈希或范围选择分片键，讨论重新分片、分散查询与结果聚合、分布式事务及两阶段提交。
sys-4|地理空间索引|如何为网约车设计实时司机位置跟踪与匹配服务？|使用 WebSocket/gRPC 上报位置，结合 Redis 地理空间索引、Google S2 或 Uber H3 查询附近司机。
sys-5|消息队列|什么情况下使用 Kafka 或 RabbitMQ？如何实现恰好一次处理？|Kafka 适合高吞吐、可重放事件流；RabbitMQ 适合复杂消息路由。结合至少一次投递与幂等消费讨论处理语义。
sys-6|限流|设计 API 限流器，并比较令牌桶、漏桶和滑动窗口日志算法。|令牌桶允许突发流量，漏桶平滑处理速率；Redis 有序集合可实现精确的滑动窗口日志，需要考虑内存成本。
sys-7|CDN 与视频流|体育赛事直播高峰期间，自适应码率流媒体（HLS/DASH）与 CDN 边缘缓存如何工作？|视频分片、播放清单、就近边缘缓存、多 CDN 路由，以及带宽下降时切换到较低画质。
sys-8|REST / GraphQL / gRPC|比较 REST、GraphQL 和 gRPC，分别适合什么场景？|REST 适合通用公共 API；GraphQL 适合灵活获取数据的客户端；gRPC 配合 Protocol Buffers 适合高性能内部微服务。
star-1|解决分歧|讲述一次你与团队成员或项目负责人产生分歧的经历。你是如何处理的？|情境：团队项目或实习；任务：解决技术选型分歧；行动：客观倾听，制作原型或收集数据；结果：采用合适方案并保持良好协作。
star-2|疑难技术问题|描述项目中最棘手的技术缺陷，以及你如何定位和解决它。|情境：竞态、内存泄漏或生产故障；任务：按时修复；行动：复现、分析日志和性能、定位根因并补充测试；结果：修复并完善监控。
star-3|期限与优先级|举例说明同时面对多个截止日期时，你如何安排优先级。|情境：毕业项目、考试与竞赛冲突；任务：保证质量并避免过度消耗；行动：使用优先级矩阵、拆分里程碑并提前沟通；结果：按时完成。
star-4|面对失败|讲述一次项目未达到预期或失败的经历。你学到了什么？|情境：项目用户接受度低；任务：找出原因；行动：复盘、收集反馈并发现体验或需求偏差；结果：将经验用于后续项目。
star-5|领导力与主动性|描述一次你主动改进流程，或解决职责之外问题的经历。|情境：手工部署或重复测试；任务：自动化以节省时间；行动：主动编写 CI 脚本或工具；结果：部署时间降低并被团队采用。
star-6|为什么录用你|与其他符合条件的候选人相比，我们为什么应该录用你？|结合公司业务，突出扎实的计算机基础、实际项目交付能力，以及好奇心与快速学习能力。
ind-cs-11|C++ / 内存|C++ / Python 中浅拷贝与深拷贝有什么区别？如何实现拷贝构造函数？|浅拷贝复制成员值或引用；C++ 原始指针可能造成重复释放。深拷贝重新分配内存并复制底层数据。
ind-cs-12|数据库 / 范式|用学生与课程的例子解释 1NF、2NF、3NF 和 BCNF。|1NF：字段值不可再分；2NF：消除对组合键的部分依赖；3NF：消除传递依赖；BCNF：每个决定因素都是候选键。
ind-cs-13|操作系统|什么是虚拟内存和缺页异常？TLB 如何工作？|虚拟内存提供独立的虚拟地址空间；所需页不在物理内存时可能触发缺页处理；TLB 缓存页表地址转换结果。
ind-cs-14|计算机网络|比较 TCP 和 UDP。为什么游戏与流媒体常用 UDP，而传统网页浏览常用 TCP？|TCP 面向连接，提供可靠、有序传输及流量和拥塞控制；UDP 无连接、开销小，适合低延迟场景。
ind-cs-15|数据结构|哈希表如何解决冲突？比较链地址法与开放寻址法。|链地址法使用链表或树保存同一桶中的元素；开放寻址法通过线性或二次探测寻找空槽。
dsa-11|Trie / 前缀树|设计支持 insert、search 和 startsWith 方法的前缀树。|节点使用子节点数组或哈希表，并保存单词结束标记；操作复杂度为 O(L)，L 是单词长度。
dsa-12|图 / 拓扑排序|如何使用 Kahn 算法（BFS 拓扑排序）判断课程先修关系是否可完成？|构建邻接表与入度数组，将入度为 0 的节点入队；处理节点时减少相邻节点入度，最终处理数等于节点数则无环。
dsa-13|动态规划|在 O(n log n) 时间内求最长严格递增子序列（LIS）的长度。|使用耐心排序思路，通过二分查找维护各长度递增子序列的最小末尾值数组 tails。
dsa-14|二叉树 / 最近公共祖先|求二叉树中两个节点的最近公共祖先（LCA）。|递归访问左右子树；当前节点为目标时返回自身。两侧都返回非空则当前节点是 LCA，否则返回非空的一侧。
dsa-15|滑动窗口最大值|给定数组 nums 和窗口大小 k，在 O(n) 时间内返回每个窗口的最大值。|使用存储下标的单调递减双端队列；入队前移除队尾较小元素，并从队首移除过期下标。
sys-9|身份认证与 JWT|JWT 如何工作？存放在 LocalStorage 与 HttpOnly Cookie 中分别有哪些安全风险？|JWT 由头部、载荷与签名组成。LocalStorage 可被页面脚本读取；HttpOnly 限制脚本读取 Cookie，还需结合 SameSite 与 CSRF 防护设计。
sys-10|高吞吐订单簿|如何设计每秒处理 10 万笔订单的低延迟股票撮合引擎？|内存订单簿采用价格优先、时间优先；价格档位可用树或跳表，同价订单用双向链表。考虑连续内存布局与环形缓冲区。
sys-11|通知系统|设计支持推送、短信和邮件的大规模分布式通知服务，并支持优先级队列。|API 网关 → 用户偏好 → 高低优先级消息队列 → 各渠道工作进程；结合限流、重试与死信队列。
sys-12|分布式锁|如何使用 Redis 实现分布式锁（Redlock）？持锁节点崩溃后会发生什么？|结合 NX、过期时间和随机令牌获取锁，释放时用 Lua 校验令牌。讨论多节点协调、锁过期、时钟漂移与 GC 暂停。
star-7|与利益相关方沟通|讲述一次你向经理或客户传达坏消息或解释项目延期的经历。|情境：突发阻碍或第三方服务故障；任务：清晰传达影响；行动：收集事实、准备替代方案并主动沟通；结果：获得理解并调整计划。
star-8|持续学习|你如何跟进快速发展的技术与软件工程实践？|通过工程博客、开源项目与新 SDK 实践积累知识，并说明如何将学习成果应用到项目改进中。
star-9|应对不确定性|描述一个需求模糊或频繁变化的项目，你是如何推进的？|情境：需求不明确；任务：交付可用产品；行动：制作最小原型、缩短反馈周期并主动澄清；结果：明确范围并按时交付。
star-10|职业责任与代码质量|讲述一次你需要在快速交付与保持代码质量之间做取舍的经历。|情境：紧迫的发布期限；任务：避免引入严重技术债务；行动：交付带测试的最小核心功能、记录债务并安排重构；结果：按时发布且无重大回归。
`.trim().split('\n').map(line => line.split('|'));
const bank = JSON.parse(fs.readFileSync('src/data/question_bank.json','utf8'));
if (rows.length !== bank.length) throw Error('Question translation count mismatch');
for (const q of bank) {
  const row = rows.find(r => r[0] === q.id);
  if (!row || row.length !== 4) throw Error('Missing translation: '+q.id);
  [q.topic,q.question,q.hint] = row.slice(1);
  if (q.company === 'All Companies') q.company = '通用';
}
fs.writeFileSync('src/data/question_bank.json',JSON.stringify(bank,null,2)+'\n');
console.log(`Translated ${bank.length} questions and hints.`);
