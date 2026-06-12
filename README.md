# Card Memo 卡片式备忘录（密码入口 + 自动保存到 KV 版）

一个卡片式备忘录项目，支持：

- Vue 3 + Vite 前端
- 进入页面前输入访问密码
- IndexedDB 本地离线保存
- EdgeOne Edge Functions API
- EdgeOne KV 云端自动同步
- JSON 导入 / 导出备份

当前版本采用“密码入口 + 本地优先 + 自动保存到 KV”：

- 打开页面后，先输入访问密码。
- 密码不写死在前端，由你在 EdgeOne Pages / Makers 环境变量中配置：`MEMO_PASSWORD`。
- 密码验证通过后，才进入卡片备忘录页面。
- 新增、编辑、删除、置顶、归档、导入卡片时，数据会先保存到浏览器 IndexedDB。
- 本地保存完成后，系统会自动防抖同步到 EdgeOne KV，不需要手动点击推送。
- 新设备首次输入密码进入时，如果本地没有卡片，会自动从 KV 恢复数据。
- 页面不保留“访问令牌输入框 / 保存令牌按钮 / 从 KV 拉取 / 立即保存到 KV”这些按钮。

这样设计的好处是：即使 KV 或网络暂时不可用，也不会影响你本地记录；网络恢复后再次编辑即可自动保存到 KV。

## 功能

- 进入页面前输入密码
- 新增卡片
- 编辑卡片
- 删除卡片
- 置顶卡片
- 归档 / 恢复卡片
- 标签管理
- 标题 / 内容 / 标签搜索
- 卡片颜色选择
- JSON 导出备份
- JSON 导入恢复
- EdgeOne KV 自动保存
- EdgeOne KV 自动恢复

## 项目结构

```text
card-memo
├── edge-functions
│   └── api
│       └── memos.js              # EdgeOne Edge Function，路由为 /api/memos
├── public
├── src
│   ├── components
│   │   ├── EmptyState.vue
│   │   ├── MemoCard.vue
│   │   ├── MemoEditor.vue
│   │   ├── PasswordGate.vue      # 进入页面前的密码弹窗
│   │   └── Toolbar.vue
│   ├── App.vue
│   ├── cloudApi.js               # 前端调用 /api/memos
│   ├── db.js                     # IndexedDB 本地存储
│   ├── main.js
│   ├── styles.css
│   └── utils.js
├── edgeone.json
├── index.html
├── package.json
└── vite.config.js
```

## 本地前端开发

只开发前端界面时：

```bash
npm install
npm run dev
```

注意：`npm run dev` 只启动 Vite，不会启动 Edge Functions。由于现在接口要求密码和 KV，普通 Vite 开发模式下无法完整联调云同步。

## EdgeOne 本地联调

如果要联调 Edge Functions + KV：

```bash
npm install -g edgeone
edgeone login
edgeone makers link
edgeone makers dev
```

访问：

```text
http://localhost:8088/
```

`edgeone makers dev` 会在同一个端口提供前端页面和 Functions 路由，前端可以直接请求：

```text
/api/memos
```

## EdgeOne KV 配置

这个项目默认要求 KV 变量名为：

```text
MEMO_KV
```

配置步骤：

1. 进入 EdgeOne Makers / Pages 控制台。
2. 打开 Storage / KV。
3. 创建 KV Namespace，例如：`card_memo`。
4. 进入你的 Card Memo 项目。
5. 打开项目的 KV Storage 菜单。
6. 点击 Bind Namespace。
7. 选择刚创建的 namespace。
8. 绑定变量名填写：

```text
MEMO_KV
```

## 访问密码配置

必须配置环境变量：

```text
MEMO_PASSWORD=你自己设置的访问密码
```

前端不会保存这个密码到代码里。用户打开网页后输入密码，前端会把密码放到请求头：

```text
X-Memo-Password: 你的密码
```

Edge Function 会用环境变量 `MEMO_PASSWORD` 校验请求。

兼容旧版本：如果你之前已经配置了 `MEMO_TOKEN`，函数也会兼容读取，但推荐改成 `MEMO_PASSWORD`。

## Edge Functions 接口

### GET /api/memos

从 KV 读取所有卡片。

请求需要带请求头：

```text
X-Memo-Password: 你的密码
```

返回示例：

```json
{
  "success": true,
  "data": {
    "updatedAt": "2026-06-12T08:00:00.000Z",
    "memos": []
  }
}
```

### PUT /api/memos

把当前卡片列表覆盖保存到 KV。

请求需要带请求头：

```text
X-Memo-Password: 你的密码
```

请求示例：

```json
{
  "memos": [
    {
      "id": "memo-id",
      "title": "客户沟通记录",
      "content": "今天确认了采购模块需求",
      "tags": ["客户", "采购"],
      "color": "#fff7ed",
      "pinned": false,
      "archived": false,
      "createdAt": "2026-06-12T08:00:00.000Z",
      "updatedAt": "2026-06-12T08:00:00.000Z"
    }
  ]
}
```

## 打包

```bash
npm run build
```

构建产物在：

```text
dist
```

## 部署到 EdgeOne Makers / Pages

如果你是上传 ZIP 的方式：

1. 进入你的 EdgeOne 项目。
2. 打开“构建部署 / Deployments”。
3. 点击“新建部署”。
4. 上传新版 ZIP。
5. 部署环境选择“生产环境”。
6. 开始部署。
7. 部署完成后，确认绑定 KV：

```text
变量名：MEMO_KV
```

8. 配置环境变量：

```text
MEMO_PASSWORD=你自己的访问密码
```

9. 重新部署一次。

如果你用 Git 部署：

1. 把项目上传到 GitHub / Gitee / Coding。
2. 进入 EdgeOne Makers / Pages 控制台。
3. 新建项目，导入 Git 仓库。
4. 构建命令：

```bash
npm run build
```

5. 输出目录：

```text
dist
```

6. 部署完成后，绑定 `MEMO_KV` 并配置 `MEMO_PASSWORD`。
7. 重新部署一次。

## CLI 部署

安装并登录：

```bash
npm install -g edgeone
edgeone login
```

在项目根目录执行：

```bash
edgeone makers deploy -n card-memo
```

或者使用项目脚本：

```bash
npm run edge:deploy
```

## 使用方式

1. 打开页面。
2. 输入你在 Pages 环境变量里配置的 `MEMO_PASSWORD`。
3. 验证通过后进入卡片备忘录。
4. 新增、编辑、删除、置顶、归档或导入卡片。
5. 系统会先写入本地 IndexedDB，然后在约 1.2 秒后自动保存到 KV。
6. 在另一台设备打开同一个网站，输入同一个密码。
7. 如果本地没有卡片，系统会自动从 KV 恢复。

## 重要注意事项

1. 当前是“自动保存”，不是多人实时协同编辑。
2. 每次自动保存都会用当前浏览器里的卡片列表覆盖 KV。
3. 新设备首次打开且本地没有卡片时，会自动从 KV 恢复；为了避免误覆盖，页面不提供手动拉取按钮。
4. 密码只保存在当前浏览器会话 `sessionStorage` 中，关闭浏览器会话后需要重新输入。
5. 大量导入或跨设备切换前建议先导出 JSON 备份。
6. KV 是最终一致性存储，不适合强一致、多用户并发编辑场景。
7. 这个版本适合个人备忘录、轻量记录、少量多设备同步。


## 本版界面说明

本版已经移除首页的 Cloud Sync / Edge Functions + KV 自动保存说明卡片，页面只保留备忘录核心操作。KV 同步仍在后台自动执行。
