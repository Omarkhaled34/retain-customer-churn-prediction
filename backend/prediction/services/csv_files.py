import csv
import io

from django.conf import settings
from rest_framework.exceptions import ValidationError
from ml.schema import CSV_MAP


def read_upload(upload):
    if not upload.name.lower().endswith(".csv"):
        raise ValidationError({"file": "Upload a .csv file."})
    if upload.size > settings.MAX_CSV_BYTES:
        raise ValidationError({"file": "File exceeds the 5 MiB limit."})
    try:
        content = upload.read(settings.MAX_CSV_BYTES + 1).decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValidationError({"file": "CSV must use UTF-8 encoding."}) from exc
    if "\x00" in content:
        raise ValidationError({"file": "CSV contains invalid null characters."})
    try:
        reader = csv.DictReader(io.StringIO(content, newline=""), strict=True)
        headers = reader.fieldnames or []
        rename = {value: key for key, value in CSV_MAP.items()}
        normalized = [rename.get(header.strip(), header.strip()) for header in headers]
        if len(normalized) != len(set(normalized)):
            raise ValidationError({"file": "CSV contains duplicate columns."})
        missing = set(CSV_MAP) - set(normalized)
        extra = set(normalized) - set(CSV_MAP) - {"Churn"}
        if missing or extra:
            raise ValidationError({"file": {"missing_columns": sorted(missing), "unexpected_columns": sorted(extra)}})
        rows = []
        for number, row in enumerate(reader, start=2):
            if len(rows) >= settings.MAX_BATCH_ROWS:
                raise ValidationError({"file": "CSV exceeds the 1,000 record limit. Split it into smaller files."})
            if None in row or None in row.values():
                rows.append((number, None))
            else:
                rows.append((number, {key: row[header].strip() for header, key in zip(headers, normalized) if key in CSV_MAP}))
        if not rows:
            raise ValidationError({"file": "CSV must contain at least one customer."})
        return rows
    except csv.Error as exc:
        raise ValidationError({"file": "Malformed CSV. Check quoting and column counts."}) from exc


def safe_csv_cell(value):
    text = str(value)
    # Prevent spreadsheet formula execution, including formulas hidden after whitespace.
    return "'" + text if text.lstrip().startswith(("=", "+", "-", "@")) or text.startswith(("\t", "\r")) else text
