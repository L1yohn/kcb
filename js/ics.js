/**
 * iCalendar (.ics) 日历导出模块 - 支持假期自动过滤与调休补课生成
 */
(function(global) {
  function formatICSDate(date) {
    const pad = (n) => String(n).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
  }

  function generateICS(startDateStr, timeSlots) {
    const { 
      RAW_COURSES, 
      DEFAULT_TIME_SLOTS, 
      DEFAULT_SEMESTER_START_DATE,
      getDateByWeekAndDay, 
      formatDateString, 
      getHolidayInfo,
      ADJUSTMENTS
    } = global.KCB_DATA;

    const baseStart = startDateStr || DEFAULT_SEMESTER_START_DATE;
    const slots = timeSlots || DEFAULT_TIME_SLOTS;
    const events = [];

    const timeMap = {};
    slots.forEach(slot => {
      timeMap[slot.section] = slot;
    });

    const now = new Date();
    const dtstamp = formatICSDate(now) + 'Z';

    // 1. 生成常规课程日程（自动跳过中秋、国庆等放假日）
    RAW_COURSES.forEach(course => {
      const slot = timeMap[course.section];
      if (!slot) return;

      const [startH, startM] = slot.start.split(':').map(Number);
      const [endH, endM] = slot.end.split(':').map(Number);

      course.weeks.forEach(week => {
        const courseDate = getDateByWeekAndDay(baseStart, week, course.day);
        const dateStr = formatDateString(courseDate);

        // 如果当天属于放假日（例如 9.25-9.27 或 10.1-10.7），则跳过生成，避免假期被打扰
        const holiday = getHolidayInfo(dateStr);
        if (holiday) return;

        const eventStart = new Date(courseDate.getFullYear(), courseDate.getMonth(), courseDate.getDate(), startH, startM, 0);
        const eventEnd = new Date(courseDate.getFullYear(), courseDate.getMonth(), courseDate.getDate(), endH, endM, 0);

        const uid = `course-${course.id}-w${week}@kcb.local`;
        const summary = course.name;
        const location = course.room;
        const description = `任课教师：${course.teacher}\\n当前周次：第 ${week} 周 (${course.weeksRaw})\\n上课节次：${course.periods} (${slot.start}-${slot.end})\\n课程类型：${course.type}${course.note ? `\\n备注：${course.note}` : ''}`;

        events.push([
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${dtstamp}`,
          `DTSTART;TZID=Asia/Shanghai:${formatICSDate(eventStart)}`,
          `DTEND;TZID=Asia/Shanghai:${formatICSDate(eventEnd)}`,
          `SUMMARY:${summary}`,
          `LOCATION:${location}`,
          `DESCRIPTION:${description}`,
          'STATUS:CONFIRMED',
          'BEGIN:VALARM',
          'TRIGGER:-PT20M',
          'ACTION:DISPLAY',
          `DESCRIPTION:上课提醒：${summary} (${location})`,
          'END:VALARM',
          'END:VEVENT'
        ].join('\r\n'));
      });
    });

    // 2. 生成调休补课日日程 (例如 10.10 周六补周二课)
    if (ADJUSTMENTS && ADJUSTMENTS.length > 0) {
      ADJUSTMENTS.forEach(adj => {
        const [y, m, d] = adj.date.split('-').map(Number);
        const adjDate = new Date(y, m - 1, d);

        // 计算 10.10 属于第几周
        const start = new Date(baseStart);
        const diffDays = Math.floor((adjDate - start) / (1000 * 60 * 60 * 24));
        const weekNum = Math.floor(diffDays / 7) + 1;

        // 查找被调休的那一天所上的课（例如 replaceDay = 2 星期二）
        const replacedCourses = RAW_COURSES.filter(c => c.day === adj.replaceDay && c.weeks.includes(weekNum));

        replacedCourses.forEach(course => {
          const slot = timeMap[course.section];
          if (!slot) return;

          const [startH, startM] = slot.start.split(':').map(Number);
          const [endH, endM] = slot.end.split(':').map(Number);

          const eventStart = new Date(y, m - 1, d, startH, startM, 0);
          const eventEnd = new Date(y, m - 1, d, endH, endM, 0);

          const uid = `course-adj-${course.id}-${adj.date}@kcb.local`;
          const summary = `【调休补课】${course.name}`;
          const location = course.room;
          const description = `【${adj.name}】按${adj.replaceDayName}课表补课\\n任课教师：${course.teacher}\\n节次：${course.periods} (${slot.start}-${slot.end})\\n原排课：第 ${weekNum} 周 (${course.weeksRaw})`;

          events.push([
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${dtstamp}`,
            `DTSTART;TZID=Asia/Shanghai:${formatICSDate(eventStart)}`,
            `DTEND;TZID=Asia/Shanghai:${formatICSDate(eventEnd)}`,
            `SUMMARY:${summary}`,
            `LOCATION:${location}`,
            `DESCRIPTION:${description}`,
            'STATUS:CONFIRMED',
            'BEGIN:VALARM',
            'TRIGGER:-PT20M',
            'ACTION:DISPLAY',
            `DESCRIPTION:上课提醒：${summary} (${location})`,
            'END:VALARM',
            'END:VEVENT'
          ].join('\r\n'));
        });
      });
    }

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//KCB//Course Timetable WebApp//CN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:学期课程表',
      'X-WR-TIMEZONE:Asia/Shanghai',
      'BEGIN:VTIMEZONE',
      'TZID:Asia/Shanghai',
      'BEGIN:STANDARD',
      'TZOFFSETFROM:+0800',
      'TZOFFSETTO:+0800',
      'TZNAME:CST',
      'DTSTART:19700101T000000',
      'END:STANDARD',
      'END:VTIMEZONE',
      ...events,
      'END:VCALENDAR'
    ].join('\r\n');
  }

  function downloadICS(startDateStr, timeSlots) {
    const ics = generateICS(startDateStr, timeSlots);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '课程表.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  global.KCB_ICS = {
    generateICS,
    downloadICS
  };
})(typeof window !== 'undefined' ? window : global);
