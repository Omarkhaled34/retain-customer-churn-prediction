"""Portable local setup: python scripts/setup.py. Requires Python 3.13 and Node 22+."""
import os
import secrets
import shutil
import subprocess
import sys
import venv
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run(command, cwd=ROOT):
    subprocess.run([str(part) for part in command], cwd=cwd, check=True)


def main():
    if sys.version_info < (3, 13):
        raise SystemExit("Use Python 3.13 or newer with the pinned dependency set.")
    npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
    if not npm:
        raise SystemExit("Install Node.js 22+ (including npm), then run setup again.")
    env_file = ROOT / ".env"
    if not env_file.exists():
        content = (ROOT / ".env.example").read_text(encoding="utf-8")
        content = content.replace("DJANGO_SECRET_KEY=\n", f"DJANGO_SECRET_KEY={secrets.token_urlsafe(64)}\n")
        content = content.replace("POSTGRES_PASSWORD=\n", f"POSTGRES_PASSWORD={secrets.token_hex(24)}\n")
        content = content.replace("DB_ADMIN_PASSWORD=\n", f"DB_ADMIN_PASSWORD={secrets.token_hex(24)}\n")
        env_file.write_text(content, encoding="utf-8")
        print("Created .env with generated secrets. Existing configurations are never overwritten.")
    env_dir = ROOT / ".venv"
    if not env_dir.exists():
        venv.create(env_dir, with_pip=True)
    python = env_dir / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    run([python, "-m", "pip", "install", "-r", "backend/requirements.lock.txt"])
    run([python, "manage.py", "migrate", "--noinput"], ROOT / "backend")
    run([python, "manage.py", "collectstatic", "--noinput"], ROOT / "backend")
    run([npm, "ci", "--no-audit", "--no-fund"], ROOT / "frontend")
    print("Setup complete. Start the API and frontend in separate terminals (see README.md).")


if __name__ == "__main__":
    main()
