const pino = require('pino');
const env = require('./env');

const transport = env.NODE_ENV === 'development'
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    }
  : undefined;

const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: {
    env: env.NODE_ENV,
  },
}, transport);

module.exports = logger;
