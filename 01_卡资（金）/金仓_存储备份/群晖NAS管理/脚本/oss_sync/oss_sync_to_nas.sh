#!/usr/bin/env bash
# OSS Bucket kr-cypd → NAS 每日定时同步脚本
# 部署目标：Synology DS1825+（CKBNAS / 192.168.1.201）
# 计划任务：每天凌晨 03:00
set -euo pipefail

# ──────────────────── 配置区 ────────────────────
OSS_ENDPOINT="oss-cn-beijing.aliyuncs.com"
OSS_BUCKET="kr-cypd"
ACCESS_KEY_ID="LTAI5t7ixwYZBqYc4bFpe5tc"
ACCESS_KEY_SECRET="Bm1JAMT5U2oyaKLqhbtIPojNQWd5YA"

NAS_BACKUP_ROOT="/volume1/backup/oss_kr-cypd"
LOG_DIR="${NAS_BACKUP_ROOT}/_logs"
COST_DIR="${NAS_BACKUP_ROOT}/_cost_reports"
ALIYUN_CLI="/usr/local/bin/aliyun"
OSSUTIL="/usr/local/bin/ossutil"

DATE_TAG=$(date +%Y-%m-%d)
MONTH_TAG=$(date +%Y-%m)
LOG_FILE="${LOG_DIR}/sync_${DATE_TAG}.log"
# ────────────────────────────────────────────────

mkdir -p "${NAS_BACKUP_ROOT}" "${LOG_DIR}" "${COST_DIR}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"; }

log "========== OSS 同步开始 =========="
log "Bucket: oss://${OSS_BUCKET}  →  ${NAS_BACKUP_ROOT}"

# ──────────────── 1. ossutil 增量同步 ────────────────
SYNC_START=$(date +%s)

"${OSSUTIL}" sync \
  "oss://${OSS_BUCKET}/" \
  "${NAS_BACKUP_ROOT}/data/" \
  --endpoint "${OSS_ENDPOINT}" \
  --access-key-id "${ACCESS_KEY_ID}" \
  --access-key-secret "${ACCESS_KEY_SECRET}" \
  --force \
  --backup-dir "${NAS_BACKUP_ROOT}/_overwritten" \
  --include "*" \
  2>&1 | tee -a "${LOG_FILE}"

SYNC_END=$(date +%s)
SYNC_ELAPSED=$(( SYNC_END - SYNC_START ))
log "同步耗时: ${SYNC_ELAPSED}s"

# ──────────── 2. 按日期归档（硬链接，不额外占空间） ──────────
DAILY_SNAPSHOT="${NAS_BACKUP_ROOT}/_snapshots/${DATE_TAG}"
if [ ! -d "${DAILY_SNAPSHOT}" ]; then
  mkdir -p "${DAILY_SNAPSHOT}"
  cp -al "${NAS_BACKUP_ROOT}/data/" "${DAILY_SNAPSHOT}/"
  log "每日快照已创建: ${DAILY_SNAPSHOT}"
fi

# ──────────── 3. 统计本次同步文件数与大小 ──────────
FILE_COUNT=$(find "${NAS_BACKUP_ROOT}/data/" -type f 2>/dev/null | wc -l | tr -d ' ')
TOTAL_SIZE=$(du -sh "${NAS_BACKUP_ROOT}/data/" 2>/dev/null | cut -f1)
log "当前文件总数: ${FILE_COUNT}，总大小: ${TOTAL_SIZE}"

# ──────────── 4. 分类存储统计 ──────────
log "--- 分类存储统计 ---"
for dir in "${NAS_BACKUP_ROOT}/data"/*/; do
  [ -d "${dir}" ] || continue
  CATEGORY=$(basename "${dir}")
  CAT_COUNT=$(find "${dir}" -type f | wc -l | tr -d ' ')
  CAT_SIZE=$(du -sh "${dir}" | cut -f1)
  log "  [${CATEGORY}] 文件数: ${CAT_COUNT}, 大小: ${CAT_SIZE}"
done

# ──────────── 5. OSS 费用查询（本月） ──────────
COST_FILE="${COST_DIR}/cost_${MONTH_TAG}.json"
if command -v "${ALIYUN_CLI}" &>/dev/null; then
  log "正在查询 OSS 本月费用..."
  "${ALIYUN_CLI}" bssopenapi QueryBill \
    --region cn-beijing \
    --BillingCycle "${MONTH_TAG}" \
    --ProductCode oss \
    --access-key-id "${ACCESS_KEY_ID}" \
    --access-key-secret "${ACCESS_KEY_SECRET}" \
    > "${COST_FILE}" 2>&1 || true

  if [ -f "${COST_FILE}" ]; then
    AMOUNT=$(python3 -c "
import json, sys
try:
    d = json.load(open('${COST_FILE}'))
    items = d.get('Data',{}).get('Items',{}).get('Item',[])
    total = sum(i.get('PretaxAmount',0) for i in items)
    print(f'{total:.2f}')
except: print('N/A')
" 2>/dev/null || echo "N/A")
    log "OSS 本月费用: ¥${AMOUNT}"
  fi
else
  log "aliyun CLI 未安装，跳过费用查询"
fi

# ──────────── 6. 生成每日同步报告 ──────────
REPORT_FILE="${LOG_DIR}/report_${DATE_TAG}.md"
cat > "${REPORT_FILE}" <<REPORT_EOF
# OSS 同步报告 — ${DATE_TAG}

| 项目 | 值 |
|:---|:---|
| Bucket | oss://${OSS_BUCKET} |
| 目标路径 | ${NAS_BACKUP_ROOT}/data/ |
| 同步耗时 | ${SYNC_ELAPSED}s |
| 文件总数 | ${FILE_COUNT} |
| 数据总量 | ${TOTAL_SIZE} |
| 本月 OSS 费用 | ¥${AMOUNT:-N/A} |

## 分类明细

$(for dir in "${NAS_BACKUP_ROOT}/data"/*/; do
  [ -d "${dir}" ] || continue
  CATEGORY=$(basename "${dir}")
  CAT_COUNT=$(find "${dir}" -type f | wc -l | tr -d ' ')
  CAT_SIZE=$(du -sh "${dir}" | cut -f1)
  echo "- **${CATEGORY}**: ${CAT_COUNT} 个文件, ${CAT_SIZE}"
done)

## 快照

每日快照: \`${DAILY_SNAPSHOT}\`
REPORT_EOF

log "报告已生成: ${REPORT_FILE}"
log "========== OSS 同步完成 =========="
