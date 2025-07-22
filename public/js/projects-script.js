// This script handles the pop-up functionality on the projects page.
// It should only be included on projects.ejs.

document.addEventListener('DOMContentLoaded', () => {
    // --- Pop-up functionality & Scroll Lock ---
    const projectDetailButtons = document.querySelectorAll('.project-buttons .btn[data-project]');
    const popup = document.getElementById('project-popup');
    const closeBtn = popup?.querySelector('.close-btn');
    const projectDescriptionElem = document.getElementById('project-description');
    const projectTitleElem = popup?.querySelector('#popup-project-title');

    // Check if all necessary popup elements exist before proceeding
    if (!popup || !closeBtn || !projectDescriptionElem || !projectTitleElem) {
        console.error("Popup elements not found. Pop-up functionality will be disabled.");
        return;
    }

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
        6: { 
            title: "BoosterX System Optimizer", 
            description: "BoosterX is a cutting-edge system optimization utility engineered to unlock your computer's full potential. It intelligently manages system processes, cleans up unnecessary files, and optimizes memory usage to significantly boost performance and responsiveness. Whether you're a gamer seeking higher frame rates, a professional running resource-intensive software, or simply want a faster everyday computing experience, BoosterX provides a comprehensive suite of tools to enhance stability and speed. Its user-friendly interface makes complex optimizations accessible with just a few clicks, ensuring your system runs at peak efficiency." 
        },
    };

    function openProjectPopup(projectId) {
        const projectInfo = projectData[projectId];
        if (projectInfo) {
            projectTitleElem.textContent = projectInfo.title;
            projectDescriptionElem.textContent = projectInfo.description;
        } else {
            projectTitleElem.textContent = "Details Unavailable";
            projectDescriptionElem.textContent = "Details for this project are not available yet or the project ID is incorrect.";
        }
        popup.classList.add('visible');
        document.body.style.overflow = 'hidden'; // Lock page scroll
    }

    function closeProjectPopup() {
        popup.classList.remove('visible');
        document.body.style.overflow = ''; // Restore page scroll
    }

    projectDetailButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const projectId = button.getAttribute('data-project');
            openProjectPopup(projectId);
        });
    });

    closeBtn.addEventListener('click', closeProjectPopup);
    popup.addEventListener('click', (event) => {
        if (event.target === popup) { // Close only if clicking on the background
            closeProjectPopup();
        }
    });
});