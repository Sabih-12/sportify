// Product Data
const products = {
    clothing: [
        { id: 'c1', name: 'Sports T-Shirt', price: 2500, image: 'images/abc.jpeg', category: 'Clothing' },
        { id: 'c2', name: 'Training Trousers', price: 3200, image: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category: 'Clothing' },
        { id: 'c3', name: 'Aero Shoes', price: 8500, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category: 'Clothing' },
        { id: 'c4', name: 'Compression Tee', price: 2800, image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category: 'Clothing' },
        { id: 'c5', name: 'Running Shorts', price: 1800, image: 'https://images.unsplash.com/photo-1533681473212-00b86a8b79b6?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category: 'Clothing' },
        { id: 'c6', name: 'Thermal Jacket', price: 5500, image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category: 'Clothing' },
        { id: 'c7', name: 'Athletic Hoodie', price: 4200, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category: 'Clothing' }
    ],
    equipment: [
        { id: 'e1', name: 'Football', price: 4000, image: 'https://images.unsplash.com/photo-1614632537190-23e4146777db?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category: 'Equipment' },
        { id: 'e2', name: 'GripMax Basketball', price: 4500, image: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category: 'Equipment' },
        { id: 'e3', name: 'Tennis Racket', price: 12000, image: 'images/ghi.jpeg', category: 'Equipment' },
        { id: 'e4', name: 'MCricket Bat', price: 15000, image: 'https://images.unsplash.com/photo-1593341646782-e0b495cff86d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category: 'Equipment' }
    ],
    accessories: [
        { id: 'a1', name: ' Water Bottle', price: 1500, image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category: 'Accessories' },
        { id: 'a2', name: 'Gym Gloves', price: 1200, image: 'https://images.unsplash.com/photo-1584735174965-b1c150c229ea?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category: 'Accessories' },
        { id: 'a3', name: 'Skipping Rope', price: 800, image: 'https://images.unsplash.com/photo-1515522510250-93a8dbbbf306?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category: 'Accessories' },
        { id: 'a4', name: 'Headband', price: 500, image: 'images/def.jpeg', category: 'Accessories' },
        { id: 'a5', name: 'Gym Bag', price: 3500, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category: 'Accessories' }
    ]
};

// Cart State
let cart = [];

// DOM Elements
const cartBtn = document.getElementById('cart-btn');
const closeCartBtn = document.getElementById('close-cart');
const cartOverlay = document.getElementById('cart-overlay');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total-price');
const cartCountEl = document.querySelector('.cart-count');

// Initialize
function init() {
    renderProducts();
    setupCartToggle();
}

// Render Products
function renderProducts() {
    renderCategory(products.clothing, 'clothing-grid');
    renderCategory(products.equipment, 'equipment-grid');
    renderCategory(products.accessories, 'accessories-grid');
}

function renderCategory(items, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="img-container">
                <img src="${item.image}" alt="${item.name}" class="product-image">
            </div>
            <div class="product-info">
                <div class="product-category">${item.category}</div>
                <h3 class="product-title">${item.name}</h3>
                <div class="product-price">Rs. ${item.price.toLocaleString()}</div>
                <button class="add-to-cart" onclick="addToCart('${item.id}')">Add to Cart</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Find product by ID
function findProduct(id) {
    for (const category in products) {
        const found = products[category].find(p => p.id === id);
        if (found) return found;
    }
    return null;
}

// Cart Functions
function addToCart(id) {
    const product = findProduct(id);
    if (!product) return;

    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    updateCart();
    
    // Open cart to show added item
    cartOverlay.classList.add('active');
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCart();
}

function updateQuantity(id, change) {
    const item = cart.find(item => item.id === id);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(id);
        } else {
            updateCart();
        }
    }
}

function updateCart() {
    // Update count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountEl.textContent = totalItems;

    // Update total price
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotalEl.textContent = `Rs. ${totalPrice.toLocaleString()}`;

    // Render items
    renderCartItems();
}

function renderCartItems() {
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-msg">Your cart is empty.</p>';
        return;
    }

    cartItemsContainer.innerHTML = '';
    cart.forEach(item => {
        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">Rs. ${item.price.toLocaleString()}</div>
                <div class="quantity-controls">
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
            </div>
            <button class="remove-item" onclick="removeFromCart('${item.id}')">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        cartItemsContainer.appendChild(el);
    });
}

// Setup Event Listeners
function setupCartToggle() {
    cartBtn.addEventListener('click', () => {
        cartOverlay.classList.add('active');
    });

    closeCartBtn.addEventListener('click', () => {
        cartOverlay.classList.remove('active');
    });

    // Close when clicking outside sidebar
    cartOverlay.addEventListener('click', (e) => {
        if (e.target === cartOverlay) {
            cartOverlay.classList.remove('active');
        }
    });
}

// Smooth scroll for nav links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        // Handle normal anchors, except empty #
        const href = this.getAttribute('href');
        if(href !== '#') {
            document.querySelector(href).scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Run init
init();
