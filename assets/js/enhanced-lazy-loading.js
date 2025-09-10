/**
 * Smart Finance Hub - Enhanced Lazy Loading and Image Management
 * Advanced image loading with SEO optimization and performance features
 */

class EnhancedImageManager {
    constructor() {
        this.imageCache = new Map();
        this.lazyImages = [];
        this.intersectionObserver = null;
        this.performanceObserver = null;
        this.imageLoadTimes = new Map();
        this.init();
    }

    init() {
        this.setupIntersectionObserver();
        this.setupPerformanceMonitoring();
        this.initializeLazyLoading();
        this.setupImageErrorHandling();
        this.preloadCriticalImages();
        this.setupSEOOptimizations();
    }

    /**
     * Setup Intersection Observer for lazy loading
     */
    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadImage(entry.target);
                        this.intersectionObserver.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.1
            });
        }
    }

    /**
     * Setup performance monitoring for images
     */
    setupPerformanceMonitoring() {
        if ('PerformanceObserver' in window) {
            this.performanceObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    if (entry.initiatorType === 'img') {
                        this.trackImagePerformance(entry);
                    }
                });
            });
            this.performanceObserver.observe({ entryTypes: ['resource'] });
        }
    }

    /**
     * Initialize lazy loading for all images
     */
    initializeLazyLoading() {
        // Find all images marked for lazy loading
        const lazyImages = document.querySelectorAll('img[loading="lazy"], .lazy-image');
        
        lazyImages.forEach(img => {
            this.setupLazyImage(img);
        });

        // Setup automatic lazy loading for new images
        this.observeNewImages();
    }

    /**
     * Setup lazy loading for individual image
     */
    setupLazyImage(img) {
        if (!img.dataset.src && img.src) {
            img.dataset.src = img.src;
            img.src = this.generatePlaceholder(img);
        }

        img.classList.add('lazy-image');
        
        if (this.intersectionObserver) {
            this.intersectionObserver.observe(img);
        } else {
            // Fallback for browsers without Intersection Observer
            this.loadImage(img);
        }
    }

    /**
     * Load image with optimization
     */
    loadImage(img) {
        const imageUrl = img.dataset.src || img.src;
        
        if (!imageUrl || this.imageCache.has(imageUrl)) {
            this.displayImage(img, imageUrl);
            return;
        }

        img.classList.add('loading');
        
        const startTime = performance.now();
        
        const tempImage = new Image();
        tempImage.onload = () => {
            const loadTime = performance.now() - startTime;
            this.imageLoadTimes.set(imageUrl, loadTime);
            
            this.imageCache.set(imageUrl, tempImage);
            this.displayImage(img, imageUrl);
            this.trackImageLoad(img, loadTime);
        };
        
        tempImage.onerror = () => {
            this.handleImageError(img);
        };
        
        // Add responsive image support
        if (img.dataset.srcset) {
            tempImage.srcset = img.dataset.srcset;
        }
        
        tempImage.src = imageUrl;
    }

    /**
     * Display loaded image
     */
    displayImage(img, imageUrl) {
        img.src = imageUrl;
        
        if (img.dataset.srcset) {
            img.srcset = img.dataset.srcset;
        }
        
        img.classList.remove('loading');
        img.classList.add('loaded');
        
        // Trigger fade-in animation
        setTimeout(() => {
            img.style.opacity = '1';
        }, 50);
        
        // Update alt text if needed
        this.enhanceAltText(img);
    }

    /**
     * Handle image loading errors
     */
    handleImageError(img) {
        img.classList.remove('loading');
        img.classList.add('error');
        
        // Generate fallback image
        const fallbackSrc = this.generateFallbackImage(img);
        img.src = fallbackSrc;
        
        // Update alt text for error state
        const originalAlt = img.alt;
        img.alt = `${originalAlt} (Image temporarily unavailable)`;
        
        // Log error for analytics
        this.trackImageError(img);
    }

    /**
     * Generate placeholder image
     */
    generatePlaceholder(img) {
        const width = img.dataset.width || img.width || 800;
        const height = img.dataset.height || img.height || 400;
        const color = img.dataset.placeholderColor || '667eea';
        const textColor = img.dataset.placeholderTextColor || 'ffffff';
        
        const text = encodeURIComponent(img.alt || 'Loading...');
        
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'%3E%3Crect width='100%25' height='100%25' fill='%23${color}'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='16' fill='%23${textColor}' opacity='0.7'%3E${text}%3C/text%3E%3C/svg%3E`;
    }

    /**
     * Generate fallback image for errors
     */
    generateFallbackImage(img) {
        const width = img.dataset.width || img.width || 800;
        const height = img.dataset.height || img.height || 400;
        
        const text = encodeURIComponent('Image unavailable');
        
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'%3E%3Crect width='100%25' height='100%25' fill='%23f7fafc' stroke='%23e2e8f0' stroke-width='2' stroke-dasharray='5,5'/%3E%3Ctext x='50%25' y='45%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='16' fill='%23a0aec0'%3E📷%3C/text%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='12' fill='%23a0aec0'%3E${text}%3C/text%3E%3C/svg%3E`;
    }

    /**
     * Preload critical images (above the fold)
     */
    preloadCriticalImages() {
        const criticalImages = document.querySelectorAll('.high-priority-image, .hero-image, .featured-image');
        
        criticalImages.forEach(img => {
            if (img.dataset.src) {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'image';
                link.href = img.dataset.src;
                
                if (img.dataset.srcset) {
                    link.imagesrcset = img.dataset.srcset;
                }
                
                document.head.appendChild(link);
            }
        });
    }

    /**
     * Setup error handling for all images
     */
    setupImageErrorHandling() {
        document.addEventListener('error', (e) => {
            if (e.target.tagName === 'IMG') {
                this.handleImageError(e.target);
            }
        }, true);
    }

    /**
     * Observe new images added to DOM
     */
    observeNewImages() {
        if ('MutationObserver' in window) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const images = node.querySelectorAll ? 
                                node.querySelectorAll('img') : 
                                (node.tagName === 'IMG' ? [node] : []);
                            
                            images.forEach(img => {
                                if (img.loading === 'lazy' || img.classList.contains('lazy-image')) {
                                    this.setupLazyImage(img);
                                }
                            });
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    /**
     * Enhance alt text for better accessibility and SEO
     */
    enhanceAltText(img) {
        if (!img.alt || img.alt.trim() === '') {
            // Generate meaningful alt text based on context
            const context = this.getImageContext(img);
            img.alt = this.generateAltText(img, context);
        }
        
        // Add structured data attributes
        if (img.closest('article')) {
            img.setAttribute('itemprop', 'image');
        }
    }

    /**
     * Get image context for alt text generation
     */
    getImageContext(img) {
        const article = img.closest('article');
        const section = img.closest('section');
        const container = img.closest('.chart-container, .featured-container, .content-container');
        
        return {
            articleTitle: article ? article.querySelector('h1, h2')?.textContent : null,
            sectionTitle: section ? section.querySelector('h2, h3')?.textContent : null,
            containerType: container ? container.className : null,
            imageClasses: Array.from(img.classList),
            imageSrc: img.src
        };
    }

    /**
     * Generate meaningful alt text
     */
    generateAltText(img, context) {
        const classes = context.imageClasses;
        
        if (classes.includes('featured-image')) {
            return `Featured image for: ${context.articleTitle || 'article'}`;
        }
        
        if (classes.includes('chart-image')) {
            return `Chart showing financial data for ${context.sectionTitle || 'analysis'}`;
        }
        
        if (classes.includes('team-photo')) {
            return 'Team member profile photo';
        }
        
        if (classes.includes('hero-image')) {
            return `Hero image for ${context.articleTitle || 'Smart Finance Hub'}`;
        }
        
        return `Image related to ${context.sectionTitle || context.articleTitle || 'financial content'}`;
    }

    /**
     * Setup SEO optimizations
     */
    setupSEOOptimizations() {
        // Add structured data for images
        this.addImageStructuredData();
        
        // Optimize image loading priority
        this.optimizeImagePriority();
        
        // Setup social media image optimization
        this.setupSocialMediaOptimization();
    }

    /**
     * Add structured data for images
     */
    addImageStructuredData() {
        const articles = document.querySelectorAll('article');
        
        articles.forEach(article => {
            const featuredImage = article.querySelector('.featured-image');
            
            if (featuredImage) {
                const structuredData = {
                    "@context": "https://schema.org",
                    "@type": "ImageObject",
                    "url": featuredImage.src,
                    "width": featuredImage.naturalWidth || featuredImage.width,
                    "height": featuredImage.naturalHeight || featuredImage.height,
                    "caption": featuredImage.alt,
                    "description": featuredImage.alt
                };
                
                const script = document.createElement('script');
                script.type = 'application/ld+json';
                script.textContent = JSON.stringify(structuredData);
                article.appendChild(script);
            }
        });
    }

    /**
     * Optimize image loading priority
     */
    optimizeImagePriority() {
        const images = document.querySelectorAll('img');
        
        images.forEach((img, index) => {
            // First 3 images get high priority
            if (index < 3) {
                img.loading = 'eager';
                img.fetchPriority = 'high';
                img.classList.add('high-priority-image');
            } else {
                img.loading = 'lazy';
                img.fetchPriority = 'low';
                img.classList.add('low-priority-image');
            }
        });
    }

    /**
     * Setup social media image optimization
     */
    setupSocialMediaOptimization() {
        const ogImage = document.querySelector('meta[property="og:image"]');
        const twitterImage = document.querySelector('meta[name="twitter:image"]');
        
        if (ogImage && !ogImage.content.startsWith('http')) {
            ogImage.content = window.location.origin + ogImage.content;
        }
        
        if (twitterImage && !twitterImage.content.startsWith('http')) {
            twitterImage.content = window.location.origin + twitterImage.content;
        }
    }

    /**
     * Track image performance for analytics
     */
    trackImagePerformance(entry) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'image_load_time', {
                'custom_parameter': entry.name,
                'value': Math.round(entry.duration),
                'event_category': 'performance',
                'event_label': 'image_loading'
            });
        }
    }

    /**
     * Track successful image loads
     */
    trackImageLoad(img, loadTime) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'image_loaded', {
                'custom_parameter': img.src,
                'value': Math.round(loadTime),
                'event_category': 'image',
                'event_label': 'successful_load'
            });
        }
    }

    /**
     * Track image loading errors
     */
    trackImageError(img) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'image_error', {
                'custom_parameter': img.dataset.src || img.src,
                'event_category': 'image',
                'event_label': 'load_error'
            });
        }
    }

    /**
     * Get image loading statistics
     */
    getImageStats() {
        const totalImages = document.querySelectorAll('img').length;
        const loadedImages = document.querySelectorAll('img.loaded').length;
        const errorImages = document.querySelectorAll('img.error').length;
        const avgLoadTime = Array.from(this.imageLoadTimes.values())
            .reduce((sum, time) => sum + time, 0) / this.imageLoadTimes.size || 0;
        
        return {
            total: totalImages,
            loaded: loadedImages,
            errors: errorImages,
            averageLoadTime: Math.round(avgLoadTime),
            cacheHits: this.imageCache.size
        };
    }

    /**
     * Refresh all images (useful for SPA navigation)
     */
    refreshImages() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (img.classList.contains('lazy-image') && !img.classList.contains('loaded')) {
                this.setupLazyImage(img);
            }
        });
    }

    /**
     * Preload next page images for faster navigation
     */
    preloadNextPageImages(urls) {
        urls.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            document.head.appendChild(link);
        });
    }
}

// Initialize Enhanced Image Manager
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedImageManager = new EnhancedImageManager();
    
    // Development mode: Log image statistics
    if (window.location.hostname === 'localhost') {
        setTimeout(() => {
            console.log('Image Loading Statistics:', window.enhancedImageManager.getImageStats());
        }, 3000);
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedImageManager;
}