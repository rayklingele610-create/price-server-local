# Price Server - 本地Node.js版

轻量级价格管理系统，支持多型号产品管理、汇率自动换算、Excel导入导出。

## 功能特点

- ✅ 多型号产品管理（AS01/AS03/AS05等）
- ✅ 美元/人民币自动换算
- ✅ Excel批量导入
- ✅ 图片上传
- ✅ 局域网多人同步访问

## 部署方式

### Railway（推荐）
1. 连接 GitHub 仓库
2. 自动部署
3. 访问分配的域名

### 本地运行
```bash
npm install
npm start
# 访问 http://localhost:3000
```

## 技术栈

- Node.js + Express
- CORS 跨域支持
- Multer 文件上传
- XLSX Excel处理
