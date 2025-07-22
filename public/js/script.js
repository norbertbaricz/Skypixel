// This script handles global functionalities like the loader and scroll restoration.
// It should be included on all pages.

document.addEventListener('DOMContentLoaded', () => {
    // --- Fix for page reload scroll position ---
    if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    // --- Element References ---
    const loaderWrapper = document.getElementById('loader-wrapper');
    const mainContent = document.getElementById('main-content');
    const loadingTextElement = document.getElementById('loading-text-animation');
    
    // --- Typing Animation Logic (Restored) ---
    const textToAnimate = "Skypixel";
    let continueTypingAnimation = true;
    
    function animateLoadingText() {
        if (!continueTypingAnimation || !loadingTextElement) return;

        let currentCharIndex = 0;
        let isErasing = false;
        
        function type() {
            if (!continueTypingAnimation) {
                 if (loadingTextElement) loadingTextElement.textContent = textToAnimate;
                 return;
            }

            if (isErasing) {
                if (loadingTextElement.textContent.length > 0) {
                    loadingTextElement.textContent = textToAnimate.substring(0, loadingTextElement.textContent.length - 1);
                    setTimeout(type, 90);
                } else {
                    isErasing = false;
                    currentCharIndex = 0;
                    setTimeout(type, 500);
                }
            } else {
                if (currentCharIndex < textToAnimate.length) {
                    loadingTextElement.textContent += textToAnimate.charAt(currentCharIndex);
                    currentCharIndex++;
                    setTimeout(type, 150);
                } else {
                    isErasing = true;
                    setTimeout(type, 2000);
                }
            }
        }
        type();
    }

    // --- Content Visibility Logic ---
    function showWebsiteContent() {
        continueTypingAnimation = false;

        if (loaderWrapper) {
            loaderWrapper.classList.add('hidden');
            loaderWrapper.addEventListener('transitionend', () => {
                if (mainContent) {
                    mainContent.classList.add('loaded');
                }
                loaderWrapper.remove();
            }, { once: true });
        } else {
            if (mainContent) {
                mainContent.classList.add('loaded');
            }
        }
    }

    // --- Initialization ---
    if (loadingTextElement) {
        animateLoadingText();
    }

    window.onload = () => {
        showWebsiteContent();
    };

    // --- IntersectionObserver for scroll animations ---
    const animatedElements = document.querySelectorAll('.fade-in-scroll');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    animatedElements.forEach(el => observer.observe(el));
});
