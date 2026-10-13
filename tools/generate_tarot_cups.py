#!/usr/bin/env python3
"""그림이 없던 컵 카드 4장(2·8·10·여왕)을 SVG로 그린다.

기존 카드와 같은 틀(양피지 가장자리 · 금테 · 위쪽 달 위상 줄 · 남색 밤하늘 · 아래 두루마리 이름띠)을
쓰고, 가운데 그림만 카드 뜻에 맞춰 그린다. 478×640 좌표계.

    python3 tools/generate_tarot_cups.py OUT_DIR

만든 SVG는 브라우저에서 JPG로 옮겨 assets/tarot/card-cups-XX.jpg로 저장한다.
"""
import math
import random
import sys
from pathlib import Path

W, H = 478, 640
GOLD = '#d9b25a'
GOLD_D = '#8a6224'
INK = '#3a2a14'


def f(n):
    return f'{n:.1f}'.rstrip('0').rstrip('.')


def defs():
    return ('<defs>'
            '<linearGradient id="parch" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1e5c8"/><stop offset=".5" stop-color="#e6d4ac"/><stop offset="1" stop-color="#d6bf8f"/></linearGradient>'
            '<linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1630"/><stop offset=".6" stop-color="#14244a"/><stop offset="1" stop-color="#1c2f57"/></linearGradient>'
            '<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe7a6"/><stop offset=".45" stop-color="#e2b65a"/><stop offset="1" stop-color="#a87628"/></linearGradient>'
            '<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f4a66"/><stop offset="1" stop-color="#0d2236"/></linearGradient>'
            '<radialGradient id="glow"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".9"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>'
            '<clipPath id="panel"><rect x="30" y="30" width="418" height="580" rx="10"/></clipPath>'
            '</defs>')


def moon_phase(x, y, r, k):
    """k: -1(그믐) … 0(보름) … 1(초승) 사이의 위상을 금색으로."""
    if abs(k) < .05:
        return f'<circle cx="{f(x)}" cy="{f(y)}" r="{r}" fill="url(#gold)" stroke="{GOLD_D}" stroke-width=".8"/>'
    rx = abs(1 - abs(k) * 2) * r
    side = 1 if k > 0 else 0
    sweep = side if abs(k) < .5 else 1 - side
    d = (f'M{f(x)} {f(y - r)} A{r} {r} 0 0 {side} {f(x)} {f(y + r)} '
         f'A{f(max(rx, .1))} {r} 0 0 {sweep} {f(x)} {f(y - r)}Z')
    return (f'<circle cx="{f(x)}" cy="{f(y)}" r="{r}" fill="#0c1630" stroke="{GOLD}" stroke-width="1"/>'
            f'<path d="{d}" fill="url(#gold)"/>')


def vine(x, y0, y1, flip, seed):
    rnd = random.Random(seed)
    pts, leaves = [], []
    n = 26
    for i in range(n + 1):
        t = i / n
        y = y0 + (y1 - y0) * t
        xx = x + math.sin(t * math.pi * 6) * 6 * flip
        pts.append(f'{f(xx)} {f(y)}')
        if i % 2 == 1:
            a = rnd.uniform(-40, 40) + (40 if i % 4 == 1 else -40)
            leaves.append(f'<ellipse cx="{f(xx + 6 * flip * (1 if i % 4 == 1 else -1))}" cy="{f(y)}" rx="5" ry="2.2" fill="{GOLD}" opacity=".9" transform="rotate({f(a)} {f(xx)} {f(y)})"/>')
    return f'<polyline points="{" ".join(pts)}" fill="none" stroke="{GOLD}" stroke-width="1.4"/>' + ''.join(leaves)


def sparkle(x, y, s, op=1, color='#fff4cc'):
    k = s * .22
    return (f'<path d="M{f(x)} {f(y - s)} Q{f(x + k)} {f(y - k)} {f(x + s)} {f(y)} Q{f(x + k)} {f(y + k)} {f(x)} {f(y + s)} '
            f'Q{f(x - k)} {f(y + k)} {f(x - s)} {f(y)} Q{f(x - k)} {f(y - k)} {f(x)} {f(y - s)}Z" fill="{color}" opacity="{op}"/>')


def stars(seed, n, y0=60, y1=560):
    rnd = random.Random(seed)
    out = []
    for _ in range(n):
        out.append(f'<circle cx="{f(rnd.uniform(40, 438))}" cy="{f(rnd.uniform(y0, y1))}" r="{rnd.choice([.6, .8, 1, 1.3])}" fill="#fff3cf" opacity="{f(rnd.uniform(.4, .95))}"/>')
    for _ in range(9):
        out.append(sparkle(rnd.uniform(50, 428), rnd.uniform(y0 + 10, y1 - 60), rnd.uniform(3, 6), rnd.uniform(.6, 1)))
    return ''.join(out)


def constellation(pts):
    d = 'M' + ' L'.join(f'{x} {y}' for x, y in pts)
    return f'<path d="{d}" stroke="#f3e0a8" stroke-width=".7" fill="none" opacity=".55"/>' + ''.join(
        f'<circle cx="{x}" cy="{y}" r="1.8" fill="#fff4cc"/>' for x, y in pts)


def frame(name, art, seed):
    body = [defs(),
            f'<rect width="{W}" height="{H}" fill="url(#parch)"/>',
            f'<rect x="10" y="10" width="{W - 20}" height="{H - 20}" rx="12" fill="none" stroke="{GOLD_D}" stroke-width="1.2" opacity=".6"/>',
            f'<rect x="30" y="30" width="418" height="580" rx="10" fill="url(#night)"/>',
            f'<g clip-path="url(#panel)">{stars(seed, 110)}{art}</g>',
            f'<rect x="30" y="30" width="418" height="580" rx="10" fill="none" stroke="{GOLD}" stroke-width="3"/>',
            f'<rect x="38" y="38" width="402" height="564" rx="8" fill="none" stroke="{GOLD}" stroke-width="1"/>',
            vine(48, 110, 540, 1, seed), vine(430, 110, 540, -1, seed + 1)]
    # 위쪽 달 위상 줄
    phases = [1, .7, .4, 0, -.4, -.7, -1]
    for i, k in enumerate(phases):
        x = 239 + (i - 3) * 46
        r = 13 if i == 3 else 10
        body.append(moon_phase(x, 58, r, k if abs(k) < 1 else (.92 if k > 0 else -.92)))
    # 모서리 원 장식
    for cx, cy in [(54, 54), (424, 54), (54, 586), (424, 586)]:
        body.append(f'<circle cx="{cx}" cy="{cy}" r="12" fill="#0c1630" stroke="{GOLD}" stroke-width="1.6"/>'
                    f'<path d="M{cx - 6} {cy} a7 7 0 1 0 6 -6 a5 5 0 1 1 -6 6z" fill="url(#gold)"/>')
    # 이름 두루마리
    body.append('<path d="M92 568 h294 l-10 16 l10 16 h-294 l10 -16z" fill="#efe2c2" stroke="#8a6224" stroke-width="1.5"/>'
                '<path d="M92 568 l-22 6 l8 10 l-8 10 l22 6z M386 568 l22 6 l-8 10 l8 10 l-22 6z" fill="#d9c49a" stroke="#8a6224" stroke-width="1.2"/>'
                f'<text x="239" y="592" text-anchor="middle" font-family="Georgia, \'Times New Roman\', serif" font-size="21" font-weight="700" letter-spacing="1.5" fill="{INK}">{name}</text>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{"".join(body)}</svg>'


def cup(x, y, s=1, rot=0, lid=False):
    """금빛 성배. (x, y)는 잔 받침 바닥 가운데."""
    g = (f'<g transform="translate({f(x)} {f(y)}) rotate({rot}) scale({s})">'
         '<path d="M-16 0 h32 l-4 -6 h-24z" fill="url(#gold)" stroke="#5a3d12" stroke-width="1.2"/>'
         '<path d="M-3 -6 v-20 h6 v20z" fill="url(#gold)" stroke="#5a3d12" stroke-width="1.2"/>'
         '<ellipse cx="0" cy="-27" rx="7" ry="3" fill="url(#gold)" stroke="#5a3d12" stroke-width="1"/>'
         '<path d="M-20 -62 C-20 -40 -12 -30 0 -30 C12 -30 20 -40 20 -62Z" fill="url(#gold)" stroke="#5a3d12" stroke-width="1.4"/>'
         '<ellipse cx="0" cy="-62" rx="20" ry="5" fill="#f8e3a0" stroke="#5a3d12" stroke-width="1.2"/>'
         '<path d="M-14 -50 h28" stroke="#8a6224" stroke-width="1" opacity=".7"/>'
         '<circle cx="0" cy="-44" r="2.6" fill="#c0392b" stroke="#5a3d12" stroke-width=".6"/>')
    if lid:
        g += ('<path d="M-20 -63 C-18 -78 18 -78 20 -63Z" fill="url(#gold)" stroke="#5a3d12" stroke-width="1.2"/>'
              '<path d="M0 -76 v-10 M-5 -82 h10" stroke="url(#gold)" stroke-width="3" stroke-linecap="round"/>')
    return g + '</g>'


def waves(y, n=3, color=GOLD, op=.6, amp=5):
    out = []
    for r in range(n):
        yy = y + r * 14
        d = ''
        w = 46
        for i in range(12):
            x = 20 + i * w + (r % 2) * w / 2
            d += f'M{f(x)} {f(yy)} q{f(w / 4)} {-amp} {f(w / 2)} 0 q{f(-w / 8)} {f(-amp * .9)} {f(-w / 4)} {f(-amp * .3)} '
        out.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="1.3" opacity="{f(op - r * .12)}"/>')
    return ''.join(out)


def lotus(x, y, s=1):
    out = [f'<g transform="translate({f(x)} {f(y)}) scale({s})">']
    for a, sc in [(-55, .8), (55, .8), (-28, .95), (28, .95), (0, 1.05)]:
        out.append(f'<path transform="rotate({a}) scale({sc})" d="M0 0 C-7 -8 -6 -20 0 -26 C6 -20 7 -8 0 0Z" fill="#f6d6e0" stroke="#8a6224" stroke-width=".8"/>')
    out.append('<ellipse cx="0" cy="2" rx="16" ry="3.5" fill="#2f6b4a"/></g>')
    return ''.join(out)


def rose(x, y, r=6):
    return (f'<circle cx="{f(x)}" cy="{f(y)}" r="{r}" fill="#b8323a" stroke="#5a1418" stroke-width=".8"/>'
            f'<path d="M{f(x - r * .5)} {f(y)} a{f(r * .5)} {f(r * .5)} 0 1 1 {f(r * .6)} {f(r * .3)}" fill="none" stroke="#e88a8a" stroke-width=".9"/>'
            f'<ellipse cx="{f(x + r)}" cy="{f(y + r * .6)}" rx="{f(r * .7)}" ry="{f(r * .3)}" fill="#3f7a4a" transform="rotate(30 {f(x + r)} {f(y + r * .6)})"/>')


def two_of_cups():
    art = [constellation([(80, 120), (110, 104), (140, 118), (168, 102)]), constellation([(320, 108), (350, 124), (382, 110), (402, 132)]),
           f'<rect x="30" y="440" width="418" height="170" fill="url(#sea)"/>', waves(452, 4),
           lotus(96, 520, 1.1), lotus(380, 528, 1)]
    # 두 뱀 지팡이와 날개 달린 하트
    art += ['<path d="M239 168 V420" stroke="url(#gold)" stroke-width="4"/>']
    s1 = 'M239 410 C214 390 214 370 239 350 C264 330 264 310 239 290 C214 270 214 250 239 230 C258 214 254 200 244 196'
    s2 = 'M239 410 C264 390 264 370 239 350 C214 330 214 310 239 290 C264 270 264 250 239 230 C220 214 224 200 234 196'
    art += [f'<path d="{s1}" fill="none" stroke="#3f8a5a" stroke-width="4" stroke-linecap="round"/>',
            f'<path d="{s2}" fill="none" stroke="#c8a040" stroke-width="4" stroke-linecap="round"/>',
            '<circle cx="245" cy="195" r="4" fill="#3f8a5a"/><circle cx="233" cy="195" r="4" fill="#c8a040"/>']
    wing = 'M0 0 C-14 -16 -40 -18 -58 -8 C-44 -6 -34 -2 -28 4 C-40 4 -50 8 -56 16 C-40 12 -22 12 -8 8Z'
    art += [f'<path transform="translate(226 150)" d="{wing}" fill="#f3e6c8" stroke="{GOLD_D}" stroke-width="1.2"/>',
            f'<path transform="translate(252 150) scale(-1 1)" d="{wing}" fill="#f3e6c8" stroke="{GOLD_D}" stroke-width="1.2"/>',
            '<circle cx="239" cy="150" r="46" fill="url(#glow)" opacity=".6"/>',
            '<path d="M239 172 C206 150 214 120 239 136 C264 120 272 150 239 172Z" fill="#c0392b" stroke="#5a1418" stroke-width="1.6"/>']
    # 마주 닿는 두 잔과 빛
    art += ['<circle cx="239" cy="300" r="70" fill="url(#glow)" opacity=".55"/>',
            cup(196, 372, 1.35, 14), cup(282, 372, 1.35, -14),
            sparkle(239, 284, 10), sparkle(226, 300, 4, .9), sparkle(254, 296, 5, .9)]
    # 장미 덩굴
    for i, (x, y) in enumerate([(70, 240), (82, 300), (70, 360), (408, 240), (396, 300), (408, 360)]):
        art.append(rose(x, y, 6 + (i % 2)))
    art.append('<path d="M72 210 C92 260 60 320 80 390 M406 210 C386 260 418 320 398 390" fill="none" stroke="#3f7a4a" stroke-width="2"/>')
    return frame('TWO of CUPS', ''.join(art), 41)


def eight_of_cups():
    art = [constellation([(320, 96), (346, 118), (372, 104), (400, 124)]),
           # 일식처럼 겹친 달
           '<circle cx="150" cy="150" r="58" fill="url(#glow)" opacity=".7"/>',
           '<circle cx="150" cy="150" r="38" fill="url(#gold)"/>',
           '<circle cx="164" cy="142" r="34" fill="#13234a"/>',
           # 산과 강
           '<path d="M30 380 L110 250 L170 330 L240 220 L320 320 L370 270 L448 360 V420 H30Z" fill="#203458" stroke="#d9b25a" stroke-width="1.4"/>',
           '<path d="M240 220 L262 252 L248 250 L232 262Z M110 250 L126 276 L102 270Z" fill="#e8ecf4" opacity=".85"/>',
           '<path d="M30 400 C120 380 200 420 300 396 C360 382 410 400 448 392 V470 H30Z" fill="url(#sea)"/>',
           waves(418, 2, op=.5, amp=4),
           # 산길과 떠나는 사람
           '<path d="M300 400 C310 380 300 362 316 344 C326 332 318 318 330 304" fill="none" stroke="#e6d4ac" stroke-width="2.4" stroke-dasharray="4 4" opacity=".8"/>',
           '<g transform="translate(318 336)">'
           '<path d="M0 -30 C-9 -26 -12 -8 -14 14 L12 14 C10 -8 8 -26 0 -30Z" fill="#9a2a2a" stroke="#4a1010" stroke-width="1"/>'
           '<circle cx="0" cy="-32" r="6" fill="#7a1e1e" stroke="#4a1010" stroke-width="1"/>'
           '<path d="M12 -26 L18 16" stroke="#c8a060" stroke-width="2.4" stroke-linecap="round"/>'
           '</g>',
           f'<rect x="30" y="470" width="418" height="140" fill="#1a2a3a"/>',
           '<path d="M30 470 C140 460 330 476 448 466" stroke="#d9b25a" stroke-width="1.2" fill="none" opacity=".6"/>']
    # 쌓인 여덟 잔 — 아래 다섯, 위 셋(한 자리는 비어 있다)
    for i in range(5):
        art.append(cup(100 + i * 46, 548, .95))
    for i, x in enumerate([123, 169, 261]):
        art.append(cup(x, 486, .95))
    art.append('<path d="M196 486 h50" stroke="#d9b25a" stroke-width="1" stroke-dasharray="3 3" opacity=".5"/>')
    return frame('EIGHT of CUPS', ''.join(art), 42)


def ten_of_cups():
    art = []
    cx, cy, rx, ry = 239, 330, 176, 210
    colors = ['#d94a4a', '#e8923a', '#f1d24a', '#4aa86a', '#4a7ad9']
    for i, c in enumerate(colors):
        r1, r2 = rx - i * 9, ry - i * 9
        art.append(f'<path d="M{cx - r1} {cy} A{r1} {r2} 0 0 1 {cx + r1} {cy}" fill="none" stroke="{c}" stroke-width="9" opacity=".85"/>')
    for i in range(10):
        t = math.pi * (i + .5) / 10
        x, y = cx - math.cos(t) * (rx - 18), cy - math.sin(t) * (ry - 18)
        art.append(cup(x, y + 26, .62))
    art += ['<path d="M30 400 C120 360 200 380 260 372 C340 360 400 340 448 356 V610 H30Z" fill="#2f6b4a"/>',
            '<path d="M30 430 C140 410 250 440 448 410 V610 H30Z" fill="#3f8a5a"/>',
            '<path d="M260 470 C300 452 330 470 380 456 C410 448 430 452 448 450 V490 C400 488 330 500 260 500Z" fill="url(#sea)" opacity=".9"/>',
            # 언덕 위 집과 나무
            '<g transform="translate(366 380)"><rect x="-20" y="-20" width="40" height="28" fill="#efe2c2" stroke="#5a3d12" stroke-width="1.2"/>'
            '<path d="M-26 -20 L0 -40 L26 -20Z" fill="#b8323a" stroke="#5a1418" stroke-width="1.2"/>'
            '<rect x="-5" y="-6" width="10" height="14" fill="#8a5a2a"/><rect x="8" y="-14" width="7" height="7" fill="#f8e3a0"/></g>',
            '<circle cx="410" cy="372" r="14" fill="#2a5a3a"/><rect x="408" y="382" width="4" height="12" fill="#5a3d12"/>',
            '<circle cx="326" cy="384" r="11" fill="#2a5a3a"/><rect x="324" y="392" width="4" height="10" fill="#5a3d12"/>']
    # 손을 든 두 사람과 춤추는 아이 둘

    def person(x, y, robe, s=1, arm=True):
        g = f'<g transform="translate({x} {y}) scale({s})">'
        g += f'<path d="M0 -40 C-12 -34 -16 -10 -18 18 H18 C16 -10 12 -34 0 -40Z" fill="{robe}" stroke="#2a1a0a" stroke-width="1"/>'
        g += '<circle cx="0" cy="-48" r="8" fill="#f0cfa8" stroke="#2a1a0a" stroke-width="1"/>'
        if arm:
            g += '<path d="M-8 -32 L-20 -62 M8 -32 L20 -62" stroke="#f0cfa8" stroke-width="4" stroke-linecap="round"/>'
        return g + '</g>'
    art += [person(180, 520, '#a83a3a'), person(222, 522, '#3a6aa8'),
            person(110, 536, '#d9b25a', .62, False), person(140, 540, '#7a4a9a', .58, False),
            '<path d="M104 512 L92 500 M116 512 L126 498 M134 518 L122 506 M146 518 L156 506" stroke="#f0cfa8" stroke-width="3" stroke-linecap="round"/>',
            sparkle(239, 150, 9), sparkle(110, 200, 5, .8), sparkle(368, 196, 5, .8)]
    return frame('TEN of CUPS', ''.join(art), 43)


def queen_of_cups():
    art = ['<path d="M30 420 C140 410 330 430 448 414 V610 H30Z" fill="url(#sea)"/>', waves(440, 4),
           '<path d="M330 120 a26 26 0 1 0 18 44 a20 20 0 1 1 -18 -44z" fill="url(#gold)"/>',
           constellation([(70, 110), (96, 132), (124, 118), (150, 140)]),
           # 바위 단과 조개 왕좌
           '<path d="M120 520 L136 456 H342 L358 520Z" fill="#8a8f9a" stroke="#3a3f4a" stroke-width="1.4"/>',
           '<path d="M136 456 H342" stroke="#c8ccd6" stroke-width="2"/>']
    for i in range(9):
        a = math.pi * (i / 8)
        x, y = 239 - math.cos(a) * 96, 300 - math.sin(a) * 120
        art.append(f'<path d="M239 330 L{f(x)} {f(y)}" stroke="#c8ccd6" stroke-width="2" opacity=".8"/>')
    art += ['<path d="M143 330 A96 120 0 0 1 335 330Z" fill="#a8adb8" opacity=".55" stroke="#e6e8ee" stroke-width="2"/>',
            '<rect x="150" y="330" width="178" height="126" rx="6" fill="#9aa0ac" stroke="#3a3f4a" stroke-width="1.4"/>',
            # 여왕 — 긴 머리·드레스·왕관
            '<path d="M200 230 C188 260 186 320 194 360 L284 360 C292 320 290 260 278 230Z" fill="#6a3a1e"/>',
            '<path d="M190 460 C192 380 206 320 239 300 C272 320 286 380 288 460Z" fill="#2f7a8a" stroke="#123a44" stroke-width="1.4"/>',
            '<path d="M239 300 C226 330 222 400 220 460 M239 300 C252 330 256 400 258 460" stroke="#d9b25a" stroke-width="2" fill="none"/>',
            '<path d="M196 460 C200 430 212 420 226 418 M282 460 C278 430 266 420 252 418" stroke="#d9b25a" stroke-width="1.6" fill="none"/>',
            '<path d="M222 300 C230 292 248 292 256 300 L252 316 C244 312 234 312 226 316Z" fill="#f0cfa8"/>',
            '<ellipse cx="239" cy="262" rx="22" ry="27" fill="#f0cfa8" stroke="#5a3d12" stroke-width="1"/>',
            '<path d="M228 258 q4 3 8 0 M242 258 q4 3 8 0" stroke="#3a2a14" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
            '<path d="M234 274 q5 3 10 0" stroke="#a8454a" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
            '<path d="M216 252 C214 230 226 222 239 222 C252 222 264 230 262 252 C254 240 224 240 216 252Z" fill="#6a3a1e"/>',
            '<path d="M218 228 L222 206 L230 220 L239 200 L248 220 L256 206 L260 228Z" fill="url(#gold)" stroke="#5a3d12" stroke-width="1.2"/>',
            '<circle cx="239" cy="214" r="3" fill="#2f7a8a"/>',
            # 두 손으로 든 뚜껑 덮인 잔
            '<circle cx="239" cy="360" r="46" fill="url(#glow)" opacity=".6"/>',
            cup(239, 398, 1.05, 0, True),
            '<path d="M212 384 C218 392 226 394 230 390 M266 384 C260 392 252 394 248 390" stroke="#f0cfa8" stroke-width="7" stroke-linecap="round" fill="none"/>',
            lotus(110, 540, 1.1), lotus(372, 548, 1),
            # 뛰어오르는 물고기
            '<path d="M84 470 C96 448 120 444 132 456 C120 458 108 466 100 480 Z" fill="url(#gold)" stroke="#5a3d12" stroke-width="1"/>',
            '<path d="M84 470 l-10 -6 l4 12z" fill="url(#gold)" stroke="#5a3d12" stroke-width="1"/>',
            sparkle(360, 250, 6, .9), sparkle(118, 230, 5, .8)]
    return frame('QUEEN of CUPS', ''.join(art), 44)


CARDS = {'cups-02': two_of_cups, 'cups-08': eight_of_cups, 'cups-10': ten_of_cups, 'cups-13-queen': queen_of_cups}

if __name__ == '__main__':
    out = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
    out.mkdir(parents=True, exist_ok=True)
    for key, fn in CARDS.items():
        (out / f'{key}.svg').write_text(fn(), encoding='utf-8')
        print(key)
