# JOTO Global Brand Film

85 秒 JOTO Global 企业品牌片制作包。内容与时码的唯一基准为 [`docs/superpowers/specs/2026-08-09-joto-global-brand-film-design.md`](../../docs/superpowers/specs/2026-08-09-joto-global-brand-film-design.md)。

## 制作基准

- 画面：1920×1080、16:9、25 fps
- 总长：2125 帧 / 85 秒
- 主版：英文屏幕文字，无旁白
- 中文版：保留英文主画面，增加简体中文字幕
- 视频模型：风格样片通过后，使用 Kling Pro 1080p 图生视频
- 片尾标志：默认使用当前官网式纯文字 `JOTO Global`；只有收到并批准现行官方 SVG 或透明高分辨率 PNG 后才替换

## 目录

- `brand-assets.json`：颜色、字体、片尾与明确排除的旧资产
- `shot-manifest.json`：14 个镜头的唯一时码与文案清单
- `prompts/`：逐镜视频提示词与音乐提示词
- `subtitles/`：中文字幕源文件
- `headframes/`：经过审批的风格关键帧
- `motion/`：全片品牌图形层源文件
- `generated/`：本地生成媒体，不进入 Git
- `exports/`：最终大体积交付文件，不进入 Git
- `project.json`：ChatCut 实际项目、时间线、素材、任务和导出 ID；创建项目后再写入

## 额度确认规则

任何 ChatCut `submit_video`、`submit_music` 或重新生成调用都必须提前说明模型、数量、时长和用途，并获得用户对该批次的明确确认。一次确认不覆盖重试、变体或后续批次。

## 计划中的确认关卡

1. 四张静态风格关键帧：S03、S07、S11、S12。
2. 三镜头视频样片：S03、S07、S11。
3. 剩余视频批次 A：S01、S02、S04、S05、S06。
4. 剩余视频批次 B：S08、S09、S10、S12、S13。
5. 一次原创背景音乐任务。
6. 双版本完整终审。

## 交付名称

- `joto-global-brand-film-master-en.mp4`
- `joto-global-brand-film-web-en.mp4`
- `joto-global-brand-film-web-zh.mp4`
- `joto-global-brand-film-zh.srt`
- `joto-global-brand-film-poster.jpg`

## 技术验收

三个视频必须为 H.264、1920×1080、25 fps、84–86 秒；音频为 AAC、48 kHz、双声道。两个网站版均不得超过 74,222,233 字节，并应启用 fast start。英文版与中文字幕版除字幕显示属性外必须共用完全相同的底片、声音和时码。

## 批准记录

风格关键帧、视频样片、剩余生成批次、音乐和最终成片的批准结果将在各审批关卡后记录于此。
