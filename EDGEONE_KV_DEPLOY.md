# EdgeOne KV 与登录配置

## 1. 绑定 KV

进入 EdgeOne Pages 项目设置，绑定 KV 命名空间，运行时变量名必须填写：

```text
MEMO_KV
```

## 2. 配置登录密码

在环境变量里新增：

```text
MEMO_PASSWORD=你的登录密码
```

建议再新增一个随机密钥：

```text
AUTH_SECRET=随机字符串
```

`AUTH_SECRET` 不是必填，但建议配置。修改 `MEMO_PASSWORD` 或 `AUTH_SECRET` 后，之前的登录 Cookie 会失效，需要重新登录。

## 3. 覆盖部署

如果你使用“上传文件”方式部署：

```text
EdgeOne 项目
↓
构建部署 / Deployments
↓
新建部署
↓
上传项目 ZIP
↓
选择生产环境
↓
开始部署
```

## 4. 验证

部署完成后访问：

```text
/login
```

输入 `MEMO_PASSWORD` 后进入备忘录。

新增、编辑、删除、置顶、归档、修改分类后，会自动同步到 KV。

## 5. 接口

```text
GET  /api/auth   检查登录状态
GET  /api/memos  从 KV 读取备忘录
PUT  /api/memos  保存备忘录到 KV
GET  /logout     退出登录
```

未登录访问 `/api/memos` 会返回 401。
