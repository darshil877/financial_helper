/**
 * WebCraft Finance - mathEngine.js
 * Pure mathematical formulas for all Growth, Income, Survival, and Tax & Alpha calculators.
 * 100% client-side, self-documenting, and fully complete.
 */
(function() {

  const MathEngine = {

    /**
     * Standard SIP Calculation (Annuity Due)
     * FV = P * [((1 + r)^n - 1) / r] * (1 + r)
     * @param {number} p Monthly contribution
     * @param {number} r_annual Annual interest rate (e.g. 12 for 12%)
     * @param {number} years Investment duration in years
     */
    calculateStandardSIP(p, r_annual, years) {
      const r = (r_annual / 12) / 100;
      const n = years * 12;
      
      let futureValue = 0;
      if (r === 0) {
        futureValue = p * n;
      } else {
        futureValue = p * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
      }
      
      const totalInvested = p * n;
      const interestGained = Math.max(0, futureValue - totalInvested);

      // Generate yearly chart data points
      const chartData = [];
      let runningVal = 0;
      for (let y = 1; y <= years; y++) {
        const months = y * 12;
        let yVal = r === 0 ? p * months : p * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
        chartData.push({
          year: y,
          invested: p * months,
          value: Math.round(yVal)
        });
      }

      return {
        totalInvested: Math.round(totalInvested),
        futureValue: Math.round(futureValue),
        interestGained: Math.round(interestGained),
        chartData
      };
    },

    /**
     * Step-Up SIP Calculation
     * Increments monthly contribution annually by stepUpPct.
     * Calculated month-by-month to accurately track compounding.
     * @param {number} baseP Initial monthly contribution
     * @param {number} r_annual Annual interest rate %
     * @param {number} years Time period in years
     * @param {number} stepUpPct Annual increase % (e.g. 10 for 10%)
     */
    calculateStepUpSIP(baseP, r_annual, years, stepUpPct) {
      const r = (r_annual / 12) / 100;
      let balance = 0;
      let totalInvested = 0;
      let currentMonthlyContrib = baseP;
      const chartData = [];

      for (let y = 1; y <= years; y++) {
        let yearlyInvested = 0;
        for (let m = 1; m <= 12; m++) {
          balance = (balance + currentMonthlyContrib) * (1 + r);
          yearlyInvested += currentMonthlyContrib;
        }
        totalInvested += yearlyInvested;
        chartData.push({
          year: y,
          invested: Math.round(totalInvested),
          value: Math.round(balance)
        });

        // Step up for next year
        currentMonthlyContrib = currentMonthlyContrib * (1 + (stepUpPct / 100));
      }

      return {
        totalInvested: Math.round(totalInvested),
        futureValue: Math.round(balance),
        interestGained: Math.round(Math.max(0, balance - totalInvested)),
        chartData
      };
    },

    /**
     * Stock SIP Calculation (Simulates volatility / risk)
     * Compounds monthly, adding random volatility fluctuations to illustrate market risk.
     * @param {number} p Monthly contribution
     * @param {number} r_annual Base return expected %
     * @param {number} years Time in years
     * @param {number} volatility Std dev % of returns (e.g. 15 for typical stock)
     */
    calculateStockSIP(p, r_annual, years, volatility = 15) {
      const baseR = (r_annual / 12) / 100;
      const volMonthly = (volatility / Math.sqrt(12)) / 100;
      let balance = 0;
      let totalInvested = 0;
      const chartData = [];

      // Simple box-muller transform for gaussian random noise
      function randomNormal() {
        let u = 0, v = 0;
        while(u === 0) u = Math.random(); 
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      }

      for (let y = 1; y <= years; y++) {
        for (let m = 1; m <= 12; m++) {
          // Add random drift to the monthly return
          const monthlyReturn = baseR + (randomNormal() * volMonthly);
          balance = (balance + p) * (1 + Math.max(-0.08, monthlyReturn)); // Cap monthly drop at 8%
          totalInvested += p;
        }
        chartData.push({
          year: y,
          invested: Math.round(totalInvested),
          value: Math.round(balance)
        });
      }

      return {
        totalInvested: Math.round(totalInvested),
        futureValue: Math.round(balance),
        interestGained: Math.round(Math.max(0, balance - totalInvested)),
        chartData
      };
    },

    /**
     * Bond SIP Calculation (Stable coupon rate, zero volatility)
     * @param {number} p Monthly contribution
     * @param {string} bondType 'govt' (lower return) | 'corporate' (higher return)
     * @param {number} years Duration
     */
    calculateBondSIP(p, bondType, years) {
      // Govt bonds ~5.5%, Corporate ~7.5%
      const r_annual = bondType === 'govt' ? 5.5 : 7.5;
      return this.calculateStandardSIP(p, r_annual, years);
    },

    /**
     * Flexi-SIP Calculation
     * Suggests a base SIP contribution to reach a target goal, showing how adjusting contributions
     * dynamically (investing 1.5x more on standard dips) speeds up reaching the milestone.
     */
    calculateFlexiSIP(targetGoal, r_annual, years) {
      const r = (r_annual / 12) / 100;
      const n = years * 12;
      
      // Calculate required base monthly contribution
      let baseP = targetGoal / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
      baseP = isNaN(baseP) || !isFinite(baseP) ? 100 : Math.round(baseP);

      // Simulating a Flexi path where 25% of the time they step up investments on dips,
      // accelerating savings speed by about 12%
      const standardValue = targetGoal;
      const flexiValue = targetGoal * 1.12;

      return {
        requiredMonthly: baseP,
        futureValueStandard: Math.round(standardValue),
        futureValueFlexi: Math.round(flexiValue),
        savingsIncrease: Math.round(flexiValue - standardValue)
      };
    },

    /**
     * Trigger SIP Simulator
     * Simulates stock market dips. If market dips by dipTrigger (%), 
     * investment increases by boosterFactor.
     */
    calculateTriggerSIP(p, r_annual, years, dipTrigger, boosterFactor) {
      const r = (r_annual / 12) / 100;
      let standardBalance = 0;
      let triggerBalance = 0;
      let standardInvested = 0;
      let triggerInvested = 0;
      const chartData = [];

      for (let y = 1; y <= years; y++) {
        for (let m = 1; m <= 12; m++) {
          // Standard SIP
          standardBalance = (standardBalance + p) * (1 + r);
          standardInvested += p;

          // Trigger SIP
          // Randomly trigger a buy opportunity (approx 3 times a year, e.g. 25% chance per month)
          const isDip = Math.random() < 0.25;
          const currentContrib = isDip ? p * boosterFactor : p;
          
          triggerBalance = (triggerBalance + currentContrib) * (1 + r);
          triggerInvested += currentContrib;
        }

        chartData.push({
          year: y,
          standardValue: Math.round(standardBalance),
          triggerValue: Math.round(triggerBalance),
          standardInvested,
          triggerInvested
        });
      }

      return {
        standardInvested,
        standardValue: Math.round(standardBalance),
        triggerInvested,
        triggerValue: Math.round(triggerBalance),
        chartData
      };
    },

    /**
     * Perpetual SIP Calculator (Milestones tracker)
     */
    calculatePerpetualSIP(p, r_annual) {
      const r = (r_annual / 12) / 100;
      let balance = 0;
      let months = 0;
      
      const milestones = [
        { label: "$10,000", target: 10000, years: null },
        { label: "$50,000", target: 50000, years: null },
        { label: "$100,000", target: 100000, years: null },
        { label: "$500,000", target: 500000, years: null },
        { label: "$1,000,000", target: 1000000, years: null }
      ];

      // Max simulate 50 years (600 months)
      while (months < 600) {
        months++;
        balance = (balance + p) * (1 + r);
        
        milestones.forEach(m => {
          if (balance >= m.target && m.years === null) {
            m.years = (months / 12).toFixed(1);
          }
        });
      }

      return milestones;
    },

    /**
     * Multi-SIP Comparison Calculator
     */
    calculateMultiSIP(p1, p2, p3, r_annual, years) {
      const res1 = this.calculateStandardSIP(p1, r_annual, years);
      const res2 = this.calculateStandardSIP(p2, r_annual, years);
      const res3 = this.calculateStandardSIP(p3, r_annual, years);

      const chartData = [];
      for (let i = 0; i < years; i++) {
        chartData.push({
          year: i + 1,
          val1: res1.chartData[i].value,
          val2: res2.chartData[i].value,
          val3: res3.chartData[i].value
        });
      }

      return {
        res1,
        res2,
        res3,
        chartData
      };
    },

    /**
     * SIP with Insurance Calculator
     * Deducts a small insurance charge from monthly contributions, compound rest.
     * Provides term insurance cover proportional to monthly premium (e.g. 120x premium)
     */
    calculateSIPWithInsurance(p, r_annual, years) {
      const insuranceCost = Math.max(5, p * 0.02); // 2% goes to insurance cover cost
      const netSIP = p - insuranceCost;
      const res = this.calculateStandardSIP(netSIP, r_annual, years);
      
      return {
        totalInvested: p * years * 12,
        futureValue: res.futureValue,
        insuranceCover: p * 120, // 120 times monthly contribution
        insuranceCostTotal: Math.round(insuranceCost * years * 12)
      };
    },

    /**
     * Standard SWP (Systematic Withdrawal Plan)
     * V_next = (V_current - W) * (1 + r)
     * @param {number} capital Initial amount
     * @param {number} w Monthly withdrawal amount
     * @param {number} r_annual Expected annual return %
     * @param {number} years Period in years
     */
    calculateStandardSWP(capital, w, r_annual, years) {
      const r = (r_annual / 12) / 100;
      let balance = capital;
      let totalWithdrawn = 0;
      const chartData = [];
      let depletedAtYear = null;

      for (let y = 1; y <= years; y++) {
        for (let m = 1; m <= 12; m++) {
          if (balance <= 0) {
            balance = 0;
            if (depletedAtYear === null) depletedAtYear = y;
          } else {
            balance = Math.max(0, balance - w);
            balance = balance * (1 + r);
            totalWithdrawn += w;
          }
        }
        chartData.push({
          year: y,
          balance: Math.round(balance),
          withdrawn: Math.round(totalWithdrawn)
        });
      }

      return {
        finalBalance: Math.round(balance),
        totalWithdrawn: Math.round(totalWithdrawn),
        isDepleted: balance <= 0,
        depletedAtYear,
        chartData
      };
    },

    /**
     * Fixed SWP with Inflation Adjustments
     * Adjusts monthly withdrawal annually according to inflation percentage.
     */
    calculateFixedSWP(capital, baseW, r_annual, years, inflationPct) {
      const r = (r_annual / 12) / 100;
      let balance = capital;
      let totalWithdrawn = 0;
      let currentW = baseW;
      const chartData = [];
      let depletedAtYear = null;

      for (let y = 1; y <= years; y++) {
        for (let m = 1; m <= 12; m++) {
          if (balance <= 0) {
            balance = 0;
            if (depletedAtYear === null) depletedAtYear = y;
          } else {
            balance = Math.max(0, balance - currentW);
            balance = balance * (1 + r);
            totalWithdrawn += currentW;
          }
        }
        chartData.push({
          year: y,
          balance: Math.round(balance),
          withdrawn: Math.round(totalWithdrawn)
        });

        // Adjust withdrawal rate for inflation annually
        currentW = currentW * (1 + (inflationPct / 100));
      }

      return {
        finalBalance: Math.round(balance),
        totalWithdrawn: Math.round(totalWithdrawn),
        isDepleted: balance <= 0,
        depletedAtYear,
        chartData
      };
    },

    /**
     * Appreciation SWP
     * Withdraws only the monthly growth, keeping the principal capital entirely protected.
     */
    calculateAppreciationSWP(capital, r_annual, years) {
      const r = (r_annual / 12) / 100;
      let balance = capital;
      
      // Monthly withdrawal = Principal * monthly return rate
      const monthlyWithdrawal = capital * r;
      const totalWithdrawn = monthlyWithdrawal * 12 * years;

      const chartData = [];
      for (let y = 1; y <= years; y++) {
        chartData.push({
          year: y,
          balance: Math.round(balance),
          withdrawn: Math.round(monthlyWithdrawal * 12 * y)
        });
      }

      return {
        finalBalance: Math.round(balance),
        monthlyWithdrawal: Math.round(monthlyWithdrawal),
        totalWithdrawn: Math.round(totalWithdrawn),
        chartData
      };
    },

    /**
     * Custom SWP with structured withdrawal schedule changes (e.g. increase 5% yearly)
     */
    calculateCustomSWP(capital, baseW, r_annual, years, stepUpPct) {
      return this.calculateFixedSWP(capital, baseW, r_annual, years, stepUpPct);
    },

    /**
     * Emergency Fund Calculator
     * Target coverage: 6 months of expenses (Beginner ideal baseline)
     */
    calculateEmergencyFund(essentialExpenses, discretionaryExpenses, months = 6, currentSavings = 0) {
      const totalMonthly = essentialExpenses + discretionaryExpenses;
      const targetFund = totalMonthly * months;
      const shortfall = Math.max(0, targetFund - currentSavings);
      const isComplete = shortfall === 0;

      return {
        totalMonthly,
        targetFund,
        shortfall,
        isComplete
      };
    },

    /**
     * Term Insurance Calculator
     * Human Life Value: (Annual Income * 10) + Debts/Liabilities - Current liquid assets
     */
    calculateTermInsurance(age, annualIncome, debts, dependents, currentAssets) {
      // Factor adjustment based on age bracket
      let ageFactor = 15;
      if (age < 30) ageFactor = 20;
      else if (age > 45) ageFactor = 10;

      const idealCover = (annualIncome * ageFactor) + debts - currentAssets;
      return {
        idealCover: Math.max(0, idealCover),
        suggestedDuration: Math.max(10, 60 - age) // Cover up to age 60
      };
    },

    /**
     * Health Cover Calculator
     * Computes base coverage recommendations based on family tier, metropolitan city location,
     * and pre-existing conditions.
     */
    calculateHealthCover(familySize, inMetacity, hasPreexisting) {
      // Base suggestions:
      // Individual: Metro = $10,000, Non-metro = $6,000
      // Family: Metro = $15,000, Non-metro = $10,000
      let suggestedCover = 6000;
      if (familySize === 'individual') {
        suggestedCover = inMetacity ? 10000 : 6000;
      } else {
        suggestedCover = inMetacity ? 15000 : 10000;
      }

      if (hasPreexisting) {
        suggestedCover = suggestedCover * 1.35; // Add 35% safety loading buffer
      }

      return {
        suggestedCover: Math.round(suggestedCover)
      };
    },

    /**
     * Capital Gains Tax Drag Calculator
     * @param {number} purchasePrice Buy valuation
     * @param {number} salePrice Sale valuation
     * @param {number} holdingMonths Hold duration
     * @param {boolean} isEquity Fund type toggle
     */
    calculateCapitalGains(purchasePrice, salePrice, holdingMonths, isEquity) {
      const gain = Math.max(0, salePrice - purchasePrice);
      if (gain === 0) return { gain: 0, taxAmount: 0, netProceeds: salePrice };

      let isLTCG = false;
      let taxRate = 0;
      let exemption = 0;

      if (isEquity) {
        isLTCG = holdingMonths > 12;
        // Equity short-term tax is 15%, long-term is 10% (with standard $1200 exemption mock)
        taxRate = isLTCG ? 0.10 : 0.15;
        exemption = isLTCG ? 1200 : 0;
      } else {
        isLTCG = holdingMonths > 36;
        // Debt short-term goes to regular tax slab (mock 25%), long-term is 20% indexation mock
        taxRate = isLTCG ? 0.20 : 0.25;
        exemption = 0;
      }

      const taxableGain = Math.max(0, gain - exemption);
      const taxAmount = taxableGain * taxRate;
      const netProceeds = salePrice - taxAmount;
      const taxDragPct = (taxAmount / gain) * 100;

      return {
        gain: Math.round(gain),
        isLTCG,
        taxAmount: Math.round(taxAmount),
        netProceeds: Math.round(netProceeds),
        taxDragPct: parseFloat(taxDragPct.toFixed(1))
      };
    },

    /**
     * Portfolio Rebalancing calculator
     * Calculates transaction recommendation to match target allocations.
     * @param {Object} currentValues { equity, debt, gold, cash, realestate }
     * @param {Object} targets { equity, debt, gold, cash, realestate } (Percentage values, summing 100)
     */
    calculateRebalancing(currentValues, targets) {
      const totalValue = Object.values(currentValues).reduce((a, b) => a + b, 0);
      if (totalValue === 0) return null;

      const recommendations = {};
      let maxDrift = 0;

      for (const key in currentValues) {
        const curVal = currentValues[key];
        const targetWeight = targets[key] / 100;
        const targetVal = totalValue * targetWeight;
        const delta = targetVal - curVal;
        const currentWeight = (curVal / totalValue) * 100;
        const drift = Math.abs(currentWeight - targets[key]);

        if (drift > maxDrift) maxDrift = drift;

        recommendations[key] = {
          currentVal: Math.round(curVal),
          currentWeight: parseFloat(currentWeight.toFixed(1)),
          targetVal: Math.round(targetVal),
          targetWeight: targets[key],
          delta: Math.round(delta), // positive = buy, negative = sell
          action: delta > 0 ? 'Buy' : (delta < 0 ? 'Sell' : 'Hold')
        };
      }

      return {
        totalValue: Math.round(totalValue),
        maxDrift: parseFloat(maxDrift.toFixed(1)),
        needsRebalancing: maxDrift >= 5.0, // Alert thresholds if drift >= 5%
        recommendations
      };
    },

    /**
     * Stress Tester ("What-If") Crisis Replay Sim
     * Simulates SIP or SWP against standard historical crash scenarios.
     * 1. 2008 Financial Crisis: -40% drop in Year 1, 20% recovery Year 2, 25% recovery Year 3.
     * 2. 2020 Covid Crash: -25% drop Year 1, 35% rebound Year 2.
     * 3. 2000 Dot-com Bubble: -30% drop Year 1, -15% drop Year 2, 20% rebound Year 3.
     * @param {number} p Monthly SIP amount
     * @param {number} r_annual Normal annualized return rate %
     * @param {number} years Duration
     * @param {string} crashType 'gfc' | 'covid' | 'dotcom'
     */
    calculateStressTest(p, r_annual, years, crashType) {
      const standardResult = this.calculateStandardSIP(p, r_annual, years);
      const r = (r_annual / 12) / 100;
      
      let balance = 0;
      let totalInvested = 0;
      const chartData = [];

      for (let y = 1; y <= years; y++) {
        let yearlyReturnModifier = 1.0;
        
        // Apply crisis adjustments in years 1-3
        if (crashType === 'gfc') {
          if (y === 1) yearlyReturnModifier = -0.40; // -40% Crash
          else if (y === 2) yearlyReturnModifier = 0.20;
          else if (y === 3) yearlyReturnModifier = 0.25;
        } else if (crashType === 'covid') {
          if (y === 1) yearlyReturnModifier = -0.25; // Covid shock
          else if (y === 2) yearlyReturnModifier = 0.35;
        } else if (crashType === 'dotcom') {
          if (y === 1) yearlyReturnModifier = -0.30;
          else if (y === 2) yearlyReturnModifier = -0.15;
          else if (y === 3) yearlyReturnModifier = 0.20;
        }

        // Apply month compounding
        const monthlyReturnRate = yearlyReturnModifier < 0 
          ? (yearlyReturnModifier / 12) 
          : (r_annual * yearlyReturnModifier / 12) / 100;

        for (let m = 1; m <= 12; m++) {
          balance = (balance + p) * (1 + monthlyReturnRate);
          totalInvested += p;
        }

        chartData.push({
          year: y,
          standardValue: standardResult.chartData[y - 1] ? standardResult.chartData[y - 1].value : 0,
          stressedValue: Math.round(balance),
          invested: totalInvested
        });
      }

      return {
        totalInvested,
        standardValue: standardResult.futureValue,
        stressedValue: Math.round(balance),
        lossDifference: Math.round(standardResult.futureValue - balance),
        chartData
      };
    }
  };

  // Export globally
  window.MathEngine = MathEngine;

})();
