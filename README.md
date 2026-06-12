# Card Memo 卡片式备忘录

一个适合部署到 EdgeOne Pages 的卡片式备忘录项目。

## 当前功能

- 卡片新增、编辑、删除
- 置顶、归档、恢复
- 搜索标题、内容、分类
- 分类下拉选择
- 独立分类设置页面
- IndexedDB 本地缓存
- Edge Functions + KV 自动保存
- `/login` 登录页
- HttpOnly Cookie 登录态
- `/logout` 退出登录

## 技术栈

- Vue 3
- Vite
- IndexedDB
- EdgeOne Edge Functions
- EdgeOne KV

## 本地前端运行

```bash
npm install
npm run dev
```

普通 `npm run dev` 只运行前端，不包含 Edge Functions。完整联调建议使用 EdgeOne CLI：

```bash
npm install -g edgeone
edgeone login
edgeone makers link
edgeone makers dev
```

## EdgeOne Pages 部署

构建配置：

```text
Build command: npm run build
Output directory: dist
```

直接上传项目 ZIP 时，请上传项目根目录完整内容，不要只上传 `dist`。需要包含：

```text
edge-functions/
src/
package.json
edgeone.json
index.html
vite.config.js
```

## 必要环境变量

在 EdgeOne Pages 项目里配置：

```text
MEMO_PASSWORD=你的登录密码
```

可选增强：

```text
AUTH_SECRET=一串随机密钥
```

如果不配置 `AUTH_SECRET`，系统会使用 `MEMO_PASSWORD` 参与生成登录 Cookie。

## KV 绑定

在 EdgeOne Pages 项目里绑定 KV 命名空间，变量名必须是：

```text
MEMO_KV
```

## 登录方式

访问网站时：

```text
未登录
↓
自动跳转 /login
↓
输入 MEMO_PASSWORD
↓
Edge Function 校验密码
↓
写入 HttpOnly Cookie
↓
进入备忘录
```

Cookie 名称：

```text
memo_auth
```

Cookie 属性：

```text
HttpOnly; SameSite=Strict; Path=/; Max-Age=7天
```

生产 HTTPS 环境下会自动加上 `Secure`。

## 自动同步逻辑

这些操作会自动保存到本地 IndexedDB，并在 1.2 秒防抖后自动同步到 KV：

```text
新增卡片
编辑卡片
删除卡片
置顶 / 取消置顶
归档 / 恢复
修改分类设置
```

首次登录时，如果本地没有卡片但 KV 里有数据，会自动从 KV 恢复。

## 路由说明

```text
/login       登录页，由 Edge Function 返回
/logout      退出登录，清除 Cookie
/api/auth    检查登录态
/api/memos   读写 KV 数据
/            Vue 备忘录页面
/#/settings  分类设置页面
```
