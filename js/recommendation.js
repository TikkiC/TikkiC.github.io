function updateRecommendations() {
    updateDoctorRecommendation();
    updateServiceRecommendation();
}

function renderDoctorRecommendationCard(doctor) {
    const wrapper = document.getElementById('doctor-recommendation');
    const container = document.getElementById('recommended-doctor');
    if (!wrapper || !container || !doctor) {
        return;
    }

    container.innerHTML = `
        <div style="font-size: 2rem; margin-right: 15px;">${doctor.icon || '👩‍⚕️'}</div>
        <div>
            <h4>${doctor.name}</h4>
            <p>${doctor.specialty || ''}</p>
            <p>${doctor.department || ''}</p>
        </div>
    `;
    wrapper.classList.add('active');
}

function clearDoctorRecommendationCard() {
    const wrapper = document.getElementById('doctor-recommendation');
    const container = document.getElementById('recommended-doctor');
    if (wrapper) {
        wrapper.classList.remove('active');
    }
    if (container) {
        container.innerHTML = '';
    }
}

function updateDoctorRecommendation() {
    const form = document.getElementById('request-form');
    if (!form) {
        return;
    }

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
    
    if (symptoms.length === 0 && chronicDiseases.length === 0) {
        clearDoctorRecommendationCard();
        renderDoctorSchedule();
        const form = document.getElementById('request-form');
        if (form) {
            delete form.dataset.selectedDoctor;
        }
        return;
    }
    
    const recommendedDoctor = determineDoctor(symptoms, chronicDiseases);
    
    if (recommendedDoctor) {
        renderDoctorRecommendationCard(recommendedDoctor);
        renderDoctorSchedule(recommendedDoctor.id);
        const form = document.getElementById('request-form');
        if (form && recommendedDoctor.id) {
            form.dataset.selectedDoctor = recommendedDoctor.id;
        }
    } else {
        clearDoctorRecommendationCard();
        renderDoctorSchedule();
        const form = document.getElementById('request-form');
        if (form) {
            delete form.dataset.selectedDoctor;
        }
    }
}

function determineDoctor(symptoms, chronicDiseases) {
    const symptomMapping = {
        'Кардиолог': ['Боль в груди', 'Одышка', 'Головокружение'],
        'Невролог': ['Головная боль', 'Головокружение', 'Слабость'],
        'Педиатр': ['Температура', 'Кашель', 'Тошнота'],
        'Терапевт': ['Температура', 'Кашель', 'Слабость', 'Тошнота'],
        'Гастроэнтеролог': ['Тошнота', 'Боль в животе'],
        'Травматолог': ['Боль в суставах']
    };
    const chronicMapping = {
        'Кардиолог': ['Сердечно-сосудистые'],
        'Невролог': ['Неврологические'],
        'Гастроэнтеролог': ['Желудочно-кишечные'],
        'Эндокринолог': ['Эндокринные'],
        'Пульмонолог': ['Дыхательной системы'],
        'Травматолог': ['Опорно-двигательные'],
        'Аллерголог': ['Аллергические']
    };

    const doctorSpecialties = buildDoctorSpecialtyMap();
    
    const symptomMatches = {};
    for (const [specialty, specialtySymptoms] of Object.entries(symptomMapping)) {
        symptomMatches[specialty] = symptoms.filter(symptom => 
            specialtySymptoms.includes(symptom)
        ).length;
    }
    const chronicMatches = {};
    for (const [specialty, specialtyChronic] of Object.entries(chronicMapping)) {
        chronicMatches[specialty] = chronicDiseases.filter(disease => 
            specialtyChronic.includes(disease)
        ).length;
    }
    const totalMatches = {};
    for (const specialty of Object.keys(doctorSpecialties)) {
        totalMatches[specialty] = (symptomMatches[specialty] || 0) + (chronicMatches[specialty] || 0) * 2;
    }
    let maxMatches = 0;
    let recommendedSpecialty = null;
    
    for (const [specialty, matchCount] of Object.entries(totalMatches)) {
        if (matchCount > maxMatches) {
            maxMatches = matchCount;
            recommendedSpecialty = specialty;
        }
    }
    
    if (!recommendedSpecialty && (symptoms.length > 0 || chronicDiseases.length > 0)) {
        recommendedSpecialty = 'Терапевт';
    }
    
    return recommendedSpecialty ? doctorSpecialties[recommendedSpecialty] : null;
}

function buildDoctorSpecialtyMap() {
    if (window.PseudoDB?.data) {
        // Карточки врачей загружаем из псевдо-БД
        const map = {};
        (PseudoDB.getDoctors() || []).forEach(doctor => {
            if (!map[doctor.specialty]) {
                map[doctor.specialty] = {
                    ...doctor,
                    icon: doctor.icon || '👩‍⚕️'
                };
            }
        });

        return map;
    }

    return {
        'Кардиолог': {
            id: 'fallback-cardiolog',
            name: 'Петров Алексей Владимирович',
            specialty: 'Кардиолог',
            department: 'Отделение кардиологии',
            icon: '🫀'
        },
        'Невролог': {
            id: 'fallback-nevrolog',
            name: 'Козлов Сергей Петрович',
            specialty: 'Невролог',
            department: 'Отделение неврологии',
            icon: '🧠'
        },
        'Педиатр': {
            id: 'fallback-pediatr',
            name: 'Васильева Людмила Михайловна',
            specialty: 'Педиатр',
            department: 'Педиатрическое отделение',
            icon: '👶'
        },
        'Терапевт': {
            id: 'fallback-terapevt',
            name: 'Иванова Ольга Сергеевна',
            specialty: 'Терапевт',
            department: 'Терапевтическое отделение',
            icon: '👩‍⚕️'
        },
        'Гастроэнтеролог': {
            id: 'fallback-gastro',
            name: 'Семенов Андрей Викторович',
            specialty: 'Гастроэнтеролог',
            department: 'Гастроэнтерологическое отделение',
            icon: '🩺'
        },
        'Травматолог': {
            id: 'fallback-travmatolog',
            name: 'Громов Иван Петрович',
            specialty: 'Травматолог',
            department: 'Травматологическое отделение',
            icon: '🦴'
        },
        'Эндокринолог': {
            id: 'fallback-endocrino',
            name: 'Кузнецова Елена Владимировна',
            specialty: 'Эндокринолог',
            department: 'Эндокринологическое отделение',
            icon: '🦋'
        },
        'Пульмонолог': {
            id: 'fallback-pulmo',
            name: 'Соколов Дмитрий Анатольевич',
            specialty: 'Пульмонолог',
            department: 'Пульмонологическое отделение',
            icon: '🫁'
        },
        'Аллерголог': {
            id: 'fallback-allerg',
            name: 'Морозова Анна Сергеевна',
            specialty: 'Аллерголог',
            department: 'Аллергологическое отделение',
            icon: '🌡️'
        }
    };
}

function determineUrgency(symptoms, chronicDiseases, age) {
    const urgentSymptoms = ['Боль в груди', 'Одышка', 'Сильная головная боль'];
    const hasUrgentSymptom = symptoms.some(symptom => urgentSymptoms.includes(symptom));
    const highRiskChronic = ['Сердечно-сосудистые', 'Неврологические', 'Дыхательной системы'];
    const hasHighRiskChronic = chronicDiseases.some(disease => highRiskChronic.includes(disease));
    
    if (hasUrgentSymptom || (age > 65 && hasHighRiskChronic)) {
        return 'Высокий';
    } else if (symptoms.length > 0 || chronicDiseases.length > 0) {
        return 'Средний';
    } else {
        return 'Низкий';
    }
}

function updateServiceRecommendation() {
    const form = document.getElementById('request-form');
    if (!form) {
        return;
    }

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
    const birthdateInput = form.querySelector('#patient-birthdate');
    const birthdate = birthdateInput ? birthdateInput.value : '';
    const age = birthdate && isValidDate(birthdate) ? calculateAge(birthdate) : 0;
    
    if (symptoms.length === 0 && chronicDiseases.length === 0 && !location) {
        const wrapper = document.getElementById('service-recommendation');
        wrapper?.classList.remove('active');
        return;
    }
    
    const serviceType = determineServiceType(symptoms, chronicDiseases, location, age);
    const serviceElement = document.getElementById('recommended-service');
    const wrapper = document.getElementById('service-recommendation');
    
    if (serviceElement && wrapper && serviceType) {
        let serviceClass = '';
        let serviceText = '';
        
        if (serviceType === 'Телемедицина') {
            serviceClass = 'service-telemed';
            serviceText = 'Телемедицина (онлайн консультация)';
        } else if (serviceType === 'Очный прием') {
            serviceClass = 'service-visit';
            serviceText = 'Очный прием в клинике';
        } else if (serviceType === 'Выезд врача') {
            serviceClass = 'service-home';
            serviceText = 'Выезд врача на дом';
        }
        
        serviceElement.className = `service-type ${serviceClass}`;
        serviceElement.textContent = serviceText;
        wrapper.classList.add('active');
    } else if (wrapper) {
        wrapper.classList.remove('active');
    }
}

function determineServiceType(symptoms, chronicDiseases, location, age) {
    const remoteLocations = ['Красный Яр', 'Лиман', 'Икряное', 'Володарский', 'Енотаевка', 'Черный Яр'];
    const needsExamination = symptoms.some(symptom => 
        ['Боль в груди', 'Боль в животе', 'Боль в суставах'].includes(symptom)
    );
    
    const needsUrgentCare = symptoms.some(symptom =>
        ['Боль в груди', 'Одышка', 'Сильная головная боль'].includes(symptom)
    );
    const highRisk = age > 70 && chronicDiseases.length > 0;
    
    if (needsUrgentCare && highRisk) {
        return 'Выезд врача';
    } else if (remoteLocations.includes(location) && !needsExamination) {
        return 'Телемедицина';
    } else if (needsExamination || highRisk) {
        return 'Очный прием';
    } else {
        return 'Телемедицина';
    }
}

function recommendDoctorById(doctorId) {
    if (!doctorId) {
        return;
    }

    if (!window.PseudoDB?.data) {
        window.PseudoDB?.load?.().then(() => recommendDoctorById(doctorId)).catch(() => {});
        return;
    }

    const doctor = PseudoDB.getDoctorById(doctorId);
    if (!doctor) {
        return;
    }

    const form = document.getElementById('request-form');
    if (form) {
        form.dataset.selectedDoctor = doctor.id;
    }

    renderDoctorRecommendationCard(doctor);
    renderDoctorSchedule(doctor.id);
}

window.recommendDoctorById = recommendDoctorById;