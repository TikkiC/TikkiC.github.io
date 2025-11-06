const doctorState = {
    session: null,
    doctor: null,
    schedule: [],
    defaults: null
};

function getElement(id) {
    return document.getElementById(id);
}

function setupPageNavigation() {
    const logoutBtn = getElement('staff-logout-btn');
    const dashboardBtn = getElement('doctor-dashboard-btn');

    if (dashboardBtn) {
        dashboardBtn.textContent = 'Запись пациентов';
        dashboardBtn.addEventListener('click', () => {
            window.location.href = '../index.html#request';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (window.MedPlatformStaffAuth) {
                window.MedPlatformStaffAuth.clearSession();
            }
            window.location.replace('../index.html');
        });
    }
}

async function bootstrapDoctorPage() {
    if (!window.MedPlatformStaffAuth) {
        console.error('[doctor] Отсутствует модуль staff-auth');
        return;
    }

    const session = window.MedPlatformStaffAuth.requireRole({ roles: ['doctor'], redirectUrl: '../index.html' });
    if (!session) {
        return;
    }

    if (!session.doctorId) {
        showDoctorError('Аккаунту врача не назначен профиль. Обратитесь к администратору.');
        return;
    }

    doctorState.session = session;

    try {
        await PseudoDB.load();
    } catch (error) {
        console.error('[doctor] Не удалось загрузить данные псевдо-БД', error);
        showDoctorError('Не удалось загрузить данные расписания. Попробуйте обновить страницу позже.');
        return;
    }

    const doctor = PseudoDB.getDoctorById(session.doctorId);
    if (!doctor) {
        showDoctorError('Профиль врача не найден. Проверьте учетную запись.');
        return;
    }

    doctorState.doctor = doctor;
    doctorState.defaults = PseudoDB.getScheduleDefaults() || { slots: [] };
    doctorState.schedule = buildDoctorSchedule(session.doctorId);

    renderDoctorProfile();
    renderDoctorSchedule();
    renderAppointmentsList();
}

function buildDoctorSchedule(doctorId) {
    const originalSchedule = PseudoDB.getDoctorSchedule(doctorId) || [];
    return originalSchedule.map(day => ({
        date: day.date,
        label: day.label,
        isDayOff: Boolean(day.isDayOff),
        notes: day.notes || '',
        booked: Array.isArray(day.booked) ? [...day.booked] : [],
        appointments: Array.isArray(day.appointments)
            ? day.appointments.map(appointment => ({ ...appointment }))
            : []
    }));
}

function showDoctorError(message) {
    const grid = getElement('doctor-schedule-grid');
    const empty = getElement('doctor-empty-message');
    if (grid) {
        grid.innerHTML = '';
    }
    if (empty) {
        empty.textContent = message;
        empty.hidden = false;
    }
}

function renderDoctorProfile() {
    const { doctor } = doctorState;
    if (!doctor) {
        return;
    }

    const nameEl = getElement('doctor-name');
    const specialtyEl = getElement('doctor-specialty');
    const descriptionEl = getElement('doctor-description');
    const locationsEl = getElement('doctor-locations');
    const experienceEl = getElement('doctor-experience');

    if (nameEl) {
        nameEl.textContent = doctor.name;
    }
    if (specialtyEl) {
        const department = doctor.department ? ` · ${doctor.department}` : '';
        specialtyEl.textContent = `${doctor.specialty || 'Специализация'}${department}`;
    }
    if (descriptionEl) {
        descriptionEl.textContent = doctor.description || 'Описание профиля будет добавлено позже.';
    }
    if (locationsEl) {
        const locations = Array.isArray(doctor.locations) ? doctor.locations.join(', ') : null;
        locationsEl.textContent = locations ? `Локации: ${locations}` : 'Локации уточняются';
    }
    if (experienceEl) {
        experienceEl.textContent = doctor.experience ? `Стаж: ${doctor.experience}` : 'Стаж уточняется';
    }

    document.title = `Календарь врача · ${doctor.name}`;
}

function renderDoctorSchedule() {
    const scheduleGrid = getElement('doctor-schedule-grid');
    const emptyState = getElement('doctor-empty-message');
    const rangeEl = getElement('doctor-schedule-range');

    if (!scheduleGrid) {
        return;
    }

    scheduleGrid.innerHTML = '';

    if (!doctorState.schedule.length) {
        if (emptyState) {
            emptyState.hidden = false;
        }
        if (rangeEl) {
            rangeEl.textContent = '';
        }
        return;
    }

    if (emptyState) {
        emptyState.hidden = true;
    }

    if (rangeEl) {
        const formatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
        const firstDate = new Date(doctorState.schedule[0].date);
        const lastDate = new Date(doctorState.schedule[doctorState.schedule.length - 1].date);
        rangeEl.textContent = `${formatter.format(firstDate)} — ${formatter.format(lastDate)}`;
    }

    const slots = doctorState.defaults?.slots || [];

    doctorState.schedule.forEach(day => {
        const dayEl = document.createElement('article');
        dayEl.className = 'doctor-day';

        const header = document.createElement('div');
        header.className = 'doctor-day__header';
        header.innerHTML = `
            <span class="doctor-day__label">${day.label}</span>
            <span class="doctor-day__status">${day.isDayOff ? 'Выходной' : formatDayMeta(day)}</span>
        `;
        dayEl.appendChild(header);

        if (day.isDayOff) {
            if (day.notes) {
                const note = document.createElement('div');
                note.className = 'doctor-day__note';
                note.textContent = day.notes;
                dayEl.appendChild(note);
            }
            scheduleGrid.appendChild(dayEl);
            return;
        }

        const bookedSet = new Set(day.booked || []);
        const appointmentBySlot = new Map();
        (day.appointments || []).forEach(appointment => {
            appointmentBySlot.set(appointment.time, appointment);
        });

        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'doctor-day__slots';

        if (day.notes) {
            const note = document.createElement('div');
            note.className = 'doctor-day__note';
            note.textContent = day.notes;
            dayEl.appendChild(note);
        }

        slots.forEach(time => {
            const appointment = appointmentBySlot.get(time);
            const isBooked = bookedSet.has(time);
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = time;

            const status = resolveSlotStatus({ appointment, isBooked });
            button.className = `doctor-slot doctor-slot--${status}`;

            if (appointment) {
                button.dataset.date = day.date;
                button.dataset.time = time;
                button.title = buildSlotTitle(appointment);
                button.addEventListener('click', handleSlotClick);
            } else if (isBooked) {
                button.disabled = true;
            }

            slotsContainer.appendChild(button);
        });

        dayEl.appendChild(slotsContainer);
        scheduleGrid.appendChild(dayEl);
    });
}

function formatDayMeta(day) {
    const totalAppointments = (day.appointments || []).length;
    if (!totalAppointments) {
        return 'Свободные окна';
    }
    const confirmed = day.appointments.filter(appt => appt.status === 'confirmed').length;
    if (!confirmed) {
        return `Записано: ${totalAppointments}`;
    }
    return `Подтверждено: ${confirmed}/${totalAppointments}`;
}

function resolveSlotStatus({ appointment, isBooked }) {
    if (appointment) {
        switch (appointment.status) {
            case 'confirmed':
                return 'confirmed';
            case 'rerouted':
                return 'rerouted';
            case 'pending':
            default:
                return 'pending';
        }
    }
    return isBooked ? 'busy' : 'free';
}

function buildSlotTitle(appointment) {
    const parts = [];
    if (appointment.patient?.name) {
        parts.push(appointment.patient.name);
    }
    if (appointment.status) {
        parts.push(formatStatus(appointment.status));
    }
    return parts.join(' · ');
}

function handleSlotClick(event) {
    const target = event.currentTarget;
    const slotDate = target.dataset.date;
    const slotTime = target.dataset.time;
    if (!slotDate || !slotTime) {
        return;
    }
    const day = doctorState.schedule.find(item => item.date === slotDate);
    if (!day) {
        return;
    }
    const appointment = (day.appointments || []).find(item => item.time === slotTime);
    if (!appointment) {
        return;
    }
    openAppointmentModal(day, appointment);
}

function renderAppointmentsList() {
    const listEl = getElement('doctor-appointments-list');
    if (!listEl) {
        return;
    }

    listEl.innerHTML = '';

    const appointments = collectAppointments();
    if (!appointments.length) {
        const empty = document.createElement('div');
        empty.className = 'doctor-empty';
        empty.textContent = 'Нет активных обращений. Незаполненные слоты доступны для записи.';
        listEl.appendChild(empty);
        return;
    }

    const template = document.getElementById('appointment-card-template');
    appointments.forEach(({ day, appointment }) => {
        const node = template.content.firstElementChild.cloneNode(true);
        node.querySelector('.appointment-card__time').textContent = `${day.label} · ${appointment.time}`;
        node.querySelector('.appointment-card__status').textContent = formatStatus(appointment.status);
        node.querySelector('.appointment-card__patient').textContent = appointment.patient?.name || 'Пациент уточняется';
        node.querySelector('.appointment-card__service').textContent = appointment.serviceType ? `Формат: ${appointment.serviceType}` : 'Формат уточняется';
        const actionBtn = node.querySelector('.appointment-card__more');
        actionBtn.addEventListener('click', () => openAppointmentModal(day, appointment));
        listEl.appendChild(node);
    });
}

function collectAppointments() {
    const stack = [];
    doctorState.schedule.forEach(day => {
        (day.appointments || []).forEach(appointment => {
            stack.push({ day, appointment });
        });
    });
    return stack.sort((a, b) => {
        const aDate = buildDateTime(a.day.date, a.appointment.time);
        const bDate = buildDateTime(b.day.date, b.appointment.time);
        return aDate - bDate;
    });
}

function buildDateTime(dateString, timeString) {
    return new Date(`${dateString}T${timeString}:00`);
}

function formatStatus(status) {
    switch (status) {
        case 'confirmed':
            return 'Подтверждено';
        case 'rerouted':
            return 'Перенаправлено';
        case 'pending':
        default:
            return 'На подтверждении';
    }
}

function openAppointmentModal(day, appointment) {
    const modal = getElement('appointment-modal');
    const title = getElement('appointment-modal-title');
    const content = getElement('appointment-modal-content');
    const actions = getElement('appointment-modal-actions');

    if (!modal || !content || !actions) {
        return;
    }

    title.textContent = `${day.label} · ${appointment.time}`;

    const details = document.createElement('dl');
    details.innerHTML = `
        <dt>Статус</dt>
        <dd>${formatStatus(appointment.status)}</dd>
        <dt>Пациент</dt>
        <dd>${appointment.patient?.name || '—'}</dd>
        <dt>Контакты</dt>
        <dd>${buildContactInfo(appointment.patient)}</dd>
        <dt>Симптомы</dt>
        <dd>${Array.isArray(appointment.patient?.symptoms) && appointment.patient.symptoms.length ? appointment.patient.symptoms.join(', ') : '—'}</dd>
        <dt>Тип обслуживания</dt>
        <dd>${appointment.serviceType || '—'}</dd>
        <dt>Комментарий</dt>
        <dd>${appointment.patient?.notes || '—'}</dd>
    `;

    if (appointment.reroutedTo) {
        const rerouteInfo = document.createElement('p');
        rerouteInfo.className = 'doctor-day__note';
        rerouteInfo.textContent = `Обращение перенаправлено к: ${appointment.reroutedTo}`;
        details.appendChild(rerouteInfo);
    }

    content.innerHTML = '';
    content.appendChild(details);

    actions.innerHTML = '';
    actions.appendChild(buildActionButton('Подтвердить', 'doctor-action--confirm', () => {
        updateAppointmentStatus(day, appointment, 'confirmed');
        closeAppointmentModal();
    }));
    actions.appendChild(buildActionButton('Перенаправить', 'doctor-action--reroute', () => {
        const target = window.prompt('Укажите врача или отделение, куда перенаправить обращение:', appointment.reroutedTo || '');
        if (target) {
            appointment.status = 'rerouted';
            appointment.reroutedTo = target.trim();
            appointment.updatedAt = new Date().toISOString();
            renderDoctorSchedule();
            renderAppointmentsList();
            openAppointmentModal(day, appointment);
        }
    }));
    actions.appendChild(buildActionButton('Изменить формат приема', 'doctor-action--service', () => {
        const nextService = window.prompt('Новый формат приема (например, Телемедицина, Очный прием, Выезд):', appointment.serviceType || '');
        if (nextService) {
            appointment.serviceType = nextService.trim();
            appointment.updatedAt = new Date().toISOString();
            renderDoctorSchedule();
            renderAppointmentsList();
            openAppointmentModal(day, appointment);
        }
    }));
    actions.appendChild(buildActionButton('Закрыть', 'doctor-action--close', closeAppointmentModal));

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
}

function buildContactInfo(patient) {
    if (!patient) {
        return '—';
    }
    const parts = [];
    if (patient.phone) {
        parts.push(patient.phone);
    }
    if (patient.email) {
        parts.push(patient.email);
    }
    return parts.length ? parts.join(' · ') : '—';
}

function buildActionButton(label, className, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', handler, { once: true });
    return button;
}

function updateAppointmentStatus(day, appointment, status) {
    appointment.status = status;
    appointment.updatedAt = new Date().toISOString();
    renderDoctorSchedule();
    renderAppointmentsList();
}

function closeAppointmentModal() {
    const modal = getElement('appointment-modal');
    if (!modal) {
        return;
    }
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
}

function setupModalListeners() {
    const modal = getElement('appointment-modal');
    if (!modal) {
        return;
    }

    modal.addEventListener('click', event => {
        if (event.target.matches('[data-close-modal]')) {
            closeAppointmentModal();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeAppointmentModal();
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    setupModalListeners();
    setupPageNavigation();
    bootstrapDoctorPage();
});
