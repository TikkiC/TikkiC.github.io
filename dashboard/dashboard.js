const API_BASE = '/api';

const staticFallback = {
    metrics: [
        { key: 'totalRequests', label: 'Всего обращений', value: 428, trend: '+12%', trendType: 'positive', icon: '📨' },
        { key: 'telemedicine', label: 'Телемедицинские консультации', value: 156, trend: '+4%', trendType: 'positive', icon: '🖥️' },
        { key: 'homeVisits', label: 'Выезды на дом', value: 63, trend: '-2%', trendType: 'negative', icon: '🚑' },
        { key: 'avgResponse', label: 'Среднее время реакции', value: '18 мин', trend: '-5%', trendType: 'positive', icon: '⏱️' }
    ],
    trend: {
        7: [
            { day: 'Пн', value: 54 },
            { day: 'Вт', value: 61 },
            { day: 'Ср', value: 68 },
            { day: 'Чт', value: 72 },
            { day: 'Пт', value: 66 },
            { day: 'Сб', value: 48 },
            { day: 'Вс', value: 59 }
        ],
        30: [
            { day: 'Нед.1', value: 322 },
            { day: 'Нед.2', value: 341 },
            { day: 'Нед.3', value: 365 },
            { day: 'Нед.4', value: 402 }
        ],
        90: [
            { day: 'Сентябрь', value: 912 },
            { day: 'Октябрь', value: 1035 },
            { day: 'Ноябрь', value: 428 }
        ]
    },
    capacity: [
        { department: 'Кардиология', load: 0.78 },
        { department: 'Неврология', load: 0.64 },
        { department: 'Педиатрия', load: 0.52 },
        { department: 'Стоматология', load: 0.45 }
    ],
    requests: [
        {
            id: 'REQ-1045',
            patient: 'Иванова Мария',
            location: 'Астрахань',
            symptoms: ['Слабость', 'Головокружение'],
            appointment: '06.11.2025 10:30',
            status: 'in_progress',
            owner: 'д-р Козлов'
        },
        {
            id: 'REQ-1044',
            patient: 'Петров Сергей',
            location: 'Ахтубинск',
            symptoms: ['Кашель'],
            appointment: '06.11.2025 12:00',
            status: 'new',
            owner: 'д-р Сидорова'
        },
        {
            id: 'REQ-1043',
            patient: 'Громова Алина',
            location: 'Камызяк',
            symptoms: ['Боль в груди'],
            appointment: '05.11.2025 15:15',
            status: 'resolved',
            owner: 'д-р Петров'
        }
    ],
    team: [],
    doctors: [],
    timeline: [
        { time: 'Сегодня, 09:42', title: 'Обращение REQ-1045 назначено', description: 'Пациент направлен к неврологу, назначено телемедицинское обследование.' },
        { time: 'Сегодня, 09:15', title: 'Кардиология достигла 78% загрузки', description: 'Рекомендовано перераспределить обращения в другие отделения.' },
        { time: 'Вчера, 18:20', title: 'Закрыто обращение REQ-1038', description: 'Пациент получил консультацию и назначение, статус обновлен на "Решено".' }
    ]
};

let fallbackData = staticFallback;
let staffSession = null;

function cloneFallback(value) {
    if (value == null) {
        return value;
    }
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
}

async function fetchJSON(endpoint, fallback) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`);
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.warn(`[dashboard] Using fallback for ${endpoint}:`, error.message);
        return cloneFallback(fallback);
    }
}

function renderMetrics(metrics) {
    const container = document.getElementById('metric-grid');
    container.innerHTML = '';

    metrics.forEach(metric => {
        const card = document.createElement('div');
        card.className = 'metric-card';
        card.innerHTML = `
            <div class="metric-card__title">${metric.icon || ''}<span>${metric.label}</span></div>
            <div class="metric-card__value">${metric.value}</div>
            <div class="metric-card__trend ${metric.trendType === 'negative' ? 'negative' : ''}">${metric.trend}</div>
        `;
        container.appendChild(card);
    });
}

function renderTrend(trend) {
    const chart = document.getElementById('trend-chart');
    chart.innerHTML = '';

    const data = Array.isArray(trend) ? trend : [];
    const maxValue = Math.max(...data.map(item => item.value), 1);
    data.forEach(item => {
        const column = document.createElement('div');
        column.className = 'trend-column';

        const wrapper = document.createElement('div');
        wrapper.className = 'trend-bar-wrapper';

        const bar = document.createElement('div');
        bar.className = 'trend-bar';
        bar.style.height = `${Math.round((item.value / maxValue) * 100)}%`;

        const value = document.createElement('span');
        value.className = 'trend-bar__value';
        value.textContent = item.value;

        const label = document.createElement('span');
        label.className = 'trend-bar__label';
        label.textContent = item.day;

        bar.appendChild(value);
        wrapper.appendChild(bar);
        column.appendChild(wrapper);
        column.appendChild(label);
        chart.appendChild(column);
    });
}

function highlightTrendRange(range) {
    document.querySelectorAll('#requests-trend footer .link-button').forEach(button => {
        const buttonRange = Number(button.dataset.range);
        button.classList.toggle('active', buttonRange === Number(range));
    });
}

function renderCapacity(capacity) {
    const list = document.getElementById('capacity-list');
    list.innerHTML = '';

    capacity.forEach(entry => {
        const item = document.createElement('li');
        item.className = 'capacity-item';
        item.innerHTML = `
            <span class="capacity-item__name">${entry.department}</span>
            <div class="capacity-item__bar">
                <div class="capacity-item__fill" style="width: ${Math.round(entry.load * 100)}%"></div>
            </div>
            <span class="capacity-item__value">${Math.round(entry.load * 100)}%</span>
        `;
        list.appendChild(item);
    });
}

function renderRequests(requests) {
    const tbody = document.getElementById('requests-table-body');
    tbody.innerHTML = '';

    requests.forEach(request => {
        const symptoms = Array.isArray(request.symptoms) ? request.symptoms.join(', ') : '—';
        const appointment = request.appointment || '—';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${request.patient}</td>
            <td>${request.location}</td>
            <td>${symptoms}</td>
            <td>${appointment}</td>
            <td><span class="status-pill ${request.status}">${translateStatus(request.status)}</span></td>
            <td>${request.owner || '—'}</td>
        `;
        tbody.appendChild(row);
    });
}

function composeTeamEntries(teamMembers = [], doctors = []) {
    const result = [];

    teamMembers.forEach(member => {
        result.push({
            kind: 'coordinator',
            name: member.name,
            title: member.role,
            icon: member.icon || null,
            meta: [
                member.contacts ? { label: 'Контакты', value: member.contacts } : null,
                member.shift ? { label: 'Смена', value: member.shift } : null
            ].filter(Boolean)
        });
    });

    doctors.forEach(doctor => {
        result.push({
            kind: 'doctor',
            name: doctor.name,
            title: [doctor.specialty, doctor.department].filter(Boolean).join(' · ') || 'Врач',
            icon: doctor.icon || null,
            meta: [
                doctor.experience ? { label: 'Стаж', value: doctor.experience } : null,
                Array.isArray(doctor.locations) && doctor.locations.length ? { label: 'Локации', value: doctor.locations.join(', ') } : null,
                doctor.education ? { label: 'Образование', value: doctor.education } : null
            ].filter(Boolean)
        });
    });

    return result;
}

function renderTeam(teamMembers, doctors = []) {
    const grid = document.getElementById('team-grid');
    grid.innerHTML = '';

    const items = composeTeamEntries(teamMembers, doctors);

    if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'team-card team-card--empty';
        empty.textContent = 'Данные о команде появятся позже.';
        grid.appendChild(empty);
        return;
    }

    items.forEach(entry => {
        const card = document.createElement('article');
        card.className = 'team-card';

        const badgeLabel = entry.kind === 'doctor' ? 'Врач' : 'Координатор';
        const metaHtml = entry.meta
            .map(meta => `<div class="team-card__meta"><strong>${meta.label}:</strong> ${meta.value}</div>`)
            .join('');

        const iconHtml = entry.icon ? `<div class="team-card__icon">${entry.icon}</div>` : '';
        card.innerHTML = `
            <span class="team-card__badge">${badgeLabel}</span>
            ${iconHtml}
            <div class="team-card__name">${entry.name}</div>
            <div class="team-card__role">${entry.title}</div>
            ${metaHtml}
        `;
        grid.appendChild(card);
    });
}

function renderTimeline(events) {
    const stream = document.getElementById('timeline-feed');
    stream.innerHTML = '';

    events.forEach(event => {
        const item = document.createElement('div');
        item.className = 'timeline-event';
        item.innerHTML = `
            <div class="timeline-event__marker"></div>
            <div class="timeline-event__time">${event.time}</div>
            <div class="timeline-event__title">${event.title}</div>
            <div class="timeline-event__description">${event.description}</div>
        `;
        stream.appendChild(item);
    });
}

function translateStatus(status) {
    switch (status) {
        case 'new':
            return 'Новый';
        case 'in_progress':
            return 'В работе';
        case 'resolved':
            return 'Решен';
        default:
            return status;
    }
}

let currentTrendRange = 7;
let cachedRequests = fallbackData.requests;

async function loadDashboard(options = {}) {
    if (typeof options.trendRange === 'number') {
        currentTrendRange = options.trendRange;
    }

    const [metricsResponse, trendResponse, capacityResponse, requestsResponse, teamResponse, timelineResponse] = await Promise.all([
        fetchJSON('/metrics', fallbackData.metrics),
        fetchJSON(`/trend?range=${currentTrendRange}`, fallbackData.trend?.[currentTrendRange] || fallbackData.trend?.['7'] || []),
        fetchJSON('/capacity', fallbackData.capacity),
        fetchJSON('/requests', fallbackData.requests),
        fetchJSON('/team', fallbackData.team),
        fetchJSON('/timeline', fallbackData.timeline)
    ]);

    renderMetrics(metricsResponse);
    renderTrend(trendResponse);
    highlightTrendRange(currentTrendRange);
    renderCapacity(capacityResponse);
    cachedRequests = requestsResponse;
    renderRequests(cachedRequests);
    const doctorsSource = window.PseudoDB?.data ? (PseudoDB.getDoctors() || []) : (fallbackData.doctors || []);
    renderTeam(teamResponse, doctorsSource);
    renderTimeline(timelineResponse);
}

function setupFilters() {
    const statusFilter = document.getElementById('status-filter');
    statusFilter.addEventListener('change', () => {
        if (statusFilter.value === 'all') {
            renderRequests(cachedRequests);
            return;
        }
        const filtered = cachedRequests.filter(item => item.status === statusFilter.value);
        renderRequests(filtered);
    });
}

function setupRefresh() {
    const refreshBtn = document.getElementById('refresh-requests');
    refreshBtn.addEventListener('click', () => loadDashboard());
}

function setupSearch() {
    const searchBtn = document.getElementById('dashboard-search-btn');
    const searchInput = document.getElementById('dashboard-search');

    function applySearch() {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
            renderRequests(cachedRequests);
            return;
        }
        const filtered = cachedRequests.filter(item =>
            [item.patient, item.location, item.owner].some(field => field && field.toLowerCase().includes(query))
        );
        renderRequests(filtered);
    }

    searchBtn.addEventListener('click', applySearch);
    searchInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            applySearch();
        }
    });
}

function setupModal() {
    const modal = document.getElementById('request-modal');
    const openBtn = document.getElementById('create-request-btn');
    const closeButtons = modal.querySelectorAll('[data-close]');

    openBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
    });

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    });

    modal.addEventListener('click', event => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    const form = document.getElementById('request-form');
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const payload = {
            patient: document.getElementById('modal-patient').value,
            location: document.getElementById('modal-location').value,
            symptoms: document.getElementById('modal-symptoms').value.split(',').map(item => item.trim()).filter(Boolean),
            owner: document.getElementById('modal-responsible').value || null
        };

        try {
            const response = await fetch(`${API_BASE}/requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Не удалось сохранить обращение');
            }

            form.reset();
            modal.style.display = 'none';
            await loadDashboard();
        } catch (error) {
            alert(error.message);
        }
    });
}

function setupTimelineRefresh() {
    document.getElementById('export-report-btn').addEventListener('click', async () => {
        const timeline = await fetchJSON('/timeline', fallbackData.timeline);
        const blob = new Blob([JSON.stringify(timeline, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'medplatform-timeline.json';
        link.click();
        URL.revokeObjectURL(url);
    });
}

function setupTrendControls() {
    document.querySelectorAll('#requests-trend footer .link-button').forEach(button => {
        button.addEventListener('click', () => {
            const range = Number(button.dataset.range);
            loadDashboard({ trendRange: range });
        });
    });
}

function ensureAdminAccess() {
    if (!window.MedPlatformStaffAuth) {
        console.warn('[dashboard] Модуль staff-auth не найден, проверка доступа пропущена');
        return null;
    }
    return window.MedPlatformStaffAuth.requireRole({ roles: ['administrator'], redirectUrl: '../index.html' });
}

function applyStaffHeader(session) {
    if (!session) {
        return;
    }
    const nameEl = document.querySelector('.dashboard-header__user-info strong');
    const deptEl = document.querySelector('.dashboard-header__user-info span');
    const avatarEl = document.querySelector('.dashboard-header__avatar');

    if (nameEl) {
        nameEl.textContent = session.name || 'Администратор';
    }
    if (deptEl) {
        deptEl.textContent = 'MedPlatform · доступ администратора';
    }
    if (avatarEl && session.name) {
        avatarEl.textContent = extractInitials(session.name);
    }
}

function extractInitials(name) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join('') || 'MP';
}

function setupStaffLogout() {
    const logoutBtn = document.getElementById('staff-logout-btn');
    if (!logoutBtn) {
        return;
    }
    logoutBtn.addEventListener('click', () => {
        if (window.MedPlatformStaffAuth) {
            window.MedPlatformStaffAuth.clearSession();
        }
        window.location.replace('../index.html');
    });
}

window.addEventListener('DOMContentLoaded', async () => {
    staffSession = ensureAdminAccess();
    if (!staffSession) {
        return;
    }
    applyStaffHeader(staffSession);
    setupStaffLogout();

    try {
        await PseudoDB.load();
    // Загружаем состояние из псевдо-БД до подключения реального API
        const dashboardState = PseudoDB.getDashboardState();
        if (dashboardState) {
            fallbackData = dashboardState;
        }
        const team = PseudoDB.getTeam();
        if (Array.isArray(team) && team.length) {
            fallbackData.team = team;
        }
        const doctors = PseudoDB.getDoctors();
        if (Array.isArray(doctors) && doctors.length) {
            fallbackData.doctors = doctors;
        }
    } catch (error) {
        console.warn('[dashboard] Используется статический набор данных', error);
    }

    cachedRequests = fallbackData.requests;

    await loadDashboard();
    setupFilters();
    setupRefresh();
    setupSearch();
    setupModal();
    setupTimelineRefresh();
    setupTrendControls();
});
