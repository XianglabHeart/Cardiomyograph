#!/bin/bash
# Start Cardiomyograph on this computer.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")" && pwd)
export PYTHONPATH="$ROOT/app:$ROOT/app/pipeline${PYTHONPATH:+:$PYTHONPATH}"
export PYTHONDONTWRITEBYTECODE=1
export PYTHONUTF8=1
export PYTHONIOENCODING=utf-8
if [ -z "${CONTRACK_CKPT:-}" ] && [ -f "$ROOT/models/pf20261011_C2_logamp_ema.pt" ]; then
  export CONTRACK_CKPT="$ROOT/models/pf20261011_C2_logamp_ema.pt"
fi
cd "$ROOT"
PY="${CMG_PYTHON:-python3}"
exec "$PY" -c "import launcher; raise SystemExit(launcher.main())"
