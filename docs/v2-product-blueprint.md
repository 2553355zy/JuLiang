# 巨量监控二代产品蓝图

## 1. 当前状态

当前目录里的 `巨量监控内测版.exe` 是 PyInstaller 打包的第一代内测版，不是源码仓库。第一代已具备本地 Web 控制台、OceanEngine 授权、余额监控、批量关闭、清钱、转账和最近操作报告。

第一代内部后端模块包括：

- `oceanengine_monitor.client`
- `oceanengine_monitor.monitor`
- `oceanengine_monitor.watchlist`
- `oceanengine_monitor.recharge`
- `oceanengine_monitor.unit_control`
- `oceanengine_monitor.closer`
- `oceanengine_monitor.clear_money`
- `oceanengine_monitor.webapp`

第一代最大的工程风险是随包配置中出现真实 token、refresh token 和 secret。二代必须从架构上移除这个模式。

## 2. 二代产品目标

二代不是单纯的余额监控工具，而是面向巨量引擎投放团队的“投放分析 + 自动化操作 + 素材情报 + 负责人通知”系统。

最终目标：

1. 对巨量引擎账号做全面分析。
2. 对账号、项目、广告、单元、素材和资金做安全操作。
3. 显著提升 ROI，而不只是降低消耗。
4. 自动发现表现好的素材，从素材名称中抽取小说名。
5. 通过飞书通知对应账号或素材负责人员，让爆量素材和可复用题材更快进入生产和扩量。

## 3. 外部调研合并

### 3.1 巨量引擎 API 能力

巨量引擎开放平台的 Marketing API 覆盖自动化营销管理、报表分析、创意素材和 DMP 人群管理等方向。官方开放平台入口说明中明确把“营销投放、报表分析、创意素材及 DMP 人群管理”放在接入能力范围内。

相关资料：

- 巨量开放平台入门/API 页面: https://open.oceanengine.com/labels/34
- 自定义报表接口: https://open.oceanengine.com/labels/7/docs/1741387668314126
- Scope 接口清单: https://open.oceanengine.com/labels/7/docs/1699352157034496
- OAuth / access token / refresh token 相关入口: https://open.oceanengine.com/labels/13

ThinkingData 的巨量集成文档确认了“多合一数据报表”可覆盖广告粒度、素材粒度、关键词粒度，并包含成本、收入、曝光、点击、转化等分析字段。这对二代 ROI 数据模型很关键。

参考资料：

- ThinkingData OceanEngine Integration Solution: https://docs.thinkingdata.cn/ta-manual/v4.1/en/user_guide/data/thirdparty/thirdparty_oceanengine.html

对二代的启发：

- 第一阶段优先接入自定义报表和资金/状态操作接口。
- 数据模型要支持账号、项目/广告组、广告/单元、素材、关键词等多粒度。
- 不要只看余额和消耗，要把收入、转化、回传事件、利润和 ROI 放进同一张事实表。
- 报表拉取要支持定时任务和单次补拉。第三方文档提到多合一报表常用于小时级数据同步，且有近 30 天拉取限制，这意味着二代必须有本地历史仓库和补数机制。

### 3.2 ROI 与转化回传

神策的巨量广告升级版文档强调，投放 oCPX 必须配置回传方案，联调链路是“巨量上报点击 -> 归因平台 -> 回传转化 -> 巨量接收转化 -> 联调成功”。项目上未设置优化目标时，无法进行转化事件回传，也无法查看计划、创意层级转化事件数据。

参考资料：

- 神策字节-巨量广告升级版说明: https://manual.sensorsdata.cn/sensorsadstracking/docs/zijie_tiyan_05

对二代的启发：

- ROI 提升不能只依赖关停规则；必须检查转化回传链路健康。
- 每个账号需要“回传健康状态”：是否配置事件、是否联调成功、是否有转化延迟、是否存在点击有量但回传断流。
- 操作建议必须区分“投放差”和“数据回传坏”。回传坏时不应自动降预算或关闭素材。

### 3.3 飞书通知

飞书开放平台支持自定义机器人通过 webhook 向群聊推送消息，也支持消息卡片。官方卡片文档说明可用自定义机器人发送飞书卡片；Bot overview 说明自定义机器人 webhook 是接收 HTTP 请求并推送消息的 URL。

相关资料：

- 飞书自定义机器人消息卡片: https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/quick-start/send-message-cards-with-custom-bot
- 飞书机器人概览: https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/bot-v3/bot-overview
- 飞书自定义机器人使用指南: https://open.feishu.cn/document/ukTMukTMukTM/ucTM5YjL3ETO24yNxkjN
- 飞书卡片回调: https://open.feishu.cn/document/feishu-cards/card-callback-communication

对二代的启发：

- MVP 可以先用自定义机器人 webhook 发群消息。
- 正式版应使用应用机器人、用户映射和消息卡片，支持“确认已跟进”“加入素材复盘”“创建扩量任务”等按钮。
- 通知必须去重、限频、分级。不能每次刷新报表都刷屏。

### 3.4 素材命名分析

AppsFlyer 的素材优化指南提到，可根据素材资产命名模式创建自定义标签，并把名称中的分段作为分析维度。这个思路适合我们从素材名抽取小说名、题材、剪辑版本、钩子类型、投手、批次等标签。

参考资料：

- AppsFlyer 素材优化指南: https://support.appsflyer.com/hc/zh-cn/articles/18564718580625-%E7%B4%A0%E6%9D%90%E4%BC%98%E5%8C%96%E6%8C%87%E5%8D%97

对二代的启发：

- 建立素材命名解析器，而不是只做字符串搜索。
- 支持命名规则配置，例如 `小说名_集数_钩子_剪辑版本_投手_日期`。
- 对无法解析的素材名进入“待归类队列”，由运营补标，一次补标后形成规则。

## 4. 推荐插件、Skill 与规则体系

### 4.1 当前已安装插件审计

已安装插件：

- Browser: 适合二代前端和本地 Web/Electron 页面验证。
- Figma: 适合后续做界面原型、设计系统和设计到代码。
- Product Design: 适合从产品想法生成可评审原型。
- Spreadsheets: 适合导出 ROI、账号、素材表现分析表。
- Documents/PDF/Presentations: 适合输出对外方案、复盘报告、培训材料。
- HyperFrames: 当前不作为二代核心插件，除非要生成产品演示视频。

当前没有找到可直接调用的飞书或 OceanEngine Codex 插件。飞书和巨量能力应在产品代码中实现，或后续做项目专用 MCP/插件。

### 4.2 当前应使用的 Skill

立即有用：

- `workflow-packaging`: 用于判断是否把巨量投放分析流程沉淀成 skill、插件或自动化。
- `domain-modeling`: 用于沉淀账号、素材、小说名、负责人、ROI、操作建议等领域词汇。
- `prototype`: 用于先验证规则引擎、素材名解析器、飞书通知模板。
- `implement`: 后续进入真实代码开发时使用。
- `tdd`: 风险高的资金操作、状态操作、规则引擎应测试先行。
- `diagnosing-bugs`: 用于第一代包或二代运行问题定位。
- `review`: 用于每个阶段结束后的代码/规格审查。
- `product-design:get-context`: 后续做界面原型前使用。
- `spreadsheets`: 用于生成运营分析表和 ROI 验证表。

短剧相关但非开发核心：

- `short-drama-reference-study`: 可用于研究爆量素材和短剧参考视频。
- `short-drama-compliance-gates`: 可用于素材/短剧内容质量门，但不应混进广告操作系统核心逻辑。
- `cinematic-visual-prompts`、`seedance-shot-design`: 可在“发现爆量小说名 -> 反推素材生产”阶段使用。

建议新建但暂不立即创建的项目 Skill：

- `oceanengine-growth-ops`: 巨量账号诊断、报表拉取、ROI 规则、操作建议的工作流。
- `material-novel-routing`: 素材名解析、小说名归因、负责人路由、飞书通知模板。

先不创建的原因：当前还没有二代源码、字段样本、负责人映射表和实际命名规范。应先用文档和原型验证，再沉淀 skill。

### 4.3 主规则文件

已新增项目级 `AGENTS.md`，用于约束后续二代开发。关键规则：

- 第一代打包产物只作为参考。
- 真实密钥不得进入包、仓库或示例配置。
- 资金和关闭类操作必须预览、确认、审计、可追踪。
- 二代默认方向为 TypeScript + React + Vite + Electron。
- 报表数据按时间序列事实存储，再派生看板、告警和建议。

## 5. 二代产品模块

### 5.1 授权与账号中心

能力：

- OAuth 授权。
- token 自动刷新。
- 多组织、多账号授权管理。
- 账号负责人、投手、素材负责人绑定。
- 权限范围检查。
- 授权过期预警。

关键改进：

- 不再把 app secret 和 refresh token 打进客户端包。
- 推荐有一个轻量后端托管 token，客户端只拿短期会话。

### 5.2 数据同步中心

能力：

- 定时拉取报表。
- 手动补拉近 30 天数据。
- 按账号、项目、广告、素材、关键词粒度入库。
- 拉取失败重试和频控保护。
- 数据延迟标记。

本地表建议：

- `accounts`
- `account_owners`
- `campaigns`
- `promotions`
- `materials`
- `material_name_tags`
- `metric_facts_hourly`
- `conversion_health`
- `operation_audit_logs`
- `notifications`

### 5.3 ROI 分析引擎

核心指标：

- 消耗
- 展示
- 点击
- CTR
- CPC
- 转化数
- 转化成本
- 收入
- ROI
- 利润
- 利润率
- 回本窗口
- 小时级趋势
- 环比/同比异常

判断逻辑：

- 低 ROI 但回传健康正常：进入控量或关停候选。
- 低 ROI 且回传异常：进入回传排查，不直接关停。
- 高 ROI 且消耗稳定：进入扩量候选。
- 高点击低转化：创意钩子和落地页不匹配候选。
- 高转化低 ROI：出价/成本问题候选。
- 高 ROI 新素材：进入小说名通知和复盘队列。

### 5.4 操作引擎

操作类型：

- 项目/广告/单元开启、暂停、关闭。
- 预算调整。
- 转账/充值。
- 清钱。
- 单元高成本自动关停。
- 成本恢复自动重开。

安全机制：

- 所有操作先生成计划。
- 计划必须可预览。
- 执行需要确认词。
- 真实执行写入审计日志。
- 同一对象同一动作要幂等。
- 每个账号和组织设置操作上限。
- 支持 dry-run、灰度账号、只读模式。

### 5.5 素材情报与小说名识别

输入：

- 素材名称。
- 广告名称。
- 创意标题。
- 落地页链接。
- 人工补标。
- 素材库文件名。

解析输出：

- 小说名。
- 集数/片段。
- 钩子类型。
- 剪辑版本。
- 素材批次。
- 投手或剪辑负责人。
- 置信度。

触发条件：

- 素材 ROI 超过阈值。
- ROI 连续多小时稳定。
- 消耗达到最小样本量。
- 转化数达到最小样本量。
- 同小说名多素材同时跑出。
- 新素材快速起量。

通知内容：

- 小说名。
- 素材名。
- 账号和负责人。
- ROI、消耗、收入、转化成本、转化数。
- 判断理由。
- 建议动作：扩量、复刻、拆解钩子、补拍、同步编剧/剪辑。

### 5.6 飞书通知中心

MVP：

- 自定义机器人 webhook。
- 群通知。
- 基础文本或富文本。

正式版：

- 飞书应用机器人。
- 负责人用户 ID 映射。
- 卡片消息。
- 卡片按钮回调。
- 通知已读/已处理状态。
- 每日战报。
- 爆量素材实时提醒。
- 风险操作审批。

通知去重：

- 同账号、同素材、同小说名、同触发类型，在窗口期内只发一次。
- 指标继续显著提升时允许升级通知。
- 每日汇总避免刷屏。

## 6. MVP 范围

第一阶段做“可验证 ROI 提升”的闭环，不追求所有功能一次做完。

MVP 包含：

1. 安全授权和账号列表。
2. 自定义报表拉取和本地存储。
3. 账号/项目/广告/素材四层看板。
4. ROI 和异常规则引擎。
5. 只读建议模式。
6. 操作预览模式。
7. 素材名解析器。
8. 负责人映射表。
9. 飞书 webhook 通知。
10. 每日 ROI 战报导出。

MVP 不包含：

- 全自动无人值守资金操作。
- 自动创建广告。
- 自动修改出价和预算。
- 完整审批流。
- 多租户 SaaS。
- 复杂机器学习预测。

## 7. 架构建议

推荐架构：

- Electron shell: 桌面入口、自动更新、本地安全存储。
- React renderer: 操作台 UI。
- Local service: API client、任务队列、规则引擎。
- SQLite: 本地指标仓库和审计日志。
- Optional backend: token 托管、团队共享、飞书应用回调。

模块边界：

- `oceanengine-client`: API 封装、限流、重试、错误标准化。
- `auth-service`: 授权、刷新、密钥存储。
- `sync-service`: 报表拉取、补数、任务调度。
- `metrics-store`: 指标事实入库和查询。
- `roi-engine`: ROI、异常、建议计算。
- `operation-planner`: 操作计划和预览。
- `operation-executor`: 真实执行和审计。
- `material-intelligence`: 素材名解析、标签、小说名识别。
- `owner-routing`: 账号/小说/素材负责人匹配。
- `feishu-notifier`: 飞书消息发送、去重、状态。
- `ui`: 看板、队列、详情、配置。

## 8. 验证指标

产品本身必须证明能提升 ROI。建议从一开始记录对照指标。

核心验证：

- ROI 提升百分比。
- 无效消耗减少金额。
- 爆量素材发现到通知的时间。
- 爆量素材复刻/扩量次数。
- 回传异常发现次数。
- 误关停次数。
- 操作节省时间。
- 负责人响应时间。

上线前必须有：

- 只读模式跑 3-7 天。
- 与人工判断对比。
- 每条建议记录“命中/误报/漏报”。
- 操作规则只在准确率达标后开放执行。

## 9. 工作流包装候选

按照工作区规则，先列候选，不立即创建。

| 重复工作流 | 证据 | 频率/信心 | 推荐形式 | 处理 |
| --- | --- | --- | --- | --- |
| 巨量账号 ROI 诊断和操作建议 | 一代已有余额、关闭、清钱；二代目标明确 | 高 | 新 skill 或项目规则 | 先在蓝图和原型中验证 |
| 素材名解析小说名并通知负责人 | 用户明确提出最终目标 | 高 | 新 skill + 产品模块 | 先收集命名样本 |
| 飞书消息卡片模板和去重规则 | 二代通知中心会反复使用 | 中高 | 项目内模板，后续 skill | 先做 MVP webhook |
| OceanEngine API 接口字段映射 | API 接入会持续发生 | 高 | 项目 docs + typed client | 开发时沉淀 |
| ROI 周报/日报导出 | 投放团队会反复查看 | 中 | spreadsheet/report 模板 | 待样例数据后创建 |

暂不创建 skill/plugin 的原因：

- 二代源码还不存在。
- 真实字段、账号负责人表、素材命名规范还未提供。
- 先创建过宽 skill 容易变成空泛流程。

## 10. 下一步执行顺序

1. 找回或新建二代源码工程。
2. 建立安全配置方案，移除随包密钥模式。
3. 定义领域词汇和数据模型。
4. 做素材名解析器原型。
5. 做 ROI 规则引擎原型。
6. 做飞书 webhook 通知原型。
7. 接入 OceanEngine 自定义报表。
8. 做只读看板。
9. 运行 3-7 天只读诊断。
10. 再开放预览操作和真实执行。

