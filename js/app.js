document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Грузим данные из псевдо-БД до интеграции с внешним API
        await PseudoDB.load();
        renderDoctorsFromPseudoDb();
        renderDoctorSchedule();
        populateDepartmentsFromPseudoDb();
        renderNotificationsFromPseudoDb();
    } catch (error) {
        console.error('Не удалось загрузить данные псевдо-БД', error);
    }

    initApp();
});

function initApp() {
}

function renderDoctorsFromPseudoDb() {
    const grid = document.getElementById('doctors-grid');
    if (!grid) {
        return;
    }

    const doctors = (PseudoDB.getDoctors() || []);
    grid.innerHTML = '';

    doctors.forEach(doctor => {
        const card = document.createElement('div');
        card.className = 'doctor-card';
        card.dataset.doctorId = doctor.id;
        card.innerHTML = `
            <div class="doctor-photo">${doctor.icon || '👩‍⚕️'}</div>
            <div class="doctor-info">
                <h3>${doctor.name}</h3>
                <div class="doctor-specialty">${doctor.specialty}</div>
                <div class="doctor-department">${doctor.department}</div>
            </div>
        `;
        card.addEventListener('click', () => openDoctorModal(doctor.id));
        grid.appendChild(card);
    });
}

let currentScheduleDoctorId = null;

function clearSelectedScheduleData() {
    const form = document.getElementById('request-form');
    if (!form) {
        return;
    }
    delete form.dataset.selectedSlotTime;
    delete form.dataset.selectedSlotDate;
    delete form.dataset.selectedSlotLabel;
}

function handleScheduleSlotClick(event) {
    const slot = event.currentTarget;
    if (!slot || slot.disabled || slot.classList.contains('busy') || slot.classList.contains('dayoff')) {
        return;
    }

    const grid = document.getElementById('schedule-grid');
    if (!grid) {
        return;
    }

    grid.querySelectorAll('.schedule-slot.selected').forEach(selectedSlot => {
        selectedSlot.classList.remove('selected');
        selectedSlot.setAttribute('aria-pressed', 'false');
    });

    slot.classList.add('selected');
    slot.setAttribute('aria-pressed', 'true');

    const form = document.getElementById('request-form');
    if (form) {
        form.dataset.selectedSlotTime = slot.dataset.time || '';
        form.dataset.selectedSlotDate = slot.dataset.date || '';
        form.dataset.selectedSlotLabel = slot.dataset.label || '';
    }
}

function renderDoctorSchedule(doctorId) {
    const section = document.getElementById('doctor-schedule-section');
    const grid = document.getElementById('schedule-grid');
    const titleEl = document.getElementById('schedule-title');
    const subtitleEl = document.getElementById('schedule-subtitle');
    const rangeElement = document.getElementById('schedule-range');
    const form = document.getElementById('request-form');

    if (!section || !grid) {
        return;
    }

    if (!window.PseudoDB?.data) {
        grid.innerHTML = '';
        if (rangeElement) {
            rangeElement.textContent = '';
        }
        if (titleEl) {
            titleEl.textContent = 'Доступные слоты';
        }
        if (subtitleEl) {
            subtitleEl.textContent = 'Расписание загрузится после подключения к базе данных';
        }
        section.hidden = true;
        currentScheduleDoctorId = null;
        clearSelectedScheduleData();
        return;
    }

    const defaults = PseudoDB.getScheduleDefaults() || { slots: [] };
    const slots = defaults.slots || [];

    if (!doctorId) {
        grid.innerHTML = '';
        if (rangeElement) {
            rangeElement.textContent = '';
        }
        if (titleEl) {
            titleEl.textContent = 'Доступные слоты';
        }
        if (subtitleEl) {
            subtitleEl.textContent = 'Выберите врача, чтобы увидеть расписание';
        }
        section.hidden = true;
        currentScheduleDoctorId = null;
        clearSelectedScheduleData();
        return;
    }

    if (doctorId !== currentScheduleDoctorId) {
        currentScheduleDoctorId = doctorId;
        clearSelectedScheduleData();
    }

    const doctor = PseudoDB.getDoctorById(doctorId);
    const schedule = PseudoDB.getDoctorSchedule(doctorId) || [];

    if (!doctor) {
        grid.innerHTML = '<p style="padding:20px;">Не удалось найти выбранного врача. Попробуйте обновить страницу или выбрать другого специалиста.</p>';
        if (titleEl) {
            titleEl.textContent = 'Доступные слоты';
        }
        if (subtitleEl) {
            subtitleEl.textContent = 'Выберите врача, чтобы увидеть актуальное расписание';
        }
        if (rangeElement) {
            rangeElement.textContent = '';
        }
        section.hidden = false;
        return;
    }

    if (titleEl && doctor) {
        titleEl.textContent = `Расписание врача ${doctor.name}`;
    }
    if (subtitleEl && doctor) {
        subtitleEl.textContent = doctor.specialty ? `${doctor.specialty} · ${doctor.department || 'Отделение уточняется'}` : 'Выберите удобное время приема';
    }

    if (!schedule.length) {
        grid.innerHTML = '<p style="padding:20px;">Для выбранного врача расписание появится позже.</p>';
        if (rangeElement) {
            rangeElement.textContent = '';
        }
        section.hidden = false;
        clearSelectedScheduleData();
        return;
    }

    if (rangeElement) {
        const firstDate = new Date(schedule[0].date);
        const lastDate = new Date(schedule[schedule.length - 1].date);
        const formatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
        rangeElement.textContent = `${formatter.format(firstDate)} — ${formatter.format(lastDate)}`;
    }

    grid.innerHTML = '';

    const selectedDate = form?.dataset.selectedSlotDate;
    const selectedTime = form?.dataset.selectedSlotTime;

    schedule.forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.className = 'schedule-day';

        const header = document.createElement('div');
        header.className = 'schedule-day__header';
        header.innerHTML = `<span>${day.label}</span>${day.isDayOff ? '<span class="schedule-day__status">выходной</span>' : ''}`;

        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'schedule-day__slots';

        if (day.notes && !day.isDayOff) {
            const note = document.createElement('div');
            note.className = 'schedule-day__note';
            note.textContent = day.notes;
            slotsContainer.appendChild(note);
        }

        if (day.isDayOff) {
            const slot = document.createElement('button');
            slot.type = 'button';
            slot.className = 'schedule-slot dayoff';
            slot.textContent = 'Прием не ведется';
            slot.disabled = true;
            slot.setAttribute('aria-pressed', 'false');
            slotsContainer.appendChild(slot);
        } else {
            const booked = new Set(day.booked || []);
            slots.forEach(time => {
                const slot = document.createElement('button');
                slot.type = 'button';
                const status = booked.has(time) ? 'busy' : 'free';
                slot.className = `schedule-slot ${status}`;
                slot.textContent = time;
                slot.dataset.time = time;
                slot.dataset.date = day.date;
                slot.dataset.label = day.label;

                if (status === 'busy') {
                    slot.disabled = true;
                } else {
                    slot.addEventListener('click', handleScheduleSlotClick);
                }

                if (status === 'free' && selectedDate === day.date && selectedTime === time) {
                    slot.classList.add('selected');
                    slot.setAttribute('aria-pressed', 'true');
                }

                if (!slot.hasAttribute('aria-pressed')) {
                    slot.setAttribute('aria-pressed', 'false');
                }
                slotsContainer.appendChild(slot);
            });
        }

        dayEl.appendChild(header);
        dayEl.appendChild(slotsContainer);
        grid.appendChild(dayEl);
    });

    section.hidden = false;
}

function isNotificationAccessAllowed() {
    if (typeof authState === 'undefined' || !authState) {
        return true;
    }
    return Boolean(authState.user);
}

function addNotification(title, message) {
    if (!isNotificationAccessAllowed()) {
        return;
    }
    const notificationsPanel = document.querySelector('.notifications-panel');
    if (!notificationsPanel) {
        return;
    }
    const notification = document.createElement('div');
    notification.className = 'notification unread';
    notification.innerHTML = `
        <h4>${title}</h4>
        <p>${message}</p>
        <div class="notification-date">${new Date().toLocaleString()}</div>
    `;
    
    const placeholder = notificationsPanel.querySelector('[data-placeholder]');
    if (placeholder) {
        placeholder.remove();
    }
    notificationsPanel.insertBefore(notification, notificationsPanel.firstChild);
}

function renderNotificationsFromPseudoDb() {
    const panel = document.querySelector('.notifications-panel');
    if (!panel) {
        return;
    }

    if (!isNotificationAccessAllowed()) {
        panel.innerHTML = createNotificationsPlaceholder('Войдите в аккаунт, чтобы видеть уведомления.');
        return;
    }

    if (!window.PseudoDB?.data) {
        panel.innerHTML = createNotificationsPlaceholder('Уведомления появятся после подключения данных.');
        return;
    }

    const notifications = PseudoDB.getNotifications() || [];
    if (!notifications.length) {
        panel.innerHTML = createNotificationsPlaceholder('Новых уведомлений пока нет.');
        return;
    }

    panel.innerHTML = '';
    notifications.forEach(notification => {
        const item = document.createElement('div');
        const status = notification.status === 'unread' ? 'notification unread' : 'notification';
        item.className = status;
        item.innerHTML = `
            <h4>${notification.title || 'Уведомление'}</h4>
            <p>${notification.message || ''}</p>
            <div class="notification-date">${formatNotificationTimestamp(notification.timestamp)}</div>
        `;
        panel.appendChild(item);
    });
}

function createNotificationsPlaceholder(message) {
    return `<div class="notification notification-placeholder" data-placeholder="true">${message}</div>`;
}

function formatNotificationTimestamp(value) {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function isValidDate(dateString) {
    const regex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
    if (!regex.test(dateString)) return false;
    
    const parts = dateString.split('.');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (year < 1900 || year > new Date().getFullYear()) return false;
    if (month < 1 || month > 12) return false;
    
    const monthLength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0)) {
        monthLength[1] = 29;
    }
    
    return day > 0 && day <= monthLength[month - 1];
}

function calculateAge(birthdate) {
    const parts = birthdate.split('.');
    const birthDate = new Date(parts[2], parts[1] - 1, parts[0]);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

function populateDepartmentsFromPseudoDb() {
    const doctors = PseudoDB.getDoctors() || [];
    const departments = {};

    doctors.forEach(doctor => {
        const department = doctor.department;
        if (!department) {
            return;
        }
        if (!departments[department]) {
            departments[department] = [];
        }
        departments[department].push(formatDoctorShortName(doctor.name));
    });

    document.querySelectorAll('.department-doctors[data-department]').forEach(element => {
        const departmentName = element.dataset.department;
        const list = departments[departmentName] || [];
        element.textContent = list.length ? `Врачи: ${list.join(', ')}` : 'Врачи: уточняются';
    });
}

function formatDoctorShortName(fullName) {
    if (!fullName) {
        return '';
    }
    const parts = fullName.split(' ');
    if (parts.length === 1) {
        return fullName;
    }
    const [lastName, firstName, middleName] = parts;
    const initials = [firstName, middleName]
        .filter(Boolean)
        .map(name => `${name.charAt(0)}.`)
        .join('');
    return `${lastName} ${initials}`.trim();
}