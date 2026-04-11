import { db } from './auth.js';
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

document.querySelectorAll('.signup-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = form.querySelector('input[type="email"]');
        const email = emailInput.value.trim();

        if (email) {
            try {
                await setDoc(doc(db, "newsletterSubscribers", email), {
                    email: email,
                    subscribedAt: serverTimestamp()
                });

                // Show a success message
                alert("You've successfully subscribed to the newsletter!");
                emailInput.value = ''; // Clear the input
            } catch (error) {
                console.error("Error subscribing to newsletter:", error);
                alert("There was an error subscribing. Please try again later.");
            }
        }
    });
});