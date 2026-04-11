// js/script.js
document.addEventListener('DOMContentLoaded', () => {

    // --- Mobile Menu Toggle ---
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // Close menu when a link is clicked
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    // --- Scroll Reveal Animation ---
    const revealElements = document.querySelectorAll('.reveal');
    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    revealElements.forEach(el => {
        scrollObserver.observe(el);
    });

    // --- Parallax for Brand Sections ---
    const brandSections = document.querySelectorAll('.brand-section');
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            } else {
                entry.target.classList.remove('is-visible');
            }
        });
    }, { threshold: 0.2 });

    brandSections.forEach(section => {
        sectionObserver.observe(section);
    });

    // --- Dynamic Greeting & New Year Video Background ---
    const greetingElement = document.getElementById('dynamic-greeting');
    const heroSection = document.querySelector('.hero');

    if (greetingElement && heroSection) {
        
        // Helper function to manage the video element
        const manageVideoBackground = (shouldPlay) => {
            let videoBg = document.getElementById('new-year-video');
            
            if (shouldPlay) {
                if (!videoBg) {
                    videoBg = document.createElement('video');
                    videoBg.id = 'new-year-video';
                    videoBg.src = '/fireworks-bg.mp4'; // Points to root based on your path
                    videoBg.autoplay = true;
                    videoBg.loop = true;
                    videoBg.muted = true; // Required for autoplay
                    videoBg.playsInline = true;
                    videoBg.classList.add('new-year-video');
                    
                    // Prepend to ensure it sits behind content but follows z-index rules
                    heroSection.appendChild(videoBg);
                }
                // Ensure it's playing
                if (videoBg.paused) videoBg.play().catch(e => console.log("Autoplay blocked:", e));
                
            } else {
                if (videoBg) {
                    videoBg.remove();
                }
            }
        };

        const updateGreeting = () => {
            const now = new Date();
            
            // Define key dates for the event
            const newYear2026 = new Date('January 1, 2026 00:00:00');
            const endOfCelebration = new Date('January 1, 2026 23:59:59');
            const revertDate = new Date('January 2, 2026 00:00:00');

            // STATE 1: Revert to normal after Jan 1st, 2026 (Jan 2nd onwards)
            if (now >= revertDate) {
                 const currentHour = now.getHours();
                 if (currentHour < 12) {
                     greetingElement.textContent = "Good Morning.";
                 } else if (currentHour < 18) {
                     greetingElement.textContent = "Good Afternoon.";
                 } else {
                     greetingElement.textContent = "Good Evening.";
                 }
                 manageVideoBackground(false);
            } 
            // STATE 2: New Year's Day Celebration (Jan 1st, 2026)
            else if (now >= newYear2026 && now <= endOfCelebration) {
                greetingElement.textContent = "Happy New Year!";
                manageVideoBackground(true);
            } 
            // STATE 3: Countdown to 2026 (Right Now)
            else {
                const diff = newYear2026 - now;
                
                if (diff > 0) {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    
                    greetingElement.textContent = `New Years Countdown: ${days}d ${hours}h ${minutes}m ${seconds}s`;
                }
                manageVideoBackground(false);
            }
        };

        // Initialize immediately and update every second
        updateGreeting();
        setInterval(updateGreeting, 1000);
    }

    // --- Bento Card 3D Tilt Effect ---
    const bentoCards = document.querySelectorAll('.bento-card');
    bentoCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -5; // Max 5deg rotation
            const rotateY = ((x - centerX) / centerX) * 5;  // Max 5deg rotation

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });

    // --- Cookie Consent Banner ---
    const cookieConsentBanner = document.getElementById('cookie-consent-banner');
    const cookieConsentButton = document.getElementById('cookie-consent-button');

    if (cookieConsentBanner && cookieConsentButton) {
        if (!localStorage.getItem('cookieConsent')) {
            cookieConsentBanner.style.display = 'block';
        }

        cookieConsentButton.addEventListener('click', () => {
            localStorage.setItem('cookieConsent', 'true');
            cookieConsentBanner.style.display = 'none';
        });
    }

});