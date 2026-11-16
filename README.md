# Management Deadlines

A zero-cost, bilingual, management-first conference deadline tracker.

## Start locally

Requirements: Node.js 22.12+ (22 LTS recommended for Astro 7).

```bash
npm install
npm run dev
```

Open `http://localhost:4321/`.

## Production build

```bash
npm run validate
npm run build
```

The static website is generated into `dist/`. Deploy to **Cloudflare Pages** with framework `Astro`, build command `npm run build`, output directory `dist`, and Node.js 22. A free `*.pages.dev` domain requires no purchase. There is no server, database, or paid API.

## Features

- Search by society, conference name and research area
- Management/economics classification and area filtering
- Deadline sorting; date-only deadlines are deliberately *not* given an invented closing hour
- Upcoming confirmed deadline indicator
- Bilingual Chinese/English interface
- Browser-local favorites (not synchronized across browsers)
- Download individual and saved conference `.ics` files
- Subscribe to all published deadlines via `/conferences.ics`
- Official CFP source links and explicit verification status
- Mobile-friendly layout

## Edit conference data

Edit `public/data/conferences.json`. Use one record per **conference edition**, not per AOM division. `status` is `confirmed` (date + verified time), `confirmed-date-only` (date verified, hour unknown), or `pending` (no confirmed date). `timezone` uses an IANA timezone such as `Europe/Paris`. Use `null` when not announced; **never invent dates or precise times**.

`npm run check:data` checks basic integrity. `npm run calendar` regenerates the static feed. Change tracking is performed through git history and pull requests; no untrusted scraper is enabled by default. GitHub Actions validates/builds on commit. External website scraping could breach usage restrictions or silently corrupt dates; add any scraper only after reviewing source rules and its error handling.

## Source verification (as of 2026-11-16)

- AOM 2027 deadline **2027-01-12**, exact time not found: https://www.aom.org/events/annual-meeting/submitting/call-for-submissions/
- EGOS Liverpool 2027 deadline **2027-01-15 12:00 CET**: https://www.egos.org/2027_Liverpool/CALL_for_short_papers
- Other entries are deliberate *pending* placeholders and must be verified before attaching a date.

## Important limitations

- The static `.ics` feed is regenerated only when the project is rebuilt. Cloudflare Pages rebuilds following GitHub pushes. A calendar app's actual refresh interval is controlled by that app.
- Exporting favorites generates a snapshot; it is not an auto-updating subscription.
- For `confirmed-date-only`, calendar entries are all-day markers to avoid silently inventing a deadline hour.
- Browser favorites are saved only on that device/browser; clearing site data resets them.
- No automatic email notifications, login, or remote synchronization.
- Free deployment and build tiers have limits; staying within them maintains zero billing.

## Database coverage (2026-11-16)

50 records. Only records with a confirmed official source receive a deadline. The remainder are conference-series watchlist entries and **not** 2027 CFP confirmations. Conference deadlines earlier than the current date remain visible as historical records, but are marked closed in the interface. Some sources are conference association landing pages, not edition-specific CFPs. Editors must verify the current-year CFP before promoting a pending record.

AIB 2027 uses the author’s local time zone for its 11:59 PM deadline, so the data file deliberately omits a single fixed IANA timezone/time.

## Security and build

Astro dependency is bumped to `^7.4.12` because 5.18.2 was flagged in npm audit. On the developer machine, run `npm install`, `npm run validate`, `npm run build`, and `npm audit`. Astro 7 is a major update: successful runtime and build tests on the target Mac are still required. Do **not** automatically run `npm audit fix --force` without assessing breaking changes.

The GitHub Actions build uses `npm install` rather than `npm ci` until a lockfile has been generated on the developer machine. Once `package-lock.json` is committed, change it back to `npm ci` for reproducibility.

## v0.3：官方 CFP 自动复查与截止日期分组

- 网站按 **未截止 → 待公布/待核实 → 已截止** 分区；已截止会议自动灰化并放在最后。日期有时区和具体时间时，按会议时区比较；只有日期时，保守地保留到访问者所在时区当日结束。
- `.github/workflows/cfp-monitor.yml` 每周一 08:17 UTC 自动执行（也支持 Actions 中手动 `Run workflow`）。使用 Python 标准库抓取 `public/data/conferences.json` 中的官方链接，不依赖付费服务。
- **初次运行只建立页面基线**，不会凭空创建“日期已更新”的通知。后续运行对比官方 CFP 附近的文段，变化会创建 GitHub Issue 供人工复核，随后提交新的基线 `data/cfp-snapshots.json`；**不自动更改截止日期**。
- 抓取异常、HTTP 403、PDF 等不会作为空白基线覆盖历史数据。每次运行提供 `cfp-monitor-report` Artifact，查看无法访问的页面。
- 首次使用请把仓库推送到 GitHub（建议公开仓库），在 **Settings → Actions → General → Workflow permissions** 允许 `Read and write permissions`。若默认分支启用禁止推送的分支保护，需要适当调整工作流或改为通过 Pull Request 提交快照。
- 本地自测：`python3 scripts/check_cfp.py --limit 2 --sleep 0`。`--limit` 不会修改正式快照。实际 GitHub 执行需要外网。部分网站禁止自动抓取，仍需人工核查。GitHub 定时任务可能延迟、停用或遇到免费额度/执行限制。
- **重要**：监控发现的是页面相关文段发生变化，并不等于投稿截止日期改变；所有日期更新必须人工核实。若监控被官方站点拒绝，不要绕过限制。
