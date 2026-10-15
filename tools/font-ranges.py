#!/usr/bin/env python3
"""assets/design-system.css의 한나체 Pro @font-face를 폰트 파일에서 다시 만든다.

외곽선이 있는 글자만 unicode-range에 넣어 빈 글자 대신 시스템 글꼴을 쓴다.
한글의 시각 중심에 맞춰 ascent/descent를 계산해 버튼·배지의 정렬도 유지한다.

사용법:  python3 tools/font-ranges.py          # 확인만
         python3 tools/font-ranges.py --write  # css 갱신
"""
import io, os, re, sys

from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS = os.path.join(ROOT, 'assets', 'design-system.css')
FONTS = [
    ('BM HANNA Pro', 'assets/fonts/bm-hanna-pro.woff2', '/assets/fonts/bm-hanna-pro.woff2'),
]
# 외곽선이 없지만 서체가 폭을 잡아야 하는 글자
ALWAYS = {0x20, 0xA0}
# 줄상자 중심을 맞출 기준 글자 — 본문에 실제로 쓰는 한글
CENTER_ON = '본인의사주풀이뒤로가나다라마바사아자차카타파하천지운명한국어글자'


def analyze(path):
    font = TTFont(path)
    upm = font['head'].unitsPerEm
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()

    drawn = set()
    for cp, name in cmap.items():
        pen = BoundsPen(glyphs)
        try:
            glyphs[name].draw(pen)
        except Exception:
            pen.bounds = None
        if pen.bounds:
            drawn.add(cp)

    top, bottom = None, None
    for ch in CENTER_ON:
        name = cmap.get(ord(ch))
        if not name:
            continue
        pen = BoundsPen(glyphs)
        try:
            glyphs[name].draw(pen)
        except Exception:
            continue
        if pen.bounds:
            top = pen.bounds[3] if top is None else max(top, pen.bounds[3])
            bottom = pen.bounds[1] if bottom is None else min(bottom, pen.bounds[1])

    # Pro 웹폰트의 hhea는 2em을 넘어 normal 줄 높이를 과도하게 늘린다.
    # 글꼴에 명시된 본문용 sTypo 메트릭으로 줄상자를 잡는다.
    metrics = font['OS/2']
    span = metrics.sTypoAscender - metrics.sTypoDescender
    center = (top + bottom) / 2.0
    ascent = center + span / 2.0
    descent = span / 2.0 - center
    return {
        'codepoints': drawn | ALWAYS,
        'upm': upm,
        'ascent': ascent / upm * 100,
        'descent': descent / upm * 100,
        'shift': (center - (metrics.sTypoAscender + metrics.sTypoDescender) / 2.0) / upm * 100,
    }


def as_ranges(cps):
    cps = sorted(cps)
    runs, start, prev = [], cps[0], cps[0]
    for cp in cps[1:]:
        if cp == prev + 1:
            prev = cp
            continue
        runs.append((start, prev))
        start = prev = cp
    runs.append((start, prev))
    return runs


def as_css(runs):
    return ','.join('U+%04X' % a if a == b else 'U+%04X-%04X' % (a, b) for a, b in runs)


def main():
    css = io.open(CSS, encoding='utf-8').read()
    for family, rel, url in FONTS:
        info = analyze(os.path.join(ROOT, rel))
        runs = as_ranges(info['codepoints'])
        rule = (
            "@font-face{font-family:'%s';src:url('%s') format('woff2');"
            "font-style:normal;font-weight:400;font-display:swap;"
            "ascent-override:%.2f%%;descent-override:%.2f%%;line-gap-override:0%%;"
            "unicode-range:%s}"
        ) % (family, url, info['ascent'], info['descent'], as_css(runs))
        print('%s: 실제 글자 %d자 · 구간 %d개 · 글자 %.2f%% em 내림'
              % (family, len(info['codepoints']), len(runs), info['shift']))
        pattern = re.compile(r"@font-face\{font-family:'" + re.escape(family) + r"';[^}]*\}")
        if not pattern.search(css):
            raise SystemExit("%s 의 @font-face 를 찾지 못했다" % family)
        css = pattern.sub(lambda m: rule, css, count=1)
    if '--write' in sys.argv:
        io.open(CSS, 'w', encoding='utf-8').write(css)
        print('assets/design-system.css 갱신')
    else:
        print('(--write 를 붙이면 css 를 갱신한다)')


if __name__ == '__main__':
    main()
