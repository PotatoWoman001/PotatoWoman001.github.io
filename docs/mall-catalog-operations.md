# JOTO Global Mall 目录发布运维

本文档描述如何从 Mac Mini 上的抓取系统生成无交易字段的静态快照，经两次校验后发布到阿里云，并在异常时保持或恢复上一版本。

## 1. 发布边界

- 只发布 `status == completed` 且不是 smoke 的抓取任务。
- 快照 schema 固定为 `joto-mall-v1`。
- 每个远端目录不可变，名称由 `manifest.generated_at` 和 `crawl_run_id` 生成。
- 发布器不读取密码；SSH 私钥、环境文件和服务器凭据必须放在 Git 仓库外。
- 官网代码 release 与 Mall catalog release 相互独立。
- `published-state.json` 只在远端校验、原子切换及线上 HTTPS 清单一致性检查全部通过后写入。

## 2. 一次性服务器初始化

服务器当前 `/var/www/jotoglobal` 为 `root:root 0755`。root 只初始化一次受限用户可写的 release 目录和稳定外层链接：

```bash
sudo install -d -o joto-mall-deploy -g joto-mall-deploy -m 0755 \
  /var/www/jotoglobal/catalog-releases
sudo ln -s /var/www/jotoglobal/catalog-releases/current \
  /var/www/jotoglobal/catalog-current
```

如果外层链接已经存在，不要覆盖；先核对：

```bash
readlink /var/www/jotoglobal/catalog-current
```

结果必须是 `/var/www/jotoglobal/catalog-releases/current`。Nginx 的 `/mall-data/` 始终读取稳定外层链接。后续发布器只在 `joto-mall-deploy` 拥有的 `catalog-releases` 内创建和原子替换内层 `current`，不使用 `sudo`，也不改动 root 拥有的外层链接。

受限 SSH 身份至少需要：

- 写入 `/var/www/jotoglobal/catalog-releases`；
- 运行 `node` 和官网当前 release 中的 `scripts/verify-mall-snapshot.mjs`；
- 执行本发布器列出的 `test`、`mv`、`rm`、`ln` 命令；
- 不具有 root 权限。

官网每次代码发布必须保留：

```text
/var/www/jotoglobal/current/scripts/verify-mall-snapshot.mjs
/var/www/jotoglobal/current/scripts/mall-snapshot-contract.mjs
```

## 3. Mac Mini 环境文件

把样例复制到仓库外的用户私有目录：

```bash
mkdir -p "$HOME/Library/Application Support/JOTO"
cp deploy/mall-publisher/publisher.env.example \
  "$HOME/Library/Application Support/JOTO/mall-publisher.env"
chmod 600 "$HOME/Library/Application Support/JOTO/mall-publisher.env"
```

编辑实际值。默认切换点必须保持为：

```text
PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
JOTO_MALL_REMOTE_CURRENT_LINK=/var/www/jotoglobal/catalog-releases/current
```

`PATH` 必须包含 Mac Mini 上的 `node` 与 `docker`，避免 LaunchAgent
使用精简系统路径时找不到命令。私钥文件只保存私钥路径，环境文件中不得
粘贴私钥正文或密码。私钥建议权限为 `600`。

## 4. 首次人工验收

以下步骤全部通过前，不要加载 LaunchAgent。

### 4.1 构建 ops 镜像并生成快照

```bash
cd "/Users/cuihua/Documents/jotoglobal 信息获取站"
docker compose build
docker compose --profile ops run --rm --no-deps ops \
  python scripts/build_jotoglobal_snapshot.py \
  --output-root /app/data/exports/jotoglobal
```

确认 `data/exports/jotoglobal/latest-ready.json` 包含正整数 `run_id`、安全的 `version` 和绝对 `root`。runner 接受两种 `root`：

- `/app/data/exports/jotoglobal/<version>`，严格映射到宿主导出根；
- `<JOTO_MALL_CRAWLER_ROOT>/data/exports/jotoglobal/<version>`。

相对路径、`..`、嵌套目录和导出根外路径都会被拒绝。

### 4.2 本地校验

```bash
cd "/Users/cuihua/Documents/JOTO global ｜ 维护入口"
node scripts/verify-mall-snapshot.mjs \
  "/Users/cuihua/Documents/jotoglobal 信息获取站/data/exports/jotoglobal/<version>"
```

必须显示 schema 和产品数量，且退出状态为 `0`。

### 4.3 dry-run

```bash
cd "/Users/cuihua/Documents/JOTO global ｜ 维护入口"
set -a
source "$HOME/Library/Application Support/JOTO/mall-publisher.env"
set +a
node scripts/publish-mall-snapshot.mjs \
  --snapshot-root "/Users/cuihua/Documents/jotoglobal 信息获取站/data/exports/jotoglobal/<version>" \
  --state-path "/Users/cuihua/Documents/jotoglobal 信息获取站/data/exports/jotoglobal/published-state.json" \
  --dry-run
```

dry-run 只打印参数数组形成的命令，不调用 runner、不连接网络、不写 state。输出应包含：

1. rsync 到 `.incoming-<version>`；
2. 远端校验 incoming；
3. 检查同版本正式目录；
4. “不存在则 `mv -T`，存在则重新校验并复用”的两条条件路径；
5. 创建 `current.next` 并原子替换内层 `current`；
6. HTTPS 获取 `/mall-data/manifest.json`。

### 4.4 首次真实发布

去掉 `--dry-run` 后运行同一命令。成功后检查：

```bash
curl --fail --silent --show-error \
  https://jotoglobal.com/mall-data/manifest.json
```

线上清单的 `schema_version`、`crawl_run_id`、`generated_at` 必须与本地清单完全一致。发布器本身也执行此比较，不是只检查 HTTP 200。

再次发布同一快照应返回：

```json
{"published":false,"reason":"already-published"}
```

若远端正式版本已存在但本地 state 尚未写入，发布器会重新校验该不可变目录、清理 incoming 并复用；它不会把 incoming 移入已有目录。

### 4.5 人工回滚演练

先列出已验证的历史版本，选择明确目标：

```bash
ssh -i "$JOTO_MALL_DEPLOY_KEY" \
  "$JOTO_MALL_DEPLOY_USER@$JOTO_MALL_DEPLOY_HOST" \
  ls -1 /var/www/jotoglobal/catalog-releases
```

然后在受限用户拥有的目录内创建下一链接并原子替换：

```bash
ssh -i "$JOTO_MALL_DEPLOY_KEY" \
  "$JOTO_MALL_DEPLOY_USER@$JOTO_MALL_DEPLOY_HOST" \
  ln -s /var/www/jotoglobal/catalog-releases/<known-good-version> \
  /var/www/jotoglobal/catalog-releases/current.next
ssh -i "$JOTO_MALL_DEPLOY_KEY" \
  "$JOTO_MALL_DEPLOY_USER@$JOTO_MALL_DEPLOY_HOST" \
  mv -Tf /var/www/jotoglobal/catalog-releases/current.next \
  /var/www/jotoglobal/catalog-releases/current
```

回滚后重新获取线上 manifest，并记录操作者、时间、原版本和目标版本。不要删除任何正式 release。

## 5. 安装 LaunchAgent

先生成 plist，但保持未加载：

```bash
WEBSITE_ROOT="/Users/cuihua/Documents/JOTO global ｜ 维护入口"
PUBLISHER_ENV_FILE="$HOME/Library/Application Support/JOTO/mall-publisher.env"
LOG_DIRECTORY="$HOME/Library/Logs/JOTO"
PLIST_PATH="$HOME/Library/LaunchAgents/com.joto.mall-publisher.plist"
mkdir -p "$LOG_DIRECTORY" "$HOME/Library/LaunchAgents"
sed \
  -e "s#__WEBSITE_ROOT__#$WEBSITE_ROOT#g" \
  -e "s#__PUBLISHER_ENV_FILE__#$PUBLISHER_ENV_FILE#g" \
  -e "s#__LOG_DIRECTORY__#$LOG_DIRECTORY#g" \
  "$WEBSITE_ROOT/deploy/mall-publisher/com.joto.mall-publisher.plist.template" \
  > "$PLIST_PATH"
plutil -lint "$PLIST_PATH"
```

完成“人工生成、本地校验、dry-run、真实发布、幂等重试、回滚”全部验收后才加载：

```bash
launchctl bootstrap "gui/$(id -u)" \
  "$HOME/Library/LaunchAgents/com.joto.mall-publisher.plist"
```

LaunchAgent 在加载时运行一次，之后每 60 秒触发。runner 使用原子 `mkdir publication.lock` 防并发，只在自己成功取得锁后于退出时移除该锁。

查看状态或停止：

```bash
launchctl print "gui/$(id -u)/com.joto.mall-publisher"
launchctl bootout "gui/$(id -u)" \
  "$HOME/Library/LaunchAgents/com.joto.mall-publisher.plist"
```

## 6. 日志、状态和故障处理

宿主导出根中包含：

```text
published-state.json
publication.jsonl
publication.lock
latest-ready.json
<immutable-version>/
```

`publication.jsonl` 每次完成或失败写一行 JSON，字段为 `run_id`、`version`、`result`、`timestamp`。LaunchAgent 自身 stdout/stderr 位于 `~/Library/Logs/JOTO/`。

故障语义：

- 本地 schema、校验和、数量、禁止字段或媒体引用错误：任何网络命令前停止；
- rsync 或远端校验错误：不创建 `current.next`，线上版本不变；
- 已有同版本 release：验证通过才复用，绝不覆盖；
- HTTPS manifest 内容不匹配：不写本地 state，必须立即调查并按 4.5 回滚；
- builder、publisher 或日志步骤非零退出：LaunchAgent 下次间隔会重试；
- Mac Mini 离线：阿里云继续提供最后一个有效 catalog release。

如果进程被 `SIGKILL`，空锁目录可能遗留。先确认没有 `run-mall-publication.sh`、snapshot builder、publisher 进程，再仅用 `rmdir` 删除明确路径：

```bash
rmdir "/Users/cuihua/Documents/jotoglobal 信息获取站/data/exports/jotoglobal/publication.lock"
```

不要自动清理历史正式 release，不要修改或覆盖 `published-state.json` 来伪造发布成功。
