// Final robust script.js — ready-to-submit
(function(){
  // ---- small helpers ----
  const $ = id => document.getElementById(id);

  // Elements
  const startBtn = $('startBtn');
  const resetBtn = $('resetBtn');
  const resumeFile = $('resumeFile');
  const resumeFileName = $('resumeFileName');
  const resumeArea = $('resume');
  const jdArea = $('jd');
  const timePerQInput = $('timePerQ');
  const maxQInput = $('maxQ');

  const interviewCard = $('interviewCard');
  const questionText = $('questionText');
  const answerArea = $('answer');
  const submitBtn = $('submitAnswer');
  const endEarlyBtn = $('endEarly');
  const liveScore = $('liveScore');
  const qIndexEl = $('qIndex');
  const qMaxEl = $('qMax');
  const timerEl = $('timeLeft');

  const resultCard = $('resultCard');
  const finalScoreEl = $('finalScore');
  const feedbackTextEl = $('feedbackText');
  const jdMatchEl = $('jdMatch');
  const topKeywordsEl = $('topKeywords');
  const downloadJsonBtn = $('downloadJson');

  const themeToggle = $('themeToggle');
  const sampleFillBtn = $('sampleFill');
  const progressFill = $('progressFill');

  // ---- theme
  function applyTheme(pref){
    if(pref === 'light'){ document.documentElement.classList.add('light'); themeToggle.textContent = '🌞 Day'; themeToggle.setAttribute('aria-pressed','true'); }
    else { document.documentElement.classList.remove('light'); themeToggle.textContent = '🌙 Night'; themeToggle.setAttribute('aria-pressed','false'); }
    try { localStorage.setItem('hack2hire_theme', pref); } catch(e){}
  }
  themeToggle.addEventListener('click', ()=> {
    const isLight = document.documentElement.classList.contains('light');
    applyTheme(isLight ? 'dark' : 'light');
  });
  applyTheme(localStorage.getItem('hack2hire_theme') || 'dark');

  // ---- file upload
  resumeFile.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if(!f) { resumeFileName.textContent = 'No file chosen'; return; }
    resumeFileName.textContent = f.name;
    const reader = new FileReader();
    reader.onload = () => { resumeArea.value = reader.result; };
    if(f.type.startsWith('text') || f.name.endsWith('.md')) reader.readAsText(f, 'utf-8');
    else {
      alert('Only .txt or .md files are supported for upload in this MVP. For PDFs, copy-paste text into the box.');
      resumeFile.value = '';
      resumeFileName.textContent = 'No file chosen';
    }
  });

  // ---- sample fill
  sampleFillBtn.addEventListener('click', ()=> {
    resumeArea.value = "Name: Jayaditya Saloi\nSkills: JavaScript, React, Node.js, REST APIs, SQL, Data Structures, Algorithms\nProjects: Sorting Visualizer, Campus Portal\nExperience: Intern - frontend and backend integration";
    jdArea.value = "Role: Frontend Engineer\nRequirements: Strong JavaScript, React, REST APIs, data structures and algorithms experience.\nResponsibilities: Build responsive UI, integrate REST APIs, write clean code.";
  });

  // ---- text processing (TF-IDF simple) ----
  function tokenize(text){
    if(!text) return [];
    const stop = new Set(["the","and","for","with","that","this","are","you","your","have","has","a","an","to","of","in","on","by","be","as","or","at","from","we","our","will","it"]);
    return text.toLowerCase().replace(/[^\w\s\+]/g,' ').split(/\s+/).filter(w => w.length > 2 && !stop.has(w));
  }
  function termFreq(tokens){ const tf={}; tokens.forEach(t=>tf[t]=(tf[t]||0)+1); return tf; }
  function computeIdf(tfMaps){ const df={}; const N=tfMaps.length; tfMaps.forEach(tf=> Object.keys(tf).forEach(k=>df[k]=(df[k]||0)+1)); const idf={}; Object.keys(df).forEach(k=>idf[k]=Math.log((N+1)/(df[k]+1))+1); return idf; }
  function tfIdfVector(tf, idf){ const v={}; Object.keys(tf).forEach(k=> v[k] = (tf[k]||0)*(idf[k]||0)); return v; }
  function cosineSim(a,b){ let num=0,na=0,nb=0; Object.keys(a).forEach(k=>{ const va=a[k]||0, vb=b[k]||0; num+=va*vb; na+=va*va; }); Object.keys(b).forEach(k=>{ const vb=b[k]||0; nb+=vb*vb; }); if(na===0||nb===0) return 0; return num/(Math.sqrt(na)*Math.sqrt(nb)); }

  function computeResumeJdSimilarity(resumeText, jdText, top=8){
    const rTokens = tokenize(resumeText), jTokens = tokenize(jdText);
    const rTf = termFreq(rTokens), jTf = termFreq(jTokens);
    const idf = computeIdf([rTf, jTf]);
    const rVec = tfIdfVector(rTf, idf), jVec = tfIdfVector(jTf, idf);
    const sim = cosineSim(rVec, jVec);
    const jTerms = Object.keys(jVec).map(k=>({k,v:jVec[k]})).sort((a,b)=>b.v-a.v).slice(0,top).map(x=>x.k);
    return { similarity: sim, topTerms: jTerms };
  }

  // ---- question bank ----
  const questionBank = {
    easy: [
      {id:1, skill:'algorithms', text:'Explain array vs linked list.', keywords:['array','linked','pointer']},
      {id:2, skill:'behavioral', text:'Tell me about a time you faced a bug and how you fixed it.', keywords:['bug','debug','fix']},
      {id:3, skill:'system', text:'What is a REST API and how do clients communicate?', keywords:['rest','api','http']}
    ],
    medium: [
      {id:11, skill:'algorithms', text:'Describe quicksort and its average/worst-case complexity.', keywords:['quicksort','pivot','partition']},
      {id:12, skill:'design', text:'Design a URL shortener: components and data flow.', keywords:['hash','redirect','database']},
      {id:13, skill:'behavioral', text:'Describe prioritization when deadlines conflict.', keywords:['priorit','deadline','stakeholder']}
    ],
    hard: [
      {id:21, skill:'system', text:'Design a scalable chat system: key components and data flow.', keywords:['websocket','queue','scale']},
      {id:22, skill:'design', text:'How to ensure consistency across distributed systems?', keywords:['consistency','replication','consensus']},
      {id:23, skill:'algorithms', text:'Dynamic programming vs divide-and-conquer: explain with example.', keywords:['dynamic','memoization','optimal']}
    ]
  };

  // ---- scoring helpers ----
  function computeAnswerScore(answer, expectedKeywords, timeTaken, timeLimit){
    const a = (answer||'').toLowerCase();
    const present = (expectedKeywords||[]).filter(k => a.includes(k.toLowerCase()));
    const accuracy = Math.min(1, present.length / Math.max(1, expectedKeywords.length));
    const clarity = Math.min(1, Math.max(0.15, a.split(/\s+/).length / 20));
    const timePenalty = Math.max(0, (timeTaken - timeLimit)/timeLimit);
    const timeEfficiency = Math.max(0, 1 - timePenalty);
    const score = Math.round((accuracy*0.55 + clarity*0.25 + timeEfficiency*0.2) * 100);
    return { score, accuracy, clarity, timeEfficiency, present };
  }

  function generateHumanFeedback(finalScore, breakdown){
    const lines = [];
    if(finalScore >= 75) lines.push("Overall performance is strong. You're interview-ready for similar roles.");
    else if(finalScore >= 50) lines.push("Overall performance is average. Focused practice can raise your readiness.");
    else lines.push("Overall performance needs improvement. Strengthen fundamentals and practice mock interviews.");

    const suggestions = {
      algorithms: "Practice arrays, trees and hashing; explain time complexity and approach clearly.",
      system: "Draw simple diagrams (components, data flow); explain trade-offs between consistency and availability.",
      behavioral: "Use STAR (Situation-Task-Action-Result) to structure responses with measurable outcomes.",
      design: "Practice low-level API & data modeling; explain failure modes and trade-offs.",
      general: "Structure answers: summary → approach → details → complexity."
    };

    Object.keys(breakdown).forEach(skill=>{
      const s = Math.round(breakdown[skill]);
      if(s >= 70) lines.push(`Good performance in ${skill}. Maintain this by rehearsing similar problems.`);
      else if(s >= 50) lines.push(`${skill}: moderate performance. ${suggestions[skill] || suggestions.general}`);
      else lines.push(`${skill}: needs improvement. ${suggestions[skill] || suggestions.general}`);
    });

    lines.push("Tip: Record short answers, compare with feedback, and iterate.");
    return lines.join(' ');
  }

  function saveResultForJudges(resultObj){
    try { localStorage.setItem('hack2hire_result', JSON.stringify(resultObj)); } catch(e){ console.warn("localStorage failed", e); }
  }

  // ---- selection helper (prevents repeats, returns matched term) ----
  function pickQuestion(difficulty, preferredTerms) {
    const pool = (questionBank[difficulty] || []).slice();
    // filter unused by id if possible
    const unused = pool.filter(q => !state.usedQuestionIds.has(q.id));
    const searchPool = unused.length ? unused : pool;
    if (preferredTerms && preferredTerms.length) {
      for (let t of preferredTerms) {
        const found = searchPool.find(q => (q.keywords||[]).some(k => k.includes(t)) || q.text.toLowerCase().includes(t));
        if (found) return { question: found, matchedTerm: t };
      }
    }
    const random = searchPool[Math.floor(Math.random() * searchPool.length)];
    return { question: random, matchedTerm: null };
  }

  // ---- state ----
  let state = {
    resume: '',
    jd: '',
    topTerms: [],
    jdMatch: 0,
    timePerQ: 90,
    maxQ: 6,
    currentIndex: 0,
    difficulty: 'easy',
    history: [],
    running: false,
    timerInterval: null,
    timeLeft: 0,
    questionStartTs: 0,
    usedQuestionIds: new Set()
  };

  // ---- UI init: show qMax and wire keyboard submit ----
  (function initUI(){
    qMaxEl.textContent = Math.max(1, parseInt(maxQInput.value,10) || 6);
    maxQInput.addEventListener('change', ()=> qMaxEl.textContent = Math.max(1, parseInt(maxQInput.value,10) || 6));

    // Ctrl/Cmd + Enter to submit
    answerArea.addEventListener('keydown', (e) => {
      const isEnter = e.key === 'Enter';
      if (isEnter && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        submitAnswer(false);
      }
    });
  })();

  // ---- flow control binding (guards) ----
  startBtn.addEventListener('click', () => {
    if (state.running) return;
    startInterview();
  });
  resetBtn.addEventListener('click', resetAll);
  submitBtn.addEventListener('click', ()=> submitAnswer(false));
  endEarlyBtn.addEventListener('click', ()=> finishInterview(true));
  downloadJsonBtn.addEventListener('click', downloadResult);

  // ---- small progress helper ----
  function setProgress(){
    try {
      const pct = Math.round((state.currentIndex / (state.maxQ || 1)) * 100);
      if(progressFill) progressFill.style.width = `${pct}%`;
    } catch(e){}
  }

  // ---- main flow functions ----
  let SUBMIT_LOCK = false;

  function startInterview(){
    // read and validate inputs
    state.resume = resumeArea.value || '';
    state.jd = jdArea.value || '';
    state.timePerQ = Math.max(5, parseInt(timePerQInput.value,10) || 90);
    state.maxQ = Math.max(1, Math.min(100, parseInt(maxQInput.value,10) || 6));

    if(!state.resume.trim()){
      if(!confirm("Resume is empty. Continue without resume?")) return;
    }

    // compute JD match + top terms
    const sim = computeResumeJdSimilarity(state.resume, state.jd);
    state.jdMatch = Math.round(sim.similarity * 100);
    state.topTerms = sim.topTerms || [];
    jdMatchEl.textContent = state.jdMatch + '%';
    topKeywordsEl.innerHTML = '';
    (state.topTerms || []).forEach(t => {
      const s = document.createElement('span'); s.className = 'key'; s.textContent = t; topKeywordsEl.appendChild(s);
    });

    // prepare state
    state.currentIndex = 0;
    state.difficulty = 'easy';
    state.history = [];
    state.running = true;
    state.usedQuestionIds = new Set();
    qMaxEl.textContent = state.maxQ;
    setProgress();

    startBtn.disabled = true;
    resetBtn.disabled = true;
    // show interview UI
    interviewCard.style.display = '';
    resultCard.style.display = 'none';
    liveScore.textContent = '';

    // focus first question after small delay
    setTimeout(()=> { showQuestion(); }, 200);
  }

  function showQuestion(){
    if (!state.running) return;
    if(state.currentIndex >= state.maxQ){
      finishInterview(false);
      return;
    }

    const preferred = state.topTerms || [];
    const pick = pickQuestion(state.difficulty, preferred);
    const q = pick.question || { id: 'fallback', skill: 'general', text: 'Explain briefly why you are a good fit for this role.', keywords: [] };
    const matched = pick.matchedTerm || null;

    state.currentQuestion = q;
    if (q && q.id) state.usedQuestionIds.add(q.id);

    state.timeLeft = state.timePerQ;
    state.questionStartTs = Date.now();
    timerEl.textContent = state.timeLeft;
    qIndexEl.textContent = state.currentIndex + 1;
    questionText.textContent = q.text;
    const whyDom = $('whyQuestion');
    if (whyDom) whyDom.textContent = matched ? `Selected because JD contains: "${matched}"` : `Selected randomly (no JD keyword match).`;

    answerArea.value = '';
    liveScore.textContent = '';
    submitBtn.disabled = false;
    answerArea.focus();

    if(state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
    state.timerInterval = setInterval(()=> {
      state.timeLeft -= 1;
      timerEl.textContent = state.timeLeft;
      if(state.timeLeft <= 0){
        if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
        submitAnswer(true);
      }
    }, 1000);

    setProgress();
  }

  function submitAnswer(auto=false){
    if(!state.running) return;
    if (SUBMIT_LOCK) return;
    SUBMIT_LOCK = true;

    submitBtn.disabled = true;
    if(state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }

    const now = Date.now();
    const timeTaken = Math.max(0, Math.round((now - state.questionStartTs) / 1000));
    const q = state.currentQuestion || { keywords: [] };
    const result = computeAnswerScore(answerArea.value, q.keywords || [], timeTaken, state.timePerQ);
    result.question = q;
    result.timeTaken = timeTaken;
    result.difficulty = state.difficulty;
    state.history.push(result);

    // adjust difficulty
    if(result.score >= 70){
      if(state.difficulty === 'easy') state.difficulty = 'medium';
      else if(state.difficulty === 'medium') state.difficulty = 'hard';
    } else if(result.score < 40){
      if(state.difficulty === 'hard') state.difficulty = 'medium';
      else if(state.difficulty === 'medium') state.difficulty = 'easy';
    }

    liveScore.textContent = `Last score: ${result.score}`;

    // early termination check
    const avgSoFar = Math.round(state.history.reduce((s,r)=>s+r.score,0) / state.history.length);
    if(state.history.length >= 3 && avgSoFar < 30){
      setTimeout(()=> { SUBMIT_LOCK = false; finishInterview(true); }, 500);
      return;
    }

    // next
    state.currentIndex += 1;
    if(state.currentIndex >= state.maxQ){
      setTimeout(()=> { SUBMIT_LOCK = false; finishInterview(false); }, 400);
    } else {
      setTimeout(()=> { SUBMIT_LOCK = false; showQuestion(); }, 600);
    }
  }

  function finishInterview(early=false){
    state.running = false;
    if(state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }

    const total = state.history.reduce((s,r)=>s+r.score,0);
    const avg = state.history.length ? Math.round(total / state.history.length) : 0;
    const bySkill = {};
    state.history.forEach(r=>{
      const sk = (r.question && r.question.skill) || 'general';
      if(!bySkill[sk]) bySkill[sk] = {count:0,score:0};
      bySkill[sk].count += 1;
      bySkill[sk].score += r.score;
    });
    const breakdown = {};
    Object.keys(bySkill).forEach(k => breakdown[k] = Math.round(bySkill[k].score / bySkill[k].count));

    let category = 'Needs Improvement';
    if(avg >= 75) category = 'Strong';
    else if(avg >= 50) category = 'Average';

    const feedback = generateHumanFeedback(avg, breakdown);
    const resultObj = {
      finalScore: avg,
      category,
      breakdown,
      feedback,
      history: state.history,
      jdMatch: state.jdMatch,
      topTerms: state.topTerms,
      date: new Date().toISOString(),
      early
    };

    interviewCard.style.display = 'none';
    resultCard.style.display = '';

    finalScoreEl.innerHTML = `${resultObj.finalScore} / 100 — <small>${resultObj.category}</small>`;
    feedbackTextEl.textContent = resultObj.feedback;

    saveResultForJudges(resultObj);
    window.__lastResult = resultObj;

    startBtn.disabled = false;
    resetBtn.disabled = false;

    setProgress();
  }

  function downloadResult(){
    const data = JSON.stringify(window.__lastResult || {}, null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'interview_result.json'; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function resetAll(){
    if(!confirm('Reset application state?')) return;
    resumeArea.value = ''; jdArea.value = '';
    resumeFile.value = ''; resumeFileName.textContent = 'No file chosen';
    jdMatchEl.textContent = '—'; topKeywordsEl.innerHTML = '';
    interviewCard.style.display = 'none'; resultCard.style.display = 'none';
    startBtn.disabled = false; resetBtn.disabled = false;
    try { localStorage.removeItem('hack2hire_result'); } catch(e){}
    window.__lastResult = null;
    state = {
      resume: '', jd: '', topTerms: [], jdMatch: 0, timePerQ: 90, maxQ: 6,
      currentIndex: 0, difficulty: 'easy', history: [], running: false,
      timerInterval: null, timeLeft: 0, questionStartTs: 0, usedQuestionIds: new Set()
    };
    setProgress();
  }

  // Safety: prevent accidental dblclick weirdness
  startBtn.addEventListener('dblclick', (e)=> e.preventDefault());

  // Debug helper (disabled in production)
  // window.hack2hire = { state };

})();
