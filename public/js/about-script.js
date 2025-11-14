document.addEventListener('DOMContentLoaded', () => {
  const popup = document.getElementById('team-popup');
  const closeBtn = popup?.querySelector('.close-btn');
  const titleEl = document.getElementById('popup-team-title');
  const roleEl = document.getElementById('popup-team-role');
  const avatarEl = document.getElementById('team-avatar');
  const descEl = document.getElementById('team-description');

  if (!popup || !closeBtn || !titleEl || !descEl) return;

  const teamData = {
    1: {
      title: 'MaxUltimat3',
      role: 'Lead Developer',
      image: '/images/team1.jpg',
      description:
        "Max is a full-stack developer passionate about crafting scalable and efficient applications, ensuring robust functionality and optimal performance across all our projects.",
    },
    2: {
      title: 'Shinigvmi',
      role: 'UI/UX Designer',
      image: '/images/team2.jpg',
      description:
        'Andy specializes in designing user-friendly and intuitive interfaces, enhancing user experience and ensuring seamless interactions with our applications.',
    },
    3: {
      title: 'AlexV',
      role: 'Backend Specialist',
      image: '/images/team3.jpg',
      description:
        'Alex focuses on server-side logic, database architecture, and API development, ensuring our applications are powerful and scalable from the ground up.',
    },
    4: {
      title: 'CyberG',
      role: 'Security Analyst',
      image: '/images/team4.jpg',
      description:
        'As our security expert, CyberG is responsible for application security, conducting vulnerability assessments, and implementing robust defense mechanisms.',
    },
    5: {
      title: 'DataWiz',
      role: 'Data Scientist',
      image: '/images/team5.jpg',
      description:
        'DataWiz transforms complex datasets into actionable insights, driving our data-informed decisions and powering features with machine learning.',
    },
    6: {
      title: 'PixelPioneer',
      role: 'Frontend Developer',
      image: '/images/team6.jpg',
      description:
        'PixelPioneer specializes in translating UI/UX designs into seamless, responsive, and interactive web experiences using the latest frontend technologies.',
    },
  };

  function openPopup(memberId) {
    const info = teamData[memberId];
    if (info) {
      titleEl.textContent = info.title;
      roleEl.textContent = info.role || '';
      descEl.textContent = info.description;
      if (avatarEl && info.image) {
        avatarEl.src = info.image;
        avatarEl.alt = info.title;
        avatarEl.decoding = 'async';
        avatarEl.loading = 'eager';
      }
    } else {
      titleEl.textContent = 'Team Member';
      roleEl.textContent = '';
      descEl.textContent = 'Details are not available for this member yet.';
    }
    popup.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  function closePopup() {
    popup.classList.remove('visible');
    document.body.style.overflow = '';
  }

  // Event delegation for better performance
  document.addEventListener('click', (e) => {
    const teamBtn = e.target.closest('.team-card .btn[data-team]');
    if (teamBtn) {
      e.preventDefault();
      const id = teamBtn.getAttribute('data-team');
      openPopup(id);
    }
  });

  closeBtn.addEventListener('click', closePopup);
  popup.addEventListener('click', (e) => {
    if (e.target === popup) closePopup();
  });

  // Keyboard support
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popup.classList.contains('visible')) {
      closePopup();
    }
  });
});
