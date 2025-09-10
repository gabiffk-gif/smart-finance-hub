// Smart Finance Hub - Main JavaScript File

/**
 * Global App Object
 */
const SmartFinanceHub = {
    // Configuration
    config: {
        googleAnalyticsId: 'G-9RZ27MVK1D',
        newsletterApiUrl: '/api/newsletter',
        trackingEnabled: true
    },

    // Initialize the application
    init() {
        this.setupEventListeners();
        this.initAnalytics();
        this.initNewsletterForm();
        this.initAdTracking();
        this.initScrollAnimations();
        console.log('Smart Finance Hub initialized');
    },

    // Set up all event listeners
    setupEventListeners() {
        // Newsletter form submission
        const newsletterForms = document.querySelectorAll('.newsletter-form');
        newsletterForms.forEach(form => {
            form.addEventListener('submit', this.handleNewsletterSignup.bind(this));
        });

        // Ad banner clicks
        const adBanners = document.querySelectorAll('.ad-banner');
        adBanners.forEach(banner => {
            banner.addEventListener('click', this.handleAdClick.bind(this));
        });

        // Smooth scroll for anchor links
        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        anchorLinks.forEach(link => {
            link.addEventListener('click', this.handleSmoothScroll.bind(this));
        });

        // Mobile menu toggle (if needed)
        const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', this.toggleMobileMenu.bind(this));
        }

        // Track page scroll for engagement
        window.addEventListener('scroll', this.throttle(this.handleScroll.bind(this), 100));

        // Track page visibility for analytics
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    },

    // Initialize Google Analytics
    initAnalytics() {
        if (typeof gtag !== 'undefined' && this.config.trackingEnabled) {
            // Track initial page view
            this.trackEvent('page_view', {
                page_title: document.title,
                page_location: window.location.href
            });

            // Track scroll depth
            this.scrollDepth = 0;
            this.maxScroll = 0;
        }
    },

    // Initialize newsletter form functionality
    initNewsletterForm() {
        const forms = document.querySelectorAll('.newsletter-form');
        forms.forEach(form => {
            // Add input validation
            const emailInput = form.querySelector('input[type="email"]');
            if (emailInput) {
                emailInput.addEventListener('blur', this.validateEmail.bind(this));
                emailInput.addEventListener('input', this.clearValidationErrors.bind(this));
            }
        });
    },

    // Handle newsletter form submission
    async handleNewsletterSignup(event) {
        event.preventDefault();
        
        const form = event.target;
        const emailInput = form.querySelector('input[type="email"]');
        const submitButton = form.querySelector('button[type="submit"]');
        const email = emailInput.value.trim();

        // Validate email
        if (!this.isValidEmail(email)) {
            this.showFormError(form, 'Please enter a valid email address');
            return;
        }

        // Update UI to show loading state
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Subscribing...';
        submitButton.disabled = true;
        this.clearFormErrors(form);

        try {
            // Track signup attempt
            this.trackEvent('newsletter_signup_attempt', {
                source: form.dataset.source || 'unknown'
            });

            // For now, simulate API call (replace with actual API integration)
            await this.simulateNewsletterSignup(email, form.dataset.source);

            // Success state
            submitButton.textContent = '✓ Subscribed!';
            submitButton.style.background = '#48bb78';
            
            // Track successful signup
            this.trackEvent('newsletter_signup_success', {
                source: form.dataset.source || 'unknown'
            });

            // Reset form after delay
            setTimeout(() => {
                form.reset();
                submitButton.textContent = originalText;
                submitButton.disabled = false;
                submitButton.style.background = '';
            }, 3000);

        } catch (error) {
            console.error('Newsletter signup error:', error);
            this.showFormError(form, 'Something went wrong. Please try again.');
            
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            
            this.trackEvent('newsletter_signup_error', {
                error: error.message,
                source: form.dataset.source || 'unknown'
            });
        }
    },

    // Simulate newsletter signup (replace with real API call)
    simulateNewsletterSignup(email, source = 'website') {
        return new Promise((resolve, reject) => {
            // Simulate network delay
            setTimeout(() => {
                // Simulate 95% success rate
                if (Math.random() > 0.05) {
                    resolve({ success: true, message: 'Subscribed successfully' });
                } else {
                    reject(new Error('Server error'));
                }
            }, 1500);
        });
    },

    // Handle ad banner clicks
    handleAdClick(event) {
        const banner = event.currentTarget;
        const adType = banner.dataset.adType || 'unknown';
        const adPosition = banner.dataset.position || 'unknown';

        // Track ad click
        this.trackEvent('ad_click', {
            ad_type: adType,
            ad_position: adPosition,
            page_location: window.location.href
        });

        // Add visual feedback
        banner.style.transform = 'scale(0.98)';
        setTimeout(() => {
            banner.style.transform = '';
        }, 150);
    },

    // Handle smooth scrolling for anchor links
    handleSmoothScroll(event) {
        const link = event.currentTarget;
        const targetId = link.getAttribute('href');
        
        if (targetId.startsWith('#')) {
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                event.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                // Track internal navigation
                this.trackEvent('internal_link_click', {
                    target_id: targetId,
                    source_page: window.location.pathname
                });
            }
        }
    },

    // Toggle mobile menu
    toggleMobileMenu(event) {
        const menuToggle = event.currentTarget;
        const menu = document.querySelector('.nav-links');
        
        if (menu) {
            menu.classList.toggle('mobile-open');
            menuToggle.classList.toggle('active');
            
            // Update ARIA attributes for accessibility
            const isOpen = menu.classList.contains('mobile-open');
            menuToggle.setAttribute('aria-expanded', isOpen);
        }
    },

    // Handle page scroll for engagement tracking
    handleScroll() {
        const scrollPercent = Math.round(
            (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
        );

        // Update max scroll depth
        if (scrollPercent > this.maxScroll) {
            this.maxScroll = scrollPercent;
        }

        // Track scroll milestones
        if (scrollPercent >= 25 && this.scrollDepth < 25) {
            this.scrollDepth = 25;
            this.trackEvent('scroll_depth', { percent: 25 });
        } else if (scrollPercent >= 50 && this.scrollDepth < 50) {
            this.scrollDepth = 50;
            this.trackEvent('scroll_depth', { percent: 50 });
        } else if (scrollPercent >= 75 && this.scrollDepth < 75) {
            this.scrollDepth = 75;
            this.trackEvent('scroll_depth', { percent: 75 });
        } else if (scrollPercent >= 90 && this.scrollDepth < 90) {
            this.scrollDepth = 90;
            this.trackEvent('scroll_depth', { percent: 90 });
        }
    },

    // Handle page visibility changes
    handleVisibilityChange() {
        if (document.hidden) {
            // Track session duration when leaving page
            const sessionDuration = Date.now() - (window.sessionStartTime || Date.now());
            this.trackEvent('page_exit', {
                session_duration: Math.round(sessionDuration / 1000),
                max_scroll: this.maxScroll || 0
            });
        } else {
            // Track return to page
            this.trackEvent('page_return');
        }
    },

    // Initialize scroll animations
    initScrollAnimations() {
        // Simple intersection observer for fade-in animations
        if ('IntersectionObserver' in window) {
            const animationObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('fade-in');
                        animationObserver.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });

            // Observe elements that should animate
            const animatableElements = document.querySelectorAll('.article-card, .content-section, .ad-banner');
            animatableElements.forEach(el => {
                animationObserver.observe(el);
            });
        }
    },

    // Track events with Google Analytics
    trackEvent(eventName, parameters = {}) {
        if (typeof gtag !== 'undefined' && this.config.trackingEnabled) {
            gtag('event', eventName, parameters);
        }
        
        // Also log to console for debugging
        console.log('Event tracked:', eventName, parameters);
    },

    // Email validation
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Validate email input
    validateEmail(event) {
        const input = event.target;
        const email = input.value.trim();
        
        if (email && !this.isValidEmail(email)) {
            this.showInputError(input, 'Please enter a valid email address');
        } else {
            this.clearInputError(input);
        }
    },

    // Clear validation errors when user types
    clearValidationErrors(event) {
        const input = event.target;
        this.clearInputError(input);
    },

    // Show form error message
    showFormError(form, message) {
        this.clearFormErrors(form);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error';
        errorDiv.textContent = message;
        errorDiv.style.cssText = 'color: #e53e3e; font-size: 0.9rem; margin-top: 0.5rem;';
        
        form.appendChild(errorDiv);
    },

    // Show input-specific error
    showInputError(input, message) {
        this.clearInputError(input);
        
        input.style.borderColor = '#e53e3e';
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'input-error';
        errorDiv.textContent = message;
        errorDiv.style.cssText = 'color: #e53e3e; font-size: 0.8rem; margin-top: 0.25rem;';
        
        input.parentNode.appendChild(errorDiv);
    },

    // Clear form errors
    clearFormErrors(form) {
        const errors = form.querySelectorAll('.form-error');
        errors.forEach(error => error.remove());
    },

    // Clear input errors
    clearInputError(input) {
        input.style.borderColor = '';
        const error = input.parentNode.querySelector('.input-error');
        if (error) error.remove();
    },

    // Initialize ad tracking
    initAdTracking() {
        const adBanners = document.querySelectorAll('.ad-banner');
        
        // Track ad impressions using Intersection Observer
        if ('IntersectionObserver' in window) {
            const adObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                        const banner = entry.target;
                        const adType = banner.dataset.adType || 'unknown';
                        const adPosition = banner.dataset.position || 'unknown';
                        
                        this.trackEvent('ad_impression', {
                            ad_type: adType,
                            ad_position: adPosition,
                            page_location: window.location.href
                        });
                        
                        // Only track impression once
                        adObserver.unobserve(banner);
                    }
                });
            }, {
                threshold: 0.5
            });

            adBanners.forEach(banner => {
                adObserver.observe(banner);
            });
        }
    },

    // Utility function to throttle function calls
    throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    },

    // Utility function to debounce function calls
    debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    },

    // Get user's preferred color scheme
    getColorScheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    },

    // Format currency for display
    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    // Format percentage for display
    formatPercentage(decimal, precision = 2) {
        return (decimal * 100).toFixed(precision) + '%';
    },

    // Simple local storage wrapper with error handling
    storage: {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.warn('Could not save to localStorage:', error);
            }
        },

        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.warn('Could not read from localStorage:', error);
                return defaultValue;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.warn('Could not remove from localStorage:', error);
            }
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.sessionStartTime = Date.now();
        SmartFinanceHub.init();
    });
} else {
    window.sessionStartTime = Date.now();
    SmartFinanceHub.init();
}

// Make SmartFinanceHub globally available
window.SmartFinanceHub = SmartFinanceHub;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartFinanceHub;
}