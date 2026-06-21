
import { logManagerError } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {

    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

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

    const greetingElement = document.getElementById('dynamic-greeting');
    const heroSection = document.querySelector('.hero');

    if (greetingElement && heroSection) {
        let lastGreeting = "";
        let lastShouldPlay = null;

        const manageVideoBackground = (shouldPlay) => {
            if (shouldPlay === lastShouldPlay) return;
            lastShouldPlay = shouldPlay;

            let videoBg = document.getElementById('new-year-video');

            if (shouldPlay) {
                if (!videoBg) {
                    videoBg = document.createElement('video');
                    videoBg.id = 'new-year-video';
                    videoBg.src = '/fireworks-bg.mp4';
                    videoBg.autoplay = true;
                    videoBg.loop = true;
                    videoBg.muted = true;
                    videoBg.playsInline = true;
                    videoBg.classList.add('new-year-video');

                    heroSection.appendChild(videoBg);
                }

                if (videoBg.paused) videoBg.play().catch(e => logManagerError("Error playing video background:", e));

            } else {
                if (videoBg) {
                    videoBg.remove();
                }
            }
        };

        let lastGreeting = ""; // ⚡ Bolt Optimization: Cache state to prevent layout thrashing

        const updateGreeting = () => {
            const now = new Date();
            let newGreeting = "";
            let shouldPlayVideo = false;

            const newYear2026 = new Date('January 1, 2026 00:00:00');
            const endOfCelebration = new Date('January 1, 2026 23:59:59');
            const revertDate = new Date('January 2, 2026 00:00:00');

            let currentGreeting = "";

            if (now >= revertDate) {
                 const currentHour = now.getHours();
                 if (currentHour < 12) {
                     newGreeting = "Good Morning.";
                 } else if (currentHour < 18) {
                     newGreeting = "Good Afternoon.";
                 } else {
                     newGreeting = "Good Evening.";
                     currentGreeting = "Good Morning.";
                 } else if (currentHour < 18) {
                     currentGreeting = "Good Afternoon.";
                 } else {
                     currentGreeting = "Good Evening.";
                 }
                 shouldPlayVideo = false;
            }

            else if (now >= newYear2026 && now <= endOfCelebration) {
                newGreeting = "Happy New Year!";
                shouldPlayVideo = true;
                currentGreeting = "Happy New Year!";
                manageVideoBackground(true);
            }

            else {
                const diff = newYear2026 - now;

                if (diff > 0) {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                    newGreeting = `New Years Countdown: ${days}d ${hours}h ${minutes}m ${seconds}s`;
                    currentGreeting = `New Years Countdown: ${days}d ${hours}h ${minutes}m ${seconds}s`;
                }
                shouldPlayVideo = false;
            }

            // ⚡ Bolt Performance Optimization:
            // Only apply DOM updates when the greeting state actually changes to prevent unnecessary re-renders and layout thrashing,
            // especially when the greeting is static text like "Good Morning".
            if (newGreeting !== lastGreeting) {
                greetingElement.textContent = newGreeting;
                lastGreeting = newGreeting;
            }
            manageVideoBackground(shouldPlayVideo);
        };


        updateGreeting();
        setInterval(updateGreeting, 1000);
    }

    const bentoCards = document.querySelectorAll('.bento-card');
    bentoCards.forEach(card => {
        let ticking = false; // ⚡ Bolt Optimization: State flag for requestAnimationFrame

        card.addEventListener('mousemove', (e) => {
            // ⚡ Bolt Performance Optimization:
            // Throttling the high-frequency mousemove event using requestAnimationFrame.
            // This syncs DOM measurements (getBoundingClientRect) and style updates with the display refresh rate,
            // reducing layout thrashing and jank on lower-end devices.
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;

                    const rotateX = ((y - centerY) / centerY) * -5; // Max 5deg rotation
                    const rotateY = ((x - centerX) / centerX) * 5;  // Max 5deg rotation

                    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
                    ticking = false;
                });
                ticking = true;
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });

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