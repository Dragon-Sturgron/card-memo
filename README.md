# Card Memo

卡片式备忘录，适合部署到 EdgeOne Pages。当前版本支持：

- 打开页面先输入访问密码
- 新增、编辑、删除卡片
- 置顶、归档、恢复卡片
- 搜索标题、内容、分类
- 分类筛选
- 单独的分类设置页面
- 新增 / 编辑卡片时通过下拉框选择分类
- 所有新增、删除、修改、分类设置变更都会自动同步到 EdgeOne KV
- 本地 IndexedDB 缓存，网络异常时本地数据仍保留

## 本地运行

```bash
npm install
npm run dev
```

普通 `npm run dev` 只启动前端页面；如果要联调 Edge Functions 和 KV，请使用 EdgeOne CLI。

## EdgeOne 配置

项目需要两个配置：

```text
KV 绑定变量名：MEMO_KV
环境变量：MEMO_PASSWORD=你自己的访问密码
```

## 部署

直接上传 ZIP 到 EdgeOne Pages / Makers：

```text
构建命令：npm run build
输出目录：dist
```

如果使用项目根目录里的 `edgeone.json`，一般会自动读取构建配置。

## 数据同步说明

卡片和分类会先保存到浏览器本地 IndexedDB，然后自动写入 KV。自动保存使用防抖机制，连续编辑时不会每次输入都请求 KV。

换设备访问时，输入相同密码后，如果本地没有卡片，会自动从 KV 恢复云端数据。
