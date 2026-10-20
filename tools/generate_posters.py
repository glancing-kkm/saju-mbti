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


def heart_path(cx, cy, s):
    return (f'M{f(cx)} {f(cy + 22 * s)} C{f(cx - 40 * s)} {f(cy - 4 * s)} {f(cx - 26 * s)} {f(cy - 34 * s)} '
            f'{f(cx)} {f(cy - 16 * s)} C{f(cx + 26 * s)} {f(cy - 34 * s)} {f(cx + 40 * s)} {f(cy - 4 * s)} {f(cx)} {f(cy + 22 * s)}Z')


def petals(seed, n, y0, y1, color, smin=4, smax=8):
    rnd = random.Random(seed)
    out = []
    for _ in range(n):
        x, y, s, rot = rnd.uniform(0, W), rnd.uniform(y0, y1), rnd.uniform(smin, smax), rnd.uniform(0, 360)
        out.append(f'<path transform="translate({f(x)} {f(y)}) rotate({f(rot)})" '
                   f'd="M0 {-s} C{s} {-s * .4} {s * .6} {s} 0 {s} C{-s * .6} {s} {-s} {-s * .4} 0 {-s}z" '
                   f'fill="{color}" opacity="{f(rnd.uniform(.35, .85))}"/>')
    return ''.join(out)


def love():
    """연애운 — 하트 별자리와 벚꽃 가지."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#1a0618'), (.5, '#5a1840'), (1, '#e0607a')]) + vd)
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(121, 80, 0, 300, '#ffe3ec', 5),
            '<circle cx="150" cy="170" r="90" fill="#ff8fb0" opacity=".3" filter="url(#blur20)"/>']
    # 하트 모양으로 이은 별자리
    pts = []
    for i in range(14):
        t = math.tau * i / 14
        x = 16 * math.sin(t) ** 3
        y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        pts.append((150 + x * 5.2, 170 + y * 5.2))
    body.append('<path d="M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in pts) + 'Z" fill="none" stroke="#ffd6e2" stroke-width="1" opacity=".75"/>')
    for i, (x, y) in enumerate(pts):
        body.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{2.8 if i % 3 == 0 else 1.8}" fill="#fff"/>')
    body.append(sparkle(150, 160, 14, '#fff', .95))
    # 벚꽃 가지
    body += ['<path d="M-10 70 C40 80 70 60 110 40 M40 74 C52 56 60 50 74 46 M-10 100 C30 96 50 110 80 96" '
             'stroke="#3a1426" stroke-width="4" fill="none" stroke-linecap="round"/>']
    rnd = random.Random(5)
    for x, y in [(20, 74), (52, 60), (74, 46), (100, 44), (36, 98), (66, 100), (88, 52)]:
        for k in range(5):
            a = math.tau * k / 5 + rnd.uniform(0, .4)
            body.append(f'<circle cx="{f(x + math.cos(a) * 4.5)}" cy="{f(y + math.sin(a) * 4.5)}" r="3.6" fill="#ffc7d6"/>')
        body.append(f'<circle cx="{x}" cy="{y}" r="2" fill="#ff6f91"/>')
    body += [petals(9, 22, 220, 400, '#ffc2d1'),
             f'<path d="{ridge(14, 370, 30, 3)}" fill="#2a0a1e" opacity=".85"/>', vr]
    return svg(''.join(body), defs)


def money():
    """재물운 — 복주머니와 떠오르는 엽전."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#06140c'), (.55, '#123a24'), (1, '#2f6b3c')]) +
            lin('pouch', [(0, '#ff6a4a'), (1, '#a8161e')]) +
            rad('coin', [(0, '#fff3c4'), (.6, '#f0c24a'), (1, '#a8761c')], .4, .35, .7) + vd)
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(131, 60, 0, 300, '#fff0c0', 5),
            '<circle cx="150" cy="250" r="110" fill="#f0c24a" opacity=".28" filter="url(#blur20)"/>']

    def coin(x, y, r, rot=0, op=1):
        return (f'<g transform="rotate({rot} {x} {y})" opacity="{op}">'
                f'<circle cx="{x}" cy="{y}" r="{r}" fill="url(#coin)"/>'
                f'<circle cx="{x}" cy="{y}" r="{f(r * .82)}" fill="none" stroke="#a8761c" stroke-width="1" opacity=".7"/>'
                f'<rect x="{f(x - r * .26)}" y="{f(y - r * .26)}" width="{f(r * .52)}" height="{f(r * .52)}" fill="#3a2a0a" opacity=".85"/></g>')

    body += [coin(64, 96, 18, 12), coin(236, 74, 22, -8), coin(110, 150, 13, 20, .9), coin(206, 150, 15, -15, .9),
             coin(150, 60, 11, 0, .8), coin(36, 200, 10, 0, .7), coin(268, 196, 12, 0, .7)]
    # 복주머니
    body += ['<path d="M112 222 C96 250 88 300 104 330 C120 356 180 356 196 330 C212 300 204 250 188 222 Z" fill="url(#pouch)"/>',
             '<path d="M112 222 C126 212 174 212 188 222 C178 230 122 230 112 222Z" fill="#7a0f16"/>',
             '<path d="M108 216 C120 196 132 204 150 200 C168 204 180 196 192 216" fill="#c21f2a"/>',
             '<path d="M118 226 C134 236 166 236 182 226" stroke="#e8c46a" stroke-width="3" fill="none"/>',
             '<path d="M150 230 l-10 26 M150 230 l10 26" stroke="#e8c46a" stroke-width="2.4" stroke-linecap="round"/>',
             '<circle cx="150" cy="232" r="5" fill="#e8c46a"/>',
             '<circle cx="150" cy="292" r="22" fill="none" stroke="#e8c46a" stroke-width="2" opacity=".85"/>',
             '<path d="M138 292 h24 M150 280 v24 M142 284 l16 16 M158 284 l-16 16" stroke="#e8c46a" stroke-width="1.6" opacity=".8"/>',
             sparkle(206, 248, 8, '#fff6d0', .9), sparkle(96, 270, 6, '#fff6d0', .8),
             cloud(60, 380, 1.5, '#d8f0c0', .4), cloud(240, 372, 1.6, '#d8f0c0', .35), vr]
    return svg(''.join(body), defs)


def career():
    """직업운 — 봉우리로 이어지는 계단과 깃발, 떠오르는 해."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#06102a'), (.5, '#14386a'), (1, '#3f7fb0')]) +
            rad('sun', [(0, '#fff3d0'), (.6, '#ffc76a'), (1, '#ff8a3a')]) +
            lin('mt', [(0, '#24527e'), (1, '#0a1a33')]) + vd)
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(141, 70, 0, 220, '#e6f0ff', 5),
            '<circle cx="196" cy="110" r="70" fill="#ffb86b" opacity=".35" filter="url(#blur20)"/>',
            '<circle cx="196" cy="110" r="34" fill="url(#sun)"/>',
            '<path d="M-10 405 L120 150 L170 210 L210 170 L310 330 L310 405Z" fill="url(#mt)"/>',
            '<path d="M120 150 L170 210 L210 170 L310 330" fill="none" stroke="#e8c46a" stroke-width="1.2" opacity=".6"/>',
            f'<path d="{ridge(15, 360, 50, 3)}" fill="#08142a"/>']
    # 지그재그 계단 길
    steps = [(70, 380), (110, 340), (90, 300), (128, 262), (112, 222), (126, 186), (120, 156)]
    body.append('<path d="M' + ' L'.join(f'{x} {y}' for x, y in steps) + '" stroke="#ffe0a0" stroke-width="2.4" fill="none" stroke-dasharray="5 4" stroke-linecap="round" opacity=".9"/>')
    body += [f'<circle cx="{x}" cy="{y}" r="2.2" fill="#ffe9b0"/>' for x, y in steps]
    body += ['<path d="M120 150 V112" stroke="#f3e3b8" stroke-width="2"/>',
             '<path d="M120 112 L150 120 L120 130Z" fill="#ff5a3a"/>',
             sparkle(120, 104, 8, '#fff', .9), cloud(56, 120, 1.3, '#d6e6ff', .4), cloud(260, 200, 1.1, '#d6e6ff', .35), vr]
    return svg(''.join(body), defs)


def marriage():
    """결혼운 — 청실홍실 매듭과 화촉 두 자루."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#1a0608'), (.55, '#5a141c'), (1, '#a8362c')]) +
            lin('cand', [(0, '#ff5a4a'), (1, '#8a1018')]) +
            lin('candB', [(0, '#4f7bff'), (1, '#16267a')]) +
            rad('moon', [(0, '#fff8e0'), (.7, '#f6dc9a'), (1, '#d2a24a')]) + vd)
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(151, 60, 0, 260, '#ffe6c8', 4),
            '<circle cx="150" cy="90" r="50" fill="#ffd98a" opacity=".3" filter="url(#blur20)"/>',
            '<circle cx="150" cy="90" r="30" fill="url(#moon)"/>']
    # 청실·홍실이 꼬여 매듭을 짓는다
    red = 'M20 230 C70 190 110 280 150 230 C190 180 230 270 280 230'
    blue = 'M20 230 C70 270 110 180 150 230 C190 280 230 190 280 230'
    body += [f'<path d="{red}" fill="none" stroke="#ff4d5d" stroke-width="6" opacity=".35" filter="url(#blur3)"/>',
             f'<path d="{blue}" fill="none" stroke="#5b8cff" stroke-width="6" opacity=".35" filter="url(#blur3)"/>',
             f'<path d="{blue}" fill="none" stroke="#6d9bff" stroke-width="2.6" stroke-linecap="round"/>',
             f'<path d="{red}" fill="none" stroke="#ff5a6a" stroke-width="2.6" stroke-linecap="round"/>',
             '<circle cx="150" cy="230" r="9" fill="#e8c46a"/>',
             '<path d="M150 239 l-8 30 M150 239 l8 30 M150 239 v34" stroke="#e8c46a" stroke-width="1.6" stroke-linecap="round"/>']

    def candle(x, grad):
        return (f'<ellipse cx="{x}" cy="282" rx="22" ry="30" fill="#ffb86b" opacity=".35" filter="url(#blur8)"/>'
                f'<path d="M{x} 270 c-7 10 -7 18 0 22 c7 -4 7 -12 0 -22z" fill="#ffd27a"/>'
                f'<path d="M{x} 278 c-3 5 -3 9 0 11 c3 -2 3 -6 0 -11z" fill="#fff6d6"/>'
                f'<rect x="{x - 11}" y="294" width="22" height="70" rx="3" fill="url(#{grad})"/>'
                f'<path d="M{x - 11} 312 h22 M{x - 11} 340 h22" stroke="#e8c46a" stroke-width="1.6" opacity=".8"/>'
                f'<rect x="{x - 18}" y="362" width="36" height="8" rx="3" fill="#b8893a"/>')

    body += [candle(70, 'cand'), candle(230, 'candB'), petals(15, 14, 150, 400, '#ffc2b0', 3, 6), vr]
    return svg(''.join(body), defs)


def reunion():
    """재회운 — 멀어졌던 두 초승달이 붉은 실로 다시 이어진다."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#060a24'), (.55, '#1f2464'), (1, '#5a3a9a')]) +
            rad('mA', [(0, '#ffffff'), (.7, '#e6e2ff'), (1, '#a9a2e6')]) + vd)
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(161, 110, 0, 400, '#ece8ff', 7),
            '<circle cx="80" cy="170" r="60" fill="#a99cff" opacity=".28" filter="url(#blur20)"/>',
            '<circle cx="220" cy="170" r="60" fill="#ffb3c6" opacity=".24" filter="url(#blur20)"/>',
            # 초승달 두 개가 서로를 향한다
            '<path d="M96 122 A48 48 0 1 0 96 218 A64 64 0 0 1 96 122Z" fill="url(#mA)"/>',
            '<path d="M204 122 A48 48 0 1 1 204 218 A64 64 0 0 0 204 122Z" fill="#ffe0e8"/>']
    thread = 'M96 214 C120 270 140 250 150 240 C160 250 180 270 204 214'
    body += [f'<path d="{thread}" fill="none" stroke="#ff4d6d" stroke-width="5" opacity=".35" filter="url(#blur3)"/>',
             f'<path d="{thread}" fill="none" stroke="#ff5a7a" stroke-width="2" stroke-linecap="round"/>',
             '<path d="M150 236 c-8 -8 -18 -1 -10 7 l10 10 l10 -10 c8 -8 -2 -15 -10 -7z" fill="#ff5a7a"/>',
             # 떨어지는 별
             '<path d="M246 60 L196 96" stroke="#fff" stroke-width="1.4" opacity=".6" stroke-linecap="round"/>',
             sparkle(196, 96, 6, '#fff', .95),
             waves(330, '#b9b2ff', .45, 6, 6, 1.2), vr]
    return svg(''.join(body), defs)


def study():
    """학업운 — 빛나는 책과 그 위의 문창성."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#060824'), (.55, '#1a2468'), (1, '#3f56b8')]) +
            lin('page', [(0, '#fffaf0'), (1, '#e6dcc4')]) + vd)
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(171, 90, 0, 400, '#e6ecff', 6),
            '<circle cx="150" cy="96" r="50" fill="#ffe9a0" opacity=".35" filter="url(#blur20)"/>',
            sparkle(150, 96, 26, '#fff4c8', 1), sparkle(150, 96, 12, '#fff', 1),
            '<path d="M150 122 L150 230" stroke="#fff4c8" stroke-width="1" opacity=".35"/>',
            '<ellipse cx="150" cy="268" rx="120" ry="40" fill="#ffe9a0" opacity=".25" filter="url(#blur20)"/>',
            # 펼친 책
            '<path d="M150 250 C120 236 80 236 44 246 L44 318 C80 308 120 308 150 322Z" fill="url(#page)"/>',
            '<path d="M150 250 C180 236 220 236 256 246 L256 318 C220 308 180 308 150 322Z" fill="url(#page)"/>',
            '<path d="M150 250 V322" stroke="#c9b48a" stroke-width="1.4"/>',
            '<path d="M44 318 C80 308 120 308 150 322 C180 308 220 308 256 318 L256 326 C220 316 180 316 150 330 C120 316 80 316 44 326Z" fill="#8a6a3a"/>']
    for k in range(5):
        y = 258 + k * 11
        body.append(f'<path d="M62 {y + 2} C90 {y - 4} 120 {y - 4} 138 {y + 4}" stroke="#b8a888" stroke-width="1.2" fill="none" opacity=".7"/>')
        body.append(f'<path d="M162 {y + 4} C180 {y - 4} 210 {y - 4} 238 {y + 2}" stroke="#b8a888" stroke-width="1.2" fill="none" opacity=".7"/>')
    rnd = random.Random(4)
    for _ in range(12):
        x, y = rnd.uniform(70, 230), rnd.uniform(150, 240)
        body.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(rnd.uniform(.8, 2))}" fill="#fff4c8" opacity="{f(rnd.uniform(.4, .9))}"/>')
    body += [cloud(56, 380, 1.4, '#cfd8ff', .35), cloud(246, 384, 1.5, '#cfd8ff', .3), vr]
    return svg(''.join(body), defs)


def child():
    """우리 아이 사주 — 초승달 요람에 잠든 작은 별."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#140c30'), (.55, '#4a3a8a'), (1, '#f0a0a8')]) +
            rad('moon', [(0, '#fffbe8'), (.7, '#ffe6a8'), (1, '#e0b060')]) + vd)
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(181, 90, 0, 320, '#fff4f8', 7),
            '<circle cx="150" cy="190" r="100" fill="#ffd9a8" opacity=".3" filter="url(#blur20)"/>',
            # 요람 모양 초승달 (아래로 오목)
            '<path d="M70 170 A80 80 0 0 0 230 170 A70 64 0 0 1 70 170Z" fill="url(#moon)"/>',
            '<path d="M150 70 V132" stroke="#ffe6b8" stroke-width="1" opacity=".6"/>',
            sparkle(150, 66, 7, '#fff', .9),
            # 잠든 별
            '<g transform="translate(150 196)">'
            '<path d="M0 -24 L7 -8 L24 -7 L11 4 L15 21 L0 12 L-15 21 L-11 4 L-24 -7 L-7 -8Z" fill="#fff3c0"/>'
            '<path d="M-8 -2 q3 3 6 0 M3 -2 q3 3 6 0" stroke="#a8761c" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
            '<circle cx="-11" cy="5" r="2.4" fill="#ff9fb0" opacity=".7"/><circle cx="12" cy="5" r="2.4" fill="#ff9fb0" opacity=".7"/>'
            '</g>',
            '<text x="0" y="0" font-size="0">.</text>',
            '<path d="M196 120 q6 -10 14 -4 M206 104 q5 -8 11 -3" stroke="#fff" stroke-width="1.4" fill="none" opacity=".55" stroke-linecap="round"/>',
            cloud(70, 300, 1.8, '#fff0f4', .55), cloud(232, 318, 2.1, '#fff0f4', .5), cloud(150, 360, 2.4, '#fff4f8', .45), vr]
    return svg(''.join(body).replace('<text x="0" y="0" font-size="0">.</text>', ''), defs)


def children():
    """자녀운 — 큰 별이 작은 별을 감싸 안은 새벽 언덕."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#1a0f08'), (.55, '#6a4024'), (1, '#ffc890')]) +
            rad('big', [(0, '#fffbe8'), (.6, '#ffe2a0'), (1, '#e8a850')]) +
            rad('small', [(0, '#ffffff'), (1, '#ffd6e0')]) + vd)
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(203, 70, 0, 240, '#fff4e0', 6),
            '<circle cx="138" cy="176" r="110" fill="#ffd9a0" opacity=".28" filter="url(#blur20)"/>',
            # 큰 별(부모)
            '<g transform="translate(132 178)"><path d="M0 -52 L14 -16 L52 -15 L22 8 L32 46 L0 25 L-32 46 L-22 8 L-52 -15 L-14 -16Z" fill="url(#big)"/></g>',
            # 작은 별(자녀) — 큰 별 곁에 기대어
            '<g transform="translate(198 214) rotate(14)"><path d="M0 -24 L6 -7 L24 -7 L10 4 L15 21 L0 11 L-15 21 L-10 4 L-24 -7 L-6 -7Z" fill="url(#small)"/></g>',
            '<circle cx="198" cy="214" r="30" fill="#ffd6e0" opacity=".25" filter="url(#blur8)"/>',
            # 두 별을 잇는 빛의 띠
            '<path d="M150 196 C168 214 178 220 190 216" stroke="#fff1c8" stroke-width="2" fill="none" opacity=".7" stroke-linecap="round"/>',
            sparkle(232, 150, 6, '#fff', .8), sparkle(80, 120, 5, '#fff', .7),
            f'<path d="{ridge(17, 330, 26, 5)}" fill="#3a2414" opacity=".9"/>',
            '<rect y="352" width="300" height="48" fill="#24160c"/>',
            cloud(64, 300, 1.6, '#ffe8d0', .4), cloud(244, 312, 1.9, '#ffe8d0', .35), vr]
    return svg(''.join(body), defs)


def health():
    """건강운 — 물 위의 연꽃과 그 둘레를 도는 다섯 기운."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#04161a'), (.55, '#0c4048'), (1, '#2a8a80')]) +
            lin('petal', [(0, '#ffe6ee'), (1, '#ff9ab8')]) + vd)
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(191, 70, 0, 260, '#e0fff8', 5),
            '<circle cx="150" cy="210" r="96" fill="#9ff0d8" opacity=".22" filter="url(#blur20)"/>',
            '<circle cx="150" cy="200" r="92" fill="none" stroke="#c8fff0" stroke-width=".8" opacity=".4" stroke-dasharray="2 5"/>']
    cols = ['#6fd39a', '#ff8a7a', '#e9bf68', '#d6deef', '#86b4ff']
    for i, c in enumerate(cols):
        a = -math.pi / 2 + math.tau * i / 5
        x, y = 150 + math.cos(a) * 92, 200 + math.sin(a) * 92
        body += [f'<circle cx="{f(x)}" cy="{f(y)}" r="14" fill="{c}" opacity=".35" filter="url(#blur8)"/>',
                 f'<circle cx="{f(x)}" cy="{f(y)}" r="7" fill="{c}"/>']
    # 연꽃
    lotus = []
    for ang, sc in [(-60, .8), (60, .8), (-32, .95), (32, .95), (0, 1.05)]:
        lotus.append(f'<path transform="translate(150 236) rotate({ang}) scale({sc})" d="M0 0 C-16 -18 -12 -46 0 -60 C12 -46 16 -18 0 0Z" fill="url(#petal)" stroke="#ff7aa0" stroke-width=".8"/>')
    body += lotus + ['<ellipse cx="150" cy="240" rx="54" ry="9" fill="#0e5a52"/>',
                     '<ellipse cx="98" cy="252" rx="34" ry="7" fill="#147a5e"/><ellipse cx="206" cy="254" rx="30" ry="6" fill="#147a5e"/>',
                     '<rect y="250" width="300" height="150" fill="#06262a" opacity=".85"/>',
                     waves(276, '#9ff0d8', .5, 6, 5, 1.2), waves(320, '#9ff0d8', .3, 5, 6, 1.1), vr]
    return svg(''.join(body), defs)


def daypick():
    """지정일 운세 — 달력 한 칸에 찍힌 붉은 낙관."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#1a0e04'), (.55, '#5a3410'), (1, '#c07a2a')]) +
            lin('paper', [(0, '#fff8e8'), (1, '#efdcb4')]) +
            rad('sun', [(0, '#fff3d0'), (.6, '#ffc76a'), (1, '#ff8a3a')]) + vd)
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(201, 40, 0, 200, '#fff0d0', 3),
            '<circle cx="230" cy="70" r="50" fill="#ffb86b" opacity=".35" filter="url(#blur20)"/>',
            '<circle cx="230" cy="70" r="24" fill="url(#sun)"/>',
            '<g transform="rotate(-4 150 230)">'
            '<rect x="56" y="134" width="188" height="206" rx="10" fill="#000" opacity=".3" filter="url(#blur8)"/>'
            '<rect x="50" y="126" width="188" height="206" rx="10" fill="url(#paper)"/>'
            '<rect x="50" y="126" width="188" height="36" rx="10" fill="#c21f2a"/><rect x="50" y="150" width="188" height="12" fill="#c21f2a"/>'
            '<circle cx="90" cy="126" r="5" fill="#3a2a10"/><circle cx="198" cy="126" r="5" fill="#3a2a10"/>']
    for r in range(5):
        for c in range(7):
            x, y = 62 + c * 24.5, 172 + r * 30
            body.append(f'<rect x="{f(x)}" y="{y}" width="18" height="20" rx="3" fill="#d8c49a" opacity=".45"/>')
    body += ['<circle cx="144" cy="242" r="17" fill="none" stroke="#e0302a" stroke-width="3"/>',
             '<circle cx="144" cy="242" r="22" fill="#ff4a3a" opacity=".22" filter="url(#blur3)"/>',
             '</g>', sparkle(176, 214, 7, '#fff6d0', .9), cloud(60, 380, 1.5, '#ffe6c0', .4), vr]
    return svg(''.join(body), defs)


def monthly():
    """월별 운세 — 열두 달의 달이 둥글게 돈다."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#040a1e'), (.55, '#122a5a'), (1, '#2a5a9a')]) +
            rad('core', [(0, '#fff6d6'), (.6, '#ffd98a'), (1, '#e0a040')]) + vd)
    cx, cy = 150, 196
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(211, 100, 0, 400, '#e6eeff', 6),
            f'<circle cx="{cx}" cy="{cy}" r="60" fill="#ffd98a" opacity=".3" filter="url(#blur20)"/>',
            f'<circle cx="{cx}" cy="{cy}" r="24" fill="url(#core)"/>',
            f'<circle cx="{cx}" cy="{cy}" r="96" fill="none" stroke="#cfe0ff" stroke-width=".8" opacity=".45"/>',
            ring_ticks(cx, cy, 120, 60, 4, '#e8c46a', .7, .5, 5, 10)]
    for i in range(12):
        a = -math.pi / 2 + math.tau * i / 12
        x, y, r = cx + math.cos(a) * 96, cy + math.sin(a) * 96, 10
        k = math.cos(math.tau * i / 12)  # 1=new, -1=full
        body.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{r}" fill="#1a2a5a" stroke="#d9e4ff" stroke-width=".8"/>')
        if i == 6:
            body.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{r}" fill="#f4f6ff"/>')
        elif i != 0:
            rx = abs(k) * r
            waxing = i < 6
            side = 1 if waxing else 0
            sweep = (1 if k > 0 else 0) if waxing else (0 if k > 0 else 1)
            d = (f'M{f(x)} {f(y - r)} A{r} {r} 0 0 {side} {f(x)} {f(y + r)} '
                 f'A{f(max(rx, .1))} {r} 0 0 {sweep} {f(x)} {f(y - r)}Z')
            body.append(f'<path d="{d}" fill="#f4f6ff"/>')
    body += [cloud(60, 380, 1.5, '#cfdcff', .35), cloud(244, 372, 1.3, '#cfdcff', .3), vr]
    return svg(''.join(body), defs)


def astro_love():
    """점성술 연애·결혼 — 금성 기호와 하트 궤도."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#12041e'), (.55, '#3e1460'), (1, '#b04a9a')]) +
            rad('ven', [(0, '#fff2f8'), (.6, '#ffb8d8'), (1, '#d0609a')], .4, .35, .7) + vd)
    cx, cy = 150, 186
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(221, 110, 0, 400, '#ffe8f6', 7),
            f'<circle cx="{cx}" cy="{cy}" r="100" fill="#ff9ad0" opacity=".22" filter="url(#blur20)"/>',
            f'<path d="{heart_path(cx, cy + 6, 3.4)}" fill="none" stroke="#ffd0e6" stroke-width="1" opacity=".55" stroke-dasharray="3 5"/>',
            f'<circle cx="{cx}" cy="{cy - 14}" r="34" fill="url(#ven)"/>',
            f'<circle cx="{cx}" cy="{cy - 14}" r="22" fill="none" stroke="#fff" stroke-width="3" opacity=".9"/>',
            f'<path d="M{cx} {cy + 8} V{cy + 52} M{cx - 16} {cy + 32} H{cx + 16}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".9"/>',
            '<circle cx="62" cy="214" r="9" fill="#ff8a7a"/><circle cx="62" cy="214" r="16" fill="#ff8a7a" opacity=".3" filter="url(#blur3)"/>',
            '<circle cx="238" cy="214" r="7" fill="#ffe0a0"/><circle cx="238" cy="214" r="14" fill="#ffe0a0" opacity=".3" filter="url(#blur3)"/>',
            petals(23, 10, 280, 400, '#ffc2e0', 3, 6), vr]
    return svg(''.join(body), defs)


def astro_career():
    """점성술 직업·재물 — 토성 고리와 위로 오르는 별자리."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#040814'), (.55, '#14243f'), (1, '#4a5a3a')]) +
            rad('sat', [(0, '#fff4d0'), (.6, '#e8c46a'), (1, '#8a6224')], .38, .35, .7) + vd)
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(231, 110, 0, 400, '#f0f0e0', 7),
            '<circle cx="190" cy="140" r="80" fill="#e8c46a" opacity=".22" filter="url(#blur20)"/>',
            '<circle cx="190" cy="140" r="38" fill="url(#sat)"/>',
            '<ellipse cx="190" cy="140" rx="66" ry="14" fill="none" stroke="#ffe7b0" stroke-width="3" opacity=".8" transform="rotate(-20 190 140)"/>',
            '<ellipse cx="190" cy="140" rx="56" ry="10" fill="none" stroke="#c9a65a" stroke-width="1.4" opacity=".7" transform="rotate(-20 190 140)"/>']
    cons = [(40, 350), (70, 320), (92, 330), (116, 290), (140, 300), (160, 256), (190, 236)]
    body.append('<path d="M' + ' L'.join(f'{x} {y}' for x, y in cons) + '" stroke="#e8f0ff" stroke-width="1" fill="none" opacity=".75"/>')
    body += [f'<circle cx="{x}" cy="{y}" r="{3 if i == len(cons) - 1 else 2.2}" fill="#fff"/>' for i, (x, y) in enumerate(cons)]
    body += ['<path d="M190 236 l-10 4 M190 236 l-3 10" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>',
             '<circle cx="64" cy="96" r="12" fill="#9fc0ff" opacity=".9"/>',
             f'<path d="{ridge(23, 380, 30, 3)}" fill="#05080f" opacity=".85"/>', vr]
    return svg(''.join(body), defs)


def astro_yearly():
    """점성술 올해 운세 — 태양 둘레를 한 바퀴 도는 궤도."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#021418'), (.55, '#0a3a48'), (1, '#1a7a7a')]) +
            rad('sun', [(0, '#fff6d6'), (.6, '#ffd27a'), (1, '#ff9a4a')]) + vd)
    cx, cy = 150, 194
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(241, 110, 0, 400, '#e0fffa', 7),
            f'<circle cx="{cx}" cy="{cy}" r="56" fill="#ffc76a" opacity=".35" filter="url(#blur20)"/>',
            f'<circle cx="{cx}" cy="{cy}" r="26" fill="url(#sun)"/>',
            f'<ellipse cx="{cx}" cy="{cy}" rx="112" ry="70" fill="none" stroke="#bff3ff" stroke-width="1" opacity=".55"/>',
            f'<ellipse cx="{cx}" cy="{cy}" rx="72" ry="44" fill="none" stroke="#bff3ff" stroke-width=".8" opacity=".4"/>']
    for i in range(12):
        a = math.tau * i / 12
        x, y = cx + math.cos(a) * 112, cy + math.sin(a) * 70
        body.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="1.8" fill="#e8c46a"/>')
    # 궤도를 따라 움직이는 행성과 꼬리
    trail = ' '.join(f'{f(cx + math.cos(a) * 112)} {f(cy + math.sin(a) * 70)}' for a in [math.pi * (1.05 + k * .03) for k in range(12)])
    body += [f'<polyline points="{trail}" fill="none" stroke="#9ff0ff" stroke-width="3" opacity=".45" stroke-linecap="round"/>',
             f'<circle cx="{f(cx + math.cos(math.pi * 1.38) * 112)}" cy="{f(cy + math.sin(math.pi * 1.38) * 70)}" r="9" fill="#8ab4ff"/>',
             f'<circle cx="{f(cx + math.cos(math.pi * .3) * 72)}" cy="{f(cy + math.sin(math.pi * .3) * 44)}" r="6" fill="#ff9a8a"/>',
             waves(350, '#9ff0ff', .35, 6, 5, 1.1), vr]
    return svg(''.join(body), defs)


def counsel_unni():
    """달님 언니 — 초승달에 기대앉은 토끼."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#0e0a2a'), (.55, '#3a2470'), (1, '#c46aa8')]) +
            rad('moon', [(0, '#fffbe8'), (.7, '#ffe8b0'), (1, '#e6b860')]) + vd)
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(251, 100, 0, 320, '#fff0fa', 7),
            '<circle cx="160" cy="170" r="104" fill="#ffd6e8" opacity=".28" filter="url(#blur20)"/>',
            '<path d="M196 70 A100 100 0 1 0 196 270 A124 124 0 0 1 196 70Z" fill="url(#moon)"/>',
            # 토끼 — 몸·머리·귀·꼬리
            '<g fill="#fff6fb">'
            '<ellipse cx="150" cy="232" rx="30" ry="24"/>'
            '<circle cx="172" cy="204" r="17"/>'
            '<ellipse cx="166" cy="172" rx="5.5" ry="20" transform="rotate(-12 166 172)"/>'
            '<ellipse cx="180" cy="174" rx="5.5" ry="19" transform="rotate(14 180 174)"/>'
            '<circle cx="122" cy="238" r="8"/>'
            '</g>',
            '<ellipse cx="166" cy="174" rx="2.4" ry="13" fill="#ffb3cc" transform="rotate(-12 166 174)"/>',
            '<ellipse cx="180" cy="176" rx="2.4" ry="12" fill="#ffb3cc" transform="rotate(14 180 176)"/>',
            '<circle cx="178" cy="203" r="2" fill="#5a3a6a"/><circle cx="183" cy="210" r="2.4" fill="#ff9ab8" opacity=".7"/>',
            sparkle(98, 120, 8, '#fff', .9), sparkle(240, 300, 6, '#fff', .8),
            cloud(70, 330, 1.8, '#ffe6f2', .5), cloud(236, 350, 2, '#ffe6f2', .45), petals(31, 10, 260, 400, '#ffc2dc', 3, 6), vr]
    return svg(''.join(body), defs)


def counsel_senior():
    """직설 선배 — 과녁 한가운데 꽂힌 화살."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#06121c'), (.55, '#0f3a4a'), (1, '#1f7a7a')]) + vd)
    cx, cy = 150, 200
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(261, 70, 0, 400, '#e0fff8', 5),
            f'<circle cx="{cx}" cy="{cy}" r="110" fill="#5fe0d0" opacity=".18" filter="url(#blur20)"/>']
    for r, c in [(92, '#f3efe4'), (74, '#ff5a3a'), (56, '#f3efe4'), (38, '#ff5a3a'), (20, '#ffd24a')]:
        body.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{c}"/>')
    body += [f'<circle cx="{cx}" cy="{cy}" r="92" fill="none" stroke="#0a2a33" stroke-width="2" opacity=".5"/>',
             # 화살 — 오른쪽 위에서 날아와 중앙에 꽂힘
             f'<path d="M{cx} {cy} L{cx + 118} {cy - 118}" stroke="#2a1a10" stroke-width="5" stroke-linecap="round"/>',
             f'<path d="M{cx + 104} {cy - 104} l22 -6 l-8 14z M{cx + 104} {cy - 104} l6 -22 l-14 8z" fill="#e8c46a"/>',
             f'<path d="M{cx + 116} {cy - 116} l14 -4 l-6 10z M{cx + 116} {cy - 116} l4 -14 l-10 6z" fill="#e8c46a"/>',
             f'<circle cx="{cx}" cy="{cy}" r="5" fill="#2a1a10"/>',
             f'<path d="M{cx - 24} {cy - 30} l-14 -14 M{cx + 26} {cy + 28} l14 14 M{cx - 30} {cy + 22} l-16 10" stroke="#fff6d0" stroke-width="2.4" stroke-linecap="round"/>',
             waves(352, '#9ff0e0', .35, 6, 5, 1.1), vr]
    return svg(''.join(body), defs)


def counsel_halmae():
    """복 할머니 — 한지 창 불빛 아래 김이 오르는 찻잔."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#1a0e06'), (.55, '#4a2a12'), (1, '#9a5a2a')]) +
            lin('win', [(0, '#ffe9b8'), (1, '#f0b860')]) +
            lin('cup', [(0, '#f6f0e4'), (1, '#cfc2a6')]) + vd)
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(271, 40, 0, 120, '#fff0d0', 3),
            '<rect x="60" y="40" width="180" height="170" rx="6" fill="#ffd27a" opacity=".3" filter="url(#blur20)"/>',
            '<rect x="70" y="50" width="160" height="150" rx="4" fill="url(#win)"/>']
    # 창살
    for x in (110, 150, 190):
        body.append(f'<path d="M{x} 50 V200" stroke="#7a4a1e" stroke-width="3"/>')
    for y in (88, 125, 162):
        body.append(f'<path d="M70 {y} H230" stroke="#7a4a1e" stroke-width="3"/>')
    body += ['<rect x="70" y="50" width="160" height="150" rx="4" fill="none" stroke="#5a3210" stroke-width="6"/>',
             '<rect y="268" width="300" height="132" fill="#2a160a"/>',
             '<rect y="262" width="300" height="10" fill="#6a3a18"/>',
             # 찻잔과 받침
             '<ellipse cx="150" cy="300" rx="62" ry="12" fill="#bfae8a"/>',
             '<path d="M104 250 h92 c0 34 -18 50 -46 50 c-28 0 -46 -16 -46 -50z" fill="url(#cup)"/>',
             '<ellipse cx="150" cy="250" rx="46" ry="9" fill="#7a4a1e"/>',
             '<ellipse cx="150" cy="250" rx="40" ry="6" fill="#a8743a"/>',
             '<path d="M196 260 c18 0 18 24 0 24" fill="none" stroke="#e6dcc6" stroke-width="5"/>',
             '<path d="M128 270 h44" stroke="#c84a3a" stroke-width="3" opacity=".7"/>',
             # 김
             '<path d="M134 236 c-10 -14 10 -22 0 -38 M150 232 c-10 -16 12 -24 0 -44 M166 236 c-10 -14 10 -22 0 -38" fill="none" stroke="#fff6e6" stroke-width="2.4" opacity=".7" stroke-linecap="round"/>',
             sparkle(232, 236, 6, '#fff3c0', .8), sparkle(64, 250, 5, '#fff3c0', .7), vr]
    return svg(''.join(body), defs)


def ziwei():
    """자미두수 — 북극의 자미성과 그 둘레 12궁."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#06031a'), (.55, '#2a1050'), (1, '#6a3aa8')]) +
            rad('core', [(0, '#ffffff'), (.5, '#e6ccff'), (1, '#9a5ae0')]) + vd)
    cx, cy = 150, 190
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(281, 120, 0, 400, '#efe2ff', 8),
            f'<circle cx="{cx}" cy="{cy}" r="120" fill="#b07bff" opacity=".2" filter="url(#blur20)"/>']
    # 12궁 바퀴 — 바깥 고리를 12칸으로
    body += [f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#d8b4ff" stroke-width="{w}" opacity="{o}"/>' for r, w, o in [(112, 1.2, .7), (84, .8, .5), (40, .8, .5)]]
    spokes = ''.join(f'M{f(cx + math.cos(math.tau * i / 12 + math.pi / 12) * 84)} {f(cy + math.sin(math.tau * i / 12 + math.pi / 12) * 84)}'
                     f'L{f(cx + math.cos(math.tau * i / 12 + math.pi / 12) * 112)} {f(cy + math.sin(math.tau * i / 12 + math.pi / 12) * 112)}' for i in range(12))
    body.append(f'<path d="{spokes}" stroke="#d8b4ff" stroke-width=".9" opacity=".55"/>')
    rnd = random.Random(8)
    for i in range(12):
        a = math.tau * i / 12
        n = rnd.choice([0, 1, 1, 2])
        for k in range(n):
            x, y = cx + math.cos(a + (k - .5) * .12) * 98, cy + math.sin(a + (k - .5) * .12) * 98
            body.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="2.6" fill="#ffe9b0"/>')
    # 북두칠성
    dipper = [(70, 70), (96, 64), (120, 74), (142, 86), (150, 112), (178, 118), (184, 92)]
    body.append('<path d="M' + ' L'.join(f'{x} {y}' for x, y in dipper) + ' L150 112" stroke="#f3e6ff" stroke-width=".9" fill="none" opacity=".6"/>')
    body += [f'<circle cx="{x}" cy="{y}" r="2.2" fill="#fff"/>' for x, y in dipper]
    body += [f'<circle cx="{cx}" cy="{cy}" r="26" fill="url(#core)"/>', sparkle(cx, cy, 34, '#fff', .9), sparkle(cx, cy, 14, '#fff', 1),
             cloud(64, 372, 1.6, '#e6d6ff', .35), cloud(240, 380, 1.5, '#e6d6ff', .3), vr]
    return svg(''.join(body), defs)


def vedic():
    """베딕 점성술 — 연꽃 만다라와 27개의 별 무리 고리, 초승달."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#140806'), (.55, '#4a1e10'), (1, '#b0581e')]) +
            lin('pet', [(0, '#ffd27a'), (1, '#e0702a')]) + vd)
    cx, cy = 150, 200
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(291, 80, 0, 400, '#ffe8c8', 5),
            f'<circle cx="{cx}" cy="{cy}" r="116" fill="#ffb84a" opacity=".2" filter="url(#blur20)"/>',
            f'<circle cx="{cx}" cy="{cy}" r="104" fill="none" stroke="#ffd27a" stroke-width="1" opacity=".6"/>']
    for i in range(27):
        a = math.tau * i / 27 - math.pi / 2
        body.append(f'<circle cx="{f(cx + math.cos(a) * 104)}" cy="{f(cy + math.sin(a) * 104)}" r="{3.2 if i % 9 == 0 else 1.9}" fill="#fff0c8"/>')
    for ring, n, length, op in [(0, 16, 70, .55), (0, 8, 52, .95)]:
        for i in range(n):
            ang = 360 * i / n + (11.25 if n == 16 else 0)
            body.append(f'<path transform="translate({cx} {cy}) rotate({f(ang)})" d="M0 0 C-12 -{length * .4} -9 -{length * .8} 0 -{length} C9 -{length * .8} 12 -{length * .4} 0 0Z" fill="url(#pet)" opacity="{op}"/>')
    body += [f'<circle cx="{cx}" cy="{cy}" r="16" fill="#fff3d0"/>',
             '<path d="M232 62 a22 22 0 1 0 16 38 a17 17 0 1 1 -16 -38z" fill="#fff3d0" opacity=".95"/>',
             waves(352, '#ffd9a0', .35, 6, 5, 1.1), vr]
    return svg(''.join(body), defs)


def mahabote():
    """마하보테 — 여덟 방향 요일 나침반 위의 황금 탑."""
    vd, vr = vignette()
    defs = (lin('sky', [(0, '#04140e'), (.55, '#0e3a2a'), (1, '#2a7a5a')]) +
            lin('gold', [(0, '#ffe9a8'), (1, '#c8902a')]) + vd)
    cx, cy = 150, 210
    body = ['<rect width="300" height="400" fill="url(#sky)"/>', stars(301, 70, 0, 300, '#e6fff4', 5),
            f'<circle cx="{cx}" cy="{cy}" r="112" fill="#ffd27a" opacity=".16" filter="url(#blur20)"/>',
            f'<circle cx="{cx}" cy="{cy}" r="100" fill="none" stroke="#ffe0a0" stroke-width="1" opacity=".6"/>']
    for i in range(8):
        a = math.tau * i / 8 - math.pi / 2
        x, y = cx + math.cos(a) * 100, cy + math.sin(a) * 100
        body += [f'<path d="M{cx} {cy} L{f(x)} {f(y)}" stroke="#ffe0a0" stroke-width=".7" opacity=".35"/>',
                 f'<circle cx="{f(x)}" cy="{f(y)}" r="12" fill="#0e3a2a" stroke="#ffe0a0" stroke-width="1.2"/>',
                 f'<circle cx="{f(x)}" cy="{f(y)}" r="4" fill="#ffe0a0"/>']
    # 탑(파고다) — 종 모양 몸체와 첨탑
    body += [f'<path d="M{cx - 44} {cy + 40} h88 l-8 -14 h-72z" fill="url(#gold)"/>',
             f'<path d="M{cx - 30} {cy + 26} C{cx - 30} {cy - 10} {cx - 10} {cy - 20} {cx} {cy - 40} C{cx + 10} {cy - 20} {cx + 30} {cy - 10} {cx + 30} {cy + 26}Z" fill="url(#gold)"/>',
             f'<path d="M{cx} {cy - 40} L{cx - 3} {cy - 80} L{cx} {cy - 96} L{cx + 3} {cy - 80}Z" fill="url(#gold)"/>',
             f'<path d="M{cx - 8} {cy - 52} h16 M{cx - 6} {cy - 62} h12 M{cx - 4} {cy - 72} h8" stroke="#a8761c" stroke-width="2"/>',
             sparkle(cx, cy - 100, 9, '#fff', .95),
             f'<path d="{ridge(33, 372, 24, 4)}" fill="#04140e" opacity=".85"/>', vr]
    return svg(''.join(body), defs)


POSTERS = {
    'ziwei': ziwei, 'vedic': vedic, 'mahabote': mahabote,
    'counsel-unni': counsel_unni, 'counsel-senior': counsel_senior, 'counsel-halmae': counsel_halmae,
    'life': life, 'newyear': newyear, 'gunghap': gunghap, 'name': name, 'qna': qna,
    'astro': astro, 'manse': manse, 'daily': daily, 'natal': natal,
    'astro-today': astro_today, 'tarot-bg': tarot_bg,
    'love': love, 'money': money, 'career': career, 'marriage': marriage, 'reunion': reunion,
    'study': study, 'child': child, 'children': children, 'health': health, 'daypick': daypick, 'monthly': monthly,
    'astro-love': astro_love, 'astro-career': astro_career, 'astro-yearly': astro_yearly,
}

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for key, fn in POSTERS.items():
        (OUT / f'{key}.svg').write_text(fn(), encoding='utf-8')
        print(f'{key}.svg', (OUT / f'{key}.svg').stat().st_size, 'bytes')
