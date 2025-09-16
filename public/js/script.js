document.addEventListener('DOMContentLoaded', () => {
    if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    const loaderWrapper = document.getElementById('loader-wrapper');
    const mainContent = document.getElementById('main-content');
    const loadingTextElement = document.getElementById('loading-text-animation');

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

    (function setRandomHeroBackground() {
        const heroBg = document.querySelector('.hero .background-blur');
        if (!heroBg) return;

        const seed = Math.floor(Math.random() * 1e9);
        const url = `https://source.unsplash.com/1600x900/?landscape,nature,scenery,mountain,forest&sig=${seed}`;

        const img = new Image();
        img.decoding = 'async';
        img.loading = 'eager';
        img.referrerPolicy = 'no-referrer';
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            heroBg.style.setProperty('--hero-random-bg', `url("${url}")`);
            heroBg.classList.add('random-ready');
        };
        img.onerror = () => {};
        img.src = url;
    })();

    if (loadingTextElement) {
        animateLoadingText();
    }

    setTimeout(showWebsiteContent, 250);

    window.onload = () => {
        showWebsiteContent();
    };

    const animatedElements = document.querySelectorAll('.fade-in-scroll');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.01, rootMargin: '0px 0px 12% 0px' });
    animatedElements.forEach((el) => {
        el.style.transitionDelay = '';
        observer.observe(el);
    });
});
