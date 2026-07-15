#!/usr/bin/env python3
"""Add the shared image and publisher identity to blog article JSON-LD."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
BLOG = ROOT / "blog"
SITE = "https://saju-mbti-9h1.pages.dev"
IMAGE = f"{SITE}/assets/og-image.png"
JSON_LD_RE = re.compile(
    r'(<script type="application/ld\+json">\s*)(.*?)(\s*</script>)',
    re.DOTALL,
)


def enrich_article(data: dict) -> bool:
    if data.get("@type") != "BlogPosting":
        return False

    changed = False
    expected_image = [IMAGE]
    if data.get("image") != expected_image:
        data["image"] = expected_image
        changed = True

    author = data.setdefault("author", {"@type": "Organization"})
    author_values = {
        "@id": f"{SITE}/#organization",
        "name": "천지인 사주",
        "url": f"{SITE}/about.html",
    }
    for key, value in author_values.items():
        if author.get(key) != value:
            author[key] = value
            changed = True

    publisher = data.setdefault("publisher", {"@type": "Organization"})
    publisher_values = {
        "@id": f"{SITE}/#organization",
        "name": "천지인 사주",
        "url": f"{SITE}/",
        "logo": {
            "@type": "ImageObject",
            "url": IMAGE,
            "width": 1200,
            "height": 630,
        },
    }
    for key, value in publisher_values.items():
        if publisher.get(key) != value:
            publisher[key] = value
            changed = True

    expected_parent = {
        "@type": "Blog",
        "@id": f"{SITE}/blog/#blog",
        "name": "천지인 사주풀이 가이드",
        "url": f"{SITE}/blog/",
    }
    if data.get("isPartOf") != expected_parent:
        data["isPartOf"] = expected_parent
        changed = True

    return changed


def process(path: Path, write: bool) -> tuple[bool, str | None]:
    text = path.read_text(encoding="utf-8")
    match = JSON_LD_RE.search(text)
    if not match:
        return False, None

    try:
        data = json.loads(match.group(2))
    except json.JSONDecodeError as exc:
        return False, f"{path.relative_to(ROOT)}: {exc}"

    if not enrich_article(data):
        return False, None

    if write:
        rendered = json.dumps(data, ensure_ascii=False, indent=2)
        updated = text[: match.start(2)] + rendered + text[match.end(2) :]
        path.write_text(updated, encoding="utf-8")
    return True, None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="report articles that still need an update without writing files",
    )
    args = parser.parse_args()

    changed = 0
    errors: list[str] = []
    for path in sorted(BLOG.rglob("*.html")):
        needs_update, error = process(path, write=not args.check)
        changed += int(needs_update)
        if error:
            errors.append(error)

    if errors:
        print("\n".join(errors))
        return 1
    if args.check and changed:
        print(f"구조화 데이터 보완이 필요한 글: {changed}개")
        return 1

    if args.check:
        print("검증 완료: 모든 BlogPosting 구조화 데이터가 최신입니다.")
    else:
        print(f"보완 완료: BlogPosting {changed}개")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
