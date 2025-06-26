import { useEffect, useState } from 'react';
import Head from 'next/head';

// 最大显示条目数
const MAX_VISIBLE_ITEMS = 50;

export default function Home() {
  const [feedback, setFeedback] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'time'
  const [showAll, setShowAll] = useState(false);

  // 初始加载和实时监听
  useEffect(() => {
    setLoading(true);
    
    // 连接SSE
    const eventSource = new EventSource('http://localhost:3001/sse');
    
    // 处理新消息
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setFeedback(prev => [data, ...prev]);
      } catch (e) {
        console.error('解析消息失败:', e);
      }
    };
    
    // 处理历史数据
    eventSource.addEventListener('history', (event) => {
      try {
        const historyData = JSON.parse(event.data);
        setFeedback(historyData.reverse()); // 最新的在前面
        setLoading(false);
      } catch (e) {
        console.error('解析历史数据失败:', e);
        setLoading(false);
      }
    });
    
    eventSource.onerror = (e) => {
      console.error('[SSE] 连接错误', e);
      setLoading(false);
    };
    
    return () => eventSource.close();
  }, []);

  // 格式化时间
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString();
    } catch (e) {
      return '未知时间';
    }
  };
  
  // 获取显示的数据
  const getVisibleFeedback = () => {
    if (showAll) return feedback;
    return feedback.slice(0, MAX_VISIBLE_ITEMS);
  };

  // 按时间分组
  const groupFeedback = () => {
    const data = getVisibleFeedback();
    
    if (groupBy === 'none') {
      return { ungrouped: data };
    }
    
    if (groupBy === 'time') {
      return data.reduce((groups, item) => {
        try {
          const date = new Date(item.timestamp);
          const dateKey = date.toLocaleDateString();
          if (!groups[dateKey]) groups[dateKey] = [];
          groups[dateKey].push(item);
        } catch {
          if (!groups['unknown']) groups['unknown'] = [];
          groups['unknown'].push(item);
        }
        return groups;
      }, {});
    }
    
    return { ungrouped: data };
  };
  
  // 切换分组展开/折叠状态
  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };
  
  // 分组后的反馈数据
  const groupedFeedback = groupFeedback();
  
  return (
    <div className="container">
      <Head>
        <title>LLM用户情绪收集器</title>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <header>
        <h1>LLM用户情绪收集器</h1>
        <p className="subtitle">实时捕捉用户对AI的原始情绪反应</p>
      </header>
      
      <div className="controls">
        <div className="control-group">
          <label>分组方式：</label>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="none">不分组</option>
            <option value="time">按日期</option>
          </select>
        </div>
        
        <div className="control-group">
          <label>
            <input 
              type="checkbox" 
              checked={showAll} 
              onChange={() => setShowAll(!showAll)}
            />
            显示全部 ({feedback.length} 条)
          </label>
        </div>
      </div>
      
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>加载中...</p>
        </div>
      ) : (
        <div className="feedback-container">
          {Object.keys(groupedFeedback).length > 0 ? (
            Object.entries(groupedFeedback).map(([groupKey, items]) => (
              <div key={groupKey} className="feedback-group">
                {groupKey !== 'ungrouped' && (
                  <div 
                    className="group-header" 
                    onClick={() => toggleGroup(groupKey)}
                  >
                    <h3>
                      {groupKey === 'unknown' ? '未知日期' : groupKey}
                      <span className="item-count">({items.length})</span>
                    </h3>
                    <span className="toggle-icon">
                      {expandedGroups[groupKey] ? '▼' : '►'}
                    </span>
                  </div>
                )}
                
                {(groupKey === 'ungrouped' || expandedGroups[groupKey]) && (
                  <ul className="feedback-list">
                    {items.map((item, idx) => (
                      <li key={`${groupKey}-${idx}`} className="feedback-item">
                        <div className="feedback-header">
                          {item.timestamp && (
                            <span className="timestamp">
                              {formatTime(item.timestamp)}
                            </span>
                          )}
                        </div>
                        <div className="feedback-content">
                          {item.feedback || '无内容'}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          ) : (
            <p className="no-data">暂无反馈数据</p>
          )}
        </div>
      )}
      
      {!showAll && feedback.length > MAX_VISIBLE_ITEMS && (
        <div className="show-more">
          <button onClick={() => setShowAll(true)}>
            显示全部 ({feedback.length} 条)
          </button>
        </div>
      )}
      
      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
        
        header {
          text-align: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #eaeaea;
        }
        
        h1 {
          color: #2c3e50;
          margin-bottom: 0.5rem;
        }
        
        .subtitle {
          color: #7f8c8d;
          margin: 0;
        }
        
        .controls {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        
        .control-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        select {
          padding: 0.5rem;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        
        .feedback-container {
          margin-top: 1rem;
        }
        
        .feedback-group {
          margin-bottom: 1rem;
        }
        
        .group-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 1rem;
          background: #f5f5f5;
          border-radius: 4px;
          cursor: pointer;
          user-select: none;
        }
        
        .group-header h3 {
          margin: 0;
          font-size: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .item-count {
          color: #7f8c8d;
          font-size: 0.9rem;
          font-weight: normal;
        }
        
        .toggle-icon {
          font-size: 0.8rem;
          color: #7f8c8d;
        }
        
        .feedback-list {
          list-style: none;
          padding: 0;
          margin: 0.5rem 0 0 0;
        }
        
        .feedback-item {
          padding: 1rem;
          border: 1px solid #eaeaea;
          border-radius: 5px;
          margin-bottom: 0.5rem;
          transition: all 0.2s ease;
        }
        
        .feedback-item:hover {
          background-color: #f9f9f9;
          border-color: #ddd;
        }
        
        .feedback-header {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 0.5rem;
          font-size: 0.85rem;
          color: #7f8c8d;
        }
        
        .feedback-content {
          word-break: break-word;
          line-height: 1.4;
        }
        
        .timestamp {
          color: #95a5a6;
          font-size: 0.8rem;
        }
        
        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
        }
        
        .spinner {
          border: 4px solid rgba(0, 0, 0, 0.1);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border-left-color: #3498db;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .no-data {
          text-align: center;
          color: #7f8c8d;
          padding: 2rem 0;
        }
        
        .show-more {
          display: flex;
          justify-content: center;
          margin-top: 1rem;
        }
        
        .show-more button {
          padding: 0.5rem 1rem;
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .show-more button:hover {
          background: #e9e9e9;
        }
      `}</style>
    </div>
  );
} 