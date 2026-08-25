const fs=require('fs'),path=require('path');
const root=process.argv[2]||'app';
const file=path.join(root,'resources','app','gyomuon.js');
let s=fs.readFileSync(file,'utf8');
const A=(c,m)=>{if(!c)throw new Error(m)};
A(/const\s+APP_VERSION\s*=\s*["']0\.81\.69["']\s*;/.test(s),'0.81.69 APP_VERSION missing');
s=s.replace(/const\s+APP_VERSION\s*=\s*["']0\.81\.69["']\s*;/,'const APP_VERSION = "0.81.70";');

// __UEP_08170_SEUTEUK_RECORDBOOK_SPECIFIC__
// NEIS 생활기록부 교과 세특 파일은 학생명이 있으나 학번 열이 없는 출력 형식도 정상 입력으로 취급한다.
// 학번 자체가 없는 원본을 275건 전부 오류로 만드는 기존 보조검증을 제거하고, 반/학생/과목/본문 중심으로 검증한다.
const oldNo="if(!/^\\d{4}$/.test(studentNo)||!classNo)issues.push({category:'학번 확인',hits:[],reason:'학년·반·번호를 안정적으로 복원하지 못했습니다. 원본의 학번/번호 또는 학년·반 표기를 확인하세요.'});";
const newNo="if(!classNo)issues.push({category:'반 확인',hits:[],reason:'원본에서 반 정보를 안정적으로 복원하지 못했습니다. 반 표기를 확인하세요.'});";
A(s.includes(oldNo),'0.81.69 student-number validation block missing');
s=s.replace(oldNo,newNo);

// 학교생활기록부 전용 파서에서는 학교명/학년도/출력 메타데이터가 과목 후보로 승격되지 않도록 방어를 강화한다.
s=s.replace("const metadata=/고등학교|중학교|학교명|학년도|학기|담임|교사|성명|학생명|학번|번호|학년|^반$|출력|조회|나이스|NEIS/i;","const metadata=/고등학교|중학교|학교명|학년도|학기|담임|교사|성명|학생명|학번|번호|학년|^반$|출력|조회|나이스|NEIS|학교생활기록부|교과학습발달상황|페이지|쪽/i;");

// '다음'은 일반 서술어/연결어로 매우 흔하므로 브랜드 단독 검출에서 제외한다.
// 실제 브랜드 문맥(다음카카오/Daum)은 별도 표현으로 계속 잡을 수 있게 한다.
s=s.replace(/\|다음(?=[|/])/g,'');
s=s.replace(/다음\|/g,'');

// 선택과목 대외비 인증 모달 문구를 민감정보 인증과 구분한다.
// subject confidential 인증 흐름에서 재사용된 공통 제목만 문맥적으로 교정한다.
s=s.replace(/(SUBJECT_CONFIDENTIAL[\s\S]{0,600}?)민감정보 열람 인증/g,'$1선택과목 대외비 인증');
s=s.replace(/(subjectConfidential[\s\S]{0,600}?)민감정보 열람 인증/g,'$1선택과목 대외비 인증');

fs.writeFileSync(file,s,'utf8');
const out=fs.readFileSync(file,'utf8');
A(out.includes('__UEP_08169_SUBJECT_SHARED_HASH__'),'0.81.69 subject shared hash marker lost');
A(out.includes('uepNeisRuleStorageKey08169'),'0.81.69 rule manager marker lost');
A(out.includes("category:'반 확인'"),'recordbook no-number tolerance missing');
A(!out.includes(oldNo),'legacy all-students number error remains');
console.log('0.81.70 recordbook-specific seuteuk patch applied');
