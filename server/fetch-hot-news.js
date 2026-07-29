const { updateHotNews } = require('./hotNews');

updateHotNews()
  .then((data) => {
    console.log(`[hot-news] wrote ${data.items.length} items for ${data.date}`);
  })
  .catch((error) => {
    console.error('[hot-news] fetch failed:', error);
    process.exitCode = 1;
  });
