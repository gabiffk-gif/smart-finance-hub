const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

// Import our automation modules
const ContentGenerator = require('../content-generator/generator');
const SEOOptimizer = require('../content-generator/seo-optimizer');
const { checkArticleAccuracy } = require('../content-generator/fact-checker');
const PublisherIntegration = require('./publisher-integration');

class ReviewConsoleServer {
    constructor() {
        this.app = express();
        this.port = process.env.REVIEW_PORT || 3000;
        this.contentDir = path.join(__dirname, '../../content');
        this.publicDir = path.join(__dirname, '../../public');

        // Initialize publisher integration
        this.publisherIntegration = new PublisherIntegration();

        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
        this.setupDirectories();
        
        // Initialize modules
        this.generator = new ContentGenerator();
        this.seoOptimizer = new SEOOptimizer();
    }

    setupMiddleware() {
        // Enhanced CORS configuration
        this.app.use(cors({
            origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));

        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        
        // Serve static dashboard files from review-console directory
        this.app.use(express.static(__dirname));
        
        // Enhanced request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            console.log(`  Headers:`, JSON.stringify(req.headers, null, 2));
            if (req.body && Object.keys(req.body).length > 0) {
                console.log(`  Body:`, JSON.stringify(req.body, null, 2));
            }
            next();
        });

        // Global error handler
        this.app.use((err, req, res, next) => {
            console.error('Global error handler caught:', err);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: err.message,
                timestamp: new Date().toISOString()
            });
        });
    }

    async setupDirectories() {
        console.log('🗂️  Setting up content directories...');
        console.log(`Content base directory: ${this.contentDir}`);
        
        const dirs = [
            path.join(this.contentDir, 'drafts'),
            path.join(this.contentDir, 'approved'),
            path.join(this.contentDir, 'published'),
            path.join(this.contentDir, 'rejected'),
            path.join(this.contentDir, 'archive'),
            path.join(this.contentDir, 'social-queue')
        ];
        
        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
                console.log(`✅ Directory ready: ${dir}`);
                
                // Check permissions
                await fs.access(dir, fs.constants.R_OK | fs.constants.W_OK);
                console.log(`✅ Directory permissions OK: ${dir}`);
                
            } catch (error) {
                console.error(`❌ Error with directory ${dir}:`, error);
                console.error(`  Error code: ${error.code}`);
                console.error(`  Error path: ${error.path}`);
            }
        }
        
        console.log('✅ Directory setup completed');
    }

    setupRoutes() {
        // Dashboard route
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'dashboard.html'));
        });

        // Article management endpoints
        this.app.get('/api/articles/drafts', this.getDrafts.bind(this));
        this.app.get('/api/articles/approved', this.getApproved.bind(this));
        this.app.get('/api/articles/published', this.getPublished.bind(this));
        this.app.get('/api/articles/rejected', this.getRejected.bind(this));
        this.app.get('/api/articles/:id', this.getArticle.bind(this));
        
        // Article workflow endpoints
        this.app.post('/api/articles/:id/approve', this.approveArticle.bind(this));
        this.app.post('/api/articles/:id/reject', this.rejectArticle.bind(this));
        this.app.put('/api/articles/:id', this.updateArticle.bind(this));
        this.app.post('/api/articles/:id/schedule', this.scheduleArticle.bind(this));
        this.app.delete('/api/articles/:id', this.deleteArticle.bind(this));
        
        // Content generation
        this.app.post('/api/generate', this.generateArticles.bind(this));
        
        // Analytics and monitoring
        this.app.get('/api/analytics', this.getAnalytics.bind(this));
        this.app.get('/api/schedule', this.getSchedule.bind(this));
        this.app.get('/api/stats', this.getStats.bind(this));
        
        // SEO and fact-checking
        this.app.post('/api/articles/:id/seo-check', this.runSEOCheck.bind(this));
        this.app.post('/api/articles/:id/fact-check', this.runFactCheck.bind(this));
        this.app.post('/api/articles/:id/publish', this.publishArticle.bind(this));
        this.app.post('/api/publish/all-approved', this.publishAllApproved.bind(this));
        this.app.post('/api/publish/enhanced', this.publishEnhanced.bind(this));
        this.app.post('/api/publish/quick', this.publishQuick.bind(this));
        this.app.post('/api/process-pending-approvals', this.processPendingApprovals.bind(this));
        
        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });
    }

    setupErrorHandling() {
        // 404 handler for unmatched routes
        this.app.use('*', (req, res) => {
            console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
            res.status(404).json({ 
                error: 'Route not found',
                method: req.method,
                path: req.originalUrl,
                timestamp: new Date().toISOString()
            });
        });

        // Global error handler (must be last middleware)
        this.app.use((err, req, res, next) => {
            console.error('💥 Server error:', err);
            console.error('📍 Request details:', {
                method: req.method,
                url: req.originalUrl,
                headers: req.headers,
                body: req.body
            });
            console.error('🔥 Stack trace:', err.stack);
            
            // Don't leak error details in production
            const isDevelopment = process.env.NODE_ENV !== 'production';
            
            res.status(err.status || 500).json({
                error: err.message || 'Internal Server Error',
                ...(isDevelopment && { 
                    stack: err.stack,
                    details: err.details || 'No additional details available'
                }),
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown'
            });
        });
    }

    // Article listing endpoints
    async getDrafts(req, res) {
        try {
            const draftsPath = path.join(this.contentDir, 'drafts');
            
            // Check if directory exists
            const fsSync = require('fs');
            if (!fsSync.existsSync(draftsPath)) {
                await fs.mkdir(draftsPath, { recursive: true });
                return res.json([]);
            }
            
            const files = await fs.readdir(draftsPath);
            const drafts = [];
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(draftsPath, file);
                        const content = await fs.readFile(filePath, 'utf-8');
                        const article = JSON.parse(content);

                        // Check for article validity - support both direct id and metadata.id
                        if (article && (article.id || (article.metadata && article.metadata.id))) {
                            // Ensure the article has a top-level id for API consistency
                            if (!article.id && article.metadata && article.metadata.id) {
                                article.id = article.metadata.id;
                            }

                            // Add quality score at top level for sorting
                            if (!article.qualityScore && article.metadata && article.metadata.qualityScore) {
                                article.qualityScore = article.metadata.qualityScore.overall;
                            }

                            drafts.push(article);
                        }
                    } catch (err) {
                        console.log('Skipping invalid file:', file);
                    }
                }
            }
            
            drafts.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
            res.json({
                articles: drafts.slice(0, 20),
                count: drafts.length,
                total: drafts.length
            });
        } catch (error) {
            console.error('Error in getDrafts:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getDraftsOld(req, res) {
        try {
            const draftsPath = path.join(this.contentDir, 'drafts');

            // Check if directory exists
            try {
                await fs.access(draftsPath);
                console.log('✅ Drafts directory exists');
            } catch (dirError) {
                console.error('❌ Drafts directory does not exist:', dirError);
                // Try to create it
                await fs.mkdir(draftsPath, { recursive: true });
                console.log('✅ Drafts directory created');
            }
            
            const articles = await this.getArticlesFromFolder('drafts');
            console.log(`📊 Found ${articles.length} draft articles`);
            
            if (articles.length > 0) {
                console.log('📝 Draft articles:');
                articles.forEach((article, index) => {
                    console.log(`  ${index + 1}. ${article.title || article.metadata?.id || 'Unknown'}`);
                });
            }
            
            const sortedArticles = articles.sort((a, b) => {
                const dateA = new Date(a.metadata?.createdAt || 0);
                const dateB = new Date(b.metadata?.createdAt || 0);
                return dateB - dateA;
            });
            
            console.log('✅ getDrafts completed successfully');
            
            res.json({
                success: true,
                count: articles.length,
                articles: sortedArticles,
                debug: {
                    path: draftsPath,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('❌ getDrafts error:', error);
            console.error('  Error stack:', error.stack);
            res.status(500).json({ 
                success: false, 
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
        }
    }

    async getApproved(req, res) {
        console.log('📥 getApproved endpoint called');
        
        try {
            const articles = await this.getArticlesFromFolder('approved');
            console.log(`📊 Found ${articles.length} approved articles`);
            
            const sortedArticles = articles.sort((a, b) => {
                const dateA = new Date(a.metadata?.approvedAt || 0);
                const dateB = new Date(b.metadata?.approvedAt || 0);
                return dateB - dateA;
            });
            
            res.json({
                success: true,
                count: articles.length,
                articles: sortedArticles,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ getApproved error:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async getPublished(req, res) {
        try {
            const articles = await this.getArticlesFromFolder('published');
            res.json({
                success: true,
                count: articles.length,
                articles: articles.sort((a, b) => new Date(b.metadata.publishedAt) - new Date(a.metadata.publishedAt))
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getRejected(req, res) {
        try {
            const articles = await this.getArticlesFromFolder('rejected');
            res.json({
                success: true,
                count: articles.length,
                articles: articles.sort((a, b) => new Date(b.metadata.rejectedAt) - new Date(a.metadata.rejectedAt))
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getArticle(req, res) {
        try {
            const { id } = req.params;
            const article = await this.findArticleById(id);
            
            if (!article) {
                return res.status(404).json({ success: false, error: 'Article not found' });
            }
            
            res.json({ success: true, article });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Article workflow endpoints
    async approveArticle(req, res) {
        try {
            const { id } = req.params;
            const { reviewer, notes } = req.body;

            console.log(`📝 Approving article: ${id}`);

            const article = await this.findArticleById(id);
            if (!article) {
                return res.status(404).json({ success: false, error: 'Article not found' });
            }

            // Update article metadata with full publish data
            if (!article.metadata) article.metadata = {};

            // Preserve original creation date
            const originalDate = article.metadata.originalCreatedAt ||
                               article.metadata.createdAt ||
                               new Date().toISOString();

            article.metadata.originalCreatedAt = originalDate;
            article.metadata.status = 'approved';
            article.metadata.approvedAt = new Date().toISOString();
            article.metadata.approvedBy = reviewer || 'system';
            article.metadata.reviewNotes = notes || '';

            // Add publishedDate metadata for immediate publishing
            article.metadata.publishedAt = new Date().toISOString();

            // Ensure slug and URL for publishing
            if (!article.slug && article.title) {
                article.slug = this.generateSlug(article.title);
            }

            if (!article.url && article.slug) {
                const date = new Date(originalDate);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                article.url = `/articles/${year}/${month}/${article.slug}`;
            }

            // Move from drafts → published (skip approved folder for immediate publishing)
            await this.moveArticle(id, 'drafts', 'published', article);

            console.log('📤 Article approved and moved to published - triggering complete fix...');

            try {
                // Trigger newest-first publisher to update homepage
                const { execSync } = require('child_process');
                const publisherPath = path.join(__dirname, '../publisher/publish-newest-first.js');
                execSync(`node "${publisherPath}"`, {
                    cwd: path.join(__dirname, '../..'),
                    stdio: 'inherit'
                });

                console.log('✅ Homepage updated with newest-first ordering');

                res.json({
                    success: true,
                    message: 'Article approved and published successfully',
                    article: {
                        id: id,
                        title: article.title,
                        status: 'published',
                        publishedAt: article.metadata.publishedAt,
                        url: article.url
                    },
                    homepageUpdated: true
                });

            } catch (publishError) {
                console.error('❌ Homepage update failed:', publishError);
                res.json({
                    success: true,
                    message: 'Article approved and published, but homepage update failed',
                    article: {
                        id: id,
                        title: article.title,
                        status: 'published',
                        publishedAt: article.metadata.publishedAt
                    },
                    warning: 'Homepage will be updated on next automated run'
                });
            }

        } catch (error) {
            console.error('❌ Approval failed:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 50)
            .replace(/^-|-$/g, '');
    }

    async rejectArticle(req, res) {
        try {
            const { id } = req.params;
            const { reviewer, reason, notes } = req.body;
            
            const article = await this.findArticleById(id);
            if (!article) {
                return res.status(404).json({ success: false, error: 'Article not found' });
            }
            
            // Update article metadata
            article.metadata.status = 'rejected';
            article.metadata.rejectedAt = new Date().toISOString();
            article.metadata.rejectedBy = reviewer || 'system';
            article.metadata.rejectionReason = reason || 'Quality concerns';
            article.metadata.reviewNotes = notes || '';
            
            // Move from drafts to rejected
            await this.moveArticle(id, 'drafts', 'rejected', article);
            
            res.json({ 
                success: true, 
                message: 'Article rejected',
                article: article.metadata
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async updateArticle(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;
            
            const article = await this.findArticleById(id);
            if (!article) {
                return res.status(404).json({ success: false, error: 'Article not found' });
            }
            
            // Update article content
            if (updates.title) article.title = updates.title;
            if (updates.content) article.content = updates.content;
            if (updates.metaDescription) article.metaDescription = updates.metaDescription;
            if (updates.cta) article.cta = updates.cta;
            
            // Update metadata
            article.metadata.updatedAt = new Date().toISOString();
            article.metadata.updatedBy = updates.updatedBy || 'system';
            
            // Recalculate quality score if content changed
            if (updates.content) {
                const ContentGenerator = require('../content-generator/generator');
                const generator = new ContentGenerator();
                article.metadata.qualityScore = generator.scoreQuality(article);
            }
            
            // Save updated article
            const currentFolder = await this.findArticleFolder(id);
            await this.saveArticle(currentFolder, article);
            
            res.json({ 
                success: true, 
                message: 'Article updated successfully',
                article
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async scheduleArticle(req, res) {
        try {
            const { id } = req.params;
            const { publishDate, platforms } = req.body;
            
            const article = await this.findArticleById(id);
            if (!article) {
                return res.status(404).json({ success: false, error: 'Article not found' });
            }
            
            // Validate article is approved
            if (article.metadata.status !== 'approved') {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Article must be approved before scheduling' 
                });
            }
            
            // Update scheduling metadata
            article.metadata.scheduledFor = publishDate;
            article.metadata.publishPlatforms = platforms || ['website'];
            article.metadata.status = 'scheduled';
            article.metadata.scheduledAt = new Date().toISOString();
            
            // Save updated article
            const currentFolder = await this.findArticleFolder(id);
            await this.saveArticle(currentFolder, article);
            
            res.json({ 
                success: true, 
                message: 'Article scheduled for publication',
                scheduledFor: publishDate,
                article: article.metadata
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async deleteArticle(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            
            const folder = await this.findArticleFolder(id);
            if (!folder) {
                return res.status(404).json({ success: false, error: 'Article not found' });
            }
            
            // Move to archive instead of permanent deletion
            const article = await this.findArticleById(id);
            article.metadata.archivedAt = new Date().toISOString();
            article.metadata.archiveReason = reason || 'Manual deletion';
            
            await this.moveArticle(id, folder, 'archive', article);
            
            res.json({ 
                success: true, 
                message: 'Article archived successfully'
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Content generation
    async generateArticles(req, res) {
        try {
            const { count = 1, topicIds = [] } = req.body;
            
            console.log(`Generating ${count} articles...`);
            
            const articles = await this.generator.generateArticles(count);
            
            res.json({
                success: true,
                message: `Generated ${articles.length} articles`,
                articles: articles.map(a => ({
                    id: a.metadata.id,
                    title: a.title,
                    qualityScore: a.metadata.qualityScore.overall,
                    status: a.metadata.status,
                    wordCount: a.metadata.wordCount
                }))
            });
        } catch (error) {
            console.error('Generation error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Analytics and monitoring
    async getAnalytics(req, res) {
        console.log('📈 getAnalytics endpoint called');
        
        try {
            const analytics = await this.calculateAnalytics();
            console.log('📊 Analytics calculated successfully');
            console.log('📋 Analytics summary:', {
                totalArticles: analytics.totalArticles,
                drafts: analytics.drafts,
                approved: analytics.approved,
                published: analytics.published,
                rejected: analytics.rejected
            });
            
            res.json({ 
                success: true, 
                analytics,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ getAnalytics error:', error);
            console.error('  Error stack:', error.stack);
            res.status(500).json({ 
                success: false, 
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async getSchedule(req, res) {
        try {
            const schedule = await this.getPublishingSchedule();
            res.json({ success: true, schedule });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getStats(req, res) {
        try {
            const stats = await this.getSystemStats();
            res.json({ success: true, stats });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // SEO and fact-checking endpoints
    async runSEOCheck(req, res) {
        try {
            const { id } = req.params;
            const article = await this.findArticleById(id);
            
            if (!article) {
                return res.status(404).json({ success: false, error: 'Article not found' });
            }
            
            const seoAnalysis = {
                schema: this.seoOptimizer.generateSchemaMarkup(article),
                internalLinks: this.seoOptimizer.findInternalLinkingOpportunities(article),
                metaValidation: this.seoOptimizer.validateMetaTags(article),
                keywordDensity: this.seoOptimizer.checkKeywordDensity(article),
                relatedArticles: this.seoOptimizer.suggestRelatedArticles(article),
                imageAlts: this.seoOptimizer.generateImageAltTexts(article)
            };
            
            res.json({ success: true, seoAnalysis });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async runFactCheck(req, res) {
        try {
            const { id } = req.params;
            const article = await this.findArticleById(id);

            if (!article) {
                return res.status(404).json({ success: false, error: 'Article not found' });
            }

            const factCheck = checkArticleAccuracy(article);

            res.json({ success: true, factCheck });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Publishing endpoints
    async publishArticle(req, res) {
        try {
            const { id } = req.params;
            console.log(`🚀 Publishing article: ${id}`);

            const result = await this.publisherIntegration.publishSingleArticle(id);

            res.json({
                success: true,
                message: `Article "${result.article}" published successfully`,
                result: result
            });
        } catch (error) {
            console.error('❌ Failed to publish article:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async publishAllApproved(req, res) {
        try {
            console.log('🚀 Publishing all approved articles...');

            const result = await this.publisherIntegration.publishApprovedArticles();

            res.json({
                success: true,
                message: `Published ${result.published} articles successfully (${result.failed} failed)`,
                result: result
            });
        } catch (error) {
            console.error('❌ Failed to publish approved articles:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async publishEnhanced(req, res) {
        try {
            console.log('🚀 Starting enhanced publishing process...');

            const EnhancedPublisher = require('./enhanced-publisher');
            const publisher = new EnhancedPublisher();

            const stats = await publisher.getPublishingStats();
            console.log(`📊 Pre-publish stats:`, stats);

            const result = await publisher.publishApprovedArticles();
            const finalStats = await publisher.getPublishingStats();

            res.json({
                success: result.success,
                message: result.message,
                movedCount: result.movedCount,
                publishedCount: result.publishedCount,
                stats: {
                    before: stats,
                    after: finalStats
                },
                homepageUpdated: true,
                deployed: result.success,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Enhanced publishing failed:', error);
            res.status(500).json({
                success: false,
                message: 'Enhanced publishing failed: ' + error.message,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async publishQuick(req, res) {
        try {
            console.log('⚡ Starting quick publishing process...');

            const EnhancedPublisher = require('./enhanced-publisher');
            const publisher = new EnhancedPublisher();

            const result = await publisher.quickPublish();

            res.json({
                success: result.success,
                message: result.message,
                movedCount: result.movedCount,
                homepageUpdated: true,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Quick publishing failed:', error);
            res.status(500).json({
                success: false,
                message: 'Quick publishing failed: ' + error.message,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Utility methods
    async getArticlesFromFolder(folderName) {
        console.log(`📂 getArticlesFromFolder called for: ${folderName}`);
        
        try {
            const folderPath = path.join(this.contentDir, folderName);
            console.log(`📁 Full folder path: ${folderPath}`);
            
            // Check if folder exists
            try {
                await fs.access(folderPath);
                console.log(`✅ Folder exists: ${folderPath}`);
            } catch (accessError) {
                console.error(`❌ Folder does not exist: ${folderPath}`, accessError);
                return [];
            }
            
            const files = await fs.readdir(folderPath);
            console.log(`📄 Files found in ${folderName}: ${files.length}`);
            console.log(`📋 File list:`, files);
            
            const articles = [];
            let successCount = 0;
            let errorCount = 0;
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(folderPath, file);
                        console.log(`📖 Reading file: ${filePath}`);
                        
                        const content = await fs.readFile(filePath, 'utf8');
                        console.log(`📝 File content length: ${content.length} characters`);
                        
                        const article = JSON.parse(content);
                        console.log(`✅ Successfully parsed article from ${file}`);
                        console.log(`  Article title: ${article.title || 'No title'}`);
                        console.log(`  Article ID: ${article.metadata?.id || 'No ID'}`);
                        
                        articles.push(article);
                        successCount++;
                        
                    } catch (error) {
                        console.error(`❌ Error reading article ${file}:`, error);
                        console.error(`  Error type: ${error.constructor.name}`);
                        console.error(`  Error message: ${error.message}`);
                        errorCount++;
                    }
                } else {
                    console.log(`⏭️  Skipping non-JSON file: ${file}`);
                }
            }
            
            console.log(`📊 Summary for ${folderName}:`);
            console.log(`  Total files: ${files.length}`);
            console.log(`  JSON files processed: ${successCount + errorCount}`);
            console.log(`  Successfully loaded: ${successCount}`);
            console.log(`  Errors: ${errorCount}`);
            console.log(`  Articles returned: ${articles.length}`);
            
            return articles;
            
        } catch (error) {
            console.error(`❌ Error reading folder ${folderName}:`, error);
            console.error(`  Error type: ${error.constructor.name}`);
            console.error(`  Error code: ${error.code}`);
            console.error(`  Error path: ${error.path}`);
            console.error(`  Full error:`, error);
            return [];
        }
    }

    async findArticleById(id) {
        const folders = ['drafts', 'approved', 'published', 'rejected', 'archive'];

        for (const folder of folders) {
            try {
                const folderPath = path.join(this.contentDir, folder);
                const files = await fs.readdir(folderPath);

                for (const file of files) {
                    if (file.endsWith('.json')) {
                        try {
                            const filePath = path.join(folderPath, file);
                            const content = await fs.readFile(filePath, 'utf8');
                            const article = JSON.parse(content);

                            // Check if this article matches the ID
                            const articleId = article.id || article.metadata?.id;
                            if (articleId === id) {
                                return article;
                            }
                        } catch (parseError) {
                            // Skip invalid JSON files
                            continue;
                        }
                    }
                }
            } catch (error) {
                // Folder doesn't exist or can't be read, continue
                continue;
            }
        }

        return null;
    }

    async findArticleFolder(id) {
        const folders = ['drafts', 'approved', 'published', 'rejected', 'archive'];

        for (const folder of folders) {
            const filename = await this.findArticleFilename(id, folder);
            if (filename) {
                return folder;
            }
        }

        return null;
    }

    async findArticleFilename(id, folder) {
        const folderPath = path.join(this.contentDir, folder);
        try {
            const files = await fs.readdir(folderPath);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(folderPath, file);
                        const content = await fs.readFile(filePath, 'utf8');
                        const article = JSON.parse(content);
                        const articleId = article.id || article.metadata?.id;
                        if (articleId === id) {
                            return file;
                        }
                    } catch (parseError) {
                        continue;
                    }
                }
            }
        } catch (error) {
            console.error(`Error searching for article ${id} in ${folder}:`, error);
        }
        return null;
    }

    async moveArticle(id, fromFolder, toFolder, article) {
        // Find the actual filename in the source folder
        const actualFilename = await this.findArticleFilename(id, fromFolder);
        if (!actualFilename) {
            throw new Error(`Article ${id} not found in ${fromFolder} folder`);
        }

        const fromPath = path.join(this.contentDir, fromFolder, actualFilename);
        const toPath = path.join(this.contentDir, toFolder, `${id}.json`);

        // Save to new location with clean filename
        await fs.writeFile(toPath, JSON.stringify(article, null, 2));

        // Remove from old location
        await fs.unlink(fromPath);

        console.log(`Moved article ${id} from ${fromFolder}/${actualFilename} to ${toFolder}/${id}.json`);
    }

    async saveArticle(folder, article) {
        const filePath = path.join(this.contentDir, folder, `${article.metadata.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(article, null, 2));
    }

    async calculateAnalytics() {
        const drafts = await this.getArticlesFromFolder('drafts');
        const approved = await this.getArticlesFromFolder('approved');
        const published = await this.getArticlesFromFolder('published');
        const rejected = await this.getArticlesFromFolder('rejected');
        
        const totalArticles = drafts.length + approved.length + published.length + rejected.length;
        
        // Quality score analysis
        const allArticles = [...drafts, ...approved, ...published];
        const avgQualityScore = allArticles.length > 0 
            ? allArticles.reduce((sum, a) => sum + (a.metadata.qualityScore?.overall || 0), 0) / allArticles.length
            : 0;
        
        // Approval rate
        const approvalRate = totalArticles > 0 
            ? ((approved.length + published.length) / totalArticles) * 100
            : 0;
        
        return {
            totalArticles,
            breakdown: {
                drafts: drafts.length,
                approved: approved.length,
                published: published.length,
                rejected: rejected.length
            },
            averageQualityScore: Math.round(avgQualityScore),
            approvalRate: Math.round(approvalRate),
            generatedToday: this.getGeneratedToday(drafts),
            publishedThisWeek: this.getPublishedThisWeek(published)
        };
    }

    async getPublishingSchedule() {
        const approved = await this.getArticlesFromFolder('approved');
        const scheduled = approved.filter(a => a.metadata.scheduledFor);
        
        return scheduled
            .sort((a, b) => new Date(a.metadata.scheduledFor) - new Date(b.metadata.scheduledFor))
            .map(article => ({
                id: article.metadata.id,
                title: article.title,
                scheduledFor: article.metadata.scheduledFor,
                platforms: article.metadata.publishPlatforms || ['website'],
                status: article.metadata.status
            }));
    }

    async getSystemStats() {
        const analytics = await this.calculateAnalytics();
        
        return {
            ...analytics,
            systemHealth: {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                timestamp: new Date().toISOString()
            }
        };
    }

    getGeneratedToday(drafts) {
        const today = new Date().toDateString();
        return drafts.filter(a => 
            new Date(a.metadata.createdAt).toDateString() === today
        ).length;
    }

    getPublishedThisWeek(published) {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        return published.filter(a => 
            new Date(a.metadata.publishedAt) > oneWeekAgo
        ).length;
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🚀 Review Console Server running on http://localhost:${this.port}`);
            console.log(`📊 Dashboard: http://localhost:${this.port}`);
            console.log(`🔍 API Health: http://localhost:${this.port}/api/health`);
        });

    async processPendingApprovals(req, res) {
        try {
            console.log('🚀 Processing all pending approved articles...');

            const EnhancedPublisher = require('./enhanced-publisher');
            const publisher = new EnhancedPublisher();

            const stats = await publisher.getPublishingStats();
            console.log('📊 Pre-processing stats:', stats);

            if (stats.approved > 0) {
                const result = await publisher.publishApprovedArticles();
                const finalStats = await publisher.getPublishingStats();

                res.json({
                    success: result.success,
                    message: `Processed ${result.movedCount} approved articles`,
                    stats: { before: stats, after: finalStats },
                    result: result
                });
            } else {
                res.json({
                    success: true,
                    message: 'No approved articles to process',
                    stats: stats
                });
            }
        } catch (error) {
            console.error('❌ Batch processing failed:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    }
}

// Start server if run directly
if (require.main === module) {
    const server = new ReviewConsoleServer();
    server.start();
}

module.exports = ReviewConsoleServer;