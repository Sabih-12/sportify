const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  description: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true },
  price: { type: Number, required: true, index: true },
  image: String,
  stock: { type: Number, default: 0 }
});

productSchema.index({ name: 'text' });

module.exports = mongoose.model('Product', productSchema);
