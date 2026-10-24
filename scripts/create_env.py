"""Generate only .env for Docker without installing local dependencies."""
import secrets
from pathlib import Path

root = Path(__file__).resolve().parent.parent
target = root / ".env"
if target.exists():
    raise SystemExit(".env already exists; it was left unchanged.")
content = (root / ".env.example").read_text(encoding="utf-8")
content = content.replace("DJANGO_SECRET_KEY=\n", f"DJANGO_SECRET_KEY={secrets.token_urlsafe(64)}\n")
content = content.replace("POSTGRES_PASSWORD=\n", f"POSTGRES_PASSWORD={secrets.token_hex(24)}\n")
content = content.replace("DB_ADMIN_PASSWORD=\n", f"DB_ADMIN_PASSWORD={secrets.token_hex(24)}\n")
target.write_text(content, encoding="utf-8")
print("Created .env with generated secrets.")
