# 香港繁体中文（zh-HK）版本说明

更新日期：2026-11-24

## 范围（第一期）

- 新增 `/zh-hk/` 路径，共 35 个页面：首页、关于、联系、最新资讯列表和 6 篇静态文章，以及全部 25 个解决方案页（5 个大类 + 20 个品牌页）。
- 页面语言为 `lang="zh-HK"`；SEO 的 hreflang 为 `zh-HK`，og:locale 为 `zh_HK`，结构化数据的 inLanguage 为 `zh-HK`。
- 语言切换器显示 `EN / 简体中文 / 繁體中文 / فارسی` 四种语言，每个选项都用它自己的字形显示（在繁体页面上「简体中文」也保持简体写法）。波斯语页面原来没有切换器入口，这次一并补上。
- 暂不包含：商城（`/mall/`、`/mall/products/`）和后台自动生成的文章。在繁体页面点击这些入口，会进入现有的简体页面 `/zh/...`。

## 工作方式

- `/zh-hk/` 页面复用简体中文（zh-CN）的内容。`assets/zh-hk-locale.js` 在页面渲染时把文字转换成香港繁体，规则按以下优先级生效：
  1. `OVERRIDES`：整句覆盖，用于收录香港同事审核后修改的文字；
  2. `PHRASES`：香港用语词组，例如 网络→網絡、服务器→伺服器、支持→支援、信息→資訊、咨询→諮詢、托管→託管、视频→視像、短信→短訊、通过→透過；
  3. `CHARS`：简体字逐字转换为繁体字（香港字形，如「裏」「着」），引号 “” 转为 「」。
- 以下内容不做改写：法定公司名称（以「有限公司 / 集团 / 学校」结尾的名称只转字形，不改用词）、`沪ICP备…号` 备案号（保持原样）。
- 用户在表单中输入的内容不会被转换。

## 自动选择语言（沿用原有的浏览器语言逻辑，未使用 IP）

逻辑与原来相同：如果访客访问过带语言前缀的页面，或在切换器中选过语言，优先使用记录在 `localStorage` 中的选择（`joto:locale`）；没有记录时，按浏览器语言列表中第一个中文或波斯语项来判断。本次只新增一条映射：

| 浏览器语言 | 原来 | 现在 |
| --- | --- | --- |
| zh-HK、zh-MO、zh-TW、zh-Hant* | 简体 `/zh/` | 繁体 `/zh-hk/` |
| zh、zh-CN、zh-SG 等其他 zh | 简体 `/zh/` | 不变 |
| en、th 等其他语言 | 英文 | 不变 |
| fa | 波斯语 `/fa/` | 不变 |

已经有语言记录的访客继续进入他们原来选择的语言。例如之前被自动带到 `/zh/` 的香港访客，会继续看到简体，直到在切换器中改选「繁體中文」。

## 全球定位的 SEO 文案

首页、关于、联系三个页面的 title 和 description 改为全球定位，泰国、香港、新加坡作为重点市场写进 description。英文、简体、波斯语由 `scripts/integrate-global-seo-copy.mjs` 写入主 JS，繁体由简体自动转换。原来的「Enterprise IT Integrator in China」「上海企业 IT 系统集成服务商」等只强调中国的写法已全部替换。

## 相关文件

- `assets/zh-hk-locale.js`：新增。繁体转换规则和页面转换逻辑。
- `assets/index-covers-fe2c6a4b8409.js`（线上实际加载的主程序）：加入 zh-HK 的路由、链接、切换器、浏览器语言映射、canonical/hreflang、og:locale 和 inLanguage 支持，共 16 处补丁，由 `scripts/integrate-zh-hk-locale.mjs` 生成。旧文件 `assets/index-DaFvN0XI.js` 保持不变，已不再被页面引用。
- `assets/index-e49ffBFL.css`：中文标题的字号和字距规则同时适用于 `zh-HK`。
- `assets/contact-form-sections.js`：繁体页使用中文表单文案，首页的「聯絡我們」链接指向 `/zh-hk/contact`。
- `assets/mall-navigation-and-page.js`：繁体页的导航中显示「商城」入口和产品分类菜单，链接到 `/zh/mall/`。
- `assets/cisco-certifications.js`、`assets/check-point-email-security.js`：在 `/zh-hk/` 页面上也渲染 Cisco 认证轮播和 Check Point 邮件安全模块。
- `assets/jotoglobal-articles.js`：`/zh-hk/blog/` 列表里混排的生成文章使用中文内容（转为繁体显示），链接到简体文章页。
- `assets/jotoglobal-lead-routing.js`：`/zh-hk/` 页面的询盘按 `zh-CN` 语言上报（保证后台接口兼容），页面路径保留 `/zh-hk/...`，可据此区分香港访客。
- `zh-hk/**/index.html`：35 个页面外壳，由对应的 `zh/` 页面生成，另加载繁体转换脚本。
- `sitemap.xml`：新增 35 条 `/zh-hk/` 地址；全部 140 条核心地址都带上 en / zh-CN / zh-HK / fa-IR / x-default 五个 alternate。商城地址不变。
- `robots.txt`：新增 `Disallow: /zh-hk/preview/`。
- `scripts/integrate-zh-hk-locale.mjs`：新增。集成脚本，可重复执行。
- `scripts/verify-zh-hk-locale.mjs`：新增。繁体版专用校验，已加入发布 workflow 的校验步骤。
- `docs/zh-hk-review.csv`：给香港同事的审核表（简体原文对照繁体结果）。

## 香港同事审核后如何修改

1. 在 `docs/zh-hk-review.csv` 的「审核结论」列填写 `OK` 或修改后的文字。
2. 常见用词的修改加到 `assets/zh-hk-locale.js` 的 `PHRASES`，会对全站生效；只涉及个别句子的修改加到 `OVERRIDES`，键为简体原文。
3. 运行 `node scripts/verify-zh-hk-locale.mjs`，再按下面的方法在本地检查页面。

## 本地测试

```bash
node scripts/verify-zh-hk-locale.mjs
node scripts/verify-site-rules.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-mall-catalog-pages.mjs
python3 -m http.server 8080   # 打开 http://localhost:8080/zh-hk/
```

在浏览器开发者工具中把语言模拟为 `zh-HK`，并清除 `localStorage` 中的 `joto:locale`，然后访问 `/`，应自动跳转到 `/zh-hk/`。

## 与线上同步（2026-11-24）

本分支以 `codex/jotoglobal-maintenance` 为基础，合并了 `codex/jotoglobal-admin-integration` 和 4 个本地提交（博客列表混排生成文章），再把线上的页面和资源逐字节还原：全部 HTML、`index-covers-fe2c6a4b8409.js`（maintenance 主程序 + 6 张文章封面图 + SEO 模块引入）、`jotoglobal-articles.css`、`sitemap.xml`、`robots.txt`。还原后的哈希与线上逐一比对一致。

## 全球定位的 SEO 模块

`assets/joto-global-seo-20261124.js` 取代 2026-11-21 的 `joto-regional-seo-20261121.js`，覆盖首页和网络、安全、物理安防三个解决方案页（英文、简体、繁体）。title 和页面底部说明以「全球企业 IT 服务商」为主，泰国、香港、新加坡作为重点市场出现。文案在 `scripts/build-global-seo-module.mjs` 的 `PAGES` 中维护，运行该脚本会重新生成模块并同步静态 `<title>`/meta；繁体由简体自动转换后写入模块。

## 发布流程中的文章

生成文章（`blog/<slug>/` 等、`article-data/`、`article-sitemap.xml`）由服务器上的文章发布器维护。发布时 `scripts/carry-over-generated-articles.mjs` 会把当前线上版本中的文章原样带入新版本，只有当前版本没有文章清单时才用仓库渲染器重新渲染，避免覆盖线上文章。

## 静态资源版本

本次修改过的资源统一使用 `?v=20261124-1`（主程序、主样式、联系表单、商城导航、商城目录、Cisco 认证、Check Point、文章列表的 JS/CSS），其余资源保留线上原版本号。校验脚本中的版本号、主程序文件名和页面总数（114 → 149，不含生成文章）已同步更新。
