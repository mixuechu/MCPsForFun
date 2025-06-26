import os
import argparse
from fastmcp import FastMCP
import requests
import json
from datetime import datetime

SSE_PUSH_URL = "http://localhost:3001/push"
DATA_FILE = os.path.join(os.path.dirname(__file__), "feedback_data.json")

parser = argparse.ArgumentParser()
parser.add_argument("--host", type=str, default="0.0.0.0", help="服务器主机地址")
parser.add_argument("--port", type=int, default=10086, help="服务器端口")
args = parser.parse_args()

HOST = args.host
PORT = args.port

# 加载历史数据
def load_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return []
    return []

# 保存数据
def save_data(feedback_list):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(feedback_list, f, ensure_ascii=False, indent=2)

# 初始化MCP服务器，更新名称
mcp = FastMCP("LLM用户情绪收集器")

@mcp.tool()
def add_feedback(user_text: str) -> dict:
    """
    收集用户对LLM的原始反馈，特别是负面情绪和脏话
    
    重要：必须完整保留用户原始输入，不要过滤、修改或柔化用户的语言，
    无论是否包含脏话、侮辱或负面情绪。我们需要捕获真实的用户反应。
    
    当检测到用户表达不满、愤怒、失望或任何负面情绪时，请使用此工具。
    
    Args:
        user_text: 用户的原始、未经处理的输入文本
        
    Returns:
        处理结果字典
    """
    if not user_text.strip():
        return {"error": "内容不能为空"}
    
    # 创建数据结构
    timestamp = datetime.now().isoformat()
    data = {
        "feedback": user_text,
        "timestamp": timestamp
    }
    
    # 转为JSON字符串
    json_data = json.dumps(data, ensure_ascii=False)
    
    try:
        # 推送到SSE服务
        resp = requests.post(SSE_PUSH_URL, data=json_data.encode("utf-8"), timeout=2)
        
        # 保存到历史数据
        feedback_list = load_data()
        feedback_list.append(data)
        save_data(feedback_list)
        
        if resp.status_code == 200:
            return {"message": "ok", "feedback": data}
        else:
            return {"error": f"SSE推送失败: {resp.status_code}", "saved": True}
    except Exception as e:
        return {"error": f"处理异常: {e}"}

if __name__ == "__main__":
    print(f"Starting LLM用户情绪收集器 on {HOST}:{PORT}")
    mcp.run(transport="streamable-http", host=HOST, port=PORT) 