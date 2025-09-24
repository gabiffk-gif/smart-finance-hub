const { Octokit } = require('@octokit/rest');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const ContentGenerator = require('../content-generator/generator');
require('dotenv').config();

class Publisher {
    constructor() {
        this.octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });
        
        this.repoOwner = 'gabiffk-gif';
        this.repoName = 'smart-finance-hub';
        this.contentDir = path.join(__dirname, '../../content');
        this.publicDir = path.join(__dirname, '../../public');
        
        // Initialize content generator for scheduled tasks
        this.contentGenerator = new ContentGenerator();
        
        this.scheduledJobs = [];
        this.publishingQueue = [];
    }

    /**
     * Main publish method - converts article JSON to live HTML page
     */
    async publishArticle(article) {
        try {
            console.log(`Publishing article: ${article.title}`);
            
            // Generate slug for URL
            const slug = this.generateSlug(article.title);
            const publishDate = new Date();
            const year = publishDate.getFullYear();
            const month = String(publishDate.getMonth() + 1).padStart(2, '0');
            
            // Create file path
            const filePath = `articles/${year}/${month}/${slug}.html`;
            
            // Generate complete HTML
            const htmlContent = this.generateArticleHTML(article, slug);
            
            // Commit article to GitHub
            await this.commitToGitHub(filePath, htmlContent, `Add article: ${article.title}`);
            
            // Update homepage with new article
            await this.updateHomepage(article, slug, filePath);
            
            // Update sitemap
            await this.updateSitemap(slug, filePath, publishDate);
            
            // Update RSS feed
            await this.updateRSSFeed(article, slug, filePath, publishDate);
            
            // Move article from approved to published folder
            await this.moveArticleToPublished(article, {
                publishedAt: publishDate.toISOString(),
                publishedUrl: `https://smartfinancehub.vip/${filePath}`,
                slug,
                filePath
            });
            
            // Generate social media posts
            const socialPosts = await this.generateSocialMediaPosts(article, slug);
            
            console.log(`✅ Successfully published: ${article.title}`);
            console.log(`📍 URL: https://smartfinancehub.vip/${filePath}`);
            
            return {
                success: true,
                url: `https://smartfinancehub.vip/${filePath}`,
                filePath,
                slug,
                socialPosts
            };
            
        } catch (error) {
            console.error('Publication failed:', error);
            throw new Error(`Failed to publish article: ${error.message}`);
        }
    }

    /**
     * Generate complete HTML page from article JSON
     */
    generateArticleHTML(article, slug) {
        const publishDate = new Date();
        const readingTime = article.metadata?.readingTime || '5 min read';
        const wordCount = article.metadata?.wordCount || article.content.split(/\\s+/).length;
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title}</title>
    <meta name="description" content="${article.metaDescription}">
    <meta name="keywords" content="${this.extractKeywords(article).join(', ')}">
    <meta name="author" content="Smart Finance Hub">
    
    <!-- Open Graph Tags -->
    <meta property="og:title" content="${article.title}">
    <meta property="og:description" content="${article.metaDescription}">
    <meta property="og:image" content="https://smartfinancehub.vip/assets/images/articles/${slug}-featured.webp">
    <meta property="og:url" content="https://smartfinancehub.vip/articles/${publishDate.getFullYear()}/${String(publishDate.getMonth() + 1).padStart(2, '0')}/${slug}.html">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Smart Finance Hub">
    
    <!-- Twitter Card Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@smartfinancehub">
    <meta name="twitter:title" content="${article.title}">
    <meta name="twitter:description" content="${article.metaDescription}">
    <meta name="twitter:image" content="https://smartfinancehub.vip/assets/images/articles/${slug}-featured.webp">
    
    <!-- Article Specific Meta -->
    <meta property="article:published_time" content="${publishDate.toISOString()}">
    <meta property="article:author" content="Smart Finance Hub Editorial Team">
    <meta property="article:section" content="${this.mapCategoryToSection(article.category)}">
    <meta property="article:tag" content="${this.extractKeywords(article).join('", "')}">
    
    <!-- Canonical URL -->
    <link rel="canonical" href="https://smartfinancehub.vip/articles/${publishDate.getFullYear()}/${String(publishDate.getMonth() + 1).padStart(2, '0')}/${slug}.html">
    
    <!-- Stylesheets -->
    <link rel="stylesheet" href="/assets/css/style.css">
    <link rel="stylesheet" href="/assets/css/article.css">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    ${JSON.stringify(this.generateStructuredData(article, slug, publishDate), null, 2)}
    </script>
    
    <!-- Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'GA_MEASUREMENT_ID');
    </script>
</head>
<body>
    <!-- Header -->
    <header class="site-header">
        <div class="container">
            <nav class="main-nav">
                <a href="/" class="logo">
                    <img src="/assets/logo/SFH_VIP_Logo.png" alt="Smart Finance Hub" style="height: 60px; width: auto; max-width: 200px;">
                </a>
                <ul class="nav-links">
                    <li><a href="/">Home</a></li>
                    <li><a href="/articles">Articles</a></li>
                    <li><a href="/about">About</a></li>
                    <li><a href="/contact">Contact</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <!-- Breadcrumbs -->
    <nav class="breadcrumbs">
        <div class="container">
            <ol>
                <li><a href="/">Home</a></li>
                <li><a href="/articles">Articles</a></li>
                <li><a href="/articles/${article.category}">${this.mapCategoryToSection(article.category)}</a></li>
                <li>${article.title}</li>
            </ol>
        </div>
    </nav>

    <!-- Main Content -->
    <main class="article-main">
        <div class="container">
            <article class="article-content">
                <!-- Article Header -->
                <header class="article-header">
                    <h1 class="article-title">${article.title}</h1>
                    <p class="article-description">${article.metaDescription}</p>
                    
                    <div class="article-meta">
                        <div class="meta-item">
                            <span class="meta-label">Published:</span>
                            <time datetime="${publishDate.toISOString()}">${publishDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Reading Time:</span>
                            <span>${readingTime}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Word Count:</span>
                            <span>${wordCount.toLocaleString()}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Category:</span>
                            <a href="/articles/${article.category}">${this.mapCategoryToSection(article.category)}</a>
                        </div>
                    </div>
                </header>

                <!-- Featured Image -->
                <div class="article-featured-image">
                    <img src="/assets/images/articles/${slug}-featured.webp" 
                         alt="${article.title} - Complete guide from Smart Finance Hub"
                         width="1200" height="630"
                         loading="eager">
                </div>

                <!-- Article Body -->
                <div class="article-body">
                    ${this.processArticleContent(article.content)}
                </div>

                <!-- Call to Action -->
                ${article.cta ? `
                    <div class="article-cta">
                        <div class="cta-container">
                            ${article.cta}
                        </div>
                    </div>
                ` : ''}

                <!-- Newsletter Signup -->
                <div class="newsletter-signup-section" style="
                    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); 
                    color: white; 
                    padding: 3rem 2rem; 
                    border-radius: 12px; 
                    text-align: center; 
                    margin: 3rem 0;
                    box-shadow: 0 8px 25px rgba(79, 172, 254, 0.3);
                ">
                    <div style="max-width: 500px; margin: 0 auto;">
                        <h3 style="margin-bottom: 1rem; color: white; font-size: 1.8rem; font-weight: 700;">
                            📧 Don't Miss Our Latest Financial Tips
                        </h3>
                        <p style="margin-bottom: 2rem; font-size: 1.1rem; opacity: 0.95; line-height: 1.6;">
                            Join 25,000+ subscribers getting actionable financial advice, market insights, and money-saving tips delivered every Tuesday.
                        </p>
                        
                        <!-- ConvertKit Newsletter Form -->
                        <div class="convertkit-form-wrapper" style="margin: 1.5rem 0;">
                            <script async data-uid="016a3faa46" src="https://smartfinancehub-vip.kit.com/016a3faa46/index.js"></script>
                        </div>
                        
                        <div style="display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1.5rem; flex-wrap: wrap;">
                            <small style="font-size: 0.85rem; opacity: 0.8;">
                                ✅ No spam, ever. Unsubscribe anytime.
                            </small>
                            <small style="font-size: 0.85rem; opacity: 0.8;">
                                ✅ Free financial resources included.
                            </small>
                        </div>
                    </div>
                </div>

                <!-- Related Articles -->
                <div class="related-articles">
                    <h3>Related Articles</h3>
                    <div class="related-articles-grid" id="relatedArticles">
                        <!-- Related articles will be loaded via JavaScript -->
                    </div>
                </div>

                <!-- Article Footer -->
                <footer class="article-footer">
                    <div class="article-tags">
                        <h4>Tags:</h4>
                        ${this.extractKeywords(article).map(keyword => 
                            `<a href="/articles/tags/${this.generateSlug(keyword)}" class="tag">${keyword}</a>`
                        ).join('')}
                    </div>
                    
                    <div class="share-buttons">
                        <h4>Share This Article:</h4>
                        <div class="share-links">
                            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent('https://smartfinancehub.vip/articles/' + publishDate.getFullYear() + '/' + String(publishDate.getMonth() + 1).padStart(2, '0') + '/' + slug + '.html')}" 
                               target="_blank" class="share-twitter">Twitter</a>
                            <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://smartfinancehub.vip/articles/' + publishDate.getFullYear() + '/' + String(publishDate.getMonth() + 1).padStart(2, '0') + '/' + slug + '.html')}" 
                               target="_blank" class="share-linkedin">LinkedIn</a>
                            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://smartfinancehub.vip/articles/' + publishDate.getFullYear() + '/' + String(publishDate.getMonth() + 1).padStart(2, '0') + '/' + slug + '.html')}" 
                               target="_blank" class="share-facebook">Facebook</a>
                        </div>
                    </div>
                </footer>
            </article>
        </div>
    </main>

    <!-- Affiliate Disclosure Footer -->
    <footer style="background-color: #f8f9fa; border-top: 1px solid #e9ecef; padding: 1rem 2rem; margin-top: 3rem;">
        <div class="affiliate-disclosure" style="max-width: 1200px; margin: 0 auto; text-align: center;">
            <p style="font-size: 0.85rem; color: #6c757d; margin: 0; line-height: 1.4;">
                <strong>Affiliate Disclosure:</strong> Smart Finance Hub may earn a commission from partner links on this page. This doesn't affect our editorial opinions or recommendations. 
                <a href="/affiliate-disclosure.html" style="color: #007bff; text-decoration: none;">Learn more</a>
            </p>
        </div>
    </footer>

    <!-- JavaScript -->
    <script src="/assets/js/main.js"></script>
    <script src="/assets/js/article.js"></script>
    <script>
        // Article-specific analytics
        gtag('event', 'article_view', {
            'article_title': '${article.title}',
            'article_category': '${article.category}',
            'article_word_count': ${wordCount},
            'custom_map.dimension1': '${slug}'
        });
        
        // ConvertKit Analytics Integration for Articles
        function trackArticleNewsletterSignup() {
            // Track with Google Analytics
            if (typeof gtag !== 'undefined') {
                gtag('event', 'newsletter_signup', {
                    'event_category': 'conversion',
                    'event_label': 'article_newsletter',
                    'value': 1,
                    'page_location': window.location.href
                });
            }
            
            // Track with Facebook Pixel if available
            if (typeof fbq !== 'undefined') {
                fbq('track', 'Lead', {
                    content_name: 'Article Newsletter Signup',
                    content_category: 'Newsletter',
                    source: 'article_page'
                });
            }
        }

        // Listen for ConvertKit form submissions on article pages
        document.addEventListener('DOMContentLoaded', function() {
            // Wait for ConvertKit to load
            setTimeout(function() {
                const observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        if (mutation.type === 'childList') {
                            const successMessage = document.querySelector('[data-element="success"]');
                            if (successMessage && successMessage.style.display !== 'none') {
                                trackArticleNewsletterSignup();
                            }
                        }
                    });
                });
                
                const formWrapper = document.querySelector('.newsletter-signup-section .convertkit-form-wrapper');
                if (formWrapper) {
                    observer.observe(formWrapper, { childList: true, subtree: true });
                }
            }, 2000);
        });
    </script>
</body>
</html>`;
    }

    /**
     * Process article content for web display
     */
    processArticleContent(content) {
        // Add proper paragraph spacing
        let processedContent = content.replace(/\n\n/g, '</p><p>');
        
        // Ensure content is wrapped in paragraphs
        if (!processedContent.startsWith('<p>')) {
            processedContent = '<p>' + processedContent + '</p>';
        }
        
        // Add proper image handling
        processedContent = processedContent.replace(/<img([^>]*?)>/g, (match, attrs) => {
            if (!attrs.includes('loading=')) {
                attrs += ' loading="lazy"';
            }
            if (!attrs.includes('width=') || !attrs.includes('height=')) {
                attrs += ' width="800" height="600"';
            }
            return `<img${attrs}>`;
        });
        
        // Add table of contents for long articles
        const headings = content.match(/<h[2-3][^>]*>(.*?)<\/h[2-3]>/gi);
        if (headings && headings.length >= 3) {
            const toc = this.generateTableOfContents(headings);
            processedContent = toc + processedContent;
        }
        
        return processedContent;
    }

    generateTableOfContents(headings) {
        const tocItems = headings.map(heading => {
            const level = heading.match(/<h([2-3])/)[1];
            const text = heading.replace(/<[^>]+>/g, '');
            const id = this.generateSlug(text);
            
            return {
                level: parseInt(level),
                text,
                id
            };
        });
        
        let toc = '<div class="table-of-contents"><h3>Table of Contents</h3><ul>';
        tocItems.forEach(item => {
            const indent = item.level === 3 ? ' style="margin-left: 1rem;"' : '';
            toc += `<li${indent}><a href="#${item.id}">${item.text}</a></li>`;
        });
        toc += '</ul></div>';
        
        return toc;
    }

    /**
     * Generate structured data for the article
     */
    generateStructuredData(article, slug, publishDate) {
        return {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": article.title,
            "description": article.metaDescription,
            "image": [
                `https://smartfinancehub.vip/assets/images/articles/${slug}-featured.webp`
            ],
            "author": {
                "@type": "Organization",
                "name": "Smart Finance Hub Editorial Team",
                "url": "https://smartfinancehub.vip/about"
            },
            "publisher": {
                "@type": "Organization",
                "name": "Smart Finance Hub",
                "logo": {
                    "@type": "ImageObject",
                    "url": "https://smartfinancehub.vip/assets/logo/SFH_VIP_Logo.png"
                }
            },
            "datePublished": publishDate.toISOString(),
            "dateModified": publishDate.toISOString(),
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": `https://smartfinancehub.vip/articles/${publishDate.getFullYear()}/${String(publishDate.getMonth() + 1).padStart(2, '0')}/${slug}.html`
            },
            "articleSection": this.mapCategoryToSection(article.category),
            "keywords": this.extractKeywords(article).join(", "),
            "wordCount": article.metadata?.wordCount || article.content.split(/\\s+/).length,
            "about": {
                "@type": "Thing",
                "name": article.title.split(':')[0] || article.title
            }
        };
    }

    /**
     * Commit file to GitHub repository
     */
    async commitToGitHub(filePath, content, commitMessage) {
        try {
            // Check if file already exists
            let sha;
            try {
                const existingFile = await this.octokit.rest.repos.getContent({
                    owner: this.repoOwner,
                    repo: this.repoName,
                    path: filePath
                });
                sha = existingFile.data.sha;
            } catch (error) {
                // File doesn't exist, which is fine for new articles
                if (error.status !== 404) {
                    throw error;
                }
            }
            
            // Create or update file
            await this.octokit.rest.repos.createOrUpdateFileContents({
                owner: this.repoOwner,
                repo: this.repoName,
                path: filePath,
                message: commitMessage,
                content: Buffer.from(content).toString('base64'),
                sha // Include SHA if updating existing file
            });
            
            console.log(`✅ Committed to GitHub: ${filePath}`);
            
        } catch (error) {
            console.error(`❌ GitHub commit failed for ${filePath}:`, error);
            throw new Error(`GitHub commit failed: ${error.message}`);
        }
    }

    /**
     * Update homepage to include new article
     */
    async updateHomepage(article, slug, filePath) {
        try {
            // Get current homepage
            const homepage = await this.octokit.rest.repos.getContent({
                owner: this.repoOwner,
                repo: this.repoName,
                path: 'index.html'
            });
            
            const currentContent = Buffer.from(homepage.data.content, 'base64').toString();
            
            // Generate new article card
            const articleCard = this.generateArticleCard(article, slug, filePath);
            
            // Insert new article at the beginning of the articles section
            const articlesSection = '<!-- Latest Articles -->';
            const insertPoint = currentContent.indexOf(articlesSection);
            
            if (insertPoint !== -1) {
                const beforeSection = currentContent.substring(0, insertPoint + articlesSection.length);
                const afterSection = currentContent.substring(insertPoint + articlesSection.length);
                
                const updatedContent = beforeSection + '\\n' + articleCard + afterSection;
                
                // Commit updated homepage
                await this.octokit.rest.repos.createOrUpdateFileContents({
                    owner: this.repoOwner,
                    repo: this.repoName,
                    path: 'index.html',
                    message: `Update homepage with new article: ${article.title}`,
                    content: Buffer.from(updatedContent).toString('base64'),
                    sha: homepage.data.sha
                });
                
                console.log('✅ Updated homepage with new article');
            }
            
        } catch (error) {
            console.error('❌ Failed to update homepage:', error);
            // Don't throw error - homepage update is not critical
        }
    }

    generateArticleCard(article, slug, filePath) {
        const publishDate = new Date();
        const readingTime = article.metadata?.readingTime || '5 min read';
        
        return `
        <div class="article-card">
            <div class="article-image">
                <img src="/assets/images/articles/${slug}-featured.webp" 
                     alt="${article.title}"
                     loading="lazy">
                <div class="article-category">${this.mapCategoryToSection(article.category)}</div>
            </div>
            <div class="article-content">
                <h3 class="article-title">
                    <a href="/${filePath}">${article.title}</a>
                </h3>
                <p class="article-excerpt">${article.metaDescription}</p>
                <div class="article-meta">
                    <span class="article-date">${publishDate.toLocaleDateString()}</span>
                    <span class="article-reading-time">${readingTime}</span>
                </div>
                <a href="/${filePath}" class="read-more">Read More →</a>
            </div>
        </div>`;
    }

    /**
     * Update sitemap.xml with new article
     */
    async updateSitemap(slug, filePath, publishDate) {
        try {
            // Get current sitemap
            let sitemap;
            try {
                const sitemapFile = await this.octokit.rest.repos.getContent({
                    owner: this.repoOwner,
                    repo: this.repoName,
                    path: 'sitemap.xml'
                });
                sitemap = Buffer.from(sitemapFile.data.content, 'base64').toString();
            } catch (error) {
                // Create new sitemap if it doesn't exist
                sitemap = this.createBaseSitemap();
            }
            
            // Add new URL entry
            const newEntry = `
    <url>
        <loc>https://smartfinancehub.vip/${filePath}</loc>
        <lastmod>${publishDate.toISOString().split('T')[0]}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>`;
            
            // Insert before closing </urlset> tag
            const updatedSitemap = sitemap.replace('</urlset>', newEntry + '\\n</urlset>');
            
            // Commit updated sitemap
            await this.commitToGitHub('sitemap.xml', updatedSitemap, `Update sitemap with new article: ${slug}`);
            
            console.log('✅ Updated sitemap.xml');
            
        } catch (error) {
            console.error('❌ Failed to update sitemap:', error);
        }
    }

    createBaseSitemap() {
        return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://smartfinancehub.vip/</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>https://smartfinancehub.vip/articles</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>
</urlset>`;
    }

    /**
     * Update RSS feed with new article
     */
    async updateRSSFeed(article, slug, filePath, publishDate) {
        try {
            // Get current RSS feed
            let rss;
            let rssSha;
            try {
                const rssFile = await this.octokit.rest.repos.getContent({
                    owner: this.repoOwner,
                    repo: this.repoName,
                    path: 'rss.xml'
                });
                rss = Buffer.from(rssFile.data.content, 'base64').toString();
                rssSha = rssFile.data.sha;
            } catch (error) {
                // Create new RSS feed if it doesn't exist
                rss = this.createBaseRSS();
                rssSha = null;
            }
            
            // Create new RSS item
            const rssItem = `
        <item>
            <title><![CDATA[${article.title}]]></title>
            <description><![CDATA[${article.metaDescription}]]></description>
            <link>https://smartfinancehub.vip/${filePath}</link>
            <guid>https://smartfinancehub.vip/${filePath}</guid>
            <pubDate>${publishDate.toUTCString()}</pubDate>
            <category>${this.mapCategoryToSection(article.category)}</category>
        </item>`;
            
            // Insert new item after the channel opening tag
            const channelStart = rss.indexOf('<channel>');
            const firstItemStart = rss.indexOf('<item>');
            
            let updatedRss;
            if (firstItemStart !== -1) {
                // Insert before existing items
                updatedRss = rss.substring(0, firstItemStart) + rssItem + '\\n        ' + rss.substring(firstItemStart);
            } else {
                // Insert after channel description
                const insertPoint = rss.indexOf('</description>', channelStart) + '</description>'.length;
                updatedRss = rss.substring(0, insertPoint) + rssItem + rss.substring(insertPoint);
            }
            
            // Commit updated RSS feed
            await this.octokit.rest.repos.createOrUpdateFileContents({
                owner: this.repoOwner,
                repo: this.repoName,
                path: 'rss.xml',
                message: `Update RSS feed with new article: ${article.title}`,
                content: Buffer.from(updatedRss).toString('base64'),
                sha: rssSha
            });
            
            console.log('✅ Updated RSS feed');
            
        } catch (error) {
            console.error('❌ Failed to update RSS feed:', error);
        }
    }

    createBaseRSS() {
        return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>Smart Finance Hub</title>
        <description>Expert financial advice, investment strategies, and money management tips to help you build wealth and achieve financial freedom.</description>
        <link>https://smartfinancehub.vip</link>
        <atom:link href="https://smartfinancehub.vip/rss.xml" rel="self" type="application/rss+xml"/>
        <language>en-us</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <managingEditor>editor@smartfinancehub.vip (Smart Finance Hub Editorial Team)</managingEditor>
        <webMaster>webmaster@smartfinancehub.vip (Smart Finance Hub)</webMaster>
        <image>
            <url>https://smartfinancehub.vip/assets/logo/SFH_VIP_Logo.png</url>
            <title>Smart Finance Hub</title>
            <link>https://smartfinancehub.vip</link>
        </image>
    </channel>
</rss>`;
    }

    /**
     * Move article from approved to published folder
     */
    async moveArticleToPublished(article, publishMetadata) {
        try {
            // Update article metadata
            article.metadata = {
                ...article.metadata,
                ...publishMetadata,
                status: 'published'
            };
            
            // Save to published folder
            const publishedPath = path.join(this.contentDir, 'published', `${article.metadata.id}.json`);
            await fs.writeFile(publishedPath, JSON.stringify(article, null, 2));
            
            // Remove from approved folder
            const approvedPath = path.join(this.contentDir, 'approved', `${article.metadata.id}.json`);
            try {
                await fs.unlink(approvedPath);
            } catch (error) {
                console.warn('Could not remove from approved folder:', error.message);
            }
            
            console.log(`✅ Moved article to published: ${article.metadata.id}`);
            
        } catch (error) {
            console.error('❌ Failed to move article to published folder:', error);
        }
    }

    /**
     * Initialize automated scheduler
     */
    initializeScheduler() {
        console.log('🕐 Initializing automated scheduler...');
        
        // Hourly check for scheduled articles (every hour at minute 0)
        const hourlyJob = cron.schedule('0 * * * *', async () => {
            console.log('🔍 Checking for scheduled articles...');
            await this.processScheduledArticles();
        }, { scheduled: false });
        
        // Daily content generation at 2 AM
        const dailyGenerationJob = cron.schedule('0 2 * * *', async () => {
            console.log('🤖 Running daily content generation...');
            await this.runDailyGeneration();
        }, { scheduled: false });
        
        // Daily sitemap update at 3 AM
        const sitemapUpdateJob = cron.schedule('0 3 * * *', async () => {
            console.log('🗺️ Running daily sitemap update...');
            await this.updateFullSitemap();
        }, { scheduled: false });
        
        // Monthly content archival (1st of each month at 1 AM)
        const monthlyArchivalJob = cron.schedule('0 1 1 * *', async () => {
            console.log('📦 Running monthly content archival...');
            await this.runMonthlyArchival();
        }, { scheduled: false });
        
        // Start all jobs
        hourlyJob.start();
        dailyGenerationJob.start();
        sitemapUpdateJob.start();
        monthlyArchivalJob.start();
        
        this.scheduledJobs = [hourlyJob, dailyGenerationJob, sitemapUpdateJob, monthlyArchivalJob];
        
        console.log('✅ Scheduler initialized with 4 jobs:');
        console.log('   • Hourly: Check scheduled articles');
        console.log('   • 2 AM: Generate content');
        console.log('   • 3 AM: Update sitemap');
        console.log('   • Monthly: Archive old content');
    }

    async processScheduledArticles() {
        try {
            const approvedDir = path.join(this.contentDir, 'approved');
            const files = await fs.readdir(approvedDir);
            
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                
                const articlePath = path.join(approvedDir, file);
                const article = JSON.parse(await fs.readFile(articlePath, 'utf8'));
                
                if (article.metadata?.scheduledFor) {
                    const scheduledTime = new Date(article.metadata.scheduledFor);
                    const now = new Date();
                    
                    if (scheduledTime <= now && article.metadata.status === 'scheduled') {
                        console.log(`📤 Publishing scheduled article: ${article.title}`);
                        try {
                            await this.publishArticle(article);
                            console.log(`✅ Successfully published: ${article.title}`);
                        } catch (error) {
                            console.error(`❌ Failed to publish ${article.title}:`, error);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error processing scheduled articles:', error);
        }
    }

    async runDailyGeneration() {
        try {
            // Check if we need more content
            const draftsDir = path.join(this.contentDir, 'drafts');
            const draftFiles = await fs.readdir(draftsDir);
            const draftCount = draftFiles.filter(f => f.endsWith('.json')).length;
            
            // Generate articles if we have fewer than 10 drafts
            if (draftCount < 10) {
                const articlesToGenerate = Math.min(5, 10 - draftCount);
                console.log(`📝 Generating ${articlesToGenerate} new articles...`);
                
                const articles = await this.contentGenerator.generateArticles(articlesToGenerate);
                console.log(`✅ Generated ${articles.length} articles`);
            } else {
                console.log('📝 Sufficient drafts available, skipping generation');
            }
        } catch (error) {
            console.error('❌ Daily generation failed:', error);
        }
    }

    async updateFullSitemap() {
        try {
            console.log('🗺️ Updating full sitemap...');
            
            // Get all published articles
            const publishedDir = path.join(this.contentDir, 'published');
            const files = await fs.readdir(publishedDir);
            
            let sitemap = this.createBaseSitemap();
            
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                
                const articlePath = path.join(publishedDir, file);
                const article = JSON.parse(await fs.readFile(articlePath, 'utf8'));
                
                if (article.metadata?.publishedUrl && article.metadata?.publishedAt) {
                    const url = article.metadata.publishedUrl;
                    const lastmod = new Date(article.metadata.publishedAt).toISOString().split('T')[0];
                    
                    const entry = `
    <url>
        <loc>${url}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>`;
                    
                    sitemap = sitemap.replace('</urlset>', entry + '\\n</urlset>');
                }
            }
            
            await this.commitToGitHub('sitemap.xml', sitemap, 'Daily sitemap update');
            console.log('✅ Full sitemap updated');
            
        } catch (error) {
            console.error('❌ Sitemap update failed:', error);
        }
    }

    async runMonthlyArchival() {
        try {
            console.log('📦 Running monthly archival...');
            
            const publishedDir = path.join(this.contentDir, 'published');
            const archiveDir = path.join(this.contentDir, 'archive');
            
            const files = await fs.readdir(publishedDir);
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            
            let archivedCount = 0;
            
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                
                const articlePath = path.join(publishedDir, file);
                const article = JSON.parse(await fs.readFile(articlePath, 'utf8'));
                
                if (article.metadata?.publishedAt) {
                    const publishedDate = new Date(article.metadata.publishedAt);
                    
                    if (publishedDate < threeMonthsAgo) {
                        // Move to archive
                        const archivePath = path.join(archiveDir, file);
                        article.metadata.archivedAt = new Date().toISOString();
                        article.metadata.status = 'archived';
                        
                        await fs.writeFile(archivePath, JSON.stringify(article, null, 2));
                        await fs.unlink(articlePath);
                        
                        archivedCount++;
                    }
                }
            }
            
            console.log(`✅ Archived ${archivedCount} articles`);
            
        } catch (error) {
            console.error('❌ Monthly archival failed:', error);
        }
    }

    /**
     * Generate social media posts for published article
     */
    async generateSocialMediaPosts(article, slug) {
        const url = `https://smartfinancehub.vip/articles/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${slug}.html`;
        
        const posts = {
            twitter: this.generateTwitterPost(article, url),
            linkedin: this.generateLinkedInPost(article, url),
            facebook: this.generateFacebookPost(article, url)
        };
        
        // Save to social queue for later posting
        await this.saveToSocialQueue(posts, article.metadata.id);
        
        return posts;
    }

    generateTwitterPost(article, url) {
        const maxLength = 280;
        const urlLength = 23; // Twitter's t.co URL length
        const availableLength = maxLength - urlLength - 10; // Buffer for hashtags
        
        let post = article.title;
        if (post.length > availableLength) {
            post = post.substring(0, availableLength - 3) + '...';
        }
        
        // Add relevant hashtags
        const hashtags = ['#PersonalFinance', '#MoneyTips', '#FinancialPlanning'];
        const category = this.mapCategoryToHashtag(article.category);
        if (category) hashtags.push(category);
        
        post += '\\n\\n' + hashtags.slice(0, 3).join(' ') + '\\n\\n' + url;
        
        return {
            platform: 'twitter',
            content: post,
            scheduledFor: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes after publication
            hashtags: hashtags.slice(0, 3)
        };
    }

    generateLinkedInPost(article, url) {
        const post = `📊 New Article: ${article.title}

${article.metaDescription}

Key insights covered:
• Expert financial strategies
• Actionable money management tips
• Real-world examples and case studies

Perfect for professionals looking to optimize their financial decisions.

Read the full article: ${url}

#PersonalFinance #FinancialPlanning #MoneyManagement ${this.mapCategoryToHashtag(article.category) || '#Investing'}`;

        return {
            platform: 'linkedin',
            content: post,
            scheduledFor: new Date(Date.now() + 60 * 60 * 1000), // 1 hour after publication
            tone: 'professional'
        };
    }

    generateFacebookPost(article, url) {
        const post = `💰 ${article.title}

${article.metaDescription}

Whether you're just starting your financial journey or looking to optimize your strategy, this comprehensive guide provides practical advice you can implement today.

👆 Read the full article at the link above

What's your biggest financial challenge right now? Share in the comments! 👇

${url}`;

        return {
            platform: 'facebook',
            content: post,
            scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours after publication
            callToAction: 'engagement'
        };
    }

    async saveToSocialQueue(posts, articleId) {
        try {
            const socialQueueDir = path.join(this.contentDir, 'social-queue');
            const queueFile = path.join(socialQueueDir, `${articleId}-${Date.now()}.json`);
            
            const queueItem = {
                articleId,
                posts,
                createdAt: new Date().toISOString(),
                status: 'pending'
            };
            
            await fs.writeFile(queueFile, JSON.stringify(queueItem, null, 2));
            console.log('✅ Saved social media posts to queue');
            
        } catch (error) {
            console.error('❌ Failed to save social posts to queue:', error);
        }
    }

    /**
     * Utility methods
     */
    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\\s-]/g, '')
            .replace(/\\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 60);
    }

    extractKeywords(article) {
        if (article.metadata?.targetKeywords) {
            return [...article.metadata.targetKeywords.primary, ...article.metadata.targetKeywords.longTail];
        }
        
        // Fallback: extract from content
        const words = article.content.toLowerCase().split(/\\s+/);
        const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
        const wordFreq = {};
        
        words.filter(word => word.length > 3 && !stopWords.has(word))
             .forEach(word => wordFreq[word] = (wordFreq[word] || 0) + 1);
        
        return Object.entries(wordFreq)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([word]) => word);
    }

    mapCategoryToSection(category) {
        const mapping = {
            'banking': 'Banking & Savings',
            'investing': 'Investment Strategies',
            'credit': 'Credit Management',
            'debt': 'Debt Management',
            'retirement': 'Retirement Planning',
            'taxes': 'Tax Planning',
            'insurance': 'Insurance',
            'budgeting': 'Budgeting & Planning',
            'real_estate': 'Real Estate',
            'business': 'Business Finance'
        };
        
        return mapping[category] || 'Personal Finance';
    }

    mapCategoryToHashtag(category) {
        const mapping = {
            'banking': '#Banking',
            'investing': '#Investing',
            'credit': '#CreditScore',
            'debt': '#DebtFree',
            'retirement': '#RetirementPlanning',
            'taxes': '#TaxTips',
            'insurance': '#Insurance',
            'budgeting': '#Budgeting',
            'real_estate': '#RealEstate',
            'business': '#BusinessFinance'
        };
        
        return mapping[category];
    }

    /**
     * Cleanup and shutdown
     */
    destroy() {
        console.log('🛑 Shutting down Publisher...');
        
        // Stop all cron jobs
        this.scheduledJobs.forEach(job => {
            job.destroy();
        });
        
        console.log('✅ Publisher shutdown complete');
    }
}

// CLI usage
if (require.main === module) {
    const publisher = new Publisher();
    
    // Initialize scheduler
    publisher.initializeScheduler();
    
    console.log('🚀 Publisher started with automated scheduling');
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        publisher.destroy();
        process.exit(0);
    });
}

module.exports = Publisher;