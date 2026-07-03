/**
 * WebCraft Finance - State Management (Observer Pattern)
 * Exposes a global AppState object for persona and calculations state.
 * Runs directly in browser via file:// (no ES module CORS issues).
 */
(function() {
  window.SUPPORTED_CURRENCIES = {
    INR: { symbol: '₹', locale: 'en-IN', name: 'Indian Rupee' },
    USD: { symbol: '$', locale: 'en-US', name: 'US Dollar' },
    EUR: { symbol: '€', locale: 'de-DE', name: 'Euro' },
    GBP: { symbol: '£', locale: 'en-GB', name: 'British Pound' },
    AED: { symbol: 'د.إ', locale: 'ar-AE', name: 'UAE Dirham' },
    SGD: { symbol: 'S$', locale: 'en-SG', name: 'Singapore Dollar' }
  };

  const State = {
    persona: 'beginner', // 'beginner' | 'professional'
    currency: 'INR',     // 'INR' | 'USD' | etc.
    profile: null,
    portfolio: null,
    goals: []
  };

  const listeners = [];

  window.AppState = {
    /**
     * Get a current value from state.
     * @param {string} key 
     */
    get(key) {
      return State[key];
    },

    /**
     * Set a state value and notify subscribers.
     * @param {string} key 
     * @param {*} value 
     */
    set(key, value) {
      if (State[key] !== value) {
        State[key] = value;
        this.notify(key, value);
      }
    },

    /**
     * Update multiple properties in state.
     * @param {Object} updates 
     */
    update(updates) {
      let changed = false;
      for (const [key, value] of Object.entries(updates)) {
        if (State[key] !== value) {
          State[key] = value;
          changed = true;
        }
      }
      if (changed) {
        this.notify();
      }
    },

    /**
     * Subscribe to state updates. Returns unsubscribe function.
     * @param {function(Object, string, *): void} callback 
     */
    subscribe(callback) {
      listeners.push(callback);
      // Run immediately with current state to sync initial UI
      callback(State);
      return () => {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      };
    },

    /**
     * Notify all subscribers of current state.
     */
    notify(key, value) {
      listeners.forEach(callback => {
        try {
          callback(State, key, value);
        } catch (e) {
          console.error("Error in AppState subscriber callback:", e);
        }
      });
    }
  };

  // Automated DOM helper: hides/shows elements based on active persona.
  // Elements with data-persona-only="beginner" will hide in professional mode.
  // Elements with data-persona-only="professional" will hide in beginner mode.
  window.AppState.subscribe((state) => {
    const elements = document.querySelectorAll('[data-persona-only]');
    elements.forEach(el => {
      const allowedPersona = el.getAttribute('data-persona-only');
      if (allowedPersona === state.persona) {
        el.classList.remove('persona-hidden');
      } else {
        el.classList.add('persona-hidden');
      }
    });
  });

})();
