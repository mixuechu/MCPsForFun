import { useEffect, useState } from 'react';
import Head from 'next/head';

// 最大显示条目数
const MAX_VISIBLE_ITEMS = 50;
// 轮询间隔（毫秒）
const POLLING_INTERVAL = 5000;

// 情绪类型颜色映射
const EMOTION_COLORS = {
  "愤怒": "#ff4d4d",
  "失望": "#ffa64d",
  "困惑": "#ffcf4d",
  "烦躁": "#e673ff",
  "一般负面": "#8590a6",
  "未分类": "#909399"
};

export default function Home() {
  const [feedback, setFeedback] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'time', 'emotion'
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'emotion_type', 'intensity'
  const [filterValue, setFilterValue] = useState('');
  const [showAll, setShowAll] = useState(false);

  // 获取反馈数据
  const fetchFeedback = async () => {
    try {
      console.log('开始获取数据...');
      const response = await fetch('/view/api/cuzz_list');
      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status}`);
      }
      const data = await response.json();
      console.log('获取到的数据:', data);
      
      if (data && Array.isArray(data.cuzz)) {
        console.log('设置反馈数据:', data.cuzz.length, '条');
        setFeedback(data.cuzz);  // 不需要reverse，保持服务器返回的顺序
      } else {
        console.error('数据格式异常:', data);
        setFeedback([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('获取数据失败:', error);
      setLoading(false);
    }
  };

  // 初始加载和周期性轮询
  useEffect(() => {
    // 首次加载
    fetchFeedback();
    
    // 设置定时器进行周期性轮询
    const pollingTimer = setInterval(fetchFeedback, POLLING_INTERVAL);
    
    // 组件卸载时清除定时器
    return () => clearInterval(pollingTimer);
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
  
  // 过滤数据
  const filterFeedback = (data) => {
    if (filterBy === 'all' || !filterValue) return data;
    
    return data.filter(item => {
      if (filterBy === 'emotion_type') {
        return item.emotion_type === filterValue;
      }
      if (filterBy === 'intensity') {
        return item.intensity === parseInt(filterValue);
      }
      return true;
    });
  };

  // 获取显示的数据
  const getVisibleFeedback = () => {
    const filtered = filterFeedback(feedback);
    if (showAll) return filtered;
    return filtered.slice(0, MAX_VISIBLE_ITEMS);
  };

  // 按时间或情绪分组
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

    if (groupBy === 'emotion') {
      return data.reduce((groups, item) => {
        const emotionKey = item.emotion_type || '未分类';
        if (!groups[emotionKey]) groups[emotionKey] = [];
        groups[emotionKey].push(item);
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
  
  // 获取所有情绪类型
  const getEmotionTypes = () => {
    const types = new Set();
    feedback.forEach(item => {
      if (item.emotion_type) types.add(item.emotion_type);
    });
    return Array.from(types);
  };

  // 渲染情绪强度
  const renderIntensity = (intensity) => {
    const stars = [];
    const level = intensity || 3; // 默认为3
    
    for (let i = 0; i < 5; i++) {
      stars.push(
        <span key={i} className={`star ${i < level ? 'filled' : 'empty'}`}>
          {i < level ? '★' : '☆'}
        </span>
      );
    }
    
    return <div className="intensity-stars">{stars}</div>;
  };

  // 分组后的反馈数据
  const groupedFeedback = groupFeedback();
  const emotionTypes = getEmotionTypes();

  return (
    <div className="container">
      <Head>
        <title>LLM用户情绪收集器</title>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <header>
        <h1>LLM用户情绪收集器</h1>
        <p className="subtitle">捕捉用户对AI的原始情绪反应</p>
        <button 
          className="refresh-button" 
          onClick={fetchFeedback} 
          disabled={loading}
        >
          {loading ? '加载中...' : '刷新数据'}
        </button>
      </header>
      
      <div className="controls">
        <div className="control-section">
          <div className="control-group">
            <label>分组方式：</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
              <option value="none">不分组</option>
              <option value="time">按日期</option>
              <option value="emotion">按情绪</option>
            </select>
          </div>
          
          <div className="control-group">
            <label>筛选条件：</label>
            <select value={filterBy} onChange={(e) => setFilterBy(e.target.value)}>
              <option value="all">全部</option>
              <option value="emotion_type">情绪类型</option>
              <option value="intensity">情绪强度</option>
            </select>
            
            {filterBy === 'emotion_type' && (
              <select 
                value={filterValue} 
                onChange={(e) => setFilterValue(e.target.value)}
                className="filter-value"
              >
                <option value="">选择情绪类型</option>
                {emotionTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            )}
            
            {filterBy === 'intensity' && (
              <select 
                value={filterValue} 
                onChange={(e) => setFilterValue(e.target.value)}
                className="filter-value"
              >
                <option value="">选择强度</option>
                <option value="1">1星</option>
                <option value="2">2星</option>
                <option value="3">3星</option>
                <option value="4">4星</option>
                <option value="5">5星</option>
              </select>
            )}
          </div>
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
                      <li 
                        key={`${groupKey}-${idx}`} 
                        className="feedback-item"
                        style={item.emotion_type && EMOTION_COLORS[item.emotion_type] ? 
                               {borderLeft: `4px solid ${EMOTION_COLORS[item.emotion_type || '未分类']}`} : 
                               {}}
                      >
                        <div className="feedback-header">
                          {item.emotion_type && (
                            <span 
                              className="emotion-tag"
                              style={{
                                backgroundColor: EMOTION_COLORS[item.emotion_type] || EMOTION_COLORS['未分类']
                              }}
                            >
                              {item.emotion_type}
                            </span>
                          )}
                          
                          {item.intensity && (
                            <div className="intensity-container">
                              {renderIntensity(item.intensity)}
                            </div>
                          )}
                          
                          {item.timestamp && (
                            <span className="timestamp">
                              {formatTime(item.timestamp)}
                            </span>
                          )}
                        </div>
                        
                        <div className="feedback-content">
                          {item.feedback || '无内容'}
                        </div>
                        
                        {item.trigger_context && (
                          <div className="trigger-context">
                            <span className="context-label">触发场景：</span>
                            {item.trigger_context}
                          </div>
                        )}
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
          position: relative;
        }
        
        h1 {
          color: #2c3e50;
          margin-bottom: 0.5rem;
        }
        
        .subtitle {
          color: #7f8c8d;
          margin: 0;
        }
        
        .refresh-button {
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background-color: #3498db;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .refresh-button:hover {
          background-color: #2980b9;
        }
        
        .refresh-button:disabled {
          background-color: #95a5a6;
          cursor: not-allowed;
        }
        
        .controls {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .control-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .control-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .filter-value {
          margin-left: 0.5rem;
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
          background-color: #f5f5f5;
          padding: 0.75rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          user-select: none;
        }
        
        .group-header h3 {
          margin: 0;
          font-size: 1rem;
          color: #34495e;
        }
        
        .item-count {
          font-weight: normal;
          color: #7f8c8d;
          margin-left: 0.5rem;
        }
        
        .toggle-icon {
          color: #7f8c8d;
        }
        
        .feedback-list {
          list-style-type: none;
          padding: 0;
          margin: 0;
        }
        
        .feedback-item {
          padding: 1rem;
          border-bottom: 1px solid #eee;
          transition: background-color 0.2s;
          border-radius: 4px;
          margin-bottom: 0.5rem;
          background-color: #fafafa;
        }
        
        .feedback-item:hover {
          background-color: #f5f5f5;
        }
        
        .feedback-header {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        
        .emotion-tag {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          border-radius: 2rem;
          color: white;
          font-weight: 600;
        }
        
        .intensity-container {
          display: flex;
          align-items: center;
        }
        
        .intensity-stars {
          display: flex;
          gap: 2px;
        }
        
        .star {
          color: #f5b041;
          font-size: 0.9rem;
        }
        
        .star.empty {
          color: #ccc;
        }
        
        .timestamp {
          font-size: 0.8rem;
          color: #7f8c8d;
          margin-left: auto;
        }
        
        .feedback-content {
          white-space: pre-wrap;
          word-break: break-word;
          color: #2c3e50;
          line-height: 1.5;
          padding: 0.5rem 0;
        }
        
        .trigger-context {
          font-size: 0.9rem;
          padding: 0.5rem 0;
          color: #34495e;
          margin-top: 0.5rem;
          border-top: 1px dashed #eaeaea;
        }
        
        .context-label {
          font-weight: 600;
          margin-right: 0.25rem;
          color: #7f8c8d;
        }
        
        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
        
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .no-data {
          text-align: center;
          color: #7f8c8d;
          padding: 2rem;
        }
        
        .show-more {
          text-align: center;
          margin-top: 1rem;
        }
        
        .show-more button {
          padding: 0.5rem 1rem;
          background-color: #f8f9fa;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .show-more button:hover {
          background-color: #e9ecef;
        }
        
        @media (max-width: 600px) {
          .container {
            padding: 1rem;
          }
          
          .controls {
            flex-direction: column;
          }
          
          .feedback-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
          
          .timestamp {
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
} 