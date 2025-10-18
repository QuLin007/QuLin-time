const fetch = require('node-fetch');

let cache = {}; // simple in-memory cache per instance

function buildTianApiUrl(dateStr) {
  return `https://api.tianapi.com/huangli/index?key=${process.env.TIANAPI_KEY}&date=${dateStr}`;
}
function buildJuheApiUrl(dateStr) {
  return `http://apis.juhe.cn/fapig/huangli/day?key=${process.env.JUHE_KEY}&date=${dateStr}`;
}

function normalizeApiResponse(raw, provider) {
  if (provider === 'tianapi') {
    const item = raw?.newslist?.[0] || {};
    return {
      gregorian: item.date || '',
      lunar: item.lunar || '',
      ganzhi: item.ganzhi || '',
      yi: item.yi || '',
      ji: item.ji || '',
      solarTerm: item.jieqi || '',
      wuxing: item.wuxing || '',
      zodiac: item.shengxiao || '',
      raw,
    };
  } else {
    const item = raw?.result || {};
    return {
      gregorian: item.date || '',
      lunar: item.lunar || '',
      ganzhi: item.ganzhi || '',
      yi: item.yi || '',
      ji: item.ji || '',
      solarTerm: item.jieqi || '',
      wuxing: item.wuxing || '',
      zodiac: item.shengxiao || '',
      raw,
    };
  }
}

module.exports = async (req, res) => {
  try {
    const date = (req.query && req.query.date) ? req.query.date : new Date().toISOString().slice(0,10);
    const key = `almanac:${date}`;
    if (cache[key] && (Date.now() - cache[key].ts < 1000 * 60 * 30)) {
      return res.json({ ok: true, source: 'cache', data: cache[key].data });
    }

    const provider = process.env.ALMANAC_PROVIDER || 'tianapi';
    const url = provider === 'juhe' ? buildJuheApiUrl(date) : buildTianApiUrl(date);
    const resp = await fetch(url, { timeout: 8000 });
    const raw = await resp.json();
    const normalized = normalizeApiResponse(raw, provider);

    // add simple next solar term placeholders (frontend can compute properly if desired)
    if(!normalized.nextSolarTermName){
      normalized.nextSolarTermName = normalized.solarTerm || '';
      normalized.daysUntilNext = null;
    }

    cache[key] = { ts: Date.now(), data: normalized };
    res.json({ ok: true, source: provider, data: normalized });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: String(err) });
  }
};
