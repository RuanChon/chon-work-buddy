export const EMPTY_DATA = {
  exams: [],
  practice: [],
  plans: [],
  mistakes: [],
  papers: [],
  checkins: {},
  settings: {}
};

export const BOARDS = [
  { key: 'verbal', name: '言语理解' },
  { key: 'logic', name: '逻辑推理' },
  { key: 'math', name: '数量关系' },
  { key: 'analysis', name: '资料分析' },
  { key: 'politics', name: '政治与常识' },
  { key: 'essay', name: '申论' }
];

export const PAPER_TYPES = ['行测', '申论', '综应'];

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : 'id' + Date.now() + Math.random().toString(16).slice(2));

export const todayStr = () => new Date().toISOString().slice(0, 10);
