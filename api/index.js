// Handler serverless da Vercel: reexporta o app Express montado pelo Nest.
// Requer `npm run build` antes (vercel-build já faz isso).
module.exports = require('../dist/index.js').default;
