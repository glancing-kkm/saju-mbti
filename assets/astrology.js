// Astrology feature: chart calculations use Astronomy Engine only.
const ASTRO_FLOW_KEY='astrology_flow_v1';
const ASTRO_HISTORY_KEY='astrology_history_v1';
const ASTRO_PRODUCTS=[
  {id:'birth-basic',name:'출생차트 기본 분석',price:5900,desc:'성격, 기질, 감정 패턴을 중심으로 보는 기본 리딩'},
  {id:'love-marriage',name:'연애/결혼운',price:5900,desc:'금성, 화성, 달, 7하우스 흐름을 중심으로 보는 관계 리딩'},
  {id:'career-money',name:'직업/재물운',price:5900,desc:'태양, 수성, 목성, 토성, 2·10하우스 흐름을 보는 현실 리딩'},
  {id:'yearly',name:'올해 운세',price:7900,desc:'현재 트랜짓과 출생차트의 주요 각도를 보는 연간 리딩'},
  {id:'full-report',name:'종합 점성술 리포트',price:12900,desc:'출생차트와 현재 운을 종합해 깊게 보는 프리미엄 리포트'}
];
const ASTRO_CITIES=[
  {country:'대한민국',city:'서울',lat:37.5665,lon:126.9780,tz:'Asia/Seoul'},
  {country:'대한민국',city:'부산',lat:35.1796,lon:129.0756,tz:'Asia/Seoul'},
  {country:'대한민국',city:'대구',lat:35.8714,lon:128.6014,tz:'Asia/Seoul'},
  {country:'대한민국',city:'인천',lat:37.4563,lon:126.7052,tz:'Asia/Seoul'},
  {country:'대한민국',city:'광주',lat:35.1595,lon:126.8526,tz:'Asia/Seoul'},
  {country:'대한민국',city:'대전',lat:36.3504,lon:127.3845,tz:'Asia/Seoul'},
  {country:'대한민국',city:'제주',lat:33.4996,lon:126.5312,tz:'Asia/Seoul'},
  {country:'일본',city:'도쿄',lat:35.6762,lon:139.6503,tz:'Asia/Tokyo'},
  {country:'일본',city:'오사카',lat:34.6937,lon:135.5023,tz:'Asia/Tokyo'},
  {country:'중국',city:'베이징',lat:39.9042,lon:116.4074,tz:'Asia/Shanghai'},
  {country:'중국',city:'상하이',lat:31.2304,lon:121.4737,tz:'Asia/Shanghai'},
  {country:'미국',city:'뉴욕',lat:40.7128,lon:-74.0060,tz:'America/New_York'},
  {country:'미국',city:'로스앤젤레스',lat:34.0522,lon:-118.2437,tz:'America/Los_Angeles'},
  {country:'미국',city:'시카고',lat:41.8781,lon:-87.6298,tz:'America/Chicago'},
  {country:'영국',city:'런던',lat:51.5072,lon:-0.1276,tz:'Europe/London'},
  {country:'프랑스',city:'파리',lat:48.8566,lon:2.3522,tz:'Europe/Paris'},
  {country:'독일',city:'베를린',lat:52.5200,lon:13.4050,tz:'Europe/Berlin'},
  {country:'호주',city:'시드니',lat:-33.8688,lon:151.2093,tz:'Australia/Sydney'}
];
const ZODIAC_SIGNS=[
  ['aries','양자리','Aries','fire','cardinal',['시작','용기','직진'],'먼저 움직이고 길을 여는 성향이 강해요.','솔직하고 빠르게 마음을 표현해요.','기회를 보면 과감히 쓰지만 충동 지출은 조심해야 해요.','주도권과 실행력이 필요한 일에 강해요.','성급함이 흐름을 흔들 수 있어요.'],
  ['taurus','황소자리','Taurus','earth','fixed',['안정','감각','꾸준함'],'천천히 쌓고 오래 지키는 힘이 있어요.','신뢰와 편안함을 중요하게 봐요.','안정적인 자산과 실물 감각이 좋아요.','꾸준한 성과와 품질이 중요한 일에 맞아요.','고집이 강해질 때 변화가 늦어질 수 있어요.'],
  ['gemini','쌍둥이자리','Gemini','air','mutable',['대화','호기심','정보'],'생각이 빠르고 여러 가능성을 동시에 봐요.','말과 교류에서 호감이 생겨요.','정보를 잘 쓰면 수입 기회가 열려요.','커뮤니케이션과 기획에 강해요.','산만함 때문에 마무리가 약해질 수 있어요.'],
  ['cancer','게자리','Cancer','water','cardinal',['보호','감정','가족'],'감정의 온도와 안정감을 중요하게 느껴요.','정서적 안전감이 사랑의 기준이에요.','가족, 집, 생활 안정과 연결된 돈에 민감해요.','돌봄, 관리, 기억력이 필요한 일에 강해요.','상처를 오래 품지 않도록 조심해야 해요.'],
  ['leo','사자자리','Leo','fire','fixed',['표현','자존감','창조'],'자신의 존재감을 건강하게 드러낼 때 빛나요.','따뜻하고 당당한 애정 표현을 원해요.','즐거움과 품격을 위해 쓰는 돈이 많아질 수 있어요.','리더십, 창작, 무대성이 있는 일에 맞아요.','인정 욕구가 과해지면 관계가 피곤해질 수 있어요.'],
  ['virgo','처녀자리','Virgo','earth','mutable',['분석','정리','실용'],'디테일을 보고 현실적으로 개선하는 힘이 있어요.','세심한 배려로 마음을 표현해요.','계획, 기록, 관리로 돈을 지키는 편이에요.','분석, 실무, 관리 능력이 필요한 일에 강해요.','완벽주의가 본인을 지치게 할 수 있어요.'],
  ['libra','천칭자리','Libra','air','cardinal',['균형','관계','미감'],'사람 사이의 조화와 균형을 잘 읽어요.','관계의 예의와 분위기를 중요하게 봐요.','취향과 네트워크가 돈의 흐름과 연결돼요.','협상, 디자인, 상담, 연결하는 일에 맞아요.','결정을 미루다 기회를 놓치지 않게 조심하세요.'],
  ['scorpio','전갈자리','Scorpio','water','fixed',['몰입','깊이','변화'],'겉보다 속을 보고 깊게 파고드는 힘이 있어요.','가볍지 않은 진정성과 신뢰를 원해요.','공동재산, 투자, 장기 흐름에 관심이 생겨요.','조사, 심리, 위기관리, 전문 분야에 강해요.','집착과 의심이 커지면 스스로 힘들어질 수 있어요.'],
  ['sagittarius','사수자리','Sagittarius','fire','mutable',['확장','자유','철학'],'넓은 세계와 가능성을 향해 움직이는 성향이에요.','자유로운 대화와 함께 성장하는 관계를 좋아해요.','배움, 여행, 확장에 돈을 쓰기 쉬워요.','교육, 해외, 콘텐츠, 탐구에 강해요.','낙관만으로 약속을 크게 잡지 않게 조심하세요.'],
  ['capricorn','염소자리','Capricorn','earth','cardinal',['책임','목표','성취'],'시간을 들여 결과를 만드는 현실 감각이 강해요.','가벼운 말보다 책임 있는 태도를 봐요.','장기 계획과 절제가 재물 흐름을 안정시켜요.','조직, 경영, 전문성과 성취가 중요한 일에 맞아요.','스스로를 너무 몰아붙이지 않는 균형이 필요해요.'],
  ['aquarius','물병자리','Aquarius','air','fixed',['독립','혁신','네트워크'],'다른 관점으로 미래를 상상하는 힘이 있어요.','친구 같은 관계와 독립성을 중요하게 봐요.','기술, 커뮤니티, 새로운 시장과 돈이 연결돼요.','기획, 기술, 사회적 네트워크에 강해요.','감정 표현이 너무 멀게 느껴지지 않게 조심하세요.'],
  ['pisces','물고기자리','Pisces','water','mutable',['공감','직관','상상'],'감수성과 직관으로 흐름을 읽는 성향이에요.','말보다 분위기와 마음의 울림을 크게 느껴요.','감정 소비와 경계 없는 지출을 조심해야 해요.','예술, 치유, 상상력, 봉사 분야에 강해요.','현실 경계가 흐려질 때 손해를 볼 수 있어요.']
].map(([id,nameKo,nameEn,element,modality,keywords,personality,loveStyle,moneyStyle,careerStyle,caution])=>({id,nameKo,nameEn,element,modality,keywords,personality,loveStyle,moneyStyle,careerStyle,caution}));
const PLANET_MEANINGS=[
  ['sun','태양','Sun','자아, 정체성, 삶의 방향'],['moon','달','Moon','감정, 본능, 안정감'],['mercury','수성','Mercury','생각, 말, 커뮤니케이션'],['venus','금성','Venus','사랑, 매력, 취향, 관계'],['mars','화성','Mars','행동력, 욕망, 추진력'],['jupiter','목성','Jupiter','성장, 확장, 행운'],['saturn','토성','Saturn','책임, 제한, 시험, 성숙'],['uranus','천왕성','Uranus','변화, 독립, 혁신'],['neptune','해왕성','Neptune','이상, 직관, 환상'],['pluto','명왕성','Pluto','깊은 변화, 집착, 재탄생']
].map(([id,nameKo,nameEn,represents])=>({id,nameKo,nameEn,represents}));
let _astroRoute='home';
let _astroFlow=loadAstrologyFlow();

function astroEsc(v){return typeof tarotEsc==='function'?tarotEsc(v):String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
function astroSetHeader(title,sub){const t=document.getElementById('astroHdrTitle'),s=document.getElementById('astroHdrSub');if(t)t.textContent=title;if(s)s.textContent=sub||'';}
function goToAstrology(route='home'){_astroRoute=route;showView('astrology');renderAstrology();}
function astrologyBack(){if(['home','today','input','natal','natalInput','result','history'].includes(_astroRoute))return goHome();const b={natalResult:'natal',summary:'input',products:'summary',payment:'products'};_astroRoute=b[_astroRoute]||'home';renderAstrology();}
function astroNavigate(route){_astroRoute=route;renderAstrology();}
function astroRoot(){return document.getElementById('astroApp');}
function renderAstrology(){const root=astroRoot();if(!root)return;({home:renderAstrologyHome,today:renderTodayAstrology,natal:renderNatalChartPage,natalInput:renderNatalChartInput,natalResult:renderNatalChartResult,input:renderAstrologyInput,summary:renderAstrologySummary,products:renderAstrologyProducts,payment:renderAstrologyPayment,result:renderAstrologyResult,history:renderAstrologyHistory}[_astroRoute]||renderAstrologyHome)(root);window.scrollTo(0,0);}

function renderAstrologyHome(root){
  astroSetHeader('점성술','출생차트와 오늘의 행성 흐름');
  root.innerHTML=`<section class="astro-hero"><div class="astro-kicker">Astrology</div><div class="astro-title">정확한 계산으로 차트를 먼저 세워요</div><div class="astro-desc">행성 위치는 AI가 만들지 않고 천문 계산 엔진으로 계산합니다. 무료 오늘의 점성술은 API 없이, 유료 리딩만 계산 데이터를 바탕으로 AI가 해석해요.</div></section>
  <div class="astro-menu">
    <button class="astro-card" onclick="astroNavigate('today')"><span class="material-symbols-outlined astro-icon">today</span><div class="astro-section-title">오늘의 점성술</div><div class="astro-text">출생 태양·달·상승궁과 오늘의 트랜짓을 가볍게 확인해요.</div><span class="astro-badge">무료</span></button>
    <button class="astro-card" onclick="astroNavigate('natal')"><span class="material-symbols-outlined astro-icon">donut_large</span><div class="astro-section-title">내 출생차트</div><div class="astro-text">사주의 만세력처럼 행성·별자리·하우스·애스펙트를 무료 계산표로 확인해요.</div><span class="astro-badge">무료</span></button>
    <button class="astro-card" onclick="astroNavigate('input')"><span class="material-symbols-outlined astro-icon">orbit</span><div class="astro-section-title">점성술</div><div class="astro-text">출생차트를 계산한 뒤 유료 상품별 상세 리포트를 받아요.</div><span class="astro-badge">5,900원부터</span></button>
    <button class="astro-card" onclick="astroNavigate('history')"><span class="material-symbols-outlined astro-icon">history</span><div class="astro-section-title">점성술 히스토리</div><div class="astro-text">저장된 유료 리딩을 다시 확인해요.</div></button>
  </div>`;
}
function renderTodayAstrology(root){renderAstrologyInput(root,true);}
function renderAstrologyInput(root,todayOnly=false,natalOnly=false){
  astroSetHeader(todayOnly?'오늘의 점성술':natalOnly?'출생차트':'출생정보 입력',todayOnly?'무료 계산 리딩':natalOnly?'무료 네이탈 차트':'정확한 차트 계산을 위한 정보');
  const saved=(_astroFlow&&_astroFlow.birthInfo)||{};
  root.innerHTML=`<section class="astro-hero"><div class="astro-kicker">${todayOnly?'Today Transit':'Birth Chart'}</div><div class="astro-title">${todayOnly?'오늘의 별 흐름을 계산해요':natalOnly?'내 출생차트를 계산해요':'출생차트를 계산해요'}</div><div class="astro-desc">도시의 위도·경도와 과거 타임존/DST를 반영해 UTC로 변환한 뒤 행성 위치를 계산합니다.</div></section>
  <section class="astro-panel"><div class="astro-form">
    <div class="astro-row"><div class="astro-field"><label>출생 연도</label><input class="astro-input" id="astroYear" inputmode="numeric" value="${astroEsc(saved.year||'')}" placeholder="1995"></div><div class="astro-field"><label>출생 월</label><input class="astro-input" id="astroMonth" inputmode="numeric" value="${astroEsc(saved.month||'')}" placeholder="7"></div></div>
    <div class="astro-row"><div class="astro-field"><label>출생 일</label><input class="astro-input" id="astroDay" inputmode="numeric" value="${astroEsc(saved.day||'')}" placeholder="15"></div><div class="astro-field"><label>출생 국가</label><input class="astro-input" id="astroCountry" value="${astroEsc(saved.country||'대한민국')}" placeholder="대한민국" oninput="renderAstroCityOptions()"></div></div>
    <label class="astro-check"><input type="checkbox" id="astroTimeUnknown" ${saved.birthTimeUnknown?'checked':''} onchange="toggleAstroTimeFields()"> 출생시간을 몰라요</label>
    <div class="astro-row" id="astroTimeFields"><div class="astro-field"><label>출생 시간</label><input class="astro-input" id="astroHour" inputmode="numeric" value="${astroEsc(saved.hour??'')}" placeholder="14"></div><div class="astro-field"><label>출생 분</label><input class="astro-input" id="astroMinute" inputmode="numeric" value="${astroEsc(saved.minute??'')}" placeholder="30"></div></div>
    <div class="astro-field"><label>출생 도시</label><input class="astro-input" id="astroCitySearch" value="${astroEsc(saved.city||'서울')}" placeholder="서울, 부산, New York..." oninput="renderAstroCityOptions()"></div>
    <div class="astro-field"><label>도시 검색 결과</label><select class="astro-select" id="astroCitySelect"></select></div>
    <div class="astro-warn">도시 목록에 없는 경우 가까운 대도시를 선택해주세요. 출생시간을 모르면 상승궁과 하우스 해석은 제외하고, 달 위치는 날짜에 따라 오차 가능성을 표시합니다.</div>
    <div class="astro-actions"><button class="astro-btn" onclick="${todayOnly?'submitTodayAstrology()':natalOnly?'submitNatalChart()':'submitAstrologyBirth()'}">${todayOnly?'오늘의 점성술 보기':natalOnly?'내 출생차트 보기':'출생차트 계산하기'}</button><button class="astro-btn secondary" onclick="astroNavigate('home')">취소</button></div>
  </div></section>`;
  renderAstroCityOptions();toggleAstroTimeFields();
}
function toggleAstroTimeFields(){const on=document.getElementById('astroTimeUnknown')?.checked;const el=document.getElementById('astroTimeFields');if(el)el.style.display=on?'none':'grid';}
function renderAstroCityOptions(){const q=(document.getElementById('astroCitySearch')?.value||'').toLowerCase();const c=(document.getElementById('astroCountry')?.value||'').toLowerCase();const sel=document.getElementById('astroCitySelect');if(!sel)return;const hits=ASTRO_CITIES.filter(x=>(!q||x.city.toLowerCase().includes(q)||x.country.toLowerCase().includes(q))&&(!c||x.country.toLowerCase().includes(c)||c.includes(x.country.toLowerCase()))).slice(0,20);sel.innerHTML=(hits.length?hits:ASTRO_CITIES.slice(0,12)).map(x=>`<option value="${ASTRO_CITIES.indexOf(x)}">${astroEsc(x.country)} · ${astroEsc(x.city)} (${x.tz})</option>`).join('');}
function readAstroBirthForm(){
  const city=ASTRO_CITIES[Number(document.getElementById('astroCitySelect')?.value||0)];
  const birthTimeUnknown=!!document.getElementById('astroTimeUnknown')?.checked;
  const year=Number(document.getElementById('astroYear')?.value),month=Number(document.getElementById('astroMonth')?.value),day=Number(document.getElementById('astroDay')?.value);
  const hour=birthTimeUnknown?12:Number(document.getElementById('astroHour')?.value||0),minute=birthTimeUnknown?0:Number(document.getElementById('astroMinute')?.value||0);
  if(!year||!month||!day||month<1||month>12||day<1||day>31)throw new Error('출생 연월일을 확인해주세요.');
  if(!birthTimeUnknown&&(hour<0||hour>23||minute<0||minute>59))throw new Error('출생 시간을 확인해주세요.');
  return {year,month,day,hour:birthTimeUnknown?undefined:hour,minute:birthTimeUnknown?undefined:minute,birthTimeUnknown,country:city.country,city:city.city,latitude:city.lat,longitude:city.lon,timezone:city.tz,utcDateTime:convertLocalBirthTimeToUTC({year,month,day,hour,minute,timezone:city.tz})};
}
function submitAstrologyBirth(){try{const birthInfo=readAstroBirthForm();const chart=calculateAstrologyChart(birthInfo);_astroFlow={birthInfo,chart,transit:calculateTransit(new Date()),createdAt:new Date().toISOString()};saveAstrologyFlow();astroNavigate('summary');}catch(e){alert(e.message||'차트 계산 중 오류가 발생했어요.');}}
function submitTodayAstrology(){try{const birthInfo=readAstroBirthForm();const chart=calculateAstrologyChart(birthInfo);const transit=calculateTransit(new Date());_astroFlow={birthInfo,chart,transit,todayText:generateTodayAstrology(chart,transit),createdAt:new Date().toISOString()};saveAstrologyFlow();renderTodayAstrologyResult(astroRoot());}catch(e){alert(e.message||'오늘의 점성술 계산 중 오류가 발생했어요.');}}
function renderTodayAstrologyResult(root){astroSetHeader('오늘의 점성술','무료 결과');const chart=_astroFlow.chart,transit=_astroFlow.transit,text=_astroFlow.todayText||generateTodayAstrology(chart,transit);root.innerHTML=`<section class="astro-hero"><div class="astro-kicker">Today</div><div class="astro-title">오늘의 점성술</div><div class="astro-desc">${astroEsc(chart.birthInfo.city)} 기준 출생차트와 오늘의 트랜짓을 계산했어요.</div></section>${chart.birthInfo.birthTimeUnknown?'<div class="astro-warn">출생시간을 몰라 상승궁과 하우스 해석은 제외했어요. 달 위치는 생일 경계에 가까우면 오차가 있을 수 있어요.</div>':''}${todayAstrologyVisualHTML(chart,transit)}<section class="astro-panel"><div class="astro-markdown">${markdownToAstroHTML(text)}</div></section><div class="astro-actions"><button class="astro-btn" onclick="astroNavigate('products')">상세 리딩 보기</button><button class="astro-btn secondary" onclick="astroNavigate('input')">정보 다시 입력</button></div>`;}
function renderAstrologySummary(root){if(!_astroFlow||!_astroFlow.chart)return astroNavigate('input');astroSetHeader('차트 요약','계산 결과 확인');const c=_astroFlow.chart;root.innerHTML=`<section class="astro-hero"><div class="astro-kicker">Calculated Chart</div><div class="astro-title">출생차트 계산 완료</div><div class="astro-desc">AI 해석 전에 계산 결과를 먼저 확인해주세요.</div></section>${c.validationWarnings?.length?`<div class="astro-warn">${c.validationWarnings.map(astroEsc).join('<br>')}</div>`:''}<section class="astro-panel"><div class="astro-section-title">주요 포인트</div><div class="astro-chart-grid">${c.planets.map(p=>`<div class="astro-chip-card"><b>${astroEsc(planetNameKo(p.planet))}</b>${astroEsc(signNameKo(p.sign))} ${p.degree.toFixed(1)}°${p.house?` · ${p.house}하우스`:''}${p.retrograde?' · 역행':''}</div>`).join('')}${c.ascendant?`<div class="astro-chip-card"><b>ASC</b>${astroEsc(signNameKo(c.ascendant.sign))} ${c.ascendant.degree.toFixed(1)}°</div>`:''}${c.midheaven?`<div class="astro-chip-card"><b>MC</b>${astroEsc(signNameKo(c.midheaven.sign))} ${c.midheaven.degree.toFixed(1)}°</div>`:''}</div></section><section class="astro-panel"><div class="astro-section-title">무료 요약</div><div class="astro-text">${astroEsc(generateTemplateAstrologySummary(c))}</div></section><div class="astro-actions"><button class="astro-btn" onclick="astroNavigate('products')">유료 리딩 선택</button><button class="astro-btn secondary" onclick="astroNavigate('today')">오늘의 점성술 보기</button></div>`;}
function renderAstrologyProducts(root){if(!_astroFlow||!_astroFlow.chart)return astroNavigate('input');astroSetHeader('점성술 상품','리포트 선택');root.innerHTML=`<section class="astro-hero"><div class="astro-kicker">Products</div><div class="astro-title">원하는 리딩을 선택하세요</div><div class="astro-desc">결제 후 계산된 차트와 트랜짓 데이터만 AI로 전달해 상세 해석을 생성합니다.</div></section><div class="astro-products">${ASTRO_PRODUCTS.map(p=>`<button class="astro-product" onclick="selectAstrologyProduct('${p.id}')"><span class="astro-badge">${p.id==='full-report'?'프리미엄':'유료'}</span><div class="astro-product-title">${astroEsc(p.name)}</div><div class="astro-text">${astroEsc(p.desc)}</div><div class="astro-price">${p.price.toLocaleString()}원</div></button>`).join('')}</div>`;}
function selectAstrologyProduct(id){const p=ASTRO_PRODUCTS.find(x=>x.id===id);if(!p)return;_astroFlow={..._astroFlow,productType:p.id,productName:p.name,price:p.price,paymentStatus:'none',resultMarkdown:''};saveAstrologyFlow();astroNavigate('payment');}
function renderAstrologyPayment(root){if(!_astroFlow||!_astroFlow.productType)return astroNavigate('products');astroSetHeader('결제','점성술');root.innerHTML=`<section class="astro-panel"><div class="astro-section-title">${astroEsc(_astroFlow.productName)}</div><div class="astro-text">${astroEsc(_astroFlow.birthInfo.city)} · ${astroEsc(_astroFlow.birthInfo.timezone)}</div><div class="astro-price">${(_astroFlow.price||0).toLocaleString()}원</div><div class="astro-warn">현재 점성술은 mock 결제로 연결되어 있어요. 결제 함수가 분리되어 있어 실제 결제 API로 쉽게 교체할 수 있습니다.</div><div class="astro-actions"><button class="astro-btn" onclick="completeAstrologyPayment()">결제하기</button><button class="astro-btn secondary" onclick="astroNavigate('products')">상품 다시 선택</button></div></section>`;}
function completeAstrologyPayment(){_astroFlow.paymentStatus='paid';saveAstrologyFlow();finishAstrologyReading();}
async function finishAstrologyReading(){_astroFlow.resultLoading=true;_astroFlow.resultMarkdown='';saveAstrologyFlow();astroNavigate('result');try{_astroFlow.resultMarkdown=await generateAIAstrologyReading(_astroFlow.chart,_astroFlow.transit,_astroFlow.productType);}catch(e){console.warn('Astrology AI failed:',e&&e.message);_astroFlow.resultMarkdown=generateTemplateAstrologyReading(_astroFlow.chart,_astroFlow.productType);} _astroFlow.resultLoading=false;saveAstrologyFlow();saveAstrologyReading(_astroFlow);renderAstrology();}
function renderAstrologyResult(root){if(!_astroFlow)return astroNavigate('input');astroSetHeader('점성술 결과',_astroFlow.productName||'AI 리딩');if(_astroFlow.resultLoading){root.innerHTML=`<section class="astro-panel"><div class="astro-section-title">점성술 리포트를 작성하고 있어요</div><div class="astro-text">계산된 출생차트와 트랜짓 데이터를 바탕으로 해석을 생성 중이에요.</div></section>`;return;}if(!_astroFlow.resultMarkdown)return astroNavigate('products');root.innerHTML=`<section class="astro-panel"><div class="astro-section-title">${astroEsc(_astroFlow.productName)}</div><div class="astro-small">${astroEsc(_astroFlow.birthInfo.city)} · ${new Date(_astroFlow.createdAt||Date.now()).toLocaleString('ko-KR')}</div></section><section class="astro-panel"><div class="astro-markdown">${markdownToAstroHTML(_astroFlow.resultMarkdown)}</div></section><div class="astro-actions"><button class="astro-btn" onclick="astroNavigate('products')">다른 리딩 보기</button><button class="astro-btn secondary" onclick="astroNavigate('history')">히스토리 보기</button></div>`;}
function renderAstrologyHistory(root){astroSetHeader('점성술 히스토리','저장된 리포트');const list=loadAstrologyHistory();root.innerHTML=`<section class="astro-hero"><div class="astro-kicker">History</div><div class="astro-title">점성술 히스토리</div><div class="astro-desc">유료 리딩 결과를 다시 볼 수 있어요.</div></section><div class="astro-grid">${list.length?list.map(r=>`<section class="astro-history-item"><div class="astro-section-title">${astroEsc(r.productName||r.productType)}</div><div class="astro-small">${astroEsc(r.birthInfo.city)} · ${new Date(r.createdAt).toLocaleString('ko-KR')}</div><div class="astro-actions"><button class="astro-btn" onclick="openAstrologyHistory('${r.id}')">다시 보기</button></div></section>`).join(''):'<div class="tarot-empty">아직 저장된 점성술 결과가 없어요.</div>'}</div>`;}
function openAstrologyHistory(id){const r=loadAstrologyHistory().find(x=>x.id===id);if(!r)return;_astroFlow={...r,paymentStatus:'paid'};saveAstrologyFlow();astroNavigate('result');}
function renderNatalChartPage(root){return renderNatalChartInput(root);}
function renderNatalChartInput(root){renderAstrologyInput(root,false,true);}
function submitNatalChart(){try{const birthInfo=readAstroBirthForm();const chart=calculateAstrologyChart(birthInfo);_astroFlow={..._astroFlow,birthInfo,chart,transit:calculateTransit(new Date()),natalReady:true,createdAt:new Date().toISOString()};saveAstrologyFlow();astroNavigate('natalResult');}catch(e){alert(e.message||'출생차트 계산 중 오류가 발생했어요.');}}
function renderNatalChartResult(root){
  _wheelSelected=null; // 재렌더 시 휠 선택 상태 초기화
  const chart=_astroFlow&&_astroFlow.chart;
  const err=validateNatalChartForDisplay(chart);
  astroSetHeader('출생차트','무료 네이탈 차트');
  if(err){root.innerHTML=`<section class="astro-panel"><div class="astro-section-title">차트를 표시할 수 없어요</div><div class="astro-text">${astroEsc(err)}</div><div class="astro-actions"><button class="astro-btn" onclick="astroNavigate('natalInput')">출생정보 다시 입력</button></div></section>`;return;}
  const b=chart.birthInfo, unknown=!!b.birthTimeUnknown, features=generateChartFeatureSummary(chart), strongPlanets=getStrongPlanets(chart), strongHouses=getStrongHouses(chart);
  const tj0=tjCompute(chart,tjInitBase()); // Time Journey 초기값 = 오늘
  const sun=findPlanet(chart,'sun'), moon=findPlanet(chart,'moon'), venus=findPlanet(chart,'venus'), mars=findPlanet(chart,'mars');
  root.innerHTML=`<section class="astro-hero"><div class="astro-kicker">Natal Chart</div><div class="astro-title">내 출생차트</div><div class="astro-desc">${formatBirthDateTime(b)}<br>${astroEsc(b.country)} ${astroEsc(b.city)}<br>${unknown?'출생시간을 모르는 상태로 계산되었습니다.':'출생시간 기준 계산 완료'}</div></section>
  ${unknown?'<div class="astro-warn">출생시간을 모르는 상태라 ASC, MC, 12하우스 해석은 제외됩니다. 달 위치는 날짜에 따라 일부 오차가 있을 수 있습니다.</div>':''}
  <section class="astro-panel" id="natalWheelPanel"><div class="astro-section-title">원형 네이탈 차트</div><div class="astro-wheel-wrap">${renderNatalChartWheel(chart,tj0)}</div><div class="astro-text" style="margin-top:10px">${unknown?'출생시간이 없어 행성 위치만 실제 도수로 배치했어요.':'왼쪽 ASC를 기준으로 반시계 방향이 별자리 진행 방향이에요. 행성은 계산된 실제 도수 위에 놓여 있어요.'} 안쪽 파란 행성은 선택한 날짜의 트랜짓이에요.</div></section>
  ${renderTimeJourneyPanel(chart,tj0)}
  <section class="astro-panel"><div class="astro-section-title">한눈에 보는 내 차트</div><div class="astro-overview">
    ${overviewCard('☀ 태양',formatSignName(sun.sign))}
    ${overviewCard('🌙 달',formatSignName(moon.sign))}
    ${unknown?'':overviewCard('⬆ ASC',formatSignName(chart.ascendant.sign))}
    ${overviewCard('♀ 금성',formatSignName(venus.sign))}
    ${overviewCard('♂ 화성',formatSignName(mars.sign))}
    ${overviewCard('강한 원소',elementLabel(getDominantElement(chart.elementBalance)))}
    ${overviewCard('부족한 원소',elementLabel(getWeakElement(chart.elementBalance)))}
    ${overviewCard('강한 성향',modalityLabel(getDominantModality(chart.modalityBalance)))}
    ${unknown?'':overviewCard('강한 하우스',strongHouses.length?strongHouses.map(h=>`${h.house}H`).join(', '):'-')}
  </div><div class="astro-feature-list">${features.map(x=>`<div>✔ ${astroEsc(x)}</div>`).join('')}</div></section>
  <section class="astro-panel"><div class="astro-section-title">행성 위치표</div>${planetPositionTable(chart)}</section>
  ${unknown?'<section class="astro-panel"><div class="astro-warn">출생시간이 없어 ASC/MC와 하우스 표는 표시하지 않아요.</div></section>':`<div class="astro-two-col">${ascMcCards(chart)}</div><details class="astro-details" open><summary>12하우스 표</summary>${houseTable(chart)}</details>`}
  <details class="astro-details"><summary>주요 애스펙트 전체 보기</summary>${aspectTable(chart)}</details>
  <div class="astro-two-col"><section class="astro-panel"><div class="astro-section-title">원소 균형 <span class="astro-tap-badge">터치</span></div>${balanceBars(chart.elementBalance,elementLabel,'element')}<div class="astro-text">${elementSummary(chart.elementBalance)}</div></section><section class="astro-panel"><div class="astro-section-title">모달리티 균형</div>${balanceBars(chart.modalityBalance,modalityLabel)}<div class="astro-text">${modalitySummary(chart.modalityBalance)}</div></section></div>
  <div class="astro-two-col"><section class="astro-panel"><div class="astro-section-title">강한 행성 TOP 3 <span class="astro-tap-badge">터치</span></div><div class="astro-feature-list">${strongPlanets.map((p,i)=>`<button type="button" class="astro-strong-btn" data-wheel-planet="${p.planet}" onclick="wheelSelectPlanet('${p.planet}',event,true)">${i+1}. ${formatPlanetName(p.planet)}<span>보조 지표 ${p.score}</span></button>`).join('')}</div></section>${unknown?'':`<section class="astro-panel"><div class="astro-section-title">강한 하우스</div><div class="astro-feature-list">${strongHouses.length?strongHouses.map(h=>`<div>${h.house}하우스: ${astroEsc(getHouseMeaning(h.house))}</div>`).join(''):'<div>특정 하우스 쏠림이 강하지 않아요.</div>'}</div></section>`}</div>
  ${astrologyReadingCTA()}`;
}
function overviewCard(k,v){return `<div class="astro-chip-card"><b>${astroEsc(k)}</b>${astroEsc(v)}</div>`;}
function validateNatalChartForDisplay(chart){if(!chart||!Array.isArray(chart.planets))return '계산된 차트 데이터가 없습니다. 출생정보를 다시 입력해주세요.';const sun=findPlanet(chart,'sun'),moon=findPlanet(chart,'moon');if(!sun||!moon)return '태양 또는 달 위치가 누락되었습니다. 임의 보정하지 않고 다시 계산해야 합니다.';for(const p of chart.planets){if(!ZODIAC_SIGNS.some(s=>s.id===p.sign)||p.degree<0||p.degree>=30)return `${formatPlanetName(p.planet)} 계산값을 확인해야 합니다.`;}if(!chart.birthInfo.birthTimeUnknown&&(!chart.ascendant||!chart.midheaven||!Array.isArray(chart.houses)||chart.houses.length!==12))return '출생시간이 있지만 ASC/MC/하우스 데이터가 완전하지 않습니다. 다시 계산해주세요.';return '';}
function findPlanet(chart,id){return (chart.planets||[]).find(p=>p.planet===id);}
function formatBirthDateTime(b){return `${b.year}년 ${b.month}월 ${b.day}일 ${b.birthTimeUnknown?'시간 모름':`${String(b.hour).padStart(2,'0')}:${String(b.minute).padStart(2,'0')}`}`;}
function formatPlanetName(planet){return planetNameKo(planet);}
function formatSignName(sign){return signNameKo(sign);}
function formatAspectSymbol(type){return ({conjunction:'☌ Conjunction',opposition:'☍ Opposition',square:'□ Square',trine:'△ Trine',sextile:'✶ Sextile'})[type]||type;}
function formatDegree(degree){return `${Number(degree||0).toFixed(1)}°`;}
function getPlanetShortMeaning(planet){return ({sun:'자아와 삶의 방향',moon:'감정과 안정감',mercury:'생각과 말',venus:'사랑과 취향',mars:'행동력과 추진력',jupiter:'성장과 확장',saturn:'책임과 성숙',uranus:'변화와 독립',neptune:'이상과 직관',pluto:'깊은 변화와 재탄생'})[planet]||'개인의 에너지';}
function getHouseMeaning(house){return ['자아/첫인상','돈/소유/자존감','말/생각/학습','가족/집/내면','연애/창작/즐거움','일상/건강/업무','결혼/파트너/계약','깊은 관계/공동재산/변화','철학/해외/공부','직업/명예/사회적 성취','친구/네트워크/목표','무의식/치유/내면'][house-1]||'';}
function getAspectShortMeaning(a){const pa=formatPlanetName(a.planetA),pb=formatPlanetName(a.planetB);return ({conjunction:`${pa}와 ${pb}의 에너지가 강하게 결합됩니다.`,opposition:`${pa}와 ${pb} 사이의 균형이 필요합니다.`,square:`${pa}와 ${pb} 사이에 성장 과제가 생길 수 있습니다.`,trine:`${pa}와 ${pb}가 자연스럽게 조화를 이룹니다.`,sextile:`${pa}와 ${pb}가 기회와 협력을 만듭니다.`})[a.aspectType]||'두 행성이 의미 있는 관계를 맺습니다.';}
function getStrongPlanets(chart){const scores={};(chart.planets||[]).forEach(p=>{scores[p.planet]=(scores[p.planet]||0)+(['sun','moon','mercury','venus','mars'].includes(p.planet)?3:1);});(chart.aspects||[]).forEach(a=>{scores[a.planetA]=(scores[a.planetA]||0)+1;scores[a.planetB]=(scores[a.planetB]||0)+1;});if(chart.ascendant){const asc=signLon(chart.ascendant);(chart.planets||[]).forEach(p=>{const d=Math.abs(normalizeDelta(planetLon(p)-asc));if(d<=8)scores[p.planet]=(scores[p.planet]||0)+3;});}if(chart.midheaven){const mc=signLon(chart.midheaven);(chart.planets||[]).forEach(p=>{const d=Math.abs(normalizeDelta(planetLon(p)-mc));if(d<=8)scores[p.planet]=(scores[p.planet]||0)+3;});}return Object.entries(scores).map(([planet,score])=>({planet,score})).sort((a,b)=>b.score-a.score).slice(0,3);}
function getStrongHouses(chart){if(chart.birthInfo&&chart.birthInfo.birthTimeUnknown)return [];const counts={};(chart.planets||[]).forEach(p=>{if(p.house)counts[p.house]=(counts[p.house]||0)+(['sun','moon','mercury','venus','mars'].includes(p.planet)?2:1);});return Object.entries(counts).map(([house,score])=>({house:Number(house),score})).sort((a,b)=>b.score-a.score).slice(0,3);}
function getDominantElement(b){return dominantKey(b||{});}
function getWeakElement(b){return weakKey(b||{});}
function getDominantModality(b){return dominantKey(b||{});}
function dominantKey(obj){return Object.entries(obj).sort((a,b)=>b[1]-a[1])[0]?.[0]||'';}
function weakKey(obj){return Object.entries(obj).sort((a,b)=>a[1]-b[1])[0]?.[0]||'';}
function elementLabel(k){return ({fire:'🔥 Fire 불',earth:'🌍 Earth 흙',air:'🌬 Air 바람',water:'💧 Water 물'})[k]||'-';}
function modalityLabel(k){return ({cardinal:'Cardinal 시작형',fixed:'Fixed 고정형',mutable:'Mutable 변화형'})[k]||'-';}
function generateChartFeatureSummary(chart){const list=[];const de=getDominantElement(chart.elementBalance),we=getWeakElement(chart.elementBalance),dm=getDominantModality(chart.modalityBalance),sp=getStrongPlanets(chart)[0],sh=getStrongHouses(chart)[0];if(de)list.push(`${elementLabel(de)} 원소가 강해 그 원소의 방식이 성격과 선택에 자주 드러나요.`);if(we)list.push(`${elementLabel(we)} 원소가 부족해 이 영역은 의식적으로 보완하면 좋아요.`);if(dm)list.push(`${modalityLabel(dm)} 성향이 강하게 나타나는 편이에요.`);if(sp)list.push(`${formatPlanetName(sp.planet)}이 강조되어 ${getPlanetShortMeaning(sp.planet)}이 중요한 사람으로 보여요.`);if(sh)list.push(`${sh.house}하우스가 강조되어 ${getHouseMeaning(sh.house)} 영역이 삶에서 두드러질 수 있어요.`);if(chart.ascendant)list.push(`ASC가 ${formatSignName(chart.ascendant.sign)}라 첫인상에는 그 별자리의 분위기가 묻어나요.`);return list.slice(0,5);}
// ══ 원형 네이탈 차트 휠 — SVG 컴포넌트 (계산 엔진 데이터 표시 전용, 계산 로직 수정 없음) ══
// 규칙: ASC를 왼쪽(9시)에 고정하고 황도가 반시계로 진행하는 정통 배치.
//       출생시간 미상이면 ASC/MC/하우스 없이 양자리 0°를 왼쪽에 두고 행성만 표시.
const WHEEL_SIGN_GLYPHS=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const WHEEL_ELEMENT_COLORS={fire:'#e57462',earth:'#d4a849',air:'#b8c2dc',water:'#6f88d8'};
const WHEEL_ASPECT_COLORS={harmonious:'#6fbf7e',tense:'#e07a7a',neutral:'#d4af37'};
function _wheelGeo(chart){
  const unknown=!!(chart.birthInfo&&chart.birthInfo.birthTimeUnknown);
  const base=(!unknown&&chart.ascendant)?signLon(chart.ascendant):0;
  const cx=220,cy=220;
  const project=(lon,r)=>{const a=(180+(lon-base))*Math.PI/180;return {x:+(cx+Math.cos(a)*r).toFixed(2),y:+(cy-Math.sin(a)*r).toFixed(2)};};
  const ray=(lon,r1,r2,color,w=1)=>{const p=project(lon,r1),q=project(lon,r2);return `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${color}" stroke-width="${w}"/>`;};
  return {cx,cy,unknown,base,project,ray,rOuter:190,rZodiac:160,rHouse:118,rPlanet:137,rHub:114};
}
// 글리프 겹침 방지 — 인접 행성 간 최소 각도(minGap)를 확보하도록 표시 각도만 살짝 벌린다 (실제 도수 틱은 그대로)
function _wheelSpread(lons,minGap){
  const a=lons.slice(),n=a.length;
  for(let it=0;it<30;it++){
    let moved=false;
    for(let i=0;i<n;i++){
      const j=(i+1)%n;let gap=a[j]-a[i];if(j===0)gap+=360;
      if(gap<minGap-0.01){const push=(minGap-gap)/2;a[i]-=push;a[j]+=push;moved=true;}
    }
    if(!moved)break;
  }
  return a.map(normalizeDeg);
}
function ZodiacRing(g){
  let out='';
  for(let i=0;i<12;i++){
    out+=g.ray(i*30,g.rZodiac,g.rOuter,'rgba(212,175,55,.30)',1);
    const pt=g.project(i*30+15,175);
    out+=`<text class="wheel-sign" x="${pt.x}" y="${pt.y}" text-anchor="middle" dominant-baseline="central" font-size="15" fill="${WHEEL_ELEMENT_COLORS[ZODIAC_SIGNS[i].element]}">${WHEEL_SIGN_GLYPHS[i]}︎</text>`;
  }
  for(let d=0;d<360;d+=5){
    if(d%30===0)continue;
    out+=g.ray(d,g.rZodiac,g.rZodiac-(d%10===0?8:4),d%10===0?'rgba(255,255,255,.20)':'rgba(255,255,255,.11)',1);
  }
  return out;
}
function HouseRing(g,chart){
  if(g.unknown||!Array.isArray(chart.houses)||chart.houses.length!==12)return '';
  const cusp=h=>signIndex(h.sign)*30+Number(h.degree||0);
  let out=chart.houses.map(h=>g.ray(cusp(h),g.rHouse,g.rZodiac,'rgba(245,215,124,.26)',1)).join('');
  chart.houses.forEach((h,i)=>{
    const a=cusp(h),b=cusp(chart.houses[(i+1)%12]);
    const mid=a+normalizeDeg(b-a)/2,pt=g.project(mid,127);
    out+=`<text class="wheel-house-num" x="${pt.x}" y="${pt.y}" text-anchor="middle" dominant-baseline="central" font-size="9.5" fill="rgba(216,196,168,.5)">${h.house}</text>`;
  });
  return out;
}
function PlanetMarkers(g,chart){
  const items=(chart.planets||[]).map(p=>({p,lon:planetLon(p)})).sort((x,y)=>x.lon-y.lon);
  const disp=_wheelSpread(items.map(x=>x.lon),9.5);
  return items.map((it,i)=>{
    const notch=g.ray(it.lon,g.rZodiac,g.rZodiac-9,'#f2ca50',1.4); // 실제 도수 표시 틱
    const from=g.project(it.lon,g.rZodiac-9),to=g.project(disp[i],g.rPlanet+12);
    const link=`<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="rgba(212,175,55,.32)" stroke-width=".8"/>`;
    const c=g.project(disp[i],g.rPlanet);
    const elem=signById(it.p.sign).element;
    return `<g class="wheel-planet" data-planet="${it.p.planet}" data-element="${elem}" data-x="${c.x}" data-y="${c.y}" aria-label="${planetNameKo(it.p.planet)} ${signNameKo(it.p.sign)} ${it.p.degree.toFixed(1)}도" onclick="wheelSelectPlanet('${it.p.planet}',event)">${notch}${link}<circle cx="${c.x}" cy="${c.y}" r="21" fill="transparent"/><circle class="wheel-halo" cx="${c.x}" cy="${c.y}" r="16" fill="none" stroke="#f2ca50" stroke-width="2.4"/><circle cx="${c.x}" cy="${c.y}" r="12" fill="rgba(12,15,16,.94)" stroke="#d4af37" stroke-width="1"/><text x="${c.x}" y="${+c.y+0.5}" text-anchor="middle" dominant-baseline="central" font-size="14" fill="#ffe6a8">${planetGlyph(it.p.planet)}︎</text>${it.p.retrograde?`<text x="${+c.x+9}" y="${c.y-8}" text-anchor="middle" font-size="7" font-weight="800" fill="#e08282">R</text>`:''}</g>`;
  }).join('');
}
function AspectLines(g,chart){
  // 컨정션은 선이 점처럼 뭉개져 제외하고, 오브가 타이트한 순으로 최대 10개만 표시
  const list=(chart.aspects||[]).filter(a=>a.aspectType!=='conjunction').slice(0,10);
  return list.map(a=>{
    const pa=findPlanet(chart,a.planetA),pb=findPlanet(chart,a.planetB);
    if(!pa||!pb)return '';
    const p1=g.project(planetLon(pa),g.rHub-2),p2=g.project(planetLon(pb),g.rHub-2);
    return `<line class="wheel-aspect" data-a="${a.planetA}" data-b="${a.planetB}" x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${WHEEL_ASPECT_COLORS[a.meaningType]||'#d4af37'}" stroke-width="1"/>`;
  }).join('');
}
function AscMcMarkers(g,chart){
  if(g.unknown||!chart.ascendant||!chart.midheaven)return '';
  const pill=(lon,label)=>{
    const pt=g.project(lon,205),x=Math.min(414,Math.max(26,+pt.x));
    return `<g class="wheel-axis-label"><rect x="${(x-17).toFixed(2)}" y="${(pt.y-9).toFixed(2)}" width="34" height="18" rx="9" fill="rgba(12,15,16,.92)" stroke="rgba(212,175,55,.55)" stroke-width="1"/><text x="${x.toFixed(2)}" y="${(+pt.y+0.5).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="10.5" font-weight="800" fill="#f5d77c">${label}</text></g>`;
  };
  const asc=signLon(chart.ascendant),mc=signLon(chart.midheaven);
  return g.ray(asc,g.rHub,g.rOuter,'#f2ca50',1.6)+g.ray(asc+180,g.rHub,g.rOuter,'rgba(245,215,124,.38)',1)
    +g.ray(mc,g.rHub,g.rOuter,'#f2ca50',1.3)+g.ray(mc+180,g.rHub,g.rOuter,'rgba(245,215,124,.30)',1)
    +pill(asc,'ASC')+pill(mc,'MC');
}
function NatalChartWheel(chart,tj){
  const g=_wheelGeo(chart);
  const frame=`<circle cx="${g.cx}" cy="${g.cy}" r="${g.rOuter}" fill="rgba(212,175,55,.05)" stroke="rgba(212,175,55,.55)" stroke-width="1.2"/>`
    +`<circle cx="${g.cx}" cy="${g.cy}" r="${g.rZodiac}" fill="rgba(12,15,16,.72)" stroke="rgba(212,175,55,.30)" stroke-width="1"/>`
    +`<circle cx="${g.cx}" cy="${g.cy}" r="${g.rHub}" fill="rgba(12,15,16,.35)" stroke="rgba(255,255,255,.10)" stroke-width="1"/>`;
  const center=`<circle cx="${g.cx}" cy="${g.cy}" r="2.4" fill="#d4af37"/>`;
  const transitLayer=`<g class="wheel-transit-layer" id="wheelTransitLayer">${tj?TransitLayer(g,chart,tj):''}</g>`;
  return `<svg class="astro-wheel" viewBox="0 0 440 440" role="img" aria-label="원형 네이탈 차트" onclick="wheelClearSelection()">${frame}${ZodiacRing(g)}${HouseRing(g,chart)}${AspectLines(g,chart)}${AscMcMarkers(g,chart)}${PlanetMarkers(g,chart)}${transitLayer}${center}</svg>`;
}
function renderNatalChartWheel(chart,tj){
  const g=_wheelGeo(chart);
  return `<div class="astro-wheel-figure">${NatalChartWheel(chart,tj)}<div class="astro-wheel-legend"><span><i style="background:#6fbf7e"></i>조화 각도</span><span><i style="background:#e07a7a"></i>긴장 각도</span><span><i style="background:#f2ca50"></i>행성 실제 도수${g.unknown?'':' · ASC/MC 축'}</span>${tj?'<span><i style="background:#7b9bff"></i>Transit 행성</span>':''}<span><b>R</b> 역행</span></div><div class="wheel-touch-hint">행성을 터치하면 연결된 각도와 상세 정보가 강조돼요</div></div>`;
}
function todayAstrologyVisualHTML(chart,transit){
  const date=transit&&transit.date?new Date(transit.date):new Date();
  const tj={date,transit,aspects:calculateTransitAspects(chart,transit)};
  const moon=transit&&transit.planets&&transit.planets.find(p=>p.planet==='moon');
  const venus=transit&&transit.planets&&transit.planets.find(p=>p.planet==='venus');
  const mars=transit&&transit.planets&&transit.planets.find(p=>p.planet==='mars');
  const chips=[moon&&`달 ${formatSignName(moon.sign)}`,venus&&`금성 ${formatSignName(venus.sign)}`,mars&&`화성 ${formatSignName(mars.sign)}`].filter(Boolean);
  return `<section class="astro-panel astro-today-visual"><div class="astro-section-title">오늘의 별 흐름</div><div class="astro-text">바깥의 금색 행성은 본인의 출생차트, 안쪽의 파란 행성은 오늘의 트랜짓이에요.</div><div class="astro-wheel-wrap compact">${renderNatalChartWheel(chart,tj)}</div>${chips.length?`<div class="astro-today-chips">${chips.map(c=>`<span>${astroEsc(c)}</span>`).join('')}</div>`:''}</section>`;
}

// ══ 휠 프리미엄 인터랙션 — 행성/원소/TOP3 선택 강조 (표시 전용, 계산 로직과 무관) ══
let _wheelSelected=null; // {type:'planet'|'element', id:string} | null
function wheelSelectPlanet(id,ev,fromCard){
  if(ev&&ev.stopPropagation)ev.stopPropagation();
  _wheelSelected=(_wheelSelected&&_wheelSelected.type==='planet'&&_wheelSelected.id===id)?null:{type:'planet',id};
  applyWheelSelection();
  if(fromCard&&_wheelSelected)wheelScrollIntoView();
}
function wheelSelectElement(el,ev){
  if(ev&&ev.stopPropagation)ev.stopPropagation();
  _wheelSelected=(_wheelSelected&&_wheelSelected.type==='element'&&_wheelSelected.id===el)?null:{type:'element',id:el};
  applyWheelSelection();
  if(_wheelSelected)wheelScrollIntoView();
}
function wheelClearSelection(){
  if(!_wheelSelected)return;
  _wheelSelected=null;
  applyWheelSelection();
}
function wheelScrollIntoView(){
  const p=document.getElementById('natalWheelPanel');
  if(p&&p.scrollIntoView)p.scrollIntoView({behavior:'smooth',block:'center'});
}
function applyWheelSelection(){
  const panel=document.getElementById('natalWheelPanel');
  const chart=_astroFlow&&_astroFlow.chart;
  if(!panel||!chart)return;
  const svg=panel.querySelector('.astro-wheel');
  if(!svg)return;
  const sel=_wheelSelected;
  svg.classList.toggle('has-sel',!!sel);
  // 선택 대상 행성 집합 — 행성 선택은 1개, 원소 선택은 그 원소 별자리의 행성 전부
  const idSet=new Set(!sel?[]:sel.type==='planet'?[sel.id]:(chart.planets||[]).filter(p=>signById(p.sign).element===sel.id).map(p=>p.planet));
  svg.querySelectorAll('.wheel-planet').forEach(g=>g.classList.toggle('sel',idSet.has(g.getAttribute('data-planet'))));
  svg.querySelectorAll('.wheel-aspect').forEach(l=>{
    const a=idSet.has(l.getAttribute('data-a')),b=idSet.has(l.getAttribute('data-b'));
    const bright=!!sel&&(sel.type==='planet'?(a||b):(a&&b));
    l.classList.toggle('sel',bright);
    l.classList.toggle('mid',!!sel&&sel.type==='element'&&!bright&&(a||b));
  });
  // 원소 균형·강한 행성 카드 활성 상태 동기화
  document.querySelectorAll('[data-wheel-el]').forEach(b=>b.classList.toggle('active',!!sel&&sel.type==='element'&&b.getAttribute('data-wheel-el')===sel.id));
  document.querySelectorAll('[data-wheel-planet]').forEach(b=>b.classList.toggle('active',!!sel&&sel.type==='planet'&&b.getAttribute('data-wheel-planet')===sel.id));
  renderWheelTip(sel,chart,panel);
}
function renderWheelTip(sel,chart,panel){
  const fig=panel.querySelector('.astro-wheel-figure');
  if(!fig)return;
  let tip=fig.querySelector('.wheel-tip');
  if(!sel||sel.type!=='planet'){if(tip)tip.classList.remove('on');return;}
  const p=findPlanet(chart,sel.id);
  const g=fig.querySelector(`.wheel-planet[data-planet="${sel.id}"]`);
  if(!p||!g)return;
  if(!tip){tip=document.createElement('div');tip.className='wheel-tip';fig.appendChild(tip);}
  tip.innerHTML=`<div class="wheel-tip-head"><span class="wheel-tip-glyph">${planetGlyph(p.planet)}︎</span><b>${astroEsc(planetNameKo(p.planet))}</b>${p.retrograde?'<i class="wheel-tip-r">R 역행</i>':''}</div>
    <div class="wheel-tip-row">${astroEsc(signNameKo(p.sign))} ${Number(p.degree||0).toFixed(1)}°${p.house?` · ${p.house}하우스`:''}</div>
    <div class="wheel-tip-mean">${astroEsc(getPlanetShortMeaning(p.planet))}</div>`;
  const x=Number(g.getAttribute('data-x')),y=Number(g.getAttribute('data-y'));
  tip.style.left=Math.min(82,Math.max(18,x/440*100))+'%';
  tip.style.top=(y/440*100)+'%';
  tip.classList.toggle('below',y<132);
  tip.classList.remove('on');
  requestAnimationFrame(()=>tip.classList.add('on'));
}

// ══ Time Journey — 트랜짓 슬라이더 (API 없음, 기존 계산 엔진만 사용) ══
// 출생(네이탈) 행성은 골드, 트랜짓 행성은 블루/퍼플로 휠 안쪽 링에 겹쳐 표시.
const TJ_MAX_DAYS=730; // 오늘 ~ +2년
const TJ_COLOR='#7b9bff';
let _tjBase=null,_tjOffset=0,_tjTimer=null,_tjApplyCount=0;
function tjInitBase(){const d=new Date();d.setHours(12,0,0,0);return d;}
function tjDate(){return new Date((_tjBase||tjInitBase()).getTime()+_tjOffset*86400000);}
function tjFmtLabel(d,offset){const s=`${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`;return offset===0?`${s} · 오늘`:s;}
function tjFmtInput(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function tjCompute(chart,date){const transit=calculateTransit(date);return {date,transit,aspects:calculateTransitAspects(chart,transit)};}
// 트랜짓 ↔ 네이탈 애스펙트 — 타이트한 오브(3°/2.5°)만, 중요도 가중치로 상위 8개
function calculateTransitAspects(chart,transit){
  const defs=[['conjunction',0,'neutral'],['opposition',180,'tense'],['square',90,'tense'],['trine',120,'harmonious'],['sextile',60,'harmonious']];
  const out=[];
  (transit.planets||[]).forEach(tp=>{
    const tl=normalizeDeg(tp.longitude);
    (chart.planets||[]).forEach(np=>{
      const dist=Math.abs(normalizeDelta(tl-planetLon(np)));
      for(const [type,deg,meaning] of defs){
        const orb=Math.abs(dist-deg);
        const limit=(np.planet==='sun'||np.planet==='moon'||tp.planet==='sun'||tp.planet==='moon')?3:2.5;
        if(orb<=limit){
          const w=(3-orb)*2+((np.planet==='sun'||np.planet==='moon')?4:isPersonal(np.planet)?2:0)+(['jupiter','saturn','uranus','neptune','pluto'].includes(tp.planet)?1.5:0);
          out.push({transit:tp.planet,natal:np.planet,aspectType:type,meaningType:meaning,orb:+orb.toFixed(2),weight:+w.toFixed(2)});
          break;
        }
      }
    });
  });
  return out.sort((a,b)=>b.weight-a.weight).slice(0,8);
}
// 휠 오버레이 — 트랜짓 행성(내부 링 r97) + 트랜짓-네이탈 점선 애스펙트(상위 5)
function TransitLayer(g,chart,tj){
  const t=tj&&tj.transit;if(!t||!Array.isArray(t.planets))return '';
  let out='';
  (tj.aspects||[]).slice(0,5).forEach(a=>{
    const tp=t.planets.find(x=>x.planet===a.transit),np=findPlanet(chart,a.natal);
    if(!tp||!np)return;
    const col=WHEEL_ASPECT_COLORS[a.meaningType]||'#d4af37';
    const p1=g.project(normalizeDeg(tp.longitude),105),p2=g.project(planetLon(np),112);
    out+=`<line class="wheel-taspect" x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${col}" stroke-width="1.1" stroke-dasharray="4 3" opacity=".8"/><circle cx="${p2.x}" cy="${p2.y}" r="2.6" fill="${col}" opacity=".9"/>`;
  });
  const items=t.planets.map(p=>({p,lon:normalizeDeg(p.longitude)})).sort((a,b)=>a.lon-b.lon);
  const disp=_wheelSpread(items.map(x=>x.lon),11);
  items.forEach((it,i)=>{
    out+=g.ray(it.lon,g.rHub,g.rHub-7,TJ_COLOR,1.2);
    const c=g.project(disp[i],97);
    out+=`<g class="wheel-tplanet"><circle cx="${c.x}" cy="${c.y}" r="9.5" fill="rgba(10,12,22,.94)" stroke="${TJ_COLOR}" stroke-width="1"/><text x="${c.x}" y="${+c.y+0.5}" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#cfe0ff">${planetGlyph(it.p.planet)}︎</text>${it.p.retrograde?`<text x="${+c.x+7.5}" y="${c.y-6.5}" text-anchor="middle" font-size="6" font-weight="800" fill="#b7a5ff">R</text>`:''}</g>`;
  });
  return out;
}
// 요약 3개 — ① 태양/달 애스펙트 ② 하우스 통과/접근 ③ 다음 애스펙트 또는 목성 위치
function generateTransitSummaries(chart,tj){
  const A=tj.aspects||[],out=[];
  const ga=s=>typeof ip==='function'?ip(s):'이';
  const wa=s=>typeof gwa==='function'?gwa(s):'과';
  const typeKo=t=>({conjunction:'합',trine:'조화각',sextile:'조화각',square:'긴장각',opposition:'긴장각'})[t]||'각도';
  const tail=a=>a.meaningType==='harmonious'?' 기회가 부드럽게 열리는 흐름이에요.':a.meaningType==='tense'?(a.natal==='moon'?' 감정적 부담이 커질 수 있어요.':' 속도를 조절하면 마찰을 줄일 수 있어요.'):' 그 주제가 삶의 전면으로 올라와요.';
  const sentence=a=>`Transit ${planetNameKo(a.transit)}${ga(planetNameKo(a.transit))} ${planetNameKo(a.natal)}${wa(planetNameKo(a.natal))} ${typeKo(a.aspectType)}을 이룹니다.${tail(a)}`;
  const lumin=A.find(a=>a.natal==='sun'||a.natal==='moon');
  if(lumin)out.push(sentence(lumin));
  if(Array.isArray(chart.houses)&&chart.houses.length===12){
    const cusps=chart.houses.map(x=>({h:x.house,lon:signIndex(x.sign)*30+Number(x.degree||0)}));
    for(const id of ['venus','jupiter','saturn','mars','sun']){
      const tp=tj.transit.planets.find(p=>p.planet===id);if(!tp)continue;
      const lon=normalizeDeg(tp.longitude),h=houseForLongitude(lon,chart.houses);if(!h)continue;
      let nxt=null,min=999;cusps.forEach(c=>{const d=normalizeDeg(c.lon-lon);if(d>0.01&&d<min){min=d;nxt=c;}});
      out.push(nxt&&min<=3?`Transit ${planetNameKo(id)}${ga(planetNameKo(id))} ${nxt.h}하우스에 접근 중입니다.`:`Transit ${planetNameKo(id)}${ga(planetNameKo(id))} ${h}하우스를 지나는 중입니다.`);
      break;
    }
  }else{
    const moonT=tj.transit.planets.find(p=>p.planet==='moon');
    if(moonT)out.push(`Transit 달이 ${signNameKo(moonT.sign)}에 들어 감정의 흐름이 ${signById(moonT.sign).keywords[0]} 쪽으로 기울어요.`);
  }
  const second=A.find(a=>a!==lumin);
  if(second&&out.length<3)out.push(sentence(second));
  if(out.length<3){const j=tj.transit.planets.find(p=>p.planet==='jupiter');if(j)out.push(`Transit 목성이 ${signNameKo(j.sign)}를 지나며 확장의 기회를 비춥니다.`);}
  return out.slice(0,3);
}
function tjSummaryHTML(chart,tj){
  const list=generateTransitSummaries(chart,tj);
  return list.length?list.map(x=>`<div>${astroEsc(x)}</div>`).join(''):'<div>이 날짜에는 타이트한 트랜짓 각도가 없어요. 흐름이 잔잔한 시기예요.</div>';
}
function tjPositionsHTML(chart,tj){
  const hasHouses=Array.isArray(chart.houses)&&chart.houses.length===12;
  return (tj.transit.planets||[]).map(p=>{
    const h=hasHouses?houseForLongitude(normalizeDeg(p.longitude),chart.houses):null;
    return `<div class="astro-chip-card tr"><b>${planetGlyph(p.planet)}︎ ${astroEsc(planetNameKo(p.planet))}</b>${astroEsc(signNameKo(p.sign))} ${Number(p.degree||0).toFixed(1)}°${h?` · ${h}H`:''}${p.retrograde?' · R':''}</div>`;
  }).join('');
}
function tjAspectsHTML(tj){
  const glyph={conjunction:'☌',sextile:'✶',square:'□',trine:'△',opposition:'☍'};
  const list=(tj.aspects||[]).slice(0,5);
  return list.length?list.map(a=>`<div class="tj-asp ${a.meaningType}"><i></i><span>T ${astroEsc(planetNameKo(a.transit))} ${glyph[a.aspectType]||''} ${astroEsc(planetNameKo(a.natal))}</span><b>${a.orb.toFixed(1)}°</b></div>`).join(''):'<div class="tj-asp neutral"><i></i><span>3° 이내로 좁혀진 각도가 없어요</span></div>';
}
function renderTimeJourneyPanel(chart,tj){
  _tjBase=tjInitBase();_tjOffset=0;
  const d=_tjBase,maxD=new Date(d.getTime()+TJ_MAX_DAYS*86400000);
  return `<section class="astro-panel" id="timeJourneyPanel">
    <div class="astro-section-title">Time Journey <span class="astro-tap-badge">TRANSIT</span></div>
    <div class="astro-text" style="margin-top:2px">슬라이더를 움직이면 그 날짜의 행성 위치(트랜짓)가 차트 위에 파란색으로 겹쳐져요.</div>
    <div class="tj-date-row"><b id="tjDateLabel">${tjFmtLabel(d,0)}</b><input type="date" class="tj-date-input" id="tjDateInput" value="${tjFmtInput(d)}" min="${tjFmtInput(d)}" max="${tjFmtInput(maxD)}" onchange="tjOnDateInput(this.value)" aria-label="트랜짓 날짜 직접 선택"></div>
    <input type="range" class="tj-slider" id="tjSlider" min="0" max="${TJ_MAX_DAYS}" step="1" value="0" oninput="tjOnSlide(this.value)" aria-label="트랜짓 날짜 슬라이더">
    <div class="tj-chips">
      <button type="button" class="tj-chip active" data-tj="0" onclick="tjJump(0)">오늘</button>
      <button type="button" class="tj-chip" data-tj="30" onclick="tjJump(30)">+1개월</button>
      <button type="button" class="tj-chip" data-tj="182" onclick="tjJump(182)">+6개월</button>
      <button type="button" class="tj-chip" data-tj="365" onclick="tjJump(365)">+1년</button>
    </div>
    <div class="astro-feature-list" id="tjSummary">${tjSummaryHTML(chart,tj)}</div>
    <div class="astro-section-title" style="font-size:.9rem;margin-top:16px">Transit 행성 위치</div>
    <div class="astro-chart-grid" id="tjPositions">${tjPositionsHTML(chart,tj)}</div>
    <div class="astro-section-title" style="font-size:.9rem;margin-top:16px">중요 Transit 각도</div>
    <div class="tj-asp-list" id="tjAspects">${tjAspectsHTML(tj)}</div>
  </section>`;
}
// 슬라이더 조작 — 라벨은 즉시, 계산·렌더는 140ms 디바운스 (프레임 드랍 방지)
function tjOnSlide(v){
  _tjOffset=Math.max(0,Math.min(TJ_MAX_DAYS,Number(v)||0));
  const d=tjDate();
  const lab=document.getElementById('tjDateLabel');if(lab)lab.textContent=tjFmtLabel(d,_tjOffset);
  const di=document.getElementById('tjDateInput');if(di)di.value=tjFmtInput(d);
  tjSyncChips();
  clearTimeout(_tjTimer);_tjTimer=setTimeout(tjApply,140);
}
function tjJump(days){
  _tjOffset=Math.max(0,Math.min(TJ_MAX_DAYS,Number(days)||0));
  const s=document.getElementById('tjSlider');if(s)s.value=String(_tjOffset);
  const d=tjDate();
  const lab=document.getElementById('tjDateLabel');if(lab)lab.textContent=tjFmtLabel(d,_tjOffset);
  const di=document.getElementById('tjDateInput');if(di)di.value=tjFmtInput(d);
  tjSyncChips();
  clearTimeout(_tjTimer);tjApply();
}
function tjOnDateInput(val){
  const p=String(val||'').split('-').map(Number);
  if(p.length===3&&p[0]){const d=new Date(p[0],p[1]-1,p[2],12,0,0,0);_tjOffset=Math.max(0,Math.min(TJ_MAX_DAYS,Math.round((d-_tjBase)/86400000)));}
  tjJump(_tjOffset);
}
function tjSyncChips(){document.querySelectorAll('.tj-chip').forEach(b=>b.classList.toggle('active',Number(b.getAttribute('data-tj'))===_tjOffset));}
function tjApply(){
  const chart=_astroFlow&&_astroFlow.chart;
  if(!chart||!_tjBase)return;
  _tjApplyCount++;
  const tj=tjCompute(chart,tjDate());
  const layer=document.getElementById('wheelTransitLayer');
  if(layer)layer.innerHTML=TransitLayer(_wheelGeo(chart),chart,tj);
  const s=document.getElementById('tjSummary');if(s)s.innerHTML=tjSummaryHTML(chart,tj);
  const pos=document.getElementById('tjPositions');if(pos)pos.innerHTML=tjPositionsHTML(chart,tj);
  const asp=document.getElementById('tjAspects');if(asp)asp.innerHTML=tjAspectsHTML(tj);
}
function planetGlyph(p){return ({sun:'☉',moon:'☽',mercury:'☿',venus:'♀',mars:'♂',jupiter:'♃',saturn:'♄',uranus:'♅',neptune:'♆',pluto:'♇'})[p]||'•';}
function signIndex(sign){return ZODIAC_SIGNS.findIndex(s=>s.id===sign);}
function planetLon(p){return signIndex(p.sign)*30+Number(p.degree||0);}
function signLon(o){return signIndex(o.sign)*30+Number(o.degree||0);}
function planetPositionTable(chart){return `<div class="astro-table-wrap"><table class="astro-table"><thead><tr><th>행성</th><th>별자리</th><th>도수</th><th>하우스</th><th>역행</th><th>간단 의미</th></tr></thead><tbody>${(chart.planets||[]).map(p=>`<tr><td>${formatPlanetName(p.planet)}</td><td>${formatSignName(p.sign)}</td><td>${formatDegree(p.degree)}</td><td>${p.house?`${p.house}H`:'-'}</td><td>${p.retrograde?'R':'-'}</td><td>${getPlanetShortMeaning(p.planet)}</td></tr>`).join('')}</tbody></table></div>`;}
function ascMcCards(chart){return `<section class="astro-panel"><div class="astro-section-title">ASC 상승궁</div><div class="astro-text"><b style="color:var(--accent-bright)">${formatSignName(chart.ascendant.sign)}</b><br>첫인상, 외적 이미지, 세상에 드러나는 방식에 ${formatSignName(chart.ascendant.sign)}의 분위기가 더해져요.</div></section><section class="astro-panel"><div class="astro-section-title">MC</div><div class="astro-text"><b style="color:var(--accent-bright)">${formatSignName(chart.midheaven.sign)}</b><br>직업적 방향, 사회적 목표, 커리어 이미지에 ${formatSignName(chart.midheaven.sign)}의 색이 나타나요.</div></section>`;}
function houseTable(chart){return `<div class="astro-table-wrap"><table class="astro-table"><thead><tr><th>하우스</th><th>별자리</th><th>도수</th><th>영역</th></tr></thead><tbody>${(chart.houses||[]).map(h=>`<tr><td>${h.house}H</td><td>${formatSignName(h.sign)}</td><td>${formatDegree(h.degree)}</td><td>${getHouseMeaning(h.house)}</td></tr>`).join('')}</tbody></table></div>`;}
function aspectTable(chart){const a=chart.aspects||[];return a.length?`<div class="astro-table-wrap"><table class="astro-table"><thead><tr><th>행성 A</th><th>각도</th><th>행성 B</th><th>오브</th><th>성격</th><th>간단 의미</th></tr></thead><tbody>${a.map(x=>`<tr><td>${formatPlanetName(x.planetA)}</td><td>${formatAspectSymbol(x.aspectType)}</td><td>${formatPlanetName(x.planetB)}</td><td>${formatDegree(x.orb)}</td><td>${x.meaningType==='harmonious'?'조화':x.meaningType==='tense'?'긴장':'중립'}</td><td>${getAspectShortMeaning(x)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="astro-text" style="padding:14px">표시할 주요 애스펙트가 많지 않아요.</div>';}
function balanceBars(balance,labeler,interactive){const max=Math.max(1,...Object.values(balance||{}));return `<div class="astro-bars">${Object.entries(balance||{}).map(([k,v])=>{const inner=`<span>${labeler(k).split(' ').slice(-1)[0]}</span><div class="astro-bar"><span style="width:${Math.max(8,v/max*100)}%"></span></div><b>${v}</b>`;return interactive==='element'?`<button type="button" class="astro-bar-row tappable" data-wheel-el="${k}" onclick="wheelSelectElement('${k}',event)">${inner}</button>`:`<div class="astro-bar-row">${inner}</div>`;}).join('')}</div>`;}
function elementSummary(b){const d=getDominantElement(b),w=getWeakElement(b);return `${elementLabel(d)} 원소가 강하게 나타나요. ${elementLabel(w)} 원소는 의식적으로 보완하면 차트 균형을 잡는 데 도움이 돼요.`;}
function modalitySummary(b){const d=getDominantModality(b);return `${modalityLabel(d)} 성향이 강해 삶의 움직임에서 이 패턴이 자주 드러나는 편이에요.`;}
function astrologyReadingCTA(){return `<section class="astro-panel"><div class="astro-section-title">더 자세히 풀이받기</div><div class="astro-text">이 계산표를 바탕으로 AI 상세 리딩을 받을 수 있어요. 계산된 차트 데이터를 그대로 사용하므로 다시 입력하지 않아도 됩니다.</div><div class="astro-actions"><button class="astro-btn" onclick="selectAstrologyProduct('birth-basic')">내 출생차트 자세히 풀이받기</button><button class="astro-btn secondary" onclick="selectAstrologyProduct('love-marriage')">연애/결혼운 보기</button><button class="astro-btn secondary" onclick="selectAstrologyProduct('career-money')">직업/재물운 보기</button><button class="astro-btn secondary" onclick="selectAstrologyProduct('yearly')">올해 운세 보기</button><button class="astro-btn secondary" onclick="selectAstrologyProduct('full-report')">종합 리포트 보기</button><button class="astro-btn secondary" onclick="astroNavigate('natalInput')">출생정보 수정</button></div></section>`;}

function markdownToAstroHTML(md){return typeof markdownToTarotHTML==='function'?markdownToTarotHTML(md):astroEsc(md).replace(/\n/g,'<br>');}
function loadAstrologyFlow(){try{return JSON.parse(sessionStorage.getItem(ASTRO_FLOW_KEY)||localStorage.getItem(ASTRO_FLOW_KEY)||'null')||{};}catch(e){return {};}}
function saveAstrologyFlow(){try{sessionStorage.setItem(ASTRO_FLOW_KEY,JSON.stringify(_astroFlow));localStorage.setItem(ASTRO_FLOW_KEY,JSON.stringify(_astroFlow));}catch(e){}}
function loadAstrologyHistory(){try{return JSON.parse(localStorage.getItem(ASTRO_HISTORY_KEY)||'[]');}catch(e){return [];}}
function saveAstrologyReading(flow){if(!flow.resultMarkdown)return;const r={id:'astro_'+Date.now(),userId:typeof getTarotUserId==='function'?getTarotUserId():'local',birthInfo:flow.birthInfo,productType:flow.productType,productName:flow.productName,price:flow.price,chart:flow.chart,transit:flow.transit,resultMarkdown:flow.resultMarkdown,createdAt:new Date().toISOString()};const list=loadAstrologyHistory();list.unshift(r);localStorage.setItem(ASTRO_HISTORY_KEY,JSON.stringify(list.slice(0,30)));}
function getTimeZoneOffsetMinutes(timeZone,date){const dtf=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});const p=Object.fromEntries(dtf.formatToParts(date).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));const hour=p.hour==='24'?'00':p.hour;const asUTC=Date.UTC(+p.year,+p.month-1,+p.day,+hour,+p.minute,+p.second);return (asUTC-date.getTime())/60000;}
function convertLocalBirthTimeToUTC(b){let utc=Date.UTC(b.year,b.month-1,b.day,b.hour||0,b.minute||0);let off=getTimeZoneOffsetMinutes(b.timezone,new Date(utc));utc=Date.UTC(b.year,b.month-1,b.day,b.hour||0,b.minute||0)-off*60000;off=getTimeZoneOffsetMinutes(b.timezone,new Date(utc));utc=Date.UTC(b.year,b.month-1,b.day,b.hour||0,b.minute||0)-off*60000;return new Date(utc).toISOString();}
function calculateAstrologyChart(birthInfo){if(!window.Astronomy)throw new Error('천문 계산 엔진을 불러오지 못했어요.');const date=new Date(birthInfo.utcDateTime);const raw=calculatePlanetPositions(date);let ascendant,midheaven,houses;if(!birthInfo.birthTimeUnknown){ascendant=calculateAscendant(date,birthInfo.latitude,birthInfo.longitude);midheaven=calculateMidheaven(date,birthInfo.latitude,birthInfo.longitude);houses=calculateHouses(ascendant);}const withHouses=raw.map(p=>({...p,house:houses?houseForLongitude(p.longitude,houses):undefined}));const chart={birthInfo,planets:withHouses.map(({longitude,...p})=>p),ascendant,midheaven,houses,aspects:calculateAspects(withHouses),elementBalance:calculateElementBalance(withHouses),modalityBalance:calculateModalityBalance(withHouses)};chart.validationWarnings=validateAstrologyChart(chart,withHouses);return chart;}
function calculatePlanetPositions(date){const map={sun:'Sun',moon:'Moon',mercury:'Mercury',venus:'Venus',mars:'Mars',jupiter:'Jupiter',saturn:'Saturn',uranus:'Uranus',neptune:'Neptune',pluto:'Pluto'};return Object.entries(map).map(([id,body])=>{const lon=planetLongitude(body,date),next=planetLongitude(body,new Date(date.getTime()+86400000));const s=signFromLongitude(lon);return {planet:id,sign:s.id,degree:lon%30,longitude:lon,retrograde:normalizeDelta(next-lon)<0};});}
function planetLongitude(body,date){const A=window.Astronomy;const v=A.GeoVector(A.Body[body],date,true);const e=A.RotateVector(A.Rotation_EQJ_ECL(date),v);return normalizeDeg(Math.atan2(e.y,e.x)*180/Math.PI);}
function calculateTransit(currentDate){const d=new Date(currentDate);return {date:d.toISOString(),planets:calculatePlanetPositions(d),aspects:[]};}
function calculateAscendant(date,lat,lon){const eps=23.439291*Math.PI/180,theta=normalizeDeg(gmst(date)+lon)*Math.PI/180,phi=lat*Math.PI/180;let asc=Math.atan2(Math.cos(theta),-(Math.sin(theta)*Math.cos(eps)+Math.tan(phi)*Math.sin(eps)))*180/Math.PI;asc=normalizeDeg(asc);const s=signFromLongitude(asc);return {sign:s.id,degree:asc%30};}
function calculateMidheaven(date,lat,lon){const eps=23.439291*Math.PI/180,theta=normalizeDeg(gmst(date)+lon)*Math.PI/180;let mc=Math.atan2(Math.sin(theta),Math.cos(theta)*Math.cos(eps))*180/Math.PI;mc=normalizeDeg(mc);const s=signFromLongitude(mc);return {sign:s.id,degree:mc%30};}
function calculateHouses(asc){const start=ZODIAC_SIGNS.findIndex(s=>s.id===asc.sign);return Array.from({length:12},(_,i)=>{const s=ZODIAC_SIGNS[(start+i)%12];return {house:i+1,sign:s.id,degree:0,system:'whole-sign'};});}
function houseForLongitude(lon,houses){const sign=signFromLongitude(lon).id;const h=houses.find(x=>x.sign===sign);return h?h.house:undefined;}
function calculateAspects(planets){const defs=[['conjunction',0,'neutral'],['opposition',180,'tense'],['square',90,'tense'],['trine',120,'harmonious'],['sextile',60,'harmonious']];const out=[];for(let i=0;i<planets.length;i++)for(let j=i+1;j<planets.length;j++){const a=planets[i],b=planets[j],dist=Math.abs(normalizeDelta(a.longitude-b.longitude));for(const [type,deg,meaningType] of defs){const orb=Math.abs(dist-deg),limit=(['sun','moon'].includes(a.planet)||['sun','moon'].includes(b.planet))?8:((isPersonal(a.planet)||isPersonal(b.planet))?6:5);if(orb<=limit){out.push({planetA:a.planet,planetB:b.planet,aspectType:type,orb:+orb.toFixed(2),meaningType});break;}}}return out.sort((a,b)=>a.orb-b.orb).slice(0,18);}
function calculateElementBalance(planets){return planets.reduce((m,p)=>{m[signById(p.sign).element]++;return m;},{fire:0,earth:0,air:0,water:0});}
function calculateModalityBalance(planets){return planets.reduce((m,p)=>{m[signById(p.sign).modality]++;return m;},{cardinal:0,fixed:0,mutable:0});}
function validateAstrologyChart(chart,rawPlanets=[]){const w=[];if(chart.birthInfo.birthTimeUnknown)w.push('출생시간을 몰라 ASC, MC, 12하우스 기반 해석은 제외했어요. 달 위치는 날짜 경계에 따라 오차 가능성이 있어요.');rawPlanets.forEach(p=>{if(p.longitude<0||p.longitude>=360||p.degree<0||p.degree>=30)w.push(`${planetNameKo(p.planet)} 계산값 범위를 확인해야 해요.`);});if(!chart.birthInfo.birthTimeUnknown&&(!chart.houses||chart.houses.length!==12))w.push('하우스가 12개 모두 생성되지 않았어요.');return w;}
function signFromLongitude(lon){return ZODIAC_SIGNS[Math.floor(normalizeDeg(lon)/30)%12];}
function signById(id){return ZODIAC_SIGNS.find(s=>s.id===id)||ZODIAC_SIGNS[0];}
function signNameKo(id){return signById(id).nameKo;}
function planetNameKo(id){return (PLANET_MEANINGS.find(p=>p.id===id)||{}).nameKo||id;}
function koHasBatchim(word){const ch=String(word||'').trim().slice(-1);const code=ch.charCodeAt(0);return code>=0xac00&&code<=0xd7a3?(code-0xac00)%28!==0:false;}
function koWa(word){return koHasBatchim(word)?'과':'와';}
function normalizeDeg(x){return ((x%360)+360)%360;}
function normalizeDelta(x){let d=normalizeDeg(x);return d>180?d-360:d;}
function gmst(date){const jd=date.getTime()/86400000+2440587.5;const d=jd-2451545.0;return normalizeDeg(280.46061837+360.98564736629*d);}
function isPersonal(p){return ['sun','moon','mercury','venus','mars'].includes(p);}
function generateTodayAstrology(chart,transit){
  const sun=chart.planets.find(p=>p.planet==='sun');
  const moonT=transit.planets.find(p=>p.planet==='moon');
  const venusT=transit.planets.find(p=>p.planet==='venus');
  const marsT=transit.planets.find(p=>p.planet==='mars');
  const ss=signById(sun.sign),ms=signById(moonT.sign),vs=signById(venusT.sign),mas=signById(marsT.sign);
  return [
    `오늘은 달이 ${ms.nameKo}에 머물러 있어서 마음이 ${ms.keywords[0]}${koWa(ms.keywords[0])} ${ms.keywords[1]} 쪽으로 조금 더 쉽게 움직일 수 있어요. 본인의 출생 태양은 ${ss.nameKo}라서 평소에는 ${ss.personality} 그래서 오늘은 원래의 성향대로 바로 밀고 나가기보다, 지금 마음이 어디에 반응하는지 먼저 살펴보는 편이 좋아요.`,
    `관계에서는 금성이 ${vs.nameKo}에 있어서 ${vs.loveStyle} 상대의 말이나 표정을 너무 깊게 해석하기보다는, 편안하게 말을 건네는 쪽이 더 자연스럽습니다. 돈이나 약속과 관련된 일은 급하게 결정하지 말고, 정말 필요한 지출인지 한 번 더 확인해보세요. 작은 확인만으로도 불필요한 흔들림을 줄일 수 있어요.`,
    `일이나 해야 할 일에서는 화성이 ${mas.nameKo}에 있어 ${mas.careerStyle} 오늘은 새로운 일을 크게 벌이기보다 이미 진행 중인 일을 정리하는 데 더 잘 맞습니다. 컨디션도 한 번에 몰아쓰기보다는 중간중간 쉬어가야 오래 유지돼요.`,
    `정리해서 말하면, 오늘은 감정보다 현실적인 기준을 먼저 세우면 훨씬 부드럽게 지나갈 수 있는 날이에요. 바로 반응하기 전에 한 번만 숨을 고르고, 말이나 결정을 조금 단정하게 다듬어보세요. 특히 ${ms.caution}`
  ].join('\n\n');
}
function generateTemplateAstrologySummary(chart){const sun=chart.planets.find(p=>p.planet==='sun'),moon=chart.planets.find(p=>p.planet==='moon'),venus=chart.planets.find(p=>p.planet==='venus');return `본인의 태양은 ${signNameKo(sun.sign)}, 달은 ${signNameKo(moon.sign)}, 금성은 ${signNameKo(venus.sign)}에 있어요. 삶의 방향은 ${signById(sun.sign).personality} 감정은 ${signById(moon.sign).personality} 관계에서는 ${signById(venus.sign).loveStyle} ${chart.ascendant?`상승궁은 ${signNameKo(chart.ascendant.sign)}라 첫인상과 외적 태도에 그 별자리의 분위기가 더해져요.`:'출생시간이 없어 상승궁과 하우스는 제외했어요.'}`;}
function generateTemplateAstrologyReading(chart){return `# 출생차트 핵심 요약\n\n${generateTemplateAstrologySummary(chart)}\n\n# 현재 운의 흐름\n\n현재 트랜짓은 본인의 기본 성향에 새로운 자극을 더하고 있어요. 중요한 결정은 감정만으로 밀어붙이기보다 실제 조건을 함께 확인하는 편이 좋아요.\n\n# 현실적인 조언\n\n오늘부터는 본인이 반복해서 끌리는 선택과 피하고 싶은 선택을 나누어 적어보세요. 차트는 가능성을 보여주는 지도에 가깝기 때문에, 실제 방향은 작은 행동을 통해 더 선명해져요.\n\n# 종합 결론\n\n이 리딩은 계산된 차트를 바탕으로 한 기본 템플릿이에요. AI 리딩이 잠시 실패했지만, 출생시간과 도시 정보를 다시 확인하면 더 안정적인 결과를 받을 수 있어요.`;}
async function generateAIAstrologyReading(chart,transit,productType){const resp=await fetch(WORKER_URL.replace(/\/$/,'')+'/astrology-reading',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chart,transit,productType,language:currentLanguagePayload()})});if(!resp.ok)throw new Error(`astrology-reading ${resp.status}`);const data=await resp.json();const text=String(data.resultMarkdown||data.text||'').trim();if(!text)throw new Error('empty astrology-reading');return text;}
