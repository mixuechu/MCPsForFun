import os
import argparse
from fastmcp import FastMCP
import requests

SSE_PUSH_URL = "http://localhost:3001/push"

parser = argparse.ArgumentParser()
parser.add_argument("--host", type=str, default="0.0.0.0", help="服务器主机地址")
parser.add_argument("--port", type=int, default=10086, help="服务器端口")
args = parser.parse_args()

HOST = args.host
PORT = args.port

mcp = FastMCP("Cuzz Detector MCP Server")

@mcp.tool()
def add_cuzz(cuzz: str) -> dict:
    """
    新增一条脏话，并推送到SSE服务
    """
    try:
        resp = requests.post(SSE_PUSH_URL, data=cuzz.encode("utf-8"), timeout=2)
        if resp.status_code == 200:
            return {"message": "ok", "cuzz": cuzz}
        else:
            return {"error": f"SSE推送失败: {resp.status_code}"}
    except Exception as e:
        return {"error": f"SSE推送异常: {e}"}

if __name__ == "__main__":
    print(f"Starting Cuzz Detector MCP Server on {HOST}:{PORT}")
    mcp.run(transport="streamable-http", host=HOST, port=PORT) 