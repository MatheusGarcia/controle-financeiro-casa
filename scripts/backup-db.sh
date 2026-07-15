#!/usr/bin/env bash
set -euo pipefail

timestamp="$(date +%Y-%m-%d_%H-%M-%S)"
output_dir="${1:-backups}"
mkdir -p "$output_dir"

docker compose exec -T postgres pg_dump -U controle -d controle_financeiro \
  | gzip > "$output_dir/controle_financeiro_$timestamp.sql.gz"

echo "Backup criado em $output_dir/controle_financeiro_$timestamp.sql.gz"
