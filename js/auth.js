/**
 * WebCraft Finance - auth.js
 * Wrapper for Supabase Auth services (signUp, signIn, signOut, state changes).
 * Runs directly in browser via file:// (no ES module CORS issues).
 */
(function() {

  // Translate standard Supabase Auth errors into readable user notices
  function getFriendlyErrorMessage(err) {
    if (!err) return "An unexpected error occurred.";
    const msg = err.message || "";
    
    if (msg.includes("Invalid login credentials")) {
      return "Incorrect email or password. Please try again.";
    }
    if (msg.includes("User already registered") || msg.includes("email already exists")) {
      return "This email is already registered. Try logging in instead.";
    }
    if (msg.includes("should be at least 6 characters")) {
      return "Your password must be at least 6 characters long.";
    }
    if (msg.includes("Email address is invalid") || msg.includes("invalid format")) {
      return "Please enter a valid email address.";
    }
    if (msg.includes("Email not confirmed")) {
      return "Please check your inbox and confirm your email before logging in.";
    }
    return msg;
  }

  const Auth = {
    
    /**
     * Sign Up a new user with email and password
     */
    async signUp(email, password) {
      if (!window.SupabaseClient) {
        throw new Error("Supabase client is not initialized.");
      }

      try {
        const { data, error } = await window.SupabaseClient.auth.signUp({
          email,
          password
        });

        if (error) throw error;

        // If email confirmation is disabled, user logs in immediately
        if (data.user) {
          // Initialize default profile and portfolio tables on Postgres client-side
          await this.initializeUserData(data.user.id);
          return { user: data.user, session: data.session };
        }
        return data;
      } catch (err) {
        throw new Error(getFriendlyErrorMessage(err));
      }
    },

    /**
     * Sign In an existing user
     */
    async signIn(email, password) {
      if (!window.SupabaseClient) {
        throw new Error("Supabase client is not initialized.");
      }

      try {
        // Backup the guest local storage data before logging in, so it can be restored on logout
        this.backupGuestData();

        const { data, error } = await window.SupabaseClient.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;
        return data;
      } catch (err) {
        throw new Error(getFriendlyErrorMessage(err));
      }
    },

    /**
     * Sign Out active session and restore local guest cache
     */
    async signOut() {
      if (!window.SupabaseClient) return;
      
      try {
        await window.SupabaseClient.auth.signOut();
        
        // Restore guest local session from backup
        this.restoreGuestData();
      } catch (err) {
        console.error("Signout error:", err);
      }
    },

    /**
     * Fetch active user record
     */
    async getCurrentUser() {
      if (!window.SupabaseClient) return null;
      const { data: { user } } = await window.SupabaseClient.auth.getUser();
      return user;
    },

    /**
     * Monitor Auth changes
     */
    onAuthStateChange(callback) {
      if (!window.SupabaseClient) return () => {};
      const { data: { subscription } } = window.SupabaseClient.auth.onAuthStateChange((event, session) => {
        callback(event, session);
      });
      return () => {
        subscription.unsubscribe();
      };
    },

    /**
     * Create default rows in Postgres profiles and portfolios tables for the new user ID
     */
    async initializeUserData(userId) {
      // Setup default Profile matching local schemas
      const defaultProfile = {
        id: userId,
        persona: 'beginner',
        currency: 'INR',
        risk_profile: 'moderate',
        expected_return: 12,
        inflation: 6
      };

      // Setup default Portfolio
      const defaultPortfolio = {
        id: userId,
        current: { equity: 60000, debt: 25000, gold: 5000, cash: 10000, realestate: 0 },
        target: { equity: 60, debt: 20, gold: 10, cash: 10, realestate: 0 }
      };

      // Upsert default values
      const { error: profileError } = await window.SupabaseClient
        .from('profiles')
        .upsert(defaultProfile);
      
      if (profileError) console.error("Error creating default profile row:", profileError);

      const { error: portfolioError } = await window.SupabaseClient
        .from('portfolios')
        .upsert(defaultPortfolio);

      if (portfolioError) console.error("Error creating default portfolio row:", portfolioError);
    },

    /**
     * Back up the current anonymous local guest data
     */
    backupGuestData() {
      const profile = localStorage.getItem('wcf_profile');
      const portfolio = localStorage.getItem('wcf_portfolio');
      const goals = localStorage.getItem('wcf_goals');

      // Only backup if guest has completed onboarding or customized goals
      if (profile) localStorage.setItem('wcf_guest_profile_backup', profile);
      if (portfolio) localStorage.setItem('wcf_guest_portfolio_backup', portfolio);
      if (goals) localStorage.setItem('wcf_guest_goals_backup', goals);
    },

    /**
     * Restore the backed up guest session, or load fresh defaults if none existed
     */
    restoreGuestData() {
      const profileBackup = localStorage.getItem('wcf_guest_profile_backup');
      const portfolioBackup = localStorage.getItem('wcf_guest_portfolio_backup');
      const goalsBackup = localStorage.getItem('wcf_guest_goals_backup');

      if (profileBackup) {
        localStorage.setItem('wcf_profile', profileBackup);
      } else {
        localStorage.removeItem('wcf_profile');
      }

      if (portfolioBackup) {
        localStorage.setItem('wcf_portfolio', portfolioBackup);
      } else {
        localStorage.removeItem('wcf_portfolio');
      }

      if (goalsBackup) {
        localStorage.setItem('wcf_goals', goalsBackup);
      } else {
        localStorage.removeItem('wcf_goals');
      }

      // Re-initialize storage engine to apply restored guest values
      if (window.StorageEngine) {
        window.StorageEngine.init();
      }
    }
  };

  // Export Auth globally
  window.Auth = Auth;

  // Stretch Goal Note: Magic link log-in or password resets can be implemented 
  // by calling window.SupabaseClient.auth.resetPasswordForEmail() in auth.js.

})();
