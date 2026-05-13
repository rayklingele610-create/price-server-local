const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'products.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// 确保目录存在
[path.join(__dirname, 'data'), path.join(__dirname, 'public'), UPLOADS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// 图片上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).substr(2, 8) + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/image\/(jpeg|jpg|png|gif|webp)/.test(file.mimetype)) cb(null, true);
    else cb(new Error('只允许上传图片文件'));
  }
});

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 读取数据
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { products: [], settings: { exchangeRate: 7.26, lastUpdated: new Date().toISOString() } };
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return { products: [], settings: { exchangeRate: 7.26, lastUpdated: new Date().toISOString() } }; }
}

// 保存数据
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ============ API 路由 ============

// 获取所有产品
app.get('/api/products', (req, res) => {
  const data = loadData();
  res.json({ success: true, data: data.products, settings: data.settings });
});

// 获取单个产品
app.get('/api/products/:id', (req, res) => {
  const data = loadData();
  const p = data.products.find(p => p.id === req.params.id);
  if (!p) return res.status(404).json({ success: false, message: '产品不存在' });
  res.json({ success: true, data: p });
});

// 新增产品
app.post('/api/products', (req, res) => {
  const data = loadData();
  const now = new Date().toISOString();
  const product = {
    id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    model: req.body.model || '',
    quantity: req.body.quantity || '',
    priceCNY: Number(req.body.priceCNY) || 0,
    priceUSD: Number(req.body.priceUSD) || 0,
    spec: req.body.spec || '',
    weight: req.body.weight || '',
    bagWeight: req.body.bagWeight || '',
    boxWeight: req.body.boxWeight || '',
    volume: req.body.volume || '',
    image: req.body.image || '',
    remark: req.body.remark || '',
    createdAt: now,
    updatedAt: now
  };
  data.products.push(product);
  saveData(data);
  res.json({ success: true, data: product, message: '新增成功' });
});

// 更新产品
app.put('/api/products/:id', (req, res) => {
  const data = loadData();
  const idx = data.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: '产品不存在' });
  const old = data.products[idx];
  data.products[idx] = {
    ...old,
    model: req.body.model !== undefined ? req.body.model : old.model,
    quantity: req.body.quantity !== undefined ? req.body.quantity : old.quantity,
    priceCNY: req.body.priceCNY !== undefined ? Number(req.body.priceCNY) : old.priceCNY,
    priceUSD: req.body.priceUSD !== undefined ? Number(req.body.priceUSD) : old.priceUSD,
    spec: req.body.spec !== undefined ? req.body.spec : old.spec,
    weight: req.body.weight !== undefined ? req.body.weight : old.weight,
    bagWeight: req.body.bagWeight !== undefined ? req.body.bagWeight : old.bagWeight,
    boxWeight: req.body.boxWeight !== undefined ? req.body.boxWeight : old.boxWeight,
    volume: req.body.volume !== undefined ? req.body.volume : old.volume,
    image: req.body.image !== undefined ? req.body.image : old.image,
    remark: req.body.remark !== undefined ? req.body.remark : old.remark,
    updatedAt: new Date().toISOString()
  };
  saveData(data);
  res.json({ success: true, data: data.products[idx], message: '更新成功' });
});

// 删除产品
app.delete('/api/products/:id', (req, res) => {
  const data = loadData();
  const idx = data.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: '产品不存在' });
  data.products.splice(idx, 1);
  saveData(data);
  res.json({ success: true, message: '删除成功' });
});

// 批量删除
app.post('/api/products/batch-delete', (req, res) => {
  const data = loadData();
  const ids = req.body.ids || [];
  data.products = data.products.filter(p => !ids.includes(p.id));
  saveData(data);
  res.json({ success: true, message: `已删除 ${ids.length} 条记录` });
});

// 更新汇率设置
app.put('/api/settings', (req, res) => {
  const data = loadData();
  data.settings = {
    exchangeRate: Number(req.body.exchangeRate) || data.settings.exchangeRate,
    lastUpdated: new Date().toISOString()
  };
  // 同步更新所有美元价格
  if (req.body.syncPrices && data.settings.exchangeRate > 0) {
    data.products = data.products.map(p => ({
      ...p,
      priceUSD: p.priceCNY > 0 ? Number((p.priceCNY / data.settings.exchangeRate).toFixed(4)) : p.priceUSD
    }));
  }
  saveData(data);
  res.json({ success: true, data: data.settings, message: '设置已更新' });
});

// 图片上传
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: '未接收到文件' });
  res.json({ success: true, url: '/uploads/' + req.file.filename, message: '上传成功' });
});

// 批量导入数据
app.post('/api/import', (req, res) => {
  const data = loadData();
  const items = req.body.products || [];
  const now = new Date().toISOString();
  const imported = items.map(item => ({
    id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    model: item.model || '',
    quantity: item.quantity || '',
    priceCNY: Number(item.priceCNY) || 0,
    priceUSD: Number(item.priceUSD) || 0,
    spec: item.spec || '',
    weight: item.weight || '',
    bagWeight: item.bagWeight || '',
    boxWeight: item.boxWeight || '',
    volume: item.volume || '',
    image: item.image || '',
    remark: item.remark || '',
    createdAt: now,
    updatedAt: now
  }));
  data.products = [...data.products, ...imported];
  saveData(data);
  res.json({ success: true, message: `已导入 ${imported.length} 条记录` });
});

// 导出数据
app.get('/api/export', (req, res) => {
  const data = loadData();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="products_export.json"');
  res.json(data);
});

// 获取局域网IP提示
app.get('/api/server-info', (req, res) => {
  const os = require('os');
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) ips.push({ name, ip: net.address });
    }
  }
  res.json({ port: PORT, ips });
});

app.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const nets = os.networkInterfaces();
  console.log('\n========================================');
  console.log('  步云鞋垫 · 价格填报系统 已启动');
  console.log('========================================');
  console.log(`  本机访问: http://localhost:${PORT}`);
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  局域网访问: http://${net.address}:${PORT}`);
      }
    }
  }
  console.log('========================================\n');
});
