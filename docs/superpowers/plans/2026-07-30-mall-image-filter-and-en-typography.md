# Mall 有效图片过滤与英文首页排版实施计划

> **执行要求：** 使用 `executing-plans` 按任务顺序实施；每个行为变更先建立失败契约，再完成实现与验证。

**目标：** 从 Mall 的首页推荐、产品列表、搜索、筛选、数量与分页中排除没有真实产品图片的商品，同时保留其产品详情直达能力；缩小英文首页项目案例标题与联系区标题，减少折行并保持 Poppins 字体。

**架构：** 在 `assets/mall-data-client.js` 提供唯一的 `hasProductImage(product)` 判定函数。`queryProducts()` 在搜索、筛选、排序与分页前过滤无真实图片商品，`assets/mall-catalog-pages.js` 的首页推荐复用同一函数；`loadProduct()` 不过滤详情数据。英文排版使用 `html:lang(en)` 局部 CSS 覆盖，不改变全局字体令牌和中文、波斯语页面。

**技术栈：** 静态 HTML、CSS、浏览器原生 JavaScript 模块、Node.js 断言脚本、Playwright CLI、Nginx/Docker。

## 全局约束

- 已知无图占位文件名为 `cd6a5082346e186283e0cf0f632762a1172f6ad74da5d9b7a9689974a7afbc84.webp`。
- 图片路径判定忽略查询参数与哈希，按最终文件名小写匹配。
- 无图商品不能进入首页推荐、列表、搜索结果、筛选项、总数或分页，但详情 URL 仍可访问。
- 不删除或修改抓取快照，不改变 Mall 数据发布流程。
- 英文案例卡标题为 `16px/24px/500`，英文联系区标题为 `clamp(36px, 3.2vw, 48px)`、`line-height: 1.12`。
- 不改变中文、波斯语排版，不新增运行时依赖。
- 不提交 `.playwright-cli/` 或 `.superpowers/`。

---

### 任务 1：建立失败契约

**文件：**
- 修改：`scripts/verify-mall-data-client.mjs`
- 修改：`scripts/verify-mall-catalog-pages.mjs`
- 修改：`scripts/verify-homepage-refinements.mjs`

- [ ] **步骤 1：为有效图片判定和查询顺序添加测试**

在 `scripts/verify-mall-data-client.mjs`：

- 导入 `hasProductImage`。
- 为真实图片、空图片数组、已知无图占位路径分别断言 `true/false/false`。
- 给现有测试商品补充真实图片路径。
- 新增包含真实图片、空图片和占位图片的索引，断言 `queryProducts()` 只返回真实图片商品，且 `total`、分页及 facets 不包含被隐藏商品。

- [ ] **步骤 2：为首页推荐复用判定添加静态契约**

在 `scripts/verify-mall-catalog-pages.mjs` 中断言：

```js
assert.match(pages, /hasProductImage/);
assert.match(pages, /\.filter\(hasProductImage\)/);
```

- [ ] **步骤 3：为英文局部排版添加精确契约**

在 `scripts/verify-homepage-refinements.mjs` 中断言：

- `html:lang(en) #case-studies .group > .flex-1 h3` 包含 `font-size: 16px`、`line-height: 24px`、`font-weight: 500`、`max-width: none`。
- `html:lang(en) #contact .joto-home-contact__copy h2` 包含 `max-width: 32rem`、`clamp(36px, 3.2vw, 48px)`、`line-height: 1.12`、`letter-spacing: -0.04em`。

- [ ] **步骤 4：运行测试并确认先失败**

```bash
node scripts/verify-mall-data-client.mjs
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-homepage-refinements.mjs
```

预期：新增断言因实现尚未存在而失败。

- [ ] **步骤 5：提交测试契约**

```bash
git add scripts/verify-mall-data-client.mjs scripts/verify-mall-catalog-pages.mjs scripts/verify-homepage-refinements.mjs
git commit -m "test: define Mall image and English typography refinements"
```

### 任务 2：实现 Mall 有效图片过滤

**文件：**
- 修改：`assets/mall-data-client.js`
- 修改：`assets/mall-catalog-pages.js`
- 测试：`scripts/verify-mall-data-client.mjs`
- 测试：`scripts/verify-mall-catalog-pages.mjs`

- [ ] **步骤 1：实现唯一图片判定函数**

在 `assets/mall-data-client.js` 导出：

```js
export function hasProductImage(product) {
  return Array.isArray(product?.images)
    && product.images.some((image) => {
      const pathname = String(image || "").split(/[?#]/, 1)[0];
      const filename = pathname.split("/").pop()?.toLowerCase();
      return Boolean(filename) && !PLACEHOLDER_IMAGE_FILENAMES.has(filename);
    });
}
```

占位文件名使用模块级 `Set` 管理。

- [ ] **步骤 2：在查询管线最前端过滤**

在 `queryProducts()` 中先执行：

```js
const source = (Array.isArray(index?.products) ? index.products : [])
  .filter(hasProductImage);
```

确保后续搜索、筛选、排序、facets、总数和分页都基于已过滤集合；`loadProduct()` 保持不变。

- [ ] **步骤 3：首页推荐复用同一判定**

在 `assets/mall-catalog-pages.js` 导入 `hasProductImage`，并在首页最近商品的排序和截取前调用 `.filter(hasProductImage)`。

- [ ] **步骤 4：运行数据与页面控制器验证**

```bash
node scripts/verify-mall-data-client.mjs
node scripts/verify-mall-catalog-pages.mjs
```

预期：全部通过。

- [ ] **步骤 5：提交实现**

```bash
git add assets/mall-data-client.js assets/mall-catalog-pages.js
git commit -m "feat: filter Mall products without real images"
```

### 任务 3：调整英文首页局部排版

**文件：**
- 修改：`assets/homepage-refinements.css`
- 修改：`assets/contact-form-sections.css`
- 测试：`scripts/verify-homepage-refinements.mjs`

- [ ] **步骤 1：缩小英文案例卡标题**

在英文专属选择器中设置：

```css
html:lang(en) #case-studies .group > .flex-1 h3 {
  width: 100%;
  max-width: none !important;
  margin-inline: auto !important;
  font-family: "Poppins", sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
  text-align: left !important;
}
```

- [ ] **步骤 2：缩小英文联系区标题**

在 `assets/contact-form-sections.css` 添加：

```css
html:lang(en) #contact .joto-home-contact__copy h2 {
  max-width: 32rem;
  font-size: clamp(36px, 3.2vw, 48px) !important;
  line-height: 1.12 !important;
  font-weight: 500;
  letter-spacing: -0.04em;
}
```

- [ ] **步骤 3：运行首页与字体系统验证**

```bash
node scripts/verify-homepage-refinements.mjs
node scripts/verify-site-typography-mall.mjs
```

预期：全部通过，中文和波斯语选择器未被改变。

- [ ] **步骤 4：提交样式**

```bash
git add assets/homepage-refinements.css assets/contact-form-sections.css
git commit -m "style: refine English homepage content typography"
```

### 任务 4：扩展浏览器回归并更新资源版本

**文件：**
- 修改：`scripts/verify-mall-browser.mjs`
- 修改：引用 `20260729-7` 的受控 HTML、JS 与验证脚本

- [ ] **步骤 1：增加浏览器断言**

扩展 Playwright 验证：

- 三语言 Mall 首页推荐不含 `DI-7008-MINI`。
- 三语言产品列表总数由 16 变为 15。
- 搜索 `DI-7008-MINI` 返回零张卡片。
- 该商品详情 URL 仍能正常加载。
- 英文桌面端案例标题计算样式为 `16px/24px`。
- 英文联系区标题最大不超过 `48px` 且行高为 `1.12`。
- 1440×900、768×1024、390×844 无页面横向溢出和控制台错误。

- [ ] **步骤 2：统一更新缓存版本**

将受控资源版本从 `20260729-7` 更新为 `20260730-1`，不修改历史设计文档中的示例版本。

- [ ] **步骤 3：运行完整静态检查**

```bash
node scripts/verify-mall-data-client.mjs
node scripts/verify-mall-catalog-pages.mjs
node scripts/verify-homepage-refinements.mjs
node scripts/verify-site-typography-mall.mjs
node scripts/verify-site-rules.mjs
node scripts/verify-mall-snapshot.mjs fixtures/mall-snapshot-v1
node --test scripts/verify-mall-snapshot.test.mjs scripts/publish-mall-snapshot.test.mjs
git diff --check
```

- [ ] **步骤 4：提交浏览器契约与版本更新**

```bash
git add assets index.html zh/index.html fa/index.html mall zh/mall fa/mall scripts
git commit -m "test: verify Mall image filtering and English typography"
```

### 任务 5：重建本地 Docker 并完成真实浏览器验证

**文件：**
- 验证：Docker/Nginx 本地站点
- 验证：`scripts/verify-mall-browser.mjs`

- [ ] **步骤 1：重建并替换本地预览容器**

```bash
docker build -f Dockerfile.local -t jotoglobal-mall:20260730-1-dev .
docker stop jotoglobal-mall-20260729-7-dev
docker run --name jotoglobal-mall-20260730-1-dev --rm -d -p 127.0.0.1:3009:80 -v "/Users/cuihua/Documents/jotoglobal 信息获取站/data/exports/jotoglobal/20260729T033844Z-run-8:/usr/share/nginx/html/mall-data:ro" jotoglobal-mall:20260730-1-dev
```

- [ ] **步骤 2：运行 Playwright 三语言矩阵**

```bash
node scripts/verify-mall-browser.mjs
```

预期：英文、中文、波斯语在桌面、平板和手机视口全部通过；无横向溢出、控制台错误或警告。

- [ ] **步骤 3：修复发现的问题并重跑相关检查**

任何修复必须重新运行对应静态检查和完整浏览器矩阵。

- [ ] **步骤 4：最终核对**

```bash
git diff --check
git status --short
git log -5 --oneline
```

预期：跟踪文件干净；仅保留既有 `.playwright-cli/` 与 `.superpowers/` 未跟踪目录。
