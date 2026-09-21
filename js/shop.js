import { logManagerError, escapeHTML } from './utils.js';

import { auth, db } from './auth.js';

export const products = [
    {
        id: 'unstoppable-hoodie',
        name: 'Unstoppable Hoodie',
        price: 59.99,
        description: 'Premium black hoodie with the Unstoppable logo. Built for comfort and style.',
        imageUrl: '/images/UnstoppableHoodieModel300x300.png'
    },
    {
        id: 'dts-model-tee',
        name: 'DTS Model Tee',
        price: 24.99,
        description: 'Iconic tee featuring the official Dreams TimeSkip character art.',
        imageUrl: 'images/DreamsTimeSkipModel300x300.jpg'
    },
    {
        id: 'harmonytunes-shirt',
        name: 'HarmonyTunes Cap',
        price: 24.99,
        description: 'Dark cap with the HarmonyTunes logo. Perfect for music lovers.',
        imageUrl: 'images/HarmonyTunesModel300x300.png'
    },
    {
        id: 'unstoppable-mousepad',
        name: 'Unstoppable Mousepad',
        price: 19.99,
        description: 'High-performance mousepad for gaming precision.',
        imageUrl: 'images/unstoppablemousepadmodel2-300x300.jpg'
    }
];

export const productMap = products.reduce((acc, product) => {
    acc[product.id] = product;
    return acc;
}, {});

export function calculateCartTotal(cartData, prodMap) {
    return Object.entries(cartData).reduce((sum, [productId, quantity]) => {
        const product = prodMap[productId];
        if (!product) return sum;
        return sum + (product.price * quantity);
    }, 0);
}

let cart = {};
let currentUser = null;
let isDashboardLoaded = false;

let productGrid;
let cartButton;
let cartModal;
let closeCartBtn;
let cartItemsContainer;
let cartItemCountEl;
let cartTotalPriceEl;
let checkoutBtn;
let navCtaContainer;
let hamburger;
let navLinks;


let updateQuantityTimeouts = new Map();

function renderProducts() {
    productGrid.innerHTML = products.map(product => `
        <div class="product-card">
            <img src="${escapeHTML(product.imageUrl)}" alt="${escapeHTML(product.name)}" class="product-image" loading="lazy">
            <div class="product-info">
                <h3>${escapeHTML(product.name)}</h3>
                <p>${escapeHTML(product.description)}</p>
                <div class="product-footer">
                    <span class="product-price">$${product.price.toFixed(2)}</span>
                    <button class="add-to-cart-btn" data-id="${escapeHTML(product.id)}">Add to Cart</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderCart() {
    if (Object.keys(cart).length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-message">Your cart is empty.</p>';
        checkoutBtn.disabled = true;
    } else {
        const fragment = document.createDocumentFragment();

        Object.entries(cart).forEach(([productId, quantity]) => {
            const product = productMap[productId];
            if (!product) return;

            const htmlString = `
                <div class="cart-item">
                    <img src="${escapeHTML(product.imageUrl)}" alt="${escapeHTML(product.name)}" class="cart-item-img" loading="lazy">
                    <div class="cart-item-info">
                        <h4>${escapeHTML(product.name)}</h4>
                        <p>${product.price.toFixed(2)}</p>
                    </div>
                    <div class="cart-item-actions">
                        <input type="number" aria-label="Item Quantity" value="${escapeHTML(quantity)}" min="1" data-id="${escapeHTML(productId)}" class="item-quantity-input">
                        <button class="remove-item-btn" aria-label="Remove Item" data-id="${escapeHTML(productId)}">&#128465;</button>
                    </div>
                </div>
            `;

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlString;
            fragment.appendChild(tempDiv.firstElementChild);
        });

        cartItemsContainer.innerHTML = '';
        cartItemsContainer.appendChild(fragment);
        checkoutBtn.disabled = false;
    }
    updateCartSummary();
}

function updateCartSummary() {
    const itemCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
    const totalPrice = calculateCartTotal(cart, productMap);

    cartItemCountEl.textContent = itemCount;
    cartTotalPriceEl.textContent = `$${totalPrice.toFixed(2)}`;
    cartButton.setAttribute('aria-label', `Open Cart, ${itemCount} items`);
}

async function updateCartState(mutationFn, errorMessage) {
    const originalCart = { ...cart };
    try {
        mutationFn();
        if (JSON.stringify(cart) === JSON.stringify(originalCart)) return;
        renderCart();
        await saveCart();
    } catch (error) {

        logManagerError(`${errorMessage}:`, error);
        cart = originalCart;
        renderCart();
    }
}

async function handleAddToCart(productId) {
    try {
        await updateCartState(() => {
            cart[productId] = (cart[productId] || 0) + 1;
        }, "Error adding item to cart");
    } catch (error) {
        logManagerError("Error in handleAddToCart", error);
    }
}

async function handleUpdateQuantity(productId, quantity) {
    try {
        if (quantity <= 0) {
            return await handleRemoveFromCart(productId);
        }
        await updateCartState(() => {
            cart[productId] = parseInt(quantity, 10);
        }, "Error updating item quantity");
    } catch (error) {
        logManagerError("Error in handleUpdateQuantity", error);
    }
}

async function handleRemoveFromCart(productId) {
    try {
        await updateCartState(() => {
            delete cart[productId];
        }, "Error removing item from cart");
    } catch (error) {
        logManagerError("Error in handleRemoveFromCart", error);
    }
}

async function saveCart() {
    if (currentUser) {
        try {
            const userCartRef = db.collection('carts').doc(currentUser.uid);
            await userCartRef.set({ items: cart });
        } catch (error) {
            logManagerError("Error saving cart to Firestore for uid: " + currentUser.uid, error);
            throw error;
        }
    } else {
        localStorage.setItem('localCart', JSON.stringify(cart));
    }
}

function updateUserNav(user) {
    if (user) {
        navCtaContainer.innerHTML = `<a href="account.html" class="cta-button nav-cta">My Account</a>`;
    } else {
        navCtaContainer.innerHTML = `<a href="sign in beta.html" class="cta-button nav-cta">Sign In</a>`;
    }
}

function setupEventListeners() {
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }

    if (productGrid) {
        productGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-cart-btn')) {
                const productId = e.target.dataset.id;
                handleAddToCart(productId);
            }
        });
    }

    if (cartButton && cartModal && closeCartBtn) {
        cartButton.addEventListener('click', () => cartModal.style.display = 'block');
        closeCartBtn.addEventListener('click', () => cartModal.style.display = 'none');
        window.addEventListener('click', (e) => {
            if (e.target === cartModal) {
                cartModal.style.display = 'none';
            }
        });
    }

    if (cartItemsContainer) {
        cartItemsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item-btn')) {
                const productId = e.target.dataset.id;
                handleRemoveFromCart(productId);
            }
        });
        const updateQuantityTimeouts = new Map();
        // ⚡ Bolt Optimization: Debounce quantity inputs to prevent rapid multiple Firestore updates and re-renders
        // Impact: Reduces overlapping rapid inputs, DOM updates, and Firestore writes when using spinners or typing quickly.
        cartItemsContainer.addEventListener('input', (e) => {
            if (e.target.classList.contains('item-quantity-input')) {
                const productId = e.target.dataset.id;
                const quantity = parseInt(e.target.value, 10);

                if (updateQuantityTimeouts.has(productId)) {
                    clearTimeout(updateQuantityTimeouts.get(productId));
                }

                const timeoutId = setTimeout(() => {
                    handleUpdateQuantity(productId, quantity);
                    updateQuantityTimeouts.delete(productId);
                }, 300);

                updateQuantityTimeouts.set(productId, timeoutId);
            }
        });
    }

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            window.location.href = 'checkout.html';
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    setupEventListeners();

    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        const localCartData = localStorage.getItem('localCart');
        const localCart = localCartData ? JSON.parse(localCartData) : {};

        if (user) {
            if (!isDashboardLoaded) {
                isDashboardLoaded = true;
                try {
                    const userCartRef = db.collection('carts').doc(user.uid);
                    const docSnap = await userCartRef.get();
                    const firestoreCart = docSnap.exists ? docSnap.data().items : {};

                    const mergedCart = { ...firestoreCart };
                    for (const [productId, quantity] of Object.entries(localCart)) {
                        mergedCart[productId] = (mergedCart[productId] || 0) + quantity;
                    }
                    cart = mergedCart;
                } catch (error) {
                    console.error("Error fetching user cart", error);
                    cart = localCart;
                }
            }
        } else {
            isDashboardLoaded = false;
            cart = localCart;
        }
    });
});
export function initShop() {}
document.addEventListener('DOMContentLoaded', initShop);
