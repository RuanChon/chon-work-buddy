const { readHotNews, shanghaiNowParts, updateHotNews } = require('./hotNews');

const current = readHotNews();
const { date: today } = shanghaiNowParts();
const forceRefresh = process.env.FORCE_REFRESH === 'true';

if (!forceRefresh && current.date === today && current.items?.length) {
  console.log(`[hot-news] ${today} already exists, skipping scheduled retry`);
  process.exit(0);
}

updateHotNews()
  .then((data) => {
    console.log(`[hot-news] wrote ${data.items.length} items for ${data.date}`);
  })
  .catch((error) => {
    console.error('[hot-news] fetch failed:', error);
    process.exitCode = 1;
  });
