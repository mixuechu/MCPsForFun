const http = require('http');
const fs = require('fs');
const path = require('path');

const clients = [];
const HISTORY_FILE = path.join(__dirname, 'feedback_data.json');

// 确保初始文件存在
if (!fs.existsSync(HISTORY_FILE)) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2), 'utf-8');
}

const server = http.createServer((req, res) => {
  // 只对 /sse 和 /push 加 CORS
  if (req.url === '/sse' || req.url === '/push' || req.url === '/history') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }
  }

  if (req.url === '/sse') {
    // 处理SSE连接请求
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('\n');
    clients.push(res);

    // 连接时发送历史数据
    try {
      const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
      res.write(`event: history\ndata: ${data}\n\n`);
    } catch (err) {
      console.error('读取历史数据失败:', err);
    }

    req.on('close', () => {
      const idx = clients.indexOf(res);
      if (idx !== -1) clients.splice(idx, 1);
    });
  } else if (req.url === '/push' && req.method === 'POST') {
    // 处理新数据推送
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let feedback;
      
      // 尝试解析JSON数据
      try {
        feedback = JSON.parse(body);
      } catch (e) {
        // 如果不是JSON，就作为纯文本处理
        feedback = {
          feedback: body,
          timestamp: new Date().toISOString()
        };
      }
      
      // 推送到所有客户端
      const message = JSON.stringify(feedback);
      clients.forEach(client => {
        client.write(`data: ${message}\n\n`);
      });
      
      // 保存到历史文件
      try {
        let feedbackList = [];
        if (fs.existsSync(HISTORY_FILE)) {
          const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
          feedbackList = JSON.parse(data);
        }
        feedbackList.push(feedback);
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(feedbackList, null, 2), 'utf-8');
      } catch (err) {
        console.error('保存历史数据失败:', err);
      }
      
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*'
      });
      res.end('ok');
    });
  } else if (req.url === '/history' && req.method === 'GET') {
    // 提供历史数据API
    try {
      const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: '读取历史数据失败' }));
    }
  } else if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(3001, () => {
  console.log('SSE server running on port 3001');
}); 