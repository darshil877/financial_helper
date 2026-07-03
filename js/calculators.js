/**
 * WebCraft Finance - calculators.js
 * Central registry, dynamic form builder, charting, and goal-tracking controller.
 * Handles the "Coffee Chat" onboarding and all 20 financial suites.
 * Runs directly in browser via file:// (no ES module CORS issues).
 */
(function() {

  let activeChartInstance = null;
  let activeCalculatorId = 'dashboard';

  // Calculator registry defining input schema, defaults, descriptions and rendering configurations
  const CALCULATOR_REGISTRY = {
    
    // ----------------------------------------------------
    // GROWTH HUB
    // ----------------------------------------------------
    stepup_sip: {
      title: "Step-Up SIP Calculator",
      desc: "Simulate a monthly savings plan that automatically increases each year with your salary hikes to beat inflation and compound faster.",
      fields: [
        { id: 'baseP', label: "Initial Monthly SIP", type: 'range', min: 100, max: 10000, step: 100, value: 500, format: 'currency_monthly', jargon: 'stepup_sip' },
        { id: 'stepUpPct', label: "Annual Step-Up Increment", type: 'range', min: 1, max: 30, step: 1, value: 10, format: 'percent', jargon: 'stepup_sip' },
        { id: 'r_annual', label: "Expected Annual Returns", type: 'range', min: 1, max: 25, step: 0.5, value: 12, format: 'percent', jargon: 'cagr' },
        { id: 'years', label: "Time Period", type: 'range', min: 1, max: 40, step: 1, value: 15, format: 'years' }
      ],
      run(inputs) {
        return window.MathEngine.calculateStepUpSIP(inputs.baseP, inputs.r_annual, inputs.years, inputs.stepUpPct);
      },
      render(res) {
        renderGrowthResultsHTML(res);
        renderGrowthChart(res.chartData);
      }
    },

    standard_sip: {
      title: "Standard SIP Calculator",
      desc: "Calculate the future valuation of a regular monthly investment compounding at a fixed annualized rate of return.",
      fields: [
        { id: 'p', label: "Monthly Investment", type: 'range', min: 100, max: 10000, step: 100, value: 500, format: 'currency_monthly', jargon: 'sip' },
        { id: 'r_annual', label: "Expected CAGR", type: 'range', min: 1, max: 25, step: 0.5, value: 12, format: 'percent', jargon: 'cagr' },
        { id: 'years', label: "Time Period", type: 'range', min: 1, max: 40, step: 1, value: 15, format: 'years' }
      ],
      run(inputs) {
        return window.MathEngine.calculateStandardSIP(inputs.p, inputs.r_annual, inputs.years);
      },
      render(res) {
        renderGrowthResultsHTML(res);
        renderGrowthChart(res.chartData);
      }
    },

    stock_sip: {
      title: "Stock SIP Simulator",
      desc: "Model standard deviations and market volatility on top of a base rate to visualize standard stock risk deviations.",
      fields: [
        { id: 'p', label: "Monthly SIP", type: 'range', min: 100, max: 10000, step: 100, value: 500, format: 'currency_monthly' },
        { id: 'r_annual', label: "Average Return Rate", type: 'range', min: 1, max: 25, step: 0.5, value: 12, format: 'percent' },
        { id: 'volatility', label: "Stock Volatility (Risk)", type: 'range', min: 5, max: 40, step: 1, value: 20, format: 'percent', jargon: 'alpha' },
        { id: 'years', label: "Time Period", type: 'range', min: 1, max: 40, step: 1, value: 15, format: 'years' }
      ],
      run(inputs) {
        return window.MathEngine.calculateStockSIP(inputs.p, inputs.r_annual, inputs.years, inputs.volatility);
      },
      render(res) {
        renderGrowthResultsHTML(res);
        renderGrowthChart(res.chartData);
      }
    },

    bond_sip: {
      title: "Bond SIP Calculator",
      desc: "Simulate zero-volatility investing in sovereign or corporate debt instruments with fixed coupon payouts.",
      fields: [
        { id: 'p', label: "Monthly Deposit", type: 'range', min: 100, max: 10000, step: 100, value: 500, format: 'currency_monthly' },
        { id: 'bondType', label: "Bond Grade Target", type: 'select', options: [{val: 'govt', label: 'Government Bond (Low Risk ~ 5.5%)'}, {val: 'corporate', label: 'Corporate Bond (Medium Risk ~ 7.5%)'}], value: 'govt' },
        { id: 'years', label: "Time Period", type: 'range', min: 1, max: 40, step: 1, value: 10, format: 'years' }
      ],
      run(inputs) {
        return window.MathEngine.calculateBondSIP(inputs.p, inputs.bondType, inputs.years);
      },
      render(res) {
        renderGrowthResultsHTML(res);
        renderGrowthChart(res.chartData);
      }
    },

    flexi_sip: {
      title: "Flexi-SIP Planner",
      desc: "Calculate the base contribution required to reach a specific financial goal, and see how flexible dip-buying speeds up the timeline.",
      fields: [
        { id: 'targetGoal', label: "Target Goal Sum", type: 'range', min: 5000, max: 1000000, step: 5000, value: 100000, format: 'currency' },
        { id: 'r_annual', label: "Expected Returns", type: 'range', min: 1, max: 25, step: 0.5, value: 12, format: 'percent' },
        { id: 'years', label: "Target Period", type: 'range', min: 1, max: 40, step: 1, value: 10, format: 'years' }
      ],
      run(inputs) {
        return window.MathEngine.calculateFlexiSIP(inputs.targetGoal, inputs.r_annual, inputs.years);
      },
      render(res) {
        const outputEl = document.getElementById('calculator-results');
        outputEl.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="p-4 bg-white/5 rounded-xl border border-white/5">
              <span class="text-[10px] uppercase font-bold text-slate-400 block">Required Base SIP</span>
              <span class="text-xl font-bold text-indigo-400">${window.UIComponents.formatValue(res.requiredMonthly, 'currency')}/mo</span>
            </div>
            <div class="p-4 bg-white/5 rounded-xl border border-white/5">
              <span class="text-[10px] uppercase font-bold text-slate-400 block">Future Value (Flat)</span>
              <span class="text-xl font-bold text-slate-200">${window.UIComponents.formatValue(res.futureValueStandard, 'currency')}</span>
            </div>
            <div class="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <span class="text-[10px] uppercase font-bold text-emerald-400 block">Future Value (Flexi Dip-Buy)</span>
              <span class="text-xl font-bold text-emerald-400">${window.UIComponents.formatValue(res.futureValueFlexi, 'currency')}</span>
            </div>
          </div>
          <div class="p-3.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-xs text-indigo-200">
            <i class="fa-solid fa-circle-info mr-1.5"></i> By stepping up your monthly contributions by 1.5x during brief market corrections, you generate <strong>${window.UIComponents.formatValue(res.savingsIncrease, 'currency')} in Alpha</strong>.
          </div>
        `;
        
        // Show rebalancing allocations placeholder chart
        renderDoughnutChart(['Standard Value', 'Flexi Alpha'], [res.futureValueStandard, res.savingsIncrease], ['#6366f1', '#10b981']);
      }
    },

    trigger_sip: {
      title: "Trigger SIP Simulator",
      desc: "Simulate a rule-based plan that automatically doubles your investment on market corrections of a specific depth.",
      fields: [
        { id: 'p', label: "Base Monthly Contribution", type: 'range', min: 100, max: 10000, step: 100, value: 500, format: 'currency_monthly', jargon: 'trigger_sip' },
        { id: 'dipTrigger', label: "Trigger Correction Depth", type: 'range', min: 2, max: 15, step: 1, value: 5, format: 'percent' },
        { id: 'boosterFactor', label: "Dip Investment Multiplier", type: 'range', min: 1.5, max: 4, step: 0.5, value: 2, format: 'number' },
        { id: 'r_annual', label: "Underlying Return Rate", type: 'range', min: 1, max: 25, step: 0.5, value: 12, format: 'percent' },
        { id: 'years', label: "Time Period", type: 'range', min: 1, max: 40, step: 1, value: 15, format: 'years' }
      ],
      run(inputs) {
        return window.MathEngine.calculateTriggerSIP(inputs.p, inputs.r_annual, inputs.years, inputs.dipTrigger, inputs.boosterFactor);
      },
      render(res) {
        const outputEl = document.getElementById('calculator-results');
        outputEl.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="p-4 bg-white/5 rounded-xl border border-white/5">
              <span class="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Standard SIP Final Value</span>
              <span class="text-lg font-bold text-slate-300">${window.UIComponents.formatValue(res.standardValue, 'currency')}</span>
              <span class="text-[10px] text-slate-500 block">Total Invested: ${window.UIComponents.formatValue(res.standardInvested, 'currency')}</span>
            </div>
            <div class="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <span class="text-[10px] uppercase font-bold text-indigo-300 block mb-0.5">Trigger SIP Final Value</span>
              <span class="text-lg font-bold text-indigo-400">${window.UIComponents.formatValue(res.triggerValue, 'currency')}</span>
              <span class="text-[10px] text-slate-400 block">Total Invested: ${window.UIComponents.formatValue(res.triggerInvested, 'currency')}</span>
            </div>
          </div>
        `;
        
        // Multi-line chart comparison
        const labels = res.chartData.map(d => `Yr ${d.year}`);
        const datasets = [
          {
            label: 'Standard SIP',
            data: res.chartData.map(d => d.standardValue),
            borderColor: '#94a3b8',
            backgroundColor: 'transparent',
            borderWidth: 2
          },
          {
            label: 'Trigger SIP (Booster)',
            data: res.chartData.map(d => d.triggerValue),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            borderWidth: 3
          }
        ];
        renderLineChart(labels, datasets);
      }
    },

    perpetual_sip: {
      title: "Perpetual SIP Milestone Tracker",
      desc: "Explore compounding speed without target dates to see how fast milestones like $100k, $500k, or $1M are reached.",
      fields: [
        { id: 'p', label: "Monthly SIP", type: 'range', min: 100, max: 10000, step: 100, value: 500, format: 'currency_monthly' },
        { id: 'r_annual', label: "Expected Compound Rate", type: 'range', min: 1, max: 25, step: 0.5, value: 12, format: 'percent' }
      ],
      run(inputs) {
        return window.MathEngine.calculatePerpetualSIP(inputs.p, inputs.r_annual);
      },
      render(res) {
        const outputEl = document.getElementById('calculator-results');
        let milestonesHTML = '<div class="space-y-3 mb-6">';
        
        res.forEach(m => {
          const yearText = m.years ? `~ ${m.years} Years` : '50+ Years';
          const colorClass = m.years ? 'text-indigo-400' : 'text-slate-500';
          
          milestonesHTML += `
            <div class="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
              <span class="text-xs font-semibold text-slate-300">${m.label} Milestone</span>
              <span class="text-sm font-bold ${colorClass}">${yearText}</span>
            </div>
          `;
        });
        milestonesHTML += '</div>';
        outputEl.innerHTML = milestonesHTML;

        // Render milestone completion rate doughnut
        const completedCount = res.filter(m => m.years !== null).length;
        renderDoughnutChart(['Reached Milestones', 'Unreached'], [completedCount, res.length - completedCount], ['#818cf8', '#1f2937']);
      }
    },

    multi_sip: {
      title: "Multi-SIP Comparison Tool",
      desc: "Compare 3 distinct monthly contribution paths side-by-side on a single chart to evaluate target scenarios.",
      fields: [
        { id: 'p1', label: "Scenario A Monthly", type: 'range', min: 100, max: 10000, step: 100, value: 300, format: 'currency_monthly' },
        { id: 'p2', label: "Scenario B Monthly", type: 'range', min: 100, max: 10000, step: 100, value: 600, format: 'currency_monthly' },
        { id: 'p3', label: "Scenario C Monthly", type: 'range', min: 100, max: 10000, step: 100, value: 1200, format: 'currency_monthly' },
        { id: 'r_annual', label: "Return CAGR %", type: 'range', min: 1, max: 25, step: 0.5, value: 12, format: 'percent' },
        { id: 'years', label: "Duration", type: 'range', min: 1, max: 40, step: 1, value: 15, format: 'years' }
      ],
      run(inputs) {
        return window.MathEngine.calculateMultiSIP(inputs.p1, inputs.p2, inputs.p3, inputs.r_annual, inputs.years);
      },
      render(res) {
        const outputEl = document.getElementById('calculator-results');
        outputEl.innerHTML = `
          <div class="grid grid-cols-3 gap-3 mb-4 text-center">
            <div class="p-3 bg-white/5 rounded-xl border border-white/5">
              <span class="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Scenario A</span>
              <span class="text-sm font-bold text-indigo-400">${window.UIComponents.formatValue(res.res1.futureValue, 'currency')}</span>
            </div>
            <div class="p-3 bg-white/5 rounded-xl border border-white/5">
              <span class="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Scenario B</span>
              <span class="text-sm font-bold text-purple-400">${window.UIComponents.formatValue(res.res2.futureValue, 'currency')}</span>
            </div>
            <div class="p-3 bg-white/5 rounded-xl border border-white/5">
              <span class="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Scenario C</span>
              <span class="text-sm font-bold text-emerald-400">${window.UIComponents.formatValue(res.res3.futureValue, 'currency')}</span>
            </div>
          </div>
        `;

        const labels = res.chartData.map(d => `Yr ${d.year}`);
        const datasets = [
          { label: 'Scenario A', data: res.chartData.map(d => d.val1), borderColor: '#818cf8', backgroundColor: 'transparent' },
          { label: 'Scenario B', data: res.chartData.map(d => d.val2), borderColor: '#c084fc', backgroundColor: 'transparent' },
          { label: 'Scenario C', data: res.chartData.map(d => d.val3), borderColor: '#34d399', backgroundColor: 'transparent' }
        ];
        renderLineChart(labels, datasets);
      }
    },

    sip_insurance: {
      title: "SIP with Insurance Cover",
      desc: "Simulate a SIP that auto-allocates a minor insurance premium fee to guarantee a life cover protection umbrella.",
      fields: [
        { id: 'p', label: "Monthly Premium (SIP)", type: 'range', min: 100, max: 10000, step: 100, value: 500, format: 'currency_monthly' },
        { id: 'r_annual', label: "Expected Return CAGR", type: 'range', min: 1, max: 25, step: 0.5, value: 12, format: 'percent' },
        { id: 'years', label: "Time Duration", type: 'range', min: 1, max: 40, step: 1, value: 15, format: 'years' }
      ],
      run(inputs) {
        return window.MathEngine.calculateSIPWithInsurance(inputs.p, inputs.r_annual, inputs.years);
      },
      render(res) {
        const outputEl = document.getElementById('calculator-results');
        outputEl.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div class="p-4 bg-white/5 rounded-xl border border-white/5">
              <span class="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Final SIP Portfolio</span>
              <span class="text-lg font-bold text-slate-200">${window.UIComponents.formatValue(res.futureValue, 'currency')}</span>
            </div>
            <div class="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <span class="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">Term Life Cover active</span>
              <span class="text-lg font-bold text-emerald-400">${window.UIComponents.formatValue(res.insuranceCover, 'currency')}</span>
            </div>
            <div class="p-4 bg-white/5 rounded-xl border border-white/5">
              <span class="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Insurance Cost Paid</span>
              <span class="text-lg font-bold text-red-300">${window.UIComponents.formatValue(res.insuranceCostTotal, 'currency')}</span>
            </div>
          </div>
        `;

        renderDoughnutChart(['Final Portfolio Value', 'Insurance Cost'], [res.futureValue, res.insuranceCostTotal], ['#818cf8', '#ef4444']);
      }
    },

    // ----------------------------------------------------
    // INCOME HUB
    // ----------------------------------------------------
    standard_swp: {
      title: "Standard SWP Calculator",
      desc: "Simulate capital decay and cumulative retirement withdrawals compounded at expected yield returns.",
      fields: [
        { id: 'capital', label: "Initial Capital Principal", type: 'range', min: 10000, max: 1000000, step: 10000, value: 200000, format: 'currency', jargon: 'swp' },
        { id: 'w', label: "Monthly Withdrawal Target", type: 'range', min: 100, max: 10000, step: 100, value: 1500, format: 'currency_monthly' },
        { id: 'r_annual', label: "Portfolio Yield Return %", type: 'range', min: 1, max: 20, step: 0.5, value: 8, format: 'percent' },
        { id: 'years', label: "Retirement Horizon", type: 'range', min: 1, max: 40, step: 1, value: 20, format: 'years' }
      ],
      run(inputs) {
        return window.MathEngine.calculateStandardSWP(inputs.capital, inputs.w, inputs.r_annual, inputs.years);
      },
      render(res) {
        renderSWPResultsHTML(res);
        renderSWPChart(res.chartData);
      }
    },

    fixed_swp: {
      title: "Inflation-Adjusted Fixed SWP",
      desc: "Evaluate retirement withdrawals where your payout scales yearly to keep pace with cost-of-living inflation.",
      fields: [
        { id: 'capital', label: "Capital Principal", type: 'range', min: 10000, max: 1000000, step: 10000, value: 200000, format: 'currency' },
        { id: 'w', label: "Year-1 Monthly Payout", type: 'range', min: 100, max: 10000, step: 100, value: 1200, format: 'currency_monthly' },
        { id: 'r_annual', label: "Portfolio Yield %", type: 'range', min: 1, max: 20, step: 0.5, value: 8, format: 'percent' },
        { id: 'inflationPct', label: "Annual Inflation Drag", type: 'range', min: 1, max: 15, step: 0.5, value: 6, format: 'percent', jargon: 'inflation' },
        { id: 'years', label: "Horizon Years", type: 'range', min: 1, max: 40, step: 1, value: 20, format: 'years' }
      ],
      run(inputs) {
        return window.MathEngine.calculateFixedSWP(inputs.capital, inputs.w, inputs.r_annual, inputs.years, inputs.inflationPct);
      },
      render(res) {
        renderSWPResultsHTML(res);
        renderSWPChart(res.chartData);
      }
    },

    appreciation_swp: {
      title: "Capital Appreciation SWP",
      desc: "Harvest only the gains of each month, safeguarding the original principal capital from ever depleting.",
      fields: [
        { id: 'capital', label: "Capital Principal", type: 'range', min: 10000, max: 1000000, step: 10000, value: 250000, format: 'currency' },
        { id: 'r_annual', label: "Expected Growth Rate", type: 'range', min: 1, max: 20, step: 0.5, value: 8, format: 'percent' },
        { id: 'years', label: "Horizon Period", type: 'range', min: 1, max: 40, step: 1, value: 20, format: 'years' }
      ],
      run(inputs) {
        return window.MathEngine.calculateAppreciationSWP(inputs.capital, inputs.r_annual, inputs.years);
      },
      render(res) {
        const outputEl = document.getElementById('calculator-results');
        outputEl.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div class="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center">
              <span class="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">Protected Principal</span>
              <span class="text-lg font-bold text-emerald-400">${window.UIComponents.formatValue(res.finalBalance, 'currency')}</span>
            </div>
            <div class="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
              <span class="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Average Monthly Payout</span>
              <span class="text-lg font-bold text-indigo-300">${window.UIComponents.formatValue(res.monthlyWithdrawal, 'currency')}/mo</span>
            </div>
            <div class="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
              <span class="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Cumulative Payout Received</span>
              <span class="text-lg font-bold text-slate-200">${window.UIComponents.formatValue(res.totalWithdrawn, 'currency')}</span>
            </div>
          </div>
        `;

        // Render Area chart showing principal line + accumulated gains withdrawn
        const labels = res.chartData.map(d => `Yr ${d.year}`);
        const datasets = [
          {
            label: 'Capital Principal',
            data: res.chartData.map(d => d.balance),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true
          },
          {
            label: 'Accumulated Withdrawals',
            data: res.chartData.map(d => d.withdrawn),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.05)',
            fill: true
          }
        ];
        renderLineChart(labels, datasets);
      }
    },

    custom_swp: {
      title: "Step-Up Custom SWP",
      desc: "An advanced SWP modeling payouts that increase annually by a set step-up rate to fit dynamic spending needs.",
      fields: [
        { id: 'capital', label: "Capital Principal", type: 'range', min: 10000, max: 1000000, step: 10000, value: 200000, format: 'currency' },
        { id: 'w', label: "Base Monthly Withdrawal", type: 'range', min: 100, max: 10000, step: 100, value: 1000, format: 'currency_monthly' },
        { id: 'r_annual', label: "Return CAGR %", type: 'range', min: 1, max: 20, step: 0.5, value: 8, format: 'percent' },
        { id: 'stepUpPct', label: "Annual Withdrawal Step-Up", type: 'range', min: 1, max: 15, step: 0.5, value: 5, format: 'percent' },
        { id: 'years', label: "Horizon Years", type: 'range', min: 1, max: 40, step: 1, value: 20, format: 'years' }
      ],
      run(inputs) {
        return window.MathEngine.calculateCustomSWP(inputs.capital, inputs.w, inputs.r_annual, inputs.years, inputs.stepUpPct);
      },
      render(res) {
        renderSWPResultsHTML(res);
        renderSWPChart(res.chartData);
      }
    },

    // ----------------------------------------------------
    // SURVIVAL HUB
    // ----------------------------------------------------
    emergency_fund: {
      title: "Emergency Fund Planner",
      desc: "Calculate the safety buffer required to protect your household expenses from job transitions or medical emergencies.",
      fields: [
        { id: 'essentialExpenses', label: "Monthly Essential Spend", type: 'range', min: 500, max: 15000, step: 100, value: 2500, format: 'currency' },
        { id: 'discretionaryExpenses', label: "Monthly Discretionary Spend", type: 'range', min: 0, max: 10000, step: 100, value: 1000, format: 'currency' },
        { id: 'months', label: "Coverage Target (Months)", type: 'range', min: 3, max: 12, step: 1, value: 6, format: 'number' },
        { id: 'currentSavings', label: "Current Cash Savings", type: 'range', min: 0, max: 100000, step: 500, value: 5000, format: 'currency' }
      ],
      run(inputs) {
        return window.MathEngine.calculateEmergencyFund(inputs.essentialExpenses, inputs.discretionaryExpenses, inputs.months, inputs.currentSavings);
      },
      render(res) {
        const outputEl = document.getElementById('calculator-results');
        const stateColor = res.isComplete ? 'text-emerald-400' : 'text-amber-400';
        
        outputEl.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div class="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
              <span class="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Suggested Target Buffer</span>
              <span class="text-lg font-bold text-slate-200">${window.UIComponents.formatValue(res.targetFund, 'currency')}</span>
            </div>
            <div class="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
              <span class="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Current Savings</span>
              <span class="text-lg font-bold text-indigo-300">${window.UIComponents.formatValue(inputs.currentSavings, 'currency')}</span>
            </div>
            <div class="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
              <span class="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Shortfall deficit</span>
              <span class="text-lg font-bold ${stateColor}">${window.UIComponents.formatValue(res.shortfall, 'currency')}</span>
            </div>
          </div>
        `;

        renderDoughnutChart(['Current Cash Saved', 'Shortfall Balance'], [inputs.currentSavings, res.shortfall], ['#10b981', '#f59e0b']);
      }
    },

    term_insurance: {
      title: "Term Insurance Cover suggestions",
      desc: "Estimate life cover umbrella using Human Life Value factors based on income, current debt burden, and family protection needs.",
      fields: [
        { id: 'age', label: "Your Current Age", type: 'range', min: 18, max: 60, step: 1, value: 30, format: 'number' },
        { id: 'annualIncome', label: "Your Annual Income", type: 'range', min: 10000, max: 500000, step: 5000, value: 80000, format: 'currency' },
        { id: 'debts', label: "Mortgage / Debts Owed", type: 'range', min: 0, max: 1000000, step: 10000, value: 120000, format: 'currency' },
        { id: 'currentAssets', label: "Liquid Investments & Cash", type: 'range', min: 0, max: 500000, step: 5000, value: 40000, format: 'currency' }
      ],
      run(inputs) {
        return window.MathEngine.calculateTermInsurance(inputs.age, inputs.annualIncome, inputs.debts, 0, inputs.currentAssets);
      },
      render(res) {
        const outputEl = document.getElementById('calculator-results');
        outputEl.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-center">
              <span class="text-[10px] uppercase font-bold text-indigo-300 block mb-0.5">Ideal Life Insurance Cover</span>
              <span class="text-xl font-bold text-indigo-400">${window.UIComponents.formatValue(res.idealCover, 'currency')}</span>
            </div>
            <div class="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
              <span class="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Suggested Policy Term</span>
              <span class="text-xl font-bold text-slate-200">${res.suggestedDuration} Years (until age 60)</span>
            </div>
          </div>
        `;

        renderDoughnutChart(['Insurance Cover Needed', 'Self-Insured Assets'], [res.idealCover, inputs.currentAssets], ['#818cf8', '#10b981']);
      }
    },

    health_cover: {
      title: "Health Cover Suggester",
      desc: "Determine safety margins for health coverage policies relative to geographical location and family sizes.",
      fields: [
        { id: 'familySize', label: "Coverage Scope", type: 'select', options: [{val: 'individual', label: 'Self Only (Individual)'}, {val: 'family', label: 'Family Floater (Spouse + Kids)'}], value: 'family' },
        { id: 'inMetacity', label: "Metropolitan Location Tier?", type: 'select', options: [{val: '1', label: 'Yes, Tier-1 Metro City'}, {val: '0', label: 'No, Tier-2/3 Town'}], value: '1' },
        { id: 'hasPreexisting', label: "Any Pre-existing Medical Conditions?", type: 'select', options: [{val: '1', label: 'Yes'}, {val: '0', label: 'No'}], value: '0' }
      ],
      run(inputs) {
        const size = inputs.familySize;
        const metro = inputs.inMetacity === '1';
        const preexisting = inputs.hasPreexisting === '1';
        return window.MathEngine.calculateHealthCover(size, metro, preexisting);
      },
      render(res) {
        const outputEl = document.getElementById('calculator-results');
        outputEl.innerHTML = `
          <div class="p-5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-center max-w-md mx-auto mb-4">
            <span class="text-xs uppercase font-bold text-indigo-300 block mb-1">Recommended Medical Coverage</span>
            <span class="text-2xl font-black text-indigo-400">${window.UIComponents.formatValue(res.suggestedCover, 'currency')}</span>
            <p class="text-[11px] text-slate-400 mt-2">Adjusted for regional hospital costs and healthcare inflation.</p>
          </div>
        `;
        
        renderDoughnutChart(['Suggested Healthcare Cover', 'Buffer Margin'], [res.suggestedCover, res.suggestedCover * 0.25], ['#818cf8', '#4f46e5']);
      }
    },

    // ----------------------------------------------------
    // TAX & ALPHA
    // ----------------------------------------------------
    capital_gains: {
      title: "Capital Gains Tax Estimator",
      desc: "Calculate LTCG vs STCG tax drag and net proceeds after taxes on asset redemptions.",
      fields: [
        { id: 'purchasePrice', label: "Initial Investment Cost", type: 'range', min: 1000, max: 200000, step: 1000, value: 50000, format: 'currency' },
        { id: 'salePrice', label: "Estimated Sell Redemption", type: 'range', min: 1000, max: 500000, step: 2000, value: 90000, format: 'currency' },
        { id: 'holdingMonths', label: "Holding Duration", type: 'range', min: 1, max: 60, step: 1, value: 18, format: 'number' },
        { id: 'isEquity', label: "Asset Class Type", type: 'select', options: [{val: '1', label: 'Equity Mutual Funds / Stocks'}, {val: '0', label: 'Debt Mutual Funds / Gold'}], value: '1' }
      ],
      run(inputs) {
        const isEq = inputs.isEquity === '1';
        return window.MathEngine.calculateCapitalGains(inputs.purchasePrice, inputs.salePrice, inputs.holdingMonths, isEq);
      },
      render(res) {
        const outputEl = document.getElementById('calculator-results');
        const taxType = res.isLTCG ? 'LTCG (Long Term)' : 'STCG (Short Term)';
        
        outputEl.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div class="p-4 bg-white/5 rounded-xl border border-white/5">
              <span class="text-[10px] uppercase font-bold text-slate-400 block">Total Profit Gains</span>
              <span class="text-lg font-bold text-slate-200">${window.UIComponents.formatValue(res.gain, 'currency')}</span>
            </div>
            <div class="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
              <span class="text-[10px] uppercase font-bold text-red-400 block">${taxType} Tax Due</span>
              <span class="text-lg font-bold text-red-400">${window.UIComponents.formatValue(res.taxAmount, 'currency')}</span>
            </div>
            <div class="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <span class="text-[10px] uppercase font-bold text-emerald-400 block">Net Proceeds Takehome</span>
              <span class="text-lg font-bold text-emerald-400">${window.UIComponents.formatValue(res.netProceeds, 'currency')}</span>
            </div>
          </div>
          <div class="p-3 bg-white/5 rounded-xl border border-white/5 text-[11px] text-slate-300">
            <i class="fa-solid fa-calculator mr-1 text-indigo-400"></i> Tax Drag represents <strong>${res.taxDragPct}%</strong> of total return growth.
          </div>
        `;

        renderDoughnutChart(['Net Proceeds', 'Tax Drag'], [res.netProceeds, res.taxAmount], ['#10b981', '#ef4444']);
      }
    },

    rebalancing: {
      title: "Portfolio Asset Rebalancer",
      desc: "Compare current holdings against targets to generate rebalancing transaction recommendations.",
      fields: [
        { id: 'equityVal', label: "Current Equity ($)", type: 'range', min: 0, max: 200000, step: 2000, value: 70000, format: 'currency', jargon: 'rebalancing' },
        { id: 'debtVal', label: "Current Debt ($)", type: 'range', min: 0, max: 200000, step: 2000, value: 20000, format: 'currency' },
        { id: 'goldVal', label: "Current Gold ($)", type: 'range', min: 0, max: 100000, step: 1000, value: 5000, format: 'currency' },
        { id: 'cashVal', label: "Current Cash ($)", type: 'range', min: 0, max: 50000, step: 1000, value: 15000, format: 'currency' }
      ],
      run(inputs) {
        // Assume default targets: Equity 50%, Debt 30%, Gold 10%, Cash 10%
        const curVals = {
          equity: inputs.equityVal,
          debt: inputs.debtVal,
          gold: inputs.goldVal,
          cash: inputs.cashVal,
          realestate: 0
        };
        const targets = {
          equity: 50,
          debt: 30,
          gold: 10,
          cash: 10,
          realestate: 0
        };
        return window.MathEngine.calculateRebalancing(curVals, targets);
      },
      render(res) {
        const outputEl = document.getElementById('calculator-results');
        
        let driftMsg = '';
        if (res.needsRebalancing) {
          driftMsg = `<div class="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-xs text-red-300 mb-4"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Drift is over 5%. Rebalancing trades advised.</div>`;
        } else {
          driftMsg = `<div class="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-xs text-emerald-300 mb-4"><i class="fa-solid fa-circle-check mr-1"></i> Portfolio is aligned. Drift remains within tolerances.</div>`;
        }

        const activeCode = (window.AppState && window.AppState.get('currency')) || 'INR';
        const activeSymbol = (window.SUPPORTED_CURRENCIES && window.SUPPORTED_CURRENCIES[activeCode] || { symbol: '₹' }).symbol;

        let tableRows = '';
        for (const [key, item] of Object.entries(res.recommendations)) {
          if (item.targetWeight === 0) continue;
          
          let badge = '';
          if (item.action === 'Buy') badge = `<span class="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[9px]">BUY ${window.UIComponents.formatValue(Math.abs(item.delta), 'currency')}</span>`;
          else if (item.action === 'Sell') badge = `<span class="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-[9px]">SELL ${window.UIComponents.formatValue(Math.abs(item.delta), 'currency')}</span>`;
          else badge = `<span class="px-2 py-0.5 rounded bg-slate-500/10 border border-slate-500/20 text-slate-400 font-bold text-[9px]">HOLD</span>`;

          tableRows += `
            <tr class="border-b border-white/5 text-[11px]">
              <td class="py-2.5 capitalize text-slate-300 font-medium">${key}</td>
              <td class="py-2.5 text-right">${window.UIComponents.formatValue(item.currentVal, 'currency')} (${item.currentWeight}%)</td>
              <td class="py-2.5 text-right">${item.targetWeight}%</td>
              <td class="py-2.5 text-right">${badge}</td>
            </tr>
          `;
        }

        outputEl.innerHTML = `
          ${driftMsg}
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="border-b border-white/10 text-[9px] uppercase tracking-wider text-slate-500">
                  <th class="pb-2">Asset Class</th>
                  <th class="pb-2 text-right">Current (${activeSymbol} / %)</th>
                  <th class="pb-2 text-right">Target Weight</th>
                  <th class="pb-2 text-right">Required Action</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        `;

        // Render allocations comparison bar chart
        const labels = Object.keys(res.recommendations).filter(k => k !== 'realestate');
        const currentW = labels.map(k => res.recommendations[k].currentWeight);
        const targetW = labels.map(k => res.recommendations[k].targetWeight);

        updateChart('bar', {
          labels,
          datasets: [
            { label: 'Current Allocation (%)', data: currentW, backgroundColor: '#818cf8' },
            { label: 'Target Allocation (%)', data: targetW, backgroundColor: '#3b82f6' }
          ]
        }, {
          scales: {
            y: { max: 100 }
          }
        });
      }
    },

    stress_tester: {
      title: "Crisis Stress Tester Simulator",
      desc: "Replay historical market downturns (2008 crash, Covid dip, dot-com) against a standard wealth investment path.",
      fields: [
        { id: 'p', label: "Monthly Investments", type: 'range', min: 100, max: 10000, step: 100, value: 500, format: 'currency_monthly' },
        { id: 'crashType', label: "Crisis Scenario Replay", type: 'select', options: [
          {val: 'gfc', label: '2008 Global Financial Crisis (-40% crash)'},
          {val: 'covid', label: '2020 Coronavirus Pandemic (-25% drop)'},
          {val: 'dotcom', label: '2000 Dot-com Tech Bubble (-30% crash)'}
        ], value: 'gfc' },
        { id: 'r_annual', label: "Normal Average Return %", type: 'range', min: 1, max: 25, step: 0.5, value: 12, format: 'percent' },
        { id: 'years', label: "Time Horizon", type: 'range', min: 3, max: 20, step: 1, value: 10, format: 'years' }
      ],
      run(inputs) {
        return window.MathEngine.calculateStressTest(inputs.p, inputs.r_annual, inputs.years, inputs.crashType);
      },
      render(res) {
        const outputEl = document.getElementById('calculator-results');
        outputEl.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div class="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
              <span class="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Invested Principal</span>
              <span class="text-lg font-bold text-slate-200">${window.UIComponents.formatValue(res.totalInvested, 'currency')}</span>
            </div>
            <div class="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
              <span class="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Normal SIP Future Value</span>
              <span class="text-lg font-bold text-indigo-400">${window.UIComponents.formatValue(res.standardValue, 'currency')}</span>
            </div>
            <div class="p-4 bg-red-500/10 rounded-xl border border-red-500/20 text-center">
              <span class="text-[10px] uppercase font-bold text-red-400 block mb-0.5">Stressed Future Value</span>
              <span class="text-lg font-bold text-red-400">${window.UIComponents.formatValue(res.stressedValue, 'currency')}</span>
            </div>
          </div>
          <div class="p-3 bg-red-500/5 rounded-xl border border-red-500/10 text-[11px] text-red-300">
            <i class="fa-solid fa-chart-line mr-1 text-red-400"></i> Drop represents a paper loss deficit of <strong>${window.UIComponents.formatValue(res.lossDifference, 'currency')}</strong>. Hold steady to profit on recovery.
          </div>
        `;

        const labels = res.chartData.map(d => `Yr ${d.year}`);
        const datasets = [
          { label: 'Normal Growth Plan', data: res.chartData.map(d => d.standardValue), borderColor: '#6366f1', backgroundColor: 'transparent' },
          { label: 'Stressed Crash Plan', data: res.chartData.map(d => d.stressedValue), borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)', fill: true },
          { label: 'Invested Capital', data: res.chartData.map(d => d.invested), borderColor: '#94a3b8', borderDash: [5, 5], backgroundColor: 'transparent' }
        ];
        renderLineChart(labels, datasets);
      }
    },

    health_score: {
      title: "Financial Health Score Quiz",
      desc: "Answer 4 questions to evaluate your emergency buffer, debt weight, insurance levels, and savings rate.",
      fields: [], // Quizzes are rendered dynamically as questions
      run() { return null; },
      render() {
        renderQuizInterface();
      }
    }

  };

  // ----------------------------------------------------
  // Dynamic Charting Helper wrappers
  // ----------------------------------------------------

  function updateChart(type, data, options = {}) {
    const canvas = document.getElementById('calculator-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (activeChartInstance) {
      activeChartInstance.destroy();
    }

    activeChartInstance = new Chart(ctx, {
      type: type,
      data: data,
      options: Object.assign({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: '#e2e8f0', font: { family: 'Outfit', size: 11 } }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8', font: { family: 'Outfit' } } },
          y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8', font: { family: 'Outfit' } } }
        }
      }, options)
    });
  }

  function renderGrowthChart(chartData) {
    const labels = chartData.map(d => `Yr ${d.year}`);
    const invested = chartData.map(d => d.invested);
    const value = chartData.map(d => d.value);

    updateChart('line', {
      labels,
      datasets: [
        {
          label: 'Total Value Accumulated',
          data: value,
          borderColor: '#818cf8',
          backgroundColor: 'rgba(129, 140, 248, 0.1)',
          fill: true,
          borderWidth: 3
        },
        {
          label: 'Invested Capital Cost',
          data: invested,
          borderColor: '#94a3b8',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5]
        }
      ]
    });
  }

  function renderSWPChart(chartData) {
    const labels = chartData.map(d => `Yr ${d.year}`);
    const balance = chartData.map(d => d.balance);
    const withdrawn = chartData.map(d => d.withdrawn);

    updateChart('line', {
      labels,
      datasets: [
        {
          label: 'Remaining Capital Balance',
          data: balance,
          borderColor: '#f43f5e', // Rose 500
          backgroundColor: 'rgba(244, 63, 94, 0.05)',
          fill: true,
          borderWidth: 3
        },
        {
          label: 'Cumulative Withdrawals harvested',
          data: withdrawn,
          borderColor: '#3b82f6', // Blue 500
          backgroundColor: 'transparent',
          borderWidth: 2
        }
      ]
    });
  }

  function renderDoughnutChart(labels, data, colors) {
    updateChart('doughnut', {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1
      }]
    });
  }

  function renderLineChart(labels, datasets) {
    updateChart('line', {
      labels,
      datasets
    });
  }

  // ----------------------------------------------------
  // HTML Layout generators for result fields
  // ----------------------------------------------------

  function renderGrowthResultsHTML(res) {
    const outputEl = document.getElementById('calculator-results');
    outputEl.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div class="p-4 bg-white/5 rounded-xl border border-white/5">
          <span class="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Total Capital Invested</span>
          <span class="text-lg font-bold text-slate-300">${window.UIComponents.formatValue(res.totalInvested, 'currency')}</span>
        </div>
        <div class="p-4 bg-white/5 rounded-xl border border-white/5">
          <span class="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Estimated Interest Gained</span>
          <span class="text-lg font-bold text-indigo-400">${window.UIComponents.formatValue(res.interestGained, 'currency')}</span>
        </div>
        <div class="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
          <span class="text-[10px] uppercase font-bold text-indigo-300 block mb-0.5">Maturity Portfolio Wealth</span>
          <span class="text-lg font-bold text-indigo-400">${window.UIComponents.formatValue(res.futureValue, 'currency')}</span>
        </div>
      </div>
    `;
  }

  function renderSWPResultsHTML(res) {
    const outputEl = document.getElementById('calculator-results');
    const color = res.isDepleted ? 'text-rose-400' : 'text-emerald-400';
    const status = res.isDepleted 
      ? `<i class="fa-solid fa-triangle-exclamation mr-1 text-rose-400"></i> Capital depleted at Year ${res.depletedAtYear}!` 
      : `<i class="fa-solid fa-circle-check mr-1 text-emerald-400"></i> Principal survives the full horizon.`;

    outputEl.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div class="p-4 bg-white/5 rounded-xl border border-white/5">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Total Withdrawals Harvested</span>
          <span class="text-lg font-bold text-indigo-400">${window.UIComponents.formatValue(res.totalWithdrawn, 'currency')}</span>
        </div>
        <div class="p-4 bg-white/5 rounded-xl border border-white/5">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Final Capital Balance</span>
          <span class="text-lg font-bold ${color}">${window.UIComponents.formatValue(res.finalBalance, 'currency')}</span>
        </div>
        <div class="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center text-xs font-semibold ${color}">
          ${status}
        </div>
      </div>
    `;
  }

  // ----------------------------------------------------
  // Dynamic Forms rendering coordinator
  // ----------------------------------------------------

  function loadCalculator(calculatorId) {
    activeCalculatorId = calculatorId;
    
    // De-activate sidebar links and activate selected link
    document.querySelectorAll('aside nav a, aside ul li a').forEach(a => {
      a.classList.remove('bg-indigo-500/10', 'border-indigo-500/20', 'text-indigo-200');
      a.classList.add('text-slate-400', 'hover:text-slate-200', 'hover:bg-white/5');
      
      const linkId = a.getAttribute('data-calculator-id');
      if (linkId === calculatorId) {
        a.classList.add('bg-indigo-500/10', 'border-indigo-500/20', 'text-indigo-200');
        a.classList.remove('text-slate-400', 'hover:text-slate-200', 'hover:bg-white/5');
      }
    });

    const activeCanvas = document.getElementById('active-canvas-view');
    const dashboardCanvas = document.getElementById('active-dashboard-view');
    const onboardingCanvas = document.getElementById('active-onboarding-view');

    // Handle dashboard deep route
    if (calculatorId === 'dashboard') {
      activeCanvas.classList.add('hidden');
      onboardingCanvas.classList.add('hidden');
      dashboardCanvas.classList.remove('hidden');
      renderDashboardHTML();
      return;
    }

    activeCanvas.classList.remove('hidden');
    dashboardCanvas.classList.add('hidden');
    onboardingCanvas.classList.add('hidden');

    const config = CALCULATOR_REGISTRY[calculatorId];
    if (!config) return;

    // Fill titles & header info
    document.getElementById('calc-title').textContent = config.title;
    document.getElementById('calc-desc').textContent = config.desc;

    // Render forms input panel
    const formPanel = document.getElementById('calculator-inputs-panel');
    let formsHTML = '';

    config.fields.forEach(field => {
      if (field.type === 'range') {
        const initialFormatted = window.UIComponents.formatValue(field.value, field.format);
        const jargonAttr = field.jargon ? `class="jargon-term" data-tooltip="${field.jargon}"` : '';

        // Clean currency symbol indicators inside field label text
        const activeCode = (window.AppState && window.AppState.get('currency')) || 'INR';
        const activeSymbol = (window.SUPPORTED_CURRENCIES && window.SUPPORTED_CURRENCIES[activeCode] || { symbol: '₹' }).symbol;
        const cleanedLabel = field.label.replace(/\(\$\)/g, `(${activeSymbol})`).replace(/\$/g, activeSymbol);

        formsHTML += `
          <div class="space-y-1.5 mb-5 last:mb-0">
            <div class="flex justify-between items-center">
              <label ${jargonAttr}>${cleanedLabel}</label>
              <span id="display-${field.id}" class="text-sm font-bold text-indigo-400">${initialFormatted}</span>
            </div>
            <input type="range" 
                   min="${field.min}" 
                   max="${field.max}" 
                   step="${field.step}" 
                   value="${field.value}" 
                   class="custom-slider"
                   data-value-display="display-${field.id}"
                   data-value-format="${field.format}"
                   id="input-${field.id}">
          </div>
        `;
      } else if (field.type === 'select') {
        let optionsHTML = '';
        field.options.forEach(opt => {
          optionsHTML += `<option value="${opt.val}" ${opt.val === field.value ? 'selected' : ''}>${opt.label}</option>`;
        });

        formsHTML += `
          <div class="space-y-1.5 mb-5 last:mb-0">
            <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider block">${field.label}</label>
            <select id="input-${field.id}" class="w-full p-2.5 rounded-xl glass-input text-xs">
              ${optionsHTML}
            </select>
          </div>
        `;
      }
    });

    formPanel.innerHTML = formsHTML;

    // Initialize custom track-fill CSS and value formatters
    window.UIComponents.init();

    // Bind event listeners to recalculate dynamically on changes
    bindFormListeners(calculatorId, config);

    // Initial calculation run
    executeCalculation(calculatorId, config);
  }

  function bindFormListeners(calculatorId, config) {
    config.fields.forEach(field => {
      const el = document.getElementById(`input-${field.id}`);
      if (!el) return;

      const eventName = field.type === 'range' ? 'input' : 'change';
      el.addEventListener(eventName, () => {
        executeCalculation(calculatorId, config);
      });
    });
  }

  function executeCalculation(calculatorId, config) {
    const inputs = {};
    config.fields.forEach(field => {
      const el = document.getElementById(`input-${field.id}`);
      if (el) {
        // Parse numbers if applicable
        inputs[field.id] = field.type === 'range' ? parseFloat(el.value) : el.value;
      }
    });

    const res = config.run(inputs);
    config.render(res);

    // Live AI Coach check nudges
    window.AICoach.evaluate(calculatorId, Object.assign({}, inputs, res));

    // Cache active calculations in memory for "Save Goal" reference
    window.activeCalculatorInputs = inputs;
    window.activeCalculatorResults = res;
  }

  // ----------------------------------------------------
  // Dashboard & Goals Card Renderer
  // ----------------------------------------------------

  function renderDashboardHTML() {
    const container = document.getElementById('active-dashboard-view');
    const goals = window.AppState.get('goals') || [];

    let goalsHTML = '';
    if (goals.length === 0) {
      goalsHTML = `
        <div class="col-span-12 p-10 bg-white/5 rounded-2xl border border-white/5 text-center text-slate-400">
          <i class="fa-solid fa-folder-open text-3xl mb-3 text-slate-600 block"></i>
          No goals saved yet. Open a calculator on the left menu, input parameters, and click "Save as Goal"!
        </div>
      `;
    } else {
      goals.forEach(goal => {
        // Calculate status on-the-fly based on latest return assumptions
        let status = 'On Track';
        let statusColor = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
        
        let finalVal = 0;
        if (goal.calculatorType === 'stepup_sip') {
          const res = window.MathEngine.calculateStepUpSIP(goal.inputs.baseP, goal.inputs.r_annual, goal.inputs.years, goal.inputs.stepUpPct);
          finalVal = res.futureValue;
        } else {
          const p = goal.inputs.p || goal.inputs.baseP || 500;
          const r = goal.inputs.r_annual || 12;
          const y = goal.inputs.years || goal.targetYears;
          const res = window.MathEngine.calculateStandardSIP(p, r, y);
          finalVal = res.futureValue;
        }

        const pctDiff = (finalVal / goal.targetAmount);
        if (pctDiff < 0.8) {
          status = 'Behind';
          statusColor = 'bg-red-500/10 border-red-500/20 text-red-400';
        } else if (pctDiff > 1.25) {
          status = 'Ahead';
          statusColor = 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';
        }

        goalsHTML += `
          <div class="glass-panel p-5 rounded-2xl border border-white/5 relative flex flex-col justify-between">
            <div>
              <div class="flex justify-between items-start mb-3">
                <h4 class="text-sm font-bold text-slate-100">${goal.name}</h4>
                <span class="px-2 py-0.5 rounded text-[8px] font-bold tracking-wide uppercase ${statusColor}">${status}</span>
              </div>
              <div class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Target Valuation</div>
              <div class="text-lg font-black text-slate-200 mt-0.5">${window.UIComponents.formatValue(goal.targetAmount, 'currency')}</div>
            </div>
            
            <div class="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
              <span class="text-[10px] text-slate-400">Horizon: ${goal.targetYears} Years</span>
              <div class="flex gap-2">
                <button onclick="window.StorageEngine.deleteGoal('${goal.id}'); window.CalculatorsController.load('dashboard');" class="h-7 w-7 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition duration-150 active:scale-90">
                  <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
                <button onclick="window.CalculatorsController.load('${goal.calculatorType}')" class="h-7 w-7 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 flex items-center justify-center transition duration-150 active:scale-90">
                  <i class="fa-solid fa-calculator text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      });
    }

    container.innerHTML = `
      <div class="mb-6">
        <span class="text-xs font-bold text-indigo-400 uppercase tracking-widest">Financial Command Center</span>
        <h2 class="text-2xl font-black mt-1 text-slate-100 flex items-center gap-2">
          Your Saved Wealth Goals
        </h2>
        <p class="text-xs text-slate-400 mt-1">
          Monitor linked SIP projections against target amounts computed live on expected compound returns.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${goalsHTML}
      </div>
    `;
  }

  // ----------------------------------------------------
  // Financial Health Score Quiz Generator
  // ----------------------------------------------------

  const QUIZ_QUESTIONS = [
    {
      q: "How many months of basic expenses do you have saved as emergency cash?",
      opts: [
        { text: "None, or less than 1 month", score: 10 },
        { text: "1 to 3 months of basic expenses", score: 50 },
        { text: "6 months or more (Fully Protected)", score: 100 }
      ]
    },
    {
      q: "What percentage of your net monthly income goes toward paying off debts?",
      opts: [
        { text: "Over 50% (High Debt Burden)", score: 15 },
        { text: "20% to 40% (Moderate Debt)", score: 60 },
        { text: "0% to 15% (Healthy / Under Control)", score: 100 }
      ]
    },
    {
      q: "Do you have active term life insurance and dedicated health cover?",
      opts: [
        { text: "Neither, or relying solely on company health policies", score: 20 },
        { text: "Yes, active health cover but no term insurance", score: 60 },
        { text: "Fully covered with active personal policies for both", score: 100 }
      ]
    },
    {
      q: "What portion of your income do you save and invest compounding monthly?",
      opts: [
        { text: "Less than 10%", score: 20 },
        { text: "10% to 25%", score: 70 },
        { text: "Over 30% (Aggressive wealth building)", score: 100 }
      ]
    }
  ];

  let currentQuizStep = 0;
  let quizAccumulatedScores = 0;

  function renderQuizInterface() {
    const outputsEl = document.getElementById('calculator-results');
    const formPanel = document.getElementById('calculator-inputs-panel');
    
    // Clear inputs panel as health score has custom quiz inputs
    formPanel.innerHTML = `
      <div class="p-4 bg-white/5 rounded-2xl border border-white/5 text-xs text-slate-300">
        <i class="fa-solid fa-circle-question mr-1 text-indigo-400"></i> Answer the multiple-choice diagnostic queries on the right to compile your general wealth health score.
      </div>
    `;

    if (currentQuizStep < QUIZ_QUESTIONS.length) {
      const item = QUIZ_QUESTIONS[currentQuizStep];
      let optionsHTML = '';
      
      item.opts.forEach((opt, idx) => {
        optionsHTML += `
          <button onclick="window.CalculatorsController.submitQuizAnswer(${opt.score})" class="w-full text-left p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/20 text-xs font-semibold text-slate-300 transition duration-200 active:scale-[0.98] block">
            ${opt.text}
          </button>
        `;
      });

      outputsEl.innerHTML = `
        <div class="space-y-4 animate-fade-in-up">
          <div class="flex justify-between items-center text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Diagnostic Progress</span>
            <span>Question ${currentQuizStep + 1} of ${QUIZ_QUESTIONS.length}</span>
          </div>
          <div class="h-1 bg-white/10 rounded-full overflow-hidden">
            <div class="h-full bg-indigo-500" style="width: ${((currentQuizStep) / QUIZ_QUESTIONS.length) * 100}%"></div>
          </div>
          <h3 class="text-sm font-bold text-slate-200 mt-2">${item.q}</h3>
          <div class="space-y-2.5 pt-2">
            ${optionsHTML}
          </div>
        </div>
      `;

      // Draw standard doughnut loading progress chart
      renderDoughnutChart(['Quiz Completed', 'Remaining'], [currentQuizStep, QUIZ_QUESTIONS.length - currentQuizStep], ['#818cf8', '#1f2937']);
    } else {
      // Show quiz results
      const finalScore = Math.round(quizAccumulatedScores / QUIZ_QUESTIONS.length);
      
      let rating = 'Poor';
      let ratingColor = 'text-red-400';
      let description = 'Your financial health indicates high vulnerability. Consider building emergency reserves, cutting high-interest debts immediately, and setting up minimal term life covers.';

      if (finalScore >= 80) {
        rating = 'Excellent';
        ratingColor = 'text-emerald-400';
        description = 'Fantastic! You have robust protection foundations, minimal debt drags, and aggressive wealth building habits. Continue regular rebalancing.';
      } else if (finalScore >= 50) {
        rating = 'Moderate';
        ratingColor = 'text-amber-400';
        description = 'You are on the right track but have key exposures. Make sure your emergency cash is fully topped up and work to lift your monthly savings rate past 20%.';
      }

      outputsEl.innerHTML = `
        <div class="p-6 bg-white/5 rounded-2xl border border-white/5 text-center space-y-4 animate-fade-in-up">
          <span class="text-xs uppercase font-bold text-slate-400 block">Diagnosed Health Score</span>
          <span class="text-5xl font-black ${ratingColor}">${finalScore}/100</span>
          <div class="text-sm font-bold uppercase tracking-wider ${ratingColor}">${rating} Rating</div>
          <p class="text-xs text-slate-300 leading-relaxed px-4">${description}</p>
          <button onclick="window.CalculatorsController.resetQuiz()" class="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 transition duration-200 active:scale-95">
            Retake Quiz
          </button>
        </div>
      `;

      renderDoughnutChart(['Score', 'Shortfall'], [finalScore, 100 - finalScore], [finalScore >= 80 ? '#10b981' : (finalScore >= 50 ? '#f59e0b' : '#ef4444'), '#1f2937']);
    }
  }

  // ----------------------------------------------------
  // Onboarding conversational flow ("Coffee Chat")
  // ----------------------------------------------------

  const ONBOARDING_STEPS = [
    {
      q: "What is your main financial priority right now?",
      opts: [
        { text: "Buying a House / Asset Goal", val: "Buy a House" },
        { text: "Escaping High Interest Debt", val: "Debt Relief" },
        { text: "Learning Investment Basics", val: "Basics Study" }
      ]
    },
    {
      q: "If the stock market drops 15% tomorrow morning, you would:",
      opts: [
        { text: "Sell everything to protect remaining cash (Conservative)", val: "conservative" },
        { text: "Hold steady, wait for recovery (Moderate)", val: "moderate" },
        { text: "Buy the dip aggressively to boost returns (Aggressive)", val: "aggressive" }
      ]
    }
  ];

  let onboardingIndex = 0;
  let onboardingAnswers = {};

  function renderOnboardingStep() {
    const canvas = document.getElementById('active-onboarding-view');
    canvas.classList.remove('hidden');
    document.getElementById('active-canvas-view').classList.add('hidden');
    document.getElementById('active-dashboard-view').classList.add('hidden');

    if (onboardingIndex < ONBOARDING_STEPS.length) {
      const step = ONBOARDING_STEPS[onboardingIndex];
      let optionsHTML = '';

      step.opts.forEach((opt, idx) => {
        optionsHTML += `
          <button onclick="window.CalculatorsController.submitOnboarding('${opt.val}', '${opt.text}')" class="w-full text-left p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/20 text-xs font-semibold text-slate-300 transition duration-200 active:scale-[0.98] block">
            ${opt.text}
          </button>
        `;
      });

      canvas.innerHTML = `
        <div class="max-w-md mx-auto p-8 glass-panel rounded-3xl border border-indigo-500/20 bg-indigo-950/5 shadow-2xl text-center space-y-6 animate-fade-in-up mt-12">
          <div class="flex items-center justify-center gap-2 mb-2">
            <div class="h-8 w-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300 text-sm">
              <i class="fa-solid fa-mug-hot"></i>
            </div>
            <span class="text-xs font-bold text-indigo-400 tracking-wider uppercase">Coffee Onboarding Chat</span>
          </div>
          <h2 class="text-base font-bold text-slate-100">${step.q}</h2>
          <div class="space-y-3 pt-2 text-left">
            ${optionsHTML}
          </div>
        </div>
      `;
    } else {
      // Finished onboarding
      canvas.innerHTML = `
        <div class="max-w-md mx-auto p-8 glass-panel rounded-3xl border-indigo-500/20 bg-indigo-950/5 shadow-2xl text-center space-y-6 animate-fade-in-up mt-12">
          <div class="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg mx-auto">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <h2 class="text-base font-black text-slate-100">Your Basecamp Terminal is Ready!</h2>
          <p class="text-xs text-slate-300 leading-relaxed px-2">
            We have calibrated default CAGR return rates and inflation drags in your Profile based on your answers. Let's start building!
          </p>
          <button onclick="window.CalculatorsController.finishOnboarding()" class="px-6 py-2.5 rounded-xl text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition duration-200 active:scale-95">
            Launch Workspace Dashboard
          </button>
        </div>
      `;
    }
  }

  // ----------------------------------------------------
  // Export Global Coordinator Controllers
  // ----------------------------------------------------

  window.CalculatorsController = {
    load(id) {
      loadCalculator(id);
    },

    // Lets other modules (e.g. the AI Coach chat) know which calculator the
    // user is currently looking at, for context-aware answers.
    getActiveId() {
      return activeCalculatorId;
    },
    getActiveTitle() {
      const config = CALCULATOR_REGISTRY[activeCalculatorId];
      return (config && config.title) || activeCalculatorId;
    },

    // Save current calculations as a Goal
    saveActiveAsGoal() {
      if (activeCalculatorId === 'dashboard' || activeCalculatorId === 'health_score') return;

      const name = prompt("Enter a name for this goal:", CALCULATOR_REGISTRY[activeCalculatorId].title);
      if (!name) return;

      const targetStr = prompt("Enter your target goal money valuation amount ($):", "50000");
      const targetAmount = parseFloat(targetStr);
      if (isNaN(targetAmount) || targetAmount <= 0) {
        alert("Invalid target amount.");
        return;
      }

      const yearsVal = window.activeCalculatorInputs.years || 10;
      
      const newGoal = {
        id: 'g-' + Date.now(),
        name,
        targetAmount,
        targetYears: yearsVal,
        calculatorType: activeCalculatorId,
        inputs: window.activeCalculatorInputs
      };

      window.StorageEngine.saveGoal(newGoal);
      alert("Goal successfully saved! Opening goals dashboard.");
      this.load('dashboard');
    },

    // Quiz triggers
    submitQuizAnswer(score) {
      quizAccumulatedScores += score;
      currentQuizStep++;
      renderQuizInterface();
    },
    resetQuiz() {
      currentQuizStep = 0;
      quizAccumulatedScores = 0;
      renderQuizInterface();
    },

    // Onboarding triggers
    submitOnboarding(value, text) {
      if (onboardingIndex === 0) {
        onboardingAnswers.goal = value;
      } else if (onboardingIndex === 1) {
        onboardingAnswers.risk = value;
      }
      
      window.AICoach.speakOnboarding(onboardingIndex, text);
      onboardingIndex++;
      renderOnboardingStep();
    },
    finishOnboarding() {
      // Save onboarding profiles to Storage
      let returnRate = 12;
      let inflation = 6;
      
      if (onboardingAnswers.risk === 'conservative') {
        returnRate = 7;
        inflation = 5;
      } else if (onboardingAnswers.risk === 'aggressive') {
        returnRate = 15;
        inflation = 6;
      }

      window.StorageEngine.saveProfile({
        persona: 'beginner',
        riskProfile: onboardingAnswers.risk,
        expectedReturn: returnRate,
        inflation: inflation,
        income: 6000,
        hasCompletedOnboarding: true
      });

      // Navigate to stepup_sip to let them experiment
      this.load('stepup_sip');
    },

    init() {
      // Bind navbar click router
      document.querySelector('.flex.items-center.gap-3').addEventListener('click', () => {
        this.load('dashboard');
      });

      // Bind all dynamic sidebar anchor routers
      document.querySelectorAll('aside ul li a').forEach(a => {
        // Look up corresponding key
        const rawText = a.querySelector('span') ? a.querySelector('span').textContent : a.textContent;
        const text = rawText.replace(/\s+/g, ' ').trim();
        const key = text.toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        // Match specific sidebar texts to ID keys
        let matchedId = 'dashboard';
        if (text.includes("Step-Up SIP")) matchedId = 'stepup_sip';
        else if (text.includes("Standard SIP")) matchedId = 'standard_sip';
        else if (text.includes("Stock SIP")) matchedId = 'stock_sip';
        else if (text.includes("Bond SIP")) matchedId = 'bond_sip';
        else if (text.includes("Flexi-SIP")) matchedId = 'flexi_sip';
        else if (text.includes("Trigger SIP")) matchedId = 'trigger_sip';
        else if (text.includes("Perpetual SIP")) matchedId = 'perpetual_sip';
        else if (text.includes("Multi-SIP")) matchedId = 'multi_sip';
        else if (text.includes("SIP with Insurance")) matchedId = 'sip_insurance';
        else if (text.includes("Standard SWP")) matchedId = 'standard_swp';
        else if (text.includes("Fixed SWP")) matchedId = 'fixed_swp';
        else if (text.includes("Appreciation SWP")) matchedId = 'appreciation_swp';
        else if (text.includes("Custom SWP")) matchedId = 'custom_swp';
        else if (text.includes("Emergency Fund")) matchedId = 'emergency_fund';
        else if (text.includes("Term Insurance")) matchedId = 'term_insurance';
        else if (text.includes("Health Cover")) matchedId = 'health_cover';
        else if (text.includes("Capital Gains Tax")) matchedId = 'capital_gains';
        else if (text.includes("Portfolio Rebalancing")) matchedId = 'rebalancing';
        else if (text.includes("What-If Stress Tester")) matchedId = 'stress_tester';
        else if (text.includes("Financial Health Score")) matchedId = 'health_score';

        a.setAttribute('data-calculator-id', matchedId);
        a.addEventListener('click', (e) => {
          e.preventDefault();
          this.load(matchedId);
        });
      });

      // Bind topbar "Reset My Data" action
      document.getElementById('btn-reset-data').addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm("Are you sure you want to clear your local profile, portfolio allocations, and saved goals?")) {
          window.StorageEngine.resetAll();
          alert("All local data purged successfully.");
          location.reload();
        }
      });

      // Subscribe to AppState currency changes to refresh active views reactively
      window.AppState.subscribe((state, key) => {
        if (key === 'currency') {
          if (activeCalculatorId === 'dashboard') {
            renderDashboardHTML();
          } else if (activeCalculatorId === 'health_score') {
            renderQuizInterface();
          } else {
            loadCalculator(activeCalculatorId);
          }
        }
      });

      // Check if user has completed onboarding, otherwise launch coffee chat
      const profile = window.AppState.get('profile') || {};
      if (!profile.hasCompletedOnboarding) {
        renderOnboardingStep();
      } else {
        this.load('dashboard');
      }
    }
  };

  // Run automatically on page load
  document.addEventListener('DOMContentLoaded', () => {
    // Delay slightly to ensure storage.js is finished loading
    setTimeout(() => {
      window.CalculatorsController.init();
    }, 50);
  });

})();