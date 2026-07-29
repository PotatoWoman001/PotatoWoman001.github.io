# Mall 深色自定义筛选下拉设计

**日期：** 2026-07-29  
**状态：** 视觉与交互方向已确认，待实施  
**适用范围：** 英文、中文、波斯语 Mall 商品列表页

## 1. 背景

Mall 商品列表页当前使用浏览器原生 `<select>`。关闭状态已经使用 Mall
深色样式，但展开后的选项面板由 macOS/Chromium 原生界面绘制，在用户环境
中显示为白色半透明菜单，无法可靠继承网站背景、圆角与选中状态。

排序和排序方向还存在重复选项：

- 排序同时生成空值“标题”和真实值 `title` 的“标题”。
- 排序方向同时生成空值“升序”和真实值 `asc` 的“升序”。

重复来自通用 `selectControl()` 无条件插入“全部/默认”选项，而排序控件又把
相同文案作为真实选项追加。

## 2. 设计目标

- 展开菜单完全使用 Mall 深色视觉，不调用系统白色原生弹层。
- 排序只显示“标题、品牌、最近收录”。
- 排序方向只显示“升序、降序”。
- 分类、品牌、状态和成色继续保留“全部”选项。
- 保持现有 URL 查询参数、浏览器前进后退和商品查询逻辑。
- 英文、中文和波斯语使用同一组件结构。
- 支持鼠标、触摸、键盘和屏幕阅读器。
- 保留隐藏原生 `<select>` 作为现有状态接口，避免重写目录查询层。

## 3. 组件结构

每个筛选控件由四部分组成：

1. 可见标签。
2. 隐藏原生 `<select>`。
3. 可见触发按钮。
4. 自定义 `listbox` 菜单。

示意结构：

```html
<div class="joto-mall__filter joto-mall__custom-select">
  <span id="joto-mall-filter-sort-label">排序</span>
  <select
    class="joto-mall__native-select"
    name="sort"
    tabindex="-1"
    aria-hidden="true"
  ></select>
  <button
    class="joto-mall__select-trigger"
    type="button"
    aria-haspopup="listbox"
    aria-expanded="false"
    aria-labelledby="joto-mall-filter-sort-label joto-mall-filter-sort-value"
  >
    <span id="joto-mall-filter-sort-value">标题</span>
  </button>
  <div
    class="joto-mall__select-menu"
    role="listbox"
    hidden
  ></div>
</div>
```

隐藏原生 `<select>` 保留现有 `name` 和选项值。自定义菜单完成选择后：

1. 更新原生 `<select>.value`。
2. 派发冒泡的 `change` 事件。
3. 复用当前 `controls` 表单上的事件代理。
4. 调用现有 `update()` 更新 URL 和结果。

目录解析、查询、排序和历史记录代码不改。

## 4. 选项数据

`selectControl()` 不再接收“值数组 + 默认文案”，改为接收明确的选项对象：

```js
[
  { value: "title", label: locale.sortTitle },
  { value: "brand", label: locale.sortBrand },
  { value: "recent", label: locale.sortRecent },
]
```

分类、品牌、状态和成色由调用方显式添加空值选项：

```js
[
  { value: "", label: locale.allCategories },
  ...categories.map((value) => ({ value, label: value, dir: "ltr" })),
]
```

这样排序和排序方向不会再隐式生成空值重复项。

排序选项固定为：

- `title`
- `brand`
- `recent`

排序方向固定为：

- `asc`
- `desc`

## 5. 视觉规范

### 5.1 触发按钮

- 高度：44px。
- 宽度：100%。
- 背景：`#08110d`。
- 边框：Mall 细边框色。
- 圆角：8px。
- 字号：14px。
- 文本颜色：`#f4f7f5`。
- 右侧使用轻量下拉箭头；RTL 页面自动切换至阅读结束侧。
- 展开时边框使用 `#5dd3a0`。

### 5.2 菜单

- 位于触发按钮下方 8px。
- 背景：`#0c1712`。
- 边框：`rgba(93, 211, 160, 0.42)`。
- 圆角：12px。
- 阴影：深色柔和阴影，不使用玻璃白色效果。
- `z-index` 高于筛选栏和商品卡片。
- 最大高度：280px；超出后菜单内部垂直滚动。
- 宽度至少等于触发按钮。

### 5.3 选项

- 最小高度：44px。
- 左右内边距：14px。
- 字号：14px。
- 默认文字：`#f4f7f5`。
- 悬停/键盘高亮：深绿色表面。
- 当前选项：绿色文字、深绿色背景，并显示选中标识。
- 技术分类、品牌和英文型号使用 LTR 字符顺序。

## 6. 交互

### 6.1 打开与关闭

- 点击触发按钮打开当前菜单。
- 同一时间只允许一个菜单展开。
- 再次点击触发按钮关闭。
- 点击控件外部关闭。
- 按 `Escape` 关闭并把焦点返回触发按钮。
- 按 `Tab` 离开控件时关闭，不阻止正常焦点顺序。
- 商品结果刷新时菜单自然关闭。

### 6.2 键盘

- `Enter` 或 `Space`：打开菜单。
- `ArrowDown`：打开并聚焦当前选项；展开时移动至下一项。
- `ArrowUp`：打开并聚焦当前选项；展开时移动至上一项。
- `Home`：移动至第一项。
- `End`：移动至最后一项。
- `Enter` 或 `Space`：选择高亮项。
- `Escape`：取消并关闭。

移动范围在首尾处停止，不循环。

### 6.3 选择

选择后：

- 触发按钮显示新文案。
- 对应选项设置 `aria-selected="true"`。
- 隐藏原生 `<select>` 更新为相同值。
- 现有 URL 查询参数同步更新。
- 浏览器前进/后退恢复对应选项与结果。

## 7. 三语言和方向

- 英文：LTR。
- 中文：LTR。
- 波斯语：RTL。
- 菜单使用 CSS 逻辑属性定位。
- 波斯语本地化选项按 RTL 对齐。
- 分类名、品牌名、型号等技术字符串使用 `dir="ltr"`。
- 触发按钮和菜单不得引起页面整体横向溢出。

## 8. 无障碍

- 触发按钮使用 `aria-haspopup="listbox"`。
- `aria-expanded` 与菜单状态同步。
- 触发按钮通过 `aria-labelledby` 同时关联字段标签与当前值。
- 菜单使用 `role="listbox"`。
- 选项使用 `role="option"` 和 `aria-selected`。
- 键盘高亮项可获得焦点，具有清晰 `focus-visible` 状态。
- 隐藏原生 `<select>` 使用 `aria-hidden="true"` 和 `tabindex="-1"`，
  不产生重复的可访问控件。
- 无 JavaScript 时 Mall 商品页原本就无法加载目录，因此不增加额外的原生
  降级界面。

## 9. 事件与生命周期

自定义控件使用 `controls` 表单上的事件代理，不给每次 `paint()` 创建的菜单
重复注册全局监听器。

页面级外部点击和键盘关闭监听器只注册一次。`paint()` 重新生成筛选控件后，
现有代理继续工作，避免监听器泄漏或一次操作触发多次更新。

## 10. 验证标准

### 10.1 静态验证

- 排序原生选项值严格为 `title / brand / recent`。
- 排序方向原生选项值严格为 `asc / desc`。
- 页面包含自定义触发器、listbox 和隐藏原生 select。
- 不再使用原生 select 作为可见交互入口。
- 菜单深色、圆角、选项高度与 Poppins 字体规则存在。

### 10.2 浏览器验证

覆盖英文、中文、波斯语及 `1440×900`、`768×1024`、`390×844`：

- 每个筛选触发器可打开深色菜单。
- 展开菜单背景为深色，不出现系统白色弹层。
- 排序和方向没有重复文案。
- 鼠标点击选项后 URL 和结果更新。
- 键盘可打开、移动、选择和关闭。
- 外部点击可关闭。
- 波斯语 RTL 与技术字符串 LTR 正确。
- 页面无整体横向溢出。
- 控制台无错误和警告。

## 11. 非目标

- 不修改商品分类数据和爬虫。
- 不改变查询参数名称。
- 不改变商品卡片、分页和详情页。
- 不修改主站语言选择器和其他页面的原生表单控件。
- 不引入第三方下拉组件或新的运行时依赖。
