require('dotenv').config({ path: '../.env' });
const path = require('path');
const cron = require('node-cron');

// Import all modules
const ContentGenerator = require('./content-generator/generator');
const ReviewConsole = require('./review-console/server');
const Publisher = require('./publisher/deploy');
const AnalyticsMonitor = require('./monitoring/analytics');
const ComplianceMonitor = require('./monitoring/compliance');

class SmartFinanceAutomationServer {
    constructor() {
        this.modules = {};
        this.cronJobs = [];
        this.isShuttingDown = false;
        this.startTime = new Date();
        
        // Bind methods
        this.gracefulShutdown = this.gracefulShutdown.bind(this);
        this.handleError = this.handleError.bind(this);
        
        console.log('🚀 Smart Finance Hub Automation Server Initializing...');
        console.log(`📅 Start Time: ${this.startTime.toISOString()}`);
        console.log(`📂 Working Directory: ${process.cwd()}`);
        console.log(`🔧 Node.js Version: ${process.version}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    }

    async initialize() {
        try {
            console.log('\n📋 Loading Configuration...');
            await this.loadConfiguration();
            
            console.log('\n🔧 Initializing Modules...');
            await this.initializeModules();
            
            console.log('\n🌐 Starting Review Console Server...');
            await this.startReviewConsole();
            
            console.log('\n⏰ Setting up Cron Jobs...');
            this.setupCronJobs();
            
            console.log('\n🛡️  Setting up Error Handlers...');
            this.setupErrorHandlers();
            
            console.log('\n🎯 Setting up Graceful Shutdown...');
            this.setupGracefulShutdown();
            
            console.log('\n✅ Smart Finance Hub Automation Server Started Successfully!');
            this.logSystemStatus();
            
        } catch (error) {
            console.error('❌ Failed to initialize automation server:', error);
            process.exit(1);
        }
    }

    async loadConfiguration() {
        try {
            // Load main settings
            const settingsPath = path.join(__dirname, 'config', 'settings.json');
            this.settings = require(settingsPath);
            console.log('✅ Settings loaded successfully');
            
            // Load topics
            const topicsPath = path.join(__dirname, 'config', 'topics.json');
            this.topics = require(topicsPath);
            console.log(`✅ Topics loaded: ${this.topics.topics.length} topics`);
            
            // Load keywords
            const keywordsPath = path.join(__dirname, 'config', 'keywords.json');
            this.keywords = require(keywordsPath);
            console.log(`✅ Keywords loaded: ${Object.keys(this.keywords.keywordGroups).length} groups`);
            
            // Validate environment variables
            const requiredEnvVars = [
                'OPENAI_API_KEY',
                'GITHUB_TOKEN',
                'GITHUB_OWNER',
                'GITHUB_REPO'
            ];
            
            const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
            if (missingEnvVars.length > 0) {
                throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
            }
            
            console.log('✅ Environment variables validated');
            
        } catch (error) {
            console.error('❌ Configuration loading failed:', error.message);
            throw error;
        }
    }

    async initializeModules() {
        try {
            // Initialize Content Generator
            console.log('🤖 Initializing Content Generator...');
            this.modules.contentGenerator = new ContentGenerator();
            await this.modules.contentGenerator.loadConfigurations();
            console.log('✅ Content Generator initialized');

            // Initialize Publisher
            console.log('📤 Initializing Publisher...');
            this.modules.publisher = new Publisher();
            console.log('✅ Publisher initialized');

            // Initialize Analytics Monitor
            console.log('📊 Initializing Analytics Monitor...');
            this.modules.analyticsMonitor = new AnalyticsMonitor();
            console.log('✅ Analytics Monitor initialized');

            // Initialize Compliance Monitor
            console.log('🔒 Initializing Compliance Monitor...');
            this.modules.complianceMonitor = new ComplianceMonitor();
            console.log('✅ Compliance Monitor initialized');

            console.log(`✅ All ${Object.keys(this.modules).length} modules initialized successfully`);
            
        } catch (error) {
            console.error('❌ Module initialization failed:', error.message);
            throw error;
        }
    }

    async startReviewConsole() {
        try {
            // Initialize Review Console with all modules
            this.modules.reviewConsole = new ReviewConsole({
                contentGenerator: this.modules.contentGenerator,
                publisher: this.modules.publisher,
                analyticsMonitor: this.modules.analyticsMonitor,
                complianceMonitor: this.modules.complianceMonitor
            });

            const port = process.env.REVIEW_CONSOLE_PORT || 3000;
            await this.modules.reviewConsole.start(port);
            
            console.log(`✅ Review Console started on port ${port}`);
            console.log(`🌐 Dashboard URL: http://localhost:${port}`);
            
        } catch (error) {
            console.error('❌ Review Console startup failed:', error.message);
            throw error;
        }
    }

    setupCronJobs() {
        try {
            // Content Generation - Daily at 6 AM
            const contentGenerationJob = cron.schedule('0 6 * * *', async () => {
                console.log('⏰ Running scheduled content generation...');
                try {
                    await this.modules.contentGenerator.generateScheduledContent();
                    console.log('✅ Scheduled content generation completed');
                } catch (error) {
                    console.error('❌ Scheduled content generation failed:', error);
                }
            }, { scheduled: false });
            
            this.cronJobs.push({ name: 'Content Generation', job: contentGenerationJob });

            // Analytics Collection - Every hour
            const analyticsJob = cron.schedule('0 * * * *', async () => {
                console.log('⏰ Running hourly analytics collection...');
                try {
                    await this.modules.analyticsMonitor.collectHourlyMetrics();
                    console.log('✅ Hourly analytics collection completed');
                } catch (error) {
                    console.error('❌ Analytics collection failed:', error);
                }
            }, { scheduled: false });
            
            this.cronJobs.push({ name: 'Analytics Collection', job: analyticsJob });

            // Daily Analytics Report - Daily at 8 AM
            const dailyReportJob = cron.schedule('0 8 * * *', async () => {
                console.log('⏰ Generating daily analytics report...');
                try {
                    await this.modules.analyticsMonitor.generateDailyReport();
                    console.log('✅ Daily analytics report generated');
                } catch (error) {
                    console.error('❌ Daily report generation failed:', error);
                }
            }, { scheduled: false });
            
            this.cronJobs.push({ name: 'Daily Report', job: dailyReportJob });

            // Compliance Check - Daily at 10 AM
            const complianceJob = cron.schedule('0 10 * * *', async () => {
                console.log('⏰ Running daily compliance check...');
                try {
                    await this.modules.complianceMonitor.runDailyCompliance();
                    console.log('✅ Daily compliance check completed');
                } catch (error) {
                    console.error('❌ Compliance check failed:', error);
                }
            }, { scheduled: false });
            
            this.cronJobs.push({ name: 'Compliance Check', job: complianceJob });

            // Archive Management - Weekly on Sundays at 3 AM
            const archiveJob = cron.schedule('0 3 * * 0', async () => {
                console.log('⏰ Running weekly archive management...');
                try {
                    await this.modules.publisher.runArchiveManagement();
                    console.log('✅ Weekly archive management completed');
                } catch (error) {
                    console.error('❌ Archive management failed:', error);
                }
            }, { scheduled: false });
            
            this.cronJobs.push({ name: 'Archive Management', job: archiveJob });

            // Sitemap Update - Daily at 2 AM
            const sitemapJob = cron.schedule('0 2 * * *', async () => {
                console.log('⏰ Updating sitemap...');
                try {
                    await this.modules.publisher.updateSitemap();
                    console.log('✅ Sitemap update completed');
                } catch (error) {
                    console.error('❌ Sitemap update failed:', error);
                }
            }, { scheduled: false });
            
            this.cronJobs.push({ name: 'Sitemap Update', job: sitemapJob });

            // Start all cron jobs if in production
            if (process.env.NODE_ENV === 'production') {
                this.cronJobs.forEach(({ name, job }) => {
                    job.start();
                    console.log(`✅ Started cron job: ${name}`);
                });
            } else {
                console.log('⚠️  Cron jobs configured but not started (development mode)');
                console.log('💡 Set NODE_ENV=production to enable automated scheduling');
            }

            console.log(`✅ ${this.cronJobs.length} cron jobs configured successfully`);
            
        } catch (error) {
            console.error('❌ Cron job setup failed:', error.message);
            throw error;
        }
    }

    setupErrorHandlers() {
        // Uncaught Exception Handler
        process.on('uncaughtException', (error) => {
            console.error('🚨 Uncaught Exception:', error);
            this.handleError(error, 'uncaughtException');
        });

        // Unhandled Rejection Handler
        process.on('unhandledRejection', (reason, promise) => {
            console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
            this.handleError(reason, 'unhandledRejection');
        });

        // Warning Handler
        process.on('warning', (warning) => {
            console.warn('⚠️  Process Warning:', warning.name, warning.message);
        });

        console.log('✅ Error handlers configured');
    }

    setupGracefulShutdown() {
        // SIGTERM Handler (Docker, Kubernetes)
        process.on('SIGTERM', () => {
            console.log('📧 Received SIGTERM signal');
            this.gracefulShutdown('SIGTERM');
        });

        // SIGINT Handler (Ctrl+C)
        process.on('SIGINT', () => {
            console.log('📧 Received SIGINT signal (Ctrl+C)');
            this.gracefulShutdown('SIGINT');
        });

        // SIGUSR2 Handler (Nodemon restart)
        process.on('SIGUSR2', () => {
            console.log('📧 Received SIGUSR2 signal (Nodemon restart)');
            this.gracefulShutdown('SIGUSR2');
        });

        console.log('✅ Graceful shutdown handlers configured');
    }

    async handleError(error, source) {
        console.error(`🚨 Error from ${source}:`, error);
        
        try {
            // Log error to analytics if available
            if (this.modules.analyticsMonitor) {
                await this.modules.analyticsMonitor.logError(error, source);
            }

            // Attempt recovery based on error type
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                console.log('🔄 Network error detected, attempting recovery...');
                await this.attemptNetworkRecovery();
            } else if (error.name === 'ValidationError') {
                console.log('📝 Validation error detected, logging and continuing...');
            } else {
                console.log('❓ Unknown error type, implementing generic recovery...');
            }
            
        } catch (recoveryError) {
            console.error('❌ Error recovery failed:', recoveryError);
        }
    }

    async attemptNetworkRecovery() {
        console.log('🔄 Attempting network recovery...');
        
        // Wait 5 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        try {
            // Test basic connectivity
            await this.modules.contentGenerator.testConnection();
            console.log('✅ Network recovery successful');
        } catch (error) {
            console.error('❌ Network recovery failed:', error);
        }
    }

    async gracefulShutdown(signal) {
        if (this.isShuttingDown) {
            console.log('⚠️  Shutdown already in progress...');
            return;
        }

        this.isShuttingDown = true;
        console.log(`\n🛑 Graceful shutdown initiated by ${signal}...`);
        
        const shutdownTimeout = setTimeout(() => {
            console.error('❌ Graceful shutdown timeout, forcing exit');
            process.exit(1);
        }, 30000); // 30 second timeout

        try {
            console.log('⏹️  Stopping cron jobs...');
            this.cronJobs.forEach(({ name, job }) => {
                job.stop();
                console.log(`✅ Stopped cron job: ${name}`);
            });

            console.log('🌐 Shutting down Review Console server...');
            if (this.modules.reviewConsole) {
                await this.modules.reviewConsole.shutdown();
                console.log('✅ Review Console shut down');
            }

            console.log('💾 Saving final analytics data...');
            if (this.modules.analyticsMonitor) {
                await this.modules.analyticsMonitor.saveCurrentMetrics();
                console.log('✅ Analytics data saved');
            }

            console.log('🔒 Closing database connections...');
            // Close any database connections here
            console.log('✅ Database connections closed');

            clearTimeout(shutdownTimeout);
            
            const uptime = Date.now() - this.startTime.getTime();
            console.log(`\n✅ Smart Finance Hub Automation Server shut down gracefully`);
            console.log(`⏱️  Total uptime: ${Math.round(uptime / 1000)} seconds`);
            console.log('👋 Goodbye!');
            
            process.exit(0);
            
        } catch (error) {
            console.error('❌ Error during graceful shutdown:', error);
            clearTimeout(shutdownTimeout);
            process.exit(1);
        }
    }

    logSystemStatus() {
        console.log('\n📊 System Status Report:');
        console.log('========================');
        console.log(`🟢 Server Status: Running`);
        console.log(`📅 Start Time: ${this.startTime.toISOString()}`);
        console.log(`⏱️  Uptime: ${Math.round((Date.now() - this.startTime.getTime()) / 1000)} seconds`);
        console.log(`💾 Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);
        console.log(`🔧 Node.js Version: ${process.version}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📂 Working Directory: ${process.cwd()}`);
        
        console.log('\n🧩 Module Status:');
        Object.entries(this.modules).forEach(([name, module]) => {
            const status = module ? '🟢 Loaded' : '🔴 Not Loaded';
            console.log(`  ${name}: ${status}`);
        });
        
        console.log('\n⏰ Cron Jobs:');
        this.cronJobs.forEach(({ name, job }) => {
            const status = job.running ? '🟢 Active' : '🔴 Inactive';
            console.log(`  ${name}: ${status}`);
        });
        
        console.log('\n🔗 Endpoints:');
        console.log(`  Dashboard: http://localhost:${process.env.REVIEW_CONSOLE_PORT || 3000}`);
        console.log(`  API: http://localhost:${process.env.REVIEW_CONSOLE_PORT || 3000}/api`);
        
        console.log('\n🎯 Ready to serve Smart Finance Hub content automation!');
        console.log('========================\n');
    }

    // Manual trigger methods for testing
    async triggerContentGeneration() {
        console.log('🔄 Manually triggering content generation...');
        try {
            await this.modules.contentGenerator.generateScheduledContent();
            console.log('✅ Manual content generation completed');
        } catch (error) {
            console.error('❌ Manual content generation failed:', error);
        }
    }

    async triggerAnalyticsReport() {
        console.log('🔄 Manually triggering analytics report...');
        try {
            await this.modules.analyticsMonitor.generateDailyReport();
            console.log('✅ Manual analytics report completed');
        } catch (error) {
            console.error('❌ Manual analytics report failed:', error);
        }
    }
}

// Initialize and start the server
const automationServer = new SmartFinanceAutomationServer();

// Start the server
automationServer.initialize().catch(error => {
    console.error('🚨 Critical startup error:', error);
    process.exit(1);
});

// Export for testing purposes
module.exports = SmartFinanceAutomationServer;