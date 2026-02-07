#!/usr/bin/env bash
#
# check_errors.sh - AI Journey 全链路构建检查脚本
#
# 功能:
#   1. 静态检查: TypeScript 类型检查 + ESLint 代码规范
#   2. 动态检查: Vite 生产构建
#   3. 汇总报告: 统计各阶段错误数量
#
# 用法:
#   bash scripts/check_errors.sh          # 完整检查
#   bash scripts/check_errors.sh --lint   # 仅 ESLint
#   bash scripts/check_errors.sh --tsc    # 仅 TypeScript
#   bash scripts/check_errors.sh --build  # 仅 Vite 构建
#

set -uo pipefail

# ── 颜色定义 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# ── 项目路径 ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
WEB_DIR="$PROJECT_ROOT/web"

# ── 结果计数器 ──
TOTAL_ERRORS=0
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
RESULTS=()

# ── 工具函数 ──
print_header() {
  echo ""
  echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${CYAN}║     🔍 AI Journey - 全链路构建检查               ║${NC}"
  echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${NC}"
  echo -e "${CYAN}  时间: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
  echo -e "${CYAN}  目录: ${WEB_DIR}${NC}"
  echo ""
}

print_step() {
  echo -e "${BOLD}${BLUE}── [$1/$TOTAL_STEPS] $2 ──${NC}"
}

record_result() {
  local step_name=$1
  local exit_code=$2
  local output=$3

  if [ "$exit_code" -eq 0 ]; then
    echo -e "  ${GREEN}✔ $step_name 通过${NC}"
    RESULTS+=("${GREEN}✔ $step_name${NC}")
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo -e "  ${RED}✘ $step_name 失败${NC}"
    if [ -n "$output" ]; then
      echo -e "${YELLOW}$output${NC}" | head -30
      local line_count
      line_count=$(echo "$output" | wc -l)
      if [ "$line_count" -gt 30 ]; then
        echo -e "  ${YELLOW}... 省略 $((line_count - 30)) 行${NC}"
      fi
    fi
    RESULTS+=("${RED}✘ $step_name${NC}")
    FAIL_COUNT=$((FAIL_COUNT + 1))
    TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
  fi
}

# ── 检查步骤 ──
check_dependencies() {
  print_step "$STEP" "检查依赖是否安装"
  STEP=$((STEP + 1))

  if [ ! -d "$WEB_DIR/node_modules" ] || [ ! -f "$WEB_DIR/package-lock.json" ]; then
    echo -e "  ${YELLOW}⚠ 依赖未安装或缺少 lock 文件，正在安装...${NC}"
    local output
    local install_exit=0
    if [ -f "$WEB_DIR/package-lock.json" ]; then
      output=$(cd "$WEB_DIR" && npm ci 2>&1) || install_exit=$?
    else
      output=$(cd "$WEB_DIR" && npm install 2>&1) || install_exit=$?
    fi
    if [ "$install_exit" -ne 0 ] || [ ! -d "$WEB_DIR/node_modules" ]; then
      record_result "依赖安装" 1 "$output"
      return 1
    fi
  fi
  record_result "依赖检查" 0 ""
}

check_typescript() {
  print_step "$STEP" "TypeScript 类型检查 (tsc --noEmit)"
  STEP=$((STEP + 1))

  local output
  local exit_code=0
  output=$(cd "$WEB_DIR" && npx tsc --noEmit 2>&1) || exit_code=$?
  record_result "TypeScript 类型检查" "$exit_code" "$output"
}

check_eslint() {
  print_step "$STEP" "ESLint 代码规范检查"
  STEP=$((STEP + 1))

  local output
  local exit_code=0
  output=$(cd "$WEB_DIR" && npx eslint . --max-warnings 0 2>&1) || exit_code=$?
  record_result "ESLint 代码规范" "$exit_code" "$output"
}

check_build() {
  print_step "$STEP" "Vite 生产构建"
  STEP=$((STEP + 1))

  local output
  local exit_code=0
  output=$(cd "$WEB_DIR" && npx vite build 2>&1) || exit_code=$?
  record_result "Vite 生产构建" "$exit_code" "$output"
}

# ── 汇总报告 ──
print_summary() {
  echo ""
  echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${CYAN}║     📊 检查汇总报告                              ║${NC}"
  echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${NC}"
  echo ""

  for result in "${RESULTS[@]}"; do
    echo -e "  $result"
  done

  echo ""
  echo -e "  ${GREEN}通过: $PASS_COUNT${NC}  ${RED}失败: $FAIL_COUNT${NC}  ${YELLOW}跳过: $SKIP_COUNT${NC}"
  echo ""

  if [ "$FAIL_COUNT" -eq 0 ]; then
    echo -e "${BOLD}${GREEN}  🎉 全部检查通过！代码已准备就绪。${NC}"
  else
    echo -e "${BOLD}${RED}  ⚠ 存在 $FAIL_COUNT 个检查失败，请修复后重试。${NC}"
  fi
  echo ""
}

# ── 主流程 ──
main() {
  local mode="${1:-all}"

  STEP=1

  case "$mode" in
    --lint)
      TOTAL_STEPS=2
      print_header
      check_dependencies
      check_eslint
      ;;
    --tsc)
      TOTAL_STEPS=2
      print_header
      check_dependencies
      check_typescript
      ;;
    --build)
      TOTAL_STEPS=2
      print_header
      check_dependencies
      check_build
      ;;
    all|*)
      TOTAL_STEPS=4
      print_header
      check_dependencies
      check_typescript
      check_eslint
      check_build
      ;;
  esac

  print_summary

  exit "$FAIL_COUNT"
}

main "$@"
