#!/usr/bin/env python3
"""
16 MBTI × 사주 풀이 일괄 생성기
- 각 MBTI의 4축 본질을 사주의 일간(천간)·오행·십신과 매핑
- 가장 결이 잘 맞는 일간 1개 + 잘 맞는 보조 일간 3개 + 보완 필요 일간 1-2개
- 직업·강점·주의점·고전 인용을 일관 구조로 생성
"""
import os, json, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MBTI_DIR = os.path.join(ROOT, 'blog', 'mbti-saju')
SITEMAP_PATH = os.path.join(ROOT, 'sitemap.xml')
HUB_PATH = os.path.join(ROOT, 'blog', 'index.html')

os.makedirs(MBTI_DIR, exist_ok=True)

# ── 16 MBTI 메타 ──
# nick: 별명 / four: 4축 묘사 / best: 추천 일간 (이름) / besides: 잘 맞는 다른 일간
# notFit: 결이 다른 일간 / careerFit: 직업 / strength·caution: 강점·주의점 / cluster: 그룹(NT/NF/SJ/SP)
MBTI = [
  {'code':'INTJ','nick':'전략가','cluster':'NT 분석가',
   'four':'직관(N)·내향(I)·사고(T)·계획(J). 큰 그림을 미리 그리고 한 발씩 차분히 실행하는 전략적 사색가.',
   'best':'임수','best_nick':'큰 바다·강','best_oh':'수','best_why':'깊은 바다와 같이 큰 그림을 그리고 변화에 능합니다. INTJ의 전략적 통찰과 임수의 지혜가 같은 결로 흐르므로 본인 결대로 살 때 결실이 가장 큽니다.',
   'besides':[('계수','이슬비·옹달샘 — 깊은 분석과 통찰'),('신금','보석·예리한 칼 — 정밀한 사고'),('갑목','큰 나무 — 곧은 실행력')],
   'notFit':[('병화','태양처럼 외향적이고 발산적인 결 — INTJ의 내면과 다른 방향이라 사회적으로는 보이는 모습과 본질이 다른 결')],
   'careerFit':'전략 컨설팅·연구개발·법조·기획·시스템 아키텍트·투자 분석·정책 연구처럼 큰 그림을 그리고 한 발씩 실행하는 자리.',
   'strength':['장기 전략 수립과 한 길 가기','복잡한 시스템을 단순한 원리로 정리','독립적으로 깊이 들어가는 실행력','감정에 흔들리지 않는 결단'],
   'caution':['감정·관계 영역을 의식적으로 챙기기','너무 혼자 결정하지 말고 한 사람의 의견 듣기','완벽주의로 시작이 늦어지는 결 — 80%면 출발']
  },
  {'code':'INTP','nick':'논리술사','cluster':'NT 분석가',
   'four':'직관(N)·내향(I)·사고(T)·인식(P). 끝없이 분석하고 가설을 시험하며 본질을 파고드는 사색가.',
   'best':'계수','best_nick':'이슬비·옹달샘','best_oh':'수',
   'best_why':'맑은 옹달샘처럼 조용히 깊이 스며드는 결입니다. INTP의 분석·사색·자정의 결이 계수의 본질과 그대로 통하므로 본인의 호기심을 한 분야에 깊이 풀어낼 때 큰 결실이 옵니다.',
   'besides':[('임수','큰 바다·강 — 큰 그림과 기획'),('을목','풀잎·덩굴 — 유연한 가설 검증'),('정화','촛불·화롯불 — 섬세한 통찰')],
   'notFit':[('경금','강철처럼 결단·돌파의 결 — INTP의 끝없는 분석과 다른 방향. 결정 속도에 부담을 느낄 수 있음')],
   'careerFit':'연구원·이론가·작가·프로그래머·과학자·철학자·데이터 분석가처럼 본질을 파고들 시간이 충분한 자리.',
   'strength':['복잡한 문제의 본질 파악','독창적이고 창의적 사고','감정에 휘둘리지 않는 객관성','자율적 학습과 깊은 호기심'],
   'caution':['실행보다 분석이 길어지는 결 — 실험판이라도 빨리 만들기','감정적 관계 표현 의식적으로','시작한 일을 마무리하는 루틴 만들기']
  },
  {'code':'ENTJ','nick':'통솔자','cluster':'NT 분석가',
   'four':'직관(N)·외향(E)·사고(T)·계획(J). 큰 그림을 그리고 사람을 이끌어 결과를 만들어내는 타고난 리더.',
   'best':'갑목','best_nick':'큰 나무·기둥','best_oh':'목',
   'best_why':'하늘로 곧게 뻗은 큰 나무처럼 우직한 추진력과 리더십을 가진 결입니다. ENTJ의 결단력과 큰 그림이 갑목의 본질과 같은 방향이라 본인이 사람들 위에 자연스럽게 서는 자리에서 가장 빛납니다.',
   'besides':[('경금','바위·강철 — 결단과 돌파'),('병화','태양 — 호방한 리더십'),('무토','큰 산 — 신뢰의 중심')],
   'notFit':[('계수','이슬비처럼 겸손하고 조용한 결 — ENTJ의 통솔과 다른 방향. 자기 결을 죽이지 않으면서 부드러운 표현 방법을 익히는 게 도움')],
   'careerFit':'경영자·CEO·임원·창업가·정치인·군경 지휘관·프로젝트 리더처럼 사람을 이끌고 결과를 만들어내는 자리.',
   'strength':['장기 비전과 단기 실행을 함께 가져감','사람을 동원해 큰 그림을 실현','냉정한 의사결정과 책임감','조직의 비효율을 빠르게 정리'],
   'caution':['감정 표현과 경청 의식적으로','자기 페이스에 사람이 따라오지 못할 수 있음','너무 결과 중심이면 가까운 관계가 멀어짐']
  },
  {'code':'ENTP','nick':'변론가','cluster':'NT 분석가',
   'four':'직관(N)·외향(E)·사고(T)·인식(P). 끝없는 호기심과 토론으로 가능성의 영역을 넓혀가는 변론가.',
   'best':'병화','best_nick':'태양','best_oh':'화',
   'best_why':'하늘 위 태양처럼 밝고 호방하게 모든 가능성을 비추는 결입니다. ENTP의 외향적 직관과 토론의 결이 병화의 본질과 같은 방향이라 본인의 아이디어를 사람들 앞에 펼치는 자리에서 가장 빛납니다.',
   'besides':[('갑목','큰 나무 — 강한 추진력'),('임수','큰 바다 — 유연한 기획'),('정화','촛불 — 섬세한 통찰')],
   'notFit':[('기토','정원처럼 헌신·꼼꼼한 결 — ENTP의 자유로운 탐색과 다른 방향. 디테일·반복 작업이 지루할 수 있음')],
   'careerFit':'창업가·마케터·컨설턴트·강연가·콘텐츠 크리에이터·발명가·기획자처럼 새 가능성을 발견하고 사람들을 설득하는 자리.',
   'strength':['빠른 학습과 다재다능','새 가능성을 보는 직관','토론과 설득의 능력','복잡한 문제를 다양한 각도에서 풀기'],
   'caution':['시작한 일을 마무리하는 루틴','관심이 너무 다양해 한 분야 깊이 들어가지 못하는 결 — 한 가지에 1년 이상 머물기','감정적 충돌을 토론으로 해결하지 말기']
  },
  {'code':'INFJ','nick':'옹호자','cluster':'NF 외교관',
   'four':'직관(N)·내향(I)·감정(F)·계획(J). 사람의 내면을 깊이 보고 의미와 가치를 추구하며 조용히 한 길을 가는 결.',
   'best':'계수','best_nick':'이슬비·옹달샘','best_oh':'수',
   'best_why':'맑은 이슬비·옹달샘처럼 깨끗하고 겸손하며 조용히 스며드는 결입니다. INFJ의 깊은 직관과 감정·계획이 모두 계수의 본질과 같은 방향이라 본인의 깊이를 살릴 때 가장 큰 결실이 옵니다.',
   'besides':[('을목','풀잎·덩굴 — 유연한 사람 키움'),('정화','촛불 — 섬세한 감수성'),('임수','큰 바다 — 깊은 통찰과 기획')],
   'notFit':[('병화','태양처럼 외향적·확장적 결 — INFJ의 내향과 다른 방향. 사회적 모습과 진짜 결이 다를 수 있음')],
   'careerFit':'심리상담사·작가·교육자·연구원·NGO 활동가·정신과 의사·예술가·코치처럼 사람의 내면을 다루고 의미를 추구하는 자리.',
   'strength':['사람의 내면을 깊이 보는 직관','한 길을 묵묵히 가는 끈기','의미·가치를 명확히 추구','조용한 카리스마'],
   'caution':['완벽주의로 인한 번아웃 — 80%로 출발','감정을 혼자 안고 가지 말고 표현 통로 확보','옹호자 성품으로 사람을 너무 깊이 떠안지 말기']
  },
  {'code':'INFP','nick':'중재자','cluster':'NF 외교관',
   'four':'직관(N)·내향(I)·감정(F)·인식(P). 본인의 가치와 신념을 따라 살며 사람의 마음을 깊이 공감하는 이상주의자.',
   'best':'을목','best_nick':'풀잎·덩굴','best_oh':'목',
   'best_why':'바람에 휘어지는 풀잎처럼 부드럽지만 끈질기고 본인의 가치를 지키며 자라는 결입니다. INFP의 가치 중심·유연한 결이 을목의 본질과 같은 방향이라 본인의 결대로 살 때 가장 자연스럽고 결실이 큽니다.',
   'besides':[('정화','촛불·화롯불 — 섬세한 예술성'),('계수','이슬비·옹달샘 — 깊은 사색'),('기토','논밭·정원 — 헌신적 키움')],
   'notFit':[('경금','강철처럼 결단·돌파의 결 — INFP의 부드러움과 다른 방향. 빠른 결정·경쟁 환경에 스트레스')],
   'careerFit':'작가·예술가·심리상담사·교사·번역가·디자이너·NGO 활동가·콘텐츠 기획자처럼 본인의 가치와 창의를 살릴 수 있는 자리.',
   'strength':['깊은 공감 능력','독창적이고 예술적 표현','가치와 신념에 일관된 행동','조화롭게 사람을 이해'],
   'caution':['이상과 현실의 간극에서 좌절 — 작은 실천부터','지나친 자기 성찰로 행동이 늦어지는 결','거절을 못 해서 본인이 소진되는 결 — 한계 명확히']
  },
  {'code':'ENFJ','nick':'선도자','cluster':'NF 외교관',
   'four':'직관(N)·외향(E)·감정(F)·계획(J). 사람의 잠재력을 끌어내고 함께 성장하도록 이끄는 따뜻한 리더.',
   'best':'정화','best_nick':'촛불·화롯불','best_oh':'화',
   'best_why':'조용히 빛나는 촛불·화롯불처럼 따뜻하게 사람을 비추고 키우는 결입니다. ENFJ의 카리스마 있는 헌신과 정화의 본질이 같은 방향이라 사람을 이끌고 키우는 자리에서 가장 빛납니다.',
   'besides':[('갑목','큰 나무 — 곧은 비전'),('병화','태양 — 호방한 리더십'),('기토','정원 — 사람을 키움')],
   'notFit':[('신금','보석·예리한 칼 — 자기 자신에 집중하는 결. ENFJ의 사람 중심과 다른 방향. 너무 자기 페이스 우선이 아닌지 점검 필요')],
   'careerFit':'교사·교수·코치·HR·정치인·종교 지도자·기업 임원·복지·상담처럼 사람을 이끌고 키우는 자리.',
   'strength':['사람의 잠재력을 보는 안목','말과 글로 사람을 움직이는 능력','조직의 화합을 만들어가는 결','책임감과 헌신'],
   'caution':['모든 사람을 책임지려 하면 본인이 소진','갈등 회피로 문제가 곪는 결 — 직접 다루기','본인의 감정도 같은 무게로 챙기기']
  },
  {'code':'ENFP','nick':'활동가','cluster':'NF 외교관',
   'four':'직관(N)·외향(E)·감정(F)·인식(P). 새로운 가능성에 열린 호기심과 사람을 향한 따뜻한 에너지를 가진 활동가.',
   'best':'병화','best_nick':'태양','best_oh':'화',
   'best_why':'하늘 위 태양처럼 밝고 활달하며 사람과 가능성을 비추는 결입니다. ENFP의 외향적 직관과 따뜻한 에너지가 병화의 본질과 같은 방향이라 사람을 만나고 가능성을 펼치는 자리에서 가장 빛납니다.',
   'besides':[('갑목','큰 나무 — 곧은 추진력'),('을목','풀잎 — 유연한 적응'),('정화','촛불 — 섬세한 공감')],
   'notFit':[('무토','큰 산처럼 신중·중후한 결 — ENFP의 자유로움과 다른 방향. 너무 보수적·반복적인 환경이면 답답함')],
   'careerFit':'마케터·기획자·강연가·콘텐츠 크리에이터·교사·HR·창업가·이벤트 기획자처럼 사람과 가능성을 다루는 자리.',
   'strength':['타고난 사교성과 친화력','새 가능성을 보는 직관','사람을 격려하고 영감 주기','다양한 분야를 빠르게 학습'],
   'caution':['관심이 너무 분산 — 한 가지에 1년 이상 머물기','루틴·디테일이 약한 결 — 협업자로 보완','감정 기복이 클 수 있음 — 정기적 휴식']
  },
  {'code':'ISTJ','nick':'청렴결백','cluster':'SJ 관리자',
   'four':'감각(S)·내향(I)·사고(T)·계획(J). 사실과 책임에 충실하며 약속과 원칙을 지키는 신뢰의 결.',
   'best':'무토','best_nick':'큰 산·언덕','best_oh':'토',
   'best_why':'우뚝 솟은 큰 산·언덕처럼 듬직하고 신뢰감 있는 중심추 같은 결입니다. ISTJ의 책임감·원칙주의와 무토의 본질이 같은 방향이라 본인의 신뢰가 사회적 자산이 됩니다.',
   'besides':[('경금','바위·강철 — 결단과 의리'),('기토','논밭 — 꼼꼼한 헌신'),('신금','보석 — 정밀한 완성')],
   'notFit':[('병화','태양처럼 즉흥적·확장적 결 — ISTJ의 신중함과 다른 방향. 변화 빠른 환경에 부담')],
   'careerFit':'회계사·변호사·공무원·은행원·관리자·감사·법조·세무사·엔지니어처럼 정확함과 책임이 핵심인 자리.',
   'strength':['약속과 책임에 일관된 행동','정확하고 꼼꼼한 일처리','조직의 안정과 질서를 만드는 힘','장기적 헌신'],
   'caution':['변화를 두려워하지 말기 — 작은 실험은 위험이 적음','감정 표현 의식적으로','너무 원칙만 따져서 사람을 잃지 않기']
  },
  {'code':'ISFJ','nick':'수호자','cluster':'SJ 관리자',
   'four':'감각(S)·내향(I)·감정(F)·계획(J). 조용히 헌신하며 가까운 사람을 돌보는 따뜻한 수호자.',
   'best':'기토','best_nick':'논밭·정원','best_oh':'토',
   'best_why':'곡식이 자라는 논밭·정원처럼 부드럽고 헌신적이며 사람을 키우는 결입니다. ISFJ의 따뜻한 돌봄과 기토의 본질이 같은 방향이라 사람을 키우고 가꾸는 자리에서 가장 빛납니다.',
   'besides':[('을목','풀잎 — 부드러운 적응'),('정화','촛불 — 따뜻한 정성'),('계수','이슬비 — 조용한 스며듦')],
   'notFit':[('경금','강철처럼 결단의 결 — ISFJ의 부드러움과 다른 방향. 갈등이 잦은 환경에 스트레스')],
   'careerFit':'간호사·교사·사회복지사·상담사·요양·인사·도서관·교육 행정처럼 사람을 돌보고 키우는 자리.',
   'strength':['세심하고 따뜻한 돌봄','일관된 헌신과 책임감','관계의 안정을 만드는 힘','조용한 신뢰'],
   'caution':['거절을 못 해서 본인이 소진 — 한계 명확히','본인의 감정과 욕구도 표현하기','변화를 너무 두려워하지 말기']
  },
  {'code':'ESTJ','nick':'경영자','cluster':'SJ 관리자',
   'four':'감각(S)·외향(E)·사고(T)·계획(J). 조직과 시스템을 효율적으로 운영하며 결과를 만들어내는 경영자.',
   'best':'경금','best_nick':'바위·강철','best_oh':'금',
   'best_why':'단단한 바위·강철처럼 결단력 있고 의리 있으며 강한 추진력의 결입니다. ESTJ의 조직 운영과 결과 중심이 경금의 본질과 같은 방향이라 시스템과 조직을 이끄는 자리에서 가장 빛납니다.',
   'besides':[('갑목','큰 나무 — 리더십'),('무토','큰 산 — 안정의 중심'),('신금','보석 — 정밀한 운영')],
   'notFit':[('계수','이슬비처럼 겸손·내향의 결 — ESTJ의 외향·추진력과 다른 방향. 갈등 시 부드럽게 표현하는 연습 필요')],
   'careerFit':'경영자·임원·관리자·군경 지휘관·법조·정책·프로젝트 매니저·컨설턴트처럼 조직을 이끌고 결과를 만들어내는 자리.',
   'strength':['조직과 시스템의 효율성을 높이는 능력','결단력과 책임감','명확한 목표 설정과 실행','전통과 질서를 지키는 힘'],
   'caution':['감정·관계 영역을 의식적으로 챙기기','타인의 다른 방식을 인정','너무 결과 중심이면 사람이 떠나는 결']
  },
  {'code':'ESFJ','nick':'집정관','cluster':'SJ 관리자',
   'four':'감각(S)·외향(E)·감정(F)·계획(J). 사람과 조직의 화합을 만들어가며 함께 성장하도록 돕는 집정관.',
   'best':'기토','best_nick':'논밭·정원','best_oh':'토',
   'best_why':'곡식이 자라는 논밭·정원처럼 부드럽고 헌신적이며 사람을 키우는 결입니다. ESFJ의 따뜻한 사교성과 사람 중심이 기토의 본질과 같은 방향이라 사람을 모으고 키우는 자리에서 가장 빛납니다.',
   'besides':[('정화','촛불 — 따뜻한 사람 키움'),('을목','풀잎 — 부드러운 조화'),('무토','큰 산 — 신뢰의 중심')],
   'notFit':[('신금','보석처럼 자기 자신에 집중하는 결 — ESFJ의 사람 중심과 다른 방향. 너무 자기 페이스 우선이면 관계 마찰')],
   'careerFit':'교사·간호사·상담사·HR·이벤트 기획·행사·행정·서비스·복지·종교 활동처럼 사람을 모으고 돕는 자리.',
   'strength':['사람과 조직의 화합을 만드는 능력','세심한 배려와 따뜻함','약속과 의무에 일관된 행동','관계망 형성과 유지'],
   'caution':['모든 사람을 만족시키려 하면 본인이 소진','갈등 회피로 문제가 곪지 않게 직접 다루기','본인의 욕구도 동등하게 챙기기']
  },
  {'code':'ISTP','nick':'장인','cluster':'SP 탐험가',
   'four':'감각(S)·내향(I)·사고(T)·인식(P). 손과 머리로 직접 만지고 분석하며 본질을 파악하는 실용적 장인.',
   'best':'신금','best_nick':'보석·예리한 칼','best_oh':'금',
   'best_why':'잘 다듬어진 보석과 예리한 칼날처럼 섬세하고 정밀한 결입니다. ISTP의 손재주·분석력·자율성이 신금의 본질과 같은 방향이라 한 분야의 장인이 되는 자리에서 가장 빛납니다.',
   'besides':[('경금','강철 — 결단과 돌파'),('갑목','큰 나무 — 곧은 실행'),('계수','이슬비 — 조용한 분석')],
   'notFit':[('정화','촛불처럼 정성·헌신의 결 — ISTP의 자율과 다른 방향. 너무 사람 중심 환경이면 부담')],
   'careerFit':'엔지니어·기술자·외과의사·파일럿·소방관·운동선수·디자이너·셰프·정비사처럼 손과 머리로 결과를 만드는 자리.',
   'strength':['실용적이고 빠른 문제 해결','위기 상황에서 침착한 대응','손재주와 정밀함','자율적 학습과 실험'],
   'caution':['장기 계획·관계 영역 의식적으로','감정 표현이 적어 가까운 사람이 거리감을 느끼는 결','시작한 일을 마무리하는 루틴']
  },
  {'code':'ISFP','nick':'모험가','cluster':'SP 탐험가',
   'four':'감각(S)·내향(I)·감정(F)·인식(P). 본인의 감각과 가치를 따라 자유롭게 살며 아름다움을 추구하는 예술가.',
   'best':'을목','best_nick':'풀잎·덩굴','best_oh':'목',
   'best_why':'바람에 휘어지는 풀잎처럼 부드럽고 유연하며 본인의 결대로 자라는 결입니다. ISFP의 예술적 감수성과 자율적 결이 을목의 본질과 같은 방향이라 본인의 결대로 살 때 가장 자연스럽습니다.',
   'besides':[('정화','촛불 — 섬세한 예술성'),('계수','이슬비 — 깊은 감수성'),('기토','정원 — 부드러운 헌신')],
   'notFit':[('경금','강철처럼 결단·돌파의 결 — ISFP의 부드러움과 다른 방향. 빠른 결정·경쟁 환경에 스트레스')],
   'careerFit':'예술가·디자이너·사진작가·요리사·플로리스트·뮤지션·작가·치료사·동물 관련처럼 본인의 감각·미감을 살리는 자리.',
   'strength':['뛰어난 미적 감각','조용히 본인의 결대로 사는 힘','사람을 부드럽게 대하는 따뜻함','일상의 작은 아름다움을 발견'],
   'caution':['장기 계획이 약한 결 — 작게라도 목표 설정','갈등을 회피해 누적되는 결 — 작은 표현 자주','자기 능력 과소평가하지 말기']
  },
  {'code':'ESTP','nick':'사업가','cluster':'SP 탐험가',
   'four':'감각(S)·외향(E)·사고(T)·인식(P). 현장에서 빠르게 행동하고 결과를 만들어내는 활동적 사업가.',
   'best':'경금','best_nick':'바위·강철','best_oh':'금',
   'best_why':'단단한 바위·강철처럼 결단력 있고 강한 추진력의 결입니다. ESTP의 행동력·결과 중심이 경금의 본질과 같은 방향이라 현장에서 빠르게 움직이는 자리에서 가장 빛납니다.',
   'besides':[('병화','태양 — 호방한 활동'),('갑목','큰 나무 — 곧은 추진'),('무토','큰 산 — 신뢰의 중심')],
   'notFit':[('계수','이슬비처럼 조용한 사색의 결 — ESTP의 행동과 다른 방향. 분석만 길어지면 답답함')],
   'careerFit':'영업·창업가·세일즈·운동선수·소방·경찰·트레이더·이벤트 기획·자영업처럼 현장에서 빠르게 결과를 만드는 자리.',
   'strength':['빠른 의사결정과 행동력','위기 상황 대응 능력','사람을 끌어들이는 활달함','현장 감각과 실용성'],
   'caution':['장기 계획·디테일 의식적으로 챙기기','감정·관계 영역에 시간을 더 쏟기','너무 빠른 결정으로 큰 손실을 부르지 않게 한 박자 살피기']
  },
  {'code':'ESFP','nick':'연예인','cluster':'SP 탐험가',
   'four':'감각(S)·외향(E)·감정(F)·인식(P). 사람과 함께 즐기며 지금 이 순간의 아름다움을 누리는 연예인.',
   'best':'병화','best_nick':'태양','best_oh':'화',
   'best_why':'하늘 위 태양처럼 밝고 활달하며 모든 곳을 비추는 결입니다. ESFP의 사교성과 즉흥적 표현이 병화의 본질과 같은 방향이라 사람들과 함께 빛나는 자리에서 가장 본인답습니다.',
   'besides':[('정화','촛불 — 따뜻한 사람 매혹'),('을목','풀잎 — 부드러운 적응'),('기토','정원 — 사람을 모음')],
   'notFit':[('신금','보석처럼 정밀·자기 중심의 결 — ESFP의 사교와 다른 방향. 혼자 깊이 들어가는 환경엔 답답함')],
   'careerFit':'연예인·MC·유튜버·이벤트 기획·이미지 컨설턴트·뷰티·서비스·교사·플로리스트·관광 가이드처럼 사람과 함께 빛나는 자리.',
   'strength':['타고난 사교성과 매력','순간의 분위기를 만드는 힘','사람을 즐겁게 하는 따뜻함','일상의 아름다움을 누리는 결'],
   'caution':['장기 계획·재정 관리 의식적으로','감정 기복이 클 수 있음 — 정기적 휴식','진중한 결정은 한 박자 살피기']
  },
]

CLASSIC_QUOTES = [
  '「적천수(滴天髓)」 — 順其氣勢 則吉, 逆其氣勢 則凶 (그 기세를 따르면 길하고, 거스르면 흉하다)',
  '「궁통보감(窮通寶鑑)」 — 用神得力 一生富貴 (용신이 힘을 얻으면 평생이 부귀롭다)',
  '「자평진전(子平眞詮)」 — 體用不離 動靜相成 (체와 용은 분리되지 않고 동과 정은 서로 이룬다)',
  '「연해자평(淵海子平)」 — 일주가 강건하면 능히 재관(財官)을 감당한다',
  '「궁통보감」 — 寒暖燥濕 各有其時 (춥고 따뜻하고 마르고 습한 것이 모두 때가 있다)',
  '「적천수」 — 中和爲貴 (중화함이 귀하다)'
]

# 4축 매핑 표 (모든 글에 동일)
AXIS_TABLE = '''<table>
  <thead><tr><th>MBTI 축</th><th>본 유형 방향</th><th>사주 대응 결</th></tr></thead>
  <tbody>
    <tr><td>I 내향 vs E 외향</td><td>{ie}</td><td>{ie_saju}</td></tr>
    <tr><td>N 직관 vs S 감각</td><td>{ns}</td><td>{ns_saju}</td></tr>
    <tr><td>T 사고 vs F 감정</td><td>{tf}</td><td>{tf_saju}</td></tr>
    <tr><td>J 계획 vs P 인식</td><td>{jp}</td><td>{jp_saju}</td></tr>
  </tbody>
</table>'''

AXIS_DESC = {
  'I':('I 내향','음(陰) 일간 — 을·정·기·신·계 / 음 지지 — 자·해·축'),
  'E':('E 외향','양(陽) 일간 — 갑·병·무·경·임 / 양 지지 — 인·사·오·신'),
  'N':('N 직관','목(木)·수(水) 기운 / 인성·식상이 강한 결'),
  'S':('S 감각','토(土)·금(金) 기운 / 정관·정재가 강한 결'),
  'T':('T 사고','금(金) 기운 / 편관·정관이 강한 결'),
  'F':('F 감정','수(水)·화(火) 기운 / 식상·인성이 강한 결'),
  'J':('J 계획','토(土)·금(金) 기운 / 정관·정인이 강한 결'),
  'P':('P 인식','목(木)·수(水) 기운 / 편재·식신이 강한 결'),
}

TEMPLATE = """<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>{code} 사주 — {nick}와 가장 잘 맞는 일간 분석 | 천지인 사주</title>
<meta name="description" content="{code}({nick})의 4축 본질을 사주의 일간·오행·십신과 매핑해 가장 잘 맞는 일간을 풀이. {best} 일간 추천과 직업·강점·주의점까지.">
<meta name="keywords" content="{code} 사주, {code} 일간, {code} {nick}, MBTI 사주, {code} 성격, {code} 직업, 사주 MBTI">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://saju-mbti-9h1.pages.dev/blog/mbti-saju/{slug}.html">

<meta property="og:type" content="article">
<meta property="og:site_name" content="천지인 사주">
<meta property="og:title" content="{code} 사주 — {nick}와 가장 잘 맞는 일간 분석">
<meta property="og:description" content="{code}의 4축 결이 사주에서는 어느 일간과 가장 잘 어울리는가.">
<meta property="og:url" content="https://saju-mbti-9h1.pages.dev/blog/mbti-saju/{slug}.html">
<meta property="og:locale" content="ko_KR">
<meta name="theme-color" content="#0e1428">

<!-- Google AdSense -->
<meta name="google-adsense-account" content="ca-pub-9194151925851653">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9194151925851653" crossorigin="anonymous"></script>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Do+Hyeon&family=Noto+Serif+KR:wght@500;700&family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/blog/blog.css">

<script type="application/ld+json">
{jsonld}
</script>
</head>
<body>

<nav class="blog-nav" aria-label="블로그 네비게이션">
  <div class="blog-shell">
    <a href="/blog/" class="blog-brand"><span class="blog-brand-mark" aria-hidden="true">☯︎</span><span>천지인 사주 가이드</span></a>
    <a href="/" class="blog-cta">내 사주 보기</a>
  </div>
</nav>

<article class="blog-article">
  <header class="blog-article-head">
    <div class="blog-article-cat">MBTI × 사주 · {cluster}</div>
    <h1>{code} 사주 — {nick}와 가장 잘 맞는 일간 분석</h1>
    <div class="blog-article-meta">
      <time datetime="2026-05-10">2026년 5월 10일</time>
      <span class="dot">·</span>
      <span>읽는 시간 약 6분</span>
    </div>
  </header>

  <div class="blog-article-body">
    <p>{code}는 16가지 MBTI 중 <em>{nick}</em>로 불리는 유형입니다. {four} 이 결을 사주 명리학의 일간(日干)·오행·십신(十神) 관점에서 풀어보면 본인의 결을 어떤 일간이 가장 잘 담아내는지 또렷이 보입니다.</p>

    <h2>{code}의 4축을 사주의 결로 옮기면</h2>
    <p>MBTI는 「현재의 인지·행동 패턴」을 4축으로 본 모델, 사주는 「태어날 때 받은 천문 기운」을 8글자로 본 시스템입니다. 둘은 다른 모델이지만 결이 통하는 부분이 많습니다.</p>
    {axis_table}

    <h2>{code}와 가장 결이 잘 맞는 일간 — {best}({best_oh})</h2>
    <p>{code}의 4축 결을 가장 정직하게 담아낸 일간은 <b>{best}({best_oh})</b>입니다. 「<em>{best_nick}</em>」의 결을 가진 {best}는 다음 본질을 가집니다.</p>
    <p>{best_why}</p>
    <p>{best} 일간을 가진 {code}는 「<b>본인의 결과 사주의 결이 같은 방향으로 흐르는 분</b>」입니다. 본인이 느끼는 자기다움과 사주가 보여주는 결이 일치하므로 자기 결을 따라 살 때 가장 큰 결실이 옵니다.</p>

    <h2>{code}와 결이 잘 맞는 다른 일간</h2>
    <p>{best} 외에도 {code}의 결과 잘 어울리는 일간이 있습니다.</p>
    <ul>
      {besides_html}
    </ul>

    <h2>{code}와 결이 다른 일간 — 보완이 필요한 자리</h2>
    <p>반대로 다음 일간을 가진 {code}는 본인의 사주 결과 MBTI 결이 다르게 흐르는 분입니다. 흉이 아니라 「<em>본인이 두 가지 결을 함께 살아가는 분</em>」이라는 뜻입니다.</p>
    <ul>
      {notfit_html}
    </ul>
    <p>이런 분들은 「본인이 느끼는 자기」와 「세상이 보는 자기」가 다른 결을 가집니다. 본인의 진짜 결({code})을 인정해주는 사람과 깊이 있는 관계를 가지는 게 매우 중요합니다.</p>

    <h2>{code} 사주의 직업 결</h2>
    <p>{careerFit}</p>

    <h2>{code} 사주의 강점 살리기</h2>
    <ul>
      {strength_html}
    </ul>

    <h2>{code} 사주가 주의해야 할 결</h2>
    <ul>
      {caution_html}
    </ul>

    <blockquote>{quote}</blockquote>

    <p>본인의 일간이 무엇인지, {code} 결과 어떻게 만나는지 직접 확인해보고 싶다면 아래에서 사주를 풀어보세요. MBTI를 함께 입력하시면 「본인 일주 × {code} — 닮음 점수」와 잘 맞는 영역·보완 영역까지 자동으로 풀어드립니다.</p>

    <div class="article-cta">
      <div class="article-cta-title">☯︎ 내 일주 × {code} 매칭 보기</div>
      <div class="article-cta-desc">생년월일과 MBTI를 함께 입력하시면 일주와 MBTI의 결이<br>몇 % 닮았는지, 어느 영역이 잘 맞는지 한 줄 풀이로 보여드립니다.</div>
      <a href="/?utm_source=blog&utm_medium=cta&utm_campaign=mbti-{slug}" class="article-cta-btn">내 사주 × MBTI 보기 →</a>
    </div>

    <div class="related">
      <h3>📖 함께 읽으면 좋은 글</h3>
      <div class="blog-grid">
        <a href="/blog/basics/saju-basics.html" class="blog-card">
          <div class="card-tag">사주 기초</div>
          <h3>사주 보는 법 — 사주팔자 8글자의 의미</h3>
          <p>일간·일지의 의미를 처음부터 차근히</p>
        </a>
        <a href="/blog/ilju-list/gapja.html" class="blog-card">
          <div class="card-tag">60갑자 일주</div>
          <h3>갑자(甲子)일주 — 60갑자의 시작</h3>
          <p>「큰 나무」 갑목 + 「깊은 물」 자수가 만난 일주의 결</p>
        </a>
      </div>
    </div>
  </div>
</article>

<footer class="blog-foot">
  <div>☯︎ 천지인 사주 — 만세력 기반 사주팔자 × MBTI 통합 분석</div>
  <div style="margin-top:8px"><a href="/">사주 분석 도구</a> · <a href="/blog/">가이드 모음</a></div>
</footer>

</body>
</html>
"""

def build_axis_table(code):
  ie = 'I' if 'I' in code else 'E'
  ns = 'N' if 'N' in code else 'S'
  tf = 'T' if 'T' in code else 'F'
  jp = 'J' if 'J' in code else 'P'
  return AXIS_TABLE.format(
    ie=f'<b>{AXIS_DESC[ie][0]}</b>', ie_saju=AXIS_DESC[ie][1],
    ns=f'<b>{AXIS_DESC[ns][0]}</b>', ns_saju=AXIS_DESC[ns][1],
    tf=f'<b>{AXIS_DESC[tf][0]}</b>', tf_saju=AXIS_DESC[tf][1],
    jp=f'<b>{AXIS_DESC[jp][0]}</b>', jp_saju=AXIS_DESC[jp][1],
  )

def make_post(idx, m):
  besides_html = '\n      '.join([f'<li><b>{stem}</b> — 「{desc.split(" — ")[0]}」. {desc.split(" — ")[1] if " — " in desc else ""}</li>' for stem, desc in m['besides']])
  notfit_html = '\n      '.join([f'<li><b>{stem}</b> — {desc}</li>' for stem, desc in m['notFit']])
  strength_html = '\n      '.join([f'<li>{s}</li>' for s in m['strength']])
  caution_html = '\n      '.join([f'<li>{c}</li>' for c in m['caution']])

  jsonld = json.dumps({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": f"{m['code']} 사주 — {m['nick']}와 가장 잘 맞는 일간 분석",
    "description": f"{m['code']}의 4축 결이 사주에서는 어느 일간과 가장 잘 어울리는가.",
    "datePublished": "2026-05-10",
    "dateModified": "2026-05-10",
    "author": {"@type":"Organization","name":"천지인 사주"},
    "publisher": {"@type":"Organization","name":"천지인 사주","url":"https://saju-mbti-9h1.pages.dev/"},
    "mainEntityOfPage": f"https://saju-mbti-9h1.pages.dev/blog/mbti-saju/{m['code'].lower()}.html",
    "inLanguage": "ko",
    "articleSection": "MBTI × 사주"
  }, ensure_ascii=False, indent=2)

  ctx = {
    'code': m['code'],
    'slug': m['code'].lower(),
    'nick': m['nick'],
    'cluster': m['cluster'],
    'four': m['four'],
    'best': m['best'],
    'best_nick': m['best_nick'],
    'best_oh': m['best_oh'],
    'best_why': m['best_why'],
    'besides_html': besides_html,
    'notfit_html': notfit_html,
    'strength_html': strength_html,
    'caution_html': caution_html,
    'careerFit': m['careerFit'],
    'axis_table': build_axis_table(m['code']),
    'quote': CLASSIC_QUOTES[idx % len(CLASSIC_QUOTES)],
    'jsonld': jsonld,
  }
  return TEMPLATE.format(**ctx)

# ── 16편 생성 ──
generated = []
for i, m in enumerate(MBTI):
  fname = f"{m['code'].lower()}.html"
  fpath = os.path.join(MBTI_DIR, fname)
  with open(fpath, 'w', encoding='utf-8') as f:
    f.write(make_post(i, m))
  generated.append(m['code'])

print(f'생성 완료: {len(generated)}편')
for c in generated[:5]:
  print(f'  {c}')
print('  ...')

# ── sitemap.xml 업데이트 (60갑자 + 16 MBTI 포함 재구성) ──
# 기존 sitemap에서 mbti-saju URL이 infj 1개만 있으므로, MBTI 16개로 확장
with open(SITEMAP_PATH, 'r', encoding='utf-8') as f:
  sm = f.read()

# 기존 infj URL 블록 위치 찾고, 그 자리에 16개를 모두 채워넣음
# 패턴: <url>...mbti-saju/infj.html...</url> 한 블록을 찾아 16개로 교체
mbti_url_block = ''
for m in MBTI:
  mbti_url_block += f'  <url>\n    <loc>https://saju-mbti-9h1.pages.dev/blog/mbti-saju/{m["code"].lower()}.html</loc>\n    <lastmod>2026-05-10</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n'

# 기존 infj 블록 제거 (있으면)
sm_new = re.sub(
  r'  <url>\s*<loc>https://saju-mbti-9h1\.pages\.dev/blog/mbti-saju/infj\.html</loc>[\s\S]*?</url>\s*\n',
  '', sm
)
# 닫는 </urlset> 직전에 16개 모두 삽입
sm_new = sm_new.replace('</urlset>', mbti_url_block + '</urlset>')
with open(SITEMAP_PATH, 'w', encoding='utf-8') as f:
  f.write(sm_new)
print(f'sitemap.xml 업데이트 — MBTI URL 16개 반영')

# ── 블로그 허브 (blog/index.html)의 MBTI 섹션 교체 ──
with open(HUB_PATH, 'r', encoding='utf-8') as f:
  hub = f.read()

mbti_grid_lines = []
for m in MBTI:
  slug = m['code'].lower()
  mbti_grid_lines.append(f'''      <a href="/blog/mbti-saju/{slug}.html" class="blog-card">
        <div class="card-tag">MBTI · {m['code']}</div>
        <h3>{m['code']} 사주 — {m['nick']}</h3>
        <p>{m['best']}({m['best_oh']}) 일간과 가장 잘 맞는 결</p>
      </a>''')

mbti_grid = '\n'.join(mbti_grid_lines)

# MBTI 섹션 패턴 — 기존 4개 카드를 16개로 교체
pattern = re.compile(
  r'(<section class="blog-section">\s*<h2>☯︎ MBTI × 사주</h2>.*?<div class="blog-grid">)([\s\S]*?)(</div>\s*</section>)',
  re.DOTALL
)
m_mbti = pattern.search(hub)
if m_mbti:
  new_hub = hub[:m_mbti.start(2)] + '\n' + mbti_grid + '\n    ' + hub[m_mbti.end(2):]
  with open(HUB_PATH, 'w', encoding='utf-8') as f:
    f.write(new_hub)
  print('blog/index.html MBTI 그리드 교체 완료')
else:
  print('!! MBTI 섹션 패턴을 찾지 못함')
