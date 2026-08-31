/**
 * 课程表完整数据源、节假日配置与工具函数
 */
(function(global) {
  // 默认学期起始日 (2026-08-31 为第1周周一，9月7日为第2周周一)
  const DEFAULT_SEMESTER_START_DATE = '2026-08-31';

  // 默认作息时间配置 (大节次: 1-2, 3-4, 5-6, 7-8, 9-10)
  const DEFAULT_TIME_SLOTS = [
    { section: 1, periods: '1-2节', start: '08:00', end: '09:35', timeDesc: '08:00 - 09:35', part: 'morning' },
    { section: 2, periods: '3-4节', start: '10:05', end: '11:40', timeDesc: '10:05 - 11:40', part: 'morning' },
    { section: 3, periods: '5-6节', start: '14:00', end: '15:35', timeDesc: '14:00 - 15:35', part: 'afternoon' },
    { section: 4, periods: '7-8节', start: '15:55', end: '17:30', timeDesc: '15:55 - 17:30', part: 'afternoon' },
    { section: 5, periods: '9-10节', start: '19:00', end: '20:35', timeDesc: '19:00 - 20:35', part: 'evening' }
  ];

  // 课程卡片颜色主题库
  const COURSE_COLORS = {
    '计算机组成原理': { bg: 'rgba(99, 102, 241, 0.12)', border: '#6366f1', text: '#4338ca', darkText: '#a5b4fc', solid: '#4f46e5' },
    '操作系统': { bg: 'rgba(14, 165, 233, 0.12)', border: '#0ea5e9', text: '#0369a1', darkText: '#7dd3fc', solid: '#0284c7' },
    'Java语言程序设计': { bg: 'rgba(245, 158, 11, 0.12)', border: '#f59e0b', text: '#b45309', darkText: '#fcd34d', solid: '#d97706' },
    '软件建模原理': { bg: 'rgba(20, 184, 166, 0.12)', border: '#14b8a6', text: '#0f766e', darkText: '#5eead4', solid: '#0d9488' },
    '软件项目管理': { bg: 'rgba(16, 185, 129, 0.12)', border: '#10b981', text: '#047857', darkText: '#6ee7b7', solid: '#059669' },
    '软件质量保证与测试': { bg: 'rgba(34, 197, 94, 0.12)', border: '#22c55e', text: '#15803d', darkText: '#86efac', solid: '#16a34a' },
    '马克思主义基本原理': { bg: 'rgba(239, 68, 68, 0.12)', border: '#ef4444', text: '#b91c1c', darkText: '#fca5a5', solid: '#dc2626' },
    'Python数据挖掘与可视化': { bg: 'rgba(59, 130, 246, 0.12)', border: '#3b82f6', text: '#1d4ed8', darkText: '#93c5fd', solid: '#2563eb' },
    '软件工程专业英语': { bg: 'rgba(168, 85, 247, 0.12)', border: '#a855f7', text: '#7e22ce', darkText: '#d8b4fe', solid: '#9333ea' },
    'Hadoop大数据基础应用': { bg: 'rgba(139, 92, 246, 0.12)', border: '#8b5cf6', text: '#6d28d9', darkText: '#c4b5fd', solid: '#7c3aed' },
    '大学生心理健康教育（心理危机）': { bg: 'rgba(236, 72, 153, 0.12)', border: '#ec4899', text: '#be185d', darkText: '#f472b6', solid: '#db2777' },
    '形势与政策Ⅴ': { bg: 'rgba(249, 115, 22, 0.12)', border: '#f97316', text: '#c2410c', darkText: '#fdba74', solid: '#ea580c' }
  };

  /**
   * 节假日与停课安排
   */
  const HOLIDAYS = [
    {
      name: '中秋节',
      startDate: '2026-09-25',
      endDate: '2026-09-27',
      icon: '🥮',
      desc: '中秋节放假（9.25 - 9.27 停课）'
    },
    {
      name: '国庆节',
      startDate: '2026-10-01',
      endDate: '2026-10-07',
      icon: '🇨🇳',
      desc: '国庆节放假（10.1 - 10.7 停课）'
    }
  ];

  /**
   * 调休补课安排 (10.10 周六补课)
   */
  const ADJUSTMENTS = [
    {
      date: '2026-10-10',
      name: '国庆调休补课',
      replaceDay: 2, // 补星期二课程
      replaceDayName: '星期二',
      icon: '⏰',
      desc: '10月10日（周六）按【星期二】课表补课'
    }
  ];

  /**
   * 完整课程列表 (从图片精准提取)
   * day: 1(周一) - 7(周日)
   * section: 1(1-2节), 2(3-4节), 3(5-6节), 4(7-8节), 5(9-10节)
   */
  const RAW_COURSES = [
    // --- 星期一 ---
    {
      id: 'mon-34-1',
      name: '计算机组成原理',
      day: 1,
      section: 2,
      periods: '3-4节',
      weeksRaw: '2-18双(3,4)',
      weeks: [2, 4, 6, 8, 10, 12, 14, 16, 18],
      teacher: '胡美辰',
      room: 'C403',
      capacity: 0,
      type: '专业必修',
      note: '双周上课'
    },
    {
      id: 'mon-34-2',
      name: '操作系统',
      day: 1,
      section: 2,
      periods: '3-4节',
      weeksRaw: '3,7-17单(3,4)',
      weeks: [3, 7, 9, 11, 13, 15, 17],
      teacher: '魏金玉',
      room: 'C403',
      capacity: 0,
      type: '专业必修',
      note: '单周上课 (第3周, 第7-17单周)'
    },
    {
      id: 'mon-78-1',
      name: '马克思主义基本原理',
      day: 1,
      section: 4,
      periods: '7-8节',
      weeksRaw: '3,7-17单(7,8)',
      weeks: [3, 7, 9, 11, 13, 15, 17],
      teacher: '邓君兰',
      room: 'D401',
      capacity: 0,
      type: '通识必修',
      note: '单周上课 (第3周, 第7-17单周)'
    },
    {
      id: 'mon-910-1',
      name: '形势与政策Ⅴ',
      day: 1,
      section: 5,
      periods: '9-10节',
      weeksRaw: '13-14(9,10)',
      weeks: [13, 14],
      teacher: '代正榆',
      room: '毓秀201',
      capacity: 0,
      type: '通识必修',
      note: '短期集中授课 (第13-14周)'
    },
    {
      id: 'mon-910-2',
      name: '大学生心理健康教育（心理危机）',
      day: 1,
      section: 5,
      periods: '9-10节',
      weeksRaw: '7-8(9,10)',
      weeks: [7, 8],
      teacher: '蒲昭君',
      room: '毓秀201',
      capacity: 0,
      type: '通识必修',
      note: '短期集中授课 (第7-8周)'
    },

    // --- 星期二 ---
    {
      id: 'tue-34-1',
      name: 'Java语言程序设计',
      day: 2,
      section: 2,
      periods: '3-4节',
      weeksRaw: '2-18双(3,4)',
      weeks: [2, 4, 6, 8, 10, 12, 14, 16, 18],
      teacher: '田小东',
      room: 'A502',
      capacity: 0,
      type: '专业必修',
      note: '双周上课'
    },
    {
      id: 'tue-56-1',
      name: '软件项目管理',
      day: 2,
      section: 3,
      periods: '5-6节',
      weeksRaw: '2-4,6-18(5,6)',
      weeks: [2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      teacher: '张玉洁',
      room: '毓秀楼二机房',
      capacity: 0,
      type: '专业必修',
      note: '机房上机 (第5周停课)'
    },
    {
      id: 'tue-78-1',
      name: '马克思主义基本原理',
      day: 2,
      section: 4,
      periods: '7-8节',
      weeksRaw: '2-4,6-18(7,8)',
      weeks: [2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      teacher: '邓君兰',
      room: 'C609',
      capacity: 0,
      type: '通识必修',
      note: '第2-4周, 第6-18周 (第5周停课)'
    },
    {
      id: 'tue-910-1',
      name: 'Hadoop大数据基础应用',
      day: 2,
      section: 5,
      periods: '9-10节',
      weeksRaw: '2-4,6-18(9,10)',
      weeks: [2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      teacher: '卢文婷',
      room: 'A502',
      capacity: 0,
      type: '专业必修',
      note: '第2-4周, 第6-18周 (第5周停课)'
    },

    // --- 星期三 ---
    {
      id: 'wed-34-1',
      name: 'Java语言程序设计',
      day: 3,
      section: 2,
      periods: '3-4节',
      weeksRaw: '2-4,6-18(3,4)',
      weeks: [2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      teacher: '田小东',
      room: 'A502',
      capacity: 0,
      type: '专业必修',
      note: '第2-4周, 第6-18周 (第5周停课)'
    },
    {
      id: 'wed-78-1',
      name: 'Python数据挖掘与可视化',
      day: 3,
      section: 4,
      periods: '7-8节',
      weeksRaw: '2-4,6-18(7,8)',
      weeks: [2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      teacher: '吴宇',
      room: 'A506',
      capacity: 0,
      type: '专业选修',
      note: '第2-4周, 第6-18周 (第5周停课)'
    },
    {
      id: 'wed-910-1',
      name: '计算机组成原理',
      day: 3,
      section: 5,
      periods: '9-10节',
      weeksRaw: '2-4,6-18(9,10)',
      weeks: [2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      teacher: '胡美辰',
      room: '钟灵楼（6号楼）204',
      capacity: 0,
      type: '专业必修',
      note: '第2-4周, 第6-18周 (第5周停课)'
    },

    // --- 星期四 ---
    {
      id: 'thu-12-1',
      name: '软件建模原理',
      day: 4,
      section: 1,
      periods: '1-2节',
      weeksRaw: '2-4,6-18(1,2)',
      weeks: [2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      teacher: '魏青锦',
      room: '毓秀楼五机房',
      capacity: 0,
      type: '专业必修',
      note: '机房上机 (第5周停课)'
    },
    {
      id: 'thu-34-1',
      name: '操作系统',
      day: 4,
      section: 2,
      periods: '3-4节',
      weeksRaw: '2-4,6-18(3,4)',
      weeks: [2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      teacher: '魏金玉',
      room: 'C402',
      capacity: 0,
      type: '专业必修',
      note: '第2-4周, 第6-18周 (第5周停课)'
    },
    {
      id: 'thu-56-1',
      name: '软件质量保证与测试',
      day: 4,
      section: 3,
      periods: '5-6节',
      weeksRaw: '3,7-17单(5,6)',
      weeks: [3, 7, 9, 11, 13, 15, 17],
      teacher: '董波',
      room: 'A506',
      capacity: 0,
      type: '专业必修',
      note: '单周上课 (第3周, 第7-17单周)'
    },
    {
      id: 'thu-78-1',
      name: '软件工程专业英语',
      day: 4,
      section: 4,
      periods: '7-8节',
      weeksRaw: '2-4,6-18(7,8)',
      weeks: [2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      teacher: '葛腾飞',
      room: 'C312',
      capacity: 0,
      type: '专业必修',
      note: '第2-4周, 第6-18周 (第5周停课)'
    },

    // --- 星期五 ---
    {
      id: 'fri-34-1',
      name: '软件质量保证与测试',
      day: 5,
      section: 2,
      periods: '3-4节',
      weeksRaw: '2-4,6-18(3,4)',
      weeks: [2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      teacher: '董波',
      room: '毓秀楼一机房',
      capacity: 0,
      type: '专业必修',
      note: '机房上机 (第5周停课)'
    }
  ];

  const WEEK_DAYS = [
    { day: 1, name: '周一', full: '星期一' },
    { day: 2, name: '周二', full: '星期二' },
    { day: 3, name: '周三', full: '星期三' },
    { day: 4, name: '周四', full: '星期四' },
    { day: 5, name: '周五', full: '星期五' },
    { day: 6, name: '周六', full: '星期六' },
    { day: 7, name: '周日', full: '星期日' }
  ];

  function isCourseActiveInWeek(course, week) {
    return course.weeks.includes(Number(week));
  }

  /**
   * 精确计算当前日期对应的实际教学周
   */
  function calculateCurrentWeek(startDateStr) {
    const base = startDateStr || DEFAULT_SEMESTER_START_DATE;
    const [y, m, d] = base.split('-').map(Number);
    const start = new Date(y, m - 1, d);
    const now = new Date();
    
    const startZero = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffTime = nowZero - startZero;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 1;
    }
    
    const weekNumber = Math.floor(diffDays / 7) + 1;
    return Math.min(Math.max(weekNumber, 1), 20);
  }

  /**
   * 获取今日是星期几 (1=周一, 7=周日)
   */
  function getCurrentDayOfWeek() {
    const day = new Date().getDay();
    return day === 0 ? 7 : day;
  }

  /**
   * 根据开学第一周周一、周次、星期几计算具体公历日期对象
   */
  function getDateByWeekAndDay(startDateStr, week, day) {
    const base = startDateStr || DEFAULT_SEMESTER_START_DATE;
    const [y, m, d] = base.split('-').map(Number);
    const start = new Date(y, m - 1, d);
    const daysOffset = (week - 1) * 7 + (day - 1);
    start.setDate(start.getDate() + daysOffset);
    return start;
  }

  /**
   * 格式化 Date 为 YYYY-MM-DD
   */
  function formatDateString(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  /**
   * 获取指定日期的节假日信息（若没有返回 null）
   */
  function getHolidayInfo(dateStr) {
    for (const h of HOLIDAYS) {
      if (dateStr >= h.startDate && dateStr <= h.endDate) {
        return h;
      }
    }
    return null;
  }

  /**
   * 获取指定日期的调休补课信息（若没有返回 null）
   */
  function getAdjustmentInfo(dateStr) {
    for (const adj of ADJUSTMENTS) {
      if (dateStr === adj.date) {
        return adj;
      }
    }
    return null;
  }

  // 挂载到全局
  global.KCB_DATA = {
    DEFAULT_SEMESTER_START_DATE,
    DEFAULT_TIME_SLOTS,
    COURSE_COLORS,
    HOLIDAYS,
    ADJUSTMENTS,
    RAW_COURSES,
    WEEK_DAYS,
    isCourseActiveInWeek,
    calculateCurrentWeek,
    getCurrentDayOfWeek,
    getDateByWeekAndDay,
    formatDateString,
    getHolidayInfo,
    getAdjustmentInfo
  };
})(typeof window !== 'undefined' ? window : global);
