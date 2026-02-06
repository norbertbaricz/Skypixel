document.addEventListener('DOMContentLoaded', () => {
    if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    const loaderWrapper = document.getElementById('loader-wrapper');
    const mainContent = document.getElementById('main-content');
    const loadingTextElement = document.getElementById('loading-text-animation');
    const menuToggle = document.querySelector('.menu-toggle');
    const navDropdown = document.getElementById('nav-dropdown');
    const scrollIndicators = document.querySelectorAll('.scroll-indicator');

    const textToAnimate = "Skypixel";
    let continueTypingAnimation = true;
    let typingTimeout = null;

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
                    typingTimeout = setTimeout(type, 90);
                } else {
                    isErasing = false;
                    currentCharIndex = 0;
                    typingTimeout = setTimeout(type, 500);
                }
            } else {
                if (currentCharIndex < textToAnimate.length) {
                    loadingTextElement.textContent += textToAnimate.charAt(currentCharIndex);
                    currentCharIndex++;
                    typingTimeout = setTimeout(type, 150);
                } else {
                    isErasing = true;
                    typingTimeout = setTimeout(type, 2000);
                }
            }
        }
        type();
    }

    function showWebsiteContent() {
        continueTypingAnimation = false;
        if (typingTimeout) clearTimeout(typingTimeout);

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
    if (animatedElements.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { 
            threshold: 0.01, 
            rootMargin: '0px 0px 12% 0px'
        });
        
        animatedElements.forEach((el) => {
            el.style.transitionDelay = '';
            observer.observe(el);
        });
    }

    if (menuToggle && navDropdown) {
        const closeMenu = () => {
            navDropdown.classList.remove('show');
            navDropdown.setAttribute('aria-hidden', 'true');
            menuToggle.setAttribute('aria-expanded', 'false');
        };

        menuToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            const isOpen = navDropdown.classList.contains('show');
            if (isOpen) {
                closeMenu();
            } else {
                navDropdown.classList.add('show');
                navDropdown.setAttribute('aria-hidden', 'false');
                menuToggle.setAttribute('aria-expanded', 'true');
            }
        });

        document.addEventListener('click', (event) => {
            if (!navDropdown.contains(event.target) && !menuToggle.contains(event.target)) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeMenu();
            }
        });
    }

    if (scrollIndicators.length) {
        const toggleIndicator = () => {
            scrollIndicators.forEach((indicator) => {
                if (window.scrollY > 10) {
                    indicator.classList.add('hide');
                } else {
                    indicator.classList.remove('hide');
                }
            });
        };
        toggleIndicator();
        window.addEventListener('scroll', toggleIndicator, { passive: true });
    }

    const contactForm = document.querySelector('.contact-form');
    const contactStatusInline = document.getElementById('contact-status-inline');
    if (contactForm && contactStatusInline) {
        let statusTimeout = null;
        contactForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            contactStatusInline.textContent = '';
            contactStatusInline.classList.remove('success', 'error', 'show');
            if (statusTimeout) {
                clearTimeout(statusTimeout);
                statusTimeout = null;
            }

            const formData = new FormData(contactForm);
            const payload = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                if (response.ok && data.ok) {
                    contactStatusInline.textContent = data.message || 'Message sent successfully.';
                    contactStatusInline.classList.add('success', 'show');
                    contactForm.reset();
                } else {
                    contactStatusInline.textContent = data.message || 'Message could not be sent. Please try again later.';
                    contactStatusInline.classList.add('error', 'show');
                }
            } catch {
                contactStatusInline.textContent = 'Message could not be sent. Please try again later.';
                contactStatusInline.classList.add('error', 'show');
            }

            statusTimeout = setTimeout(() => {
                contactStatusInline.classList.remove('show');
            }, 4000);
        });
    }
});
