# 课程表 API 文档

课表数据存在服务端本地库里，**只读接口不需要任何鉴权**，直接 `http://IP:端口/api/...` 就能取。
管理接口（更新 Cookie、同步、改课程）需要请求头 `X-Admin-Password`，默认密码 `admin123`。

- 服务地址：`http://<IP>:<端口>`，默认端口 `8000`
- 全部响应为 `application/json; charset=utf-8`，中文不转义
- 成功响应都带 `"ok": true`；失败带 `"ok": false` + `error` + `message`
- 交互式文档（可直接点着试）：`http://<IP>:<端口>/docs`
- 机器可读的 OpenAPI：`http://<IP>:<端口>/openapi.json`

> **一个重要特性**：Cookie 过期**不影响**只读接口。课表数据是落库的，
> Cookie 只在"从教务系统同步"这一步用到。所以 Cookie 过期时对外服务照常，
> 只是数据停留在上次同步的状态；管理员更新 Cookie 后重新同步即可。

---

## 目录

| 分类 | 方法 | 路径 | 说明 |
| --- | --- | --- | --- |
| 公开 | GET | [`/api/health`](#get-apihealth) | 健康检查 |
| 公开 | GET | [`/api/schedule`](#get-apischedule) | 完整课表（课程 + 网格 + 学期信息） |
| 公开 | GET | [`/api/courses`](#get-apicourses) | 只要课程数组 |
| 公开 | GET | [`/api/today`](#get-apitoday) | 今天/某天的课 |
| 公开 | GET | [`/api/terms`](#get-apiterms) | 可选学期 |
| 公开 | GET | [`/api/status`](#get-apistatus) | 服务与 Cookie 状态 |
| 管理 | POST | [`/api/admin/login`](#post-apiadminlogin) | 校验密码 |
| 管理 | POST | [`/api/admin/cookie`](#post-apiadmincookie) | **更新 Cookie** |
| 管理 | POST | [`/api/admin/refresh`](#post-apiadminrefresh) | 重新同步教务数据 |
| 管理 | GET | [`/api/admin/settings`](#get-apiadminsettings) | 读设置 |
| 管理 | PUT | [`/api/admin/settings`](#put-apiadminsettings) | 改设置 |
| 管理 | GET | [`/api/admin/courses`](#get-apiadmincourses) | 课程列表（含已隐藏） |
| 管理 | POST | [`/api/admin/courses`](#post-apiadmincourses) | 新增课程 |
| 管理 | PATCH | [`/api/admin/courses/{id}`](#patch-apiadmincoursesid) | 修改课程 |
| 管理 | DELETE | [`/api/admin/courses/{id}`](#delete-apiadmincoursesid) | 删除/隐藏课程 |
| 管理 | POST | [`/api/admin/courses/{id}/restore`](#post-apiadmincoursesidrestore) | 还原成教务原始数据 |
| 管理 | POST | [`/api/admin/courses/restore-all`](#post-apiadmincoursesrestore-all) | 清空所有人工改动 |
| 管理 | GET | [`/api/admin/sync-log`](#get-apiadminsync-log) | 同步日志 |

---

# 只读接口

## GET /api/health

```json
{ "ok": true, "service": "course-api", "version": "1.0.0", "time": "2026-09-07 16:02:22" }
```

## GET /api/schedule

课表全量数据。**网页课表页显示的就是这个接口的返回**，所以页面上看到什么，
接口就返回什么，包括管理员的人工修改。

**参数**（全部可选）

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `term` | string | 学期，如 `2026-2027-1`。留空＝当前学期 |
| `week` | int 1–40 | 只要第 N 周有课的课程 |
| `day` | int 1–7 | 只要某天（1＝周一） |

```bash
curl "http://127.0.0.1:8000/api/schedule?week=2"
```

**响应字段**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `term` / `xn` / `xq` | string | 学期 / 学年 / 学期号 |
| `title` | string | 页面标题（管理页可改） |
| `student` | object | `{xh, xm}` 学号姓名 |
| `week` / `day` | int / null | 本次请求的筛选条件，回显 |
| `week_info` | object | 见下 |
| `day_names` | string[7] | `["星期一", ..., "星期日"]` |
| `layout` | object[] | 节次布局 `{section_no, section, period}`，画表格用 |
| `section_times` | object | `{"1": {"start": "08:00", "end": "08:45"}}`，未配置则为 `{}` |
| `courses` | object[] | 课程数组，见下 |
| `grid` | object[] | 按节次行组好的网格，见下 |
| `unscheduled` | object[] | 没有节次信息、排不进网格的课（正常为空） |
| `extras` | object[] | 实践课、调停补课等附加表格 |
| `counts` | object | `{total, shown}` 全部/筛选后数量 |
| `synced_at` | string | 教务数据的抓取时间 |
| `last_sync` | object | 最近一次同步结果 `{term, ok, count, message, at}` |
| `generated_at` | string | 本次响应生成时间 |

### course 对象

```json
{
  "id": "s:929acb6451bb",
  "source": "sync",
  "edited": false,
  "name": "计算机组成原理",
  "teacher": "胡美辰",
  "room": "C403",
  "day": 1,
  "day_name": "星期一",
  "sections": [3, 4],
  "start_section": 3,
  "end_section": 4,
  "weeks": [2, 4, 6, 8, 10, 12, 14, 16, 18],
  "weeks_raw": "2-18双(3,4)",
  "parity": "双周",
  "period": "上午",
  "student_count": 0,
  "notes": [],
  "color": "",
  "raw": "计算机组成原理 / 2-18双(3,4) / 胡美辰 / C403 / 人数:0"
}
```

| 字段 | 说明 |
| --- | --- |
| `id` | 课程标识。`s:` 前缀＝教务同步来的，`m:` 前缀＝人工新增的。改/删要用它 |
| `source` | `sync`＝教务同步，`manual`＝人工新增 |
| `edited` | 是否被人工改过 |
| `day` | 1＝周一 … 7＝周日 |
| `sections` | 占用的节次，如 `[3, 4]` 表示第 3–4 节连堂 |
| `weeks` | **已展开的**周次数组，单双周已过滤好，可直接判断"第 N 周有没有这门课" |
| `weeks_raw` | 教务系统的原始写法，如 `2-18双(3,4)` |
| `parity` | `单周` / `双周` / `""` |
| `raw` | 教务系统单元格原文，字段解析有偏差时可拿它兜底 |

### week_info 对象

```json
{
  "today": "2026-09-07", "weekday": 1, "term_start": "2026-09-01",
  "total_weeks": 20, "current_week": 2, "in_term": true,
  "week_monday": "2026-09-07"
}
```

`current_week` 需要管理员先设置"第 1 周周一"（`term_start`），否则为 `null`。
`term_start` 填的日期会自动归到所在周的周一，填成周三之类不会导致整体偏移。

### grid 结构

```json
{
  "section_no": 3, "section": "第3节", "period": "上午",
  "days": { "1": [ /* course，带 span / is_start */ ], "2": [], "...": [] }
}
```

`days` 的键是 `"1"`–`"7"`（字符串）。一门连堂课会在它覆盖的**每一行**都出现，
额外带两个字段：

- `span` — 一共占几行（用于 HTML 表格的 `rowspan`）
- `is_start` — 是不是这门课的第一行（只在 `true` 的行渲染，其余行跳过）

同一格里可能有多门课（比如单周、双周错开上的两门课）。

## GET /api/courses

只要拍平的课程数组，适合自己排版。参数同 `/api/schedule` 的 `term` / `week` / `day`。

```json
{ "ok": true, "term": "2026-2027-1", "count": 12, "courses": [ /* ... */ ] }
```

## GET /api/today

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `term` | string | 学期，留空为当前 |
| `offset` | int −30–30 | 日期偏移，`1`＝明天，`-1`＝昨天 |

```json
{
  "ok": true, "term": "2026-2027-1", "date": "2026-09-07",
  "week": 2, "weekday": 1, "in_term": true, "count": 1, "courses": [ /* ... */ ]
}
```

未设置 `term_start` 时返回 `"week": null`、空 `courses`，并带 `message` 说明原因。

## GET /api/terms

```json
{
  "ok": true, "current": "2026-2027-1",
  "terms": [ { "term": "2026-2027-1", "xn": "2026-2027", "xq": "1", "synced": true } ]
}
```

`synced: true` 表示本地已有该学期数据。`synced: false` 的是教务系统里可选、但还没同步过的。

## GET /api/status

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `verify` | bool | `true` 时真的去教务系统探一次 Cookie（会多花 1–2 秒） |

```json
{
  "has_cookie": true, "has_identity": true, "cookie_tail": "tijipuvu",
  "last_sync": { "term": "2026-2027-1", "ok": true, "count": 17,
                 "message": "同步成功", "at": "2026-09-07 16:02:22" },
  "ok": true, "term": "2026-2027-1",
  "week_info": { "...": "..." },
  "course_count": 17,
  "cookie_valid": true
}
```

`cookie_valid` 只在 `verify=1` 时出现。**判断 Cookie 是不是该换了**，看
`last_sync.ok` 是否为 `false` 最省事，不用额外打教务系统。

---

# 管理接口

全部需要请求头：

```
X-Admin-Password: admin123
```

默认密码是 **`admin123`**，写在 `app.py` 顶部的 `ADMIN_PASSWORD` 常量里，要改就改那一行
（改完重启服务生效）。密码不对返回 `401`。

> ⚠️ `admin123` 是弱密码。只读接口本来就打算公开，但管理接口能改你的课表数据。
> 如果服务要暴露在公网上，建议改掉这个常量，或者在 nginx 层给 `/admin` 和
> `/api/admin/*` 再加一层 IP 白名单 / Basic Auth（见 `deploy/nginx.conf.example`）。

## POST /api/admin/login

用来校验密码是否正确（管理页面就用它）。成功返回 `{"ok": true, "message": "密码正确"}`。

## POST /api/admin/cookie

**Cookie 过期后就用这个接口换新的。**

```json
{ "cookie": "ASP.NET_SessionId=xxxx; route=yyyy", "sync": true }
```

| 字段 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `cookie` | string | 必填 | 整行 Cookie。只粘 SessionId 的值也认，会自动补上键名 |
| `sync` | bool | `true` | 保存后立刻同步一次，页面和 API 同时刷新成最新数据 |

```bash
curl -X POST http://127.0.0.1:8000/api/admin/cookie \
     -H "X-Admin-Password: admin123" -H "Content-Type: application/json" \
     -d '{"cookie":"ASP.NET_SessionId=xxxx; route=yyyy"}'
```

成功：

```json
{ "ok": true, "saved": true, "cookie_tail": "yyyy",
  "sync": { "term": "2026-2027-1", "count": 17, "fetched_at": "..." },
  "message": "Cookie 已更新，同步到 17 门课" }
```

新 Cookie 仍然无效时返回 **409**（Cookie 已保存，但同步没成功）：

```json
{ "ok": false, "error": "cookie_expired",
  "message": "Cookie 已过期或无效，请重新提供", "how_to_fix": "..." }
```

### 怎么取 Cookie

1. 浏览器登录 <https://eas.scit.cn>
2. `F12` → **Network / 网络**
3. 刷新页面，点任意一条 `eas.scit.cn` 的请求
4. 在 **Request Headers / 请求标头** 里找到 `Cookie`，整行复制

## POST /api/admin/refresh

重新从教务系统抓课表。**人工修改不会被覆盖**（见下方"人工修改怎么存的"）。

```json
{ "xn": "2026-2027", "xq": "1" }
```

两个字段都可选，留空＝教务系统当前学年学期。空 body `{}` 也行。

```json
{ "ok": true, "term": "2026-2027-1", "count": 17,
  "fetched_at": "2026-09-07 16:02:22", "message": "已同步 17 门课" }
```

Cookie 失效返回 `409 cookie_expired`；教务系统本身出问题返回 `502 upstream_error`。

## GET /api/admin/settings

```json
{ "ok": true,
  "settings": { "xh": "202417190053", "xm": "巫家浩", "title": "巫家浩的课程表",
                "term": "2026-2027-1", "term_start": "2026-09-01",
                "total_weeks": "20", "section_times": "[]" },
  "cookie_status": { "has_cookie": true, "cookie_tail": "tijipuvu", "...": "..." } }
```

Cookie 本身不会回显，只给尾号。

## PUT /api/admin/settings

字段全部可选，只传要改的。

```json
{
  "xh": "202417190053",
  "xm": "巫家浩",
  "title": "我的课程表",
  "term": "2026-2027-1",
  "term_start": "2026-09-01",
  "total_weeks": 20,
  "section_times": [ { "section": 1, "start": "08:00", "end": "08:45" } ]
}
```

`section_times` 配好后，课表页左侧会显示每节课的起止时间。

## GET /api/admin/courses

和 `/api/courses` 一样，但**额外包含被隐藏的课**（带 `"hidden": true`）。
参数：`term`。

## POST /api/admin/courses

新增一门教务系统里没有的课。参数 `term`（可选，默认当前学期）。

```json
{ "name": "自习", "teacher": "", "room": "图书馆",
  "day": 6, "sections": [1, 2], "weeks_raw": "1-18(1,2)" }
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `name` | 是 | 课程名 |
| `day` | 是 | 1–7 |
| `sections` | 是 | 节次数组，如 `[1, 2]` |
| `weeks_raw` | 否 | 时间描述，填了会**自动解析**出 `weeks` / `sections` / `parity` |
| `weeks` | 否 | 也可以直接给周次数组 |
| `teacher` / `room` / `period` / `color` / `notes` | 否 | |

`weeks_raw` 支持教务系统的写法：`2-4,6-18(3,4)`、`2-18双(3,4)`、`3,7-17单(5,6)`，
也支持 `1-16(周)1-2(节)` 这类其它模板的写法。

返回 `201` + 新课程对象（`id` 形如 `m:1`）。缺必填字段返回 `400`。

## PATCH /api/admin/courses/{id}

改课程。`id` 用 course 对象里的 `id`（`s:xxx` 或 `m:xxx`），参数 `term`（可选）。
body 字段同上，**只传要改的字段**。

```bash
curl -X PATCH "http://127.0.0.1:8000/api/admin/courses/s:929acb6451bb" \
     -H "X-Admin-Password: admin123" -H "Content-Type: application/json" \
     -d '{"room":"换到 C501"}'
```

返回 `{"ok": true, "course": { /* 改后的完整对象 */ }, "message": "已修改"}`。
课程不存在 `404`，`id` 格式不对 `400`。

## DELETE /api/admin/courses/{id}

- `s:` 开头（教务同步来的）→ **隐藏**，只读接口不再返回，管理接口仍可见，可还原
- `m:` 开头（人工新增的）→ **真删**，不可还原

## POST /api/admin/courses/{id}/restore

丢弃某门同步课程的所有人工改动（含隐藏状态），恢复成教务系统的原始数据。
只对 `s:` 开头的 id 有效。该课程没有人工改动时返回 `404`。

## POST /api/admin/courses/restore-all

清空该学期所有人工改动。参数 `term`。

```json
{ "ok": true, "cleared": 3, "message": "清掉了 3 条修改" }
```

## GET /api/admin/sync-log

参数 `limit`（1–50，默认 20）。只保留最近 50 条。

```json
{ "ok": true, "logs": [
  { "term": "2026-2027-1", "ok": true, "count": 17,
    "message": "同步成功", "at": "2026-09-07 16:02:22" } ] }
```

---

# 人工修改怎么存的

这套分层是为了让"重新同步"和"人工调整"互不打架：

```
教务同步数据 (synced_course)   每次同步整表重写
      +
人工修改层  (override)         按课程 key 挂靠，同步不动它
      +
人工新增课  (manual_course)    与教务系统无关，独立存在
      ↓
     有效课表  ← 只读接口和网页看到的就是这个
```

- 改一门同步来的课，改动记在**覆盖层**，原始数据仍在。重新同步后改动自动重新贴上去
- 课程 key 只用 `星期 + 节次 + 课程名 + 周次` 算，所以教务系统改了教师或教室，
  你的人工修改也不会失联
- 如果教务系统把课的**时间**改了（星期/节次/周次变化），key 就变了，
  老的覆盖记录会失效不再生效 —— 这是有意的，因为那已经是另一门课的安排了
- `restore` 撕掉覆盖层，`restore-all` 撕掉整个学期的

---

# 错误响应

所有错误都是同一个形状：

```json
{ "ok": false, "error": "cookie_expired", "message": "Cookie 已过期或无效，请重新提供" }
```

| 状态码 | `error` | 含义 |
| --- | --- | --- |
| 400 | `invalid_course` / `invalid_patch` / `bad_id` / `empty_cookie` | 请求内容不对 |
| 401 | `unauthorized` | 管理员密码缺失或不正确 |
| 404 | `not_found` | 课程不存在 |
| 409 | `cookie_expired` | **Cookie 过期**，需要管理员更新。额外带 `how_to_fix` |
| 422 | — | 参数校验失败（FastAPI 标准格式，如 `week=99`） |
| 502 | `upstream_error` | 教务系统不可用或返回异常 |

---

# 调用示例

## 取今天的课（shell）

```bash
curl -s "http://127.0.0.1:8000/api/today" | jq -r '.courses[] | "\(.sections[0])节 \(.name) @\(.room)"'
```

## 判断某周某天有没有课（Python）

```python
import requests

d = requests.get("http://127.0.0.1:8000/api/courses",
                 params={"week": 5, "day": 3}).json()
for c in d["courses"]:
    print(c["sections"], c["name"], c["room"], c["teacher"])
```

## 自己画表格（JavaScript）

```js
const d = await (await fetch('/api/schedule?week=5')).json();
for (const row of d.grid) {
  for (let day = 1; day <= 7; day++) {
    for (const c of row.days[String(day)]) {
      if (!c.is_start) continue;          // 连堂课只在第一行渲染
      console.log(`第${row.section_no}节起 占${c.span}节 周${day}`, c.name);
    }
  }
}
```

## Cookie 过期后的完整处理流程

```bash
# 1. 发现同步失败了
curl -s http://127.0.0.1:8000/api/status | jq '.last_sync'
# → { "ok": false, "message": "Cookie 失效: ..." }
#   注意：此时 /api/schedule 依然正常返回上次同步的数据

# 2. 浏览器取新 Cookie，更新（自动重新同步）
curl -X POST http://127.0.0.1:8000/api/admin/cookie \
     -H "X-Admin-Password: admin123" -H "Content-Type: application/json" \
     -d '{"cookie":"ASP.NET_SessionId=新的值; route=新的值"}'
# → { "ok": true, "message": "Cookie 已更新，同步到 17 门课" }

# 3. 数据已刷新，网页和 API 同时生效，无需重启服务
```

也可以直接开 `http://<IP>:<端口>/admin` 在网页上粘贴，等效。
