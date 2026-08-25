// Pure NEIS recordbook parser core used by UEP 0.81.71 and its regression tests.
function makeNeisRecordbookRecords08171({sheets=[],students=[],defaultGrade='1',forbidden=[],norm=v=>String(v||'').normalize('NFKC').replace(/\s+/g,' ').trim()}={}){
  const rawRecords=[],recordsByKey=new Map();
  const metadata=/고등학교|중학교|학교명|학년도|학기|담임|교사|성명|학생명|학번|번호|학년|^반$|출력|조회|나이스|NEIS|학교생활기록부|교과학습발달상황|페이지|쪽/i;
  const subjectHint=/국어|수학|영어|과학|사회|한국사|체육|음악|미술|정보|한문|일본어|중국어|통합|공통|탐구|문학|독서|화학|물리|생명|지구|윤리|역사|경제|정치|법|지리|기술|가정/i;
  const genericSheet=/^(sheet\d*|시트\d*|교과학습발달상황|세부능력.*특기사항|세특)$/i;
  const cleanSheetSubject=name=>{const s=norm(name).replace(/\(\d+\)$/,'').replace(/^\d+\s*[-_.]\s*/,'').trim();return s&&!genericSheet.test(s)&&s.length<=40?s:'';};
  const validSubject=value=>{const s=norm(value);return !!s&&s.length<=40&&/[가-힣A-Za-z]/.test(s)&&!metadata.test(s)&&!/^(과\s*목|세부능력|특기사항|세특)$/i.test(s)&&!/^\d+(?:\.0)?$/.test(s)&&!/[<>]/.test(s)&&!/^\s*\d+\s*학년\s*\d+\s*반/.test(s)&&!/^\s*\d+\s*[-–]\s*\d+\s*반?\s*$/.test(s);};
  const scalar=(row,keys)=>{for(const k of keys){const v=row?.[k];if(v!==undefined&&v!==null&&String(v).trim()!=='')return norm(v);}return '';};
  const digits=v=>String(v||'').replace(/\.0$/,'').replace(/[^0-9]/g,'');
  const masterEntries=(students||[]).map(student=>{
    const name=scalar(student,['name','studentName','성명','학생명','이름']);
    const studentNo=digits(scalar(student,['studentNo','studentNumber','학번']));
    let grade=digits(scalar(student,['grade','학년'])),classNo=digits(scalar(student,['classNo','class','반','학급'])),number=digits(scalar(student,['number','no','번호','번']));
    if(/^\d{4}$/.test(studentNo)){grade=grade||studentNo.slice(0,1);classNo=classNo||String(parseInt(studentNo.slice(1,2),10));number=number||studentNo.slice(2,4);}
    if(number)number=String(parseInt(number,10));
    if(classNo)classNo=String(parseInt(classNo,10));
    return {student,name,studentNo,grade,classNo,number};
  }).filter(x=>x.name||x.studentNo);
  const masterFull=new Map(),masterNumber=new Map(),masterName=new Map();
  const addUnique=(map,key,value)=>{if(!key)return;if(!map.has(key))map.set(key,value);else map.set(key,null);};
  masterEntries.forEach(entry=>{
    addUnique(masterFull,[entry.grade,entry.classNo,entry.number,entry.name].join('|'),entry);
    addUnique(masterNumber,[entry.grade,entry.classNo,entry.number].join('|'),entry);
    addUnique(masterName,[entry.grade,entry.classNo,entry.name].join('|'),entry);
  });
  const findMaster=(grade,classNo,number,name)=>{
    const full=masterFull.get([grade,classNo,number,name].join('|'));if(full)return full;
    const byNo=masterNumber.get([grade,classNo,number].join('|'));if(byNo&&(!name||!byNo.name||byNo.name===name))return byNo;
    const byName=masterName.get([grade,classNo,name].join('|'));if(byName)return byName;
    return null;
  };
  const findHeader=rows=>{let best={index:0,score:-1,row:rows[0]||[]};rows.slice(0,40).forEach((row,index)=>{const t=(row||[]).map(norm).join('|');const score=[/학번|번호/,/성명|학생명|이름/,/과\s*목/,/세부능력|특기사항|세특/].filter(rx=>rx.test(t)).length;if(score>best.score)best={index,score,row};});return best;};
  const parseSection=cells=>{for(const cell of cells){const m=cell.match(/(?:^|\s)([1-3])\s*학년\s*([1-9]|1[0-9])\s*반(?:\s|$)/)||cell.match(/^([1-3])\s*[-–]\s*([1-9]|1[0-9])\s*반?\s*$/);if(m)return {grade:String(parseInt(m[1],10)),classNo:String(parseInt(m[2],10))};}return null;};
  const appendText=(a,b)=>{a=norm(a);b=norm(b);if(!a)return b;if(!b)return a;return a+' '+b;};
  (sheets||[]).forEach(sheet=>{
    const rows=Array.isArray(sheet?.rows)?sheet.rows:[];if(!rows.length)return;
    const h=findHeader(rows),headers=(h.row||[]).map((v,i)=>norm(v)||('열'+(i+1)));
    const findIndex=rx=>headers.findIndex(x=>rx.test(x));
    const subjectIndex=findIndex(/과목명|교과목|^과\s*목$/),gradeIndex=findIndex(/^학\s*년$|^학년$/),semesterIndex=findIndex(/^학기$/),classIndex=findIndex(/^반$|^학급$|^반명$/),numberIndex=findIndex(/^학번$|^학생번호$|^번호$|^번\s*호$/),nameIndex=findIndex(/성명|학생명|성\s*명|이름/),textIndex=findIndex(/세부능력|특기사항|세특/);
    let currentSubject=cleanSheetSubject(sheet?.name||''),currentGrade=String(defaultGrade||'1'),currentClass='',currentSemester='';
    rows.slice(h.index+1).forEach((row,rowIndex)=>{
      const cells=(row||[]).map(norm);if(!cells.some(Boolean))return;
      const sourceRow=rowIndex+h.index+2;
      const section=parseSection(cells);if(section){currentGrade=section.grade;currentClass=section.classNo;if(!cells.some(x=>x.length>=10&&!metadata.test(x)))return;}
      const repeatedHeader=cells.some(x=>/^과\s*목$/.test(x))&&cells.some(x=>/세부능력|특기사항/.test(x));if(repeatedHeader)return;
      if(gradeIndex>=0){const v=digits(cells[gradeIndex]);if(/^[1-3]$/.test(v))currentGrade=v;}
      if(classIndex>=0){const v=digits(cells[classIndex]);if(/^([1-9]|1[0-9])$/.test(v))currentClass=String(parseInt(v,10));}
      if(semesterIndex>=0){const v=digits(cells[semesterIndex]);if(/^[12]$/.test(v))currentSemester=v;}
      const rawSubject=subjectIndex>=0?(cells[subjectIndex]||''):'';
      if(validSubject(rawSubject)&&subjectHint.test(rawSubject))currentSubject=rawSubject;
      else if(!currentSubject){const candidates=cells.filter((x,i)=>![nameIndex,textIndex,gradeIndex,classIndex,numberIndex,semesterIndex].includes(i)&&validSubject(x)&&subjectHint.test(x));if(candidates.length)currentSubject=candidates[0];}
      const rawNo=numberIndex>=0?(cells[numberIndex]||''):'';
      let cleanNo=digits(rawNo);const fourDigit=cells.find(x=>/^[1-3]\d{3}(?:\.0)?$/.test(x));if(fourDigit)cleanNo=digits(fourDigit);
      let grade=currentGrade||String(defaultGrade||'1'),classNo=currentClass,number='';
      if(/^\d{4}$/.test(cleanNo)){grade=cleanNo.slice(0,1);classNo=String(parseInt(cleanNo.slice(1,2),10));number=String(parseInt(cleanNo.slice(2,4),10));}
      else if(cleanNo)number=String(parseInt(cleanNo,10));
      let name=nameIndex>=0?(cells[nameIndex]||''):'';if(!name)name=cells.find((x,i)=>i!==textIndex&&/^[가-힣]{2,5}$/.test(x)&&x!==currentSubject)||'';
      let text=textIndex>=0?(cells[textIndex]||''):'';if(!text)text=cells.filter((x,i)=>i!==subjectIndex&&i!==nameIndex&&x.length>=15&&!metadata.test(x)).sort((a,b)=>b.length-a.length)[0]||'';
      if(text.length<10||(!name&&!number))return;
      let subject=validSubject(rawSubject)&&subjectHint.test(rawSubject)?rawSubject:(validSubject(currentSubject)?currentSubject:cleanSheetSubject(sheet?.name||''));if(!validSubject(subject))subject='과목 미확인';
      const master=findMaster(grade,classNo,number,name);
      let studentNo='';if(master){name=master.name||name;studentNo=master.studentNo||'';grade=master.grade||grade;classNo=master.classNo||classNo;number=master.number||number;}
      if(!studentNo&&grade&&classNo&&number){studentNo=(String(classNo).length===1?`${grade}${classNo}${String(number).padStart(2,'0')}`:`${grade}${String(classNo).padStart(2,'0')}${String(number).padStart(2,'0')}`);}
      const studentId=master?.student?.id||master?.student?.studentId||master?.student?.['학생ID']||studentNo;
      const mergeKey=[studentId||studentNo||[grade,classNo,number,name].join('-'),subject,currentSemester].join('|');
      const existing=recordsByKey.get(mergeKey);
      if(existing){existing.text=appendText(existing.text,text);existing.lastRow=sourceRow;existing.sourceRows.push(sourceRow);return;}
      const record={id:[sheet?.name||'',sourceRow,studentId||studentNo,name,subject].join(':'),sheet:String(sheet?.name||''),row:sourceRow,lastRow:sourceRow,sourceRows:[sourceRow],studentId:String(studentId||''),studentNo:String(studentNo||''),name,grade:String(grade||''),classNo:String(classNo||''),number:String(number||''),semester:String(currentSemester||''),subject,text,issues:[],masterMatched:Boolean(master)};
      recordsByKey.set(mergeKey,record);rawRecords.push(record);
    });
  });
  rawRecords.forEach(record=>{
    const issues=[];forbidden.forEach(rule=>{const [category,rx,enabled]=rule||[];if(enabled===false||!(rx instanceof RegExp))return;rx.lastIndex=0;const hits=[...record.text.matchAll(rx)].map(m=>m[0]);if(hits.length)issues.push({category,hits:[...new Set(hits)],reason:'2026 학교생활기록부 기재요령 및 학교 점검 규칙에 따라 문맥 확인이 필요합니다.'});});
    if(record.subject==='과목 미확인')issues.push({category:'과목 미확인',hits:[],reason:'원본 엑셀에서 과목명을 연결하지 못했습니다.'});
    if(!record.classNo)issues.push({category:'반 확인',hits:[],reason:'원본에서 반 정보를 안정적으로 복원하지 못했습니다. 반 표기를 확인하세요.'});
    if(!record.masterMatched&&students?.length)issues.push({category:'학생 확인',hits:[],reason:'학생마스터에서 학년·반·번호·성명 일치 학생을 찾지 못했습니다.'});
    if(/[A-Za-z]{12,}/.test(record.text))issues.push({category:'긴 영문 표현',hits:(record.text.match(/[A-Za-z][A-Za-z\s-]{11,}/g)||[]).slice(0,4),reason:'불필요한 영문 표현 또는 고유명사 여부를 확인하세요.'});
    if(/[=<>±×÷√∑∫^_{}]/.test(record.text))issues.push({category:'수식·특수기호',hits:(record.text.match(/[=<>±×÷√∑∫^_{}]+/g)||[]).slice(0,6),reason:'나이스 입력과 한글 서술 원칙에 맞는 표현인지 확인하세요.'});
    record.issues=issues;
  });
  return rawRecords;
}
if(typeof module!=='undefined'&&module.exports)module.exports={makeNeisRecordbookRecords08171};
