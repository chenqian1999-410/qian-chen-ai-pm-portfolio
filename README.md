# 钱宸｜AI 产品经理作品集

## 本地预览

在 VS Code 中打开本目录后，在终端运行：

```bash
python3 -m http.server 4173 --directory dist
```

然后访问：

<http://127.0.0.1:4173/>

## 修改入口

- 页面代码：`dist/index.html`
- 图片与简历：`dist/assets/`
- 信息架构说明：`ARCHITECTURE.md`

保存 `dist/index.html` 后刷新浏览器即可看到修改。

## 自动检查

本地运行：

```bash
npm run check
```

GitHub Actions 会在每次 push 和面向 `main` 的 pull request 上自动检查：

- HTML 基础结构与重复 ID
- 本地页面、图片、脚本和样式链接
- 图片 `alt` 属性
- 内联及独立 JavaScript 语法
- 意外出现的 `file://` 本地路径

## 生产发布

生产环境不会随提交自动发布。需要在 GitHub Actions 中手动运行 **Deploy Production**，勾选发布确认后，工作流会再次执行检查，再部署到 Vercel。

发布工作流使用 GitHub `production` Environment，并需要：

- Repository variable：`VERCEL_ORG_ID`
- Repository variable：`VERCEL_PROJECT_ID`
- Repository secret：`VERCEL_TOKEN`

如果当前 GitHub 套餐支持 Environment required reviewers，可在仓库 Settings → Environments → production 中添加审核人，形成第二道人工作业确认。
