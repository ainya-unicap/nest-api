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

// Pedido de recuperação de senha: limite por IP (evita um único IP varrendo
// e-mails em sequência) ...
export const passwordRecoveryIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Muitas tentativas. Tente novamente em 15 minutos.',
  },
});

// ... e por e-mail (evita floodar uma conta específica a partir de IPs
// diferentes). O keyGenerator cai pro IP quando o body ainda não tem e-mail
// legível (ex.: JSON malformado), pra nunca ficar sem chave de limite.
export const passwordRecoveryEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    return email || req.ip || 'sem-email';
  },
  message: {
    error: 'Muitas tentativas para este e-mail. Tente novamente em 15 minutos.',
  },
});
