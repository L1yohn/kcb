const http = require('http');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://111.230.92.136:8000/api/schedule';
const OUTPUT_FILE = path.join(__dirname, '..', 'schedule.json');

console.log('[Sync] 正在从后端 API 拉取最新课表数据:', API_URL);

const req = http.get(API_URL, (res) => {
  if (res.statusCode !== 200) {
    console.error('[Sync] 错误: API 响应状态码不是 200，为:', res.statusCode);
    process.exit(1);
  }

  let rawData = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => { rawData += chunk; });
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(rawData);
      if (!parsedData.ok) {
        throw new Error(parsedData.message || 'API 返回 ok: false');
      }
      parsedData._fetched_by = 'github-actions';
      parsedData._baked_at = new Date().toISOString();

      // 隐私脱敏与过滤：抹除敏感个人信息、内部状态及不需要的实践课模块
      if (parsedData.student) {
        parsedData.student = { xh: '', xm: '' };
      }
      delete parsedData.last_sync;
      delete parsedData.extras;

      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(parsedData, null, 2), 'utf8');
      console.log('[Sync] ✅ 课表数据同步成功！共 ' + (parsedData.courses ? parsedData.courses.length : 0) + ' 门课程');
      console.log('[Sync] 已写入静态数据文件: ' + OUTPUT_FILE);
    } catch (e) {
      console.error('[Sync] 无法解析 API 响应为 JSON:', e.message);
      if (fs.existsSync(OUTPUT_FILE)) {
        console.warn('[Sync] 保留原有的 schedule.json 静态数据');
      } else {
        process.exit(1);
      }
    }
  });
});

req.on('error', (e) => {
  console.error('[Sync] 请求后端 API 异常:', e.message);
  if (fs.existsSync(OUTPUT_FILE)) {
    console.warn('[Sync] 网络连接受阻，保留已有的 schedule.json 静态数据');
  } else {
    process.exit(1);
  }
});
