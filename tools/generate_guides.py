#!/usr/bin/env python3
"""주제별 가이드 글(blog/guide/*.html)을 만든다.

기존 가이드(blog/basics/love-pattern.html 등)와 같은 형식·스타일을 쓰고,
글 끝 버튼은 해당 풀이 소개 화면으로 바로 이어진다(/?go=<상품 키>).

    python3 tools/generate_guides.py
"""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'blog' / 'guide'
SITE = 'https://saju-mbti-9h1.pages.dev'
DATE = '2026-10-14'
DATE_KO = '2026년 10월 14일'

GUIDES = [
    {
        'slug': 'love-fortune', 'go': 'topic-love', 'cta': '내 연애운 풀이 보기',
        'title': '연애운 보는 법, 인연이 가까워지는 때를 읽는 세 가지 신호',
        'desc': '사주로 연애운을 볼 때 무엇을 보는지, 좋은 해와 좋은 달을 어떻게 쓰면 좋은지 쉬운 말로 정리했어요.',
        'sections': [
            ('연애운은 ‘언제’와 ‘어떤 사람’을 함께 봐요', [
                '연애운 풀이는 두 가지를 같이 읽어요. 하나는 본인이 어떤 사람에게 끌리고 어떤 사람과 오래 가는지예요.',
                '다른 하나는 인연이 가까워지는 시기예요. 성향만 알면 막연하고, 시기만 알면 엉뚱한 사람을 기다리게 돼요.']),
            ('첫 번째 신호, 배우자 자리', [
                '사주에는 본인 곁을 뜻하는 자리가 있어요. 이 자리에 놓인 분위기가 끌리는 사람의 모습을 보여줘요.',
                '예를 들어 성실한 안정감이 있으면 생활력 있는 사람과, 재치 있는 표현이 있으면 대화가 잘 통하는 사람과 잘 맞는 편이에요.']),
            ('두 번째 신호, 인연을 부르는 글자', [
                '사주 여덟 글자 안에 인연을 뜻하는 글자가 몇 번 나오는지도 봐요. 많다고 무조건 좋은 건 아니에요.',
                '많으면 만남의 기회가 많고, 적으면 생활 속 신뢰가 쌓일 때 인연이 선명해지는 편이에요.']),
            ('세 번째 신호, 해와 달의 흐름', [
                '해마다, 달마다 들어오는 글자가 배우자 자리를 끌어당기거나 인연 글자를 건드리면 연애 흐름이 올라가요.',
                '좋은 해와 좋은 달에는 소개·모임처럼 사람이 오가는 자리에 나가 보세요. 살필 달에는 서두르지 않는 게 좋아요.']),
            ('점수보다 행동이 먼저예요', [
                '연애운 점수가 낮은 달에도 인연은 생길 수 있어요. 점수는 흐름의 온도를 알려줄 뿐이에요.',
                '오늘 한 가지 · 최근 서운했던 일을 한 문장으로 적어보세요. 본인 연애 패턴이 보이기 시작해요.']),
        ],
        'related': ['reunion-fortune', 'marriage-fortune', 'tarot-topics'],
    },
    {
        'slug': 'reunion-fortune', 'go': 'topic-reunion', 'cta': '재회운 풀이 보기',
        'title': '재회운, 사주로 볼 때 꼭 함께 봐야 할 것',
        'desc': '다시 이어질 흐름이 있는지보다 먼저 확인할 질문, 다가가는 순서, 멈춰야 할 신호까지 정리했어요.',
        'sections': [
            ('재회운은 ‘가능성’만 보는 풀이가 아니에요', [
                '사주는 흐름이 열리는 때를 보여줄 수 있어요. 하지만 재회는 결국 두 사람의 선택이에요.',
                '그래서 좋은 재회운 풀이는 시기와 함께, 본인이 정말 돌아가고 싶은지도 짚어줘요.']),
            ('먼저 본인에게 물어볼 세 가지', [
                '그리운 게 그 사람인지, 그때의 안정감인지 구분해 보세요. 헤어진 이유가 지금은 달라졌는지도 적어보세요.',
                '혼자서도 괜찮은지 돌아보는 것도 중요해요. 외로움을 피하려는 재회는 오래가지 않는 편이에요.']),
            ('사주에서는 이렇게 읽어요', [
                '배우자 자리를 자석처럼 끌어당기는 해와 달이 있어요. 이런 때는 연락이 닿거나 우연히 만나기 쉬워요.',
                '반대로 정면으로 부딪히는 해에는 감정이 커지기 쉬워요. 이때는 결론을 미루는 편이 좋아요.']),
            ('다가갈 때는 순서가 중요해요', [
                '감정을 가라앉히고, 바뀐 점을 정리한 뒤, 가벼운 안부로 시작해요. 첫 연락은 한두 줄이면 충분해요.',
                '답이 늦어도 연달아 보내지 마세요. 상대가 고를 여지를 남기는 게 신뢰를 되살려요.']),
            ('이럴 땐 멈추는 게 좋아요', [
                '상대가 분명히 거절했다면 그 결정을 존중해 주세요. 같은 상처가 반복된다면 다시 만나도 같은 일이 생겨요.',
                '어떤 결론이든 본인을 아끼는 쪽을 고르세요. 마음이 너무 힘들 땐 믿을 사람과 꼭 이야기하세요.']),
        ],
        'related': ['love-fortune', 'tarot-topics', 'marriage-fortune'],
    },
    {
        'slug': 'money-fortune', 'go': 'topic-money', 'cta': '내 재물운 풀이 보기',
        'title': '재물운 보는 법, 돈 버는 방식과 새는 구멍 찾기',
        'desc': '사주로 재물운을 볼 때 안정 재물과 활동 재물을 어떻게 나눠 읽는지, 돈이 새는 습관은 어떻게 보는지 정리했어요.',
        'sections': [
            ('재물운은 ‘얼마나’보다 ‘어떻게’를 봐요', [
                '사주가 통장 잔고를 맞히지는 못해요. 대신 본인이 어떤 방식으로 돈을 벌 때 편한지 보여줘요.',
                '월급처럼 꾸준히 쌓이는 돈이 맞는 사람도 있고, 거래처럼 움직이며 버는 돈이 맞는 사람도 있어요.']),
            ('안정 재물과 활동 재물', [
                '사주 안에는 꾸준히 쌓이는 돈의 신호와 흐름을 타는 돈의 신호가 따로 있어요. 어느 쪽이 많은지 세어 봐요.',
                '재능을 결과물로 바꾸는 신호가 함께 있으면, 잘하는 걸 상품이나 서비스로 만들 때 돈이 붙는 편이에요.']),
            ('돈이 새는 구멍도 보여요', [
                '경쟁·동료를 뜻하는 글자가 많으면 돈을 나누거나 빌려주는 일에서 손해가 나기 쉬워요.',
                '이런 사주라면 친한 사이일수록 금액과 기한을 꼭 기록해 두는 게 좋아요.']),
            ('좋은 해와 살필 해', [
                '돈의 글자가 들어오는 해에는 계약·단가·수입 구조를 움직이기 좋아요.',
                '경쟁 글자가 강하게 들어오는 해에는 큰 투자보다 지키는 구조를 먼저 만드세요.']),
            ('네 칸으로 나누면 흐름을 지킬 수 있어요', [
                '생활비, 비상금, 장기 자산, 도전 자금으로 칸을 나눠 보세요. 기회가 와도 선택권을 지킬 수 있어요.',
                '사주는 참고 정보예요. 구체적인 투자 결정은 전문가와 꼭 상의하세요.']),
        ],
        'related': ['love-fortune', 'ziwei-doushu', 'child-saju'],
    },
    {
        'slug': 'marriage-fortune', 'go': 'topic-marriage', 'cta': '내 결혼운 풀이 보기',
        'title': '결혼운과 배우자 자리, 어떻게 읽을까',
        'desc': '사주에서 배우자 자리와 결혼 흐름을 읽는 방법, 결혼 전 두 사람이 함께 맞춰볼 생활 기준을 정리했어요.',
        'sections': [
            ('결혼운은 시기와 생활을 함께 봐요', [
                '결혼운 풀이는 결혼 흐름이 무르익는 해와, 결혼 생활의 모습을 같이 읽어요.',
                '시기만 보고 서두르면 생활 속도가 맞지 않아 지치기 쉬워요.']),
            ('배우자 자리가 보여주는 것', [
                '본인 곁을 뜻하는 자리에 어떤 분위기가 놓였는지 봐요. 그 분위기가 잘 맞는 배우자상을 보여줘요.',
                '이 자리가 가족 자리와 어떻게 만나는지도 봐요. 부딪히는 사주라면 결혼 후 생활 방식 조율이 중요해요.']),
            ('결혼 흐름이 무르익는 해', [
                '인연 글자가 들어오고 배우자 자리를 끌어당기는 해에 결혼 흐름이 올라가요.',
                '상견례·약혼처럼 공식적인 단계를 이런 해에 배치하면 일이 순조롭게 흘러가는 편이에요.']),
            ('결혼 전에 함께 맞춰볼 것', [
                '돈을 쓰는 기준, 쉬는 방식, 양가 가족과의 거리를 이야기해 보세요. 설렘만큼 중요한 기준이에요.',
                '집안 역할은 잘하는 일 위주로 나누고, 한 달에 한 번 바꿔보는 것도 좋아요.']),
            ('두 사람을 함께 보고 싶다면', [
                '결혼운은 한 사람의 흐름이에요. 두 사람이 어디서 잘 맞는지는 궁합 풀이로 함께 보는 게 좋아요.',
                '어떤 결과든 결정은 두 사람의 몫이에요. 풀이는 대화를 시작하는 재료로 써 주세요.']),
        ],
        'related': ['love-fortune', 'reunion-fortune', 'child-saju'],
    },
    {
        'slug': 'child-saju', 'go': 'topic-child', 'cta': '우리 아이 사주 풀이 보기',
        'title': '우리 아이 사주, 이렇게 활용하세요',
        'desc': '아이 사주로 타고난 기질과 재능, 칭찬과 훈육 방법을 읽는 법과 꼭 지켜야 할 마음가짐을 정리했어요.',
        'sections': [
            ('아이 사주는 ‘틀’이 아니라 ‘지도’예요', [
                '아이 사주는 아이를 정해진 길에 넣기 위한 게 아니에요. 아이를 더 잘 이해하기 위한 지도예요.',
                '맞는 부분은 살려주고, 맞지 않는 부분은 아이의 실제 모습을 먼저 믿어 주세요.']),
            ('타고난 기질을 다섯 기운으로 봐요', [
                '나무·불·흙·금속·물 중 어떤 기운이 두터운지 봐요. 나무가 두터우면 호기심과 성장 욕구가 커요.',
                '물이 두터우면 생각이 깊고, 흙이 두터우면 차분하고 믿음직한 편이에요.']),
            ('칭찬과 훈육도 달라져요', [
                '스스로 하려는 아이에게는 명령보다 선택지를 주면 잘 따라와요. 생각이 깊은 아이는 답을 재촉하지 마세요.',
                '책임감 있는 아이에게는 결과보다 끝까지 해낸 과정을 칭찬해 주세요.']),
            ('나이에 맞는 말로 읽어요', [
                '같은 흐름도 유년기에는 건강과 생활 리듬으로, 학동기에는 공부 습관과 친구 관계로 풀어요.',
                '천지인 사주는 아이 나이에 맞춰 시기별 흐름을 다른 말로 설명해요.']),
            ('부모님 정보는 그대로 남아요', [
                '아이 생년월일로 풀이를 봐도, 부모님이 입력해 둔 출생정보는 덮어쓰지 않아요.',
                '오늘 한 가지 · 아이가 가장 즐거워 보였던 순간을 한 줄로 적어 보세요.']),
        ],
        'related': ['marriage-fortune', 'money-fortune', 'ziwei-doushu'],
    },
    {
        'slug': 'ziwei-doushu', 'go': 'ziwei', 'cta': '내 자미두수 풀이 보기',
        'title': '자미두수란? 12궁과 14주성 쉽게 이해하기',
        'desc': '자미두수가 사주와 어떻게 다른지, 명궁·부부궁·재백궁 같은 12개의 방과 14개의 별을 어떻게 읽는지 쉽게 정리했어요.',
        'sections': [
            ('사주와 같은 생일, 다른 지도', [
                '자미두수는 사주처럼 생년월일과 태어난 시를 써요. 다만 음력 날짜와 태어난 시로 하늘 지도를 따로 그려요.',
                '그래서 태어난 시간이 꼭 필요해요. 시간을 모르면 계산할 수 없어요.']),
            ('12개의 방', [
                '인생을 12개의 방으로 나눠요. 나를 나타내는 명궁, 배우자의 부부궁, 돈의 재백궁, 일의 관록궁이 대표적이에요.',
                '형제·자녀·몸·바깥 활동·친구·집·마음·부모의 방도 있어요. 방마다 삶의 한 분야를 맡아요.']),
            ('14개의 주인 별', [
                '각 방에 주인 별이 앉아요. 황제의 별 자미성, 지혜의 별 천기성, 재물의 별 무곡성처럼 별마다 성격이 달라요.',
                '명궁에 어떤 별이 있는지가 타고난 성향을 보여줘요. 별이 없는 방은 마주 보는 방의 별을 빌려 읽어요.']),
            ('10년 단위 흐름, 대한', [
                '자미두수도 10년 단위로 흐름이 바뀌어요. 시기마다 열리는 방이 달라져요.',
                '예를 들어 재백궁이 열리는 10년은 돈의 흐름이, 부부궁이 열리는 10년은 관계가 중심에 서요.']),
            ('사주와 함께 보면 좋아요', [
                '사주는 다섯 기운의 균형을, 자미두수는 별의 배치를 봐요. 두 지도가 같은 말을 하면 더 믿을 만한 신호예요.',
                '어느 쪽이든 결정은 본인 몫이에요. 풀이는 삶을 돌아보는 참고 정보로 써 주세요.']),
        ],
        'related': ['vedic-astrology', 'mahabote', 'money-fortune'],
    },
    {
        'slug': 'vedic-astrology', 'go': 'vedic', 'cta': '내 낙샤트라 무료로 보기',
        'title': '베딕 점성술과 낙샤트라, 서양 별자리와 무엇이 다를까',
        'desc': '인도 전통 점성술이 실제 별 위치를 기준으로 하는 이유, 달이 지나던 27개의 별자리 무리와 다샤 시기를 쉽게 정리했어요.',
        'sections': [
            ('별자리가 한 칸 당겨지는 이유', [
                '서양 점성술은 춘분점을 기준으로 별자리를 나눠요. 베딕 점성술은 실제 별의 위치를 기준으로 해요.',
                '춘분점이 아주 조금씩 움직여서 지금은 두 기준이 24도쯤 차이 나요. 그래서 별자리가 한 칸 앞당겨지기도 해요.']),
            ('태양보다 달을 중요하게 봐요', [
                '베딕 점성술은 태어난 순간 달이 있던 자리를 가장 중요하게 봐요. 달은 마음과 감정을 보여준다고 여겨요.',
                '달은 하루에 13도쯤 움직여서 태어난 시간이 있으면 더 정확해요.']),
            ('27개의 낙샤트라', [
                '하늘을 27개의 별자리 무리로 나눈 걸 낙샤트라라고 해요. 달이 어느 무리에 있었는지로 타고난 성향을 읽어요.',
                '말의 머리, 연꽃, 뿌리처럼 무리마다 상징이 있어요. 상징이 그 사람의 힘을 비유로 보여줘요.']),
            ('지금의 큰 시기, 다샤', [
                '달의 낙샤트라로 인생의 시기 순서가 정해져요. 금성의 시기, 토성의 시기처럼 행성이 차례로 이끌어요.',
                '큰 시기 안에는 작은 시기가 또 있어요. 지금 어떤 행성의 시기인지 알면 힘을 쓸 곳을 정하기 쉬워요.']),
            ('무료로 먼저 확인해 보세요', [
                '천지인 사주에서는 출생정보만 넣으면 낙샤트라, 달·태양·상승궁, 지금의 다샤를 무료로 보여줘요.',
                '서양 별자리 풀이와 함께 보면 같은 사람을 다른 하늘로 비춰 볼 수 있어요.']),
        ],
        'related': ['ziwei-doushu', 'mahabote', 'tarot-topics'],
    },
    {
        'slug': 'mahabote', 'go': 'mahabote', 'cta': '내 요일 동물 무료로 보기',
        'title': '마하보테, 미얀마 사람들이 태어난 요일을 중요하게 여기는 이유',
        'desc': '미얀마 전통 요일 점성술에서 여덟 요일마다 정해진 동물과 행성, 행운의 방향을 쉽게 소개해요.',
        'sections': [
            ('일주일이 여덟 요일인 점성술', [
                '미얀마 전통 점성술은 수요일을 오전과 오후로 나눠요. 그래서 일주일을 여덟 요일로 봐요.',
                '요일마다 지키는 행성과 동물, 방향이 정해져 있어요.']),
            ('요일마다 정해진 동물', [
                '일요일은 가루다, 월요일은 호랑이, 화요일은 사자예요. 수요일 오전은 상아 코끼리, 오후는 상아 없는 코끼리예요.',
                '목요일은 쥐, 금요일은 기니피그, 토요일은 나가(용)예요.']),
            ('생활 속의 요일 점성술', [
                '미얀마 사원에는 요일마다 기도하는 자리가 따로 있어요. 사람들은 태어난 요일의 자리에서 기도해요.',
                '아이 이름의 첫 글자를 태어난 요일에 맞춰 짓는 풍습도 있어요.']),
            ('행운의 방향 쓰는 법', [
                '요일마다 행운의 방향이 있어요. 중요한 일을 시작할 때 그 방향의 자리를 써 보는 식으로 즐겨 보세요.',
                '재미로 보는 문화 점성술이에요. 큰 결정은 본인의 판단을 먼저 믿으세요.']),
            ('무료로 내 요일 동물 보기', [
                '생년월일만 넣으면 태어난 요일과 동물, 행성, 행운의 방향을 알려줘요. 수요일생은 태어난 시간도 넣어 주세요.',
                '오늘 한 가지 · 가족이 태어난 요일도 함께 찾아보세요. 이야깃거리가 생겨요.']),
        ],
        'related': ['vedic-astrology', 'ziwei-doushu', 'child-saju'],
    },
    {
        'slug': 'tarot-topics', 'go': 'tarot-love', 'cta': '연애 타로 질문하러 가기',
        'title': '주제별 타로, 연애·재회·진로 질문을 잘 묻는 법',
        'desc': '같은 카드도 질문에 따라 읽는 자리가 달라져요. 주제별 타로의 카드 자리와 좋은 질문 만드는 법을 정리했어요.',
        'sections': [
            ('질문이 좋아야 카드도 선명해져요', [
                '‘잘될까요?’보다 ‘이 관계에서 지금 제가 할 수 있는 건 뭘까요?’처럼 물으면 답이 구체적이에요.',
                '질문에 사람·시기·선택을 하나씩만 담아 보세요. 너무 많은 걸 한 번에 물으면 답이 흐려져요.']),
            ('연애 타로의 카드 자리', [
                '3장으로 보면 나의 마음, 그 사람의 마음, 두 사람의 흐름을 읽어요.',
                '5장으로 보면 관계를 막는 것과 숨은 감정까지 더해져요.']),
            ('재회 타로의 카드 자리', [
                '헤어진 이유, 그 사람의 지금 마음, 다시 이어질 가능성을 봐요. 5장에서는 다가갈 때의 조언이 더해져요.',
                '카드가 좋게 나와도 상대의 뜻을 먼저 존중해 주세요.']),
            ('진로·재물 타로의 카드 자리', [
                '진로 타로는 지금 일의 상태, 기회가 오는 곳, 나아갈 방향을 봐요. 5장에서는 6개월 뒤 흐름까지 봐요.',
                '재물 타로는 지금 돈의 흐름, 새는 곳, 들어오는 흐름을 읽어요.']),
            ('카드는 직접 골라요', [
                '천지인 사주의 타로는 본인이 카드를 직접 골라요. 3장·5장·켈틱크로스 10장 중에서 질문에 맞게 고를 수 있어요.',
                '타로는 마음을 정리하는 도구예요. 중요한 결정은 현실 조건과 함께 판단하세요.']),
        ],
        'related': ['love-fortune', 'reunion-fortune', 'vedic-astrology'],
    },
]
TITLES = {g['slug']: g['title'] for g in GUIDES}


def esc(s):
    return html.escape(s, quote=True)


def nbsp_last(s):
    """마지막 줄에 짧은 말이 홀로 남지 않게 마지막 두 단어를 붙인다(AGENTS.md 줄바꿈 규칙)."""
    parts = s.rsplit(' ', 1)
    return parts[0] + '&nbsp;' + parts[1] if len(parts) == 2 else s


def page(g):
    url = f'{SITE}/blog/guide/{g["slug"]}.html'
    t, d = esc(g['title']), esc(g['desc'])
    ld = json.dumps({'@context': 'https://schema.org', '@type': 'BlogPosting', 'headline': g['title'], 'description': g['desc'],
                     'datePublished': DATE, 'dateModified': DATE, 'inLanguage': 'ko-KR', 'mainEntityOfPage': url,
                     'image': f'{SITE}/assets/art-v2/og-image.jpg',
                     'author': {'@type': 'Organization', 'name': '천지인 사주', 'url': f'{SITE}/about.html'},
                     'publisher': {'@type': 'Organization', 'name': '천지인 사주', 'url': f'{SITE}/'}}, ensure_ascii=False)
    cta = f'/?go={g["go"]}&entry=guide'
    body = f'<p>{nbsp_last(esc(g["desc"]))}</p>'
    for h, ps in g['sections']:
        body += f'<h2>{esc(h)}</h2>' + ''.join(f'<p>{nbsp_last(esc(p))}</p>' for p in ps)
    body += (f'<div class="callout"><b>{esc(g["cta"])}</b><p>생년월일로 시작해요. 상세 풀이는 결제 후 바로 확인할 수 있어요.</p>'
             f'<a class="blog-cta" href="{cta}">{esc(g["cta"])} →</a></div>'
             '<p>사주와 점성술은 본인의 선택을 돌아보는 참고 정보예요. <a href="/legal/editorial-policy.html">콘텐츠 작성 기준</a>을 확인할 수 있어요.</p>')
    related = ' · '.join(f'<a href="/blog/guide/{r}.html">{esc(TITLES[r])}</a>' for r in g['related']) + ' · <a href="/blog/">가이드 전체 보기</a>'
    return f'''<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t} | 천지인 사주</title><meta name="description" content="{d}"><meta name="robots" content="index, follow"><link rel="canonical" href="{url}">
<meta property="og:type" content="article"><meta property="og:site_name" content="천지인 사주"><meta property="og:title" content="{t}"><meta property="og:description" content="{d}"><meta property="og:url" content="{url}"><meta property="og:locale" content="ko_KR"><meta property="og:image" content="{SITE}/assets/art-v2/og-image.jpg">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{t}"><meta name="twitter:description" content="{d}"><meta name="twitter:image" content="{SITE}/assets/art-v2/og-image.jpg"><meta name="theme-color" content="#0f0d13">
<script type="application/ld+json">{ld}</script>
<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=hanji-20261020">
<link rel="stylesheet" href="/blog/blog.css">
</head>
<body><nav class="blog-nav" aria-label="주요 메뉴"><div class="blog-shell"><a href="/" class="blog-brand">천지인 사주</a><a href="{cta}" class="blog-cta">{esc(g["cta"])}</a></div></nav>
<article class="blog-article"><header class="blog-article-head"><div class="blog-article-cat">주제별 가이드</div><h1>{t}</h1><div class="blog-article-meta"><time datetime="{DATE}">{DATE_KO}</time> · 천지인 사주 편집</div></header><div class="blog-article-body">{body}</div><nav class="related-links" aria-label="함께 읽을 글">{related}</nav></article>
<footer class="blog-foot"><a href="/about.html">서비스 소개</a> · <a href="/legal/privacy.html">개인정보처리방침</a> · <a href="/legal/terms.html">이용약관</a></footer>
</body></html>
'''


def index_section():
    cards = ''.join(f'<a class="blog-card" href="/blog/guide/{g["slug"]}.html"><div class="card-tag">주제별 가이드</div><h3>{esc(g["title"])}</h3><p>{esc(g["desc"])}</p></a>' for g in GUIDES)
    return f'<section class="blog-section" id="topic-guides"><h2>주제별로 깊게 보기</h2><div class="blog-grid">{cards}</div></section>'


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for g in GUIDES:
        (OUT / f'{g["slug"]}.html').write_text(page(g), encoding='utf-8')
        print(g['slug'])
    # 블로그 첫 화면에 묶음을 넣는다(다시 돌리면 같은 자리를 바꿔 끼운다)
    idx = ROOT / 'blog' / 'index.html'
    s = idx.read_text(encoding='utf-8')
    sec = index_section()
    if 'id="topic-guides"' in s:
        a = s.index('<section class="blog-section" id="topic-guides">')
        b = s.index('</section>', a) + len('</section>')
        s = s[:a] + sec + s[b:]
    else:
        anchor = '<section class="blog-section"><h2>지금의 고민에서 시작해요</h2>'
        a = s.index(anchor)
        b = s.index('</section>', a) + len('</section>')
        s = s[:b] + '\n  ' + sec + s[b:]
    idx.write_text(s, encoding='utf-8')
    print('blog/index.html updated')
