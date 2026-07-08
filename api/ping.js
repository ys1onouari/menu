export default async function handler(req, res) {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  const projectMatch = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/);
  const project = projectMatch ? projectMatch[1] : undefined;

  if (req.method !== 'GET') {
    console.warn(`[api/ping] Rejected ${req.method} — method not allowed`);
    res.setHeader('Allow', 'GET');
    res.status(405).json({
      ok: false,
      service: 'supabase',
      status: 'unreachable',
      httpStatus: 405,
      latency: 0,
      timestamp,
      project,
      error: `Method ${req.method} not allowed`,
    });
    return;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[api/ping] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    res.status(500).json({
      ok: false,
      service: 'supabase',
      status: 'unreachable',
      httpStatus: 500,
      latency: 0,
      timestamp,
      project,
      error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables',
    });
    return;
  }

  const controller = new AbortController();
  const TIMEOUT_MS = 10000;
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const SUPABASE_QUERY_PATH = '/rest/v1/keepalive?select=id&limit=1';

  try {
    console.log(`[api/ping] Starting — GET ${SUPABASE_QUERY_PATH}`);

    const response = await fetch(`${supabaseUrl}${SUPABASE_QUERY_PATH}`, {
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - start;

    if (response.ok) {
      console.log(`[api/ping] Completed — ${response.status} in ${latency}ms`);
      res.status(200).json({
        ok: true,
        service: 'supabase',
        status: 'reachable',
        httpStatus: response.status,
        latency,
        timestamp,
        project,
      });
    } else {
      console.warn(`[api/ping] Failed — HTTP ${response.status} in ${latency}ms`);
      res.status(503).json({
        ok: false,
        service: 'supabase',
        status: 'unreachable',
        httpStatus: response.status,
        latency,
        timestamp,
        project,
        error: `Supabase returned HTTP ${response.status}`,
      });
    }
  } catch (error) {
    clearTimeout(timeoutId);
    const latency = Date.now() - start;

    if (error.name === 'AbortError') {
      console.warn(`[api/ping] Timeout — ${TIMEOUT_MS}ms exceeded`);
      res.status(503).json({
        ok: false,
        service: 'supabase',
        status: 'timeout',
        httpStatus: 503,
        latency: TIMEOUT_MS,
        timestamp,
        project,
        error: `Request timed out after ${TIMEOUT_MS}ms`,
      });
    } else {
      console.error(`[api/ping] Error — ${error.message} in ${latency}ms`);
      res.status(503).json({
        ok: false,
        service: 'supabase',
        status: 'unreachable',
        httpStatus: 503,
        latency,
        timestamp,
        project,
        error: error.message,
      });
    }
  }
}
