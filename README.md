# Card Memo 卡片式备忘录（分类 + KV 自动同步版）

一个适合部署到 EdgeOne Pages / Makers 的卡片式备忘录项目。

## 当前功能

- 进入页面前输入访问密码
- 新增卡片
- 编辑卡片
- 删除卡片
- 置顶卡片
- 归档 / 恢复卡片
- 设置分类
- 新增 / 编辑卡片时通过下拉框选择分类
- 标题 / 内容 / 分类搜索
- 按分类筛选
- IndexedDB 本地离线保存
- EdgeOne Edge Functions API
- EdgeOne KV 自动同步

当前版本已经移除：

```text
导出 JSON
导入 JSON
手动从 KV 拉取
手动保存到 KV
页面上的 KV 同步说明面板
```

## 同步逻辑

打开页面后先输入访问密码。密码验证通过后进入备忘录页面。

数据采用“本地优先 + 自动同步”模式：

```text
新增 / 编辑 / 删除 / 置顶 / 归档卡片
↓
先保存到浏览器 IndexedDB
↓
约 1.2 秒后自动保存到 EdgeOne KV
```

分类设置也会同步：

```text
点击“设置”
↓
新增 / 修改 / 删除分类
↓
保存设置
↓
自动同步到 EdgeOne KV
```

新设备首次输入密码进入时，如果本地没有卡片，会自动从 KV 恢复卡片；如果 KV 中有分类，也会自动恢复分类。

## 项目结构

```text
card-memo
├── edge-functions
│   └── api
│       └── memos.js              # EdgeOne Edge Function，路由为 /api/memos
├── public
├── src
│   ├── components
│   │   ├── CategorySettings.vue  # 分类设置弹窗
│   │   ├── EmptyState.vue
│   │   ├── MemoCard.vue
│   │   ├── MemoEditor.vue        # 卡片新增 / 编辑弹窗，分类为下拉框
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

```bash
npm install
npm run dev
```

普通 `npm run dev` 只启动前端，不会启动 Edge Functions。要完整联调 KV，需要用 EdgeOne CLI。

## EdgeOne 本地联调

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

## EdgeOne KV 配置

项目默认要求 KV 绑定变量名为：

```text
MEMO_KV
```

配置步骤：

```text
1. 进入 EdgeOne Makers / Pages 控制台
2. 打开 Storage / KV
3. 创建 KV Namespace，例如 card_memo
4. 进入你的 Card Memo 项目
5. 打开项目的 KV Storage 菜单
6. 点击 Bind Namespace
7. 选择刚创建的 namespace
8. 绑定变量名填写 MEMO_KV
```

## 访问密码配置

必须配置环境变量：

```text
MEMO_PASSWORD=你自己设置的访问密码
```

前端不会把密码写死到代码里。用户打开网页后输入密码，前端会把密码放到请求头：

```text
X-Memo-Password: 你的密码
```

Edge Function 会用环境变量 `MEMO_PASSWORD` 校验请求。

## Edge Functions 接口

### GET /api/memos

从 KV 读取卡片和分类。

返回示例：

```json
{
  "success": true,
  "data": {
    "updatedAt": "2026-06-12T08:00:00.000Z",
    "categories": ["工作", "生活", "开发"],
    "memos": []
  }
}
```

### PUT /api/memos

把当前卡片和分类覆盖保存到 KV。

请求示例：

```json
{
  "categories": ["工作", "生活", "开发"],
  "memos": [
    {
      "id": "memo-id",
      "title": "客户沟通记录",
      "content": "今天确认了采购模块需求",
      "category": "客户",
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

## 上传 ZIP 覆盖部署

```text
1. 进入你的 EdgeOne 项目
2. 打开“构建部署 / Deployments”
3. 点击“新建部署”
4. 上传新版 ZIP
5. 部署环境选择“生产环境”
6. 开始部署
7. 部署完成后，确认 KV 绑定变量名为 MEMO_KV
8. 确认环境变量 MEMO_PASSWORD 已配置
9. 如刚新增或修改环境变量，重新部署一次
```
