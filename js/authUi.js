/**
 * WebCraft Finance - authUi.js
 * Controls the login/register modals, tab transitions, validation error messages, 
 * header authentication buttons, and conflict resolution options.
 * Runs directly in browser via file:// (no ES module CORS issues).
 */
(function() {

  let isRegisterTab = false;

  const AuthUi = {
    
    init() {
      const modal = document.getElementById('auth-modal');
      const conflictModal = document.getElementById('conflict-modal');
      const showLoginBtn = document.getElementById('btn-show-login');
      const closeBtn = document.getElementById('auth-modal-close');
      const continueGuest = document.getElementById('auth-continue-guest');
      
      const tabLogin = document.getElementById('auth-tab-login');
      const tabRegister = document.getElementById('auth-tab-register');
      const confirmContainer = document.getElementById('auth-confirm-container');
      const submitText = document.getElementById('auth-submit-text');
      
      const authForm = document.getElementById('auth-form');
      const emailInput = document.getElementById('auth-email');
      const passwordInput = document.getElementById('auth-password');
      const confirmPasswordInput = document.getElementById('auth-confirm-password');
      
      const errorBanner = document.getElementById('auth-error-banner');
      const successBanner = document.getElementById('auth-success-banner');

      // --- Show/Hide Modals ---
      if (showLoginBtn) {
        showLoginBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.clearBanners();
          modal.classList.remove('hidden');
        });
      }

      const hideAuthModal = () => {
        modal.classList.add('hidden');
        emailInput.value = '';
        passwordInput.value = '';
        confirmPasswordInput.value = '';
        this.clearBanners();
      };

      if (closeBtn) closeBtn.addEventListener('click', hideAuthModal);
      if (continueGuest) {
        continueGuest.addEventListener('click', (e) => {
          e.preventDefault();
          hideAuthModal();
        });
      }

      // --- Tab Switching ---
      const setTab = (register) => {
        isRegisterTab = register;
        this.clearBanners();
        if (register) {
          tabRegister.className = "w-1/2 pb-2 text-sm font-bold text-center text-indigo-400 border-b-2 border-indigo-500";
          tabLogin.className = "w-1/2 pb-2 text-sm font-bold text-center text-slate-400 border-b-2 border-transparent";
          confirmContainer.classList.remove('hidden');
          confirmPasswordInput.required = true;
          submitText.textContent = "Create Account";
        } else {
          tabLogin.className = "w-1/2 pb-2 text-sm font-bold text-center text-indigo-400 border-b-2 border-indigo-500";
          tabRegister.className = "w-1/2 pb-2 text-sm font-bold text-center text-slate-400 border-b-2 border-transparent";
          confirmContainer.classList.add('hidden');
          confirmPasswordInput.required = false;
          submitText.textContent = "Log In";
        }
      };

      if (tabLogin) tabLogin.addEventListener('click', () => setTab(false));
      if (tabRegister) tabRegister.addEventListener('click', () => setTab(true));

      // --- Form Submission ---
      if (authForm) {
        authForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          this.clearBanners();
          
          const email = emailInput.value.trim();
          const password = passwordInput.value;
          
          // Submit Register
          if (isRegisterTab) {
            const confirmVal = confirmPasswordInput.value;
            if (password !== confirmVal) {
              this.showError("Passwords do not match.");
              return;
            }
            
            try {
              const res = await window.Auth.signUp(email, password);
              // Check if email confirmation is required (session will be null)
              if (res.user && !res.session) {
                this.showSuccess("Registration successful! Check your inbox to confirm your email address.");
              } else {
                hideAuthModal();
              }
            } catch (err) {
              this.showError(err.message);
            }
          } 
          // Submit Login
          else {
            try {
              await window.Auth.signIn(email, password);
              hideAuthModal();
            } catch (err) {
              this.showError(err.message);
            }
          }
        });
      }

      // --- Auth Session State Subscription ---
      let syncResolved = false;

      if (window.Auth) {
        window.Auth.onAuthStateChange(async (event, session) => {
          const authContainer = document.getElementById('auth-header-container');
          const statusText = document.getElementById('storage-status-text');
          const statusDot = document.getElementById('storage-status-dot');

          if (session && session.user) {
            // Signed in state
            const email = session.user.email;
            const truncatedEmail = email.length > 20 ? email.substring(0, 18) + '...' : email;
            
            authContainer.innerHTML = `
              <span class="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <i class="fa-solid fa-circle-user text-indigo-400"></i> ${truncatedEmail}
              </span>
              <button id="btn-logout" class="px-4 py-1.5 rounded-full text-xs font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 transition duration-200 active:scale-95">
                Log Out
              </button>
            `;

            // Wire logout button
            document.getElementById('btn-logout').onclick = async (e) => {
              e.preventDefault();
              syncResolved = false;
              await window.Auth.signOut();
            };

            // Toggle storage details footer text
            if (statusText) statusText.textContent = "Storage: Synced to Cloud";
            if (statusDot) {
              statusDot.className = "w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]";
            }

            // Only run the merge prompt trigger if they explicitly signed in during this action,
            // and we haven't already resolved the sync for the active session.
            if (event === 'SIGNED_IN' && !syncResolved) {
              await window.StorageEngine.handleLoginSync(session.user.id, (keepCloud, keepLocal) => {
                // Open conflict resolution popup modal
                conflictModal.classList.remove('hidden');

                document.getElementById('btn-conflict-cloud').onclick = async () => {
                  await keepCloud();
                  syncResolved = true;
                  conflictModal.classList.add('hidden');
                  if (window.CalculatorsController) window.CalculatorsController.load('dashboard');
                };

                document.getElementById('btn-conflict-local').onclick = async () => {
                  await keepLocal();
                  syncResolved = true;
                  conflictModal.classList.add('hidden');
                  if (window.CalculatorsController) window.CalculatorsController.load('dashboard');
                };
              });
            } else if (!syncResolved) {
              // If it's page load (INITIAL_SESSION) or TOKEN_REFRESHED, sync down silently in background
              await window.StorageEngine.syncDown(session.user.id);
              syncResolved = true;
            }

            // Refresh UI view
            if (window.CalculatorsController) window.CalculatorsController.load('dashboard');

          } else {
            // Signed out state / Guest Mode
            authContainer.innerHTML = `
              <button id="btn-show-login" class="px-4 py-1.5 rounded-full text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 transition duration-200 flex items-center gap-1.5 active:scale-95">
                <i class="fa-solid fa-user"></i> Log In / Register
              </button>
            `;

            // Re-bind click event to new login button
            document.getElementById('btn-show-login').addEventListener('click', (e) => {
              e.preventDefault();
              this.clearBanners();
              modal.classList.remove('hidden');
            });

            // Toggle storage details footer text
            if (statusText) statusText.textContent = "Storage: Local Active";
            if (statusDot) {
              statusDot.className = "w-1.5 h-1.5 rounded-full bg-emerald-500";
            }

            // Refresh UI view
            if (window.CalculatorsController) window.CalculatorsController.load('dashboard');
          }
        });
      }
    },

    showError(msg) {
      const banner = document.getElementById('auth-error-banner');
      if (banner) {
        banner.textContent = msg;
        banner.classList.remove('hidden');
      }
    },

    showSuccess(msg) {
      const banner = document.getElementById('auth-success-banner');
      if (banner) {
        banner.textContent = msg;
        banner.classList.remove('hidden');
      }
    },

    clearBanners() {
      const errorB = document.getElementById('auth-error-banner');
      const successB = document.getElementById('auth-success-banner');
      if (errorB) errorB.classList.add('hidden');
      if (successB) successB.classList.add('hidden');
    }
  };

  // Export globally
  window.AuthUi = AuthUi;

  // Auto-init UI bindings on load
  document.addEventListener('DOMContentLoaded', () => {
    // Delay slightly to ensure Supabase client initializes first
    setTimeout(() => {
      window.AuthUi.init();
    }, 100);
  });

})();
