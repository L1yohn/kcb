const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const PORT = 8080;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ics': 'text/calendar; charset=utf-8'
};

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(ROOT_DIR, reqPath);

  // 安全检查：防止路径越界
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  const localIps = getLocalIpAddresses();
  const primaryIp = localIps[0] || '127.0.0.1';
  
  console.log('\n' + '='.repeat(54));
  console.log('  🎉 课程表查询服务已成功启动！');
  console.log('='.repeat(54));
  console.log(`\n  💻 电脑本地访问:  http://localhost:${PORT}`);
  console.log(`  📱 手机局域网访问: http://${primaryIp}:${PORT}`);
  if (localIps.length > 1) {
    console.log('     (其他可用网络 IP: ' + localIps.slice(1).map(ip => `http://${ip}:${PORT}`).join(', ') + ')');
  }
  console.log('\n  👉 手机使用方法:');
  console.log('     1. 确保手机和电脑连接在同一个 Wi-Fi (或手机连接电脑热点)');
  console.log(`     2. 在手机浏览器中输入: http://${primaryIp}:${PORT}`);
  console.log('     3. 或在网页右上角点击 📱 图标查看并扫描二维码');
  console.log('\n' + '='.repeat(54) + '\n');

  // 自动打开浏览器
  const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${startCmd} http://localhost:${PORT}`);
});
