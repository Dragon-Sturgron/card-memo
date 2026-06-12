# EdgeOne Edge Functions + KV 部署说明

## 1. 路由说明

项目中的函数文件：

```text
edge-functions/api/memos.js
```

部署后访问路由是：

```text
/api/memos
```

前端 `src/cloudApi.js` 会直接请求这个地址。

## 2. 必须绑定 KV

函数默认读取变量名：

```text
MEMO_KV
```

请在 EdgeOne Makers / Pages 项目的 KV Storage 中绑定 namespace，并把变量名设置为 `MEMO_KV`。

## 3. 必须配置访问密码

为了避免公开站点被别人读写数据，请配置环境变量：

```text
MEMO_PASSWORD=你自己设置的访问密码
```

打开网页时会先提示输入密码。密码验证通过后，才会进入备忘录页面。

前端请求接口时会携带请求头：

```text
X-Memo-Password: 你的密码
```

Edge Function 会用 `MEMO_PASSWORD` 校验。未配置 `MEMO_PASSWORD` 时，接口会返回错误。

兼容旧版本：如果你之前已经配置了 `MEMO_TOKEN`，函数也会兼容读取，但推荐改成 `MEMO_PASSWORD`。

## 4. 本地联调

```bash
npm install -g edgeone
edgeone login
edgeone makers link
edgeone makers dev
```

打开：

```text
http://localhost:8088/
```

## 5. 部署

如果你使用上传 ZIP 的方式：

```text
EdgeOne 项目
↓
构建部署 / Deployments
↓
新建部署
↓
上传新版 ZIP
↓
选择生产环境
↓
开始部署
```

如果你使用 CLI：

```bash
edgeone makers deploy -n card-memo
```

或者推送到 Git 仓库，让 EdgeOne 自动部署。

## 6. 测试接口

读取数据：

```bash
curl https://你的域名/api/memos \
  -H "X-Memo-Password: 你的密码"
```

推送数据：

```bash
curl -X PUT https://你的域名/api/memos \
  -H "Content-Type: application/json" \
  -H "X-Memo-Password: 你的密码" \
  -d '{"memos":[]}'
```

如果密码错误，会返回：

```json
{
  "success": false,
  "message": "密码不正确。"
}
```

## 7. 自动保存说明

这个版本不需要手动点击“推送到云端”，页面也不保留以下内容：

```text
访问令牌输入框
保存令牌按钮
从 KV 拉取
立即保存到 KV
```

以下操作会自动保存到 KV：

```text
新增卡片
编辑卡片
删除卡片
置顶 / 取消置顶
归档 / 恢复
导入 JSON
```

前端会先把数据写入浏览器 IndexedDB，然后等待约 1.2 秒再调用：

```text
PUT /api/memos
```

这样可以避免你连续编辑时频繁请求 KV。

```text
本地没有卡片 + 云端有卡片：输入密码进入后自动从 KV 恢复
本地有卡片 + 发生新增/编辑/删除等操作：自动保存到 KV
```
