#!/usr/bin/env python3
"""풀이별 포스터 배경(SVG)을 만든다. 글자는 넣지 않고 그림만 그린다.

제목·부제는 화면에서 HTML로 얹는다(서체·접근성·번역 때문).
모든 포스터는 300×400(3:4) 좌표계를 쓰고, 화면에서는 cover로 잘라 쓴다.
별 위치는 고정 시드라 다시 돌려도 같은 그림이 나온다.

    python3 tools/generate_posters.py
"""
import math
import random
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'posters'
W, H = 300, 400


def f(n):
    return f'{n:.1f}'.rstrip('0').rstrip('.')


def svg(body, defs=''):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
            f'preserveAspectRatio="xMidYMid slice"><defs>{defs}'
            '<filter id="blur8" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>'
            '<filter id="blur3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>'
            '<filter id="blur20" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="20"/></filter>'
            f'</defs>{body}</svg>')


def _stops(stops):
    out = []
    for t in stops:
        o, c, a = (tuple(t) + (None,))[:3]
        op = '' if a is None else f' stop-opacity="{a}"'
        out.append(f'<stop offset="{o}" stop-color="{c}"{op}/>')
    return ''.join(out)


def lin(id_, stops, x1=0, y1=0, x2=0, y2=1):
    s = _stops(stops)
    return f'<linearGradient id="{id_}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">{s}</linearGradient>'


def rad(id_, stops, cx=.5, cy=.5, r=.5):
    s = _stops(stops)
    return f'<radialGradient id="{id_}" cx="{cx}" cy="{cy}" r="{r}">{s}</radialGradient>'


def stars(seed, n, y0=0, y1=H, color='#fff', big=4):
    rnd = random.Random(seed)
    out = []
    for _ in range(n):
        x, y = rnd.uniform(0, W), rnd.uniform(y0, y1)
        r = rnd.choice([.5, .6, .7, .8, 1, 1.2])
        out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{r}" fill="{color}" opacity="{f(rnd.uniform(.25, .9))}"/>')
    for _ in range(big):
        x, y = rnd.uniform(15, W - 15), rnd.uniform(y0 + 10, y1 - 10)
        out.append(sparkle(x, y, rnd.uniform(4, 7), color, rnd.uniform(.6, 1)))
    return ''.join(out)


def sparkle(x, y, s, color='#fff', op=1):
    k = s * .22
    d = (f'M{f(x)} {f(y - s)} Q{f(x + k)} {f(y - k)} {f(x + s)} {f(y)} '
         f'Q{f(x + k)} {f(y + k)} {f(x)} {f(y + s)} Q{f(x - k)} {f(y + k)} {f(x - s)} {f(y)} '
         f'Q{f(x - k)} {f(y - k)} {f(x)} {f(y - s)}Z')
    return f'<path d="{d}" fill="{color}" opacity="{f(op)}"/>'


def ridge(seed, base, amp, peaks, rough=6, x0=-10, x1=W + 10):
    """부드러운 산등성이 경로(아래는 화면 끝까지 채움)."""
    rnd = random.Random(seed)
    pts = []
    step = (x1 - x0) / (peaks * 2)
    for i in range(peaks * 2 + 1):
        x = x0 + i * step
        y = base - (amp * rnd.uniform(.65, 1) if i % 2 else rnd.uniform(0, rough))
        pts.append((x, y))
    d = f'M{f(x0)} {H + 5} L{f(pts[0][0])} {f(pts[0][1])}'
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        mx = (ax + bx) / 2
        d += f' C{f(mx)} {f(ay)} {f(mx)} {f(by)} {f(bx)} {f(by)}'
    return d + f' L{f(x1)} {H + 5}Z'


def waves(y, color, op=.5, n=7, amp=6, sw=1.4):
    out = []
    for row in range(3):
        yy = y + row * 14
        d = ''
        w = W / n
        for i in range(n + 2):
            x = -w / 2 + i * w + (row % 2) * w / 2
            d += (f'M{f(x - w / 2)} {f(yy)} q{f(w / 4)} {f(-amp)} {f(w / 2)} 0 '
                  f'q{f(-w / 8)} {f(-amp * .9)} {f(-w / 4)} {f(-amp * .3)} ')
        out.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{sw}" '
                   f'stroke-linecap="round" opacity="{f(op - row * .12)}"/>')
    return ''.join(out)


def cloud(x, y, s, color, op=.5, sw=1.6):
    """구름 문양 — 소용돌이 세 개를 이은 전통 운문(雲紋)."""
    d = (f'M{f(x - 30 * s)} {f(y)} c0 -10 {f(12 * s)} -14 {f(18 * s)} -6 '
         f'c4 -14 {f(26 * s)} -16 {f(32 * s)} -2 c10 -6 {f(22 * s)} 2 {f(18 * s)} {f(10 * s)} '
         f'L{f(x - 30 * s)} {f(y)}Z')
    sw_ = (f'<path d="M{f(x - 8 * s)} {f(y - 6 * s)} a5 5 0 1 1 {f(8 * s)} 3 a3 3 0 1 1 -4 -2" '
           f'fill="none" stroke="{color}" stroke-width="{sw}" opacity="{f(op)}"/>')
    return (f'<path d="{d}" fill="{color}" opacity="{f(op * .35)}"/>'
            f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{sw}" opacity="{f(op)}"/>' + sw_)


def ring_ticks(cx, cy, r, n, l, color, sw=1, op=.6, every=0, l2=0):
    out = []
    for i in range(n):
        a = math.tau * i / n
        ll = l2 if every and i % every == 0 else l
        x1, y1 = cx + math.cos(a) * r, cy + math.sin(a) * r
        x2, y2 = cx + math.cos(a) * (r - ll), cy + math.sin(a) * (r - ll)
        out.append(f'M{f(x1)} {f(y1)}L{f(x2)} {f(y2)}')
    return f'<path d="{"".join(out)}" stroke="{color}" stroke-width="{sw}" opacity="{f(op)}"/>'


def vignette():
    return (lin('vg', [(0, '#000', 0), (.55, '#000', 0), (1, '#000', .55)])
            , '<rect width="300" height="400" fill="url(#vg)"/>')


# ── 포스터별 그림 ───────────────────────────────────────────────

def life():
    """인생총운 — 일월오봉도. 해·달과 다섯 봉우리, 아래로 물결."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#041a17'), (.55, '#0b3d35'), (1, '#1b6b58')]) +
            rad('moonG', [(0, '#fff6d8'), (.7, '#f3dfa0'), (1, '#c99a45')]) +
            rad('sunG', [(0, '#ff9a6b'), (.7, '#f0503a'), (1, '#b3261e')]) +
            lin('m1', [(0, '#2a8c74'), (1, '#0d3a31')]) +
            lin('m2', [(0, '#1f7a64'), (1, '#0a2e27')]) +
            lin('m3', [(0, '#3aa184'), (1, '#0f4237')]) + vd)
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(11, 70, 0, 230, '#f8eccb', 5),
            '<circle cx="78" cy="96" r="44" fill="#f6e3a6" opacity=".35" filter="url(#blur20)"/>',
            '<circle cx="78" cy="96" r="30" fill="url(#moonG)"/>',
            '<circle cx="226" cy="84" r="44" fill="#ff6a4a" opacity=".35" filter="url(#blur20)"/>',
            '<circle cx="226" cy="84" r="30" fill="url(#sunG)"/>',
            f'<path d="{ridge(3, 250, 120, 2, x0=-40, x1=340)}" fill="url(#m2)" opacity=".9"/>',
            f'<path d="{ridge(5, 290, 120, 3)}" fill="url(#m1)"/>',
            f'<path d="{ridge(5, 290, 120, 3)}" fill="none" stroke="#e9c873" stroke-width="1.3" opacity=".7"/>',
            f'<path d="{ridge(8, 325, 70, 4)}" fill="url(#m3)"/>',
            f'<path d="{ridge(8, 325, 70, 4)}" fill="none" stroke="#e9c873" stroke-width="1" opacity=".55"/>',
            '<rect y="330" width="300" height="70" fill="#072a3a"/>',
            waves(342, '#9fe0d0', .7, 6, 7, 1.5), waves(372, '#e9c873', .55, 5, 8, 1.4),
            # 소나무 두 그루
            '<g fill="#08211c" opacity=".95">'
            '<path d="M24 330 l3 -40 l3 40z"/><ellipse cx="27" cy="292" rx="16" ry="5"/><ellipse cx="22" cy="304" rx="13" ry="4"/><ellipse cx="32" cy="314" rx="14" ry="4"/>'
            '<path d="M270 330 l3 -52 l3 52z"/><ellipse cx="273" cy="280" rx="18" ry="5"/><ellipse cx="266" cy="294" rx="14" ry="4"/><ellipse cx="280" cy="306" rx="15" ry="4.5"/>'
            '</g>', vr]
    return svg(''.join(body), defs)


def newyear():
    """신년운세 — 붉은 밤하늘에 터지는 불꽃과 청사초롱."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#1c0309'), (.5, '#5c0b19'), (1, '#b02a22')]) +
            lin('lant', [(0, '#ff6d4d'), (1, '#b3171d')]) +
            lin('lantB', [(0, '#4f7bff'), (1, '#1d2f8c')]) + vd)
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(21, 60, 0, 260, '#ffe2c4', 4)]

    def burst(cx, cy, r, color, n=18, seed=0):
        rnd = random.Random(seed)
        out = [f'<circle cx="{cx}" cy="{cy}" r="{r * .8}" fill="{color}" opacity=".18" filter="url(#blur8)"/>']
        for i in range(n):
            a = math.tau * i / n + rnd.uniform(-.05, .05)
            rr = r * rnd.uniform(.75, 1)
            x1, y1 = cx + math.cos(a) * rr * .25, cy + math.sin(a) * rr * .25
            x2, y2 = cx + math.cos(a) * rr, cy + math.sin(a) * rr
            out.append(f'<path d="M{f(x1)} {f(y1)}L{f(x2)} {f(y2)}" stroke="{color}" stroke-width="1.6" stroke-linecap="round" opacity=".9"/>')
            out.append(f'<circle cx="{f(x2 + math.cos(a) * 4)}" cy="{f(y2 + math.sin(a) * 4)}" r="1.4" fill="{color}"/>')
        return ''.join(out)

    body += [burst(80, 90, 46, '#ffd27a', 20, 1), burst(220, 60, 34, '#ff9a8a', 16, 2),
             burst(240, 160, 26, '#ffe9b0', 14, 3), burst(60, 190, 22, '#ffb26b', 12, 4)]

    def lantern(x, y, s, grad, rope=60):
        return (f'<path d="M{x} {y - rope}V{y - 22 * s}" stroke="#f5d9a0" stroke-width="1" opacity=".7"/>'
                f'<ellipse cx="{x}" cy="{y}" rx="{30 * s}" ry="{30 * s}" fill="#ff8a5a" opacity=".35" filter="url(#blur8)"/>'
                f'<rect x="{f(x - 10 * s)}" y="{f(y - 24 * s)}" width="{f(20 * s)}" height="{f(5 * s)}" rx="1.5" fill="#e8c46a"/>'
                f'<path d="M{f(x - 14 * s)} {f(y - 19 * s)} Q{f(x - 24 * s)} {y} {f(x - 14 * s)} {f(y + 19 * s)} '
                f'H{f(x + 14 * s)} Q{f(x + 24 * s)} {y} {f(x + 14 * s)} {f(y - 19 * s)}Z" fill="url(#{grad})"/>'
                f'<path d="M{f(x - 6 * s)} {f(y - 19 * s)} Q{f(x - 10 * s)} {y} {f(x - 6 * s)} {f(y + 19 * s)} '
                f'M{f(x + 6 * s)} {f(y - 19 * s)} Q{f(x + 10 * s)} {y} {f(x + 6 * s)} {f(y + 19 * s)}" '
                f'stroke="#ffd9a8" stroke-width=".9" fill="none" opacity=".55"/>'
                f'<rect x="{f(x - 10 * s)}" y="{f(y + 19 * s)}" width="{f(20 * s)}" height="{f(5 * s)}" rx="1.5" fill="#e8c46a"/>'
                f'<path d="M{x} {f(y + 24 * s)}v{f(14 * s)}" stroke="#e8c46a" stroke-width="2"/>')

    body += [lantern(40, 270, 1.05, 'lant', 300), lantern(262, 250, 1.15, 'lantB', 300),
             lantern(150, 300, .8, 'lant', 320)]
    body += [cloud(70, 372, 1.6, '#ffd9b0', .55), cloud(230, 386, 1.9, '#ffd9b0', .45),
             cloud(150, 350, 1.1, '#ffe7c7', .4), vr]
    return svg(''.join(body), defs)


def gunghap():
    """궁합 — 두 개의 달과 붉은 실, 흩날리는 꽃잎."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#16051b'), (.55, '#4d1238'), (1, '#b13c6c')]) +
            rad('mA', [(0, '#fff2f5'), (.7, '#ffc9d6'), (1, '#e8869f')]) +
            rad('mB', [(0, '#fff8e6'), (.7, '#f7dca0'), (1, '#d9a352')]) + vd)
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(31, 80, 0, 300, '#ffe6ee', 6),
            '<circle cx="100" cy="140" r="56" fill="#ffb3c6" opacity=".3" filter="url(#blur20)"/>',
            '<circle cx="200" cy="140" r="56" fill="#ffd98a" opacity=".28" filter="url(#blur20)"/>',
            '<circle cx="104" cy="142" r="44" fill="url(#mA)"/>',
            '<circle cx="196" cy="142" r="44" fill="url(#mB)"/>',
            '<path d="M150 106 a44 44 0 0 1 0 72 a44 44 0 0 1 0 -72z" fill="#fff" opacity=".35"/>']
    # 붉은 실 — 두 달 아래에서 이어져 매듭(하트)을 짓는다
    thread = ('M30 250 C70 230 90 300 130 280 C150 270 140 240 150 236 '
              'C160 240 150 270 170 280 C210 300 230 230 270 250')
    body += [f'<path d="{thread}" fill="none" stroke="#ff3b5c" stroke-width="5" opacity=".35" filter="url(#blur3)"/>',
             f'<path d="{thread}" fill="none" stroke="#ff4d6d" stroke-width="2.2" stroke-linecap="round"/>',
             '<path d="M150 262 c-14 -14 -30 -2 -18 12 l18 18 l18 -18 c12 -14 -4 -26 -18 -12z" fill="#ff4d6d"/>',
             '<path d="M150 262 c-14 -14 -30 -2 -18 12 l18 18 l18 -18 c12 -14 -4 -26 -18 -12z" fill="#ff6b86" opacity=".6" filter="url(#blur8)"/>']
    rnd = random.Random(7)
    for _ in range(18):
        x, y, s, rot = rnd.uniform(0, W), rnd.uniform(180, H), rnd.uniform(4, 8), rnd.uniform(0, 360)
        body.append(f'<path transform="translate({f(x)} {f(y)}) rotate({f(rot)})" '
                    f'd="M0 {-s} C{s} {-s * .4} {s * .6} {s} 0 {s} C{-s * .6} {s} {-s} {-s * .4} 0 {-s}z" '
                    f'fill="#ffc2d1" opacity="{f(rnd.uniform(.35, .8))}"/>')
    body.append(vr)
    return svg(''.join(body), defs)


def name():
    """이름풀이 — 먹물 붓질과 붉은 낙관."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#0a0c24'), (.6, '#1f2560'), (1, '#463a9a')]) +
            lin('ink', [(0, '#f3ead8'), (1, '#c9b48a')], 0, 0, 1, 1) +
            lin('seal', [(0, '#ff5a4a'), (1, '#c21f2a')], 0, 0, 1, 1) + vd)
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(41, 50, 0, 400, '#e6e2ff', 4),
            # 한지 질감 원
            '<circle cx="150" cy="180" r="110" fill="#f3ead8" opacity=".06"/>',
            '<circle cx="150" cy="180" r="84" fill="none" stroke="#e8c46a" stroke-width="1" opacity=".35"/>',
            '<circle cx="150" cy="180" r="92" fill="none" stroke="#e8c46a" stroke-width=".6" opacity=".25" stroke-dasharray="2 4"/>']
    # 원상(圓相) — 붓을 한 번 돌려 그린 원. 붓 자국(점)을 이어 굵기와 마른 끝을 표현한다.
    rnd = random.Random(17)
    dabs, dry = [], []
    cx, cy, R = 150, 180, 76
    start, end = math.radians(-60), math.radians(255)
    n = 170
    for i in range(n):
        t = i / (n - 1)
        a = start + (end - start) * t
        w = 3 + 9 * (math.sin(min(t * 1.25, 1) * math.pi) ** .6) * (1 - .55 * t)
        rr = R + rnd.uniform(-1, 1) + 4 * math.sin(t * 5)
        x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr
        dabs.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(w)}"/>')
        if t > .55:
            for off in (-w * .9, w * .8):
                if rnd.random() < .55:
                    x2, y2 = cx + math.cos(a) * (rr + off), cy + math.sin(a) * (rr + off)
                    dry.append(f'<circle cx="{f(x2)}" cy="{f(y2)}" r="{f(rnd.uniform(.6, 1.6))}"/>')
    body += [f'<g fill="#000" opacity=".35" transform="translate(3 5)" filter="url(#blur3)">{"".join(dabs)}</g>',
             f'<g fill="url(#ink)">{"".join(dabs)}</g>',
             f'<g fill="#efe3c8" opacity=".7">{"".join(dry)}</g>']
    rnd = random.Random(9)
    for _ in range(14):
        x, y, r = rnd.uniform(40, 260), rnd.uniform(100, 300), rnd.uniform(.8, 3.2)
        body.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r)}" fill="#efe3c8" opacity="{f(rnd.uniform(.3, .8))}"/>')
    # 낙관(도장) — 사각 안에 새긴 선
    body += ['<g transform="translate(206 250) rotate(-6)">'
             '<rect x="-4" y="-4" width="52" height="52" rx="6" fill="#ff4a3a" opacity=".35" filter="url(#blur8)"/>'
             '<rect width="44" height="44" rx="5" fill="url(#seal)"/>'
             '<path d="M9 10h26M9 22h26M9 34h26M22 10v24M13 10v24M31 10v24" stroke="#ffe6d6" stroke-width="2.2" opacity=".85" stroke-linecap="round"/>'
             '<rect x="3" y="3" width="38" height="38" rx="3" fill="none" stroke="#ffe6d6" stroke-width="1.4" opacity=".8"/>'
             '</g>',
             # 붓
             '<g transform="translate(60 330) rotate(-28)">'
             '<rect x="0" y="-4" width="120" height="8" rx="4" fill="#8a5a2b"/>'
             '<rect x="0" y="-4" width="120" height="3" rx="2" fill="#c08850" opacity=".7"/>'
             '<rect x="116" y="-5" width="10" height="10" rx="2" fill="#e8c46a"/>'
             '<path d="M126 -6 C150 -6 166 0 172 0 C166 0 150 6 126 6Z" fill="#1a1a2a"/>'
             '</g>', vr]
    return svg(''.join(body), defs)


def qna():
    """역술가에게 질문 — 수정구슬과 떠다니는 말풍선."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#0d0520'), (.55, '#2e1160'), (1, '#6b34c8')]) +
            rad('orb', [(0, '#f4e9ff'), (.35, '#b994ff'), (.8, '#5a2bb5'), (1, '#2b0f66')], .4, .35, .7) +
            lin('base', [(0, '#e8c46a'), (1, '#8a6224')]) + vd)
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(51, 80, 0, 400, '#efe2ff', 6),
            '<circle cx="150" cy="210" r="90" fill="#a77bff" opacity=".35" filter="url(#blur20)"/>',
            '<circle cx="150" cy="210" r="64" fill="url(#orb)"/>',
            '<ellipse cx="128" cy="184" rx="20" ry="12" fill="#fff" opacity=".5" transform="rotate(-30 128 184)"/>',
            '<path d="M110 232 q40 -30 80 -10" stroke="#fff" stroke-width="1.2" fill="none" opacity=".35"/>',
            sparkle(168, 214, 9, '#fff', .9), sparkle(140, 238, 5, '#fff', .7),
            '<path d="M104 268 h92 l12 26 h-116z" fill="url(#base)"/>',
            '<rect x="84" y="292" width="132" height="12" rx="6" fill="#b8893a"/>']

    def bubble(x, y, w, h, flip=False, color='#ffffff', op=.92):
        tail = (f'M{x + 14} {y + h} l-4 12 l14 -12z' if not flip else f'M{x + w - 14} {y + h} l4 12 l-14 -12z')
        dots = ''.join(f'<circle cx="{f(x + w / 2 + (i - 1) * 10)}" cy="{f(y + h / 2)}" r="2.6" fill="#5a2bb5"/>' for i in range(3))
        return (f'<g opacity="{op}"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h / 2}" fill="{color}"/>'
                f'<path d="{tail}" fill="{color}"/>{dots}</g>')

    body += [bubble(30, 70, 64, 30), bubble(196, 100, 74, 32, True, '#ffe9a8'),
             bubble(42, 140, 50, 24, False, '#d9c6ff', .8), vr]
    return svg(''.join(body), defs)


def astro():
    """점성술 — 별자리 원판과 고리 행성."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#030820'), (.55, '#0b1f5c'), (1, '#2450bf')]) +
            rad('pl', [(0, '#ffe8b8'), (.7, '#e8a85a'), (1, '#9a5a24')], .35, .35, .7) + vd)
    cx, cy = 150, 190
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(61, 110, 0, 400, '#dfe8ff', 7),
            f'<circle cx="{cx}" cy="{cy}" r="120" fill="#5b8cff" opacity=".18" filter="url(#blur20)"/>',
            f'<circle cx="{cx}" cy="{cy}" r="112" fill="none" stroke="#e8c46a" stroke-width="1.2" opacity=".7"/>',
            f'<circle cx="{cx}" cy="{cy}" r="96" fill="none" stroke="#e8c46a" stroke-width=".8" opacity=".5"/>',
            f'<circle cx="{cx}" cy="{cy}" r="60" fill="none" stroke="#bcd0ff" stroke-width=".8" opacity=".45"/>',
            ring_ticks(cx, cy, 112, 72, 4, '#e8c46a', .8, .6, 6, 16)]
    # 12궁 구분선 + 기호 대신 점
    for i in range(12):
        a = math.tau * i / 12 + math.pi / 12
        x, y = cx + math.cos(a) * 104, cy + math.sin(a) * 104
        body.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="2.2" fill="#ffe9b0"/>')
    # 별자리 선
    cons = [(70, 70), (100, 52), (128, 76), (160, 60), (196, 84), (232, 62)]
    body.append('<path d="M' + ' L'.join(f'{x} {y}' for x, y in cons) + '" stroke="#cfe0ff" stroke-width=".9" fill="none" opacity=".7"/>')
    body += [f'<circle cx="{x}" cy="{y}" r="2.4" fill="#fff"/>' for x, y in cons]
    # 가운데 고리 행성
    body += [f'<circle cx="{cx}" cy="{cy}" r="30" fill="url(#pl)"/>',
             f'<ellipse cx="{cx}" cy="{cy}" rx="52" ry="12" fill="none" stroke="#ffe0a8" stroke-width="2.4" opacity=".85" transform="rotate(-18 {cx} {cy})"/>',
             f'<path d="M{cx - 30} {cy} a30 30 0 0 0 60 0" fill="url(#pl)" transform="rotate(-18 {cx} {cy})" opacity=".0"/>',
             '<circle cx="246" cy="300" r="10" fill="#9fc0ff" opacity=".9"/>',
             '<circle cx="62" cy="310" r="6" fill="#ffb3a0" opacity=".9"/>', vr]
    return svg(''.join(body), defs)


def manse():
    """만세력 — 윤도(전통 나침반)의 동심원과 바늘."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#140d05'), (.55, '#3d2a10'), (1, '#8f6324')]) +
            rad('disc', [(0, '#5a3f18'), (.8, '#2f200b'), (1, '#1a1206')]) +
            lin('needle', [(0, '#ff6a4a'), (.5, '#ff6a4a'), (.5, '#f3e3b8'), (1, '#f3e3b8')]) + vd)
    cx, cy = 150, 185
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(71, 50, 0, 400, '#ffe8bf', 4),
            f'<circle cx="{cx}" cy="{cy}" r="128" fill="#e8b45a" opacity=".22" filter="url(#blur20)"/>',
            f'<circle cx="{cx}" cy="{cy}" r="118" fill="url(#disc)"/>']
    for r, sw, op in [(116, 2, .9), (100, 1, .6), (84, 1, .6), (66, 1, .55), (44, 1.2, .7)]:
        body.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#e8c46a" stroke-width="{sw}" opacity="{op}"/>')
    body += [ring_ticks(cx, cy, 116, 120, 5, '#e8c46a', .7, .55),
             ring_ticks(cx, cy, 100, 24, 16, '#e8c46a', .9, .6),
             ring_ticks(cx, cy, 84, 60, 6, '#f3dfa8', .6, .45),
             ring_ticks(cx, cy, 66, 8, 22, '#f3dfa8', 1.1, .6)]
    # 팔괘 막대
    rnd = random.Random(3)
    for i in range(8):
        a = math.tau * i / 8
        g = []
        for k in range(3):
            r = 57 - k * 4.5
            broken = rnd.random() < .5
            for sgn in ([-1, 1] if broken else [0]):
                da = .13 if not broken else .055
                off = sgn * .085
                x1, y1 = cx + math.cos(a + off - da) * r, cy + math.sin(a + off - da) * r
                x2, y2 = cx + math.cos(a + off + da) * r, cy + math.sin(a + off + da) * r
                g.append(f'M{f(x1)} {f(y1)}L{f(x2)} {f(y2)}')
        body.append(f'<path d="{"".join(g)}" stroke="#ffe0a0" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>')
    body += [f'<g transform="rotate(28 {cx} {cy})"><path d="M{cx} {cy - 40} L{cx + 7} {cy} L{cx} {cy + 40} L{cx - 7} {cy}Z" fill="url(#needle)"/></g>',
             f'<circle cx="{cx}" cy="{cy}" r="5" fill="#e8c46a"/>',
             f'<path d="{ridge(12, 360, 40, 3)}" fill="#1a1206" opacity=".85"/>', vr]
    return svg(''.join(body), defs)


def daily():
    """오늘의 운세 — 바다 위로 떠오르는 해."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#1b0f33'), (.45, '#7a2f5a'), (.75, '#ff7a59'), (1, '#ffc27a')]) +
            rad('sun', [(0, '#fff6d6'), (.6, '#ffd27a'), (1, '#ff9a4a')]) +
            lin('sea', [(0, '#3a1f4f'), (1, '#120a24')]) + vd)
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(81, 40, 0, 140, '#fff', 3),
            '<circle cx="150" cy="268" r="110" fill="#ffb26b" opacity=".45" filter="url(#blur20)"/>']
    rays = ''.join(
        f'M150 268 L{f(150 + math.cos(a) * 190)} {f(268 + math.sin(a) * 190)} '
        f'L{f(150 + math.cos(a + .06) * 190)} {f(268 + math.sin(a + .06) * 190)}Z'
        for a in [math.pi + i * math.pi / 12 for i in range(1, 12)])
    body += [f'<path d="{rays}" fill="#fff1c8" opacity=".12"/>',
             '<circle cx="150" cy="268" r="58" fill="url(#sun)"/>',
             '<rect y="268" width="300" height="132" fill="url(#sea)"/>']
    for i, (y, w, op) in enumerate([(280, 120, .8), (294, 90, .6), (308, 140, .45), (324, 70, .35), (342, 110, .25)]):
        body.append(f'<rect x="{150 - w / 2}" y="{y}" width="{w}" height="2.4" rx="1.2" fill="#ffd9a0" opacity="{op}"/>')
    body += [waves(360, '#c9a2ff', .35, 6, 5, 1.1),
             cloud(70, 160, 1.4, '#ffe2cf', .5), cloud(236, 120, 1.2, '#ffe2cf', .45),
             # 새 세 마리
             '<path d="M200 190 q6 -6 12 0 q6 -6 12 0 M222 172 q4 -4 8 0 q4 -4 8 0 M180 176 q5 -5 10 0 q5 -5 10 0" '
             'stroke="#2a1530" stroke-width="1.6" fill="none" stroke-linecap="round"/>', vr]
    return svg(''.join(body), defs)


def natal():
    """나의 출생차트 — 행성이 놓인 하우스 원판."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#03141c'), (.55, '#0a3a4a'), (1, '#16708a')]) + vd)
    cx, cy = 150, 195
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(91, 90, 0, 400, '#d9fbff', 6),
            f'<circle cx="{cx}" cy="{cy}" r="118" fill="#5fd8f0" opacity=".14" filter="url(#blur20)"/>']
    for r, op in [(112, .8), (90, .55), (40, .5)]:
        body.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#bff3ff" stroke-width="1" opacity="{op}"/>')
    spokes = ''.join(f'M{f(cx + math.cos(math.tau * i / 12) * 40)} {f(cy + math.sin(math.tau * i / 12) * 40)}'
                     f'L{f(cx + math.cos(math.tau * i / 12) * 112)} {f(cy + math.sin(math.tau * i / 12) * 112)}' for i in range(12))
    body.append(f'<path d="{spokes}" stroke="#bff3ff" stroke-width=".8" opacity=".45"/>')
    body.append(ring_ticks(cx, cy, 112, 72, 5, '#bff3ff', .6, .5))
    rnd = random.Random(5)
    planets = []
    for i, col in enumerate(['#ffd27a', '#e6e6ff', '#ff8a7a', '#9fe6b0', '#ffb3e0', '#8ab4ff', '#ffe9b0']):
        a = rnd.uniform(0, math.tau)
        r = rnd.uniform(56, 82)
        planets.append((cx + math.cos(a) * r, cy + math.sin(a) * r, col))
    # 행성끼리 각(aspect) 선
    for (x1, y1, _), (x2, y2, _) in [(planets[0], planets[3]), (planets[1], planets[4]), (planets[2], planets[5]), (planets[0], planets[6])]:
        body.append(f'<path d="M{f(x1)} {f(y1)}L{f(x2)} {f(y2)}" stroke="#ffe9b0" stroke-width=".9" opacity=".55"/>')
    for x, y, col in planets:
        body += [f'<circle cx="{f(x)}" cy="{f(y)}" r="8" fill="{col}" opacity=".35" filter="url(#blur3)"/>',
                 f'<circle cx="{f(x)}" cy="{f(y)}" r="4.2" fill="{col}"/>']
    body += [sparkle(cx, cy, 12, '#fff', .95), vr]
    return svg(''.join(body), defs)


def astro_today():
    """오늘의 점성술 — 달의 위상이 이어진 밤."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#05061a'), (.6, '#1b1b52'), (1, '#3b3a8f')]) +
            rad('moon', [(0, '#ffffff'), (.75, '#e8e6ff'), (1, '#a9a6e0')]) + vd)
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(101, 110, 0, 400, '#eceaff', 7),
            '<circle cx="150" cy="170" r="80" fill="#b9b6ff" opacity=".3" filter="url(#blur20)"/>',
            '<circle cx="150" cy="170" r="56" fill="url(#moon)"/>',
            '<circle cx="132" cy="156" r="9" fill="#c9c6f0" opacity=".6"/><circle cx="166" cy="186" r="12" fill="#c9c6f0" opacity=".5"/>'
            '<circle cx="160" cy="146" r="5" fill="#c9c6f0" opacity=".6"/>']
    # 위상 7개 — 호를 따라
    for i in range(7):
        t = i / 6
        x = 30 + t * 240
        y = 300 - math.sin(t * math.pi) * 40
        k = (i - 3) / 3  # -1..1
        r = 11
        body.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{r}" fill="#2a2a66" stroke="#d9d7ff" stroke-width=".8" opacity=".9"/>')
        if i == 3:
            body.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{r}" fill="#f2f0ff"/>')
        elif i in (0, 6):
            pass
        else:
            sweep = 1 if k < 0 else 0
            rx = abs(k) * r
            side = 1 if k < 0 else 0
            d = (f'M{f(x)} {f(y - r)} A{r} {r} 0 0 {side} {f(x)} {f(y + r)} '
                 f'A{f(rx)} {r} 0 0 {sweep} {f(x)} {f(y - r)}Z')
            body.append(f'<path d="{d}" fill="#f2f0ff"/>')
    body += [cloud(60, 380, 1.6, '#cfcaff', .35), cloud(240, 372, 1.4, '#cfcaff', .3), vr]
    return svg(''.join(body), defs)


def tarot_bg():
    """타로 — 카드 사진 뒤에 까는 아치 창과 별."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#0a0620'), (.6, '#24124f'), (1, '#4a2a8a')]) + vd)
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(111, 120, 0, 400, '#f3e6ff', 8),
            '<path d="M40 400 V150 a110 110 0 0 1 220 0 V400" fill="none" stroke="#e8c46a" stroke-width="1.2" opacity=".55"/>',
            '<path d="M54 400 V154 a96 96 0 0 1 192 0 V400" fill="none" stroke="#e8c46a" stroke-width=".7" opacity=".35"/>',
            '<circle cx="150" cy="210" r="100" fill="#b07bff" opacity=".28" filter="url(#blur20)"/>',
            '<path d="M150 40 a26 26 0 1 0 18 44 a20 20 0 1 1 -18 -44z" fill="#ffe9b0" opacity=".9"/>', vr]
    return svg(''.join(body), defs)


POSTERS = {
    'life': life, 'newyear': newyear, 'gunghap': gunghap, 'name': name, 'qna': qna,
    'astro': astro, 'manse': manse, 'daily': daily, 'natal': natal,
    'astro-today': astro_today, 'tarot-bg': tarot_bg,
}

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for key, fn in POSTERS.items():
        (OUT / f'{key}.svg').write_text(fn(), encoding='utf-8')
        print(f'{key}.svg', (OUT / f'{key}.svg').stat().st_size, 'bytes')
