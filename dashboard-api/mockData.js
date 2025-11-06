const fs = require('fs');
const path = require('path');

const fallbackSeed = {
    metrics: [
        { key: 'totalRequests', label: 'Всего обращений', value: 428, trend: '+12%', trendType: 'positive', icon: '📨' },
        { key: 'telemedicine', label: 'Телемедицина', value: 156, trend: '+4%', trendType: 'positive', icon: '🖥️' },
        { key: 'homeVisits', label: 'Выезды на дом', value: 63, trend: '-2%', trendType: 'negative', icon: '🚑' },
        { key: 'avgResponse', label: 'Среднее время реакции', value: '18 мин', trend: '-5%', trendType: 'positive', icon: '⏱️' }
    ],
    trend: {
        '7': [
            { day: 'Пн', value: 54 },
            { day: 'Вт', value: 61 },
            { day: 'Ср', value: 68 },
            { day: 'Чт', value: 72 },
            { day: 'Пт', value: 66 },
            { day: 'Сб', value: 48 },
            { day: 'Вс', value: 59 }
        ],
        '30': [
            { day: 'Нед.1', value: 322 },
            { day: 'Нед.2', value: 341 },
            { day: 'Нед.3', value: 365 },
            { day: 'Нед.4', value: 402 }
        ],
        '90': [
            { day: 'Сентябрь', value: 912 },
            { day: 'Октябрь', value: 1035 },
            { day: 'Ноябрь', value: 428 }
        ]
    },
    capacity: [
        { department: 'Кардиология', load: 0.78 },
        { department: 'Педиатрия', load: 0.52 },
        { department: 'Неврология', load: 0.64 },
        { department: 'Офтальмология', load: 0.47 }
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
    team: [
        { name: 'Алексей Харитонов', role: 'Главный координатор', contacts: 'haritonov@medplatform.ru', shift: '08:00 — 17:00' },
        { name: 'Екатерина Малышева', role: 'Телемедицина', contacts: '+7 (8512) 51-00-12', shift: '09:00 — 21:00' },
        { name: 'Владимир Соколов', role: 'Выездная служба', contacts: 'sokolov@medplatform.ru', shift: 'Круглосуточно' },
        { name: 'Мария Крылова', role: 'Прием обращений', contacts: '+7 (8512) 51-00-09', shift: '08:00 — 20:00' }
    ],
    timeline: [
        { time: 'Сегодня, 09:42', title: 'Обращение REQ-1045 назначено', description: 'Пациент направлен к неврологу, назначено телемедицинское обследование.' },
        { time: 'Сегодня, 09:15', title: 'Кардиология достигла 78% загрузки', description: 'Рекомендовано перераспределить обращения в другие отделения.' },
        { time: 'Вчера, 18:20', title: 'Закрыто обращение REQ-1038', description: 'Пациент получил консультацию и назначение, статус обновлен на "Решено".' }
    ]
};

let seedState = fallbackSeed;

try {
    const pseudoDbPath = path.resolve(__dirname, '../data/pseudo-db.json');
    const pseudoDb = JSON.parse(fs.readFileSync(pseudoDbPath, 'utf8'));
    if (pseudoDb.dashboard) {
        seedState = pseudoDb.dashboard;
    }
} catch (error) {
    console.warn('[mockData] Не удалось загрузить данные из pseudo-db.json, используется встроенный набор.', error);
}

module.exports = {
    seedState
};
