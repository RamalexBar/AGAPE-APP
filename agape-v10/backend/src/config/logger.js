const pino = require('pino');
const env = require('./env');

// pino() espera un stream real como segundo argumento, no un objeto de
// configuración — pasar el objeto {target, options} directo (sin pasar por
// pino.transport()) hacía que cualquier logger.info/error/warn crasheara el
// proceso con "stream.write is not a function" en cuanto arrancaba el
// servidor en modo development (NODE_ENV=development, el valor por defecto).
const transport = env.NODE_ENV === 'development'
  ? pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    })
  : undefined;

const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: {
    env: env.NODE_ENV,
  },
}, transport);

module.exports = logger;
