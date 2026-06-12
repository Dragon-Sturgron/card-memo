# Card Memo 卡片式备忘录

一个卡片式备忘录项目，支持：

- Vue 3 + Vite 前端
- IndexedDB 本地离线保存
- EdgeOne Edge Functions API
- EdgeOne KV 云端同步
- JSON 导入 / 导出备份

当前版本采用“本地优先 + 手动云同步”：

- 平时新增、编辑、删除卡片时，数据会先保存在浏览器 IndexedDB。
- 点击“推送到云端”时，会把当前浏览器里的卡片覆盖保存到 EdgeOne KV。
- 点击“从云端拉取”时，会把 KV 里的卡片覆盖到当前浏览器。

这样设计的好处是：即使 KV 或网络暂时不可用，也不会影响你本地记录。

## 功能

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
- EdgeOne KV 云端推送
- EdgeOne KV 云端拉取
- 可选访问令牌 `MEMO_TOKEN`

## 项目结构

```text
card-memo
├── edge-functions
│   └── api
│       └── memos.js          # EdgeOne Edge Function，路由为 /api/memos
├── public
├── src
│   ├── components
│   │   ├── CloudPanel.vue    # 云同步面板
│   │   ├── EmptyState.vue
│   │   ├── MemoCard.vue
│   │   ├── MemoEditor.vue
│   │   └── Toolbar.vue
│   ├── App.vue
│   ├── cloudApi.js           # 前端调用 /api/memos
│   ├── db.js                 # IndexedDB 本地存储
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

注意：`npm run dev` 只启动 Vite，不会启动 Edge Functions。页面可以正常使用本地 IndexedDB，但云同步接口 `/api/memos` 不可用。

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

1. 进入 EdgeOne Makers 控制台。
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

可选：如果你不希望任何知道网址的人都能读写你的备忘录，建议再配置一个环境变量：

```text
MEMO_TOKEN=你自己设置的一串随机密码
```

然后在页面的“访问令牌”输入框中填同样的值，并点击“保存令牌”。

> 如果你没有配置 `MEMO_TOKEN`，`/api/memos` 将不做令牌校验。个人测试可以这样用，但正式使用不建议公开。

## Edge Functions 接口

### GET /api/memos

从 KV 读取所有卡片。

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

如果配置了 `MEMO_TOKEN`，请求需要带请求头：

```text
X-Memo-Token: 你的令牌
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

推荐用 Git 部署：

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

6. 部署完成后，进入项目设置绑定 KV：

```text
变量名：MEMO_KV
```

7. 可选配置环境变量：

```text
MEMO_TOKEN=你自己的访问令牌
```

8. 重新部署一次。

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
2. 新增几张卡片。
3. 点击“推送到云端”，保存到 KV。
4. 在另一台设备打开同一个网站。
5. 如果配置了 `MEMO_TOKEN`，先输入访问令牌并保存。
6. 点击“从云端拉取”，即可同步卡片到当前浏览器。

## 重要注意事项

1. 当前是“手动同步”，不是自动实时同步。
2. “推送到云端”会用当前浏览器里的卡片覆盖 KV。
3. “从云端拉取”会用 KV 里的卡片覆盖当前浏览器。
4. 操作前建议先导出 JSON 备份。
5. KV 是最终一致性存储，不适合强一致、多用户并发编辑场景。
6. 这个版本适合个人备忘录、轻量记录、少量多设备同步。

## 后续可升级方向

- 自动同步
- 冲突合并
- 登录系统
- 每个用户单独一个数据空间
- 单张卡片分享
- 回收站
- Markdown 预览
- 图片附件
