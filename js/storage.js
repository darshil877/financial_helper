/**
 * WebCraft Finance - storage.js
 * Client-side persistence layer utilizing browser localStorage with Supabase cloud sync hooks.
 * Keeps local cache as the fast source of truth, and pushes debounced updates to the cloud.
 * 
 * ============================================================================
 * PERSISTENT DATA SCHEMAS (JSON REPRESENTATIONS)
 * ============================================================================
 * 
 * 1. Profile Object Schema (Key: `wcf_profile`):
 * {
 *   "persona": "beginner" | "professional",
 *   "currency": "INR" | "USD" | "EUR" | "GBP" | "AED" | "SGD",
 *   "riskProfile": "conservative" | "moderate" | "aggressive",
 *   "expectedReturn": number, // Default growth return percentage (e.g. 12)
 *   "inflation": number       // Default inflation drag percentage (e.g. 6)
 * }
 * 
 * NOTE ON SAVED GOALS & CURRENCY (Section 6):
 * Saved goal values and inputs are stored as raw numbers. They do not carry a hardcoded 
 * currency tag, meaning their amounts will simply be displayed in whatever global currency 
 * is currently active. Real FX currency conversion is NOT performed.
 * ============================================================================
 */
(function() {

  // Default templates to fall back on
  const DEFAULT_PROFILE = {
    persona: 'beginner',
    currency: 'INR',
    riskProfile: 'moderate',
    expectedReturn: 12,
    inflation: 6,
    income: 6000,
    hasCompletedOnboarding: false
  };

  const DEFAULT_PORTFOLIO = {
    current: { equity: 60000, debt: 25000, gold: 5000, cash: 10000, realestate: 0 },
    target: { equity: 60, debt: 20, gold: 10, cash: 10, realestate: 0 }
  };

  const DEFAULT_GOALS = [
    {
      id: 'g-default-1',
      name: 'Emergency Fund Starter',
      targetAmount: 15000,
      targetYears: 2,
      calculatorType: 'stepup_sip',
      inputs: {
        baseP: 500,
        r_annual: 8,
        years: 2,
        stepUpPct: 10
      }
    }
  ];

  // ----------------------------------------------------
  // Mapping Helpers (camelCase <=> snake_case columns)
  // ----------------------------------------------------
  
  function mapProfileToDb(profile, userId) {
    return {
      id: userId,
      persona: profile.persona || 'beginner',
      currency: profile.currency || 'INR',
      risk_profile: profile.riskProfile || 'moderate',
      expected_return: profile.expectedReturn || 12,
      inflation: profile.inflation || 6,
      updated_at: new Date().toISOString()
    };
  }

  function mapDbToProfile(row) {
    if (!row) return null;
    return {
      persona: row.persona,
      currency: row.currency || 'INR',
      riskProfile: row.risk_profile,
      expectedReturn: parseFloat(row.expected_return),
      inflation: parseFloat(row.inflation),
      income: 6000, // standard default
      hasCompletedOnboarding: true
    };
  }

  function mapGoalToDb(goal, userId) {
    return {
      id: goal.id,
      user_id: userId,
      name: goal.name,
      target_amount: goal.targetAmount,
      target_years: goal.targetYears,
      calculator_type: goal.calculatorType,
      inputs: goal.inputs,
      updated_at: new Date().toISOString()
    };
  }

  function mapDbToGoal(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      targetAmount: parseFloat(row.target_amount),
      targetYears: parseFloat(row.target_years),
      calculatorType: row.calculator_type,
      inputs: row.inputs
    };
  }

  // Check if the current guest session contains customized (non-default) settings
  function isGuestDataCustomized() {
    const profile = JSON.parse(localStorage.getItem('wcf_profile') || '{}');
    const portfolio = JSON.parse(localStorage.getItem('wcf_portfolio') || '{}');
    const goals = JSON.parse(localStorage.getItem('wcf_goals') || '[]');

    const profileCustomized = profile.riskProfile !== DEFAULT_PROFILE.riskProfile || 
                              profile.expectedReturn !== DEFAULT_PROFILE.expectedReturn ||
                              profile.hasCompletedOnboarding === true;

    const portfolioCustomized = JSON.stringify(portfolio.current) !== JSON.stringify(DEFAULT_PORTFOLIO.current) ||
                                JSON.stringify(portfolio.target) !== JSON.stringify(DEFAULT_PORTFOLIO.target);

    const goalsCustomized = goals.length !== 1 || (goals.length > 0 && goals[0].id !== DEFAULT_GOALS[0].id);

    return profileCustomized || portfolioCustomized || goalsCustomized;
  }

  const StorageEngine = {
    
    // Load local cache and establish subscription listeners
    init() {
      // Load Profile
      let profile = localStorage.getItem('wcf_profile');
      if (profile) {
        profile = JSON.parse(profile);
      } else {
        profile = { ...DEFAULT_PROFILE };
        localStorage.setItem('wcf_profile', JSON.stringify(profile));
      }
      window.AppState.set('persona', profile.persona);
      window.AppState.set('currency', profile.currency || 'INR');
      window.AppState.set('profile', profile);

      // Load Portfolio
      let portfolio = localStorage.getItem('wcf_portfolio');
      if (portfolio) {
        portfolio = JSON.parse(portfolio);
      } else {
        portfolio = { ...DEFAULT_PORTFOLIO };
        localStorage.setItem('wcf_portfolio', JSON.stringify(portfolio));
      }
      window.AppState.set('portfolio', portfolio);

      // Load Goals
      let goals = localStorage.getItem('wcf_goals');
      if (goals) {
        goals = JSON.parse(goals);
      } else {
        goals = [ ...DEFAULT_GOALS ];
        localStorage.setItem('wcf_goals', JSON.stringify(goals));
      }
      window.AppState.set('goals', goals);

      // Subscribe to AppState updates to trigger localStorage and Cloud saves
      let saveTimeout;
      window.AppState.subscribe((state, key) => {
        if (key === 'profile' || key === 'portfolio' || key === 'goals' || key === 'persona' || key === 'currency') {
          clearTimeout(saveTimeout);
          saveTimeout = setTimeout(async () => {
            
            // Sync persona and currency back to profile object
            const currentProfile = window.AppState.get('profile') || {};
            let profileChanged = false;
            if (currentProfile.persona !== state.persona) {
              currentProfile.persona = state.persona;
              profileChanged = true;
            }
            if (currentProfile.currency !== state.currency) {
              currentProfile.currency = state.currency;
              profileChanged = true;
            }
            if (profileChanged) {
              localStorage.setItem('wcf_profile', JSON.stringify(currentProfile));
            }
            
            // Write local cache
            localStorage.setItem('wcf_portfolio', JSON.stringify(state.portfolio));
            localStorage.setItem('wcf_goals', JSON.stringify(state.goals));

            // Sync to Supabase if signed in
            if (window.Auth) {
              const user = await window.Auth.getCurrentUser();
              if (user) {
                try {
                  if (key === 'profile' || key === 'persona' || key === 'currency') {
                    await window.SupabaseClient
                      .from('profiles')
                      .upsert(mapProfileToDb(window.AppState.get('profile'), user.id));
                  }
                  if (key === 'portfolio') {
                    await window.SupabaseClient
                      .from('portfolios')
                      .upsert({
                        id: user.id,
                        current: state.portfolio.current,
                        target: state.portfolio.target,
                        updated_at: new Date().toISOString()
                      });
                  }
                  if (key === 'goals') {
                    // Re-sync all goals (delete old, insert current)
                    await window.SupabaseClient.from('goals').delete().eq('user_id', user.id);
                    if (state.goals.length > 0) {
                      const dbGoals = state.goals.map(g => mapGoalToDb(g, user.id));
                      await window.SupabaseClient.from('goals').insert(dbGoals);
                    }
                  }
                } catch (err) {
                  // Fail silently in the UI; log to console for auditing
                  console.warn("Failed background cloud upsert tick:", err);
                }
              }
            }

          }, 400); // 400ms debounce
        }
      });
    },

    // Save active profile modifications locally
    saveProfile(profileData) {
      const merged = { ...window.AppState.get('profile'), ...profileData };
      window.AppState.set('profile', merged);
      localStorage.setItem('wcf_profile', JSON.stringify(merged));
    },

    // Save active portfolio values locally
    savePortfolio(portfolioData) {
      window.AppState.set('portfolio', portfolioData);
      localStorage.setItem('wcf_portfolio', JSON.stringify(portfolioData));
    },

    // Save/Add a Goal locally
    saveGoal(goal) {
      const goals = [ ...window.AppState.get('goals') ];
      const index = goals.findIndex(g => g.id === goal.id);
      
      if (index > -1) {
        goals[index] = goal;
      } else {
        goals.push(goal);
      }

      window.AppState.set('goals', goals);
      localStorage.setItem('wcf_goals', JSON.stringify(goals));
    },

    // Delete a Goal locally
    deleteGoal(goalId) {
      let goals = [ ...window.AppState.get('goals') ];
      goals = goals.filter(g => g.id !== goalId);
      window.AppState.set('goals', goals);
      localStorage.setItem('wcf_goals', JSON.stringify(goals));
    },

    // Completely purge storage and restart default
    resetAll() {
      localStorage.removeItem('wcf_profile');
      localStorage.removeItem('wcf_portfolio');
      localStorage.removeItem('wcf_goals');
      this.init();
    },

    // ----------------------------------------------------
    // Cloud Sync Operations (syncUp, syncDown, conflict resolution)
    // ----------------------------------------------------

    /**
     * Push current local state up to Supabase
     */
    async syncUp(userId) {
      if (!window.SupabaseClient) return;
      
      try {
        const profile = window.AppState.get('profile');
        const portfolio = window.AppState.get('portfolio');
        const goals = window.AppState.get('goals');

        // Upsert profile
        await window.SupabaseClient
          .from('profiles')
          .upsert(mapProfileToDb(profile, userId));

        // Upsert portfolio
        await window.SupabaseClient
          .from('portfolios')
          .upsert({
            id: userId,
            current: portfolio.current,
            target: portfolio.target,
            updated_at: new Date().toISOString()
          });

        // Re-sync goals
        await window.SupabaseClient.from('goals').delete().eq('user_id', userId);
        if (goals.length > 0) {
          const dbGoals = goals.map(g => mapGoalToDb(g, userId));
          await window.SupabaseClient.from('goals').insert(dbGoals);
        }
        
        console.log("Cloud syncUp completed successfully.");
      } catch (err) {
        console.warn("Failed syncUp push:", err);
      }
    },

    /**
     * Pull remote cloud state down to local AppState and cache
     */
    async syncDown(userId) {
      if (!window.SupabaseClient) return;

      try {
        // Fetch profile
        const { data: profiles } = await window.SupabaseClient
          .from('profiles')
          .select('*')
          .eq('id', userId);

        // Fetch portfolio
        const { data: portfolios } = await window.SupabaseClient
          .from('portfolios')
          .select('*')
          .eq('id', userId);

        // Fetch goals
        const { data: goals } = await window.SupabaseClient
          .from('goals')
          .select('*')
          .eq('user_id', userId);

        // Map and update local cache
        if (profiles && profiles.length > 0) {
          const profile = mapDbToProfile(profiles[0]);
          localStorage.setItem('wcf_profile', JSON.stringify(profile));
          window.AppState.set('profile', profile);
          window.AppState.set('persona', profile.persona);
        }

        if (portfolios && portfolios.length > 0) {
          const portfolio = {
            current: portfolios[0].current,
            target: portfolios[0].target
          };
          localStorage.setItem('wcf_portfolio', JSON.stringify(portfolio));
          window.AppState.set('portfolio', portfolio);
        }

        if (goals) {
          const goalsList = goals.map(mapDbToGoal);
          localStorage.setItem('wcf_goals', JSON.stringify(goalsList));
          window.AppState.set('goals', goalsList);
        }

        console.log("Cloud syncDown completed successfully.");
      } catch (err) {
        console.warn("Failed syncDown pull:", err);
      }
    },

    /**
     * Resolves data conflict on user login.
     * @param {string} userId 
     * @param {function(function, function): void} onMergePrompt 
     */
    async handleLoginSync(userId, onMergePrompt) {
      if (!window.SupabaseClient) return;

      try {
        // Check if there is existing data in the cloud
        const { data: profiles } = await window.SupabaseClient
          .from('profiles')
          .select('id')
          .eq('id', userId);
        
        const hasRemoteData = profiles && profiles.length > 0;
        const localIsCustomized = isGuestDataCustomized();

        if (hasRemoteData && localIsCustomized) {
          // Both sides have customized records -> trigger the UI choice panel callback
          onMergePrompt(
            // Keep Cloud Callback
            async () => {
              await this.syncDown(userId);
            },
            // Keep Local Guest Callback
            async () => {
              await this.syncUp(userId);
            }
          );
        } else if (hasRemoteData) {
          // Cloud has data, local is default -> pull cloud immediately
          await this.syncDown(userId);
        } else {
          // Cloud has no data (new registration or empty DB) -> push local state
          await this.syncUp(userId);
        }
      } catch (err) {
        console.error("Login data sync error:", err);
        // Default to pulling cloud data to be safe
        await this.syncDown(userId);
      }
    }
  };

  // Export globally
  window.StorageEngine = StorageEngine;

  // Run initial loading
  StorageEngine.init();

})();
