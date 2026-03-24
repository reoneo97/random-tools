#!/usr/bin/env python3
"""
json_formatter.py - A simple, self-contained JSON formatter.

Usage:
  python3 json_formatter.py [OPTIONS] [FILE]

  If FILE is omitted, reads from stdin.

Examples:
  echo '{"a":1,"b":2}' | python3 json_formatter.py
  python3 json_formatter.py data.json
  python3 json_formatter.py --indent 2 data.json
  python3 json_formatter.py --compact data.json
  python3 json_formatter.py --sort-keys data.json
  python3 json_formatter.py --validate data.json
  echo "{'a':1,'b':2}" | python3 json_formatter.py --lenient
"""

import argparse
import json
import sys


def build_parser():
    parser = argparse.ArgumentParser(
        description="Format or validate JSON from a file or stdin.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "file",
        nargs="?",
        metavar="FILE",
        help="Input JSON file (default: stdin)",
    )
    parser.add_argument(
        "-i", "--indent",
        type=int,
        default=4,
        metavar="N",
        help="Number of spaces for indentation (default: 4)",
    )
    parser.add_argument(
        "-c", "--compact",
        action="store_true",
        help="Output compact JSON with no extra whitespace",
    )
    parser.add_argument(
        "-s", "--sort-keys",
        action="store_true",
        help="Sort object keys alphabetically",
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Only validate the JSON without printing output",
    )
    parser.add_argument(
        "-l", "--lenient",
        action="store_true",
        help="Accept single-quoted strings in addition to double-quoted (non-standard JSON)",
    )
    parser.add_argument(
        "-o", "--output",
        metavar="FILE",
        help="Write output to FILE instead of stdout",
    )
    return parser


def read_input(file_path):
    if file_path:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            print(f"Error: file not found: {file_path}", file=sys.stderr)
            sys.exit(1)
        except OSError as e:
            print(f"Error reading file: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        return sys.stdin.read()


def normalize_quotes(raw):
    """Convert single-quoted strings to double-quoted so standard JSON parsing works.

    Handles:
    - Single-quoted keys and values -> double-quoted
    - Unescaped double quotes inside single-quoted strings -> escaped
    - Escaped single quotes inside single-quoted strings -> unescaped single quotes
    - Already double-quoted strings are passed through unchanged
    """
    result = []
    i = 0
    n = len(raw)
    while i < n:
        c = raw[i]
        if c == '"':
            # Double-quoted string — copy verbatim including its contents
            result.append(c)
            i += 1
            while i < n:
                c = raw[i]
                result.append(c)
                if c == '\\':
                    i += 1
                    if i < n:
                        result.append(raw[i])
                elif c == '"':
                    break
                i += 1
            i += 1
        elif c == "'":
            # Single-quoted string — convert to double-quoted
            result.append('"')
            i += 1
            while i < n:
                c = raw[i]
                if c == '\\' and i + 1 < n and raw[i + 1] == "'":
                    # Escaped single quote \' -> literal single quote (no escape needed in JSON)
                    result.append("'")
                    i += 2
                elif c == '\\':
                    result.append(c)
                    i += 1
                    if i < n:
                        result.append(raw[i])
                        i += 1
                elif c == '"':
                    # Bare double quote inside single-quoted string -> must escape it
                    result.append('\\"')
                    i += 1
                elif c == "'":
                    result.append('"')
                    i += 1
                    break
                else:
                    result.append(c)
                    i += 1
        else:
            result.append(c)
            i += 1
    return ''.join(result)


def parse_json(raw, lenient=False):
    if lenient:
        raw = normalize_quotes(raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}", file=sys.stderr)
        sys.exit(1)


def format_json(data, indent, compact, sort_keys):
    if compact:
        return json.dumps(data, separators=(",", ":"), sort_keys=sort_keys)
    return json.dumps(data, indent=indent, sort_keys=sort_keys, ensure_ascii=False)


def write_output(text, output_path):
    if output_path:
        try:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(text)
                f.write("\n")
        except OSError as e:
            print(f"Error writing output: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        print(text)


def main():
    parser = build_parser()
    args = parser.parse_args()

    raw = read_input(args.file)
    data = parse_json(raw, lenient=args.lenient)

    if args.validate:
        print("Valid JSON.")
        return

    formatted = format_json(data, args.indent, args.compact, args.sort_keys)
    write_output(formatted, args.output)


if __name__ == "__main__":
    main()
