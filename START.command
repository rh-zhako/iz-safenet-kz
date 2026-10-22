#!/bin/zsh
cd "$(dirname "$0")" || exit 1
print 'ІЗ — Розыгрыши под контролем'
print 'Откройте http://127.0.0.1:4173 в браузере.'
print 'Чтобы остановить сервер, нажмите Ctrl+C.'
task_python="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"
if [[ ! -x "$task_python" ]]; then task_python="$(command -v python3)"; fi
if [[ -z "$task_python" ]]; then print 'Для локального запуска нужен Python 3. Также доступен опубликованный сайт.'; read; exit 1; fi
"$task_python" -m http.server 4173 --bind 127.0.0.1 --directory dist
