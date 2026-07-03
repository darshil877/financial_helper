/**
 * WebCraft Finance - UI Primitives & Components
 * - Jargon Buster Tooltips (Event Delegation)
 * - Custom Glowing Sliders with track-fill updates
 * Runs directly in browser via file:// (no ES module CORS issues).
 */
(function() {
  // Jargon dictionary for plain-English explanations
  const jargonDefinitions = {
    cagr: {
      title: "CAGR (Compounded Annual Growth Rate)",
      desc: "The annualized rate of growth of an investment over a specified period of time longer than one year, smoothing out volatility."
    },
    xirr: {
      title: "XIRR (Extended Internal Rate of Return)",
      desc: "A method to calculate the annual rate of return for a series of cash flows (like monthly SIPs) occurring at irregular intervals."
    },
    alpha: {
      title: "Alpha",
      desc: "The excess return of an investment relative to the return of a benchmark index. It represents the value added by active management."
    },
    sip: {
      title: "SIP (Systematic Investment Plan)",
      desc: "A disciplined investing strategy where you commit a fixed amount of money at regular intervals (usually monthly) to build wealth over time."
    },
    swp: {
      title: "SWP (Systematic Withdrawal Plan)",
      desc: "A facility that lets you withdraw a fixed amount from your portfolio at regular intervals, providing a steady income stream while the rest compounds."
    },
    trigger_sip: {
      title: "Trigger SIP",
      desc: "An advanced rule-based investment strategy that executes a buy order automatically only when a certain trigger (e.g., market dips 2%) is met."
    },
    inflation: {
      title: "Inflation Drag",
      desc: "The rate at which prices rise and purchasing power falls. In financial planning, we discount future returns by inflation to see real purchasing power."
    },
    tax_drag: {
      title: "Tax Drag",
      desc: "The reduction in your final portfolio value caused by capital gains taxes. Factoring this in gives a realistic view of take-home wealth."
    },
    rebalancing: {
      title: "Asset Rebalancing",
      desc: "Selling assets that have become overrepresented and buying those that are underrepresented to restore your target asset allocation."
    },
    stepup_sip: {
      title: "Step-Up SIP",
      desc: "A strategy where you automatically increase your monthly investment by a set percentage (e.g., 10%) each year to match salary hikes and beat inflation."
    }
  };

  let tooltipEl = null;

  // Create the single global tooltip element
  function createTooltipElement() {
    if (tooltipEl) return;
    
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'jargon-tooltip-card';
    tooltipEl.className = 'absolute z-50 max-w-xs p-4 glass-panel jargon-tooltip text-sm pointer-events-none rounded-xl border border-indigo-500/30 text-slate-100 shadow-xl';
    tooltipEl.style.left = '0px';
    tooltipEl.style.top = '0px';
    document.body.appendChild(tooltipEl);
  }

  // Setup Tooltips via Event Delegation
  function initTooltips() {
    createTooltipElement();

    document.addEventListener('mouseover', (e) => {
      const termEl = e.target.closest('[data-tooltip]');
      if (!termEl) return;

      const key = termEl.getAttribute('data-tooltip').toLowerCase();
      const def = jargonDefinitions[key];
      if (!def) return;

      // Populate tooltip
      tooltipEl.innerHTML = `
        <h4 class="font-bold text-indigo-300 mb-1 flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          ${def.title}
        </h4>
        <p class="text-slate-300 text-xs leading-relaxed">${def.desc}</p>
      `;

      // Position and show
      tooltipEl.style.visibility = 'visible';
      tooltipEl.style.opacity = '1';
      tooltipEl.style.transform = 'translateY(0) scale(1)';
      
      positionTooltip(termEl);
    });

    document.addEventListener('mousemove', (e) => {
      const termEl = e.target.closest('[data-tooltip]');
      if (!termEl && tooltipEl && tooltipEl.style.visibility === 'visible') {
        hideTooltip();
      }
    });

    document.addEventListener('mouseout', (e) => {
      const termEl = e.target.closest('[data-tooltip]');
      if (termEl) {
        hideTooltip();
      }
    });
  }

  function positionTooltip(target) {
    if (!tooltipEl) return;
    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();

    // Position above target centered
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let top = rect.top - tooltipRect.height - 8 + window.scrollY;

    // Check bounds
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    if (rect.top - tooltipRect.height - 8 < 10) {
      // Position below if it goes off top
      top = rect.bottom + 8 + window.scrollY;
    }

    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top = `${top}px`;
  }

  function hideTooltip() {
    if (!tooltipEl) return;
    tooltipEl.style.opacity = '0';
    tooltipEl.style.transform = 'translateY(4px) scale(0.95)';
    // Delayed hide for animation
    setTimeout(() => {
      if (tooltipEl && tooltipEl.style.opacity === '0') {
        tooltipEl.style.visibility = 'hidden';
      }
    }, 150);
  }

  // Update slider fill track gradient
  function updateSliderStyle(slider) {
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 100;
    const val = parseFloat(slider.value) || 0;
    const percentage = ((val - min) / (max - min)) * 100;
    
    // Indigo/purple gradient fill transition to darker base
    slider.style.background = `linear-gradient(to right, rgba(129, 140, 248, 0.8) 0%, rgba(129, 140, 248, 0.8) ${percentage}%, rgba(255, 255, 255, 0.1) ${percentage}%, rgba(255, 255, 255, 0.1) 100%)`;
  }

  // Init Sliders
  function initSliders() {
    const sliders = document.querySelectorAll('input[type="range"].custom-slider');
    
    sliders.forEach(slider => {
      // Initial style run
      updateSliderStyle(slider);

      // Handle value changes
      slider.addEventListener('input', () => {
        updateSliderStyle(slider);
        
        // Update linked value display
        const displayId = slider.getAttribute('data-value-display');
        if (displayId) {
          const displayEl = document.getElementById(displayId);
          if (displayEl) {
            let formatType = slider.getAttribute('data-value-format') || 'number';
            displayEl.textContent = formatValue(slider.value, formatType);
          }
        }
      });
    });
  }

  // Helper to format values dynamically
  function formatValue(value, format) {
    const num = parseFloat(value);
    if (isNaN(num)) return value;

    // Retrieve active currency configuration
    const activeCode = (window.AppState && window.AppState.get('currency')) || 'INR';
    const config = (window.SUPPORTED_CURRENCIES && window.SUPPORTED_CURRENCIES[activeCode]) || { symbol: '₹', locale: 'en-IN' };

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat(config.locale, {
          style: 'currency',
          currency: activeCode,
          maximumFractionDigits: 0
        }).format(num);
      case 'percent':
        return `${num}%`;
      case 'years':
        return `${num} ${num === 1 ? 'Year' : 'Years'}`;
      case 'currency_monthly':
        const formatted = new Intl.NumberFormat(config.locale, {
          style: 'currency',
          currency: activeCode,
          maximumFractionDigits: 0
        }).format(num);
        return `${formatted}/mo`;
      default:
        return num.toLocaleString(config.locale);
    }
  }

  // Export helpers globally
  window.UIComponents = {
    init() {
      initTooltips();
      initSliders();
    },
    formatValue,
    updateSliderStyle
  };

  // Run automatically on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    window.UIComponents.init();
  });
})();
