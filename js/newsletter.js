import { db } from './auth.js';
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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
                await setDoc(doc(db, "newsletterSubscribers", email), {
                    email: email,
                    subscribedAt: serverTimestamp()
                });

                messageEl.textContent = "You've successfully subscribed to the newsletter!";
                messageEl.className = 'newsletter-message success';
                emailInput.value = '';

                setTimeout(() => {
                    messageEl.style.display = 'none';
                }, 5000);
            } catch (error) {
                console.error("Manager Troubleshooting: Newsletter subscription error:", error);
                alert("There was an error subscribing. Please try again later.");
            }
        }
    });
});