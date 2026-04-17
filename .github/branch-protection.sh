#!/usr/bin/env bash
# ============================================
# Aplica branch protection rules a main via GitHub API
# ============================================
# Reglas aplicadas:
# - Require PR before merging (no push directo)
# - Require status checks: CI / Lint, TypeScript, Build
# - Require branches to be up to date antes de mergear
# - Restrict force pushes
# - Restrict deletions
# - (Sin review obligatorio, porque somos solo dev)
#
# Requiere:
#   GITHUB_TOKEN - Fine-grained PAT con permisos:
#     Repository access: solo bases-meteorologicas-la-pampa
#     Permissions: Administration (read/write), Contents (read), Metadata (read)
#
# Uso:
#   export GITHUB_TOKEN=github_pat_xxx
#   ./.github/branch-protection.sh

set -e

OWNER="basesmeteorologicaslapampa"
REPO="bases-meteorologicas-la-pampa"
BRANCH="main"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "ERROR: GITHUB_TOKEN no esta seteado"
  echo ""
  echo "Crear un Fine-grained PAT en:"
  echo "  https://github.com/settings/personal-access-tokens/new"
  echo ""
  echo "Configuracion:"
  echo "  - Repository access: Only select repositories -> $OWNER/$REPO"
  echo "  - Repository permissions:"
  echo "      Administration: Read and write"
  echo "      Contents: Read-only"
  echo "      Metadata: Read-only"
  echo ""
  echo "Despues: export GITHUB_TOKEN=github_pat_xxx"
  exit 1
fi

echo "=== Aplicando branch protection a $OWNER/$REPO:$BRANCH ==="

curl -s -X PUT \
  "https://api.github.com/repos/${OWNER}/${REPO}/branches/${BRANCH}/protection" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": [
        "Lint",
        "TypeScript",
        "Build"
      ]
    },
    "enforce_admins": false,
    "required_pull_request_reviews": {
      "required_approving_review_count": 0,
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": false
    },
    "restrictions": null,
    "allow_force_pushes": false,
    "allow_deletions": false,
    "required_conversation_resolution": true,
    "lock_branch": false,
    "allow_fork_syncing": false
  }' | python3 -m json.tool | head -30

echo ""
echo "=== Verificando config aplicada ==="
curl -s \
  "https://api.github.com/repos/${OWNER}/${REPO}/branches/${BRANCH}/protection" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Reglas activas:')
print(f\"  - PR requerido:        {d.get('required_pull_request_reviews') is not None}\")
print(f\"  - Status checks:       {d.get('required_status_checks', {}).get('contexts', [])}\")
print(f\"  - Strict (up-to-date): {d.get('required_status_checks', {}).get('strict', False)}\")
print(f\"  - Force pushes:        {'BLOQUEADO' if not d.get('allow_force_pushes', {}).get('enabled', True) else 'PERMITIDO'}\")
print(f\"  - Deletions:           {'BLOQUEADO' if not d.get('allow_deletions', {}).get('enabled', True) else 'PERMITIDO'}\")
"
