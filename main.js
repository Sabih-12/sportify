const CART_STORAGE_KEY = 'sportify_cart_v2';

let cart = loadCart();

const cartBtn = document.getElementById('cart-btn');
const closeCartBtn = document.getElementById('close-cart');
const cartOverlay = document.getElementById('cart-overlay');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total-price');
const cartCountEl = document.querySelector('.cart-count');
const cartCheckoutBtn = document.getElementById('cart-checkout-btn');
const checkoutForm = document.getElementById('checkout-form');
const checkoutSummary = document.getElementById('checkout-summary');
const orderStatus = document.getElementById('order-status');

function loadCart() {
  try {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    return savedCart ? JSON.parse(savedCart) : [];
  } catch (error) {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function formatPrice(value) {
  return `Rs. ${Number(value).toLocaleString()}`;
}

function resolveProductImage(image, id) {
  if (!image) return `/images/${id}.jpeg`;
  if (image.startsWith('http') || image.startsWith('/')) return image;
  return `/${image.replace(/^\//, '')}`;
}

function getCategoryFromBody() {
  return document.body.dataset.category || null;
}

async function getProducts(category = '', sortBy = 'name', sortOrder = 'asc') {
  const query = new URLSearchParams();
  if (category) query.set('category', category);
  query.set('sortBy', sortBy);
  query.set('sortOrder', sortOrder);

  const response = await fetch(`/api/products?${query.toString()}`);
  if (!response.ok) return { clothing: [], equipment: [], accessories: [] };
  return response.json();
}

async function findProduct(id) {
  const category = getCategoryFromBody();
  const products = await getProducts(category, 'name', 'asc');
  return (products[category] || []).find((product) => product.id === id) || null;
}

function parseSortValue(value) {
  const [sortBy, sortOrder] = String(value).split(':');
  return {
    sortBy: ['price', 'name'].includes(sortBy) ? sortBy : 'name',
    sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
  };
}

function sortProductItems(items, sortBy, sortOrder) {
  return [...items].sort((a, b) => {
    if (sortBy === 'price') {
      return sortOrder === 'asc' ? a.price - b.price : b.price - a.price;
    }
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1;
    if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
}

function getSubtotal() {
  return cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
}

function getShippingFee() {
  return cart.length > 0 && getSubtotal() < 15000 ? 400 : 0;
}

function getTotalQuantity() {
  return cart.reduce((sum, item) => sum + Number(item.quantity), 0);
}

function getTotal() {
  return getSubtotal() + getShippingFee();
}

function updateCartBadge() {
  if (cartCountEl) {
    cartCountEl.textContent = String(getTotalQuantity());
  }
}

function updateCartCheckoutButton() {
  if (!cartCheckoutBtn) return;
  cartCheckoutBtn.hidden = cart.length === 0;
}

function renderCartItems() {
  if (!cartItemsContainer) return;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p class="empty-cart-msg">Your cart is empty.</p>';
    if (cartTotalEl) cartTotalEl.textContent = formatPrice(0);
    updateCartCheckoutButton();
    return;
  }

  cartItemsContainer.innerHTML = cart.map((item) => `
    <div class="cart-item">
      <img src="${resolveProductImage(item.image, item.id)}" alt="${item.name}" loading="lazy">
      <div class="cart-item-info">
        <div class="cart-item-title">${item.name}</div>
        <div class="cart-item-price">${formatPrice(item.price)}</div>
        <div class="quantity-controls">
          <button class="qty-btn" data-action="decrease" data-id="${item.id}">-</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" data-action="increase" data-id="${item.id}">+</button>
        </div>
      </div>
      <button class="remove-item" data-action="remove" data-id="${item.id}"><i class="fa-solid fa-trash"></i></button>
    </div>
  `).join('');

  if (cartTotalEl) {
    cartTotalEl.textContent = formatPrice(getTotal());
  }

  updateCartCheckoutButton();
}

function renderCheckoutSummary() {
  if (!checkoutSummary) return;

  if (cart.length === 0) {
    checkoutSummary.innerHTML = '<p class="empty-cart-msg">Add products before checking out.</p>';
    return;
  }

  checkoutSummary.innerHTML = `
    <div class="summary-list">
      ${cart.map((item) => `
        <div class="summary-item">
          <div>
            <strong>${item.name}</strong>
            <p>${item.quantity} x ${formatPrice(item.price)}</p>
          </div>
          <span>${formatPrice(item.price * item.quantity)}</span>
        </div>
      `).join('')}
    </div>
    <div class="summary-breakdown">
      <div><span>Subtotal</span><strong>${formatPrice(getSubtotal())}</strong></div>
      <div><span>Shipping</span><strong>${formatPrice(getShippingFee())}</strong></div>
      <div class="summary-total"><span>Total</span><strong>${formatPrice(getTotal())}</strong></div>
    </div>
  `;
}

async function addToCart(id) {
  const product = await findProduct(id);
  if (!product) return;

  const existingItem = cart.find((item) => item.id === id);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ ...product, image: resolveProductImage(product.image, product.id), quantity: 1 });
  }

  saveCart();
  updateCartBadge();
  renderCartItems();
  renderCheckoutSummary();

  if (cartOverlay) {
    cartOverlay.classList.add('active');
  }
}

function removeFromCart(id) {
  cart = cart.filter((item) => item.id !== id);
  saveCart();
  updateCartBadge();
  renderCartItems();
  renderCheckoutSummary();
}

function updateQuantity(id, change) {
  const item = cart.find((entry) => entry.id === id);
  if (!item) return;

  item.quantity += change;
  if (item.quantity <= 0) {
    removeFromCart(id);
    return;
  }

  saveCart();
  updateCartBadge();
  renderCartItems();
  renderCheckoutSummary();
}

async function renderProducts() {
  const category = getCategoryFromBody();
  const grid = document.getElementById('product-grid');
  if (!grid || !category) return;

  const sortSelect = document.getElementById('sort-select');
  const { sortBy, sortOrder } = parseSortValue(sortSelect?.value || 'name:asc');
  const products = await getProducts(category, sortBy, sortOrder);
  const items = products[category] || [];

  grid.innerHTML = items.map((item) => `
    <article class="product-card reveal">
      <div class="img-container">
        <img src="${resolveProductImage(item.image, item.id)}" alt="${item.name}" class="product-image" loading="lazy">
      </div>
      <div class="product-info">
        <div class="product-category">${item.category || category}</div>
        <h3 class="product-title">${item.name}</h3>
        <div class="product-price">${formatPrice(item.price)}</div>
        <button class="add-to-cart" data-add-id="${item.id}">Add to Cart</button>
      </div>
    </article>
  `).join('');
}

function setupSortDropdown() {
  const sortSelect = document.getElementById('sort-select');
  if (!sortSelect) return;
  sortSelect.addEventListener('change', renderProducts);
}

function setupCartToggle() {
  if (cartBtn) {
    cartBtn.addEventListener('click', () => {
      cartOverlay?.classList.add('active');
    });
  }

  if (closeCartBtn) {
    closeCartBtn.addEventListener('click', () => {
      cartOverlay?.classList.remove('active');
    });
  }

  if (cartOverlay) {
    cartOverlay.addEventListener('click', (event) => {
      if (event.target === cartOverlay) {
        cartOverlay.classList.remove('active');
      }
    });
  }

  if (cartItemsContainer) {
    cartItemsContainer.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const { action, id } = button.dataset;
      if (action === 'remove') removeFromCart(id);
      if (action === 'increase') updateQuantity(id, 1);
      if (action === 'decrease') updateQuantity(id, -1);
    });
  }
}

function setupProductButtons() {
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-add-id]');
    if (!button) return;
    addToCart(button.dataset.addId);
  });
}

function setupCheckoutForm() {
  if (!checkoutForm) return;

  checkoutForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (cart.length === 0) {
      if (orderStatus) {
        orderStatus.textContent = 'Your cart is empty.';
      }
      return;
    }

    const formData = new FormData(checkoutForm);
    const payload = {
      customer: {
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        city: formData.get('city'),
        postalCode: formData.get('postalCode'),
        deliveryNote: formData.get('deliveryNote'),
      },
      paymentMethod: formData.get('paymentMethod'),
      items: cart,
    };

    if (orderStatus) {
      orderStatus.textContent = 'Processing your order…';
    }

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      if (orderStatus) {
        orderStatus.textContent = result.message || 'We could not place your order. Please try again.';
      }
      return;
    }

    localStorage.removeItem(CART_STORAGE_KEY);
    cart = [];
    saveCart();
    updateCartBadge();

    window.location.href = `/order-success?orderId=${result.orderId}`;
  });
}

function setupHomeLinks() {
  document.querySelectorAll('[data-category-link]').forEach((link) => {
    link.href = `/${link.dataset.categoryLink}`;
  });
}

function guardCheckoutPage() {
  if (document.body.dataset.page !== 'checkout') return;
  if (cart.length === 0) {
    window.location.replace('/');
  }
}

function init() {
  guardCheckoutPage();
  updateCartBadge();
  renderCartItems();
  renderCheckoutSummary();
  setupCartToggle();
  setupProductButtons();
  setupCheckoutForm();
  setupHomeLinks();
  setupSortDropdown();
  renderProducts();
}


init();
