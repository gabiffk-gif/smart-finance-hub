/**
 * Smart Finance Hub - AdSense Management
 * Handles ad loading, responsive sizing, and policy compliance
 */

class AdSenseManager {
    constructor() {
        this.publisherID = 'ca-pub-3569163105837966'; // Your existing publisher ID
        this.adSlots = new Map();
        this.isAdBlockerDetected = false;
        this.init();
    }

    init() {
        this.detectAdBlocker();
        this.setupResponsiveAds();
        this.initializeAdSlots();
        this.setupAdEventListeners();
    }

    /**
     * Detect if ad blocker is present
     */
    detectAdBlocker() {
        const adTest = document.createElement('div');
        adTest.innerHTML = '&nbsp;';
        adTest.className = 'adsbox';
        adTest.style.position = 'absolute';
        adTest.style.left = '-9999px';
        document.body.appendChild(adTest);

        setTimeout(() => {
            if (adTest.offsetHeight === 0) {
                this.isAdBlockerDetected = true;
                this.handleAdBlocker();
            }
            document.body.removeChild(adTest);
        }, 100);
    }

    /**
     * Handle ad blocker detection
     */
    handleAdBlocker() {
        const adContainers = document.querySelectorAll('.ad-container');
        adContainers.forEach(container => {
            container.innerHTML = `
                <div class="ad-placeholder" style="color: #718096; font-size: 0.85rem;">
                    <p>📢 Advertisement</p>
                    <p style="font-size: 0.75rem; opacity: 0.8;">Support our free content by allowing ads</p>
                </div>
            `;
        });
    }

    /**
     * Setup responsive ad behavior
     */
    setupResponsiveAds() {
        const handleResize = () => {
            this.updateAdSizes();
        };

        window.addEventListener('resize', this.debounce(handleResize, 250));
        this.updateAdSizes(); // Initial setup
    }

    /**
     * Update ad sizes based on viewport
     */
    updateAdSizes() {
        const width = window.innerWidth;
        const adSlots = document.querySelectorAll('.adsbygoogle');

        adSlots.forEach(ad => {
            const container = ad.closest('.ad-container');
            if (!container) return;

            if (width <= 480) {
                // Mobile
                if (container.classList.contains('ad-header-banner') || 
                    container.classList.contains('ad-footer-banner')) {
                    ad.style.width = '320px';
                    ad.style.height = '50px';
                }
            } else if (width <= 768) {
                // Tablet
                if (container.classList.contains('ad-header-banner') || 
                    container.classList.contains('ad-footer-banner')) {
                    ad.style.width = '728px';
                    ad.style.height = '90px';
                }
            }
        });
    }

    /**
     * Initialize ad slots with proper configuration
     */
    initializeAdSlots() {
        const adConfigs = {
            'header-banner': {
                size: [[728, 90], [320, 50]],
                type: 'display',
                responsive: true
            },
            'sidebar-rectangle': {
                size: [300, 250],
                type: 'display',
                responsive: false
            },
            'in-content': {
                size: [[300, 250], [320, 100]],
                type: 'display',
                responsive: true
            },
            'footer-banner': {
                size: [[728, 90], [320, 50]],
                type: 'display',
                responsive: true
            }
        };

        Object.entries(adConfigs).forEach(([slotId, config]) => {
            this.adSlots.set(slotId, config);
        });
    }

    /**
     * Create AdSense ad unit
     */
    createAdUnit(slotId, adSlot = null) {
        const config = this.adSlots.get(slotId);
        if (!config) return null;

        const adUnit = document.createElement('ins');
        adUnit.className = 'adsbygoogle';
        adUnit.style.display = 'block';
        
        if (adSlot) {
            adUnit.setAttribute('data-ad-slot', adSlot);
        }
        
        adUnit.setAttribute('data-ad-client', this.publisherID);
        
        if (config.responsive) {
            adUnit.setAttribute('data-ad-format', 'auto');
            adUnit.setAttribute('data-full-width-responsive', 'true');
        } else {
            const [width, height] = Array.isArray(config.size[0]) ? config.size[0] : config.size;
            adUnit.style.width = width + 'px';
            adUnit.style.height = height + 'px';
        }

        return adUnit;
    }

    /**
     * Load ad into container
     */
    loadAd(containerId, slotId, adSlot = null) {
        const container = document.getElementById(containerId);
        if (!container) return false;

        const existingAd = container.querySelector('.adsbygoogle');
        if (existingAd) return false; // Already loaded

        const adUnit = this.createAdUnit(slotId, adSlot);
        if (!adUnit) return false;

        // Clear placeholder
        const placeholder = container.querySelector('.ad-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        container.appendChild(adUnit);

        // Push to AdSense
        try {
            (adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.warn('AdSense not loaded:', e);
            if (placeholder) placeholder.style.display = 'block';
        }

        return true;
    }

    /**
     * Setup event listeners for ad interactions
     */
    setupAdEventListeners() {
        // Track ad visibility
        if ('IntersectionObserver' in window) {
            const adObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const adContainer = entry.target;
                        this.trackAdView(adContainer.id);
                    }
                });
            }, { threshold: 0.5 });

            document.querySelectorAll('.ad-container').forEach(ad => {
                adObserver.observe(ad);
            });
        }
    }

    /**
     * Track ad view for analytics
     */
    trackAdView(adId) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'ad_view', {
                'custom_parameter': adId,
                'event_category': 'advertisement',
                'event_label': adId
            });
        }
    }

    /**
     * Utility: Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Refresh ads (for SPA navigation)
     */
    refreshAds() {
        if (window.adsbygoogle) {
            try {
                window.adsbygoogle.forEach(ad => {
                    if (ad.push) ad.push({});
                });
            } catch (e) {
                console.warn('Error refreshing ads:', e);
            }
        }
    }

    /**
     * Check if ads are policy compliant
     */
    validateAdPlacements() {
        const issues = [];
        const adContainers = document.querySelectorAll('.ad-container');

        adContainers.forEach((ad, index) => {
            // Check distance from navigation
            const nav = document.querySelector('nav');
            if (nav) {
                const navRect = nav.getBoundingClientRect();
                const adRect = ad.getBoundingClientRect();
                const distance = Math.abs(adRect.top - navRect.bottom);
                
                if (distance < 50) {
                    issues.push(`Ad ${index + 1} too close to navigation (${distance}px)`);
                }
            }

            // Check for advertisement label
            const label = ad.querySelector('.ad-label');
            if (!label) {
                issues.push(`Ad ${index + 1} missing advertisement label`);
            }

            // Check minimum size
            const rect = ad.getBoundingClientRect();
            if (rect.width < 100 || rect.height < 50) {
                issues.push(`Ad ${index + 1} too small (${rect.width}x${rect.height})`);
            }
        });

        if (issues.length > 0) {
            console.warn('AdSense Policy Issues:', issues);
        }

        return issues.length === 0;
    }
}

// Initialize AdSense Manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.adSenseManager = new AdSenseManager();
    
    // Validate ad placements in development
    if (window.location.hostname === 'localhost') {
        setTimeout(() => {
            window.adSenseManager.validateAdPlacements();
        }, 1000);
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdSenseManager;
}