import { logManagerError } from './utils.js';
import { db } from './auth.js';

document.querySelectorAll('.signup-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = form.querySelector('input[type="email"]');
        const email = emailInput.value.trim();

        let messageEl = form.querySelector('.newsletter-message');
        if (!messageEl) {
            messageEl = document.createElement('p');
            messageEl.className = 'newsletter-message';
            form.appendChild(messageEl);
        }

        if (email) {
            try {
                await db.collection("newsletterSubscribers").doc(email).set({
                    email: email,
                    subscribedAt: window.firebase.firestore.FieldValue.serverTimestamp()
                });

                messageEl.textContent = "You've successfully subscribed to the newsletter!";
                messageEl.className = 'newsletter-message success';
                emailInput.value = '';

                setTimeout(() => {
                    messageEl.style.display = 'none';
                }, 5000);
            } catch (error) {
                logManagerError("Newsletter subscription error for email: " + email, error);

                alert("There was an error subscribing. Please try again later.");
            }
        }
    });
});