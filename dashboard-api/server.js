require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { connectDatabase } = require('./db');
const { seedState } = require('./mockData');

const PORT = process.env.PORT || 4000;
const USE_MOCK = process.env.USE_MOCK === '1';
const CONNECTION_STRING = USE_MOCK ? '' : process.env.DATABASE_URL;

function createId(prefix = 'REQ') {
    const random = Math.floor(Math.random() * 10_000).toString().padStart(4, '0');
    return `${prefix}-${Date.now().toString().slice(-4)}${random}`;
}

async function bootstrap() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    const store = await connectDatabase(CONNECTION_STRING, seedState);
    if (!store.getState()) {
        store.setState(seedState);
    }

    const getState = () => store.getState() || seedState;

    app.get('/api/status', (_req, res) => {
        res.json({ status: 'ok', mock: !CONNECTION_STRING, timestamp: new Date().toISOString() });
    });

    app.get('/api/metrics', (_req, res) => {
        res.json(getState().metrics);
    });

    app.get('/api/trend', (req, res) => {
        const rangeKey = req.query.range || '7';
        const trend = getState().trend[rangeKey];
        res.json(trend ?? getState().trend['7']);
    });

    app.get('/api/capacity', (_req, res) => {
        res.json(getState().capacity);
    });

    app.get('/api/requests', (_req, res) => {
        res.json(getState().requests);
    });

    app.post('/api/requests', (req, res) => {
        const state = getState();
        const payload = req.body ?? {};
        const nextRequest = {
            id: createId(),
            patient: payload.patient,
            location: payload.location,
            symptoms: Array.isArray(payload.symptoms) ? payload.symptoms : [],
            appointment: payload.appointment || new Date().toISOString(),
            status: payload.status || 'new',
            owner: payload.owner || null
        };

        if (!nextRequest.patient || !nextRequest.location) {
            return res.status(400).json({ message: 'Требуются поля patient и location' });
        }

        const updated = {
            ...state,
            requests: [nextRequest, ...state.requests]
        };

        store.setState(updated);
        res.status(201).json(nextRequest);
    });

    app.get('/api/team', (_req, res) => {
        res.json(getState().team);
    });

    app.get('/api/timeline', (_req, res) => {
        res.json(getState().timeline);
    });

    app.put('/api/requests/:id/status', (req, res) => {
        const state = getState();
        const requestId = req.params.id;
        const status = req.body?.status;

        if (!status) {
            return res.status(400).json({ message: 'Поле status обязательно' });
        }

        const updatedRequests = state.requests.map(entry =>
            entry.id === requestId ? { ...entry, status } : entry
        );

        store.setState({ ...state, requests: updatedRequests });
        res.json(updatedRequests.find(entry => entry.id === requestId));
    });

    app.use((err, _req, res, _next) => {
        console.error('[api:error]', err);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    });

    app.listen(PORT, () => {
        console.log(`Dashboard API listening on port ${PORT} (mock=${!CONNECTION_STRING})`);
    });
}

bootstrap().catch(error => {
    console.error('Failed to start dashboard API', error);
    process.exit(1);
});
