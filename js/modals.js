function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        return;
    }
    modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        return;
    }
    modal.style.display = 'none';
}

window.addEventListener('click', event => {
    if (event.target.classList && event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});

function openDoctorModal(doctorId) {
    const modalContent = document.getElementById('doctor-modal-content');
    if (!modalContent) {
        return;
    }

    if (!PseudoDB.data) {
        // Подтягиваем карточку врача из псевдо-БД до подключения реального сервиса
        PseudoDB.load()
            .then(() => openDoctorModal(doctorId))
            .catch(error => {
                console.error('Не удалось загрузить данные для врача', error);
                modalContent.innerHTML = '<p>Не удалось загрузить данные врача. Попробуйте позже.</p>';
                openModal('doctor-modal');
            });
        return;
    }

    const doctor = PseudoDB.getDoctorById(doctorId);
    if (!doctor) {
        modalContent.innerHTML = '<p>Информация о враче будет доступна позже.</p>';
        openModal('doctor-modal');
        return;
    }

    modalContent.innerHTML = `
        <h2>${doctor.name}</h2>
        <p><strong>Специальность:</strong> ${doctor.specialty}</p>
        <p><strong>Отделение:</strong> ${doctor.department}</p>
        <p><strong>Опыт работы:</strong> ${doctor.experience}</p>
        <p><strong>Образование:</strong> ${doctor.education}</p>
        <p><strong>Описание:</strong> ${doctor.description}</p>
        <p><strong>Принимает в:</strong> ${(doctor.locations || []).join(', ')}</p>
        <button class="btn btn-primary" style="margin-top: 20px;" data-doctor-booking>Записаться на прием</button>
    `;

    const bookingButton = modalContent.querySelector('[data-doctor-booking]');
    if (bookingButton) {
        bookingButton.addEventListener('click', () => {
            closeModal('doctor-modal');
            if (window.recommendDoctorById) {
                window.recommendDoctorById(doctor.id);
            }
            const requestSection = document.getElementById('request');
            requestSection?.scrollIntoView({ behavior: 'smooth' });
        });
    }

    openModal('doctor-modal');
}