(() => {
  const enterButton = document.getElementById('enterSoulSchool');
  const modal = document.getElementById('passwordModal');
  const closeModal = document.getElementById('closeModal');
  const passwordForm = document.getElementById('passwordForm');
  const soulPassword = document.getElementById('soulPassword');
  const passwordError = document.getElementById('passwordError');

  const openModal = () => {
    if (!modal) {
      return;
    }
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    if (soulPassword) {
      soulPassword.value = '';
      soulPassword.focus();
    }
    if (passwordError) {
      passwordError.textContent = '';
    }
  };

  const hideModal = () => {
    if (!modal) {
      return;
    }
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    if (passwordError) {
      passwordError.textContent = '';
    }
  };

  if (enterButton) {
    enterButton.addEventListener('click', openModal);
  }

  if (closeModal) {
    closeModal.addEventListener('click', hideModal);
  }

  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        hideModal();
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && modal.classList.contains('open')) {
      hideModal();
    }
  });

  if (passwordForm) {
    passwordForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!soulPassword || !passwordError) {
        return;
      }

      const password = soulPassword.value.trim();
      if (password === 'soulschool') {
        window.location.href = '../pages/soul-school-portal.html';
        return;
      }

      passwordError.textContent = 'Incorrect password. Please try again.';
    });
  }

  const memberLoginForm = document.getElementById('memberLoginForm');
  const memberPassword = document.getElementById('memberPassword');
  const memberError = document.getElementById('memberError');

  if (memberLoginForm && memberPassword && memberError) {
    memberLoginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const loginPassword = memberPassword.value.trim();

      if (loginPassword === 'welcomehome') {
        window.location.href = '../pages/soul-school-portal.html';
        return;
      }

      memberError.textContent = 'Invalid personal password.';
    });
  }
})();
