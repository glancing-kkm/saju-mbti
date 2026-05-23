#!/usr/bin/env python3
"""
sitemap.xml 자동 생성 스크립트
============================

사용법:
    python3 tools/generate_sitemap.py

동작:
    1. blog/**/*.html 전체 스캔
    2. 각 파일의 mtime을 lastmod로 사용 (정확한 변경일 반영)
    3. 경로 패턴별로 priority·changefreq 자동 분류
    4. 각 페이지의 canonical URL과 og:image 메타 태그 추출
    5. sitemap.xml 새로 생성 (이미지 sitemap 네임스페이스 포함)

수정 시점: 블로그 새로 추가하거나 콘텐츠 변경 후 한 번 실행하면 끝.
"""
from __future__ import annotations
import os
import re
import sys
import time
from pathlib import Path
from datetime import datetime, timezone, timedelta

# ─────────────────────────────────────────────────────────────
# 설정
# ─────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent  # repo root
SITE = "https://saju-mbti-9h1.pages.dev"
OUTPUT = ROOT / "sitemap.xml"

# 우선순위·변경 빈도 매트릭스 (경로 prefix → (priority, changefreq))
# 메인("/") 매칭은 함수 첫줄에서 별도 처리. 여기엔 "/"를 두지 않음 — 모든 path에 startswith 매칭되어 버림.
# 더 구체적인 prefix를 더 위에 두기 (예: "/blog/ilju-list/"가 "/blog/"보다 먼저).
PRIORITY_RULES: list[tuple[str, float, str]] = [
    ("/blog/index.html",    0.9, "weekly"),       # 블로그 인덱스
    ("/blog/ilju-list/",    0.8, "monthly"),      # 60갑자 일주 (코어 콘텐츠)
    ("/blog/mbti-saju/",    0.7, "monthly"),      # MBTI×사주
    ("/blog/sinsal/",       0.7, "monthly"),      # 신살
    ("/blog/basics/",       0.7, "monthly"),      # 기초
    ("/blog/lifestage/",    0.6, "monthly"),      # 생애주기
    ("/blog/zodiac/",       0.6, "monthly"),      # 띠
    ("/blog/glossary/",     0.5, "monthly"),      # 용어
    ("/blog/",              0.9, "weekly"),       # blog/ (인덱스 fallback)
    ("/legal/",             0.3, "yearly"),       # 약관·환불 정책
]

# 정적 추가 URL (HTML 파일 스캔으로 안 잡히는 페이지)
EXTRA_URLS = [
    "/legal/terms.html",
    "/legal/refund.html",
]

# 메타 태그 추출 정규식
META_CANONICAL_RE = re.compile(
    r'<link[^>]+rel="canonical"[^>]+href="([^"]+)"', re.IGNORECASE
)
META_OG_IMAGE_RE = re.compile(
    r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', re.IGNORECASE
)
META_OG_IMAGE_RE2 = re.compile(
    r'<meta[^>]+content="([^"]+)"[^>]+property="og:image"', re.IGNORECASE
)

# 한국 표준시 (KST)
KST = timezone(timedelta(hours=9))


# ─────────────────────────────────────────────────────────────
# 유틸
# ─────────────────────────────────────────────────────────────
def url_to_priority(path: str) -> tuple[float, str]:
    """경로에 가장 잘 맞는 priority·changefreq 반환."""
    if path == "/":
        return 1.0, "daily"
    for prefix, prio, freq in PRIORITY_RULES:
        if prefix.endswith(".html"):
            if path == prefix:
                return prio, freq
        elif path.startswith(prefix):
            return prio, freq
    return 0.5, "monthly"


def file_to_url(file_path: Path) -> str:
    """리포지토리 내 파일 경로 → 사이트 URL 경로."""
    rel = file_path.relative_to(ROOT).as_posix()
    if rel == "index.html":
        return "/"
    if rel.endswith("/index.html"):
        return "/" + rel[: -len("index.html")]
    return "/" + rel


def file_lastmod(file_path: Path) -> str:
    """파일 mtime을 ISO 8601 날짜 문자열로 (YYYY-MM-DD)."""
    mtime = file_path.stat().st_mtime
    return datetime.fromtimestamp(mtime, tz=KST).strftime("%Y-%m-%d")


def extract_og_image(file_path: Path) -> str | None:
    """HTML에서 og:image 절대 URL 추출. 상대경로면 SITE 접두어 보정."""
    try:
        # head 부분만 읽으면 충분 (속도)
        text = file_path.read_text(encoding="utf-8", errors="ignore")[:8000]
    except Exception:
        return None
    m = META_OG_IMAGE_RE.search(text) or META_OG_IMAGE_RE2.search(text)
    if not m:
        return None
    img = m.group(1).strip()
    if img.startswith("http://") or img.startswith("https://"):
        return img
    if img.startswith("/"):
        return SITE + img
    return SITE + "/" + img


def extract_canonical(file_path: Path) -> str | None:
    try:
        text = file_path.read_text(encoding="utf-8", errors="ignore")[:8000]
    except Exception:
        return None
    m = META_CANONICAL_RE.search(text)
    return m.group(1).strip() if m else None


# ─────────────────────────────────────────────────────────────
# 메인
# ─────────────────────────────────────────────────────────────
def collect_urls() -> list[dict]:
    """모든 HTML 페이지를 스캔하여 URL 메타 리스트 반환."""
    urls: list[dict] = []
    seen: set[str] = set()

    # 1) 메인 페이지
    index_html = ROOT / "index.html"
    if index_html.exists():
        urls.append({
            "loc": SITE + "/",
            "lastmod": file_lastmod(index_html),
            "image": extract_og_image(index_html),
        })
        seen.add("/")

    # 2) blog/**/*.html 자동 스캔
    blog_dir = ROOT / "blog"
    if blog_dir.exists():
        html_files = sorted(blog_dir.rglob("*.html"))
        for f in html_files:
            url_path = file_to_url(f)
            if url_path in seen:
                continue
            seen.add(url_path)
            # canonical이 명시되어 있으면 우선 사용
            canonical = extract_canonical(f)
            loc = canonical if canonical else (SITE + url_path)
            urls.append({
                "loc": loc,
                "lastmod": file_lastmod(f),
                "image": extract_og_image(f),
                "path": url_path,
            })

    # 3) 정적 추가 URL (legal 등)
    for extra in EXTRA_URLS:
        if extra in seen:
            continue
        file_path = ROOT / extra.lstrip("/")
        if not file_path.exists():
            continue
        seen.add(extra)
        urls.append({
            "loc": SITE + extra,
            "lastmod": file_lastmod(file_path),
            "image": extract_og_image(file_path),
            "path": extra,
        })

    return urls


def render_sitemap(urls: list[dict]) -> str:
    """sitemap.xml 본문 생성 (이미지 sitemap 네임스페이스 포함)."""
    out = ['<?xml version="1.0" encoding="UTF-8"?>']
    out.append(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'
    )
    for u in urls:
        path = u.get("path") or u["loc"].replace(SITE, "") or "/"
        prio, freq = url_to_priority(path)
        out.append("  <url>")
        out.append(f"    <loc>{u['loc']}</loc>")
        out.append(f"    <lastmod>{u['lastmod']}</lastmod>")
        out.append(f"    <changefreq>{freq}</changefreq>")
        out.append(f"    <priority>{prio:.1f}</priority>")
        img = u.get("image")
        if img:
            out.append("    <image:image>")
            out.append(f"      <image:loc>{img}</image:loc>")
            out.append("    </image:image>")
        out.append("  </url>")
    out.append("</urlset>")
    out.append("")  # trailing newline
    return "\n".join(out)


def main() -> int:
    urls = collect_urls()
    sitemap_text = render_sitemap(urls)
    OUTPUT.write_text(sitemap_text, encoding="utf-8")

    # 통계 출력
    by_category: dict[str, int] = {}
    image_count = 0
    for u in urls:
        path = u.get("path", "/")
        if path == "/":
            cat = "메인"
        elif path.startswith("/blog/"):
            seg = path.split("/")[2] if len(path.split("/")) > 2 else "blog"
            cat = f"blog/{seg}"
        elif path.startswith("/legal/"):
            cat = "legal"
        else:
            cat = "기타"
        by_category[cat] = by_category.get(cat, 0) + 1
        if u.get("image"):
            image_count += 1

    print(f"✓ sitemap.xml 생성 완료 — 총 {len(urls)}개 URL ({image_count}개 이미지 포함)")
    print(f"  → {OUTPUT.relative_to(ROOT)}")
    print()
    print("카테고리별 URL 분포:")
    for cat, n in sorted(by_category.items(), key=lambda x: -x[1]):
        print(f"  {n:4d}  {cat}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
