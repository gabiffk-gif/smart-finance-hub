const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class EnhancedPublisher {
    constructor() {
        this.basePath = process.cwd();
        this.approvedDir = path.join(this.basePath, 'content', 'approved');
        this.publishedDir = path.join(this.basePath, 'content', 'published');
    }

    async publishApprovedArticles() {
        console.log('🚀 Starting enhanced publishing process...');

        try {
            // Step 1: Move all approved articles to published
            const approvedFiles = await this.getApprovedArticles();
            console.log(`📄 Found ${approvedFiles.length} approved articles to publish`);

            let movedCount = 0;
            for (const file of approvedFiles) {
                try {
                    const sourcePath = path.join(this.approvedDir, file);
                    const targetPath = path.join(this.publishedDir, file);

                    // Read, validate, and copy the article
                    const content = await fs.readFile(sourcePath, 'utf8');
                    const article = JSON.parse(content);

                    // Ensure required fields
                    if (article.title && article.content) {
                        await fs.copyFile(sourcePath, targetPath);
                        await fs.unlink(sourcePath);
                        movedCount++;
                        console.log(`✅ Published: ${article.title.substring(0, 50)}...`);
                    } else {
                        console.log(`⚠️  Skipped invalid article: ${file}`);
                    }
                } catch (error) {
                    console.log(`❌ Failed to publish ${file}: ${error.message}`);
                }
            }

            console.log(`📦 Moved ${movedCount} articles to published folder`);

            // Step 2: Force homepage regeneration with all published articles
            console.log('🏠 Regenerating homepage with all published articles...');
            execSync('node automation/force-uniform-homepage.js', { stdio: 'inherit' });

            // Step 3: Check if publisher exists and run it
            const publisherPath = path.join(this.basePath, 'automation', 'publisher', 'deploy.js');
            try {
                await fs.access(publisherPath);
                console.log('📝 Running HTML publisher...');
                execSync('node automation/publisher/deploy.js', { stdio: 'inherit' });
            } catch (error) {
                console.log('ℹ️  HTML publisher not found, skipping...');
            }

            // Step 4: Commit and deploy changes
            console.log('📤 Deploying to GitHub...');
            execSync('git add .', { stdio: 'inherit' });
            execSync(`git commit -m "$(cat <<'EOF'
Auto-publish: Deploy ${movedCount} approved articles to live website

- Published ${movedCount} articles from approved queue
- Regenerated homepage with uniform layout
- Updated article listing and navigation

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"`, { stdio: 'inherit' });
            execSync('git push origin main', { stdio: 'inherit' });

            const finalCount = await this.getPublishedCount();
            console.log(`✅ Enhanced publishing completed successfully`);
            console.log(`📊 Total published articles: ${finalCount}`);

            return {
                success: true,
                message: `Published ${movedCount} articles successfully`,
                publishedCount: finalCount,
                movedCount: movedCount
            };

        } catch (error) {
            console.error('❌ Enhanced publishing failed:', error.message);
            return { success: false, message: error.message };
        }
    }

    async getApprovedArticles() {
        try {
            const files = await fs.readdir(this.approvedDir);
            return files.filter(f => f.endsWith('.json') && f !== '.gitkeep');
        } catch (error) {
            console.error('Error reading approved directory:', error);
            return [];
        }
    }

    async getPublishedCount() {
        try {
            const files = await fs.readdir(this.publishedDir);
            return files.filter(f => f.endsWith('.json')).length;
        } catch (error) {
            return 0;
        }
    }

    async getDraftCount() {
        try {
            const draftDir = path.join(this.basePath, 'content', 'drafts');
            const files = await fs.readdir(draftDir);
            return files.filter(f => f.endsWith('.json')).length;
        } catch (error) {
            return 0;
        }
    }

    async getApprovedCount() {
        try {
            const files = await fs.readdir(this.approvedDir);
            return files.filter(f => f.endsWith('.json') && f !== '.gitkeep').length;
        } catch (error) {
            return 0;
        }
    }

    async getPublishingStats() {
        const [drafts, approved, published] = await Promise.all([
            this.getDraftCount(),
            this.getApprovedCount(),
            this.getPublishedCount()
        ]);

        return {
            drafts,
            approved,
            published,
            total: drafts + approved + published
        };
    }

    async quickPublish() {
        console.log('⚡ Quick publish: Moving approved articles...');
        const approvedFiles = await this.getApprovedArticles();

        if (approvedFiles.length === 0) {
            console.log('ℹ️  No approved articles to publish');
            return { success: true, message: 'No articles to publish', movedCount: 0 };
        }

        let movedCount = 0;
        for (const file of approvedFiles) {
            try {
                const sourcePath = path.join(this.approvedDir, file);
                const targetPath = path.join(this.publishedDir, file);
                await fs.copyFile(sourcePath, targetPath);
                await fs.unlink(sourcePath);
                movedCount++;
            } catch (error) {
                console.error(`Failed to move ${file}:`, error.message);
            }
        }

        // Quick homepage update
        execSync('node automation/force-uniform-homepage.js', { stdio: 'inherit' });

        return {
            success: true,
            message: `Quick published ${movedCount} articles`,
            movedCount: movedCount
        };
    }
}

module.exports = EnhancedPublisher;

// Allow running directly
if (require.main === module) {
    const publisher = new EnhancedPublisher();
    publisher.publishApprovedArticles()
        .then(result => {
            console.log('Result:', result);
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}