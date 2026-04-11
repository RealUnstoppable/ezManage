// js/checkout.js
import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { products } from './shop.js';

let currentUser = null;
let userCart = {};

const checkoutContainer = document.getElementById('checkout-container');

function renderCheckoutPage() {
    if (Object.keys(userCart).length === 0) {
        checkoutContainer.innerHTML = '<h1>Your cart is empty.</h1><a href="/shop.html" class="cta-button">Continue Shopping</a>';
        return;
    }

    const subtotal = Object.entries(userCart).reduce((sum, [productId, quantity]) => {
        const product = products.find(p => p.id === productId);
        return sum + (product.price * quantity);
    }, 0);
    const tax = subtotal * 0.07; // 7% tax
    const total = subtotal + tax;

    checkoutContainer.innerHTML = `
        <h1>Checkout</h1>
        <div class="checkout-layout">
            <div class="checkout-form-container">
                <form id="checkout-form">
                    <section>
                        <h3>Shipping Information</h3>
                        <div class="form-group">
                            <label for="name">Full Name</label>
                            <input type="text" id="name" required>
                        </div>
                        <div class="form-group">
                            <label for="address">Address</label>
                            <input type="text" id="address" required>
                        </div>
                        <div class="form-group">
                            <label for="city">City</label>
                            <input type="text" id="city" required>
                        </div>
                        <div class="form-group">
                            <label for="zip">ZIP Code</label>
                            <input type="text" id="zip" required>
                        </div>
                    </section>
                    <section>
                   <div style="background: rgba(255, 255, 0, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ffeeba;">
    <p style="margin: 0; color: #ffca2c; font-size: 0.9rem;"><strong>BETA NOTICE:</strong> No payment is required today. This is a reservation system. We will contact you via email for payment when the item ships.</p>
</div>
<button type="submit" class="cta-button place-order-button" id="place-order-btn">Reserve Order (Pay Later)</button>
                </form>
            </div>
            <div class="checkout-summary-container">
                <h3>Order Summary</h3>
                <div id="summary-items">
                    ${Object.entries(userCart).map(([productId, quantity]) => {
        const product = products.find(p => p.id === productId);
        return `<div class="summary-item"><span>${quantity}x ${product.name}</span> <span>$${(product.price * quantity).toFixed(2)}</span></div>`;
    }).join('')}
                </div>
                <div class="summary-calculation">
                    <div class="summary-item"><span>Subtotal</span> <span id="summary-subtotal">$${subtotal.toFixed(2)}</span></div>
                    <div class="summary-item"><span>Tax</span> <span id="summary-tax">$${tax.toFixed(2)}</span></div>
                    <div class="summary-total"><span>Total</span> <span id="summary-total">$${total.toFixed(2)}</span></div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('checkout-form').addEventListener('submit', handlePlaceOrder);
}

async function handlePlaceOrder(e) {
    e.preventDefault();
    const placeOrderBtn = document.getElementById('place-order-btn');
    const messageEl = document.getElementById('checkout-message');
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = 'Processing...';

    const orderDetails = {
        userId: currentUser.uid,
        items: userCart,
        orderDate: serverTimestamp(),
        status: 'Processing',
        shippingInfo: {
            name: document.getElementById('name').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            zip: document.getElementById('zip').value,
        }
    };

    try {
        // New Feature: Use a transaction to ensure atomicity
        await runTransaction(db, async (transaction) => {
            // 1. Create a new order document
            const newOrderRef = doc(db, "orders", `${currentUser.uid}-${Date.now()}`);
            transaction.set(newOrderRef, orderDetails);

            // 2. Update product order counts
            for (const [productId, quantity] of Object.entries(userCart)) {
                const productStatRef = doc(db, "product_stats", productId);
                const statDoc = await transaction.get(productStatRef);
                if (!statDoc.exists()) {
    transaction.set(productStatRef, { orderedCount: quantity });
} else {
    const newCount = statDoc.data().orderedCount + quantity;
    transaction.update(productStatRef, { orderedCount: newCount });
}
            }
            // 3. Clear the user's cart
            const userCartRef = doc(db, 'carts', currentUser.uid);
            transaction.set(userCartRef, { items: {} });
        });

        messageEl.textContent = 'Order placed successfully! Redirecting...';
        messageEl.style.color = 'var(--accent-green)';
        setTimeout(() => window.location.href = './account.html', 3000);

    } catch (error) {
        console.error("Error placing order:", error);
        messageEl.textContent = 'There was an error placing your order. Please try again.';
        messageEl.style.color = 'var(--accent-red)';
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = 'Place Order';
    }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userCartRef = doc(db, 'carts', user.uid);
        const docSnap = await getDoc(userCartRef);
        userCart = docSnap.exists() ? docSnap.data().items : {};
        renderCheckoutPage();
    } else {
        window.location.replace('/sign in beta.html');
    }
});