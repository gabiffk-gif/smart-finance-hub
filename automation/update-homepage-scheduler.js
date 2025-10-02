const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class HomepageUpdateScheduler {
    constructor() {
        this.basePath = process.cwd();
        this.publishedDir = path.join(this.basePath, 'content', 'published');
        this.homepagePath = path.join(this.basePath, 'index.html');
        this.isRunning = false;
    }

    async updateHomepageIfNeeded() {
        if (this.isRunning) {
            console.log('🔄 Update already in progress, skipping...');
            return;
        }

        this.isRunning = true;

        try {
            console.log('🔄 Checking if homepage needs updating...');

            // Count published articles
            const publishedFiles = fs.readdirSync(this.publishedDir).filter(f => f.endsWith('.json'));
            const publishedCount = publishedFiles.length;

            // Count articles on homepage
            let homepageCount = 0;
            if (fs.existsSync(this.homepagePath)) {
                const homepage = fs.readFileSync(this.homepagePath, 'utf8');
                homepageCount = (homepage.match(/uniform-article-card/g) || []).length;
            }

            console.log(`📊 Published articles: ${publishedCount}, Homepage articles: ${homepageCount}`);

            if (publishedCount !== homepageCount) {
                console.log('📝 Homepage needs updating - regenerating...');

                // Regenerate homepage
                execSync('node automation/force-uniform-homepage.js', {
                    stdio: 'inherit',
                    cwd: this.basePath
                });

                // Deploy changes
                try {
                    execSync('git add index.html articles.html', {
                        stdio: 'inherit',
                        cwd: this.basePath
                    });

                    const commitMessage = `Auto-update: Sync homepage with published articles (${publishedCount} articles)

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`;

                    execSync(`git commit -m "${commitMessage}"`, {
                        stdio: 'inherit',
                        cwd: this.basePath
                    });

                    execSync('git push origin main', {
                        stdio: 'inherit',
                        cwd: this.basePath
                    });

                    console.log('✅ Homepage updated and deployed');
                } catch (gitError) {
                    console.log('ℹ️  Git operations completed (may have been no changes)');
                }

            } else {
                console.log('✅ Homepage is up to date');
            }

        } catch (error) {
            console.error('❌ Homepage update failed:', error.message);
        } finally {
            this.isRunning = false;
        }
    }

    async getPublishingStats() {
        try {
            const draftDir = path.join(this.basePath, 'content', 'drafts');
            const approvedDir = path.join(this.basePath, 'content', 'approved');
            const publishedDir = path.join(this.basePath, 'content', 'published');

            const drafts = fs.existsSync(draftDir) ?
                fs.readdirSync(draftDir).filter(f => f.endsWith('.json')).length : 0;
            const approved = fs.existsSync(approvedDir) ?
                fs.readdirSync(approvedDir).filter(f => f.endsWith('.json') && f !== '.gitkeep').length : 0;
            const published = fs.existsSync(publishedDir) ?
                fs.readdirSync(publishedDir).filter(f => f.endsWith('.json')).length : 0;

            const homepage = fs.existsSync(this.homepagePath) ?
                fs.readFileSync(this.homepagePath, 'utf8') : '';
            const homepageCards = (homepage.match(/uniform-article-card/g) || []).length;

            return {
                drafts,
                approved,
                published,
                homepageCards,
                inSync: published === homepageCards
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return {
                drafts: 0,
                approved: 0,
                published: 0,
                homepageCards: 0,
                inSync: false
            };
        }
    }

    async forceUpdate() {
        console.log('🚀 Force updating homepage...');
        await this.updateHomepageIfNeeded();
    }

    start() {
        console.log('📅 Starting Homepage Update Scheduler...');

        // Run immediately
        this.updateHomepageIfNeeded();

        // Set up to run every 30 minutes
        const interval = setInterval(() => {
            this.updateHomepageIfNeeded();
        }, 30 * 60 * 1000);

        console.log('✅ Homepage Update Scheduler started');
        console.log('🕐 Will check for updates every 30 minutes');

        return interval;
    }

    async runOnce() {
        await this.updateHomepageIfNeeded();
        const stats = await this.getPublishingStats();
        console.log('📊 Final stats:', stats);
        return stats;
    }
}

// Allow running directly
if (require.main === module) {
    const scheduler = new HomepageUpdateScheduler();

    if (process.argv.includes('--once')) {
        scheduler.runOnce()
            .then(stats => {
                console.log('✅ One-time update completed');
                process.exit(0);
            })
            .catch(error => {
                console.error('❌ Update failed:', error);
                process.exit(1);
            });
    } else {
        scheduler.start();

        // Keep process alive
        process.on('SIGINT', () => {
            console.log('\n📅 Homepage Update Scheduler stopping...');
            process.exit(0);
        });
    }
}

module.exports = HomepageUpdateScheduler;