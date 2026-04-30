import { db } from './auth.js';
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

document.querySelectorAll('.signup-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = form.querySelector('input[type="email"]');
        const email = emailInput.value.trim();

        let messageEl = form.nextElementSibling;
        if (!messageEl || !messageEl.classList.contains('newsletter-message')) {
            messageEl = document.createElement('div');
            messageEl.className = 'newsletter-message';
            messageEl.style.marginTop = '10px';
            messageEl.style.fontSize = '0.9rem';
            messageEl.style.display = 'none';
            form.parentNode.insertBefore(messageEl, form.nextSibling);
        }

        if (email) {
            try {
                await setDoc(doc(db, "newsletterSubscribers", email), {
                    email: email,
                    subscribedAt: serverTimestamp()
                });

                // Show a success message
                messageEl.textContent = "You've successfully subscribed to the newsletter!";
                messageEl.style.color = '#16A34A'; // Green color for success
                messageEl.style.display = 'block';
                emailInput.value = ''; // Clear the input

                // Hide the message after a few seconds
                setTimeout(() => {
                    messageEl.style.display = 'none';
                }, 5000);
            } catch (error) {
                console.error("Error subscribing to newsletter:", error);
                messageEl.textContent = "There was an error subscribing. Please try again later.";
                messageEl.style.color = '#DC2626'; // Red color for error
                messageEl.style.display = 'block';
            }
        }
    });
});