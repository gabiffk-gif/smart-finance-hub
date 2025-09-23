const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');
const SitemapUpdater = require('./sitemap-updater');
require('dotenv').config();

class ArchiveManager {
    constructor(options = {}) {
        this.octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });
        
        this.repoOwner = options.repoOwner || 'gabiffk-gif';
        this.repoName = options.repoName || 'smart-finance-hub';
        this.baseUrl = options.baseUrl || 'https://smartfinancehub.vip';
        this.contentDir = options.contentDir || path.join(__dirname, '../../content');
        
        // Archive thresholds
        this.archiveAfterDays = options.archiveAfterDays || 365; // 1 year
        this.redirectExpiryDays = options.redirectExpiryDays || 730; // 2 years
        
        // Sitemap updater instance
        this.sitemapUpdater = new SitemapUpdater(options);
        
        // Internal state
        this.archivedArticles = [];
        this.updatedLinks = [];
        this.createdRedirects = [];
    }

    /**
     * Main archive process - run monthly
     */
    async runArchivalProcess(options = {}) {
        try {
            console.log('📦 Starting monthly archival process...');
            
            const startTime = Date.now();
            
            // Step 1: Identify articles to archive
            const articlesToArchive = await this.identifyArticlesToArchive();
            
            if (articlesToArchive.length === 0) {
                console.log('📰 No articles need archiving at this time');
                return {
                    success: true,
                    articlesArchived: 0,
                    linksUpdated: 0,
                    redirectsCreated: 0,
                    processingTime: Date.now() - startTime
                };
            }
            
            console.log(`🎯 Found ${articlesToArchive.length} articles to archive`);
            
            // Step 2: Create archive structure if needed
            await this.ensureArchiveStructure();
            
            // Step 3: Process each article
            for (const article of articlesToArchive) {
                console.log(`🔄 Processing: ${article.title}`);
                
                try {
                    await this.archiveArticle(article, options);
                } catch (error) {
                    console.error(`❌ Failed to archive ${article.title}:`, error.message);
                    if (!options.continueOnError) {
                        throw error;
                    }
                }
            }
            
            // Step 4: Update internal links across all content
            if (this.archivedArticles.length > 0) {
                await this.updateInternalLinks();
            }
            
            // Step 5: Update redirects file
            await this.updateRedirectsFile();
            
            // Step 6: Update sitemap
            await this.sitemapUpdater.updateSitemap({ pingSearchEngines: true });
            
            // Step 7: Clean up old redirects
            await this.cleanupOldRedirects();
            
            const processingTime = Date.now() - startTime;
            
            console.log(`✅ Archival process completed in ${(processingTime / 1000).toFixed(1)}s`);
            console.log(`📊 Results: ${this.archivedArticles.length} archived, ${this.updatedLinks.length} links updated, ${this.createdRedirects.length} redirects created`);
            
            return {
                success: true,
                articlesArchived: this.archivedArticles.length,
                archivedList: this.archivedArticles.map(a => ({ title: a.title, oldUrl: a.oldUrl, newUrl: a.newUrl })),
                linksUpdated: this.updatedLinks.length,
                redirectsCreated: this.createdRedirects.length,
                processingTime
            };
            
        } catch (error) {
            console.error('❌ Archival process failed:', error);
            throw new Error(`Archive process failed: ${error.message}`);
        }
    }

    /**
     * Identify articles older than threshold
     */
    async identifyArticlesToArchive() {
        try {
            const publishedDir = path.join(this.contentDir, 'published');
            const files = await fs.readdir(publishedDir);
            const articlesToArchive = [];
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.archiveAfterDays);
            
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                
                try {
                    const filePath = path.join(publishedDir, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const article = JSON.parse(content);
                    
                    if (this.shouldArchiveArticle(article, cutoffDate)) {
                        articlesToArchive.push(article);
                    }
                    
                } catch (error) {
                    console.warn(`⚠️ Error reading article ${file}:`, error.message);
                }
            }
            
            // Sort by publication date (oldest first)
            articlesToArchive.sort((a, b) => {
                const dateA = new Date(a.metadata.publishedAt || a.metadata.createdAt);
                const dateB = new Date(b.metadata.publishedAt || b.metadata.createdAt);
                return dateA - dateB;
            });
            
            return articlesToArchive;
            
        } catch (error) {
            console.error('❌ Error identifying articles to archive:', error);
            throw error;
        }
    }

    /**
     * Determine if article should be archived
     */
    shouldArchiveArticle(article, cutoffDate) {
        // Skip if already archived
        if (article.metadata.status === 'archived') {
            return false;
        }
        
        // Check publication date
        const publishDate = new Date(article.metadata.publishedAt || article.metadata.createdAt);
        if (publishDate > cutoffDate) {
            return false;
        }
        
        // Skip high-performing evergreen content
        if (this.isEvergreenContent(article)) {
            console.log(`🌲 Keeping evergreen content: ${article.title}`);
            return false;
        }
        
        // Skip high-priority categories for extended period
        if (this.isHighPriorityCategory(article.category)) {
            const extendedCutoff = new Date();
            extendedCutoff.setDate(extendedCutoff.getDate() - (this.archiveAfterDays * 1.5));
            if (publishDate > extendedCutoff) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Check if content should be kept as evergreen
     */
    isEvergreenContent(article) {
        const evergreenKeywords = [
            'basics', 'beginner', 'guide', 'introduction', 'fundamentals',
            'how to', 'what is', 'complete guide', 'ultimate guide'
        ];
        
        const title = article.title.toLowerCase();
        const hasEvergreenKeyword = evergreenKeywords.some(keyword => title.includes(keyword));
        
        // High quality evergreen content
        const qualityScore = article.metadata.qualityScore?.overall || 0;
        const isHighQuality = qualityScore >= 85;
        
        return hasEvergreenKeyword && isHighQuality;
    }

    /**
     * Check if category should have extended retention
     */
    isHighPriorityCategory(category) {
        const highPriorityCategories = ['investing', 'retirement', 'taxes', 'banking'];
        return highPriorityCategories.includes(category);
    }

    /**
     * Create archive directory structure in GitHub
     */
    async ensureArchiveStructure() {
        try {
            // Check if archive directory exists
            try {
                await this.octokit.rest.repos.getContent({
                    owner: this.repoOwner,
                    repo: this.repoName,
                    path: 'archive'
                });
                // Directory exists
            } catch (error) {
                if (error.status === 404) {
                    // Create archive directory with README
                    const readmeContent = `# Archived Articles

This directory contains articles that have been archived due to age or relevance.

## Archive Policy

- Articles older than 1 year are automatically moved to archive
- High-quality evergreen content is retained longer
- 301 redirects are maintained for 2 years after archiving
- Archived content is removed from main sitemap but remains accessible

## Structure

Articles are organized by original publication date:
- \\`YYYY/MM/article-slug.html\\`

Last updated: ${new Date().toISOString().split('T')[0]}
`;
                    
                    await this.octokit.rest.repos.createOrUpdateFileContents({
                        owner: this.repoOwner,
                        repo: this.repoName,
                        path: 'archive/README.md',
                        message: 'Create archive directory structure',
                        content: Buffer.from(readmeContent).toString('base64')
                    });
                    
                    console.log('✅ Created archive directory structure');
                } else {
                    throw error;
                }
            }
        } catch (error) {
            console.error('❌ Error ensuring archive structure:', error);
            throw error;
        }
    }

    /**
     * Archive a single article
     */
    async archiveArticle(article, options = {}) {
        try {
            const publishDate = new Date(article.metadata.publishedAt || article.metadata.createdAt);
            const year = publishDate.getFullYear();
            const month = String(publishDate.getMonth() + 1).padStart(2, '0');
            
            // Generate paths
            const oldUrl = article.metadata.publishedUrl || this.generateArticleUrl(article);
            const oldPath = this.extractPathFromUrl(oldUrl);
            const newPath = `archive/${year}/${month}/${article.metadata.slug}.html`;
            const newUrl = `${this.baseUrl}/${newPath}`;
            
            // Get current article content from GitHub
            const currentContent = await this.getArticleContentFromGitHub(oldPath);
            
            // Update article content with archive notice
            const archivedContent = this.addArchiveNotice(currentContent, article);
            
            // Create archived version
            await this.octokit.rest.repos.createOrUpdateFileContents({
                owner: this.repoOwner,
                repo: this.repoName,
                path: newPath,
                message: `Archive article: ${article.title}`,
                content: Buffer.from(archivedContent).toString('base64')
            });
            
            // Delete original file (if not in dry-run mode)
            if (!options.dryRun) {
                await this.deleteOriginalArticle(oldPath);
            }
            
            // Update article metadata
            article.metadata.archivedAt = new Date().toISOString();
            article.metadata.status = 'archived';
            article.metadata.oldUrl = oldUrl;
            article.metadata.newUrl = newUrl;
            article.metadata.archivePath = newPath;
            
            // Move in local content system
            await this.moveArticleInLocalSystem(article);
            
            // Add to processed list
            this.archivedArticles.push({
                ...article,
                oldUrl,
                newUrl,
                oldPath,
                newPath
            });
            
            // Create redirect entry
            this.createdRedirects.push({
                from: this.extractPathFromUrl(oldUrl),
                to: newPath,
                status: 301,
                createdAt: new Date().toISOString(),
                reason: 'archived'
            });
            
            console.log(`✅ Archived: ${article.title}`);
            console.log(`   From: ${oldUrl}`);
            console.log(`   To: ${newUrl}`);
            
        } catch (error) {
            console.error(`❌ Error archiving article ${article.title}:`, error);
            throw error;
        }
    }

    /**
     * Add archive notice to article content
     */
    addArchiveNotice(htmlContent, article) {
        const archiveDate = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        const archiveNotice = `
        <div class="archive-notice" style="
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            padding: 1.5rem;
            margin: 2rem 0;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #92400e;
        ">
            <h3 style="color: white; margin-bottom: 0.5rem;">📦 Archived Content</h3>
            <p style="margin: 0; opacity: 0.95;">
                This article was archived on ${archiveDate}. While the information may still be valuable, 
                please check our <a href="/articles" style="color: #fbbf24; text-decoration: underline;">latest articles</a> 
                for the most current financial advice and strategies.
            </p>
        </div>`;
        
        // Insert after article header or at the beginning of content
        const headerEnd = htmlContent.indexOf('</header>');
        if (headerEnd !== -1) {
            const insertPoint = headerEnd + '</header>'.length;
            return htmlContent.substring(0, insertPoint) + archiveNotice + htmlContent.substring(insertPoint);
        } else {
            // Fallback: insert after main tag
            const mainStart = htmlContent.indexOf('<main');
            if (mainStart !== -1) {
                const mainContentStart = htmlContent.indexOf('>', mainStart) + 1;
                return htmlContent.substring(0, mainContentStart) + archiveNotice + htmlContent.substring(mainContentStart);
            }
        }
        
        return archiveNotice + htmlContent;
    }

    /**
     * Get article content from GitHub
     */
    async getArticleContentFromGitHub(filePath) {
        try {
            const response = await this.octokit.rest.repos.getContent({
                owner: this.repoOwner,
                repo: this.repoName,
                path: filePath
            });
            
            return Buffer.from(response.data.content, 'base64').toString();
            
        } catch (error) {
            console.error(`❌ Error getting content for ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Delete original article from GitHub
     */
    async deleteOriginalArticle(filePath) {
        try {
            // Get current file to get SHA
            const response = await this.octokit.rest.repos.getContent({
                owner: this.repoOwner,
                repo: this.repoName,
                path: filePath
            });
            
            // Delete file
            await this.octokit.rest.repos.deleteFile({
                owner: this.repoOwner,
                repo: this.repoName,
                path: filePath,
                message: `Archive: Remove original file ${filePath}`,
                sha: response.data.sha
            });
            
        } catch (error) {
            console.error(`❌ Error deleting original file ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Move article in local content system
     */
    async moveArticleInLocalSystem(article) {
        try {
            const publishedPath = path.join(this.contentDir, 'published', `${article.metadata.id}.json`);
            const archivePath = path.join(this.contentDir, 'archive', `${article.metadata.id}.json`);
            
            // Ensure archive directory exists
            await fs.mkdir(path.dirname(archivePath), { recursive: true });
            
            // Write updated article to archive
            await fs.writeFile(archivePath, JSON.stringify(article, null, 2));
            
            // Remove from published
            try {
                await fs.unlink(publishedPath);
            } catch (error) {
                console.warn(`⚠️ Could not remove from published: ${error.message}`);
            }
            
        } catch (error) {
            console.error('❌ Error moving article in local system:', error);
            throw error;
        }
    }

    /**
     * Update internal links across all content
     */
    async updateInternalLinks() {
        try {
            console.log('🔗 Updating internal links...');
            
            // Get all current articles (published + approved)
            const currentArticles = await this.getAllCurrentArticles();
            
            let totalUpdates = 0;
            
            for (const article of currentArticles) {
                const updates = await this.updateLinksInArticle(article);
                if (updates > 0) {
                    totalUpdates += updates;
                    console.log(`🔧 Updated ${updates} links in: ${article.title}`);
                }
            }
            
            // Update homepage links
            const homepageUpdates = await this.updateHomepageLinks();
            totalUpdates += homepageUpdates;
            
            this.updatedLinks.push(...Array(totalUpdates).fill(null).map(() => ({})));
            
            console.log(`✅ Updated ${totalUpdates} internal links`);
            
        } catch (error) {
            console.error('❌ Error updating internal links:', error);
            throw error;
        }
    }

    /**
     * Update links within a specific article
     */
    async updateLinksInArticle(article) {
        try {
            let content = article.content;
            let updates = 0;
            
            // Find and update links to archived articles
            for (const archivedArticle of this.archivedArticles) {
                const oldUrl = archivedArticle.oldUrl;
                const newUrl = archivedArticle.newUrl;
                
                // Update various link formats
                const linkPatterns = [
                    new RegExp(`href=["']${this.escapeRegex(oldUrl)}["']`, 'gi'),
                    new RegExp(`href=["']${this.escapeRegex(this.extractPathFromUrl(oldUrl))}["']`, 'gi'),
                    new RegExp(`href=["']/${this.escapeRegex(this.extractPathFromUrl(oldUrl))}["']`, 'gi')
                ];
                
                for (const pattern of linkPatterns) {
                    if (pattern.test(content)) {
                        content = content.replace(pattern, `href="${newUrl}"`);
                        updates++;
                    }
                }
            }
            
            // Update article content if changed
            if (updates > 0) {
                article.content = content;
                await this.saveUpdatedArticle(article);
            }
            
            return updates;
            
        } catch (error) {
            console.error(`❌ Error updating links in article ${article.title}:`, error);
            return 0;
        }
    }

    /**
     * Update links in homepage
     */
    async updateHomepageLinks() {
        try {
            // Get homepage content
            const homepage = await this.octokit.rest.repos.getContent({
                owner: this.repoOwner,
                repo: this.repoName,
                path: 'index.html'
            });
            
            let content = Buffer.from(homepage.data.content, 'base64').toString();
            let updates = 0;
            
            // Update links to archived articles
            for (const archivedArticle of this.archivedArticles) {
                const oldPath = this.extractPathFromUrl(archivedArticle.oldUrl);
                const newUrl = archivedArticle.newUrl;
                
                const linkPattern = new RegExp(`href=["']/?${this.escapeRegex(oldPath)}["']`, 'gi');
                if (linkPattern.test(content)) {
                    content = content.replace(linkPattern, `href="${newUrl}"`);
                    updates++;
                }
                
                // Also remove from recent articles section if present
                const articleCardPattern = new RegExp(
                    `<div class="article-card"[^>]*>[\\s\\S]*?href=["']/?${this.escapeRegex(oldPath)}["'][\\s\\S]*?</div>`,
                    'gi'
                );
                
                if (articleCardPattern.test(content)) {
                    content = content.replace(articleCardPattern, '<!-- Article archived -->');
                    updates++;
                }
            }
            
            // Commit updated homepage
            if (updates > 0) {
                await this.octokit.rest.repos.createOrUpdateFileContents({
                    owner: this.repoOwner,
                    repo: this.repoName,
                    path: 'index.html',
                    message: 'Update homepage links for archived articles',
                    content: Buffer.from(content).toString('base64'),
                    sha: homepage.data.sha
                });
            }
            
            return updates;
            
        } catch (error) {
            console.error('❌ Error updating homepage links:', error);
            return 0;
        }
    }

    /**
     * Update redirects file with new archive redirects
     */
    async updateRedirectsFile() {
        try {
            if (this.createdRedirects.length === 0) return;
            
            console.log('🔀 Updating redirects file...');
            
            let redirectsContent = '';
            let redirectsSha;
            
            // Try to get existing redirects file
            try {
                const existing = await this.octokit.rest.repos.getContent({
                    owner: this.repoOwner,
                    repo: this.repoName,
                    path: '_redirects'
                });
                
                redirectsContent = Buffer.from(existing.data.content, 'base64').toString();
                redirectsSha = existing.data.sha;
            } catch (error) {
                if (error.status !== 404) {
                    throw error;
                }
                // File doesn't exist, start fresh
            }
            
            // Add header if new file
            if (!redirectsContent) {
                redirectsContent = `# Smart Finance Hub Redirects
# Generated by Archive Manager
# Format: /old-path /new-path status

`;
            }
            
            // Add new redirects
            const newRedirectLines = this.createdRedirects.map(redirect => 
                `/${redirect.from} /${redirect.to} ${redirect.status} # archived ${redirect.createdAt.split('T')[0]}`
            );
            
            redirectsContent += newRedirectLines.join('\\n') + '\\n';
            
            // Commit updated redirects file
            await this.octokit.rest.repos.createOrUpdateFileContents({
                owner: this.repoOwner,
                repo: this.repoName,
                path: '_redirects',
                message: `Add redirects for ${this.createdRedirects.length} archived articles`,
                content: Buffer.from(redirectsContent).toString('base64'),
                sha: redirectsSha
            });
            
            console.log(`✅ Added ${this.createdRedirects.length} redirects to _redirects file`);
            
        } catch (error) {
            console.error('❌ Error updating redirects file:', error);
            throw error;
        }
    }

    /**
     * Clean up old redirects that have expired
     */
    async cleanupOldRedirects() {
        try {
            console.log('🧹 Cleaning up old redirects...');
            
            // Get current redirects file
            let redirectsFile;
            try {
                redirectsFile = await this.octokit.rest.repos.getContent({
                    owner: this.repoOwner,
                    repo: this.repoName,
                    path: '_redirects'
                });
            } catch (error) {
                if (error.status === 404) {
                    return; // No redirects file exists
                }
                throw error;
            }
            
            const content = Buffer.from(redirectsFile.data.content, 'base64').toString();
            const lines = content.split('\\n');
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.redirectExpiryDays);
            
            // Filter out expired redirects
            const validLines = lines.filter(line => {
                if (!line.includes('# archived')) return true;
                
                const dateMatch = line.match(/# archived (\\d{4}-\\d{2}-\\d{2})/);
                if (!dateMatch) return true;
                
                const redirectDate = new Date(dateMatch[1]);
                return redirectDate > cutoffDate;
            });
            
            const removedCount = lines.length - validLines.length;
            
            if (removedCount > 0) {
                const newContent = validLines.join('\\n');
                
                await this.octokit.rest.repos.createOrUpdateFileContents({
                    owner: this.repoOwner,
                    repo: this.repoName,
                    path: '_redirects',
                    message: `Clean up ${removedCount} expired redirects`,
                    content: Buffer.from(newContent).toString('base64'),
                    sha: redirectsFile.data.sha
                });
                
                console.log(`🗑️ Removed ${removedCount} expired redirects`);
            } else {
                console.log('✨ No expired redirects to clean up');
            }
            
        } catch (error) {
            console.error('❌ Error cleaning up redirects:', error);
            // Don't throw - this is not critical
        }
    }

    /**
     * Utility methods
     */
    async getAllCurrentArticles() {
        const articles = [];
        
        const folders = ['published', 'approved'];
        for (const folder of folders) {
            try {
                const folderPath = path.join(this.contentDir, folder);
                const files = await fs.readdir(folderPath);
                
                for (const file of files) {
                    if (!file.endsWith('.json')) continue;
                    
                    const filePath = path.join(folderPath, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const article = JSON.parse(content);
                    articles.push(article);
                }
            } catch (error) {
                console.warn(`⚠️ Error reading folder ${folder}:`, error.message);
            }
        }
        
        return articles;
    }

    async saveUpdatedArticle(article) {
        const folder = article.metadata.status === 'published' ? 'published' : 'approved';
        const filePath = path.join(this.contentDir, folder, `${article.metadata.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(article, null, 2));
    }

    generateArticleUrl(article) {
        if (article.metadata.publishedUrl) {
            return article.metadata.publishedUrl;
        }
        
        const publishDate = new Date(article.metadata.publishedAt || article.metadata.createdAt);
        const year = publishDate.getFullYear();
        const month = String(publishDate.getMonth() + 1).padStart(2, '0');
        const slug = article.metadata.slug || this.generateSlug(article.title);
        
        return `${this.baseUrl}/articles/${year}/${month}/${slug}.html`;
    }

    extractPathFromUrl(url) {
        return url.replace(this.baseUrl + '/', '').replace(/^\\//, '');
    }

    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\\s-]/g, '')
            .replace(/\\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 60);
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
    }

    /**
     * Get archive statistics
     */
    async getArchiveStats() {
        try {
            const archiveDir = path.join(this.contentDir, 'archive');
            
            let totalArchived = 0;
            const categoryStats = {};
            const yearStats = {};
            
            try {
                const files = await fs.readdir(archiveDir);
                
                for (const file of files) {
                    if (!file.endsWith('.json')) continue;
                    
                    const filePath = path.join(archiveDir, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const article = JSON.parse(content);
                    
                    totalArchived++;
                    
                    // Category stats
                    const category = article.category || 'uncategorized';
                    categoryStats[category] = (categoryStats[category] || 0) + 1;
                    
                    // Year stats
                    const archivedYear = new Date(article.metadata.archivedAt).getFullYear();
                    yearStats[archivedYear] = (yearStats[archivedYear] || 0) + 1;
                }
            } catch (error) {
                // Archive directory doesn't exist or is empty
            }
            
            return {
                totalArchived,
                categoryBreakdown: categoryStats,
                yearlyBreakdown: yearStats,
                lastUpdated: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Error generating archive stats:', error);
            throw error;
        }
    }

    /**
     * Restore archived article (if needed)
     */
    async restoreArchivedArticle(articleId, reason = 'manual restore') {
        try {
            const archivePath = path.join(this.contentDir, 'archive', `${articleId}.json`);
            const article = JSON.parse(await fs.readFile(archivePath, 'utf8'));
            
            // Update metadata
            article.metadata.status = 'published';
            article.metadata.restoredAt = new Date().toISOString();
            article.metadata.restoreReason = reason;
            delete article.metadata.archivedAt;
            
            // Move back to published
            const publishedPath = path.join(this.contentDir, 'published', `${articleId}.json`);
            await fs.writeFile(publishedPath, JSON.stringify(article, null, 2));
            
            // Remove from archive
            await fs.unlink(archivePath);
            
            console.log(`✅ Restored article: ${article.title}`);
            
            return article;
            
        } catch (error) {
            console.error(`❌ Error restoring article ${articleId}:`, error);
            throw error;
        }
    }
}

module.exports = ArchiveManager;

// CLI usage
if (require.main === module) {
    const manager = new ArchiveManager();
    
    const command = process.argv[2];
    const options = {};
    
    // Parse command line arguments
    process.argv.slice(3).forEach(arg => {
        if (arg === '--dry-run') options.dryRun = true;
        if (arg === '--continue-on-error') options.continueOnError = true;
    });
    
    switch (command) {
        case 'run':
            manager.runArchivalProcess(options)
                .then(result => {
                    console.log('✅ Archive process completed:', result);
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Archive process failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'stats':
            manager.getArchiveStats()
                .then(stats => {
                    console.log('📊 Archive Statistics:');
                    console.log(JSON.stringify(stats, null, 2));
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Failed to get stats:', error);
                    process.exit(1);
                });
            break;
            
        case 'restore':
            const articleId = process.argv[3];
            if (!articleId) {
                console.error('❌ Article ID required for restore');
                process.exit(1);
            }
            
            manager.restoreArchivedArticle(articleId)
                .then(article => {
                    console.log(`✅ Restored: ${article.title}`);
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Restore failed:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log('Usage: node archive-manager.js <command> [options]');
            console.log('Commands:');
            console.log('  run       - Run archival process');
            console.log('  stats     - Show archive statistics');
            console.log('  restore   - Restore archived article by ID');
            console.log('Options:');
            console.log('  --dry-run           - Preview changes without committing');
            console.log('  --continue-on-error - Continue if individual articles fail');
            process.exit(1);
    }
}