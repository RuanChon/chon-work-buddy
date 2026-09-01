const MODULES = [
  {
    key: 'politics',
    title: '政治理论',
    tone: 'rose',
    rows: [
      {
        stage: '全阶段',
        teacher: <><strong>小黑</strong> 或 <strong>超哥</strong></>,
        courses: [{ label: '全家桶', tone: 'pink' }],
        note: '—'
      }
    ]
  },
  {
    key: 'verbal',
    title: '言语理解与表达',
    tone: 'orange',
    rows: [
      {
        stage: '全阶段',
        teacher: <><strong>张弓</strong>、<strong>雨菲</strong></>,
        courses: [
          { label: '上岸村', tone: 'orange' },
          { label: '全家桶', tone: 'pink' }
        ],
        note: '—'
      },
      {
        stage: '全阶段',
        teacher: <strong>花生十三</strong>,
        courses: [{ label: '系统班', tone: 'blue' }],
        note: '或替代方案',
        mutedNote: true
      }
    ]
  },
  {
    key: 'reasoning',
    title: '判断推理',
    tone: 'yellow',
    rows: [
      {
        stage: '定义判断',
        teacher: <span className="route-muted">— 未推荐 —</span>,
        courses: [],
        note: '没特别认真听过课',
        mutedNote: true
      },
      {
        stage: '图形推理',
        teacher: <strong>刘文恒</strong>,
        courses: [
          { label: '超格', tone: 'purple' },
          { label: '全家桶', tone: 'pink' }
        ],
        note: '含 700 题'
      },
      {
        stage: '逻辑判断',
        teacher: <strong>薛睿</strong>,
        courses: [
          { label: '字母站', tone: 'cyan' },
          { label: '免费课', tone: 'green' }
        ],
        note: '—'
      },
      {
        stage: '类比推理',
        teacher: <strong>聂佳</strong>,
        courses: [
          { label: '字母站', tone: 'cyan' },
          { label: '免费课', tone: 'green' }
        ],
        note: '抖音 23 年免费课'
      }
    ]
  },
  {
    key: 'data',
    title: '资料分析',
    tone: 'green',
    rows: [
      {
        stage: '全阶段',
        teacher: <><strong>高照</strong> 或 <strong>唐宋</strong></>,
        courses: [{ label: '全家桶', tone: 'pink' }],
        note: '—'
      },
      {
        stage: '有基础',
        teacher: <strong>花生十三</strong>,
        courses: [{ label: '系统班', tone: 'blue' }],
        note: '有基础建议听花生',
        mutedNote: true
      }
    ]
  },
  {
    key: 'math',
    title: '数量关系',
    tone: 'blue',
    rows: [
      {
        stage: '全阶段',
        teacher: <strong>王炎</strong>,
        courses: [
          { label: '字母站', tone: 'cyan' },
          { label: '免费课', tone: 'green' }
        ],
        note: '大满贯系列'
      }
    ]
  },
  {
    key: 'police',
    title: '公安专业知识',
    tone: 'indigo',
    rows: [
      {
        stage: '全阶段',
        teacher: <strong>母志文</strong>,
        courses: [{ label: '网盘资源', tone: 'blue' }],
        note: 'pdd'
      }
    ]
  }
]

function CourseTags({ courses }) {
  if (!courses.length) return <span>—</span>
  return (
    <div className="route-tags">
      {courses.map(course => (
        <span key={`${course.label}-${course.tone}`} className="route-tag">
          {course.label}
        </span>
      ))}
    </div>
  )
}

export default function LearningPath() {
  return (
    <div className="learning-path">
      <header className="route-intro">
        <div>
          <span className="route-eyebrow">备考课程推荐</span>
          <h2>学习路线</h2>
          <p>按模块和阶段选择适合自己的老师与课程，重复推荐可作为替代方案。</p>
        </div>
      </header>

      <div className="route-modules">
        {MODULES.map(module => (
          <section key={module.key} className="route-module">
            <div className="route-module-head">
              <h3>{module.title}</h3>
              <span>{module.rows.length} 条路线</span>
            </div>
            <div className="route-table-wrap">
              <table className="route-table">
                <thead>
                  <tr>
                    <th>子模块 / 阶段</th>
                    <th>推荐老师</th>
                    <th>课程类型</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  {module.rows.map((row, index) => (
                    <tr key={`${module.key}-${row.stage}-${index}`}>
                      <td data-label="阶段"><strong>{row.stage}</strong></td>
                      <td data-label="老师"><div className="route-teacher">{row.teacher}</div></td>
                      <td data-label="课程"><CourseTags courses={row.courses} /></td>
                      <td data-label="备注" className={row.mutedNote ? 'route-note-muted' : ''}>{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
