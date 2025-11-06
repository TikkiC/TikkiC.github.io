(function () {
    const DATA_URL = document.body?.dataset?.pseudoDb || 'data/pseudo-db.json';
    const state = {
        data: null,
        promise: null
    };

    async function load() {
        if (state.data) {
            return state.data;
        }
        if (state.promise) {
            return state.promise;
        }

        state.promise = fetch(DATA_URL)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load pseudo DB: ${response.status}`);
                }
                return response.json();
            })
            .then(json => {
                state.data = json;
                return state.data;
            })
            .catch(error => {
                state.promise = null;
                console.error('[pseudo-db] Ошибка загрузки данных', error);
                throw error;
            });

        return state.promise;
    }

    function ensureLoaded() {
        if (!state.data) {
            throw new Error('Pseudo DB not loaded yet');
        }
        return state.data;
    }

    window.PseudoDB = {
        /**
         * Загружает данные из псевдо-БД. После переключения на MySQL замените fetch на запрос к API.
         */
        async load() {
            return load();
        },
        get data() {
            return state.data;
        },
        getDoctors() {
            return ensureLoaded().doctors || [];
        },
        getDoctorById(id) {
            return this.getDoctors().find(doctor => doctor.id === id) || null;
        },
        getDoctorBySpecialty(specialty) {
            return this.getDoctors().find(doctor => doctor.specialty === specialty) || null;
        },
        getScheduleDefaults() {
            return ensureLoaded().scheduleDefaults;
        },
        getSchedule() {
            return ensureLoaded().schedule || [];
        },
        getDoctorSchedules() {
            return ensureLoaded().doctorSchedules || {};
        },
        getDoctorSchedule(id) {
            if (!id) {
                return null;
            }
            const schedules = this.getDoctorSchedules();
            const schedule = schedules[id];
            if (schedule && schedule.length) {
                return schedule;
            }
            return ensureLoaded().schedule || [];
        },
        getStaff() {
            return ensureLoaded().staff || [];
        },
        getUsers() {
            return ensureLoaded().users || [];
        },
        getUserByEmail(email) {
            if (!email) {
                return null;
            }
            const normalized = email.trim().toLowerCase();
            return this.getUsers().find(user => user.email.toLowerCase() === normalized) || null;
        },
        getTeam() {
            const dashboard = ensureLoaded().dashboard;
            return dashboard?.team || [];
        },
        addUser(user) {
            if (!user) {
                return null;
            }
            const data = ensureLoaded();
            data.users = data.users || [];
            data.users.push(user);
            return user;
        },
        authenticateUser(email, password) {
            if (!email || !password) {
                return null;
            }
            const normalized = email.trim().toLowerCase();
            return this.getUsers().find(user => user.email.toLowerCase() === normalized && user.password === password) || null;
        },
        getNotifications() {
            return ensureLoaded().notifications || [];
        },
        getDashboardState() {
            return ensureLoaded().dashboard;
        }
    };
})();
