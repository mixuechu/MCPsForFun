import fs from 'fs';
import path from 'path';
import http from 'http';

export const config = {
  api: {
    bodyParser: true,
  },
};

const filePath = path.resolve(process.cwd(), '../cuzz_list.txt');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    let lines = [];
    if (fs.existsSync(filePath)) {
      lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
    }
    res.status(200).json({ cuzz: lines });
    return;
  } else if (req.method === 'POST') {
    try {
      const text = (req.body && req.body.text) ? req.body.text.trim() : '';
      if (!text) {
        res.status(400).json({ success: false, error: 'text不能为空', debug: req.body });
        return;
      }
      // 直接转发到 4000 端口的 /push
      const postData = JSON.stringify({ text });
      const options = {
        hostname: 'localhost',
        port: 4000,
        path: '/push',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };
      const forwardReq = http.request(options, forwardRes => {
        let data = '';
        forwardRes.on('data', chunk => data += chunk);
        forwardRes.on('end', () => {
          try {
            const result = JSON.parse(data);
            res.status(forwardRes.statusCode || 200).json(result);
          } catch (e) {
            res.status(502).json({ success: false, error: 'SSE服务响应异常', debug: data });
          }
        });
      });
      forwardReq.on('error', err => {
        res.status(502).json({ success: false, error: '无法连接 SSE 服务', debug: err.message });
      });
      forwardReq.write(postData);
      forwardReq.end();
    } catch (e) {
      res.status(400).json({ success: false, error: e.message, debug: req.body });
      return;
    }
  } else if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET,POST,OPTIONS');
    res.status(204).end();
    return;
  } else {
    res.status(405).end();
    return;
  }
} 