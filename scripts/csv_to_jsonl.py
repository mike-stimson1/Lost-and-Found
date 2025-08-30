import csv
import json


def csv_to_json_stream(csv_file, json_file, id_column=None):
    """
    Convert CSV to a JSON array written in streaming mode.
    Each element is a single-line JSON object; the file is valid JSON.

    Output shape:
    [
    {"id":"row1", "text":"...", "metadata":{...}},
    {"id":"row2", "text":"...", "metadata":{...}},
    ...
    ]
    """
    with (
        open(csv_file, "r", encoding="utf-8") as f_in,
        open(json_file, "w", encoding="utf-8") as f_out,
    ):
        reader = csv.DictReader(f_in)

        f_out.write("[\n")
        first = True
        for i, row in enumerate(reader, start=1):
            row_id = (
                row[id_column]
                if id_column and id_column in row and row[id_column]
                else f"row{i}"
            )
            text = " | ".join(f"{k}: {v}" for k, v in row.items() if v)

            obj = {"id": row_id, "text": text, "metadata": row}

            line = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))

            if not first:
                f_out.write(",\n")
            f_out.write(line)
            first = False

        f_out.write("\n]\n")

    print(f"✅ Converted {csv_file} → {json_file} (valid JSON, one row per line)")


# Example usage:
if __name__ == "__main__":
    csv_to_json_stream("input.csv", "output.json", id_column="Name")  # or None
