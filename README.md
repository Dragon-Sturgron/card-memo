# Card Memo 卡片式备忘录

一个适合部署到 EdgeOne Pages / Cloudflare Pages 的卡片式备忘录前端项目。

第一版是纯前端应用：

- Vue 3 + Vite
- IndexedDB 本地保存数据
- 不需要后端
- 不需要数据库
- 不需要 Edge Functions
- 可以 0 成本部署到静态 Pages 平台

> 注意：当前版本数据保存在当前浏览器的 IndexedDB 中。换电脑、换浏览器不会自动同步。后续如果要多端同步，再加 Edge Functions + KV / D1 等云端存储。

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
- 响应式卡片布局

## 本地运行

```bash
npm install
npm run dev
```

默认会启动 Vite 开发服务。

## 打包

```bash
npm run build
```

打包产物在：

```bash
dist
```

可以本地预览生产包：

```bash
npm run preview
```

## 部署到 EdgeOne Pages / EdgeOne Makers

### 方式一：Git 部署，推荐

1. 把本项目上传到 GitHub / Gitee / Coding。
2. 进入 EdgeOne Pages / EdgeOne Makers 控制台。
3. 新建项目，选择导入 Git 仓库。
4. 框架选择 Vite，或者让平台自动识别。
5. 构建命令填写：

```bash
npm run build
```

6. 输出目录填写：

```bash
dist
```

7. 点击部署。

### 方式二：CLI 部署

安装 CLI：

```bash
npm install -g edgeone
```

登录：

```bash
edgeone login
```

在项目根目录执行：

```bash
edgeone makers deploy -n card-memo
```

如果你已经手动执行了 `npm run build`，也可以只部署 `dist`：

```bash
edgeone makers deploy ./dist -n card-memo
```

## 部署到 Cloudflare Pages

### Git 部署，推荐

1. 把本项目上传到 GitHub / GitLab。
2. 打开 Cloudflare Dashboard。
3. 进入 Workers & Pages。
4. 创建 Pages 项目，连接你的 Git 仓库。
5. 构建配置填写：

```bash
Framework preset: Vue 或 Vite
Build command: npm run build
Build output directory: dist
Root directory: /
```

6. 点击部署。

## 后续云同步升级方向

如果后续你要登录和多端同步，可以扩展为：

```text
Vue 页面
↓
Edge Functions / Pages Functions
↓
KV / D1 / 外部数据库
```

建议第二阶段再做这些功能：

- 用户登录
- 云端同步
- 多设备访问
- 分享单张卡片
- 服务端备份
- 回收站

## 数据备份建议

因为当前版本数据保存在浏览器 IndexedDB，建议你定期点击页面里的“导出 JSON”做备份。

如果清理浏览器缓存或更换设备，本地数据可能无法保留。
