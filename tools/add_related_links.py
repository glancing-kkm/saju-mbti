#!/usr/bin/env python3
"""
블로그 109개 페이지에 「관련 콘텐츠」 섹션 자동 삽입
====================================================

사용법:
    python3 tools/add_related_links.py

동작:
    1. blog/{ilju-list, mbti-saju, sinsal, zodiac, basics, lifestage}의 모든 HTML 스캔
    2. 카테고리별 매핑 규칙으로 관련 페이지 추천
    3. 각 HTML 안의 마커(<!--RELATED_LINKS-->)를 찾아 섹션 삽입,
       마커 없으면 </main> 또는 </body> 직전에 추가
    4. 동일 마커가 이미 있으면(이전 실행으로 삽입된 섹션) 그 안만 갱신
"""
from __future__ import annotations
import os
import re
import sys
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parent.parent
BLOG = ROOT / "blog"

# ─────────────────────────────────────────────────────────────
# 천간·지지 매핑
# ─────────────────────────────────────────────────────────────
STEMS_ROMAN = ['gap','eul','byeong','jeong','mu','gi','gyeong','sin','im','gye']
STEMS_KO    = ['갑','을','병','정','무','기','경','신','임','계']
STEMS_OH    = ['목','목','화','화','토','토','금','금','수','수']
# 천간 → 잘 맞는 MBTI 3개 (오행 기반 직관 매칭)
STEM_MBTI = {
    'gap':    ['ENTJ','ENFJ','INTJ'],  # 갑목 — 리더십·통솔
    'eul':    ['INFJ','INFP','ENFP'],  # 을목 — 부드러운 적응·예술
    'byeong': ['ENFP','ESFP','ENTP'],  # 병화 — 밝고 표현
    'jeong': ['INFJ','INFP','ISFJ'],   # 정화 — 섬세·내공
    'mu':     ['ISTJ','ISFJ','ESTJ'],  # 무토 — 신중·중후
    'gi':     ['ISFJ','ESFJ','ISFP'],  # 기토 — 헌신·온화
    'gyeong': ['ESTJ','ENTJ','ISTP'],  # 경금 — 결단·실행
    'sin':    ['INTP','ISTP','INTJ'],  # 신금 — 정밀·완벽
    'im':     ['ENTP','INTP','ENFP'],  # 임수 — 변화·기획
    'gye':    ['INFJ','INFP','INTJ'],  # 계수 — 사색·지혜
}

BRANCHES_ROMAN = ['ja','chuk','in','myo','jin','sa','o','mi','sin','yu','sul','hae']
BRANCHES_KO    = ['자','축','인','묘','진','사','오','미','신','유','술','해']
ANIMALS        = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지']
BRANCH_OH      = ['수','토','목','목','토','화','화','토','금','금','토','수']
# 지지 → 자주 활성화되는 신살 2개 (지지의 기운에 따라)
BRANCH_SINSAL = {
    'ja':   ['dohwa','cheoneul'],     # 자수 — 도화·천을귀인
    'chuk': ['baekho','hwagae'],      # 축토 — 백호·화개
    'in':   ['yeokma','yangin'],      # 인목 — 역마·양인
    'myo':  ['dohwa','muncheong'],    # 묘목 — 도화·문창
    'jin':  ['baekho','hwagae'],      # 진토 — 백호·화개
    'sa':   ['yeokma','hongyeom'],    # 사화 — 역마·홍염
    'o':    ['dohwa','yangin'],       # 오화 — 도화·양인
    'mi':   ['hwagae','muncheong'],   # 미토 — 화개·문창
    'sin':  ['yeokma','baekho'],      # 신금 — 역마·백호
    'yu':   ['dohwa','muncheong'],    # 유금 — 도화·문창
    'sul':  ['baekho','hwagae'],      # 술토 — 백호·화개
    'hae':  ['yeokma','cheoneul'],    # 해수 — 역마·천을귀인
}
# 지지 → 띠 매핑 (1:1)
BRANCH_TO_ZODIAC = dict(zip(BRANCHES_ROMAN, BRANCHES_ROMAN))  # 같음

# ─────────────────────────────────────────────────────────────
# 16 MBTI
# ─────────────────────────────────────────────────────────────
MBTI_LABEL = {
    'INTJ':'전략가','INTP':'논리술사','ENTJ':'통솔자','ENTP':'변론가',
    'INFJ':'옹호자','INFP':'중재자','ENFJ':'선도자','ENFP':'활동가',
    'ISTJ':'청렴결백','ISFJ':'수호자','ESTJ':'경영자','ESFJ':'집정관',
    'ISTP':'장인','ISFP':'모험가','ESTP':'사업가','ESFP':'연예인',
}
MBTI_GROUP = {
    'NT':['INTJ','INTP','ENTJ','ENTP'],
    'NF':['INFJ','INFP','ENFJ','ENFP'],
    'SJ':['ISTJ','ISFJ','ESTJ','ESFJ'],
    'SP':['ISTP','ISFP','ESTP','ESFP'],
}
# MBTI → 잘 맞는 일주 (천간 기반 역매핑)
MBTI_TO_STEMS: dict[str, list[str]] = {}
for stem, mlist in STEM_MBTI.items():
    for m in mlist:
        MBTI_TO_STEMS.setdefault(m, []).append(stem)

# ─────────────────────────────────────────────────────────────
# 신살 매핑
# ─────────────────────────────────────────────────────────────
SINSAL_LABEL = {
    'cheoneul':'천을귀인','muncheong':'문창귀인','hwagae':'화개살',
    'yeokma':'역마살','dohwa':'도화살','hongyeom':'홍염살',
    'yangin':'양인살','baekho':'백호살',
}
SINSAL_TYPE = {
    'cheoneul':'길성','muncheong':'길성','hwagae':'길성',
    'yeokma':'중성','dohwa':'중성','hongyeom':'중성',
    'yangin':'흉살','baekho':'흉살',
}

# ─────────────────────────────────────────────────────────────
# 띠 매핑 (오행 그룹)
# ─────────────────────────────────────────────────────────────
ZODIAC_OH_GROUP = {
    '수':['ja','hae'],
    '토':['chuk','jin','mi','sul'],
    '목':['in','myo'],
    '화':['sa','o'],
    '금':['sin','yu'],
}

# ─────────────────────────────────────────────────────────────
# 생애 단계·기초
# ─────────────────────────────────────────────────────────────
LIFESTAGE = {
    'choneon':'어린 시절·초년',
    'cheongnyeon':'청년기',
    'jungnyeon':'중년기',
    'malnyeon':'말년기',
}
BASICS = {
    'saju-basics':'사주 기초',
    'manseryeok':'만세력 보는 법',
    'ohaeng':'오행 입문',
    'sipsin':'십신 입문',
    'gyeokguk-yongsin':'격국·용신',
    'sinsal':'신살 입문',
    'daeun-saewoon':'대운·세운',
}

# ─────────────────────────────────────────────────────────────
# 헬퍼
# ─────────────────────────────────────────────────────────────
def parse_ilju(stem_branch: str) -> tuple[str, str] | None:
    """파일명(확장자 제외) → (천간 로마자, 지지 로마자). 매칭 실패 시 None."""
    for stem in sorted(STEMS_ROMAN, key=len, reverse=True):
        if stem_branch.startswith(stem):
            branch = stem_branch[len(stem):]
            if branch in BRANCHES_ROMAN:
                return stem, branch
    return None

def ilju_label(stem_r: str, branch_r: str) -> str:
    sk = STEMS_KO[STEMS_ROMAN.index(stem_r)]
    bk = BRANCHES_KO[BRANCHES_ROMAN.index(branch_r)]
    animal = ANIMALS[BRANCHES_ROMAN.index(branch_r)]
    return f"{sk}{bk}일주 ({animal})"

def existing_iljus() -> set[str]:
    """실제 존재하는 일주 파일 set."""
    return {f.stem for f in (BLOG/'ilju-list').glob('*.html')}

def existing_set(subdir: str) -> set[str]:
    return {f.stem for f in (BLOG/subdir).glob('*.html')}

# ─────────────────────────────────────────────────────────────
# 카테고리별 관련 콘텐츠 빌더
# ─────────────────────────────────────────────────────────────
def related_for_ilju(file_stem: str, all_iljus: set[str], all_sinsal: set[str]) -> str:
    """60갑자 일주 페이지에 들어갈 관련 콘텐츠 HTML."""
    parsed = parse_ilju(file_stem)
    if not parsed:
        return ''
    stem_r, branch_r = parsed
    sk = STEMS_KO[STEMS_ROMAN.index(stem_r)]
    bk = BRANCHES_KO[BRANCHES_ROMAN.index(branch_r)]
    animal = ANIMALS[BRANCHES_ROMAN.index(branch_r)]
    stem_oh = STEMS_OH[STEMS_ROMAN.index(stem_r)]

    sections: list[tuple[str, list[tuple[str, str]]]] = []

    # ① 같은 천간 다른 일주 (최대 4)
    same_stem = [(s, ilju_label(stem_r, b)) for b in BRANCHES_ROMAN
                 if (stem_r+b) in all_iljus and (stem_r+b) != file_stem
                 for s in [stem_r+b]][:4]
    if same_stem:
        sections.append((
            f"📋 같은 {sk}({sk}{stem_oh}) 일간의 다른 일주",
            [(f"/blog/ilju-list/{s}.html", lbl) for s, lbl in same_stem]
        ))

    # ② 같은 지지 다른 일주 (최대 4)
    same_br = []
    for st in STEMS_ROMAN:
        s = st + branch_r
        if s in all_iljus and s != file_stem:
            same_br.append((s, ilju_label(st, branch_r)))
            if len(same_br) >= 4: break
    if same_br:
        sections.append((
            f"🌙 같은 {bk}({animal}) 지지의 다른 일주",
            [(f"/blog/ilju-list/{s}.html", lbl) for s, lbl in same_br]
        ))

    # ③ 어울리는 MBTI (최대 3)
    mbtis = STEM_MBTI.get(stem_r, [])[:3]
    if mbtis:
        sections.append((
            f"🧬 {sk}({sk}{stem_oh}) 일간과 결이 맞는 MBTI",
            [(f"/blog/mbti-saju/{m.lower()}.html", f"{m} — {MBTI_LABEL[m]}") for m in mbtis]
        ))

    # ④ 자주 활성화되는 신살 (최대 2)
    sinsals = [s for s in BRANCH_SINSAL.get(branch_r, []) if s in all_sinsal][:2]
    if sinsals:
        sections.append((
            f"⚡ {bk}({animal})에 자주 활성화되는 신살",
            [(f"/blog/sinsal/{s}.html", f"{SINSAL_LABEL[s]} — {SINSAL_TYPE[s]}") for s in sinsals]
        ))

    # ⑤ 기초 가이드 (고정 2)
    sections.append((
        "📖 사주 기초가 처음이신가요?",
        [
            ("/blog/basics/saju-basics.html", "사주 기초 — 사주가 뭐예요?"),
            ("/blog/basics/sipsin.html", "십신 입문 — 비겁·식상·재성·관성·인성"),
        ]
    ))

    return render_sections(sections)


def related_for_mbti(file_stem: str, all_iljus: set[str]) -> str:
    """MBTI 페이지에 들어갈 관련 콘텐츠."""
    mbti = file_stem.upper()
    if mbti not in MBTI_LABEL:
        return ''
    sections: list[tuple[str, list[tuple[str, str]]]] = []

    # ① 같은 그룹 다른 MBTI 3개
    group = None
    for g, members in MBTI_GROUP.items():
        if mbti in members:
            group = g; break
    if group:
        others = [m for m in MBTI_GROUP[group] if m != mbti][:3]
        if others:
            group_name = {'NT':'분석가(NT)','NF':'외교관(NF)','SJ':'관리자(SJ)','SP':'탐험가(SP)'}[group]
            sections.append((
                f"🧬 같은 {group_name} 그룹의 다른 MBTI",
                [(f"/blog/mbti-saju/{m.lower()}.html", f"{m} — {MBTI_LABEL[m]}") for m in others]
            ))

    # ② 어울리는 일주 (천간 기반, 최대 4)
    rec_stems = MBTI_TO_STEMS.get(mbti, [])[:4]
    rec_iljus = []
    for s in rec_stems:
        for b in BRANCHES_ROMAN:
            k = s+b
            if k in all_iljus:
                rec_iljus.append((k, ilju_label(s,b)))
                break
    if rec_iljus:
        sections.append((
            f"📋 {mbti}({MBTI_LABEL[mbti]})와 결이 어울리는 일주",
            [(f"/blog/ilju-list/{k}.html", lbl) for k, lbl in rec_iljus[:4]]
        ))

    # ③ 기초 가이드
    sections.append((
        "📖 사주 기초가 처음이신가요?",
        [
            ("/blog/basics/saju-basics.html", "사주 기초 — 사주가 뭐예요?"),
            ("/blog/basics/ohaeng.html", "오행 입문 — 목·화·토·금·수"),
        ]
    ))
    return render_sections(sections)


def related_for_sinsal(file_stem: str, all_sinsal: set[str], all_iljus: set[str]) -> str:
    if file_stem not in SINSAL_LABEL:
        return ''
    sections: list[tuple[str, list[tuple[str, str]]]] = []

    # ① 같은 길성/흉살 그룹 다른 신살 (최대 3)
    cur_type = SINSAL_TYPE.get(file_stem)
    others = [s for s in SINSAL_LABEL
              if SINSAL_TYPE.get(s)==cur_type and s in all_sinsal and s != file_stem][:3]
    if others:
        type_name = cur_type
        sections.append((
            f"⚡ 같은 「{type_name}」 그룹의 다른 신살",
            [(f"/blog/sinsal/{s}.html", f"{SINSAL_LABEL[s]}") for s in others]
        ))

    # ② 이 신살이 자주 활성화되는 일주 (최대 4 — BRANCH_SINSAL 역인덱스)
    relevant_branches = [b for b, sins in BRANCH_SINSAL.items() if file_stem in sins]
    sample_iljus: list[tuple[str,str]] = []
    for br in relevant_branches[:2]:
        for s in STEMS_ROMAN:
            k = s+br
            if k in all_iljus:
                sample_iljus.append((k, ilju_label(s,br)))
                if len(sample_iljus)>=4: break
        if len(sample_iljus)>=4: break
    if sample_iljus:
        sections.append((
            f"📋 {SINSAL_LABEL[file_stem]}이 자주 발현되는 일주",
            [(f"/blog/ilju-list/{k}.html", lbl) for k, lbl in sample_iljus]
        ))

    sections.append((
        "📖 사주 기초가 처음이신가요?",
        [
            ("/blog/basics/sinsal.html", "신살 입문 — 작은 별자리의 의미"),
            ("/blog/basics/saju-basics.html", "사주 기초 — 사주가 뭐예요?"),
        ]
    ))
    return render_sections(sections)


def related_for_zodiac(file_stem: str, all_iljus: set[str]) -> str:
    if file_stem not in BRANCHES_ROMAN:
        return ''
    idx = BRANCHES_ROMAN.index(file_stem)
    bk = BRANCHES_KO[idx]
    animal = ANIMALS[idx]
    oh = BRANCH_OH[idx]
    sections: list[tuple[str, list[tuple[str, str]]]] = []

    # ① 같은 오행 다른 띠 (최대 3)
    same_oh = [b for b in ZODIAC_OH_GROUP.get(oh, []) if b != file_stem][:3]
    if same_oh:
        sections.append((
            f"🌳 같은 {oh} 기운의 다른 띠",
            [(f"/blog/zodiac/{b}.html", f"{BRANCHES_KO[BRANCHES_ROMAN.index(b)]}({ANIMALS[BRANCHES_ROMAN.index(b)]})띠") for b in same_oh]
        ))

    # ② 이 지지를 가진 일주 (최대 4)
    iljus_with = []
    for s in STEMS_ROMAN:
        k = s+file_stem
        if k in all_iljus:
            iljus_with.append((k, ilju_label(s, file_stem)))
            if len(iljus_with)>=4: break
    if iljus_with:
        sections.append((
            f"📋 {bk}({animal}) 지지를 가진 일주",
            [(f"/blog/ilju-list/{k}.html", lbl) for k, lbl in iljus_with]
        ))

    sections.append((
        "📖 사주 기초가 처음이신가요?",
        [
            ("/blog/basics/saju-basics.html", "사주 기초 — 사주가 뭐예요?"),
            ("/blog/basics/ohaeng.html", "오행 입문 — 목·화·토·금·수"),
        ]
    ))
    return render_sections(sections)


def related_for_basics(file_stem: str) -> str:
    sections: list[tuple[str, list[tuple[str, str]]]] = []
    others = [(k, v) for k, v in BASICS.items() if k != file_stem][:6]
    if others:
        sections.append((
            "📖 다른 기초 가이드",
            [(f"/blog/basics/{k}.html", v) for k, v in others]
        ))
    # 추천 일주 3개 (가장 흔한 일간)
    pop = [('gapja','갑자(甲子)일주'),('byeongo','병오(丙午)일주'),('imja','임자(壬子)일주')]
    sections.append((
        "📋 인기 있는 일주 풀이",
        [(f"/blog/ilju-list/{k}.html", v) for k, v in pop]
    ))
    return render_sections(sections)


def related_for_lifestage(file_stem: str) -> str:
    sections: list[tuple[str, list[tuple[str, str]]]] = []
    others = [(k, v) for k, v in LIFESTAGE.items() if k != file_stem]
    if others:
        sections.append((
            "🌱 다른 생애 단계 풀이",
            [(f"/blog/lifestage/{k}.html", v) for k, v in others]
        ))
    sections.append((
        "📖 사주 기초가 처음이신가요?",
        [
            ("/blog/basics/daeun-saewoon.html", "대운·세운 — 시기별 흐름"),
            ("/blog/basics/saju-basics.html", "사주 기초 — 사주가 뭐예요?"),
        ]
    ))
    return render_sections(sections)


# ─────────────────────────────────────────────────────────────
# HTML 렌더링·삽입
# ─────────────────────────────────────────────────────────────
def render_sections(sections: list[tuple[str, list[tuple[str, str]]]]) -> str:
    if not sections:
        return ''
    blocks = []
    for title, items in sections:
        if not items:
            continue
        lis = '\n'.join(f'    <li><a href="{href}">{label}</a></li>' for href, label in items)
        blocks.append(f'  <div class="rl-group">\n    <h3 class="rl-title">{title}</h3>\n    <ul class="rl-list">\n{lis}\n    </ul>\n  </div>')
    body = '\n'.join(blocks)
    return f'''<!--RELATED_LINKS_START-->
<section class="related-links" aria-labelledby="related-links-heading">
  <h2 id="related-links-heading" class="rl-heading">🔗 함께 보면 좋은 콘텐츠</h2>
{body}
</section>
<!--RELATED_LINKS_END-->'''


MARKER_RE = re.compile(
    r'<!--RELATED_LINKS_START-->.*?<!--RELATED_LINKS_END-->',
    re.DOTALL
)

def update_file(file_path: Path, related_html: str) -> bool:
    """파일에 관련 콘텐츠 섹션을 삽입/갱신. 변경 발생 시 True."""
    if not related_html:
        return False
    src = file_path.read_text(encoding='utf-8')
    if MARKER_RE.search(src):
        # 기존 섹션 교체
        new = MARKER_RE.sub(related_html, src)
    else:
        # </main> 또는 </body> 직전에 삽입
        if '</main>' in src:
            new = src.replace('</main>', f'{related_html}\n</main>', 1)
        elif '</body>' in src:
            new = src.replace('</body>', f'{related_html}\n</body>', 1)
        else:
            new = src + '\n' + related_html
    if new == src:
        return False
    file_path.write_text(new, encoding='utf-8')
    return True


# ─────────────────────────────────────────────────────────────
# 메인
# ─────────────────────────────────────────────────────────────
def main() -> int:
    if not BLOG.exists():
        print(f'blog 디렉토리 없음: {BLOG}', file=sys.stderr)
        return 1

    all_iljus = existing_set('ilju-list')
    all_sinsal = existing_set('sinsal')
    all_mbti = existing_set('mbti-saju')
    all_zodiac = existing_set('zodiac')
    all_basics = existing_set('basics')
    all_lifestage = existing_set('lifestage')

    stats = {'ilju-list':0, 'mbti-saju':0, 'sinsal':0, 'zodiac':0, 'basics':0, 'lifestage':0, 'unchanged':0}

    for f in sorted((BLOG/'ilju-list').glob('*.html')):
        if update_file(f, related_for_ilju(f.stem, all_iljus, all_sinsal)):
            stats['ilju-list'] += 1

    for f in sorted((BLOG/'mbti-saju').glob('*.html')):
        if update_file(f, related_for_mbti(f.stem, all_iljus)):
            stats['mbti-saju'] += 1

    for f in sorted((BLOG/'sinsal').glob('*.html')):
        if update_file(f, related_for_sinsal(f.stem, all_sinsal, all_iljus)):
            stats['sinsal'] += 1

    for f in sorted((BLOG/'zodiac').glob('*.html')):
        if update_file(f, related_for_zodiac(f.stem, all_iljus)):
            stats['zodiac'] += 1

    for f in sorted((BLOG/'basics').glob('*.html')):
        if update_file(f, related_for_basics(f.stem)):
            stats['basics'] += 1

    for f in sorted((BLOG/'lifestage').glob('*.html')):
        if update_file(f, related_for_lifestage(f.stem)):
            stats['lifestage'] += 1

    total = sum(v for k, v in stats.items() if k != 'unchanged')
    print(f'✓ 관련 콘텐츠 섹션 삽입/갱신 완료 — 총 {total}개 파일')
    for cat, n in stats.items():
        if cat == 'unchanged': continue
        print(f'  {n:4d}  blog/{cat}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
