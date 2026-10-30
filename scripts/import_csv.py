#!/usr/bin/env python3
"""Import Base44 CSV exports to migration staging tables. Requires psycopg (v3).
Usage: python scripts/import_csv.py --directory ./private-exports
Requires DATABASE_URL environment variable. Do not commit exports or credentials.
"""
import argparse
import csv
import hashlib
import os
from pathlib import Path
import psycopg
from psycopg.types.json import Jsonb

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--directory", required=True)
    args = p.parse_args()
    directory = Path(args.directory)
    if not directory.is_dir():
        p.error("Export directory not found")
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        p.error("DATABASE_URL environment variable is required")
    files = sorted(directory.glob("*.csv"))
    if not files:
        p.error("No CSV files found")
    with psycopg.connect(dsn) as conn:
        for path in files:
            name = path.name.split("_export")[0].split(" (")[0]
            if name.lower().startswith("syncspace-users"):
                name = "User"
            count = 0
            with path.open(newline="", encoding="utf-8-sig") as f:
                for row in csv.DictReader(f):
                    source_id = row.get("id")
                    if not source_id:
                        if name == "User" and row.get("email"):
                            source_id = hashlib.sha256(row["email"].strip().lower().encode()).hexdigest()
                        else:
                            source_id = hashlib.sha256(repr(sorted(row.items())).encode()).hexdigest()
                    conn.execute(
                        """INSERT INTO migration.imported_records(entity_type, source_id, original_row)
                           VALUES (%s,%s,%s)
                           ON CONFLICT (entity_type,source_id) DO UPDATE
                           SET original_row=EXCLUDED.original_row""",
                        (name, source_id, Jsonb(row)),
                    )
                    count += 1
            conn.execute(
                "INSERT INTO migration.import_batches(entity_type,source_filename,imported_count) VALUES (%s,%s,%s)",
                (name, path.name, count),
            )
            print(f"{name}: {count} rows staged")
    print("Import complete. Original Base44 data remains unchanged.")

if __name__ == "__main__":
    main()
