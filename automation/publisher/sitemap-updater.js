const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
require('dotenv').config();

class SitemapUpdater {
    constructor(options = {}) {
        this.octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });
        
        this.repoOwner = options.repoOwner || 'gabiffk-gif';
        this.repoName = options.repoName || 'smart-finance-hub';
        this.baseUrl = options.baseUrl || 'https://smartfinancehub.vip';
        this.contentDir = options.contentDir || path.join(__dirname, '../../content');
        
        // Static pages configuration
        this.staticPages = [
            {
                url: '',
                changefreq: 'daily',
                priority: 1.0,
                lastmod: null // Will use current date
            },
            {
                url: 'articles',
                changefreq: 'daily',
                priority: 0.9,
                lastmod: null
            },
            {
                url: 'about',
                changefreq: 'monthly',
                priority: 0.5,
                lastmod: null
            },
            {
                url: 'contact',
                changefreq: 'monthly',
                priority: 0.5,
                lastmod: null
            },
            {
                url: 'affiliate-disclosure.html',
                changefreq: 'quarterly',
                priority: 0.3,
                lastmod: null
            }
        ];
        
        // Category pages
        this.categoryPages = [
            'banking',
            'investing', 
            'credit',
            'debt',
            'retirement',
            'taxes',
            'insurance',
            'budgeting',
            'real_estate',
            'business'
        ];
        
        // Google Search Console ping endpoints
        this.googlePingUrls = [
            'https://www.google.com/ping?sitemap=',
            'https://www.bing.com/ping?sitemap='
        ];
    }

    /**
     * Main method to update sitemap completely
     */
    async updateSitemap(options = {}) {
        try {
            console.log('🗺️ Starting sitemap update...');
            
            // Read all published articles
            const articles = await this.readPublishedArticles();
            console.log(`📚 Found ${articles.length} published articles`);
            
            // Generate complete sitemap XML
            const sitemapXML = await this.generateSitemapXML(articles);
            
            // Commit to GitHub
            if (!options.dryRun) {
                await this.commitSitemapToGitHub(sitemapXML);
                
                // Ping search engines
                if (options.pingSearchEngines !== false) {
                    await this.pingSearchEngines();
                }
            } else {
                console.log('🔍 Dry run mode - sitemap not committed');
                if (options.outputPath) {
                    await fs.writeFile(options.outputPath, sitemapXML);
                    console.log(`💾 Sitemap saved to: ${options.outputPath}`);
                }
            }
            
            console.log('✅ Sitemap update completed successfully');
            
            return {
                success: true,
                articlesCount: articles.length,
                totalUrls: this.calculateTotalUrls(articles),
                sitemapSize: sitemapXML.length
            };
            
        } catch (error) {
            console.error('❌ Sitemap update failed:', error);
            throw new Error(`Sitemap update failed: ${error.message}`);
        }
    }

    /**
     * Read all published articles from content directory
     */
    async readPublishedArticles() {
        try {
            const publishedDir = path.join(this.contentDir, 'published');
            
            // Check if directory exists
            try {
                await fs.access(publishedDir);
            } catch (error) {
                console.warn('📁 Published directory does not exist, creating empty sitemap');
                return [];
            }
            
            const files = await fs.readdir(publishedDir);
            const articles = [];
            
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                
                try {
                    const filePath = path.join(publishedDir, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const article = JSON.parse(content);
                    
                    // Validate article has required fields
                    if (this.validateArticle(article)) {
                        articles.push(article);
                    } else {
                        console.warn(`⚠️ Skipping invalid article: ${file}`);
                    }
                    
                } catch (error) {
                    console.warn(`⚠️ Error reading article ${file}:`, error.message);
                }
            }
            
            // Sort by publication date (newest first)
            articles.sort((a, b) => {
                const dateA = new Date(a.metadata?.publishedAt || a.metadata?.createdAt);
                const dateB = new Date(b.metadata?.publishedAt || b.metadata?.createdAt);
                return dateB - dateA;
            });
            
            return articles;
            
        } catch (error) {
            console.error('❌ Error reading published articles:', error);
            throw new Error(`Failed to read articles: ${error.message}`);
        }
    }

    /**
     * Validate article has required metadata for sitemap
     */
    validateArticle(article) {
        return article &&
               article.metadata &&
               article.metadata.id &&
               article.title &&
               (article.metadata.publishedUrl || article.metadata.slug || article.metadata.filePath);
    }

    /**
     * Generate complete sitemap XML
     */
    async generateSitemapXML(articles) {
        const currentDate = new Date().toISOString().split('T')[0];
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;
        
        // Add static pages
        for (const page of this.staticPages) {
            xml += this.generateUrlEntry({
                url: page.url,
                lastmod: page.lastmod || currentDate,
                changefreq: page.changefreq,
                priority: page.priority
            });
        }
        
        // Add category pages
        for (const category of this.categoryPages) {
            xml += this.generateUrlEntry({
                url: `articles/${category}`,
                lastmod: currentDate,
                changefreq: 'weekly',
                priority: 0.7
            });
        }
        
        // Add article URLs
        for (const article of articles) {
            const urlInfo = this.extractArticleUrlInfo(article);
            if (urlInfo) {
                xml += this.generateUrlEntry(urlInfo, article);
            }
        }
        
        xml += '\n</urlset>';
        
        return xml;
    }

    /**
     * Extract URL information from article metadata
     */
    extractArticleUrlInfo(article) {
        let url, lastmod;
        
        // Try to get URL from metadata
        if (article.metadata.publishedUrl) {
            url = article.metadata.publishedUrl.replace(this.baseUrl + '/', '');
        } else if (article.metadata.filePath) {
            url = article.metadata.filePath;
        } else if (article.metadata.slug) {
            // Generate URL from slug and date
            const publishDate = new Date(article.metadata.publishedAt || article.metadata.createdAt);
            const year = publishDate.getFullYear();
            const month = String(publishDate.getMonth() + 1).padStart(2, '0');
            url = `articles/${year}/${month}/${article.metadata.slug}.html`;
        } else {
            console.warn(`⚠️ Could not extract URL for article: ${article.metadata.id}`);
            return null;
        }
        
        // Get last modified date
        lastmod = article.metadata.updatedAt || article.metadata.publishedAt || article.metadata.createdAt;
        if (lastmod) {
            lastmod = new Date(lastmod).toISOString().split('T')[0];
        }
        
        return {
            url,
            lastmod: lastmod || new Date().toISOString().split('T')[0],
            changefreq: this.determineChangeFreq(article),
            priority: this.determinePriority(article)
        };
    }

    /**
     * Determine change frequency based on article metadata
     */
    determineChangeFreq(article) {
        const publishedAt = new Date(article.metadata.publishedAt || article.metadata.createdAt);
        const now = new Date();
        const daysSincePublished = (now - publishedAt) / (1000 * 60 * 60 * 24);
        
        // Recent articles change more frequently
        if (daysSincePublished < 7) return 'daily';
        if (daysSincePublished < 30) return 'weekly';
        if (daysSincePublished < 90) return 'monthly';
        return 'yearly';
    }

    /**
     * Determine priority based on article quality and recency
     */
    determinePriority(article) {
        let priority = 0.6; // Base priority for articles
        
        // Boost for high quality articles
        const qualityScore = article.metadata.qualityScore?.overall || 0;
        if (qualityScore >= 90) priority += 0.2;
        else if (qualityScore >= 80) priority += 0.1;
        
        // Boost for recent articles
        const publishedAt = new Date(article.metadata.publishedAt || article.metadata.createdAt);
        const daysSincePublished = (new Date() - publishedAt) / (1000 * 60 * 60 * 24);
        
        if (daysSincePublished < 7) priority += 0.1;
        else if (daysSincePublished < 30) priority += 0.05;
        
        // Boost for high-priority categories
        const highPriorityCategories = ['investing', 'retirement', 'banking'];
        if (highPriorityCategories.includes(article.category)) {
            priority += 0.05;
        }
        
        return Math.min(priority, 0.9); // Cap at 0.9
    }

    /**
     * Generate individual URL entry XML
     */
    generateUrlEntry(urlInfo, article = null) {
        const fullUrl = `${this.baseUrl}/${urlInfo.url}`.replace(/\/+$/, ''); // Remove trailing slashes
        
        let xml = `
    <url>
        <loc>${this.escapeXml(fullUrl)}</loc>
        <lastmod>${urlInfo.lastmod}</lastmod>
        <changefreq>${urlInfo.changefreq}</changefreq>
        <priority>${urlInfo.priority.toFixed(1)}</priority>`;
        
        // Add image information for articles
        if (article && article.metadata.slug) {
            xml += `
        <image:image>
            <image:loc>${this.baseUrl}/assets/images/articles/${article.metadata.slug}-featured.webp</image:loc>
            <image:title>${this.escapeXml(article.title)}</image:title>
            <image:caption>${this.escapeXml(article.metaDescription)}</image:caption>
        </image:image>`;
        }
        
        // Add news markup for recent articles (last 2 days)
        if (article) {
            const publishedAt = new Date(article.metadata.publishedAt || article.metadata.createdAt);
            const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
            
            if (publishedAt > twoDaysAgo) {
                xml += `
        <news:news>
            <news:publication>
                <news:name>Smart Finance Hub</news:name>
                <news:language>en</news:language>
            </news:publication>
            <news:publication_date>${publishedAt.toISOString()}</news:publication_date>
            <news:title>${this.escapeXml(article.title)}</news:title>
            <news:keywords>${this.extractKeywords(article).join(', ')}</news:keywords>
        </news:news>`;
            }
        }
        
        xml += `
    </url>`;
        
        return xml;
    }

    /**
     * Extract keywords from article for news sitemap
     */
    extractKeywords(article) {
        if (article.metadata?.targetKeywords) {
            return [...article.metadata.targetKeywords.primary, ...article.metadata.targetKeywords.longTail]
                .slice(0, 10); // Limit to 10 keywords
        }
        
        // Fallback to category and basic keywords
        const categoryKeywords = {
            'banking': ['banking', 'savings', 'accounts'],
            'investing': ['investing', 'stocks', 'portfolio'],
            'credit': ['credit', 'credit score', 'credit cards'],
            'debt': ['debt', 'debt management', 'debt consolidation'],
            'retirement': ['retirement', 'retirement planning', '401k'],
            'taxes': ['taxes', 'tax planning', 'tax optimization'],
            'insurance': ['insurance', 'life insurance', 'health insurance'],
            'budgeting': ['budgeting', 'personal finance', 'money management']
        };
        
        return categoryKeywords[article.category] || ['personal finance', 'money management'];
    }

    /**
     * Commit updated sitemap to GitHub
     */
    async commitSitemapToGitHub(sitemapXML) {
        try {
            const filePath = 'sitemap.xml';
            let sha;
            
            // Check if sitemap already exists
            try {
                const existingFile = await this.octokit.rest.repos.getContent({
                    owner: this.repoOwner,
                    repo: this.repoName,
                    path: filePath
                });
                sha = existingFile.data.sha;
            } catch (error) {
                if (error.status !== 404) {
                    throw error;
                }
                // File doesn't exist, which is fine
            }
            
            // Create or update sitemap
            const result = await this.octokit.rest.repos.createOrUpdateFileContents({
                owner: this.repoOwner,
                repo: this.repoName,
                path: filePath,
                message: `Update sitemap.xml - ${new Date().toISOString().split('T')[0]}`,
                content: Buffer.from(sitemapXML).toString('base64'),
                sha
            });
            
            console.log(`✅ Sitemap committed to GitHub: ${result.data.commit.sha.substring(0, 7)}`);
            
            return result;
            
        } catch (error) {
            console.error('❌ GitHub commit failed:', error);
            throw new Error(`Failed to commit sitemap: ${error.message}`);
        }
    }

    /**
     * Ping search engines about sitemap update
     */
    async pingSearchEngines() {
        const sitemapUrl = `${this.baseUrl}/sitemap.xml`;
        const results = [];
        
        console.log(`🔔 Pinging search engines about sitemap update...`);
        
        for (const pingUrl of this.googlePingUrls) {
            try {
                const fullPingUrl = pingUrl + encodeURIComponent(sitemapUrl);
                const response = await axios.get(fullPingUrl, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Smart Finance Hub Sitemap Updater 1.0'
                    }
                });
                
                const searchEngine = pingUrl.includes('google') ? 'Google' : 'Bing';
                
                if (response.status === 200) {
                    console.log(`✅ Successfully pinged ${searchEngine}`);
                    results.push({ searchEngine, success: true });
                } else {
                    console.log(`⚠️ ${searchEngine} responded with status: ${response.status}`);
                    results.push({ searchEngine, success: false, status: response.status });
                }
                
            } catch (error) {
                const searchEngine = pingUrl.includes('google') ? 'Google' : 'Bing';
                console.warn(`⚠️ Failed to ping ${searchEngine}:`, error.message);
                results.push({ searchEngine, success: false, error: error.message });
            }
        }
        
        return results;
    }

    /**
     * Generate robots.txt content that references sitemap
     */
    generateRobotsTxt() {
        return `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${this.baseUrl}/sitemap.xml

# Crawl-delay for respectful crawling
Crawl-delay: 1

# Block sensitive areas
Disallow: /automation/
Disallow: /content/
Disallow: /.git/
Disallow: /node_modules/
Disallow: /functions/

# Allow important pages
Allow: /articles/
Allow: /assets/
Allow: /affiliate-disclosure.html`;
    }

    /**
     * Update robots.txt file
     */
    async updateRobotsTxt() {
        try {
            const robotsContent = this.generateRobotsTxt();
            const filePath = 'robots.txt';
            let sha;
            
            // Check if robots.txt already exists
            try {
                const existingFile = await this.octokit.rest.repos.getContent({
                    owner: this.repoOwner,
                    repo: this.repoName,
                    path: filePath
                });
                sha = existingFile.data.sha;
            } catch (error) {
                if (error.status !== 404) {
                    throw error;
                }
            }
            
            // Create or update robots.txt
            await this.octokit.rest.repos.createOrUpdateFileContents({
                owner: this.repoOwner,
                repo: this.repoName,
                path: filePath,
                message: 'Update robots.txt with sitemap reference',
                content: Buffer.from(robotsContent).toString('base64'),
                sha
            });
            
            console.log('✅ Updated robots.txt');
            
        } catch (error) {
            console.error('❌ Failed to update robots.txt:', error);
            throw error;
        }
    }

    /**
     * Validate sitemap XML against schema
     */
    async validateSitemap(sitemapXML) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            stats: {}
        };
        
        try {
            // Basic XML structure validation
            if (!sitemapXML.includes('<?xml version="1.0"')) {
                validation.errors.push('Missing XML declaration');
                validation.isValid = false;
            }
            
            if (!sitemapXML.includes('<urlset')) {
                validation.errors.push('Missing urlset element');
                validation.isValid = false;
            }
            
            // Count URLs
            const urlMatches = sitemapXML.match(/<url>/g) || [];
            validation.stats.totalUrls = urlMatches.length;
            
            // Check for required elements in each URL
            const locMatches = sitemapXML.match(/<loc>/g) || [];
            if (locMatches.length !== urlMatches.length) {
                validation.errors.push('Some URLs missing <loc> elements');
                validation.isValid = false;
            }
            
            // Size validation (Google recommends < 50MB uncompressed)
            const sizeInMB = sitemapXML.length / (1024 * 1024);
            validation.stats.sizeInMB = sizeInMB;
            
            if (sizeInMB > 50) {
                validation.warnings.push(`Sitemap size (${sizeInMB.toFixed(2)}MB) exceeds recommended 50MB`);
            }
            
            // URL count validation (Google limit: 50,000 URLs)
            if (urlMatches.length > 50000) {
                validation.warnings.push(`URL count (${urlMatches.length}) exceeds Google limit of 50,000`);
            }
            
            console.log(`📊 Sitemap validation: ${validation.stats.totalUrls} URLs, ${sizeInMB.toFixed(2)}MB`);
            
        } catch (error) {
            validation.errors.push(`Validation error: ${error.message}`);
            validation.isValid = false;
        }
        
        return validation;
    }

    /**
     * Generate sitemap index for multiple sitemaps
     */
    generateSitemapIndex(sitemaps) {
        const currentDate = new Date().toISOString().split('T')[0];
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
        
        sitemaps.forEach(sitemap => {
            xml += `
    <sitemap>
        <loc>${this.baseUrl}/${sitemap.filename}</loc>
        <lastmod>${sitemap.lastmod || currentDate}</lastmod>
    </sitemap>`;
        });
        
        xml += '\n</sitemapindex>';
        
        return xml;
    }

    /**
     * Utility methods
     */
    escapeXml(text) {
        if (typeof text !== 'string') return text;
        
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    calculateTotalUrls(articles) {
        return this.staticPages.length + this.categoryPages.length + articles.length;
    }

    /**
     * Get sitemap statistics
     */
    async getSitemapStats() {
        try {
            const articles = await this.readPublishedArticles();
            const totalUrls = this.calculateTotalUrls(articles);
            
            // Category breakdown
            const categoryStats = {};
            articles.forEach(article => {
                const category = article.category || 'uncategorized';
                categoryStats[category] = (categoryStats[category] || 0) + 1;
            });
            
            // Date breakdown
            const dateStats = {};
            articles.forEach(article => {
                const publishDate = new Date(article.metadata.publishedAt || article.metadata.createdAt);
                const monthKey = `${publishDate.getFullYear()}-${String(publishDate.getMonth() + 1).padStart(2, '0')}`;
                dateStats[monthKey] = (dateStats[monthKey] || 0) + 1;
            });
            
            return {
                totalArticles: articles.length,
                totalUrls,
                categoryBreakdown: categoryStats,
                monthlyBreakdown: dateStats,
                lastUpdated: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Error generating sitemap stats:', error);
            throw error;
        }
    }
}

module.exports = SitemapUpdater;

// CLI usage
if (require.main === module) {
    const updater = new SitemapUpdater();
    
    const command = process.argv[2];
    const options = {};
    
    // Parse command line arguments
    process.argv.slice(3).forEach(arg => {
        if (arg === '--dry-run') options.dryRun = true;
        if (arg === '--no-ping') options.pingSearchEngines = false;
        if (arg.startsWith('--output=')) options.outputPath = arg.split('=')[1];
    });
    
    switch (command) {
        case 'update':
            updater.updateSitemap(options)
                .then(result => {
                    console.log('✅ Sitemap update completed:', result);
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Sitemap update failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'stats':
            updater.getSitemapStats()
                .then(stats => {
                    console.log('📊 Sitemap Statistics:');
                    console.log(JSON.stringify(stats, null, 2));
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Failed to get stats:', error);
                    process.exit(1);
                });
            break;
            
        case 'robots':
            updater.updateRobotsTxt()
                .then(() => {
                    console.log('✅ robots.txt updated successfully');
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Failed to update robots.txt:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log('Usage: node sitemap-updater.js <command> [options]');
            console.log('Commands:');
            console.log('  update    - Update sitemap with latest articles');
            console.log('  stats     - Show sitemap statistics');
            console.log('  robots    - Update robots.txt file');
            console.log('Options:');
            console.log('  --dry-run     - Generate sitemap without committing');
            console.log('  --no-ping     - Skip search engine pings');
            console.log('  --output=file - Save sitemap to file (dry-run mode)');
            process.exit(1);
    }
}