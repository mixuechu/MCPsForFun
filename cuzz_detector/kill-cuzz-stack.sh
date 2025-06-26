#!/bin/bash

echo "杀死 cuzz_detector_server.py ..."
pkill -f cuzz_detector_server.py || true

echo "杀死 sse_server.js ..."
pkill -f sse_server.js || true

echo "杀死 Next.js ..."
pkill -f "npm run dev" || true

echo "全部服务已终止！" 