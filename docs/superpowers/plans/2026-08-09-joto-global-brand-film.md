# JOTO Global Brand Film Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按已批准的设计规格制作一支 85 秒、1920×1080、25 fps 的 JOTO Global 企业品牌片，并交付英文主版、中文字幕版、网站压缩版、字幕、海报帧和完整生成记录。

**Architecture:** 使用“无字 AI 场景素材 + 单一全片品牌图形层 + 独立音乐/环境声 + 双时间线导出”的非破坏式结构。先生成 4 张风格关键帧，再生成 3 个付费视频样片；每个额度消耗阶段均需用户明确确认。英文版和中文版复用同一底片与声音，仅切换图形层的中文字幕属性，避免双版本漂移。

**Tech Stack:** ChatCut 项目与时间线、Kling Pro 1080p 图生视频、OpenAI ImageGen 风格关键帧、ChatCut Motion Graphic JSX、H.264/AAC、Node.js JSON 校验、`ffprobe`/`ffmpeg` 技术验收。

**Global Constraints:**

- 已批准规格是唯一内容基准：`docs/superpowers/specs/2026-08-09-joto-global-brand-film-design.md`。
- 成片固定为 `1920×1080`、16:9、25 fps、2125 帧；可接受导出时长为 84–86 秒。
- AI 场景不得生成文字、Logo、地图标签、可读软件界面、客户商标、厂商商标或水印。
- 不使用旧资产 `work/jotoglobal-admin-integration-site/assets/joto-logo-DZVb1uOz.png`；它包含旧版 “Collaborate and Better” 标语，不是本片获批的现行品牌标志。
- 不使用 `hero-YxcAnS2F.jpg`、`planning-R2ujKFgS.jpg`、`deployment-Cx4LVhlN.jpg`、`operations-CtQsnGLa.jpg` 作为成片画面或生成参考；它们分别存在过度科幻、第三方品牌、损坏或供应商产品图问题。
- 默认片尾使用当前官网式纯文字标志 `JOTO Global` 与 `We Make IT Happen.`，字体使用 Poppins。若用户在制作过程中提供现行官方 SVG/透明 PNG，可在不改变时码的情况下替换纯文字标志。
- ChatCut 中任何 `submit_video`、`submit_music` 或重复生成调用都必须先向用户说明模型、镜头数量、时长及预计用途，并获得针对该批次的明确确认；确认不自动覆盖重试或变体。
- 生成任务失败或质量不合格时先报告问题与可选处理，不静默提交第二个付费任务。
- 不修改官网、不发布成片、不使用未经批准的第三方素材。

---

## Task 1：建立可追溯的制作包

**Files:**

- Create: `brand-film/joto-global/.gitignore`
- Create: `brand-film/joto-global/README.md`
- Create: `brand-film/joto-global/brand-assets.json`
- Create: `brand-film/joto-global/shot-manifest.json`
- Create: `brand-film/joto-global/prompts/video-prompts.md`
- Create: `brand-film/joto-global/prompts/music-prompt.md`
- Create: `brand-film/joto-global/subtitles/joto-global-brand-film-zh.srt`
- Create later from actual tool results: `brand-film/joto-global/project.json`

- [ ] **Step 1：创建目录与忽略规则**

创建 `brand-film/joto-global/.gitignore`，内容固定为：

```gitignore
generated/
exports/
```

创建目录：

```bash
mkdir -p brand-film/joto-global/{generated,headframes,motion,prompts,subtitles,exports}
```

Expected: 目录存在，生成文件与最终大体积导出不会进入 Git。

- [ ] **Step 2：写入品牌资产登记表**

`brand-assets.json` 必须包含以下已确认值：

```json
{
  "version": 1,
  "sourceOfTruth": "https://jotoglobal.com/",
  "canvas": { "width": 1920, "height": 1080, "fps": 25 },
  "colors": {
    "ink": "#070b0a",
    "green": "#5ed29c"
  },
  "fonts": {
    "primary": "Poppins",
    "localFiles": [
      "work/jotoglobal-admin-integration-site/assets/Poppins-Regular.ttf",
      "work/jotoglobal-admin-integration-site/assets/Poppins-Medium.ttf",
      "work/jotoglobal-admin-integration-site/assets/Poppins-SemiBold.ttf",
      "work/jotoglobal-admin-integration-site/assets/Poppins-Bold.ttf"
    ]
  },
  "endCard": {
    "wordmark": "JOTO Global",
    "taglineEn": "We Make IT Happen.",
    "taglineZh": "让 IT 真正发生。",
    "officialLogoPolicy": "Use typographic wordmark unless a current official vector or transparent high-resolution logo is supplied and approved."
  },
  "excludedAssets": [
    {
      "path": "work/jotoglobal-admin-integration-site/assets/joto-logo-DZVb1uOz.png",
      "reason": "Old lockup contains the retired Collaborate and Better tagline."
    },
    {
      "path": "work/jotoglobal-admin-integration-site/assets/hero-YxcAnS2F.jpg",
      "reason": "Overly futuristic composite style conflicts with the approved documentary direction."
    },
    {
      "path": "work/jotoglobal-admin-integration-site/assets/planning-R2ujKFgS.jpg",
      "reason": "Contains third-party branded presentation content."
    },
    {
      "path": "work/jotoglobal-admin-integration-site/assets/deployment-Cx4LVhlN.jpg",
      "reason": "Broken or unusable source image."
    },
    {
      "path": "work/jotoglobal-admin-integration-site/assets/operations-CtQsnGLa.jpg",
      "reason": "Contains vendor product branding."
    }
  ]
}
```

- [ ] **Step 3：写入 14 镜头清单**

`shot-manifest.json` 使用以下字段：`id`、`startFrame`、`endFrame`、`durationFrames`、`durationSeconds`、`kind`、`englishText`、`chineseText`、`visualIntent`、`generationPrompt`。`endFrame` 为不包含上界。清单必须精确覆盖：

| ID | 帧范围 | 秒数 | kind | 英文文字 |
| --- | ---: | ---: | --- | --- |
| S01 | 0–150 | 6 | generated-video | What does it take to make IT truly work? |
| S02 | 150–325 | 7 | generated-video | Not just products. Not just promises. |
| S03 | 325–525 | 8 | generated-video | It takes planning, integration and people who stay accountable. |
| S04 | 525–700 | 7 | generated-video+motion | Since 2010, JOTO has helped enterprises make IT happen. |
| S05 | 700–825 | 5 | generated-video | Connect every site. |
| S06 | 825–950 | 5 | generated-video | Protect every layer. |
| S07 | 950–1075 | 5 | generated-video | Power every workload. |
| S08 | 1075–1200 | 5 | generated-video | Keep every team in sync. |
| S09 | 1200–1325 | 5 | generated-video | Secure every space. |
| S10 | 1325–1525 | 8 | generated-video | From the first blueprint to 24×7 operations. |
| S11 | 1525–1725 | 8 | generated-video+motion | Local execution. Global coordination. |
| S12 | 1725–1925 | 8 | generated-video | So people stay connected. Operations stay resilient. Growth keeps moving. |
| S13 | 1925–2050 | 5 | generated-video | Together, we make IT happen. |
| S14 | 2050–2125 | 3 | motion-only | JOTO Global · We Make IT Happen. |

每项中文文字必须逐字采用规格文档中的定稿字幕。所有 `durationFrames` 必须等于 `endFrame - startFrame`。

- [ ] **Step 4：写入统一风格规则与逐镜视频提示词**

`prompts/video-prompts.md` 首先写入以下共享后缀，所有 S01–S13 提示词末尾逐字追加：

```text
cinematic corporate documentary, realistic multinational enterprise environment in Asia, natural practical lighting, restrained camera movement, authentic IT infrastructure, physically plausible hands and hardware, 16:9 composition, no logos, no readable text, no holograms, no sci-fi interface, no neon cyberpunk, no watermark
```

逐镜核心提示词固定为：

1. **S01** — Pre-dawn modern Asian city and quiet enterprise office, then a real data-center aisle waking as practical indicator lights appear, slow controlled push-in, deep neutral shadows, no dramatic failure imagery.
2. **S02** — Quiet network rack, access-control reader, empty meeting room and operations wall coming online through match cuts, calm dependable atmosphere, all screens defocused and unreadable.
3. **S03** — Asian and international IT engineers reviewing a paper network plan with a client at a real enterprise site, then verifying cables and rack equipment, accountable collaboration, natural gestures.
4. **S04** — Contemporary Shanghai skyline at working-hour dawn, diverse enterprise project team walking into a bright project space, confident but understated, leave negative space for a 2010-to-present timeline graphic.
5. **S05** — Network engineer connecting an enterprise campus, branch office and data-center rack through practical installation actions, clean patch panels and fiber handling, stable connectivity, lateral match movement.
6. **S06** — Security operations analyst and IT engineer reviewing endpoint, identity and network protection in a realistic SOC, screens intentionally soft and unreadable, composed alert response, no crisis.
7. **S07** — Realistic server and storage infrastructure running steadily, engineer checks status lights and hot-swap bays without removing hardware, slow dolly, precise professional environment.
8. **S08** — International teams collaborating across a modern meeting room and video conference, active listening and practical decision-making, screens unreadable, warm human energy without staged celebration.
9. **S09** — Modern office entrance access control, discreet CCTV installation and professional security control room, realistic devices without vendor marks, calm protected environment.
10. **S10** — A coherent enterprise IT lifecycle montage: blueprint consultation, equipment handoff, careful rack installation, on-site inspection and remote support, match-cut through hands and tools, same visual palette.
11. **S11** — Multinational IT teams working in Shanghai, Tokyo, Singapore and London-like business environments, coordinated handoffs across time zones, subtle travel and remote operations cues, leave open composition for abstract map lines, no city labels.
12. **S12** — Resilient operations across an international school, premium retail store, modern laboratory, advanced manufacturing floor and global office, people working naturally while technology remains quietly reliable, cohesive montage.
13. **S13** — JOTO-like engineers and a client walking through a completed enterprise server and collaboration environment, checking the finished project together, warm confident light, shared accomplishment, no visible branding.

在文件末尾记录统一负面约束：`no accidental text, no extra fingers, no distorted hands, no impossible cables, no duplicated people, no warped rack geometry, no fake logos, no watermark`。

- [ ] **Step 5：写入音乐提示词**

`prompts/music-prompt.md` 内容固定为：

```text
Create an original 85-second instrumental score for a premium enterprise technology brand film. Begin with a restrained low-frequency pulse and sparse organic textures. Introduce a precise modern rhythm around 28 seconds as the five solution areas appear. Build confident momentum from 53 seconds through the global coordination section, then resolve from 77 seconds into a warm, assured final chord by 85 seconds. Contemporary, human and cinematic; no vocals, no corporate ukulele, no heroic trailer brass, no EDM drop, no recognizable melody, no abrupt ending. Leave space for subtle environmental sound details.
```

- [ ] **Step 6：写入中文字幕文件**

`subtitles/joto-global-brand-film-zh.srt` 使用 UTF-8，内容固定为：

```srt
1
00:00:00,000 --> 00:00:06,000
怎样才能让 IT 真正发生？

2
00:00:06,000 --> 00:00:13,000
不只是产品，也不只是承诺。

3
00:00:13,000 --> 00:00:21,000
它需要规划、集成，以及始终负责到底的人。

4
00:00:21,000 --> 00:00:28,000
自 2010 年起，JOTO 持续帮助企业让 IT 真正发生。

5
00:00:28,000 --> 00:00:33,000
连接每一个站点。

6
00:00:33,000 --> 00:00:38,000
保护每一层。

7
00:00:38,000 --> 00:00:43,000
支撑每一项关键业务。

8
00:00:43,000 --> 00:00:48,000
让每一个团队保持协同。

9
00:00:48,000 --> 00:00:53,000
守护每一个空间。

10
00:00:53,000 --> 00:01:01,000
从第一张蓝图，到 7×24 小时持续运营。

11
00:01:01,000 --> 00:01:09,000
本地执行，跨境协同。

12
00:01:09,000 --> 00:01:17,000
让团队保持连接，让运营持续稳定，让业务不断向前。

13
00:01:17,000 --> 00:01:22,000
我们一起，让 IT 真正发生。

14
00:01:22,000 --> 00:01:25,000
JOTO Global｜让 IT 真正发生。
```

禁止字幕段重叠、编号跳号或多余空白。

- [ ] **Step 7：建立 README**

README 必须记录：设计规格链接、目录用途、2125 帧基准、额度确认规则、现行 Logo 默认策略、生成模型选择、英文/中文字幕导出名称和最终验收命令。明确指出 `generated/` 与 `exports/` 是本地交付目录，不进入 Git。

- [ ] **Step 8：运行静态校验**

```bash
node -e 'const fs=require("fs");const p="brand-film/joto-global/shot-manifest.json";const m=JSON.parse(fs.readFileSync(p,"utf8"));if(m.length!==14)throw Error("expected 14 shots");let cursor=0;for(const s of m){if(s.startFrame!==cursor)throw Error(`gap before ${s.id}`);if(s.durationFrames!==s.endFrame-s.startFrame)throw Error(`bad duration ${s.id}`);cursor=s.endFrame;}if(cursor!==2125)throw Error(`expected 2125 frames, got ${cursor}`);console.log("14 shots, 2125 continuous frames");'
```

Expected: `14 shots, 2125 continuous frames`

```bash
rg -n 'TO''DO|TB''D|PLACE''HOLDER|joto-logo-DZVb1uOz' brand-film/joto-global --glob '!brand-assets.json'
```

Expected: 无输出。旧 Logo 路径只允许出现在 `brand-assets.json` 的排除清单中。

- [ ] **Step 9：提交制作包**

```bash
git add brand-film/joto-global/.gitignore brand-film/joto-global/README.md brand-film/joto-global/brand-assets.json brand-film/joto-global/shot-manifest.json brand-film/joto-global/prompts/video-prompts.md brand-film/joto-global/prompts/music-prompt.md brand-film/joto-global/subtitles/joto-global-brand-film-zh.srt
git commit -m "feat: scaffold JOTO Global brand film package"
```

---

## Task 2：生成并批准四张风格关键帧

**Files:**

- Create locally: `brand-film/joto-global/headframes/S03-engineer.png`
- Create locally: `brand-film/joto-global/headframes/S07-infrastructure.png`
- Create locally: `brand-film/joto-global/headframes/S11-global.png`
- Create locally: `brand-film/joto-global/headframes/S12-outcomes.png`
- Update: `brand-film/joto-global/README.md`

- [ ] **Step 1：加载执行所需技能**

读取并遵循 `imagegen` 技能。此步骤只创建静态视觉样张，不创建 ChatCut 项目，不提交付费视频或音乐任务。

- [ ] **Step 2：生成四张 16:9 无字关键帧**

分别使用 S03、S07、S11、S12 的逐镜提示词和共享风格后缀生成单张关键帧。每张只生成一个候选，不自动生成变体。保存到上述精确文件名。

- [ ] **Step 3：视觉自检**

逐张检查：

- 人手、设备、机柜、线缆和透视没有明显变形；
- 屏幕无可读随机文字；
- 无 Logo、水印、客户或厂商标识；
- 不呈现科幻悬浮界面或霓虹赛博朋克；
- 亚洲与国际化企业环境自然可信；
- 四张的色温、对比度、镜头语言能属于同一支影片。

若任一张不合格，先展示问题并请求用户确认是否重生该张；不静默生成第二张。

- [ ] **Step 4：向用户展示四图联系表并暂停**

提供四张图和简短说明，请用户确认：`通过风格样张，进入 3 镜头视频样片`。未收到明确确认，不进入 Task 3。

- [ ] **Step 5：记录批准结果**

在 README 的“批准记录”中记录批准日期、批准的四个文件名和用户要求的调整；提交：

```bash
git add brand-film/joto-global/README.md
git commit -m "docs: record JOTO brand film style approval"
```

---

## Task 3：创建 ChatCut 项目并制作 3 镜头付费样片

**Files:**

- Create from returned IDs: `brand-film/joto-global/project.json`
- Update: `brand-film/joto-global/README.md`
- Local generated media: `brand-film/joto-global/generated/`

- [ ] **Step 1：加载 ChatCut 基础、素材导入、视频生成和验证技能**

读取并遵循：

- `chatcut:chatcut-plugin-basics`
- `chatcut:asset-import`
- `chatcut:video-gen`
- `chatcut:verification`

如果 ChatCut 连接不可用，按基础技能给出的连接说明暂停；不创建替代的本地不可编辑成片。

- [ ] **Step 2：创建项目**

调用 ChatCut 创建项目，参数固定为：

```json
{
  "name": "JOTO Global Brand Film 2026",
  "description": "85-second English master and Simplified Chinese subtitle version based on the approved 2026-08-09 design specification.",
  "compositionWidth": 1920,
  "compositionHeight": 1080,
  "fps": 25
}
```

把实际返回的 `projectId`、默认 `timelineId`、项目 URL、创建日期写入 `project.json`。只记录实际值，不写假 ID。

- [ ] **Step 3：导入批准的四张关键帧**

通过 ChatCut 素材导入流程将四个本地文件加入项目。每批最多 4 个文件。把返回的 `assetId` 按文件名写入 `project.json.assets.headframes`。

- [ ] **Step 4：在额度消耗前请求精确确认并暂停**

向用户说明本批将提交：

- 模型：Kling，`mode: pro`，1080p，16:9；
- 镜头：S03（8 秒）、S07（5 秒）、S11（8 秒）；
- 输入：各自批准的关键帧，其中 S11 使用 `S11-global.png`；
- 输出：3 个独立视频样片；
- 不生成变体，不自动重试。

只有用户明确回复同意这 3 个任务，才执行下一步。

- [ ] **Step 5：提交三个样片任务**

为 S03、S07、S11 分别调用一次视频生成。使用 Kling Pro 1080p、16:9、精确时长和对应提示词；`firstFrame` 使用导入后的素材。把三个 job ID 写入 `project.json.jobs.pilot`。

- [ ] **Step 6：跟踪任务，不忙轮询**

一次查询三个 job ID。若仍在运行，只允许等待一次后再查询；仍未完成则向用户报告状态并在后续轮次继续，不进行循环轮询。

- [ ] **Step 7：把完成的视频放入测试时间线**

创建或重命名测试时间线为 `JOTO Brand Film — Pilot Review`。按顺序放置 S03、2 秒黑场、S07、2 秒黑场、S11；保持原始 25 fps 项目设置。不得拉伸镜头。

- [ ] **Step 8：结构与画面验证**

读取项目确认三项素材和时间线项目存在；分别查看每个样片的首、中、尾帧。按 Task 2 的视觉标准检查，并额外确认：运动稳定、动作连续、没有跳变面孔、线缆/设备没有在运动中融化、镜头可自然剪入下一段。

- [ ] **Step 9：请用户批准样片并暂停**

向用户展示样片或打开可审阅项目，明确列出每个镜头的“通过/需重生/改提示词”建议。只有用户明确批准进入全片生成，才执行 Task 4。任何重生镜头都视为新的付费批次，必须单独确认。

- [ ] **Step 10：记录与提交**

更新 README 与 `project.json` 的实际 job/asset/timeline ID：

```bash
git add brand-film/joto-global/README.md brand-film/joto-global/project.json
git commit -m "chore: record JOTO brand film pilot generation"
```

---

## Task 4：生成剩余 10 个场景镜头

**Files:**

- Update: `brand-film/joto-global/project.json`
- Update: `brand-film/joto-global/README.md`

- [ ] **Step 1：为剩余镜头准备首帧**

用获批风格生成 S01、S02、S04、S05、S06、S08、S09、S10、S13 的首帧。S12 已有关键帧。每个镜头只生成一个首帧候选，并执行 Task 2 的视觉自检。S04 为时间线预留画面负空间；S11 的地图线后期制作，首帧不得含地图文字。

- [ ] **Step 2：分两批请求视频额度确认**

批次 A：S01、S02、S04、S05、S06。

批次 B：S08、S09、S10、S12、S13。

每批都需单独向用户说明 5 个镜头、Kling Pro 1080p、各镜头时长、无自动变体，并在获得明确同意后才提交。批次 A 获批不代表批次 B 获批。

- [ ] **Step 3：生成并验证批次 A**

提交五个任务，记录 job ID，按一次查询加一次等待的节奏跟踪。完成后逐镜查看首、中、尾帧，记录 `approved`、`needs-review` 或 `rejected`。不合格镜头不自动重生。

- [ ] **Step 4：生成并验证批次 B**

在用户批准批次 B 后重复相同流程。S10 和 S12 是蒙太奇镜头，必须特别检查地点切换是否连贯、是否出现不真实设备或随机招牌。

- [ ] **Step 5：确认全部 13 个视频素材齐备**

读取项目并验证 S01–S13 每个 ID 恰好映射一个已批准素材；不存在未使用的自动变体；S14 保持为纯 Motion Graphic。

- [ ] **Step 6：提交生成记录**

```bash
git add brand-film/joto-global/README.md brand-film/joto-global/project.json
git commit -m "chore: record JOTO brand film scene generation"
```

---

## Task 5：组装 85 秒英文无字底片

**Files:**

- Update: `brand-film/joto-global/project.json`

- [ ] **Step 1：创建主时间线**

创建时间线 `JOTO Brand Film — EN Master`，25 fps。按 `shot-manifest.json` 将 S01–S13 放在对应 `fromFrame`，统一 `fit: cover`。每个视频项目严格裁切为清单中的 `durationFrames`；禁止速度拉伸。

- [ ] **Step 2：设置 S14 尾卡底图**

在 2050–2125 帧使用深色到绿色的品牌渐变背景，起始 `#070b0a`，终止 `#5ed29c`。尾卡由后续全片图形层完成文字，不使用 AI 生成 Logo。

- [ ] **Step 3：处理镜头衔接**

优先使用硬切与动作匹配。只在以下位置允许 6–10 帧叠化：S03→S04、S10→S11、S13→S14。叠化不得改变每段文字出现的规定时间，也不得把总时长扩展超过 2125 帧。

- [ ] **Step 4：验证无字底片**

查看 75、375、750、1000、1400、1600、1800、1985、2080 帧。确认镜头顺序、画幅、裁切和尾卡背景正确。读取项目结构，确认最终帧为 2125。

---

## Task 6：制作全片品牌图形层

**Files:**

- Create: `brand-film/joto-global/motion/brand-film-overlay.jsx`
- Update: `brand-film/joto-global/project.json`

- [ ] **Step 1：加载 Motion Graphic 技能**

读取并遵循 `chatcut:create-motion-graphics`。以该技能当时提供的有效模板和可用 API 为准，不假设浏览器或 Remotion API 一定存在。

- [ ] **Step 2：创建单一透明全片图形组件**

组件规格固定如下：

- 画布：1920×1080；时长：85 秒；透明背景，S14 除外；
- 属性：`showChinese` 布尔值，默认 `false`；
- 标题字体：Poppins SemiBold；英文正文：Poppins Medium；中文字幕：Poppins Medium 或系统可用的中文无衬线后备字体；
- 标题最大宽度 1120 px，水平安全边距 120 px；中文字幕距底部 86 px，最大宽度 1420 px；
- 标题白色，正常透明度 0.92；中文字幕白色，使用 70% 黑色半透明圆角底；
- 每段文字在段首 10 帧内淡入并上移 18 px，在段尾 8 帧淡出；短句不使用逐字动画；
- S04 增加细线时间轴 `2010` 到 `Today`，禁止额外数字；
- S11 增加无城市名的抽象地图连接线，使用 `#5ed29c`，线条不穿过人物面部；
- S14 全屏渐变，中央显示 `JOTO Global`，下方显示 `We Make IT Happen.`；`showChinese=true` 时再显示 `让 IT 真正发生。`，但不隐藏英文主张；
- 使用清单规定的全部英文与中文文案，不增删标点或营销承诺。

组件中的时间段必须直接按 14 个帧范围声明，禁止通过平均分配计算。

- [ ] **Step 3：执行图形代码静态检查**

确认文件中包含 14 个镜头 ID、`showChinese`、`JOTO Global`、`We Make IT Happen.` 和全部定稿文字；确认没有未完成标记或假 Logo 路径。

```bash
rg -n "S0[1-9]|S1[0-4]|showChinese|JOTO Global|We Make IT Happen" brand-film/joto-global/motion/brand-film-overlay.jsx
rg -n 'TO''DO|TB''D|PLACE''HOLDER|joto-logo-DZVb1uOz' brand-film/joto-global/motion/brand-film-overlay.jsx
```

Expected: 第一条覆盖全部要求；第二条无输出。

- [ ] **Step 4：在 ChatCut 中创建并放置图形层**

用完整 JSX 创建 1920×1080、85 秒的 Motion Graphic 素材，放在英文主时间线 0–2125 帧的顶层视频轨。记录素材与时间线 item ID。

- [ ] **Step 5：渲染关键帧验证**

查看 75、375、575、750、1000、1400、1600、1800、1985、2080 帧。逐帧验证：文案属于正确镜头、标题未压脸、时间线和地图线位置合理、尾卡字标清晰、无超出安全区。

- [ ] **Step 6：提交图形源文件和项目记录**

```bash
git add brand-film/joto-global/motion/brand-film-overlay.jsx brand-film/joto-global/project.json
git commit -m "feat: add JOTO brand film motion graphics"
```

---

## Task 7：加入音乐与克制环境声

**Files:**

- Update: `brand-film/joto-global/project.json`
- Update: `brand-film/joto-global/README.md`

- [ ] **Step 1：加载音乐技能**

读取并遵循 `chatcut:music`。先检查 ChatCut 项目内是否已有可商用、时长足够的适配音乐；如果没有，才准备生成。

- [ ] **Step 2：请求一次音乐生成确认并暂停**

向用户展示 `music-prompt.md` 全文，说明将提交 1 个原创背景音乐任务；不自动生成第二首。获得明确确认后才调用音乐生成。

- [ ] **Step 3：生成、检查并放置音乐**

生成完成后先检查实际时长。若短于 85 秒，不循环、不强行拉伸、不自动重生；向用户报告并请求选择。合格音乐从第 0 帧放置，裁切至 2125 帧，结尾保留自然收束。

- [ ] **Step 4：加入环境声**

优先从 ChatCut 已授权音效库选择低强度素材，不单独生成：机房空气声、门禁轻响、键盘/机柜操作、城市底噪和团队空间声。环境声只放在相关镜头，峰值明显低于音乐，不加入夸张 UI 提示音。

- [ ] **Step 5：声音验收**

检查 0–21 秒克制、28 秒开始有节奏、53–77 秒建立动能、77–85 秒温暖收束。确认无削波、无突兀切断，静音观看仍能理解完整叙事。

- [ ] **Step 6：记录授权与提交**

在 README 中记录音乐生成 job ID、生成日期、提示词路径和 ChatCut 项目内音效来源。提交：

```bash
git add brand-film/joto-global/README.md brand-film/joto-global/project.json
git commit -m "chore: record JOTO brand film audio sources"
```

---

## Task 8：建立中文字幕版本

**Files:**

- Update: `brand-film/joto-global/project.json`

- [ ] **Step 1：复制英文主时间线**

把 `JOTO Brand Film — EN Master` 复制为 `JOTO Brand Film — ZH Subtitles`。不重新放置或生成视频、音乐、环境声。

- [ ] **Step 2：切换中文字幕属性**

只修改复制时间线中全片图形层的属性覆盖：`showChinese: true`。英文时间线保持 `false`。把两个实际 timeline ID 写入 `project.json.timelines`。

- [ ] **Step 3：双版本一致性验证**

读取两条时间线，确认除 Motion Graphic 属性外，S01–S13 素材 ID、开始帧、时长、音乐和环境声完全一致。查看中文字幕版 75、375、750、1400、1800、1985、2080 帧，确认中文没有压住关键动作，片尾中英文层级清楚。

---

## Task 9：全片质量审查与必要修正

**Files:**

- Update if needed: `brand-film/joto-global/motion/brand-film-overlay.jsx`
- Update: `brand-film/joto-global/project.json`
- Update: `brand-film/joto-global/README.md`

- [ ] **Step 1：结构审查**

使用 ChatCut 项目读取工具确认：两条交付时间线均为 2125 帧；13 个场景素材和 1 个尾卡完整；所有视频 `fit: cover`；没有离线或重复素材；英语版没有中文字幕。

- [ ] **Step 2：视觉审查**

按每个镜头至少首、中、尾三帧检查以下内容：随机文字、假 Logo、水印、错误手指、变形人脸、不可能的设备结构、融化线缆、跳跃运动、字幕压脸、地图线穿脸、过度科幻 UI、色彩突然跳变。

- [ ] **Step 3：内容审查**

逐句对照批准规格，确认没有引入未经证实的客户成果、公司规模、合作品牌、具体项目地点或性能数字。确认 `24×7` 写法一致，`Since 2010` 只出现一次。

- [ ] **Step 4：完整播放审查**

在 ChatCut 中从 0 秒完整播放英文版，再完整播放中文字幕版。记录任何需要修改的 item ID 和原因。只做剪辑、文字或混音的非付费修正；任何视频或音乐重生必须再次取得用户明确确认。

- [ ] **Step 5：用户终审关卡**

向用户展示可审阅的完整双版本。用户明确批准后才进入导出；如用户要求修改，先分类为免费时间线修正或需额度的重新生成，并分别处理。

---

## Task 10：导出、技术验收与交付

**Files:**

- Create locally under ignored directory: `brand-film/joto-global/exports/joto-global-brand-film-master-en.mp4`
- Create locally under ignored directory: `brand-film/joto-global/exports/joto-global-brand-film-web-en.mp4`
- Create locally under ignored directory: `brand-film/joto-global/exports/joto-global-brand-film-web-zh.mp4`
- Create locally under ignored directory: `brand-film/joto-global/exports/joto-global-brand-film-poster.jpg`
- Copy deliverable: `brand-film/joto-global/exports/joto-global-brand-film-zh.srt`
- Update: `brand-film/joto-global/README.md`
- Update: `brand-film/joto-global/project.json`

- [ ] **Step 1：加载导出与验证技能**

读取并遵循 `chatcut:export` 和 `chatcut:verification`。

- [ ] **Step 2：导出英文高质量母版**

从英文主时间线导出 H.264、1080p、25 fps，文件名 `joto-global-brand-film-master-en.mp4`。目标视频码率 10–15 Mbps，AAC 48 kHz、320 kbps；若 ChatCut 导出只提供质量档位，选择能满足该范围的最高适用档。

- [ ] **Step 3：导出两个网站版**

分别从英文和中文字幕时间线导出 H.264、1080p、25 fps。目标视频码率 3–4.5 Mbps、AAC 160 kbps、fast start；文件名严格采用上述名称。若 ChatCut 无法指定 fast start，在下载后使用：

先保留 ChatCut 原始导出，再生成最终交付名：

```bash
mv brand-film/joto-global/exports/joto-global-brand-film-web-en.mp4 brand-film/joto-global/exports/joto-global-brand-film-web-en.chatcut.mp4
mv brand-film/joto-global/exports/joto-global-brand-film-web-zh.mp4 brand-film/joto-global/exports/joto-global-brand-film-web-zh.chatcut.mp4
ffmpeg -i brand-film/joto-global/exports/joto-global-brand-film-web-en.chatcut.mp4 -c copy -movflags +faststart brand-film/joto-global/exports/joto-global-brand-film-web-en.mp4
ffmpeg -i brand-film/joto-global/exports/joto-global-brand-film-web-zh.chatcut.mp4 -c copy -movflags +faststart brand-film/joto-global/exports/joto-global-brand-film-web-zh.mp4
```

验证成功前保留 `.chatcut.mp4` 原始导出，避免无法回退。

- [ ] **Step 4：生成海报帧与复制字幕**

优先从 01:19（79 秒）附近选择团队和项目成果清晰的一帧：

```bash
ffmpeg -ss 00:01:19 -i brand-film/joto-global/exports/joto-global-brand-film-master-en.mp4 -frames:v 1 -q:v 2 brand-film/joto-global/exports/joto-global-brand-film-poster.jpg
cp brand-film/joto-global/subtitles/joto-global-brand-film-zh.srt brand-film/joto-global/exports/joto-global-brand-film-zh.srt
```

Expected: 海报为 1920×1080，人物和标题不冲突；字幕文件与制作源一致。

- [ ] **Step 5：运行技术验收**

对三个 MP4 分别运行：

```bash
for file in \
  brand-film/joto-global/exports/joto-global-brand-film-master-en.mp4 \
  brand-film/joto-global/exports/joto-global-brand-film-web-en.mp4 \
  brand-film/joto-global/exports/joto-global-brand-film-web-zh.mp4
do
  ffprobe -v error -show_entries format=filename,duration,size:stream=index,codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels -of json "$file"
done
```

验收结果必须满足：

- 三个文件均为 1920×1080、25 fps、H.264；
- 音频为 AAC、48 kHz、双声道；
- 每个时长在 84–86 秒；
- 英文和中文字幕网站版时长差小于 1 帧；
- 每个网站版小于 74,222,233 字节；
- 文件可在 Chromium、Safari 和移动端播放器中开始播放；
- 海报帧为 1920×1080 JPEG。

- [ ] **Step 6：最终人工验收**

完整播放三份文件，确认无黑帧、冻结、音画不同步、字幕缺字、字体替换、尾音截断或错误版本。对网站版执行静音播放检查，确保文案独立成立。

- [ ] **Step 7：记录交付信息并提交**

把 ChatCut export ID、完成时间、最终文件名、实际时长、文件大小、编码参数和海报时间点写入 README 与 `project.json`。提交追踪文件，不提交 MP4/JPG 大文件：

```bash
git add brand-film/joto-global/README.md brand-film/joto-global/project.json
git commit -m "docs: record JOTO brand film delivery"
```

---

## Final Coverage Audit

- [ ] 14 个镜头连续覆盖 0–2125 帧，无空隙、无重叠错误。
- [ ] 设计规格中的 14 条英文文案和 14 条中文翻译全部出现且时码一致。
- [ ] S01–S13 使用无字、无品牌生成画面；S14 使用后期品牌图形。
- [ ] 旧版 JOTO Logo、第三方品牌图和损坏素材均未进入成片或生成参考。
- [ ] 3 镜头样片、剩余批次和音乐均有独立用户确认记录。
- [ ] 英文版与中文字幕版只在 `showChinese` 属性上不同。
- [ ] 所有实际 ChatCut 项目、时间线、素材、任务和导出 ID 已写入 `project.json`，无假 ID。
- [ ] `README.md` 包含生成记录、提示词路径、音乐授权记录和最终技术参数。
- [ ] 三个 MP4、一个 SRT 和一个海报帧名称与批准规格完全一致。
- [ ] 仓库中没有未完成标记或误用的旧 Logo 引用。

最终检查命令：

```bash
rg -n 'TO''DO|TB''D|PLACE''HOLDER' brand-film/joto-global docs/superpowers/plans/2026-08-09-joto-global-brand-film.md
git status --short
```

Expected: 第一条无输出；`git status` 只显示实施过程中有意产生且尚未提交的文件，不包含 `generated/` 或 `exports/` 中的大体积媒体。
