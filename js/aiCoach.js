/**
 * WebCraft Finance - aiCoach.js
 * Rule-based advisor engine that reviews active calculator configurations in real time,
 * checks math constraints, and renders warnings/nudges in a supportive peer-like tone.
 * Runs directly in browser via file:// (no ES module CORS issues).
 */
(function() {

  const AICoach = {

    // Runs live evaluation against the current active calculator's state
    evaluate(calculatorId, inputs) {
      const alerts = [];

      switch (calculatorId) {
        
        case 'standard_swp':
        case 'fixed_swp':
        case 'custom_swp':
          this.checkSWPDepletion(inputs, alerts);
          break;

        case 'stepup_sip':
        case 'standard_sip':
        case 'stock_sip':
          this.checkLifestyleCreep(inputs, alerts);
          break;

        case 'rebalancing':
          this.checkPortfolioDrift(inputs, alerts);
          break;

        case 'emergency_fund':
          this.checkEmergencyShortfall(inputs, alerts);
          break;

        default:
          break;
      }

      // If no warning alerts triggered, display a default encouraging notification
      if (alerts.length === 0) {
        const persona = window.AppState.get('persona');
        if (persona === 'beginner') {
          alerts.push({
            type: 'success',
            text: "Your math checks out! Everything looks sustainable here. Click 'Save Goal' on the card to track this on your dashboard."
          });
        } else {
          alerts.push({
            type: 'success',
            text: "Inputs are within standard guidelines. Tax drag and compounding efficiency are optimized."
          });
        }
      }

      this.renderAlerts(alerts);
    },

    // Rule: Unsustainable systematic withdrawals
    checkSWPDepletion(inputs, alerts) {
      const capital = parseFloat(inputs.capital) || 0;
      const withdrawal = parseFloat(inputs.w) || 0;
      const r_annual = parseFloat(inputs.r_annual) || 0;
      const years = parseFloat(inputs.years) || 15;
      const inflation = parseFloat(inputs.inflationPct) || 0;

      if (capital <= 0 || withdrawal <= 0) return;

      const annualWithdrawal = withdrawal * 12;
      const withdrawalRatePct = (annualWithdrawal / capital) * 100;

      // Rule trigger: withdrawal exceeds CAGR
      if (withdrawalRatePct > r_annual) {
        // Run simulation to find exact depletion month
        const r_monthly = (r_annual / 12) / 100;
        const inf_monthly = (inflation / 12) / 100;
        let balance = capital;
        let months = 0;
        let currentW = withdrawal;

        while (balance > 0 && months < 600) { // cap at 50 years
          months++;
          balance = balance - currentW;
          if (balance < 0) {
            balance = 0;
            break;
          }
          balance = balance * (1 + r_monthly);
          
          // Apply annual inflation bump to withdrawal
          if (months % 12 === 0) {
            currentW = currentW * (1 + (inflation / 100));
          }
        }

        const depletionYears = (months / 12).toFixed(1);

        alerts.push({
          type: 'warning',
          text: `Whoa! Withdrawing **${withdrawalRatePct.toFixed(1)}%** annually (${window.UIComponents.formatValue(annualWithdrawal, 'currency')}/yr) from a portfolio returning **${r_annual}%** is mathematically aggressive. With inflation drag, your capital could run dry in about **${depletionYears} years**. Consider dropping the monthly withdrawal to **${window.UIComponents.formatValue((capital * (r_annual/100)) / 12, 'currency')}** (matches return rate) or shifting to an **Appreciation SWP**.`
        });
      }
    },

    // Rule: Alert user to match SIP expansion to income increases (Lifestyle creep)
    checkLifestyleCreep(inputs, alerts) {
      const profile = window.AppState.get('profile') || {};
      const baseP = parseFloat(inputs.baseP || inputs.p) || 0;
      
      // Look at profile income. Suppose profile income is $6000/mo by default
      const monthlyIncome = profile.income || 6000;
      const savingsRate = (baseP / monthlyIncome) * 100;

      if (savingsRate < 10 && baseP > 0) {
        alerts.push({
          type: 'info',
          text: `Your current monthly savings rate is **${savingsRate.toFixed(1)}%** of your income. That's a solid start! But if your income expands, consider setting up an automated **10% annual Step-Up** to lock in extra wealth before lifestyle creep sneaks in.`
        });
      }
    },

    // Rule: Asset allocation drift >= 5% trigger
    checkPortfolioDrift(inputs, alerts) {
      // inputs expected to be rebalancing results
      if (!inputs || !inputs.recommendations) return;

      if (inputs.needsRebalancing) {
        alerts.push({
          type: 'warning',
          text: `Heads up! Your portfolio asset weightings have drifted by **${inputs.maxDrift}%** from your target allocations. It is wise to execute the trade orders shown below (selling overweight, buying underweight) to restore your intended risk profile.`
        });
      } else if (inputs.maxDrift > 2) {
        alerts.push({
          type: 'info',
          text: `Your portfolio drift is **${inputs.maxDrift}%**. No urgent action is required, but keep an eye on it. We suggest rebalancing once any asset class drifts by 5% or more.`
        });
      }
    },

    // Rule: Emergency fund targets
    checkEmergencyShortfall(inputs, alerts) {
      const shortfall = parseFloat(inputs.shortfall) || 0;
      if (shortfall > 0) {
        alerts.push({
          type: 'warning',
          text: `You have an emergency fund shortfall of **${window.UIComponents.formatValue(shortfall, 'currency')}**. Aim to stash away 6 months of basic living costs so that you never have to sell investments during market crashes or credit crunches.`
        });
      }
    },

    // Render alerts in the Right Sidebar Coach Feed
    renderAlerts(alerts) {
      const feedEl = document.querySelector('aside.w-80 div.overflow-y-auto');
      if (!feedEl) return;

      // Clear dynamic comments (preserve initial welcome bubble)
      const children = Array.from(feedEl.children);
      children.forEach((child, index) => {
        if (index > 0) child.remove(); // keep first introductory bubble
      });

      alerts.forEach(alert => {
        const bubble = document.createElement('div');
        bubble.className = 'flex gap-2 items-start animate-fade-in-up';
        
        let iconClass = 'fa-robot text-indigo-300';
        let bgClass = 'bg-white/5 border-white/5 text-slate-300';
        if (alert.type === 'warning') {
          iconClass = 'fa-circle-exclamation text-amber-400';
          bgClass = 'bg-amber-500/10 border-amber-500/20 text-amber-200';
        } else if (alert.type === 'success') {
          iconClass = 'fa-circle-check text-emerald-400';
          bgClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200';
        }

        // Parse standard markdown bold tags
        let parsedText = alert.text
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');

        bubble.innerHTML = `
          <div class="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center text-xs shrink-0">
            <i class="fa-solid ${iconClass}"></i>
          </div>
          <div class="p-3 rounded-2xl rounded-tl-none ${bgClass} border text-xs leading-relaxed">
            ${parsedText}
          </div>
        `;
        feedEl.appendChild(bubble);
      });
    },

    // Triggers custom canned messages on onboarding steps
    speakOnboarding(questionIndex, answerText) {
      const feedEl = document.querySelector('aside.w-80 div.overflow-y-auto');
      if (!feedEl) return;

      // Clear dynamic alerts
      const children = Array.from(feedEl.children);
      children.forEach((child, index) => {
        if (index > 0) child.remove();
      });

      const bubble = document.createElement('div');
      bubble.className = 'flex gap-2 items-start animate-fade-in-up';

      let text = '';
      if (questionIndex === 0) {
        text = `Awesome, you selected **${answerText}** as your core goal. Let's build a plan to make it reality.`;
      } else if (questionIndex === 1) {
        text = `Got it. Shifting your default expectations to match a **${answerText}** risk profile. Moderate risk averages ~12% long-term return assumptions.`;
      } else if (questionIndex === 2) {
        text = `All set! The basecamp dashboard is ready for you. Let's start with a Step-Up SIP to visualize compounding.`;
      }

      bubble.innerHTML = `
        <div class="h-6 w-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs shrink-0 text-indigo-300">
          <i class="fa-solid fa-robot"></i>
        </div>
        <div class="p-3 rounded-2xl rounded-tl-none bg-white/5 border border-white/5 text-xs text-slate-300 leading-relaxed animate-fade-in-up">
          ${text}
        </div>
      `;
      feedEl.appendChild(bubble);
    }
  };

  // Initialize dynamic chat inputs and routing
  function initChat() {
    const input = document.getElementById('coach-chat-input');
    const sendBtn = document.getElementById('btn-coach-chat-send');
    const feed = document.getElementById('coach-message-feed');

    if (!input || !feed) return;

    // A short plain-English summary of the user's saved goals, sent to the AI
    // as context (mirrors what index.ts's buildSystemPrompt() expects).
    function getGoalsSummary() {
      const goals = (window.AppState && window.AppState.get('goals')) || [];
      if (!goals || goals.length === 0) return 'no saved goals yet';
      return goals
        .map(g => `${g.name} (target ${g.targetAmount}, ${g.targetYears}y, ${g.calculatorType})`)
        .join('; ');
    }

    function renderUserBubble(text) {
      const userBubble = document.createElement('div');
      userBubble.className = 'flex gap-2 items-start justify-end animate-fade-in-up';
      userBubble.innerHTML = `
        <div class="p-3 rounded-2xl rounded-tr-none bg-indigo-500/20 border border-indigo-500/30 text-xs text-indigo-100 leading-relaxed max-w-[85%]">
          ${text}
        </div>
        <div class="h-6 w-6 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] shrink-0 text-indigo-300">
          <i class="fa-solid fa-user"></i>
        </div>
      `;
      feed.appendChild(userBubble);
      feed.scrollTop = feed.scrollHeight;
    }

    function renderCoachBubble(reply) {
      const coachBubble = document.createElement('div');
      coachBubble.className = 'flex gap-2 items-start animate-fade-in-up';

      // Parse bold/emphasis markers, and turn blank-line breaks (used by a couple
      // of longer FAQ answers, e.g. the SIP formula) into actual paragraph breaks.
      const parsedText = reply
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '<br><br>');

      coachBubble.innerHTML = `
        <div class="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center text-xs shrink-0">
          <i class="fa-solid fa-robot text-indigo-300"></i>
        </div>
        <div class="p-3 rounded-2xl rounded-tl-none bg-white/5 border-white/5 text-slate-300 border text-xs leading-relaxed max-w-[85%]">
          ${parsedText}
        </div>
      `;
      feed.appendChild(coachBubble);
      feed.scrollTop = feed.scrollHeight;
    }

    let typingBubbleEl = null;
    function showTyping() {
      typingBubbleEl = document.createElement('div');
      typingBubbleEl.className = 'flex gap-2 items-start animate-fade-in-up';
      typingBubbleEl.innerHTML = `
        <div class="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center text-xs shrink-0">
          <i class="fa-solid fa-robot text-indigo-300"></i>
        </div>
        <div class="p-3 rounded-2xl rounded-tl-none bg-white/5 border border-white/5 text-slate-400 text-xs leading-relaxed">
          <i class="fa-solid fa-ellipsis fa-fade"></i>
        </div>
      `;
      feed.appendChild(typingBubbleEl);
      feed.scrollTop = feed.scrollHeight;
    }
    function hideTyping() {
      if (typingBubbleEl) {
        typingBubbleEl.remove();
        typingBubbleEl = null;
      }
    }

    // Tier 3 (last resort): the original hardcoded keyword router. Only used if
    // BOTH the FAQ match (tier 1) AND the live Gemini call (tier 2) come up empty
    // -- e.g. offline, the Edge Function isn't deployed, or a quota error.
    function computeLocalRoutingReply(query) {
      if (query.includes('lump sum') || query.includes('volatility') || query.includes('fear') || query.includes('scared') || query.includes('market drops')) {
        return `If you have a lump sum but are worried about market volatility, consider mapping out a **Bond SIP** for stability or checking out a **Stock SIP** to average cost. Try switching to the <a href="#" onclick="window.CalculatorsController.load('bond_sip'); return false;" class="text-indigo-400 font-bold underline">Bond SIP Tool</a> or the <a href="#" onclick="window.CalculatorsController.load('stock_sip'); return false;" class="text-indigo-400 font-bold underline">Stock SIP Tool</a>.`;
      } else if (query.includes('retire') || query.includes('payout') || query.includes('monthly income') || query.includes('pension')) {
        return `Retirement income strategy needs to be precise. You can withdraw fixed sums using our <a href="#" onclick="window.CalculatorsController.load('standard_swp'); return false;" class="text-indigo-400 font-bold underline">Standard SWP</a> or harvest gains only (protecting capital) using our <a href="#" onclick="window.CalculatorsController.load('appreciation_swp'); return false;" class="text-indigo-400 font-bold underline">Appreciation SWP</a>.`;
      } else if (query.includes('emergency') || query.includes('shortfall') || query.includes('essential spend')) {
        return `Aim for at least 6 months of expenses in highly liquid cash. Calculate your safety buffer in the <a href="#" onclick="window.CalculatorsController.load('emergency_fund'); return false;" class="text-indigo-400 font-bold underline">Emergency Fund Planner</a>.`;
      } else if (query.includes('tax') || query.includes('gains') || query.includes('stcg') || query.includes('ltcg')) {
        return `Tax drag is the silent killer of returns. Model your LTCG/STCG liabilities dynamically using the <a href="#" onclick="window.CalculatorsController.load('capital_gains'); return false;" class="text-indigo-400 font-bold underline">Capital Gains Tax Calculator</a>.`;
      } else if (query.includes('drift') || query.includes('rebalance') || query.includes('equity weight') || query.includes('allocation')) {
        return `Asset class weights drift over time. Input your values in our <a href="#" onclick="window.CalculatorsController.load('rebalancing'); return false;" class="text-indigo-400 font-bold underline">Portfolio Rebalancing Terminal</a> to get step-by-step buy/sell orders.`;
      } else if (query.includes('step up') || query.includes('stepup') || query.includes('salary increase') || query.includes('raise')) {
        return `Increasing your savings rate annually is the single best way to accelerate wealth building. Simulate this inside the <a href="#" onclick="window.CalculatorsController.load('stepup_sip'); return false;" class="text-indigo-400 font-bold underline">Step-Up SIP Calculator</a>.`;
      } else if (query.includes('crash') || query.includes('stress') || query.includes('crisis') || query.includes('2008') || query.includes('covid')) {
        return `Want to see how your compounding survives a market crisis? Backtest historical drops using the <a href="#" onclick="window.CalculatorsController.load('stress_tester'); return false;" class="text-indigo-400 font-bold underline">What-If Stress Tester</a>.`;
      } else if (query.includes('hi') || query.includes('hello') || query.includes('hey') || query.includes('greetings')) {
        return `Hello! I am your AI routing coach. Ask me anything like: *'how to handle volatility?'*, *'where to calculate emergency fund?'*, or *'explain retirement income'* and I'll route you immediately!`;
      }
      return `Hmm, I didn't quite catch that, and I couldn't reach my AI brain just now either. Try asking about *'volatility'*, *'retirement'*, *'emergency'*, *'tax drag'*, *'rebalancing'*, or *'step up'* to route directly to our tools, or try again in a moment.`;
    }

    // Tier 2: ask the real AI (Gemini, via the gemini-chat Supabase Edge Function
    // defined in supabase/functions/gemini-chat/index.ts). Returns a reply string,
    // or null if the call wasn't possible/failed for any reason.
    async function askGeminiCoach(text) {
      if (!window.SupabaseClient || !window.SupabaseClient.functions) return null;

      try {
        const context = {
          persona: window.AppState ? window.AppState.get('persona') : 'beginner',
          currency: window.AppState ? window.AppState.get('currency') : 'INR',
          activeCalculatorId: window.CalculatorsController && window.CalculatorsController.getActiveTitle
            ? window.CalculatorsController.getActiveTitle()
            : 'none',
          goalsSummary: getGoalsSummary()
        };

        const { data, error } = await window.SupabaseClient.functions.invoke('gemini-chat', {
          body: { message: text, context }
        });

        if (error) {
          console.warn('gemini-chat Edge Function returned an error:', error);
          return null;
        }
        if (data && typeof data.reply === 'string' && data.reply.trim()) {
          return data.reply;
        }
        return null;
      } catch (err) {
        console.warn('Could not reach the gemini-chat Edge Function, falling back:', err);
        return null;
      }
    }

    async function sendMessage() {
      const text = input.value.trim();
      if (!text) return;

      renderUserBubble(text);
      input.value = '';
      showTyping();

      // Tier 1: the canned FAQ knowledge base (320 Q&A pairs sourced from
      // question_ai_ask.md, matched by keyword/semantic similarity via
      // faqEngine.js) -- instant and free for topics it already knows well.
      const faqMatch = window.FAQEngine ? window.FAQEngine.findAnswer(text) : null;
      let reply = faqMatch ? faqMatch.answer : null;

      // Tier 2: if the FAQ didn't have a confident answer, ask the real AI so
      // genuinely novel or oddly-phrased questions still get a real, context-aware
      // answer instead of a canned "I didn't understand" message.
      if (!reply) {
        reply = await askGeminiCoach(text);
      }

      // Tier 3: last-resort local keyword routing, only if both tiers above failed.
      if (!reply) {
        reply = computeLocalRoutingReply(text.toLowerCase());
      }

      hideTyping();
      renderCoachBubble(reply);
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }

  // Export globally
  AICoach.initChat = initChat;
  window.AICoach = AICoach;

  // Initialize chat inputs automatically
  document.addEventListener('DOMContentLoaded', () => {
    AICoach.initChat();
  });

})();