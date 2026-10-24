#!/bin/sh
set -eu
python manage.py migrate --noinput
python manage.py createcachetable
python manage.py collectstatic --noinput
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --threads 2 --timeout 120 --access-logfile - --error-logfile -
