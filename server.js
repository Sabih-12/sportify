const express = require('express');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 3000;
const defaultDbName = process.env.DB_NAME || 'sportify-multi-page-store';
const mongoUrl = process.env.MONGODB_URI || `mongodb://127.0.0.1:27017/${defaultDbName}`;

const Category = require('./models/Category');
const Product = require('./models/Product');
const User = require('./models/User');
const Cart = require('./models/Cart');
const Order = require('./models/Order');
const bcrypt = require('bcryptjs');
const { generateToken, authMiddleware } = require('./auth');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const wrongAdminPaths = [
  '/clothing/admin',
  '/clothing/admin/',
  '/equipment/admin',
  '/equipment/admin/',
  '/accessories/admin',
  '/accessories/admin/',
];
wrongAdminPaths.forEach((path) => {
  app.get(path, (req, res) => res.redirect(302, '/admin'));
});

const sendPage = (file) => (req, res) => res.sendFile(__dirname + '/' + file);

// Page routes must be registered before express.static (avoids /admin redirect loop)
app.get('/', sendPage('index.html'));
app.get('/clothing', sendPage('clothing.html'));
app.get('/equipment', sendPage('equipment.html'));
app.get('/accessories', sendPage('accessories.html'));
app.get('/checkout', sendPage('checkout.html'));
app.get('/order-success', sendPage('success.html'));
app.get(['/admin', '/admin/'], sendPage('admin.html'));

app.use(express.static(__dirname));

const productImg = (id) => `/images/${id}.jpeg`;

app.get('/api/products', (req, res) => {
  const productData = {
    clothing: [
        { id: 'c1', name: 'Sports T-Shirt', price: 2500, image: 'images/c1.jpeg', category: 'Clothing' },
        { id: 'c2', name: 'Training Trousers', price: 3200, image: 'images/c2.jpeg', category: 'Clothing' },
        { id: 'c3', name: 'Aero Shoes', price: 8500, image: 'images/c3.jpeg', category: 'Clothing' },
        { id: 'c4', name: 'Compression Tee', price: 2800, image: 'images/c4.jpeg', category: 'Clothing' },
        { id: 'c5', name: 'Running Shorts', price: 1800, image: 'images/c5.jpeg', category: 'Clothing' },
        { id: 'c6', name: 'Thermal Jacket', price: 5500, image: 'images/c6.jpeg', category: 'Clothing' },
        { id: 'c7', name: 'Athletic Hoodie', price: 4200, image: 'images/c7.jpeg', category: 'Clothing' }
    ],
    equipment: [
        { id: 'e1', name: 'Football', price: 4000, image: 'images/e1.jpeg', category: 'Equipment' },
        { id: 'e2', name: 'GripMax Basketball', price: 4500, image: 'images/e2.jpeg', category: 'Equipment' },
        { id: 'e3', name: 'Tennis Racket', price: 12000, image: 'images/e3.jpeg', category: 'Equipment' },
        { id: 'e4', name: 'MCricket Bat', price: 15000, image: 'images/e4.jpeg', category: 'Equipment' }
    ],
    accessories: [
        { id: 'a1', name: 'Water Bottle', price: 1500, image: 'images/a1.jpeg', category: 'Accessories' },
        { id: 'a2', name: 'Gym Gloves', price: 1200, image: 'images/a2.jpeg', category: 'Accessories' },
        { id: 'a3', name: 'Skipping Rope', price: 800, image: 'images/a3.jpeg', category: 'Accessories' },
        { id: 'a4', name: 'Headband', price: 500, image: 'images/a4.jpeg', category: 'Accessories' },
        { id: 'a5', name: 'Gym Bag', price: 3500, image: 'images/a5.jpeg', category: 'Accessories' }
    ]
  };

  const category = (req.query.category || '').trim().toLowerCase();
  const sortBy = ['price', 'name'].includes(req.query.sortBy) ? req.query.sortBy : null;
  const sortOrder = String(req.query.sortOrder || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';

  if (category && sortBy) {
    const key = ['clothing', 'equipment', 'accessories'].includes(category) ? category : null;
    if (key) {
      const sorted = [...productData[key]].sort((a, b) => {
        if (sortBy === 'price') {
          return sortOrder === 'asc' ? a.price - b.price : b.price - a.price;
        }
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1;
        if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
      return res.json({ [key]: sorted });
    }
  }

  res.json(productData);
});

app.get('/api/products/sorted', async (req, res) => {
  const category = (req.query.category || '').trim().toLowerCase();
  const sortBy = ['price', 'name'].includes(req.query.sortBy) ? req.query.sortBy : 'name';
  const sortOrder = String(req.query.sortOrder || 'asc').toLowerCase() === 'desc' ? -1 : 1;

  const pipeline = [
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
  ];

  if (category) {
    const normalized = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
    pipeline.push({ $match: { 'category.name': normalized } });
  }

  pipeline.push({ $sort: { [sortBy]: sortOrder } });
  pipeline.push({
    $project: {
      id: { $toString: '$_id' },
      name: 1,
      description: 1,
      price: 1,
      image: 1,
      stock: 1,
      category: '$category.name',
    },
  });

  try {
    const products = await Product.aggregate(pipeline);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Database-backed CRUD endpoints ---
app.get('/api/db/products', async (req, res) => {
  try {
    const products = await Product.find().populate('category').lean();
    res.json(products);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin authentication
app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  try {
    const user = await User.findOne({ email }).lean();
    if (!user || user.role !== 'admin') return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password || '');
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const token = await generateToken(user);
    res.json({ token });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: list orders
app.get('/api/admin/orders', authMiddleware('admin'), async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: update order status
app.put('/api/admin/orders/:id/status', authMiddleware('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const o = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(o);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/db/products/search', async (req, res) => {
  const q = req.query.q || '';
  try {
    const results = await Product.find({ $text: { $search: q } }).limit(50).lean();
    res.json(results);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/db/products', async (req, res) => {
  try {
    const p = await Product.create(req.body);
    res.status(201).json(p);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/db/products/:id', async (req, res) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(p);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/db/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRs(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString()}`;
}

async function getSalesByCategoryAggregation() {
  return Order.aggregate([
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.category',
        totalSales: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
        totalQty: { $sum: '$items.qty' },
      },
    },
    { $project: { category: '$_id', totalSales: 1, totalQty: 1, _id: 0 } },
    { $sort: { totalSales: -1 } },
  ]);
}

async function getTopProductsAggregation() {
  return Order.aggregate([
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.name',
        soldQty: { $sum: '$items.qty' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
      },
    },
    { $sort: { soldQty: -1 } },
    { $limit: 10 },
    { $project: { productName: '$_id', soldQty: 1, revenue: 1, _id: 0 } },
  ]);
}

async function readViewCollection(name, sortField) {
  try {
    const db = mongoose.connection.db;
    return await db.collection(name).find().sort({ [sortField]: -1 }).toArray();
  } catch (err) {
    console.warn(`View ${name} unavailable, using live aggregation:`, err.message);
    return [];
  }
}

async function getAnalyticsData() {
  let salesByCategory = await readViewCollection('sales_by_category_view', 'totalSales');
  let topProducts = await readViewCollection('top_products_view', 'soldQty');

  if (!salesByCategory.length) {
    salesByCategory = await getSalesByCategoryAggregation();
  }
  if (!topProducts.length) {
    topProducts = await getTopProductsAggregation();
  }

  return {
    salesByCategory,
    topProducts,
    generatedAt: new Date(),
  };
}

function buildAnalyticsHtml({ salesByCategory, topProducts, generatedAt }) {
  const salesRows = salesByCategory.length
    ? salesByCategory.map((row) => `
        <tr>
          <td>${escapeHtml(row.category || 'Uncategorized')}</td>
          <td>${Number(row.totalQty || 0)}</td>
          <td>${formatRs(row.totalSales)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="3" class="empty-row">No sales recorded yet.</td></tr>';

  const topRows = topProducts.length
    ? topProducts.map((row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.productName || 'Unknown product')}</td>
          <td>${Number(row.soldQty || 0)}</td>
          <td>${formatRs(row.revenue)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="4" class="empty-row">No product sales yet.</td></tr>';

  return `
    <p class="status-text analytics-meta">Last updated · ${new Date(generatedAt).toLocaleString()}</p>
    <div class="admin-analytics-grid">
      <div>
        <h3>Sales by category</h3>
        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr><th>Category</th><th>Units sold</th><th>Revenue</th></tr>
            </thead>
            <tbody>${salesRows}</tbody>
          </table>
        </div>
      </div>
      <div>
        <h3>Top products</h3>
        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr><th>#</th><th>Product</th><th>Qty sold</th><th>Revenue</th></tr>
            </thead>
            <tbody>${topRows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

app.get('/api/admin/analytics', authMiddleware('admin'), async (req, res) => {
  try {
    res.json(await getAnalyticsData());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/analytics/display', authMiddleware('admin'), async (req, res) => {
  try {
    const data = await getAnalyticsData();
    res.type('html').send(buildAnalyticsHtml(data));
  } catch (err) {
    res.status(500).type('html').send('<p class="status-text">Unable to load analytics.</p>');
  }
});

// Aggregation example: sales by category
app.get('/api/analytics/sales-by-category', async (req, res) => {
  try {
    const pipeline = [
      { $unwind: '$items' },
      { $group: { _id: '$items.category', totalSales: { $sum: { $multiply: ['$items.price', '$items.qty'] } }, totalQty: { $sum: '$items.qty' } } },
      { $project: { category: '$_id', totalSales: 1, totalQty: 1, _id: 0 } }
    ];
    const result = await Order.aggregate(pipeline);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Transactional order placement (attempts atomic stock decrement + order creation)
app.post('/api/transaction/order', async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { userId, customer, paymentMethod, items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Items required' });
    }

    // decrement stock with conditional update
    for (const it of items) {
      const updated = await Product.updateOne({ _id: it.product, stock: { $gte: it.qty } }, { $inc: { stock: -it.qty } }, { session });
      if (updated.modifiedCount === 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: `Insufficient stock for product ${it.product}` });
      }
    }

    const subtotal = items.reduce((s, it) => s + (it.price * it.qty), 0);
    const shippingFee = subtotal >= 15000 ? 0 : 400;
    const total = subtotal + shippingFee;

    const order = await Order.create([{ user: userId, customer, paymentMethod, items: items.map(i=>({ product: i.product, name: i.name, category: i.category, price: i.price, qty: i.qty, image: i.image })), subtotal, shippingFee, total }], { session });

    await session.commitTransaction();
    session.endSession();
    res.status(201).json({ message: 'Order placed', orderId: order[0]._id });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: err.message });
  }
});

// Top-selling products (by line-item name — matches storefront orders)
app.get('/api/analytics/top-products', async (req, res) => {
  try {
    const top = await getTopProductsAggregation();
    res.json(top);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Archive analytics snapshot for reporting history.
app.post('/api/analytics/materialize', authMiddleware('admin'), async (req, res) => {
  try {
    const { salesByCategory, topProducts, generatedAt } = await getAnalyticsData();
    const snapshot = { createdAt: generatedAt, salesByCategory, topProducts };

    await mongoose.connection.db.collection('analytics_snapshots').insertOne(snapshot);
    res.status(201).json({ message: 'Analytics snapshot saved', snapshot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics/snapshots/latest', authMiddleware('admin'), async (req, res) => {
  try {
    const latest = await mongoose.connection.db
      .collection('analytics_snapshots')
      .find({})
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();
    res.json(latest[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { customer, paymentMethod, items } = req.body;

    if (!customer || !paymentMethod || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Customer details, payment method, and at least one item are required.' });
    }

    const subtotal = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity || 1)), 0);
    const shippingFee = subtotal >= 15000 ? 0 : 400;
    const total = subtotal + shippingFee;

    const order = await Order.create({
      customer,
      paymentMethod,
      items: items.map((item) => ({
        name: item.name,
        category: item.category,
        price: Number(item.price),
        qty: Number(item.quantity || item.qty || 1),
        image: item.image,
      })),
      subtotal,
      shippingFee,
      total,
    });

    res.status(201).json({ message: 'Order placed successfully.', orderId: order._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to save order right now.' });
  }
});

async function ensureAggregationViews() {
  const db = mongoose.connection.db;
  const existing = await db.listCollections({}, { nameOnly: true }).toArray();
  const names = new Set(existing.map((c) => c.name));

  if (names.has('sales_by_category_view')) {
    await db.collection('sales_by_category_view').drop();
  }
  if (names.has('top_products_view')) {
    await db.collection('top_products_view').drop();
  }

  await db.createCollection('sales_by_category_view', {
    viewOn: 'orders',
    pipeline: [
      { $unwind: '$items' },
      { $group: { _id: '$items.category', totalSales: { $sum: { $multiply: ['$items.price', '$items.qty'] } }, totalQty: { $sum: '$items.qty' } } },
      { $project: { _id: 0, category: '$_id', totalSales: 1, totalQty: 1 } }
    ]
  });

  await db.createCollection('top_products_view', {
    viewOn: 'orders',
    pipeline: [
      { $unwind: '$items' },
      { $group: { _id: '$items.name', soldQty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } },
      { $sort: { soldQty: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, productName: '$_id', soldQty: 1, revenue: 1 } }
    ]
  });

  console.log('Sales reporting views ready.');
}

async function start() {
  try {
    await mongoose.connect(mongoUrl);
    console.log('Sportify store connected.');
    await ensureAggregationViews();
    app.listen(port, () => {
      console.log(`Sportify running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Store startup failed:', error.message);
    process.exit(1);
  }
}

start();
