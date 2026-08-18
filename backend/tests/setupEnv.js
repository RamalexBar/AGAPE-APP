// Carga backend/.env.test ANTES de que src/index.js llame a dotenv.config():
// como dotenv no sobreescribe variables ya presentes en process.env, estas
// ganan y la suite no depende de tener un .env real con secretos.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.test') });
