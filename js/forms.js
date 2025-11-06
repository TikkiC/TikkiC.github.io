const authState = {
    user: null,
    staff: null
};

function updateRequestAccessState() {
    const hint = document.getElementById('request-auth-hint');
    const submitBtn = document.getElementById('submit-request-btn');
    if (!hint || !submitBtn) {
        return;
    }

    if (authState.user) {
        const userName = authState.user.name || 'пользователь';
        hint.textContent = `Вы авторизованы (${userName}). Можно отправить обращение.`;
        hint.classList.add('request-auth-hint--allowed');
        submitBtn.disabled = false;
    } else {
        hint.textContent = 'Отправка обращения доступна только авторизованным пользователям.';
        hint.classList.remove('request-auth-hint--allowed');
        submitBtn.disabled = true;
    }
}

function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (authState.user) {
        const shortName = authState.user.name ? authState.user.name.split(' ')[0] : 'профиль';
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (logoutBtn) {
            logoutBtn.style.display = 'inline-block';
            logoutBtn.textContent = `Выход (${shortName})`;
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (registerBtn) registerBtn.style.display = 'inline-block';
        if (logoutBtn) {
            logoutBtn.style.display = 'none';
            logoutBtn.textContent = 'Выход';
        }
    }

    if (typeof renderNotificationsFromPseudoDb === 'function') {
        renderNotificationsFromPseudoDb();
    }

    updateRequestAccessState();
}

function setAuthenticatedUser(user) {
    authState.user = user;
    updateAuthUI();
}

function clearAuthenticatedUser() {
    authState.user = null;
    updateAuthUI();
}

function handleLogoutClick(event) {
    event.preventDefault();
    const confirmed = window.confirm('Вы действительно хотите выйти из аккаунта?');
    if (!confirmed) {
        return;
    }

    clearAuthenticatedUser();
    if (typeof renderDoctorSchedule === 'function') {
        renderDoctorSchedule();
    }
    addNotification('Выход из системы', 'Вы успешно вышли из аккаунта.');
    alert('Вы вышли из аккаунта.');
}

document.addEventListener('DOMContentLoaded', function() {
    const requestForm = document.getElementById('request-form');
    if (requestForm) {
        requestForm.addEventListener('submit', handleRequestFormSubmit);
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginFormSubmit);
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterFormSubmit);
    }

    const staffLoginForm = document.getElementById('staff-login-form');
    if (staffLoginForm) {
        staffLoginForm.addEventListener('submit', handleStaffLoginFormSubmit);
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogoutClick);
    }

    updateAuthUI();
});

function toggleChronicDiseases() {
    const chronicCheckbox = document.getElementById('has-chronic-diseases');
    const chronicCategories = document.getElementById('chronic-categories');
    if (!chronicCheckbox || !chronicCategories) {
        return;
    }
    
    if (chronicCheckbox.checked) {
        chronicCategories.classList.add('active');
    } else {
        chronicCategories.classList.remove('active');
        document.querySelectorAll('#chronic-categories input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
    }
    updateRecommendations();
}

function handleRequestFormSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;

    if (!authState.user) {
        alert('Чтобы отправить обращение, выполните вход или зарегистрируйтесь.');
        if (typeof openModal === 'function') {
            openModal('login-modal');
        }
        return;
    }

    const birthdateInput = form.querySelector('#patient-birthdate');
    const birthdate = birthdateInput ? birthdateInput.value : '';
    if (!isValidDate(birthdate)) {
        alert('Пожалуйста, введите дату в формате дд.мм.гггг');
        return;
    }

    const age = calculateAge(birthdate);

    const symptoms = [];
    form.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
        if (checkbox.id.startsWith('symptom')) {
            symptoms.push(checkbox.value);
        }
    });

    const chronicDiseases = [];
    const chronicToggle = form.querySelector('#has-chronic-diseases');
    if (chronicToggle && chronicToggle.checked) {
        form.querySelectorAll('#chronic-categories input[type="checkbox"]:checked').forEach(checkbox => {
            chronicDiseases.push(checkbox.value);
        });
    }

    const locationSelect = form.querySelector('#location-select');
    const location = locationSelect ? locationSelect.value : '';
    const scheduleSection = document.getElementById('doctor-schedule-section');
    const selectedSlotTime = form.dataset.selectedSlotTime || '';
    const selectedSlotDate = form.dataset.selectedSlotDate || '';
    const selectedSlotLabel = form.dataset.selectedSlotLabel || '';

    const urgency = determineUrgency(symptoms, chronicDiseases, age);
    const serviceType = determineServiceType(symptoms, chronicDiseases, location, age);
    let recommendedDoctor = null;

    if (form.dataset.selectedDoctor && window.PseudoDB?.data) {
        recommendedDoctor = PseudoDB.getDoctorById(form.dataset.selectedDoctor) || null;
    }

    if (!recommendedDoctor) {
        recommendedDoctor = determineDoctor(symptoms, chronicDiseases);
    }

    const hasVisibleSchedule = Boolean(scheduleSection && !scheduleSection.hidden && scheduleSection.querySelector('.schedule-slot.free'));
    if (hasVisibleSchedule && !selectedSlotTime) {
        alert('Пожалуйста, выберите удобное время приема из расписания.');
        return;
    }

    const appointmentDetails = selectedSlotTime && selectedSlotLabel
        ? `${selectedSlotTime} · ${selectedSlotLabel}`
        : 'будет согласовано дополнительно';
    
    alert(`Ваше обращение успешно отправлено!\n\nВозраст: ${age} лет\nУровень срочности: ${urgency}\nТип обслуживания: ${serviceType}\nРекомендуемый врач: ${recommendedDoctor ? recommendedDoctor.name : 'будет определен'}\nВремя приема: ${appointmentDetails}\n\nМы свяжемся с вами в ближайшее время для подтверждения записи.`);
    addNotification(
        `Обращение #${Math.floor(1000 + Math.random() * 9000)} отправлено`,
        `Ваше обращение принято в обработку. Уровень срочности: ${urgency}. Тип обслуживания: ${serviceType}. Время приема: ${appointmentDetails}.`
    );
    
    form.reset();
    if (typeof clearSelectedScheduleData === 'function') {
        clearSelectedScheduleData();
    }
    renderDoctorSchedule();
    delete form.dataset.selectedDoctor;
    delete form.dataset.selectedSlotTime;
    delete form.dataset.selectedSlotDate;
    delete form.dataset.selectedSlotLabel;

    const doctorRecommendationBlock = document.getElementById('doctor-recommendation');
    if (doctorRecommendationBlock) {
        doctorRecommendationBlock.classList.remove('active');
    }
    const recommendedDoctorContainer = document.getElementById('recommended-doctor');
    if (recommendedDoctorContainer) {
        recommendedDoctorContainer.innerHTML = '';
    }
    const serviceRecommendationBlock = document.getElementById('service-recommendation');
    if (serviceRecommendationBlock) {
        serviceRecommendationBlock.classList.remove('active');
    }
    const chronicCategoriesBlock = form.querySelector('#chronic-categories');
    if (chronicCategoriesBlock) {
        chronicCategoriesBlock.classList.remove('active');
    }
    const chronicCheckbox = form.querySelector('#has-chronic-diseases');
    if (chronicCheckbox) {
        chronicCheckbox.checked = false;
    }
}

async function handleLoginFormSubmit(e) {
    e.preventDefault();

    try {
        // Авторизация пока обращается к псевдо-БД
        await PseudoDB.load();
    } catch (error) {
        alert('Не удалось подключиться к источнику данных. Попробуйте позже.');
        return;
    }

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const user = PseudoDB.authenticateUser(email, password);
    if (!user) {
        alert('Неверный email или пароль.');
        return;
    }

    setAuthenticatedUser(user);
    addNotification('Вход выполнен', `Рады видеть вас снова, ${user.name}!`);
    alert(`Добро пожаловать, ${user.name}!`);
    closeModal('login-modal');
    e.target.reset();
}

async function handleRegisterFormSubmit(e) {
    e.preventDefault();

    try {
        // Регистрация читает и записывает данные в псевдо-БД
        await PseudoDB.load();
    } catch (error) {
        alert('Не удалось подключиться к источнику данных. Попробуйте позже.');
        return;
    }

    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    if (password !== confirmPassword) {
        alert('Пароли не совпадают!');
        return;
    }
    
    if (!name) {
        alert('Пожалуйста, укажите ФИО.');
        return;
    }

    if (PseudoDB.getUserByEmail(email)) {
        alert('Пользователь с таким email уже зарегистрирован.');
        return;
    }

    const newUser = {
        id: `user-${Date.now()}`,
        name,
        email: email.toLowerCase(),
        password
    };

    PseudoDB.addUser(newUser);
    setAuthenticatedUser(newUser);
    addNotification('Регистрация успешна', `Добро пожаловать, ${newUser.name}!`);
    alert(`Регистрация выполнена успешно! Добро пожаловать, ${newUser.name}!`);
    closeModal('register-modal');
    e.target.reset();
}

async function handleStaffLoginFormSubmit(e) {
    e.preventDefault();

    try {
        // Проверка доступа персонала пока идет через псевдо-БД
        await PseudoDB.load();
    } catch (error) {
        alert('Не удалось подключиться к источнику данных. Попробуйте позже.');
        return;
    }

    const login = document.getElementById('staff-login').value.trim();
    const password = document.getElementById('staff-password').value.trim();
    const role = document.getElementById('staff-role').value;

    const staffMember = (PseudoDB.getStaff() || []).find(member =>
        member.login === login && member.password === password && member.role === role
    );

    if (!staffMember) {
        alert('Неверный логин или пароль.');
        return;
    }

    authState.staff = staffMember;
    if (window.MedPlatformStaffAuth) {
        window.MedPlatformStaffAuth.saveSession(staffMember);
    }
    addNotification('Вход для персонала', `${staffMember.name} (${staffMember.role}) выполнил вход.`);
    alert(`Добро пожаловать, ${staffMember.name}!`);
    closeModal('staff-login-modal');
    e.target.reset();

    if (staffMember.role === 'administrator') {
        window.location.href = 'dashboard/index.html';
    } else if (staffMember.role === 'doctor') {
        window.location.href = 'doctor/index.html';
    }
}