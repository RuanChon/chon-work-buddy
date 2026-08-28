export const EMPTY_DATA = {
  exams: [],
  practice: [],
  plans: [],
  mistakes: [],
  papers: [],
  checkins: {},
  // 每日固定计划按日期记录完成状态，跨天后自然回到“未完成”。
  dailyPlanStatus: {},
  settings: {},
  // 记录已删除条目的 id，避免多端“并集合并”时旧数据被重新带回来。
  _deleted: {
    exams: {},
    practice: {},
    plans: {},
    mistakes: {},
    papers: {}
  }
};

export const BOARDS = [
  { key: 'verbal', name: '言语理解' },
  { key: 'logic', name: '逻辑推理' },
  { key: 'math', name: '数量关系' },
  { key: 'analysis', name: '资料分析' },
  { key: 'politics', name: '政治与常识' },
  { key: 'police', name: '公专' },
  { key: 'essay', name: '申论' }
];

export const PAPER_TYPES = ['行测', '申论', '公专'];

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : 'id' + Date.now() + Math.random().toString(16).slice(2));

const pad = (value) => String(value).padStart(2, '0');

// 使用浏览器本地日期，避免北京时间 00:00–07:59 被 UTC 日期误判为前一天。
export const todayStr = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
