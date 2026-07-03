/**
 * WebCraft Finance - faqEngine.js
 * Lightweight, dependency-free question matcher for the Financial Friend / AI Coach chat.
 *
 * Given whatever the user types into the coach chat box, this finds the closest
 * matching entry in window.FAQ_DATA (200 canned Q&A pairs parsed from
 * question_ai_ask.md) using TF-IDF weighted cosine similarity over normalized
 * keywords -- NOT exact string matching. This means:
 *
 *   1. Word order doesn't matter ("SIP step up" == "step up SIP").
 *   2. Rephrased/"twisted" questions still match ("should i stop my sip in a
 *      crash" matches "72. Should I stop my SIP when the market is crashing?").
 *   3. Word FORM doesn't matter ("investing"/"invested"/"investment" all
 *      collapse to the same underlying keyword via normalizePhrases() +
 *      WORD_SYNONYMS + the light stemmer below).
 *   4. Common finance shorthand/full-name pairs are unified ("systematic
 *      investment plan" == "SIP", "step-up"/"step up"/"stepup" are all the
 *      same token, etc.) via the PHRASE_MAP.
 *
 * Must be loaded AFTER faqData.js and BEFORE aiCoach.js.
 * Runs directly in browser via file:// (no ES module CORS issues).
 */
(function() {

  // Common English/question filler words we don't want influencing the match.
  const STOPWORDS = new Set([
    'a','an','the','is','are','was','were','be','been','being','am',
    'what','who','whom','which','how','why','when','where',
    'do','does','did','doing','done',
    'can','could','will','would','shall','should','may','might','must',
    'i','me','my','mine','you','your','yours','it','its','they','them','their',
    'to','of','in','on','at','for','with','about','into','onto','from','by','as',
    'and','or','but','if','so','than','then','that','this','these','those',
    'not','no','yes','ok','okay',
    'there','here','also','just','really','very','get','got','have','has','had',
    'up','down','out','over','under','again','once','all','any','some','such',
    'happens','happen','work','works','mean','means','use','using','used'
  ]);

  // Multi-word phrases -> a single canonical token. Runs on the raw lowercased
  // string BEFORE splitting into words, so word order/spacing/hyphens don't matter.
  const PHRASE_MAP = [
    [/\bsystematic\s+investment\s+plans?\b/g, 'sip'],
    [/\bsystematic\s+withdrawal\s+plans?\b/g, 'swp'],
    [/\bstep[\s-]*up\b/g, 'stepup'],
    [/\bstep[\s-]*down\b/g, 'stepdown'],
    [/\bcompound(?:ed|ing)?\s+interest\b/g, 'compounding'],
    [/\bextended\s+internal\s+rate\s+of\s+return\b/g, 'xirr'],
    [/\bcompound(?:ed)?\s+annual\s+growth\s+rate\b/g, 'cagr'],
    [/\bfinancial\s+independence,?\s+retire\s+early\b/g, 'fire'],
    [/\brupee\s+cost\s+averaging\b/g, 'costaveraging'],
    [/\bdollar\s+cost\s+averaging\b/g, 'costaveraging'],
    [/\bcapital\s+gains?\s+tax(es)?\b/g, 'capitalgainstax'],
    [/\block[\s-]*in\s+period\b/g, 'lockin'],
    [/\bmutual\s+funds?\b/g, 'mutualfund'],
    [/\basset\s+allocations?\b/g, 'allocation'],
    [/\bemergency\s+funds?\b/g, 'emergencyfund'],
    [/\bmarket\s+crash(es|ing|ed)?\b/g, 'crash'],
    [/\blump[\s-]*sum\b/g, 'lumpsum']
  ];

  // Single-word variants -> canonical form. Runs AFTER splitting into tokens,
  // so "investing"/"invested"/"investments" all become "invest", etc.
  const WORD_SYNONYMS = {
    investing: 'invest', invested: 'invest', investment: 'invest', investments: 'invest', invests: 'invest',
    withdrawing: 'withdraw', withdrawn: 'withdraw', withdrawal: 'withdraw', withdrawals: 'withdraw', withdraws: 'withdraw',
    rebalancing: 'rebalance', rebalanced: 'rebalance', rebalances: 'rebalance',
    crashing: 'crash', crashed: 'crash', crashes: 'crash',
    retiring: 'retire', retired: 'retire', retirement: 'retire',
    saving: 'save', savings: 'save', saved: 'save', saves: 'save',
    growing: 'grow', growth: 'grow', grew: 'grow', grown: 'grow',
    returns: 'return', returning: 'return', returned: 'return',
    risky: 'risk', risks: 'risk', riskier: 'risk', riskiest: 'risk',
    funds: 'fund', funded: 'fund', funding: 'fund',
    earning: 'earn', earnings: 'earn', earned: 'earn', earns: 'earn',
    paying: 'pay', payment: 'pay', payments: 'pay', payouts: 'pay', payout: 'pay',
    dropping: 'drop', dropped: 'drop', drops: 'drop',
    falling: 'fall', fell: 'fall', falls: 'fall',
    rising: 'rise', rose: 'rise', rises: 'rise',
    buying: 'buy', bought: 'buy', buys: 'buy',
    selling: 'sell', sold: 'sell', sells: 'sell',
    losing: 'lose', lost: 'lose', losses: 'lose', loses: 'lose',
    starting: 'start', started: 'start', starts: 'start',
    stopping: 'stop', stopped: 'stop', stops: 'stop',
    pausing: 'pause', paused: 'pause', pauses: 'pause',
    goals: 'goal', targets: 'goal', target: 'goal'
  };

  // Very light generic stemmer, used as a fallback for word forms not covered
  // by WORD_SYNONYMS above (e.g. plain plurals/gerunds of less common words).
  function stem(word) {
    if (word.length <= 4) return word;
    if (/(sses|shes|ches|xes)$/.test(word)) return word.slice(0, -2);
    if (/ies$/.test(word) && word.length > 5) return word.slice(0, -3) + 'y';
    if (/ing$/.test(word) && word.length > 6) return word.slice(0, -3);
    if (/ed$/.test(word) && word.length > 5) return word.slice(0, -2);
    if (/s$/.test(word) && !/ss$/.test(word) && word.length > 4) return word.slice(0, -1);
    return word;
  }

  function normalizePhrases(str) {
    let s = str.toLowerCase();
    PHRASE_MAP.forEach(([re, repl]) => { s = s.replace(re, repl); });
    return s;
  }

  function tokenize(str) {
    if (!str) return [];
    const normalized = normalizePhrases(str)
      .replace(/['’]/g, '')          // don't -> dont
      .replace(/[^a-z0-9]+/g, ' ');  // remaining punctuation/hyphens become spaces

    return normalized
      .split(' ')
      .filter(t => t.length > 1 && !STOPWORDS.has(t))
      .map(t => WORD_SYNONYMS[t] || stem(t));
  }

  let index = null; // { entries: [{...faq, tokens, vec, norm, vecAll, normAll}], idf: {term: weight} }

  // Answer-text keywords count for less than question-text keywords: the question
  // defines what the entry IS about, the answer just elaborates. This lets a query
  // like "withdraw money automatically every month" still find "What is an SWP?"
  // even though the word "withdraw" only appears in that entry's answer, not its
  // (very short) question text. It's used as a second-pass fallback ONLY (see
  // scoreQuery below) so it never dilutes the precision of direct question matches.
  const ANSWER_WEIGHT = 0.35;

  // See the comment above e.norm below for why this exists.
  const NORM_PIVOT = 1.2;

  function buildIndex() {
    const faqData = window.FAQ_DATA || [];
    const entries = faqData.map(e => ({
      id: e.id,
      question: e.question,
      answer: e.answer,
      tokens: tokenize(e.question),
      answerTokens: tokenize(e.answer)
    }));

    // Document frequency across question + answer text combined (each entry
    // contributes a term at most once, regardless of how many times it repeats).
    const df = {};
    entries.forEach(e => {
      const vocab = new Set([...e.tokens, ...e.answerTokens]);
      vocab.forEach(t => { df[t] = (df[t] || 0) + 1; });
    });

    const N = entries.length || 1;
    const idf = {};
    Object.keys(df).forEach(t => {
      // Smoothed idf so no term ever hits zero weight
      idf[t] = Math.log((N + 1) / (df[t] + 0.5)) + 1;
    });

    entries.forEach(e => {
      // Vector A: question text ONLY -- used first, for high-precision direct matches.
      const tfQ = {};
      e.tokens.forEach(t => { tfQ[t] = (tfQ[t] || 0) + 1; });
      const vec = {};
      let normSq = 0;
      Object.keys(tfQ).forEach(t => {
        const w = tfQ[t] * (idf[t] || 1);
        vec[t] = w;
        normSq += w * w;
      });
      e.vec = vec;
      // Pivot normalization: add a small constant before sqrt so a 1-2 word question
      // ("What is a SIP?") can't reach cosine~1.0 against ANY query that happens to
      // share just that one word -- without this, ultra-short questions act like a
      // "black hole" that wins matches it has no business winning as the dataset grows.
      e.norm = Math.sqrt(normSq + NORM_PIVOT) || 1;

      // Vector B: question + (down-weighted) answer text -- used only as a fallback,
      // for descriptive queries that never use the question's own wording.
      const tfAll = { ...tfQ };
      e.answerTokens.forEach(t => { tfAll[t] = (tfAll[t] || 0) + ANSWER_WEIGHT; });
      const vecAll = {};
      let normAllSq = 0;
      Object.keys(tfAll).forEach(t => {
        const w = tfAll[t] * (idf[t] || 1);
        vecAll[t] = w;
        normAllSq += w * w;
      });
      e.vecAll = vecAll;
      e.normAll = Math.sqrt(normAllSq + NORM_PIVOT) || 1;
    });

    index = { entries, idf };
  }

  // Fallback weight for a query term never seen in any FAQ question/answer.
  const UNSEEN_TERM_WEIGHT = 0.6;

  function buildQueryVector(query) {
    const qTokens = tokenize(query);
    const qtf = {};
    qTokens.forEach(t => { qtf[t] = (qtf[t] || 0) + 1; });
    const qvec = {};
    let qNormSq = 0;
    Object.keys(qtf).forEach(t => {
      const w = qtf[t] * (index.idf[t] || UNSEEN_TERM_WEIGHT);
      qvec[t] = w;
      qNormSq += w * w;
    });
    return { qvec, qNorm: Math.sqrt(qNormSq) || 1, qTokens };
  }

  function bestMatch(qvec, qNorm, vecKey, normKey) {
    let best = null, bestScore = 0, second = null, secondScore = 0;

    index.entries.forEach(e => {
      let dot = 0;
      for (const t in qvec) {
        if (e[vecKey][t]) dot += qvec[t] * e[vecKey][t];
      }
      if (dot === 0) return;
      const sim = dot / (qNorm * e[normKey]);

      if (sim > bestScore) {
        second = best; secondScore = bestScore;
        best = e; bestScore = sim;
      } else if (sim > secondScore) {
        second = e; secondScore = sim;
      }
    });

    return { best, bestScore, second, secondScore };
  }

  /**
   * Score a raw user query against every FAQ entry.
   * Stage 1: cosine similarity against QUESTION-ONLY vectors (high precision --
   *          this is what makes "what is a step-up sip" match instantly and exactly).
   * Stage 2 (fallback, only runs if stage 1 found nothing usable): cosine similarity
   *          against QUESTION+ANSWER vectors (higher recall -- catches queries that
   *          describe the concept without using the question's own wording, e.g.
   *          "withdraw money automatically every month" -> "What is an SWP?").
   * Returns { best, bestScore, second, secondScore, stage }.
   */
  function scoreQuery(query) {
    if (!index) buildIndex();
    if (tokenize(query).length === 0) return { best: null, bestScore: 0, second: null, secondScore: 0, stage: 0 };

    const { qvec, qNorm } = buildQueryVector(query);

    const stage1 = bestMatch(qvec, qNorm, 'vec', 'norm');
    if (stage1.best && stage1.bestScore >= STAGE1_THRESHOLD) {
      return { ...stage1, stage: 1 };
    }

    const stage2 = bestMatch(qvec, qNorm, 'vecAll', 'normAll');
    return { ...stage2, stage: 2, _stage1Debug: stage1 };
  }

  // Stage 1 (question-only) is precise, so it can use a lower bar.
  // Stage 2 (question+answer) is noisier, so findAnswer() applies a higher bar to it.
  const STAGE1_THRESHOLD = 0.45;
  const STAGE2_THRESHOLD = 0.55;

  /**
   * Public API: find the best-matching canned FAQ answer for a chat message.
   * Returns { id, question, answer, score } or null if nothing matched confidently.
   */
  function findAnswer(query, minScore) {
    if (!query) return null;

    const result = scoreQuery(query);
    const threshold = typeof minScore === 'number'
      ? minScore
      : (result.stage === 1 ? STAGE1_THRESHOLD : STAGE2_THRESHOLD);

    if (result.best && result.bestScore >= threshold) {
      return { id: result.best.id, question: result.best.question, answer: result.best.answer, score: result.bestScore };
    }
    return null;
  }

  window.FAQEngine = {
    init: buildIndex,
    findAnswer,
    _debugScore: scoreQuery // exposed for console debugging/tuning
  };

  // Build the index as soon as this script runs (FAQ_DATA is already loaded by this point).
  buildIndex();

})();