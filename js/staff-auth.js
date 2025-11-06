(function () {
    const STORAGE_KEY = 'medplatform.staffSession';

    function readSession() {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return null;
        }
        try {
            return JSON.parse(raw);
        } catch (error) {
            console.warn('[staff-auth] Не удалось разобрать сохраненную сессию персонала', error);
            sessionStorage.removeItem(STORAGE_KEY);
            return null;
        }
    }

    function writeSession(staffMember) {
        if (!staffMember) {
            sessionStorage.removeItem(STORAGE_KEY);
            return null;
        }
        const payload = {
            id: staffMember.id,
            login: staffMember.login,
            role: staffMember.role,
            name: staffMember.name,
            doctorId: staffMember.doctorId || null,
            savedAt: new Date().toISOString()
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        return payload;
    }

    function clearSession() {
        sessionStorage.removeItem(STORAGE_KEY);
    }

    function requireRole(options = {}) {
        const roles = Array.isArray(options.roles) ? options.roles : null;
        const redirectUrl = options.redirectUrl || '../index.html';
        const session = readSession();

        if (!session) {
            console.warn('[staff-auth] Доступ запрещен: сессия персонала отсутствует');
            window.location.replace(redirectUrl);
            return null;
        }

        if (roles && roles.length && !roles.includes(session.role)) {
            console.warn('[staff-auth] Доступ запрещен: роль', session.role, 'не входит в список', roles);
            window.location.replace(redirectUrl);
            return null;
        }

        return session;
    }

    window.MedPlatformStaffAuth = {
        STORAGE_KEY,
        getSession: readSession,
        saveSession: writeSession,
        clearSession,
        requireRole
    };
})();
