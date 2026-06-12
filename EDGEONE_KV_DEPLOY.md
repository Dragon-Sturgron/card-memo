# EdgeOne KV 部署说明

## 1. 创建 KV Namespace

在 EdgeOne Pages / Makers 控制台创建一个 KV Namespace，例如：

```text
card_memo
```

## 2. 绑定 KV 到项目

在项目设置里绑定 KV，变量名必须是：

```text
MEMO_KV
```

## 3. 配置访问密码

在项目环境变量中新增：

```text
MEMO_PASSWORD=你自己的访问密码
```

页面访问时会先要求输入密码。密码正确后，前端会通过请求头 `X-Memo-Password` 调用 `/api/memos`。

## 4. 覆盖部署

进入项目的构建部署页面，新建部署，上传新版 ZIP，并选择生产环境。

## 5. 自动同步

以下操作会自动同步到 KV：

```text
新增卡片
编辑卡片
删除卡片
置顶 / 取消置顶
归档 / 恢复
保存分类设置
```
