document.addEventListener('DOMContentLoaded', () => {
    const popup = document.getElementById('project-popup');
    const closeBtn = popup?.querySelector('.close-btn');
    const projectDescriptionElem = document.getElementById('project-description');
    const projectTitleElem = popup?.querySelector('#popup-project-title');
    const projectTagElem = document.getElementById('popup-project-tag');
    const projectImageElem = document.getElementById('project-image');
    const projectLanguageElem = document.getElementById('popup-project-language');
    const projectStarsElem = document.getElementById('popup-project-stars');
    const projectUpdatedElem = document.getElementById('popup-project-updated');

    if (popup && closeBtn && projectDescriptionElem && projectTitleElem) {
        const openProjectPopup = (projectCard) => {
            const title = projectCard?.dataset?.title || 'Project Details';
            const description = projectCard?.dataset?.description || 'Details for this project are not available yet.';
            const tag = projectCard?.dataset?.tag || '';
            const image = projectCard?.dataset?.image || '';
            const language = projectCard?.dataset?.language || '';
            const stars = projectCard?.dataset?.stars || '';
            const updated = projectCard?.dataset?.updated || '';

            projectTitleElem.textContent = title;
            projectDescriptionElem.textContent = description;
            if (projectTagElem) projectTagElem.textContent = tag;
            if (projectImageElem && image) {
                projectImageElem.src = image;
                projectImageElem.alt = title;
                projectImageElem.decoding = 'async';
                projectImageElem.loading = 'eager';
            }
            if (projectLanguageElem) {
                projectLanguageElem.textContent = language ? `Language: ${language}` : '';
            }
            if (projectStarsElem) {
                projectStarsElem.textContent = stars ? `Stars: ${stars}` : '';
            }
            if (projectUpdatedElem) {
                const date = updated ? new Date(updated).toLocaleDateString() : '';
                projectUpdatedElem.textContent = date ? `Updated: ${date}` : '';
            }
            popup.classList.add('visible');
            document.body.style.overflow = 'hidden';
        };

        const closeProjectPopup = () => {
            popup.classList.remove('visible');
            document.body.style.overflow = '';
        };

        // Use event delegation for better performance
        document.addEventListener('click', (event) => {
            const button = event.target.closest('.project-buttons .btn[data-project]');
            if (button) {
                event.preventDefault();
                const projectCard = button.closest('.project-card');
                openProjectPopup(projectCard);
            }
        });

        closeBtn.addEventListener('click', closeProjectPopup);
        popup.addEventListener('click', (event) => {
            if (event.target === popup) {
                closeProjectPopup();
            }
        });
        
        // Close popup on Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && popup.classList.contains('visible')) {
                closeProjectPopup();
            }
        });
    } else if (document.querySelector('.project-buttons .btn[data-project]')) {
        console.warn("Project detail popup elements not found. Pop-up functionality will be disabled.");
    }

});
