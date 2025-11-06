const { EventEmitter } = require('events');

class MemoryStore extends EventEmitter {
    constructor(seed) {
        super();
        this.state = { ...seed };
    }

    get(key) {
        return JSON.parse(JSON.stringify(this.state[key] ?? null));
    }

    set(key, value) {
        this.state[key] = JSON.parse(JSON.stringify(value));
        this.emit('change', { key, value: this.state[key] });
    }
}

function createStore(initialState) {
    const store = new MemoryStore(initialState);
    return {
        getState: () => store.get('dashboard'),
        setState: (next) => store.set('dashboard', next),
        onChange: (listener) => {
            store.on('change', listener);
            return () => store.off('change', listener);
        }
    };
}

async function connectDatabase(connectionString, seedData) {
    if (!connectionString) {
        return createStore({ dashboard: seedData });
    }

    console.warn('[db] Connection string detected, but no driver configured. Falling back to in-memory store.');
    return createStore({ dashboard: seedData });
}

module.exports = {
    connectDatabase
};
