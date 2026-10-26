// Configuração lida das variáveis de ambiente A CADA requisição (o "kill switch" — esvaziar ASK_ENABLED na Vercel — e os testes funcionam sem
// reiniciar nada). Segredos (HF_TOKEN, UPSTASH_*) só existem nas variáveis de ambiente da Vercel. Neste app só há a explicação gerada (/api/ask)
// num Space do Hugging Face; não há NLU na nuvem nem reserva no Modal (S4 do plano).

const ORIGENS_PADRAO = ['https://saibatudo.net', 'https://www.saibatudo.net', 'https://saibatudo-llms.vercel.app'];

function inteiro(valor, padrao, min, max) {
  if (valor === undefined || valor === null || String(valor).trim() === '') return padrao;
  const n = Number(valor);
  if (!Number.isFinite(n)) return padrao;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/** Aceita https:// (e http://localhost/127.0.0.1 para desenvolvimento). Devolve a URL ou ''. */
function urlSegura(valor) {
  const s = (valor ?? '').trim();
  if (!s) return '';
  try {
    const u = new URL(s);
    const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (u.protocol === 'https:' || (u.protocol === 'http:' && local)) return u.toString();
  } catch { /* inválida */ }
  return '';
}

export function parseOrigins(valor) {
  const lista = String(valor ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return lista.length ? lista : [...ORIGENS_PADRAO];
}

export function readConfig(env = process.env) {
  return {
    // --- Explicação gerada (/api/ask). DESLIGADA por padrão: só liga com ASK_ENABLED=1 E o Space configurado (URL https + token).
    askEnabled: (env.ASK_ENABLED ?? '').trim() === '1',
    askModelVersion: (env.ASK_MODEL_VERSION ?? '').trim() || 'dev',
    hfAskUrl: urlSegura(env.HF_ASK_SPACE_URL),
    hfToken: (env.HF_TOKEN ?? '').trim(),
    askHfDailyBudget: inteiro(env.HF_ASK_DAILY_BUDGET, 200, 0, 100_000),
    askHfTimeoutMs: inteiro(env.HF_ASK_TIMEOUT_MS, 25000, 1000, 60000),

    // --- limites por cliente
    rateIpPerMin: inteiro(env.RATE_IP_PER_MIN, 20, 1, 10_000),
    rateIidPerDay: inteiro(env.RATE_IID_PER_DAY, 60, 1, 100_000),
    cacheTtlMs: inteiro(env.CACHE_TTL_SECONDS, 3600, 1, 86_400) * 1000,
    cacheMax: inteiro(env.CACHE_MAX_ENTRIES, 500, 10, 5000),

    // --- CORS
    allowedOrigins: parseOrigins(env.ALLOWED_ORIGINS),

    // --- saúde
    version: (env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7) || 'dev',
  };
}

/** Space do Hugging Face configurado (URL https + token)? */
export const askTemHf = (cfg) => Boolean(cfg.hfAskUrl && cfg.hfToken);

/** O /api/ask está ligado? O kill switch tem de ser inequívoco: chave + provedor. */
export const askAtivo = (cfg) => Boolean(cfg.askEnabled && askTemHf(cfg));
