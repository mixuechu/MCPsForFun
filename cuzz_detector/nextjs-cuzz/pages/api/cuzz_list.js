import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: true,
  },
};

// 修正数据文件路径
const dataFilePath = path.resolve(process.cwd(), '../feedback_data.json');
console.log('数据文件路径:', dataFilePath);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(dataFilePath)) {
        console.log('数据文件不存在:', dataFilePath);
        return res.status(200).json({ cuzz: [] });
      }

      // 读取文件内容
      const rawData = fs.readFileSync(dataFilePath, 'utf-8');
      console.log('读取到的原始数据:', rawData);
      let feedbackData = [];

      try {
        feedbackData = JSON.parse(rawData);
        console.log('解析后的数据:', feedbackData);
      } catch (error) {
        console.error('解析JSON数据失败:', error);
      }

      // 返回数据
      return res.status(200).json({ cuzz: feedbackData });
    } catch (error) {
      console.error('读取文件失败:', error);
      return res.status(500).json({ error: '服务器内部错误', message: error.message });
    }
  } else if (req.method === 'POST') {
    // 不再需要转发，直接返回成功
    res.status(200).json({ success: true, message: '数据更新将在下次轮询时获取' });
  } else if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET,POST,OPTIONS');
    res.status(204).end();
    return;
  } else {
    res.status(405).json({ error: '方法不允许' });
    return;
  }
} 