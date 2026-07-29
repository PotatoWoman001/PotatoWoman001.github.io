# JOTO Global Mall 抓取内容集成设计

日期：2026-07-29  
状态：待用户书面复核  
官网项目：`/Users/cuihua/Documents/JOTO global ｜ 维护入口`  
抓取项目：`/Users/cuihua/Documents/jotoglobal 信息获取站`

## 1. 目标

把抓取系统中已经通过测试的公开产品内容集成到 JOTO Global 的英文、中文和
波斯语 Mall，同时保持现有官网的设计系统、路由、发布方式和可回滚能力。

本阶段需要实现：

1. 将当前三个 Mall 占位页升级为正式产品目录；
2. 提供 Mall 首页、产品列表、产品详情和产品询价入口；
3. 保留抓取系统的分类、搜索、筛选、排序、分页、图片、规格、资料和相关产品
   信息架构；
4. 所有界面文案本地化为英文、简体中文和波斯语；
5. 产品名称、型号、品牌、技术规格及资料名称保留抓取到的英文原文；
6. 每次成功抓取后自动生成一个新的官网 Mall 数据版本；
7. 数据和媒体校验全部通过后才原子切换线上版本；
8. 抓取系统、Mac Mini 或新快照失败时，线上 Mall 继续使用最后一个有效版本。

## 2. 已确认的产品原则

### 2.1 询价目录，不是交易商城

Mall 不显示、存储或传播：

- 价格；
- 原价；
- 折扣；
- 币种；
- 购物车；
- `Add to Cart`；
- Wishlist；
- Compare；
- 在线支付。

主要操作统一为本地化的 `Contact Us / 联系我们 / تماس با ما`。

### 2.2 三语言策略

界面文案、导航、按钮、筛选名称、空状态、错误提示和辅助说明分别使用英文、
简体中文和波斯语。

以下内容保留英文原文，不做自动翻译：

- 产品名称；
- 型号；
- 品牌；
- 技术参数名称和值；
- 产品资料名称；
- 来源站公开的产品描述正文。

波斯语页面继续使用 `dir="rtl"`；英文产品字段作为独立 LTR 内容块显示，避免
型号、端口和单位顺序被 RTL 重排。

### 2.3 缺失字段

抓取数据允许部分可选字段为空。界面必须隐藏空组件，不显示空白标签、
`Unknown`、`N/A` 或虚构内容。

例如：

- 没有品牌时不显示品牌筛选和品牌行；
- 没有型号时不显示型号行；
- 没有规格时不显示 Specifications 页签；
- 没有资料时不显示 Downloads 页签；
- 没有相关产品时不显示 Related Products；
- 没有图片时使用 JOTO 自有的中性设备占位图。

## 3. 当前数据基础

2026-07-29 的本机只读检查确认：

- `http://127.0.0.1:8080/health` 返回健康状态；
- 公开 API 版本为 `1.1.0-recovery`；
- 当前公开产品数为 15；
- 当前分类包括 `AUD` 和 `D-Link Routers`；
- 当前品牌列表为空；
- 已有产品图片、少量文档和相关产品关系；
- API 和导出层已经禁止价格及购物车字段。

当前数量只用于验证集成链路，不成为页面布局的固定假设。Mall 必须正确处理
0、1、15、100 以及后续更多产品。

分类和品牌质量仍由抓取项目负责。官网发布器只做结构、完整性和安全校验，不在
前端猜测或自动重写产品分类。

## 4. 方案选择

### 4.1 采用：版本化静态快照

每个成功完成的抓取任务生成一份独立、不可变的 Mall 快照。快照包含：

- 产品目录索引；
- 产品详情记录；
- 分类和筛选项；
- 图片；
- 产品资料；
- 校验清单；
- 生成时间、抓取任务 ID 和数据版本。

快照先上传到阿里云暂存目录，完成服务器端校验后再切换
`catalog-current` 软链接。线上页面始终读取同域名静态资源，不直接连接
Mac Mini。

### 4.2 不采用：官网直接请求 Mac Mini API

这种方式会让官网可用性依赖 Mac Mini、电源、家庭或办公网络、端口映射、
TLS 和跨域配置。Mac Mini 离线时 Mall 会失效，因此不采用。

### 4.3 暂不采用：阿里云独立动态 Mall API

该方案需要新增生产数据库、同步服务、任务队列、备份、鉴权和监控。它适合未来
需要账号、收藏、复杂检索或多人后台时再评估，不属于第一阶段。

## 5. 信息架构

### 5.1 Mall 首页

本地化路由：

- 英文：`/mall/`
- 中文：`/zh/mall/`
- 波斯语：`/fa/mall/`

页面顺序：

1. JOTO 设计系统下的 Mall Hero；
2. 产品搜索；
3. 主要产品分类；
4. 最近收录产品；
5. 按应用场景浏览，仅在数据存在时显示；
6. 联系 JOTO；
7. 现有官网页脚。

Hero 采用用户确认的方案 A：先建立 JOTO 企业级 IT 目录定位，再进入分类和
产品，不复制抓取站的视觉样式。

### 5.2 产品列表

本地化路由：

- `/mall/products/`
- `/zh/mall/products/`
- `/fa/mall/products/`

功能：

- 按产品名称、型号和品牌搜索；
- 分类筛选；
- 品牌筛选，仅在品牌数据存在时显示；
- 库存状态筛选，仅在数据存在时显示；
- 成色筛选；
- 最新收录、最近更新和产品名称排序；
- 升序、降序；
- 每页数量；
- 网格和列表视图；
- 分页；
- 无结果时清除筛选；
- URL 查询参数可分享并支持浏览器前进、后退。

卡片显示：

- 产品主图或 JOTO 占位图；
- 品牌，仅在存在时显示；
- 产品名称；
- 型号，仅在存在时显示；
- 成色或状态，仅在存在时显示；
- `View details / 查看详情 / مشاهده جزئیات`。

产品卡片不显示价格和虚构参数。

### 5.3 产品详情

本地化路由：

- `/mall/products/<slug>/`
- `/zh/mall/products/<slug>/`
- `/fa/mall/products/<slug>/`

页面顺序：

1. 面包屑；
2. 图片画廊；
3. 产品名称、品牌、型号、状态和成色；
4. `Contact Us`；
5. Overview；
6. Specifications；
7. Downloads；
8. 来源说明；
9. Related Products；
10. 移动端固定询价操作。

只显示有内容的区块和页签。

### 5.4 询价链接

产品详情和卡片中的联系按钮进入对应语言的现有 Contact 页面，并携带产品
slug：

- `/contact/?product=<slug>#contact`
- `/zh/contact/?product=<slug>#contact`
- `/fa/contact/?product=<slug>#contact`

Contact 表单读取产品记录后，在项目需求字段中预填产品名称和型号。用户仍可
编辑内容，提交继续使用现有 `/api/contact`。

## 6. 官网视觉规则

Mall 必须复用现有 JOTO Global 设计规范：

- 深色背景；
- JOTO 绿色强调色；
- 现有网格背景；
- 现有页头、页脚和语言切换；
- 现有两档按钮尺寸；
- 英文使用 Poppins；
- 中文使用现有中文字体栈；
- 波斯语使用现有波斯语字体栈；
- 标题和正文行距遵循现有 typography design；
- 卡片、标签、边框、悬停和焦点状态与官网一致。

不得复制抓取站的：

- 颜色；
- 页头；
- Logo；
- 按钮视觉；
- 价格组件；
- 购物车组件；
- 促销组件。

抓取站仅作为内容字段、列表功能和详情信息层级的参考。

## 7. 组件边界

### 7.1 官网 Mall 导航模块

现有 `assets/mall-navigation-and-page.js` 继续负责：

- 在桌面和移动导航中插入本地化 Mall；
- 设置 `aria-current`；
- 保持所有正式页面导航一致。

正式 Mall 内容从该文件拆出，避免导航增强和产品目录逻辑耦合。

### 7.2 Mall 数据客户端

新增独立数据客户端，职责：

- 读取同域名的 `manifest.json`；
- 验证 `schema_version`；
- 加载目录索引和产品详情；
- 规范化当前语言和 LTR/RTL；
- 为搜索、筛选和分页提供稳定数据接口；
- 在数据不可用时返回可渲染的错误状态。

数据客户端不操作页面 DOM。

### 7.3 Mall 页面控制器

首页、产品列表和产品详情分别使用独立控制器。每个控制器只负责：

- 读取当前路由和查询参数；
- 调用数据客户端；
- 渲染对应页面；
- 维护可访问性状态；
- 更新 SEO 元数据；
- 绑定局部交互。

不得把全部 Mall 功能继续堆入现有单个增强文件。

### 7.4 Mall 样式

Mall 使用独立样式文件，并复用现有全站 token。样式只作用于
`[data-joto-mall]` 范围，避免影响首页、解决方案页、Blog 和 Contact。

### 7.5 快照生成器

快照生成器运行在 Mac Mini，消费抓取系统的公开、无交易字段数据。它负责：

- 确认指定抓取任务状态为 `completed`；
- 读取全量公开产品；
- 读取分类、品牌和产品详情；
- 收集本地图片和资料；
- 生成稳定 slug、目录索引和详情文件；
- 生成三语言页面需要的静态 SEO 数据；
- 生成文件校验和；
- 执行本地校验；
- 打包为不可变版本目录。

它不重新抓取合作站，不读取登录区，也不修改产品数据库。

### 7.6 发布器

发布器负责：

- 使用独立、受限的 SSH 部署身份连接阿里云；
- 上传到新的暂存目录；
- 在服务器端重新执行清单和禁止字段校验；
- 将版本移动到正式快照目录；
- 原子切换 `catalog-current`；
- 保留上一版本；
- 写入可审计的发布结果。

密码、私钥、服务器地址和令牌不得进入 Git。

## 8. 快照数据契约

每个快照目录至少包含：

```text
manifest.json
data/
  catalog-index.json
  categories.json
  brands.json
  products/
    <slug>.json
media/
  images/
    <content-hash>.<ext>
  documents/
    <content-hash>.<ext>
```

`manifest.json`：

```json
{
  "schema_version": "joto-mall-v1",
  "generated_at": "2026-07-29T00:00:00Z",
  "crawl_run_id": 123,
  "record_count": 15,
  "category_count": 2,
  "brand_count": 0,
  "image_count": 15,
  "document_count": 3,
  "source_build": "commit-or-build-id",
  "files": {
    "data/catalog-index.json": "sha256:...",
    "data/products/example.json": "sha256:..."
  }
}
```

产品详情文件允许的字段：

- `id`
- `slug`
- `title`
- `brand`
- `model`
- `category_path`
- `stock_status`
- `condition`
- `demand_tags`
- `rating`
- `review_count`
- `summary`
- `description_html`
- `application_scenarios`
- `specifications`
- `images`
- `documents`
- `related_products`
- `source_url`
- `first_seen_at`
- `last_success_at`
- `effective_status`

禁止字段在任意嵌套层级出现：

- `price`
- `list_price`
- `discount`
- `currency`
- `cart_url`
- `add_to_cart`
- `checkout`
- `payment`

`description_html` 继续使用抓取项目现有白名单清洗结果，官网渲染前再次执行
允许标签和属性校验。

## 9. 自动数据流

```text
成功抓取任务
  → 读取无交易字段的公开数据
  → 生成本地不可变快照
  → 本地结构、媒体、数量和安全校验
  → 上传阿里云暂存目录
  → 服务器端重复校验
  → 原子切换 catalog-current
  → 线上三语言 Mall 读取新版本
```

只有状态为 `completed` 的抓取任务可以触发发布。

以下状态不触发发布：

- `queued`
- `running`
- `paused`
- `blocked`
- `failed`
- `cancelled`

同一个 `crawl_run_id` 的重复触发必须幂等，不生成多个正式版本。

## 10. 阿里云目录与切换

建议使用独立于官网代码发布的目录：

```text
/var/www/jotoglobal/catalog-releases/
  <timestamp>-run-<id>/
/var/www/jotoglobal/catalog-current -> catalog-releases/<active-version>
```

官网代码发布与 Mall 数据发布相互独立：

- 官网代码更新不会删除 Mall 快照；
- Mall 数据更新不会覆盖官网历史 release；
- 两者均保留旧版本；
- Nginx 通过同域名只读路径提供快照数据和媒体。

对外静态数据路径：

```text
/mall-data/manifest.json
/mall-data/data/catalog-index.json
/mall-data/data/products/<slug>.json
/mall-data/media/images/<file>
/mall-data/media/documents/<file>
```

Nginx 不允许目录列表，不允许写请求，不向公网暴露 Mac Mini API。

## 11. 失败处理与回滚

### 11.1 本地生成失败

如果 API 不健康、抓取任务未完成、产品读取失败、媒体缺失或校验失败：

- 不上传；
- 不改变线上版本；
- 记录失败的任务 ID 和原因；
- 抓取系统继续保留自身数据。

### 11.2 上传或服务器校验失败

如果网络中断、文件不完整、校验和不符或服务器校验失败：

- 删除或隔离暂存版本；
- 不改变 `catalog-current`；
- 线上继续使用上一版本。

### 11.3 新版本上线后发现异常

回滚只需要将 `catalog-current` 原子指回上一版本。回滚不覆盖、不删除原版本，
并记录操作者、时间、旧版本和新版本。

### 11.4 前端读取失败

如果浏览器无法读取新数据：

- Mall 页头和页脚仍正常；
- 显示本地化的暂时不可用说明；
- 提供 Contact 和返回官网入口；
- 不显示空产品卡片；
- 不回退到 Mac Mini 实时 API。

## 12. SEO 与可访问性

### 12.1 SEO

- 三个 Mall 首页保留独立 canonical 和 hreflang；
- 产品详情 URL 使用稳定 slug；
- 产品详情设置本地化页面标题和 description；
- 产品英文名称保留原文；
- 产品详情包含 canonical 和三语言 alternate；
- 来源链接使用 `nofollow noopener`；
- sitemap 增加产品详情 URL；
- 已移除产品在下一快照中从 sitemap 删除，并返回可理解的 Not Found 状态。

### 12.2 可访问性

- 搜索、筛选、排序和视图切换均有可访问名称；
- 筛选结果更新后向辅助技术报告数量；
- 键盘可操作所有按钮、链接、画廊和页签；
- 图片具有产品名称 alt；
- 装饰图标隐藏；
- 焦点样式沿用官网；
- RTL 页面中的英文技术字段显式使用 `dir="ltr"`；
- `prefers-reduced-motion` 下禁用非必要动画。

## 13. 性能

- 图片生成响应式尺寸并延迟加载；
- 首张详情图优先加载；
- 目录索引使用压缩后的静态 JSON；
- 产品详情按 slug 单独加载，不把全部描述和规格放入首页索引；
- 页面只加载当前语言界面文案；
- 不在滚动事件中执行布局密集型计算；
- 动画只使用 `transform` 和 `opacity`；
- 移动端不得出现横向页面溢出。

## 14. 验证

### 14.1 静态验证

必须验证：

1. 三语言 Mall 首页、列表和产品详情路由存在；
2. 所有正式页面的 Mall 导航仍在 Blog 右侧；
3. schema version 正确；
4. manifest 数量与实际文件一致；
5. 所有校验和一致；
6. 所有图片和资料存在且 MIME 类型正确；
7. slug 唯一；
8. source URL 唯一；
9. 相关产品只引用存在的产品；
10. 禁止交易字段在任意层级均不存在；
11. HTML 描述通过白名单；
12. sitemap、canonical 和 hreflang 正确；
13. 生成器和发布器幂等；
14. 未完成抓取任务不能发布。

### 14.2 浏览器验证

至少覆盖：

- 英文、中文、波斯语；
- 1440、768、390 像素视口；
- 波斯语 RTL；
- Mall 首页分类和最新产品；
- 搜索；
- 分类、品牌、状态和成色筛选；
- 排序；
- 网格和列表视图；
- 分页；
- URL 前进、后退；
- 产品图片画廊；
- Overview、Specifications、Downloads；
- 缺失字段产品；
- Contact Us 参数和表单预填；
- 无结果；
- 数据加载失败；
- reduced motion；
- 页面无横向溢出；
- 控制台 0 error、0 warning；
- 键盘焦点顺序。

### 14.3 发布验证

必须实测：

1. 一个成功抓取任务生成新版本；
2. 同一任务重复触发不重复发布；
3. 校验失败不会切换线上版本；
4. 上传中断不会切换线上版本；
5. 新版本切换后首页、列表、详情和媒体均返回 200；
6. Mac Mini 停止后线上 Mall 仍可访问；
7. 回滚后旧版本恢复；
8. 官网代码 release 与 catalog release 互不覆盖。

## 15. 第一阶段范围外

本阶段不实现：

- 产品价格；
- 购物车；
- 在线支付；
- 用户账号；
- 收藏；
- Compare；
- 自动翻译产品技术内容；
- 公网暴露 Mac Mini 管理后台；
- 阿里云动态产品数据库；
- AI 推荐；
- 商城订单或库存承诺。

## 16. 完成标准

满足以下条件才算完成：

1. 方案 A 的三个正式 Mall 页面完成并符合 JOTO 设计；
2. 三语言界面完成，产品技术内容保留英文；
3. 当前 15 条产品可以通过快照显示；
4. 空品牌、空型号、空规格和空资料不会产生错误或丑陋空块；
5. 搜索、筛选、排序、视图和分页可用；
6. 产品详情和 Contact Us 预填可用；
7. 每次成功抓取后可自动发布新快照；
8. 任一失败不会破坏当前线上版本；
9. 静态、浏览器和生产验证全部通过；
10. 代码和 Mall 数据均使用新版本发布，不覆盖历史版本。
