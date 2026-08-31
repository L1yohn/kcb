/**
 * 课程表应用核心交互逻辑 - 精确识别当前时间、自动跳转今日日程、智能倒计时与节假日
 * （精简专注模式：今日日程 + 周课表）
 */
(function() {
  const { 
    RAW_COURSES, 
    DEFAULT_TIME_SLOTS, 
    DEFAULT_SEMESTER_START_DATE,
    COURSE_COLORS, 
    WEEK_DAYS, 
    HOLIDAYS,
    ADJUSTMENTS,
    isCourseActiveInWeek, 
    calculateCurrentWeek, 
    getCurrentDayOfWeek,
    getDateByWeekAndDay,
    formatDateString,
    getHolidayInfo,
    getAdjustmentInfo
  } = window.KCB_DATA;

  function getStorage(key, fallback) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? val : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function setStorage(key, val) {
    try {
      localStorage.setItem(key, val);
    } catch (e) {}
  }

  // 全局响应式状态
  const state = {
    activeTab: 'today',
    semesterStartDate: getStorage('kcb_start_date', DEFAULT_SEMESTER_START_DATE),
    currentWeek: 1,
    selectedWeek: 1,
    todayDay: 1,
    selectedDay: 1,
    filterOnlyActiveGrid: true,
    showWeekends: false,
    theme: getStorage('kcb_theme', 'auto'),
    timeSlots: DEFAULT_TIME_SLOTS
  };

  // 初始化入口
  function init() {
    initTheme();
    refreshRealTimeState();
    bindEvents();
    renderAll();
    startStatusTicker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 刷新当前真实时间、周次和星期
  function refreshRealTimeState() {
    state.currentWeek = calculateCurrentWeek(state.semesterStartDate);
    state.todayDay = getCurrentDayOfWeek();
    state.selectedWeek = state.currentWeek;
    state.selectedDay = state.todayDay;
  }

  function initTheme() {
    const savedTheme = state.theme;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (savedTheme === 'auto' && prefersDark);
    
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function bindEvents() {
    // 底部 Tab 导航
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
      });
    });

    // 主题切换
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
          document.documentElement.removeAttribute('data-theme');
          state.theme = 'light';
          localStorage.setItem('kcb_theme', 'light');
        } else {
          document.documentElement.setAttribute('data-theme', 'dark');
          state.theme = 'dark';
          localStorage.setItem('kcb_theme', 'dark');
        }
      });
    }

    // 手机扫码分享
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        openShareModal();
      });
    }

    // 弹窗关闭监听
    document.querySelectorAll('.modal-close-btn, .modal-overlay').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target === el || el.classList.contains('modal-close-btn')) {
          closeModals();
        }
      });
    });

    // 网格模式：仅看本周过滤切换
    const gridToggleBtn = document.getElementById('grid-toggle-filter');
    if (gridToggleBtn) {
      gridToggleBtn.addEventListener('click', () => {
        state.filterOnlyActiveGrid = !state.filterOnlyActiveGrid;
        gridToggleBtn.classList.toggle('active', state.filterOnlyActiveGrid);
        gridToggleBtn.innerText = state.filterOnlyActiveGrid ? '✅ 仅看本周有课' : '👀 显示所有周课程';
        renderWeekGrid();
      });
    }
  }

  function switchTab(tab) {
    state.activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    document.querySelectorAll('.view-content').forEach(v => {
      v.classList.toggle('active', v.id === `view-${tab}`);
    });

    if (tab === 'today') {
      goToToday();
    } else if (tab === 'week') {
      renderWeekGrid();
    }
  }

  // 精准回到真实今日
  window.goToToday = function() {
    refreshRealTimeState();
    renderWeekScroller();
    renderTodayView();
    renderWeekGrid();
  };

  // 跳转到指定周次
  window.goToWeek = function(weekNum) {
    state.selectedWeek = Number(weekNum);
    renderWeekScroller();
    renderTodayView();
    renderWeekGrid();
  };

  function renderAll() {
    renderWeekScroller();
    renderTodayView();
    renderWeekGrid();
  }

  // 渲染顶部周次滑动条 (第1周 ~ 第18周)
  function renderWeekScroller() {
    const container = document.getElementById('week-scroller');
    if (!container) return;

    container.innerHTML = '';
    for (let w = 1; w <= 18; w++) {
      const pill = document.createElement('button');
      const isSelected = (w === state.selectedWeek);
      const isCurrentRealWeek = (w === state.currentWeek);
      
      pill.className = `week-pill ${isSelected ? 'active' : ''} ${isCurrentRealWeek ? 'current-tag' : ''}`;
      
      let extraTag = '';
      if (w === 4) extraTag = ' 🥮中秋';
      else if (w === 5) extraTag = ' 🇨🇳国庆';
      else if (w === 6) extraTag = ' ⏰调休';
      else if (isCurrentRealWeek) extraTag = ' (本周)';

      pill.innerText = `第 ${w} 周${extraTag}`;
      pill.onclick = () => {
        state.selectedWeek = w;
        renderWeekScroller();
        renderTodayView();
        renderWeekGrid();
      };
      container.appendChild(pill);
    }

    const activePill = container.querySelector('.week-pill.active');
    if (activePill) {
      activePill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  // 获取某一节课在当前时间的实时状态（待上课、进行中、已结课）
  function getClassTimeStatus(slot) {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = slot.start.split(':').map(Number);
    const [endH, endM] = slot.end.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    if (currentMins < startMins) {
      const diff = startMins - currentMins;
      return { status: 'upcoming', label: `待上课 · ${diff}分钟后`, diff };
    } else if (currentMins >= startMins && currentMins <= endMins) {
      const remain = endMins - currentMins;
      return { status: 'ongoing', label: `🔴 上课中 · 剩${remain}分钟`, remain };
    } else {
      return { status: 'finished', label: '✔️ 已结课' };
    }
  }

  // ==========================================================================
  // 1. 渲染今日日程 (精准识别当前日期、自动跳转、实时状态计算)
  // ==========================================================================
  function renderTodayView() {
    const container = document.getElementById('today-course-list');
    const summaryBox = document.getElementById('today-summary-box');
    const daySwitcher = document.getElementById('weekday-switcher');
    if (!container || !summaryBox || !daySwitcher) return;

    // 星期快捷切换器
    daySwitcher.innerHTML = WEEK_DAYS.map(d => {
      const isRealToday = (d.day === state.todayDay && state.selectedWeek === state.currentWeek);
      const isSelected = d.day === state.selectedDay;
      const dayDate = getDateByWeekAndDay(state.semesterStartDate, state.selectedWeek, d.day);
      const dateStr = formatDateString(dayDate);
      const hol = getHolidayInfo(dateStr);
      const adj = getAdjustmentInfo(dateStr);

      let badge = '';
      if (hol) badge = `<span style="font-size:9px; display:block; color:#ef4444; font-weight:600;">${hol.name.slice(0,2)}</span>`;
      else if (adj) badge = `<span style="font-size:9px; display:block; color:#f59e0b; font-weight:600;">调休</span>`;
      else badge = `<span style="font-size:9px; display:block; opacity:0.6;">${dayDate.getMonth()+1}/${dayDate.getDate()}</span>`;

      return `
        <button class="weekday-btn ${isSelected ? 'active' : ''} ${isRealToday ? 'today-highlight' : ''}" data-day="${d.day}">
          <div>${d.name}</div>
          ${badge}
        </button>
      `;
    }).join('');

    daySwitcher.querySelectorAll('.weekday-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedDay = Number(btn.dataset.day);
        renderTodayView();
      });
    });

    // 计算当前查看的具体日期
    const targetDate = getDateByWeekAndDay(state.semesterStartDate, state.selectedWeek, state.selectedDay);
    const targetDateStr = formatDateString(targetDate);
    const holiday = getHolidayInfo(targetDateStr);
    const adjustment = getAdjustmentInfo(targetDateStr);

    const currentDayName = WEEK_DAYS.find(d => d.day === state.selectedDay)?.full || '';
    const isActualToday = (state.selectedDay === state.todayDay && state.selectedWeek === state.currentWeek);
    const dateFormatted = `${targetDate.getFullYear()}年${targetDate.getMonth() + 1}月${targetDate.getDate()}日`;

    // 调休补课日按补课星期获取课程，正常日按当天星期获取
    let dayCourses = [];
    if (adjustment) {
      dayCourses = RAW_COURSES.filter(c => c.day === adjustment.replaceDay);
    } else {
      dayCourses = RAW_COURSES.filter(c => c.day === state.selectedDay);
    }

    const activeDayCourses = holiday ? [] : dayCourses.filter(c => isCourseActiveInWeek(c, state.selectedWeek));
    activeDayCourses.sort((a, b) => a.section - b.section);
    dayCourses.sort((a, b) => a.section - b.section);

    // 实时课程进度状态计算
    let liveStatusText = '';
    let ongoingCourse = null;
    let nextCourse = null;

    if (isActualToday && activeDayCourses.length > 0 && !holiday) {
      for (const c of activeDayCourses) {
        const slot = state.timeSlots.find(s => s.section === c.section);
        if (slot) {
          const timeStat = getClassTimeStatus(slot);
          if (timeStat.status === 'ongoing' && !ongoingCourse) {
            ongoingCourse = { course: c, slot, timeStat };
          } else if (timeStat.status === 'upcoming' && !nextCourse) {
            nextCourse = { course: c, slot, timeStat };
          }
        }
      }

      if (ongoingCourse) {
        liveStatusText = `🔴 <strong>正在上课</strong>：${ongoingCourse.course.name} (${ongoingCourse.course.room}) · 剩 ${ongoingCourse.timeStat.remain} 分钟下课`;
      } else if (nextCourse) {
        liveStatusText = `⏳ <strong>下一节课</strong>：${nextCourse.slot.start} ${nextCourse.course.name} · ${nextCourse.course.room}`;
      } else {
        liveStatusText = `🎉 今日所有课程已结束，享受课后时间吧！`;
      }
    } else if (holiday) {
      liveStatusText = `${holiday.desc}，祝假期愉快！🌴`;
    } else if (adjustment) {
      liveStatusText = `${adjustment.desc}，请准时出勤！⏰`;
    } else {
      liveStatusText = activeDayCourses.length > 0 
        ? `今日已排 <strong>${activeDayCourses.length}</strong> 节课，请提前到教室 📖` 
        : `本日无上课安排，好好休息充个电吧 ☕`;
    }

    // 顶部 Summary 概览卡片
    summaryBox.innerHTML = `
      <div class="today-date-row">
        <div class="today-date">
          ${isActualToday ? '🌟 今天 · ' : ''}${dateFormatted} ${currentDayName}
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          ${!isActualToday ? `<button onclick="window.goToToday()" class="icon-btn" style="height:24px; font-size:11px; padding:0 8px; border-radius:12px; width:auto; background:rgba(255,255,255,0.25); color:white; border:none; cursor:pointer;">📍 回到今日</button>` : ''}
          <span class="today-week-badge">第 ${state.selectedWeek} 周 ${isActualToday ? '(本周)' : ''}</span>
        </div>
      </div>
      <div class="today-status-text">
        ${liveStatusText}
      </div>
    `;

    // 如果当天是假期，展示放假卡片
    if (holiday) {
      container.innerHTML = `
        <div class="empty-course-state" style="border-color: #fca5a5; background: rgba(239,68,68,0.04);">
          <div class="empty-icon">${holiday.icon}</div>
          <h3 style="font-size: 16px; color:#dc2626;">${holiday.name}放假中</h3>
          <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">${holiday.desc}</p>
        </div>
      `;
      return;
    }

    if (dayCourses.length === 0 || activeDayCourses.length === 0) {
      const isWeek1 = (state.selectedWeek === 1);
      container.innerHTML = `
        <div class="empty-course-state">
          <div class="empty-icon">🏖️</div>
          <h3 style="font-size: 16px; margin-bottom: 4px;">本日无课程安排</h3>
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
            ${isWeek1 ? '课程将于 <strong>9月7日（第 2 周）</strong> 正式开始' : '可以前往图书馆自习或自学编程'}
          </p>
          ${isWeek1 ? `<button onclick="window.goToWeek(2)" class="primary-btn" style="width:auto; padding:8px 16px; margin:0 auto; font-size:13px;">👉 切换查看 9月7日（第 2 周）课表</button>` : ''}
        </div>
      `;
      return;
    }

    container.innerHTML = dayCourses.map(course => {
      const isActive = isCourseActiveInWeek(course, state.selectedWeek);
      const slot = state.timeSlots.find(s => s.section === course.section) || { timeDesc: course.periods, start: '', end: '' };
      const color = COURSE_COLORS[course.name] || { bg: 'rgba(99,102,241,0.1)', border: '#6366f1', text: '#4f46e5', solid: '#4f46e5' };

      let liveBadge = '';
      if (isActualToday && isActive && slot.start) {
        const timeStat = getClassTimeStatus(slot);
        if (timeStat.status === 'ongoing') {
          liveBadge = `<span class="course-tag" style="background:#fee2e2; color:#dc2626; border:1px solid #f87171; font-weight:700;">🔴 正在上课</span>`;
        } else if (timeStat.status === 'upcoming') {
          liveBadge = `<span class="course-tag" style="background:#fef3c7; color:#d97706; border:1px solid #fcd34d;">⏳ 待上课</span>`;
        } else if (timeStat.status === 'finished') {
          liveBadge = `<span class="course-tag" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1;">✔️ 已结课</span>`;
        }
      }

      return `
        <div class="course-item-card ${isActive ? '' : 'is-inactive'}" onclick="window.showCourseDetail('${course.id}')" style="border-left: 4px solid ${color.solid};">
          <div class="course-item-left">
            <span class="time-slot-name">${course.periods}</span>
            <span class="time-slot-range">${slot.timeDesc}</span>
          </div>
          <div class="course-item-body">
            <div class="course-header-row">
              <div class="course-title" style="color: ${isActive ? color.solid : 'inherit'}">
                ${adjustment ? `<span style="font-size:11px; color:#d97706;">[调休] </span>` : ''}${course.name}
              </div>
              <div style="display:flex; align-items:center; gap:4px;">
                ${liveBadge}
                <span class="course-tag" style="background: ${color.bg}; color: ${color.text}; border: 1px solid ${color.border}">
                  ${isActive ? '本周有课' : '非本周'}
                </span>
              </div>
            </div>
            <div class="course-meta-row">
              <div class="meta-item">
                <span class="meta-icon">📍</span>
                <strong>${course.room}</strong>
              </div>
              <div class="meta-item">
                <span class="meta-icon">👨‍🏫</span>
                <span>${course.teacher}</span>
              </div>
              <div class="meta-item">
                <span class="meta-icon">📅</span>
                <span>${course.weeksRaw}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ==========================================================================
  // 2. 渲染周课表网格视图
  // ==========================================================================
  function renderWeekGrid() {
    const container = document.getElementById('timetable-grid-content');
    const wrapper = document.getElementById('timetable-scroll-wrapper');
    if (!container || !wrapper) return;

    const isWeek6 = state.selectedWeek === 6;
    const shouldShowWeekends = state.showWeekends || isWeek6;

    wrapper.classList.toggle('show-weekends', shouldShowWeekends);
    const totalDays = shouldShowWeekends ? 7 : 5;

    let gridHtml = `<div class="grid-header-cell" style="font-size: 10px;">节次</div>`;
    for (let d = 1; d <= totalDays; d++) {
      const isRealToday = (d === state.todayDay && state.selectedWeek === state.currentWeek);
      const colDate = getDateByWeekAndDay(state.semesterStartDate, state.selectedWeek, d);
      const colDateStr = formatDateString(colDate);
      const colHoliday = getHolidayInfo(colDateStr);
      const colAdj = getAdjustmentInfo(colDateStr);

      let subText = `${colDate.getMonth()+1}/${colDate.getDate()}`;
      if (colHoliday) subText = `<span style="color:#ef4444;font-weight:700;">${colHoliday.name.slice(0,2)}</span>`;
      if (colAdj) subText = `<span style="color:#d97706;font-weight:700;">调休</span>`;

      gridHtml += `
        <div class="grid-header-cell ${isRealToday ? 'is-today' : ''}">
          <div>${WEEK_DAYS[d - 1].name}</div>
          <div style="font-size:9px;opacity:0.75;margin-top:1px;">${subText}</div>
        </div>
      `;
    }

    state.timeSlots.forEach(slot => {
      gridHtml += `
        <div class="grid-time-cell">
          <span>${slot.section * 2 - 1}-${slot.section * 2}</span>
          <span class="grid-time-slot">${slot.start}</span>
          <span class="grid-time-slot">${slot.end}</span>
        </div>
      `;

      for (let d = 1; d <= totalDays; d++) {
        const colDate = getDateByWeekAndDay(state.semesterStartDate, state.selectedWeek, d);
        const colDateStr = formatDateString(colDate);
        const colHoliday = getHolidayInfo(colDateStr);
        const colAdj = getAdjustmentInfo(colDateStr);

        gridHtml += `<div class="grid-course-slot">`;

        if (colHoliday) {
          gridHtml += `
            <div style="font-size:10px; color:#ef4444; text-align:center; padding:10px 2px; opacity:0.6; height:100%; display:flex; align-items:center; justify-content:center;">
              ${colHoliday.name}放假
            </div>
          `;
        } else {
          let targetDay = d;
          if (colAdj) {
            targetDay = colAdj.replaceDay;
          }

          const cellCourses = RAW_COURSES.filter(c => c.day === targetDay && c.section === slot.section);

          if (cellCourses.length > 0) {
            const activeCourses = cellCourses.filter(c => isCourseActiveInWeek(c, state.selectedWeek));
            const coursesToDisplay = (state.filterOnlyActiveGrid && activeCourses.length > 0) 
              ? activeCourses 
              : cellCourses;

            coursesToDisplay.forEach(c => {
              const isActive = isCourseActiveInWeek(c, state.selectedWeek);
              const color = COURSE_COLORS[c.name] || { bg: 'rgba(99,102,241,0.1)', text: '#4f46e5', border: '#6366f1', solid: '#4f46e5' };
              
              gridHtml += `
                <div class="grid-card ${isActive ? '' : 'inactive-week'}" 
                     onclick="window.showCourseDetail('${c.id}')"
                     style="background: ${color.bg}; border-color: ${color.border}; color: ${color.text};">
                  <div class="grid-card-name">${colAdj ? '⏰ ' : ''}${c.name}</div>
                  <div class="grid-card-room">📍${c.room}</div>
                </div>
              `;
            });
          }
        }

        gridHtml += `</div>`;
      }
    });

    container.innerHTML = gridHtml;
  }

  // 详情弹窗
  window.showCourseDetail = function(courseId) {
    const course = RAW_COURSES.find(c => c.id === courseId);
    if (!course) return;

    const modal = document.getElementById('course-detail-modal');
    const title = document.getElementById('detail-modal-title');
    const content = document.getElementById('detail-modal-content');
    if (!modal || !title || !content) return;

    const dayName = WEEK_DAYS.find(d => d.day === course.day)?.full || '';
    const slot = state.timeSlots.find(s => s.section === course.section);
    const color = COURSE_COLORS[course.name] || { solid: '#4f46e5' };

    title.innerHTML = `<span style="color: ${color.solid}">${course.name}</span>`;
    
    content.innerHTML = `
      <div class="detail-item-card">
        <div class="detail-icon">📍</div>
        <div>
          <div class="detail-label">上课地点 / 教室</div>
          <div class="detail-val">${course.room}</div>
        </div>
      </div>
      <div class="detail-item-card">
        <div class="detail-icon">👨‍🏫</div>
        <div>
          <div class="detail-label">任课教师</div>
          <div class="detail-val">${course.teacher}</div>
        </div>
      </div>
      <div class="detail-item-card">
        <div class="detail-icon">⏰</div>
        <div>
          <div class="detail-label">上课时间</div>
          <div class="detail-val">${dayName} ${course.periods} (${slot ? slot.timeDesc : ''})</div>
        </div>
      </div>
      <div class="detail-item-card">
        <div class="detail-icon">📅</div>
        <div>
          <div class="detail-label">排课周次规则</div>
          <div class="detail-val">${course.weeksRaw}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
            包含周次: ${course.weeks.map(w => `第${w}周`).join(', ')}
          </div>
        </div>
      </div>
      <div class="detail-item-card">
        <div class="detail-icon">🏷️</div>
        <div>
          <div class="detail-label">课程性质 / 备注</div>
          <div class="detail-val">${course.type} ${course.note ? ` · ${course.note}` : ''}</div>
        </div>
      </div>
      <button class="primary-btn" onclick="navigator.clipboard && navigator.clipboard.writeText('${course.name} 教室:${course.room} 老师:${course.teacher} 时间:${dayName} ${course.periods}'); alert('课程信息已复制到剪贴板！');">
        📋 复制课程信息
      </button>
    `;

    modal.classList.add('active');
  };

  // 手机扫码分享弹窗
  function openShareModal() {
    const modal = document.getElementById('share-modal');
    const qrBox = document.getElementById('share-qr-code');
    const urlBox = document.getElementById('share-url-text');
    if (!modal || !qrBox) return;

    const currentUrl = window.location.href;
    if (urlBox) urlBox.innerText = currentUrl;

    qrBox.innerHTML = '';
    if (window.QRCode) {
      new window.QRCode(qrBox, {
        text: currentUrl,
        width: 180,
        height: 180,
        colorDark: '#0f172a',
        colorLight: '#ffffff'
      });
    }

    modal.classList.add('active');
  }

  function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }

  function startStatusTicker() {
    setInterval(() => {
      if (state.activeTab === 'today') {
        renderTodayView();
      }
    }, 30000);
  }
})();
