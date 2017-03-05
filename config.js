const path = require('path');
const HTTP_PORT = process.env.SPIRIT_HTTP_PORT || 3001;

const REDIS_HOST = process.env.SPIRIT_REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.SPIRIT_REDIS_PORT || 6379;
const REDIS_URL = 'redis://' + REDIS_HOST + ':' + REDIS_PORT + '/1';

const SECRET = process.env.SPIRIT_SESSIONS_SECRET || 'spirit.io';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Avoids DEPTH_ZERO_SELF_SIGNED_CERT error for self-signed certs
exports.config = {
    system: {
        exposeStack: true
    },
    host: 'localhost',
    port: HTTP_PORT,
    https: false,
    certs: path.resolve(path.join(process.cwd(), '../certs')),
    store: {
        name: 'redis-store',
        connection: {
            uri: REDIS_URL,
            options: {}
        }
    },
    sessions: {
        secret: SECRET,
        cookieName: 'sio.sid',
        redis: {
            ttl: 12000
        }
    },
    services: {
        'sio-users': {
            type: 'http',
            host: 'localhost',
            port: 3000
        }
    }
};