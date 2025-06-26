import fs from 'fs';
import path from 'path';
import { addSSEClient } from './cuzz_list';

export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const filePath = path.resolve(process.cwd(), '../cuzz_list.txt');
  let lines = [];
  if (fs.existsSync(filePath)) {
    lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
  }
  // 连接时推送所有历史
  res.write(`event: history\ndata: ${JSON.stringify(lines)}\n\n`);
  console.log('[SSE] Client connected to /api/cuzz_stream');
  // 注册到全局 SSE 客户端
  addSSEClient(res);

  // 防止 Next.js 自动关闭 SSE 连接
  const keepAlive = setInterval(() => {
    res.write(':\n\n'); // SSE注释，保持连接
  }, 15000);

  res.on('close', () => {
    clearInterval(keepAlive);
  });
} 