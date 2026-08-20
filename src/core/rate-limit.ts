import rateLimit from 'express-rate-limit';

// Limite anti brute-force no login: até 10 tentativas por IP a cada 15 min.
// Resposta padrão é HTTP 429.
//
// OBS produção (serverless/Vercel): o store padrão é em memória,
// então o limite é por instância de função (não global). Para uma
// proteção real em escala, trocar por um store externo (Redis/Upstash).
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  },
});
