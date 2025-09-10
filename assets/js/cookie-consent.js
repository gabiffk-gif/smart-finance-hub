/**
 * Enhanced Cookie Consent Management System
 * GDPR/CCPA compliant with Google Analytics consent mode integration
 */

class CookieConsent {
    constructor() {
        this.preferences = this.loadPreferences();
        this.consentGiven = this.hasConsent();
        this.init();
    }
    
    init() {
        // Initialize Google Analytics with consent mode
        this.initGoogleAnalytics();
        
        // Show banner if no consent given
        if (!this.consentGiven) {
            this.showBanner();
        }
        
        // Apply current preferences
        this.applyPreferences();
        
        // Add event listeners
        this.addEventListeners();
    }
    
    initGoogleAnalytics() {
        // Configure Google Analytics consent mode
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'default', {
                'analytics_storage': this.preferences.analytics ? 'granted' : 'denied',
                'ad_storage': this.preferences.advertising ? 'granted' : 'denied',
                'ad_user_data': this.preferences.advertising ? 'granted' : 'denied',
                'ad_personalization': this.preferences.advertising ? 'granted' : 'denied',
                'functionality_storage': 'granted',
                'security_storage': 'granted'
            });
        }
    }
    
    loadPreferences() {
        const saved = localStorage.getItem('cookiePreferences');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            essential: true,
            analytics: false,
            advertising: false
        };
    }
    
    savePreferences(preferences) {
        this.preferences = { ...this.preferences, ...preferences };
        localStorage.setItem('cookiePreferences', JSON.stringify(this.preferences));
        localStorage.setItem('cookieConsent', 'true');
        localStorage.setItem('consentTimestamp', Date.now().toString());
        this.consentGiven = true;
    }
    
    hasConsent() {
        const consent = localStorage.getItem('cookieConsent');
        const timestamp = localStorage.getItem('consentTimestamp');
        
        // Check if consent is less than 13 months old (GDPR requirement)
        if (consent && timestamp) {
            const consentAge = Date.now() - parseInt(timestamp);
            const thirteenMonths = 13 * 30 * 24 * 60 * 60 * 1000; // 13 months in milliseconds
            return consentAge < thirteenMonths;
        }
        return false;
    }
    
    showBanner() {
        const banner = document.getElementById('cookieBanner');
        if (banner) {
            // Add delay for better UX
            setTimeout(() => banner.classList.add('show'), 1500);
        }
    }
    
    hideBanner() {
        const banner = document.getElementById('cookieBanner');
        if (banner) {
            banner.classList.remove('show');
        }
    }
    
    applyPreferences() {
        // Update Google Analytics consent
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                'analytics_storage': this.preferences.analytics ? 'granted' : 'denied',
                'ad_storage': this.preferences.advertising ? 'granted' : 'denied',
                'ad_user_data': this.preferences.advertising ? 'granted' : 'denied',
                'ad_personalization': this.preferences.advertising ? 'granted' : 'denied'
            });
        }
        
        // Enable analytics tracking if consented
        if (this.preferences.analytics && typeof gtag !== 'undefined') {
            gtag('event', 'page_view', {
                'page_title': document.title,
                'page_location': window.location.href
            });
        }
        
        // Handle AdSense personalization
        if (!this.preferences.advertising) {
            // Request non-personalized ads
            if (typeof googletag !== 'undefined') {
                googletag.cmd.push(function() {
                    googletag.pubads().setRequestNonPersonalizedAds(1);
                });
            }
        }
        
        // Set body class for CSS targeting
        document.body.classList.toggle('analytics-enabled', this.preferences.analytics);
        document.body.classList.toggle('advertising-enabled', this.preferences.advertising);
    }
    
    acceptAll() {
        const preferences = {
            essential: true,
            analytics: true,
            advertising: true
        };
        
        this.savePreferences(preferences);
        this.applyPreferences();
        this.hideBanner();
        
        // Track consent acceptance
        if (typeof gtag !== 'undefined') {
            gtag('event', 'cookie_consent_accept_all', {
                'event_category': 'privacy',
                'consent_method': 'banner'
            });
        }
        
        this.showConsentConfirmation('All cookies accepted. Thank you!');
    }
    
    declineNonEssential() {
        const preferences = {
            essential: true,
            analytics: false,
            advertising: false
        };
        
        this.savePreferences(preferences);
        this.applyPreferences();
        this.hideBanner();
        
        // Track consent decline (no analytics if declined)
        console.log('Non-essential cookies declined');
        
        this.showConsentConfirmation('Only essential cookies enabled');
    }
    
    showSettings() {
        const modal = document.getElementById('cookieModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Prevent scrolling
            
            // Update toggle states
            document.getElementById('analytics').checked = this.preferences.analytics;
            document.getElementById('advertising').checked = this.preferences.advertising;
        }
    }
    
    closeSettings() {
        const modal = document.getElementById('cookieModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = ''; // Restore scrolling
        }
    }
    
    saveCustomPreferences() {
        const preferences = {
            essential: true,
            analytics: document.getElementById('analytics').checked,
            advertising: document.getElementById('advertising').checked
        };
        
        this.savePreferences(preferences);
        this.applyPreferences();
        this.hideBanner();
        this.closeSettings();
        
        // Track custom preferences
        if (typeof gtag !== 'undefined' && preferences.analytics) {
            gtag('event', 'cookie_consent_custom', {
                'event_category': 'privacy',
                'analytics_enabled': preferences.analytics,
                'advertising_enabled': preferences.advertising
            });
        }
        
        const message = `Preferences saved: Analytics ${preferences.analytics ? 'ON' : 'OFF'}, Advertising ${preferences.advertising ? 'ON' : 'OFF'}`;
        this.showConsentConfirmation(message);
    }
    
    addEventListeners() {
        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('cookieModal');
            if (e.target === modal) {
                this.closeSettings();
            }
        });
        
        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSettings();
            }
        });
        
        // Handle privacy policy link clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('privacy-link')) {
                e.preventDefault();
                window.open('/privacy.html', '_blank');
            }
        });
    }
    
    showConsentConfirmation(message) {
        // Create temporary notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(72, 187, 120, 0.4);
            z-index: 10002;
            font-weight: 600;
            max-width: 300px;
            font-size: 0.9rem;
            line-height: 1.4;
            animation: slideInRight 0.3s ease-out forwards;
            transform: translateX(100%);
            opacity: 0;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Add CSS animation if not already present
        if (!document.getElementById('cookie-animations')) {
            const style = document.createElement('style');
            style.id = 'cookie-animations';
            style.textContent = `
                @keyframes slideInRight {
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Remove after 4 seconds with animation
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
    
    // Method to revoke consent (for settings page)
    revokeConsent() {
        localStorage.removeItem('cookiePreferences');
        localStorage.removeItem('cookieConsent');
        localStorage.removeItem('consentTimestamp');
        
        // Reset to default preferences
        this.preferences = {
            essential: true,
            analytics: false,
            advertising: false
        };
        
        this.consentGiven = false;
        this.applyPreferences();
        this.showBanner();
        
        this.showConsentConfirmation('Cookie consent revoked. Please set your preferences again.');
    }
    
    // Method to check if specific cookie type is enabled
    isEnabled(cookieType) {
        return this.preferences[cookieType] || false;
    }
    
    // Method to get consent status for external use
    getConsentStatus() {
        return {
            hasConsent: this.consentGiven,
            preferences: { ...this.preferences },
            timestamp: localStorage.getItem('consentTimestamp')
        };
    }
}

// Global functions for button handlers
function acceptAllCookies() {
    if (window.cookieConsent) {
        window.cookieConsent.acceptAll();
    }
}

function declineNonEssential() {
    if (window.cookieConsent) {
        window.cookieConsent.declineNonEssential();
    }
}

function showCookieSettings() {
    if (window.cookieConsent) {
        window.cookieConsent.showSettings();
    }
}

function closeCookieSettings() {
    if (window.cookieConsent) {
        window.cookieConsent.closeSettings();
    }
}

function saveCookiePreferences() {
    if (window.cookieConsent) {
        window.cookieConsent.saveCustomPreferences();
    }
}

function acceptAllCookiesModal() {
    if (window.cookieConsent) {
        window.cookieConsent.acceptAll();
        window.cookieConsent.closeSettings();
    }
}

// Initialize cookie consent system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.cookieConsent = new CookieConsent();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CookieConsent;
}