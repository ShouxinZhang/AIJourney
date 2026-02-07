#!/usr/bin/env bash
#
# restart.sh - 一键启动 AI Journey 开发服务器
#
# 用法:
#   bash scripts/restart.sh              # 启动开发服务器
#   bash scripts/restart.sh --check      # 先检查再启动
#   bash scripts/restart.sh --build      # 构建生产版本并预览
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
WEB_DIR="$PROJECT_ROOT/web"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# 杀掉本项目已有的 vite 进程（仅匹配项目目录下的 vite）
kill_existing() {
  local pids
  pids=$(pgrep -f "vite.*${WEB_DIR}" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "${CYAN}⏹ 关闭本项目已有服务 (PID: $pids)${NC}"
    echo "$pids" | xargs kill 2>/dev/null || true
    sleep 1
    # 如果 SIGTERM 未生效，再 SIGKILL
    for pid in $pids; do
      if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
      fi
    done
  fi
}

# 确保依赖已安装
ensure_deps() {
  if [ ! -d "$WEB_DIR/node_modules" ]; then
    echo -e "${CYAN}📦 安装依赖...${NC}"
    cd "$WEB_DIR" && npm install
  fi
}

# 启动开发服务器
start_dev() {
  echo -e "${BOLD}${GREEN}🚀 启动 AI Journey 开发服务器${NC}"
  cd "$WEB_DIR" && npx vite --host
}

# 构建并预览
start_preview() {
  echo -e "${CYAN}🔨 构建生产版本...${NC}"
  cd "$WEB_DIR" && npm run build
  echo -e "${BOLD}${GREEN}🚀 启动预览服务器${NC}"
  npx vite preview --host
}

main() {
  local mode="${1:-dev}"

  kill_existing
  ensure_deps

  case "$mode" in
    --check)
      echo -e "${CYAN}🔍 运行构建检查...${NC}"
      bash "$SCRIPT_DIR/check_errors.sh"
      echo ""
      start_dev
      ;;
    --build)
      start_preview
      ;;
    *)
      start_dev
      ;;
  esac
}

main "$@"
