#!/bin/sh
set -eu

load_secret() {
  variable="$1"
  file_variable="${variable}_FILE"
  eval "file=\${${file_variable}:-}"
  if [ -n "${file}" ] && [ -r "${file}" ]; then
    value=$(cat "${file}")
    export "${variable}=${value}"
  fi
}

load_secret DATABASE_URL
load_secret AUTH_HMAC_KEY
load_secret SETTINGS_ENCRYPTION_KEY
load_secret SMTP_HOST
load_secret SMTP_PORT
load_secret SMTP_USER
load_secret SMTP_PASSWORD
load_secret MAIL_FROM
load_secret FEISHU_WEBHOOK_URL
load_secret FEISHU_WEBHOOK_SECRET

exec "$@"
