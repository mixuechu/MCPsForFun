import { useEffect, useState } from 'react';

export default function Home() {
  const [cuzz, setCuzz] = useState([]);

  // 实时监听 SSE
  useEffect(() => {
    const eventSource = new EventSource('http://localhost:3001/sse');
    eventSource.onmessage = (event) => {
      setCuzz(prev => [event.data, ...prev]);
    };
    eventSource.onerror = (e) => console.error('[SSE] Error', e);
    return () => eventSource.close();
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #ccc', padding: 24, fontFamily: 'monospace' }}>
      <h2 style={{ textAlign: 'center' }}>脏话收集列表（实时）</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {cuzz.map((line, idx) => (
          <li key={idx} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>{line}</li>
        ))}
      </ul>
    </div>
  );
} 