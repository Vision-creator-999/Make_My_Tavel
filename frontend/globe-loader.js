(function() {
  // Stylesheet definition
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    #globe-loader-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(248, 250, 252, 0.85); /* fallback --bg with transparency */
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    
    #globe-loader-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }
    
    .globe-container {
      position: relative;
      width: 120px;
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .globe-svg {
      width: 100px;
      height: 100px;
      overflow: visible;
    }
    
    /* Globe circles & meridians styling */
    .globe-outline {
      fill: url(#globe-depth-grad);
      stroke: var(--primary, #0F8B8D);
      stroke-width: 1.5px;
    }
    
    .globe-equator {
      fill: none;
      stroke: var(--primary, #0F8B8D);
      stroke-width: 1px;
      opacity: 0.45;
    }
    
    .globe-meridian {
      fill: none;
      stroke: var(--primary, #0F8B8D);
      stroke-width: 1.5px;
      transform-origin: center;
    }
    
    /* Meridians sweeping animation */
    .globe-meridian.m1 {
      animation: globe-sweep 2.4s infinite linear;
    }
    
    .globe-meridian.m2 {
      animation: globe-sweep 2.4s infinite linear;
      animation-delay: -0.8s;
    }
    
    .globe-meridian.m3 {
      animation: globe-sweep 2.4s infinite linear;
      animation-delay: -1.6s;
    }
    
    @keyframes globe-sweep {
      0% {
        transform: scaleX(1);
      }
      50% {
        transform: scaleX(0);
      }
      100% {
        transform: scaleX(-1);
      }
    }
    
    /* Plane group styling */
    .plane-group {
      transform-origin: center;
    }
    
    .plane-path {
      fill: var(--accent, #F97316);
    }
    
    /* Plane depth cues (scale & opacity animation) */
    .plane-pulse {
      animation: plane-depth 2.4s infinite linear;
      transform-origin: center;
    }
    
    @keyframes plane-depth {
      0% {
        transform: scale(0.7);
        opacity: 0.7;
      }
      25% {
        transform: scale(0.45);
        opacity: 0.35;
      }
      50% {
        transform: scale(0.7);
        opacity: 0.7;
      }
      75% {
        transform: scale(1.0);
        opacity: 1.0;
      }
      100% {
        transform: scale(0.7);
        opacity: 0.7;
      }
    }
    
    .loader-text {
      margin-top: 16px;
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 700;
      color: var(--secondary, #17375E);
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    
    /* Accessibility settings for prefers-reduced-motion */
    @media (prefers-reduced-motion: reduce) {
      .globe-meridian, .plane-pulse, animateMotion {
        animation: none !important;
        transform: none !important;
      }
      .plane-pulse {
        opacity: 1 !important;
        transform: scale(0.8) translate(35px, 15px) !important; /* static position */
      }
      .globe-meridian.m2 {
        transform: scaleX(0.5) !important;
      }
      .globe-meridian.m3 {
        transform: scaleX(-0.5) !important;
      }
    }
  `;
  document.head.appendChild(styleEl);

  // HTML overlay generation
  const overlay = document.createElement('div');
  overlay.id = 'globe-loader-overlay';
  overlay.className = 'active'; // Start active for initial page load transition!
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-label', 'Loading');
  overlay.setAttribute('aria-hidden', 'false');
  
  overlay.innerHTML = `
    <div class="globe-container">
      <svg class="globe-svg" viewBox="0 0 100 100">
        <defs>
          <!-- Subtle radial gradient for globe depth -->
          <radialGradient id="globe-depth-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95"/>
            <stop offset="100%" stop-color="#E2E8F0" stop-opacity="0.45"/>
          </radialGradient>
        </defs>
        
        <!-- Shaded Wireframe Globe Outline -->
        <circle class="globe-outline" cx="50" cy="50" r="45" fill="url(#globe-depth-grad)"/>
        
        <!-- Equator line -->
        <ellipse class="globe-equator" cx="50" cy="50" rx="45" ry="12"/>
        
        <!-- Rotating Longitudinal meridians -->
        <ellipse class="globe-meridian m1" cx="50" cy="50" rx="45" ry="45"/>
        <ellipse class="globe-meridian m2" cx="50" cy="50" rx="45" ry="45"/>
        <ellipse class="globe-meridian m3" cx="50" cy="50" rx="45" ry="45"/>
        
        <!-- Elliptical plane orbit path (invisible) -->
        <path id="globe-orbit" d="M 15,50 A 35,16 0 1,1 85,50 A 35,16 0 1,1 15,50" fill="none" stroke="none"/>
        
        <!-- Orbit motion driver group -->
        <g>
          <animateMotion dur="2.4s" repeatCount="indefinite" rotate="auto">
            <mpath href="#globe-orbit"/>
          </animateMotion>
          <!-- Depth cues local scaling group -->
          <g class="plane-pulse">
            <!-- Nested group rotated so it points along tangent when rotate="auto" -->
            <g transform="rotate(90) scale(0.55) translate(-12,-12)">
              <path class="plane-path" d="M12,2A1,1,0,0,1,13,3v6.18l7.39,5.73a1,1,0,0,1-.62,1.79H13v3l2.22,1.67a1,1,0,0,1-.6,1.63H9.38a1,1,0,0,1-.6-1.63L11,18.3v-3H4.23a1,1,0,0,1-.62-1.79L11,9.18V3A1,1,0,0,1,12,2Z"/>
            </g>
          </g>
        </g>
      </svg>
    </div>
    <div class="loader-text">Loading Journey...</div>
  `;
  
  // Inject overlay into page body
  if (document.body) {
    document.body.appendChild(overlay);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(overlay);
    });
  }

  // Loader state variables
  let loaderTimeout = null;
  let showTime = 0;
  const minDuration = 300;
  const showDelay = 250;

  // Initial load timer: keep loader active for at least 500ms after script execution
  const pageLoadStartTime = Date.now();
  
  function hideInitialLoader() {
    const elapsed = Date.now() - pageLoadStartTime;
    const remaining = Math.max(500 - elapsed, 0);
    setTimeout(() => {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
    }, remaining);
  }

  // Hook into window load event
  window.addEventListener('load', hideInitialLoader);

  // Backup fallback if window load event already fired
  if (document.readyState === 'complete') {
    hideInitialLoader();
  }

  // Dynamic transition animation when leaving the page (clicking internal links)
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.href && !link.target && !link.hasAttribute('download')) {
      if (link.href.startsWith('http') || link.href.startsWith('/') || link.href.startsWith('.')) {
        try {
          const url = new URL(link.href, window.location.href);
          if (url.origin === window.location.origin && !url.hash && url.pathname !== window.location.pathname) {
            overlay.classList.add('active');
            overlay.setAttribute('aria-hidden', 'false');
          }
        } catch (err) {
          // Ignore invalid URL parsing
        }
      }
    }
  });

  // Dynamic transition animation when submitting navigation forms
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (form && !form.hasAttribute('target') && !e.defaultPrevented) {
      overlay.classList.add('active');
      overlay.setAttribute('aria-hidden', 'false');
    }
  });

  window.showLoader = function() {
    if (loaderTimeout) clearTimeout(loaderTimeout);
    
    // Schedule loader overlay fade-in
    loaderTimeout = setTimeout(() => {
      overlay.classList.add('active');
      overlay.setAttribute('aria-hidden', 'false');
      showTime = Date.now();
    }, showDelay);
  };

  window.hideLoader = function() {
    // Cancel pending show if hide is called early
    if (loaderTimeout) {
      clearTimeout(loaderTimeout);
      loaderTimeout = null;
    }
    
    if (showTime > 0) {
      const elapsed = Date.now() - showTime;
      if (elapsed < minDuration) {
        // Postpone hide until min duration is reached to avoid flicker
        setTimeout(() => {
          overlay.classList.remove('active');
          overlay.setAttribute('aria-hidden', 'true');
          showTime = 0;
        }, minDuration - elapsed);
      } else {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        showTime = 0;
      }
    }
  };
})();
