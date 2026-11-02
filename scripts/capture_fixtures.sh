#!/usr/bin/env bash
# Regenerate the frontend test fixtures from a throwaway backend instance (real API responses).
# Usage (project root):  PYTHON=path/to/python bash scripts/capture_fixtures.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
PY="${PYTHON:-python3}"
export DATABASE_URL="sqlite:///$TMP/fixtures.db" UPLOAD_DIR="$TMP/uploads"
cd "$ROOT/backend"
"$PY" -m uvicorn app.main:app --port 8765 >"$TMP/server.log" 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true; rm -rf "$TMP"' EXIT
for _ in $(seq 1 90); do curl -sf http://localhost:8765/api/health >/dev/null && break; sleep 2; done
curl -sf http://localhost:8765/api/health >/dev/null || { echo "backend did not start"; exit 1; }

B=http://localhost:8765
OUT="$ROOT/frontend/src/test/fixtures"; mkdir -p "$OUT"
TOKEN=$(curl -sf -X POST "$B/api/auth/register" -H 'content-type: application/json' \
  -d '{"name":"Aarav Sharma","email":"aarav@example.com","password":"correct-horse-battery-1"}' \
  | "$PY" -c 'import sys,json; print(json.load(sys.stdin)["token"])')
A=(-H "Authorization: Bearer $TOKEN")

curl -sf "${A[@]}" "$B/api/auth/me" > "$OUT/me.json"
curl -sf -X POST "${A[@]}" "$B/api/samples/load" > "$OUT/sample.json"
curl -sf -X POST "${A[@]}" "$B/api/match" -H 'content-type: application/json' -d '{"resume_id":1,"job_id":1}' > "$OUT/match.json"
curl -sf "${A[@]}" "$B/api/resumes/1" > "$OUT/resume.json"
curl -sf "${A[@]}" "$B/api/resumes" > "$OUT/resumes.json"
curl -sf "${A[@]}" "$B/api/jobs" > "$OUT/jobs.json"
curl -sf "${A[@]}" "$B/api/jobs/1" > "$OUT/job.json"
curl -sf "${A[@]}" "$B/api/match" > "$OUT/matches.json"
curl -sf "${A[@]}" "$B/api/match/1" > "$OUT/match_detail.json"
curl -sf "${A[@]}" "$B/api/dashboard" > "$OUT/dashboard.json"
curl -sf "${A[@]}" "$B/api/history" > "$OUT/history.json"
curl -sf "${A[@]}" "$B/api/user/preferences" > "$OUT/preferences.json"
curl -sf "$B/api/skills" > "$OUT/skills.json"
echo "fixtures written to $OUT"
