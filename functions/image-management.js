/**
 * Smart Finance Hub - Image Management System
 * Handles responsive images, lazy loading, and optimization
 */

class ImageManager {
    constructor() {
        this.imageCache = new Map();
        this.lazyImages = [];
        this.intersectionObserver = null;
        this.init();
    }

    init() {
        this.setupLazyLoading();
        this.setupResponsiveImages();
        this.handleImageErrors();
    }

    /**
     * Setup intersection observer for lazy loading
     */
    setupLazyLoading() {
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
                threshold: 0.01
            });

            // Observe all lazy images
            this.observeLazyImages();
        } else {
            // Fallback for older browsers
            this.loadAllImages();
        }
    }

    /**
     * Observe images with data-src attribute for lazy loading
     */
    observeLazyImages() {
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => {
            this.intersectionObserver.observe(img);
        });
    }

    /**
     * Load individual image
     */
    loadImage(img) {
        const src = img.getAttribute('data-src');
        const srcset = img.getAttribute('data-srcset');
        
        if (src) {
            img.src = src;
            img.removeAttribute('data-src');
        }
        
        if (srcset) {
            img.srcset = srcset;
            img.removeAttribute('data-srcset');
        }

        img.classList.add('loaded');
    }

    /**
     * Load all images (fallback)
     */
    loadAllImages() {
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => this.loadImage(img));
    }

    /**
     * Setup responsive image handling
     */
    setupResponsiveImages() {
        window.addEventListener('resize', this.debounce(() => {
            this.updateResponsiveImages();
        }, 250));
    }

    /**
     * Update responsive images based on viewport
     */
    updateResponsiveImages() {
        const responsiveImages = document.querySelectorAll('[data-responsive]');
        responsiveImages.forEach(img => {
            const breakpoints = JSON.parse(img.getAttribute('data-responsive'));
            const currentWidth = window.innerWidth;
            
            let selectedSrc = img.getAttribute('data-src-default');
            
            for (let breakpoint in breakpoints) {
                if (currentWidth >= parseInt(breakpoint)) {
                    selectedSrc = breakpoints[breakpoint];
                }
            }
            
            if (img.src !== selectedSrc) {
                img.src = selectedSrc;
            }
        });
    }

    /**
     * Handle image loading errors
     */
    handleImageErrors() {
        document.addEventListener('error', (e) => {
            if (e.target.tagName === 'IMG') {
                this.handleImageError(e.target);
            }
        }, true);
    }

    /**
     * Handle individual image error
     */
    handleImageError(img) {
        // Try fallback image
        const fallback = img.getAttribute('data-fallback');
        if (fallback && img.src !== fallback) {
            img.src = fallback;
            return;
        }

        // Generate placeholder if no fallback
        this.generatePlaceholder(img);
    }

    /**
     * Generate SVG placeholder for failed images
     */
    generatePlaceholder(img) {
        const width = img.width || 400;
        const height = img.height || 300;
        const altText = img.alt || 'Image placeholder';
        
        const svg = `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" 
                 viewBox="0 0 ${width} ${height}" style="background:#f8fafc;">
                <rect width="100%" height="100%" fill="#e2e8f0"/>
                <text x="50%" y="50%" text-anchor="middle" dy="0.3em" 
                      fill="#718096" font-family="Arial, sans-serif" font-size="14">
                    ${altText}
                </text>
            </svg>
        `;
        
        img.src = 'data:image/svg+xml;base64,' + btoa(svg);
        img.classList.add('placeholder');
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
     * Add image with lazy loading
     */
    static createLazyImage(src, alt, className = '', width = null, height = null) {
        const img = document.createElement('img');
        img.setAttribute('data-src', src);
        img.alt = alt;
        img.className = `lazy-image ${className}`.trim();
        
        if (width) img.width = width;
        if (height) img.height = height;
        
        // Add placeholder while loading
        img.src = 'data:image/svg+xml;base64,' + btoa(`
            <svg width="${width || 400}" height="${height || 300}" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#f7fafc"/>
                <text x="50%" y="50%" text-anchor="middle" dy="0.3em" 
                      fill="#a0aec0" font-family="Arial, sans-serif" font-size="14">
                    Loading...
                </text>
            </svg>
        `);
        
        return img;
    }

    /**
     * Create responsive image with multiple breakpoints
     */
    static createResponsiveImage(sources, alt, className = '') {
        const img = document.createElement('img');
        const largestSrc = sources[Math.max(...Object.keys(sources).map(k => parseInt(k)))];
        
        img.setAttribute('data-src', largestSrc);
        img.setAttribute('data-responsive', JSON.stringify(sources));
        img.alt = alt;
        img.className = `responsive-image ${className}`.trim();
        
        return img;
    }
}

/**
 * Image URL generators for different services
 */
class ImageSources {
    /**
     * Generate Unsplash URL
     */
    static unsplash(query, width = 400, height = 300, quality = 80) {
        return `https://images.unsplash.com/${width}x${height}/?${encodeURIComponent(query)}&q=${quality}`;
    }

    /**
     * Generate Lorem Picsum URL
     */
    static picsum(width = 400, height = 300, id = null, blur = null, grayscale = false) {
        let url = `https://picsum.photos/${width}/${height}`;
        if (id) url += `?random=${id}`;
        if (blur) url += (url.includes('?') ? '&' : '?') + `blur=${blur}`;
        if (grayscale) url += (url.includes('?') ? '&' : '?') + 'grayscale';
        return url;
    }

    /**
     * Generate placeholder.com URL
     */
    static placeholder(width = 400, height = 300, bgColor = 'CCCCCC', textColor = '969696', text = '') {
        return `https://via.placeholder.com/${width}x${height}/${bgColor}/${textColor}${text ? '?text=' + encodeURIComponent(text) : ''}`;
    }

    /**
     * Financial stock photos from Unsplash
     */
    static financial(type = 'general', width = 400, height = 300) {
        const queries = {
            general: 'finance+business+money',
            savings: 'piggy+bank+savings+money',
            investing: 'stock+market+charts+investing',
            debt: 'credit+cards+debt+calculator',
            planning: 'financial+planning+calculator',
            charts: 'financial+charts+graphs',
            team: 'business+team+professional',
            technology: 'fintech+mobile+banking',
            retirement: 'retirement+planning+senior',
            education: 'financial+education+learning'
        };
        
        return this.unsplash(queries[type] || queries.general, width, height);
    }

    /**
     * Generate CSS gradient backgrounds
     */
    static gradientCSS(colors = ['#667eea', '#764ba2'], direction = '135deg') {
        return `linear-gradient(${direction}, ${colors.join(', ')})`;
    }
}

/**
 * Predefined image collections for the website
 */
class FinanceImages {
    static hero = {
        main: ImageSources.financial('general', 1200, 600),
        mobile: ImageSources.financial('general', 800, 400)
    };

    static articles = {
        savings: {
            featured: ImageSources.financial('savings', 800, 400),
            inline1: ImageSources.financial('savings', 600, 300),
            inline2: ImageSources.picsum(600, 300, 42)
        },
        debt: {
            featured: ImageSources.financial('debt', 800, 400),
            inline1: ImageSources.financial('debt', 600, 300),
            inline2: ImageSources.picsum(600, 300, 43)
        },
        investing: {
            featured: ImageSources.financial('investing', 800, 400),
            inline1: ImageSources.financial('charts', 600, 300),
            inline2: ImageSources.picsum(600, 300, 44)
        }
    };

    static sidebar = {
        newsletter: ImageSources.placeholder(300, 200, '4facfe', 'ffffff', 'Newsletter'),
        ad1: ImageSources.placeholder(300, 250, 'f093fb', 'ffffff', 'Advertisement'),
        ad2: ImageSources.placeholder(300, 250, 'ff6b6b', 'ffffff', 'Sponsored')
    };

    static about = {
        team: ImageSources.financial('team', 1000, 400),
        values: ImageSources.financial('planning', 800, 300)
    };
}

// Initialize image manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.imageManager = new ImageManager();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ImageManager, ImageSources, FinanceImages };
}