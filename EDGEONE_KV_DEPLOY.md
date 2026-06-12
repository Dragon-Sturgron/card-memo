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

## 3. 建议配置访问令牌

为了避免公开站点被别人读写数据，建议配置环境变量：

```text
MEMO_TOKEN=一串随机字符串
```

然后在网页里填写同样的访问令牌。

如果不配置 `MEMO_TOKEN`，接口不会校验令牌。

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

```bash
edgeone makers deploy -n card-memo
```

或者推送到 Git 仓库，让 EdgeOne 自动部署。

## 6. 测试接口

如果没有配置 `MEMO_TOKEN`：

```bash
curl https://你的域名/api/memos
```

如果配置了 `MEMO_TOKEN`：

```bash
curl https://你的域名/api/memos \
  -H "X-Memo-Token: 你的令牌"
```

推送数据：

```bash
curl -X PUT https://你的域名/api/memos \
  -H "Content-Type: application/json" \
  -H "X-Memo-Token: 你的令牌" \
  -d '{"memos":[]}'
```
