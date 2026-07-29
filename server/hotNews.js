const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const HOT_NEWS_FILE = path.join(__dirname, '..', 'data', 'hot-news.json');
const FETCH_TIMEOUT_MS = 20000;
const SOURCE_LIMIT = 30;

const SOURCES = [
  {
    id: 'people',
    name: '人民网',
    homepage: 'https://www.people.com.cn/',
    pages: [
      { url: 'https://www.people.com.cn/', topic: '综合' },
      { url: 'https://politics.people.com.cn/', topic: '时政' },
      { url: 'https://society.people.com.cn/', topic: '社会' },
      { url: 'https://scitech.people.com.cn/', topic: '科普' }
    ],
    accepts(url) {
      return (
        (url.hostname === 'people.com.cn' || url.hostname.endsWith('.people.com.cn')) &&
        /\/n[12]\/20\d{2}\/\d{4}\//.test(url.pathname)
      );
    },
    dateFrom(url) {
      const match = url.pathname.match(/\/n[12]\/(20\d{2})\/(\d{2})(\d{2})\//);
      return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
    }
  },
  {
    id: 'qiushi',
    name: '求是网',
    homepage: 'https://www.qstheory.cn/',
    pages: [{ url: 'https://www.qstheory.cn/', topic: '时政' }],
    accepts(url) {
      return (
        (url.hostname === 'qstheory.cn' || url.hostname.endsWith('.qstheory.cn')) &&
        /\/20\d{6}\/[0-9a-f]{32}\/c\.html$/i.test(url.pathname)
      );
    },
    dateFrom(url) {
      const match = url.pathname.match(/\/(20\d{2})(\d{2})(\d{2})\//);
      return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
    }
  }
];

function shanghaiNowParts() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23'
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour)
  };
}

function cleanTitle(value) {
  return value.replace(/\s+/g, ' ').replace(/^[·•\s]+|[·•\s]+$/g, '').trim();
}

function normalizeUrl(href, homepage) {
  try {
    const url = new URL(href, homepage);
    if (url.protocol === 'http:') url.protocol = 'https:';
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}

function topicFromUrl(url, fallback) {
  if (url.hostname.startsWith('scitech.') || url.hostname.startsWith('health.')) return '科普';
  if (url.hostname.startsWith('society.') || url.hostname.startsWith('legal.')) return '社会';
  if (url.hostname.startsWith('politics.') || url.hostname.startsWith('opinion.')) return '时政';
  return fallback;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; chon-work-buddy-hot-news/1.0)',
      Accept: 'text/html,application/xhtml+xml'
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error(`${url} 返回 ${response.status}`);
  return response.text();
}

async function fetchSource(source, today) {
  const pageResults = await Promise.allSettled(
    (source.pages || [{ url: source.homepage, topic: '综合' }]).map(async (page) => ({
      ...page,
      html: await fetchHtml(page.url)
    }))
  );
  const seen = new Set();
  const candidates = [];

  for (const result of pageResults) {
    if (result.status !== 'fulfilled') continue;
    const page = result.value;
    const $ = cheerio.load(page.html);

    $('a[href]').each((_, element) => {
      const title = cleanTitle($(element).text());
      if (title.length < 8 || title.length > 90 || /^(更多|点击查看|查看往期)/.test(title)) return;

      const url = normalizeUrl($(element).attr('href'), page.url);
      if (!url || !source.accepts(url)) return;

      const key = title.toLocaleLowerCase('zh-CN');
      if (seen.has(key)) return;
      seen.add(key);

      candidates.push({
        id: crypto.createHash('sha1').update(`${source.id}:${url.href}`).digest('hex').slice(0, 16),
        source: source.id,
        sourceName: source.name,
        topic: topicFromUrl(url, page.topic),
        title,
        url: url.href,
        publishedDate: source.dateFrom(url)
      });
    });
  }

  if (!pageResults.some((result) => result.status === 'fulfilled')) {
    throw new Error(`${source.name} 页面均抓取失败`);
  }

  return candidates.filter((item) => item.publishedDate === today).slice(0, SOURCE_LIMIT);
}

function interleave(sourceLists) {
  const result = [];
  const seenTitles = new Set();
  const maxLength = Math.max(0, ...sourceLists.map((items) => items.length));
  for (let index = 0; index < maxLength; index += 1) {
    for (const items of sourceLists) {
      const item = items[index];
      if (!item) continue;
      const key = item.title.toLocaleLowerCase('zh-CN');
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);
      result.push(item);
    }
  }
  return result;
}

function readHotNews() {
  try {
    const data = JSON.parse(fs.readFileSync(HOT_NEWS_FILE, 'utf8'));
    if (Array.isArray(data.items)) return data;
  } catch {}
  return { date: '', generatedAt: '', sources: [], items: [], errors: [] };
}

async function updateHotNews() {
  const { date } = shanghaiNowParts();
  const results = await Promise.allSettled(SOURCES.map((source) => fetchSource(source, date)));
  const previous = readHotNews();
  const sourceLists = [];
  const errors = [];

  results.forEach((result, index) => {
    const source = SOURCES[index];
    if (result.status === 'fulfilled' && result.value.length) {
      sourceLists.push(result.value);
      return;
    }

    const fallback = previous.items
      .filter((item) => item.source === source.id && item.publishedDate === date)
      .slice(0, SOURCE_LIMIT);
    if (fallback.length) sourceLists.push(fallback);
    const reason = result.status === 'rejected' ? result.reason.message : '未找到可用标题';
    errors.push({ source: source.id, message: reason });
  });

  const items = interleave(sourceLists);
  if (!items.length) throw new Error('人民网和求是网均未抓取到可用标题');

  const data = {
    date,
    generatedAt: new Date().toISOString(),
    sources: SOURCES.map(({ id, name, homepage }) => ({ id, name, homepage })),
    items,
    errors
  };

  fs.mkdirSync(path.dirname(HOT_NEWS_FILE), { recursive: true });
  const temporaryFile = `${HOT_NEWS_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(temporaryFile, HOT_NEWS_FILE);
  return data;
}

function scheduleHotNewsRefresh() {
  let running = false;
  const tick = async () => {
    if (running) return;
    const current = readHotNews();
    const { date, hour } = shanghaiNowParts();
    if (current.date === date || (current.items.length && hour < 8)) return;

    running = true;
    try {
      const data = await updateHotNews();
      console.log(`[hot-news] updated ${data.date}, ${data.items.length} items`);
    } catch (error) {
      console.warn('[hot-news] update failed:', error.message);
    } finally {
      running = false;
    }
  };

  void tick();
  const timer = setInterval(tick, 5 * 60 * 1000);
  timer.unref();
}

module.exports = {
  HOT_NEWS_FILE,
  readHotNews,
  scheduleHotNewsRefresh,
  updateHotNews
};
