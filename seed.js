const mongoose = require('mongoose');

const DB_NAME = process.env.DB_NAME || 'sportify-multi-page-store';
const MONGO_URI = process.env.MONGODB_URI || `mongodb://127.0.0.1:27017/${DB_NAME}`;

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to', MONGO_URI);

  const categorySchema = new mongoose.Schema({ name: { type: String, required: true, unique: true } });
  const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    price: { type: Number, required: true },
    image: String,
    stock: { type: Number, default: 0 }
  });
  const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: 'user' },
    createdAt: { type: Date, default: Date.now }
  });
  const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [{ product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, qty: Number, price: Number }],
    total: Number,
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
  });
  const cartSchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, items: [{ product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, qty: Number }] });

  const Category = mongoose.model('Category', categorySchema);
  const Product = mongoose.model('Product', productSchema);
  const User = mongoose.model('User', userSchema);
  const Order = mongoose.model('Order', orderSchema);
  const Cart = mongoose.model('Cart', cartSchema);

  // Clear existing data (for idempotent runs)
  await Promise.all([Category.deleteMany({}), Product.deleteMany({}), User.deleteMany({}), Order.deleteMany({}), Cart.deleteMany({})]);

  const categories = await Category.create([
    { name: 'Clothing' },
    { name: 'Accessories' },
    { name: 'Equipment' }
  ]);

  const [clothing, accessories, equipment] = categories;

  const products = await Product.create([
    { name: 'Running Shoes', description: 'Lightweight running shoes', category: equipment._id, price: 89.99, image: 'images/shoes.jpg', stock: 50 },
    { name: 'Sports T-Shirt', description: 'Breathable cotton tee', category: clothing._id, price: 19.99, image: 'images/tshirt.jpg', stock: 120 },
    { name: 'Water Bottle', description: '1L stainless bottle', category: accessories._id, price: 14.5, image: 'images/bottle.jpg', stock: 200 }
  ]);

  const user = await User.create({ name: 'Test User', email: 'test@example.com' });

  // create admin user if not exists
  const bcrypt = require('bcryptjs');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPass = process.env.ADMIN_PASS || 'admin123';
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const hash = await bcrypt.hash(adminPass, 10);
    await User.create({ name: 'Admin', email: adminEmail, password: hash, role: 'admin' });
    console.log('Created admin user', adminEmail);
  } else {
    console.log('Admin user already exists:', adminEmail);
  }

  const order = await Order.create({
    user: user._id,
    items: [
      { product: products[0]._id, qty: 1, price: products[0].price },
      { product: products[1]._id, qty: 2, price: products[1].price }
    ],
    total: products[0].price * 1 + products[1].price * 2,
    status: 'completed'
  });

  await Cart.create({ user: user._id, items: [{ product: products[2]._id, qty: 1 }] });

  console.log('Seed complete:');
  console.log(' Categories:', categories.map(c=>c.name));
  console.log(' Products:', products.map(p=>p.name));
  console.log(' User:', user.email);
  console.log(' Order ID:', order._id.toString());

  await mongoose.disconnect();
  console.log('Disconnected');
}

main().catch(err => { console.error(err); process.exit(1); });
