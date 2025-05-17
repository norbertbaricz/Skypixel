document.addEventListener('DOMContentLoaded', () => {
    const loaderWrapper = document.getElementById('loader-wrapper');
    const mainContent = document.getElementById('main-content');
    const loadingTextElement = document.getElementById('loading-text-animation');
    let startTime = Date.now();

    // --- Typing Animation Logic ---
    const textToAnimate = "Skypixel";
    let currentCharIndex = 0;
    let isErasingText = false;
    let typingTimeoutId;
    let continueTypingAnimation = true;
    const typingSpeedMs = 150;
    const erasingSpeedMs = 90;
    const pauseAfterTypingMs = 2000;
    const pauseAfterErasingMs = 500;

    function animateLoadingText() {
        if (!continueTypingAnimation || !loadingTextElement) {
            if (typingTimeoutId) clearTimeout(typingTimeoutId);
            if (loadingTextElement) loadingTextElement.textContent = "";
            return;
        }
        if (isErasingText) {
            if (loadingTextElement.textContent.length > 0) {
                loadingTextElement.textContent = textToAnimate.substring(0, loadingTextElement.textContent.length - 1);
                typingTimeoutId = setTimeout(animateLoadingText, erasingSpeedMs);
            } else {
                isErasingText = false;
                currentCharIndex = 0;
                typingTimeoutId = setTimeout(animateLoadingText, pauseAfterErasingMs);
            }
        } else {
            if (currentCharIndex < textToAnimate.length) {
                loadingTextElement.textContent += textToAnimate.charAt(currentCharIndex);
                currentCharIndex++;
                typingTimeoutId = setTimeout(animateLoadingText, typingSpeedMs);
            } else {
                isErasingText = true;
                typingTimeoutId = setTimeout(animateLoadingText, pauseAfterTypingMs);
            }
        }
    }
    // --- End Typing Animation Logic ---

    function showWebsiteContent() {
        continueTypingAnimation = false;
        if (typingTimeoutId) clearTimeout(typingTimeoutId);

        if (loadingTextElement) {
            // Textul loader-ului dispare rapid
            loadingTextElement.style.transition = 'opacity 0.2s ease-out'; // Scurtă tranziție
            loadingTextElement.style.opacity = '0';
        }

        // După ce textul loader-ului a început să dispară (delay de 200ms)
        setTimeout(() => {
            if (loaderWrapper) {
                loaderWrapper.classList.add('hidden'); // Începe animația de dispariție a wrapper-ului (0.8s)
                
                // Afișează conținutul principal IMEDIAT DUPĂ ce animația wrapper-ului loader-ului S-A TERMINAT
                setTimeout(() => {
                    if (mainContent) {
                        mainContent.classList.add('loaded'); // Conținutul apare instantaneu (fără tranziție CSS pe el)
                    }
                    if (loaderWrapper) { // Elimină loader-ul din DOM
                        loaderWrapper.remove();
                    }
                }, 800); // Acest timp trebuie să corespundă cu durata tranziției #loader-wrapper
            } else {
                 // Fallback în caz că loaderWrapper nu există, afișează conținutul direct
                if (mainContent) {
                    mainContent.classList.add('loaded');
                }
            }
        }, 200); // Delay pentru dispariția textului loader-ului
    }

    window.onload = () => {
        const timeElapsed = Date.now() - startTime;
        const minimumDisplayTime = 3000;
        const delayForShowContent = Math.max(0, minimumDisplayTime - timeElapsed);
        setTimeout(showWebsiteContent, delayForShowContent);
    };

    if (loadingTextElement) {
        animateLoadingText();
    }

    // --- Pop-up functionality & Scroll Lock ---
    const projectDetailButtons = document.querySelectorAll('.project-buttons .btn[data-project]');
    const popup = document.getElementById('project-popup');
    const closeBtn = popup.querySelector('.close-btn');
    const projectDescriptionElem = document.getElementById('project-description');
    const projectTitleElem = popup.querySelector('#popup-project-title');

    const projectData = {
        1: { 
            title: "Puro Discord Bot", 
            description: "Puro is a comprehensive and feature-rich Discord bot meticulously designed to elevate your server management capabilities and significantly enhance user engagement. It comes equipped with a robust suite of moderation tools to help you maintain a safe and welcoming community, including features like auto-moderation, user warnings, and activity logging. Beyond moderation, Puro offers a wide array of fun and interactive commands, integrated music playback from various sources with quality streaming, and highly customizable settings, allowing you to tailor the bot's behavior and appearance to perfectly align with your server's unique identity and needs. Whether you run a small community or a large, bustling server, Puro provides the tools you need for seamless administration and a more vibrant user experience." 
        },
        2: { 
            title: "DakotaAC Anticheat", 
            description: "DakotaAC stands as a powerful and sophisticated anti-cheat solution specifically engineered for Minecraft servers. It employs advanced, multi-layered detection methods and behavioral analysis to proactively identify and prevent a wide spectrum of hacking attempts and unfair advantages, ensuring a level playing field for all users. DakotaAC is under continuous development, with its detection algorithms regularly updated to counter the latest emerging cheats and exploits. Its goal is to provide server administrators with a reliable tool to maintain game integrity, protect legitimate players, and foster a secure and enjoyable gaming environment free from disruptive elements." 
        },
        3: { 
            title: "Server Launcher (Windows Application)", 
            description: "The Server Launcher is an intuitive and user-friendly Windows application crafted to dramatically simplify the process of managing your home-hosted Minecraft servers. It offers a centralized dashboard for easy server configuration, allowing you to adjust game settings, manage plugins, and set server properties without needing to edit complex files manually. With one-click startup and shutdown capabilities, along with real-time server monitoring tools that display performance metrics and player activity, this application empowers even novice server administrators to efficiently run and maintain their Minecraft worlds, making the technical aspects of server hosting accessible to everyone." 
        },
        4: { 
            title: "Skypixel Website (Project Showcase)", 
            description: "This very website, the Skypixel official platform, serves as your central hub for discovering everything about our innovative projects and the passionate team driving them. Explore detailed information about each of our current and upcoming ventures, gain insights into our development philosophy, and learn more about the creative minds at Skypixel. We've designed it to be an engaging and informative experience, reflecting the quality and creativity we pour into all our work. Stay tuned for regular updates, blog posts, and new project announcements right here!" 
        },
        5: { 
            title: "DX (High-Performance Project)", 
            description: "Prepare for DX, an ambitious and groundbreaking project currently under intensive development, poised to redefine standards of speed, efficiency, and security within its designated field. While specific details remain under wraps to maintain a competitive edge and build anticipation, DX is being engineered with cutting-edge technology and a forward-thinking approach to deliver an unparalleled user experience. We are incredibly excited about its potential and are working diligently to bring you a product that is not only innovative but also robust and impactful. Keep an eye out for upcoming announcements as we get closer to unveiling what DX has to offer!" 
        },
    };

    if (projectDetailButtons.length > 0 && popup) {
        projectDetailButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault(); // Previne comportamentul default al href="#" (care include scroll-ul)
                const projectId = button.getAttribute('data-project');
                const projectInfo = projectData[projectId];

                if (projectInfo && projectTitleElem && projectDescriptionElem) {
                    projectTitleElem.textContent = projectInfo.title;
                    projectDescriptionElem.textContent = projectInfo.description;
                } else if (projectTitleElem && projectDescriptionElem) {
                    projectTitleElem.textContent = "Details Unavailable";
                    projectDescriptionElem.textContent = "Details for this project are not available yet or the project ID is incorrect.";
                }
                popup.classList.add('visible');
                document.body.style.overflow = 'hidden'; // BLOCHEAZĂ scroll-ul paginii
            });
        });
    }

    function closeProjectPopup() { // Funcție separată pentru închidere și restaurare scroll
        if (popup) {
            popup.classList.remove('visible');
            document.body.style.overflow = ''; // RESTAUREAZĂ scroll-ul paginii
        }
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeProjectPopup);
    }
    if (popup) {
        popup.addEventListener('click', (event) => {
            if (event.target === popup) { // Închide doar dacă se dă click pe fundalul pop-up-ului
                closeProjectPopup();
            }
        });
    }
    // --- End Pop-up ---


    // --- Smooth scrolling for internal anchor links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            // Aplică smooth scroll doar dacă href-ul este un ID valid în pagină (#about, #projects, etc.)
            // și NU este un buton de "Details" pentru pop-up
            if (href.length > 1 && href.startsWith("#") && document.querySelector(href) && !this.hasAttribute('data-project')) {
                e.preventDefault();
                const targetElement = document.querySelector(href);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            } else if (href === "#" && !this.hasAttribute('data-project')) {
                // Pentru link-uri simple href="#" care NU sunt butoane de Details (ex: un link "Back to Top")
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            // Dacă este un buton de "Details" (are data-project), e.preventDefault() este deja apelat
            // în listener-ul specific al său, iar acest handler global nu va mai interveni pentru scroll-to-top.
        });
    });
    // --- End Smooth Scrolling ---

    // --- IntersectionObserver for scroll animations ---
    const animatedElements = document.querySelectorAll('.fade-in-scroll');
    if (typeof IntersectionObserver !== 'undefined') {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        animatedElements.forEach(el => { observer.observe(el); });
    } else {
        animatedElements.forEach(el => { el.classList.add('visible'); });
    }
    // --- End IntersectionObserver ---
});