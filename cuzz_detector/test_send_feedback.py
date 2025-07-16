#!/usr/bin/env python3
"""
测试脚本：向MCP服务器发送带有情绪信息的反馈
"""

import sys
import json
import requests
import argparse
from datetime import datetime

# 服务器配置
DEFAULT_SERVER = "http://localhost:10086/mcp"

# 情绪类型
EMOTION_TYPES = [
    "愤怒", 
    "失望", 
    "困惑", 
    "烦躁", 
    "一般负面"
]

def send_feedback(server_url, text, emotion_type=None, intensity=None, context=None):
    """向MCP服务器发送反馈"""
    
    # 准备请求数据
    payload = {
        "name": "add_feedback",
        "parameters": {
            "user_text": text
        }
    }
    
    # 添加可选参数
    if emotion_type:
        payload["parameters"]["emotion_type"] = emotion_type
    
    if intensity:
        payload["parameters"]["intensity"] = intensity
    
    if context:
        payload["parameters"]["trigger_context"] = context
    
    # 发送请求
    try:
        response = requests.post(
            server_url,
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        # 输出结果
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
            return True
        else:
            print(f"错误: {response.text}")
            return False
            
    except Exception as e:
        print(f"请求异常: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="向MCP服务器发送测试反馈")
    
    parser.add_argument("--server", type=str, default=DEFAULT_SERVER, 
                        help=f"MCP服务器URL (默认: {DEFAULT_SERVER})")
    parser.add_argument("--text", type=str, required=True, 
                        help="反馈文本内容")
    parser.add_argument("--emotion", type=str, choices=EMOTION_TYPES,
                        help="情绪类型")
    parser.add_argument("--intensity", type=int, choices=[1, 2, 3, 4, 5], default=3,
                        help="情绪强度 (1-5)")
    parser.add_argument("--context", type=str,
                        help="触发场景描述")
    
    args = parser.parse_args()
    
    # 发送反馈
    success = send_feedback(
        args.server, 
        args.text, 
        args.emotion, 
        args.intensity, 
        args.context
    )
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main() 