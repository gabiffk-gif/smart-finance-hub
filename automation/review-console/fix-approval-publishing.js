const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

async function fixApprovalPublishing() {
    console.log('🔧 Fixing Review Console approval publishing integration...');

    try {
        const serverPath = './automation/review-console/server.js';
        let serverContent = await fs.readFile(serverPath, 'utf8');

        // Check if the approveArticle method needs updating
        const approveMethodRegex = /async approveArticle\(req, res\) \{([\s\S]*?)\}/;
        const match = serverContent.match(approveMethodRegex);

        if (match && !match[1].includes('enhanced-publisher')) {
            console.log('🔄 Updating approveArticle method to trigger enhanced publisher...');

            const newApproveMethod = `async approveArticle(req, res) {
        try {
            const { id } = req.params;
            const { reviewer, notes } = req.body;

            const article = await this.findArticleById(id);
            if (!article) {
                return res.status(404).json({ success: false, error: 'Article not found' });
            }

            // Update article metadata
            article.metadata.status = 'approved';
            article.metadata.approvedAt = new Date().toISOString();
            article.metadata.approvedBy = reviewer || 'system';
            article.metadata.reviewNotes = notes || '';

            // Move from drafts to approved
            await this.moveArticle(id, 'drafts', 'approved', article);

            // CRITICAL: Trigger enhanced publisher immediately after approval
            console.log('📤 Article approved - triggering enhanced publisher...');
            try {
                const EnhancedPublisher = require('./enhanced-publisher');
                const publisher = new EnhancedPublisher();

                // Run quick publish to immediately process approved articles
                const result = await publisher.quickPublish();
                console.log('✅ Enhanced publisher result:', result);

                res.json({
                    success: true,
                    message: 'Article approved and published automatically',
                    article: article.metadata,
                    publishResult: result
                });
            } catch (publishError) {
                console.error('❌ Enhanced publisher failed:', publishError);
                res.json({
                    success: true,
                    message: 'Article approved but publishing failed - will retry automatically',
                    article: article.metadata,
                    publishError: publishError.message
                });
            }
        } catch (error) {
            console.error('❌ Approval failed:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }`;

            serverContent = serverContent.replace(approveMethodRegex, newApproveMethod);
            await fs.writeFile(serverPath, serverContent);
            console.log('✅ Approval method updated with enhanced publisher integration');
        } else {
            console.log('ℹ️  Approval method already has enhanced publisher integration');
        }

        // Also add a batch approval method for processing existing approved articles
        if (!serverContent.includes('processPendingApprovals')) {
            console.log('🔄 Adding batch approval processing method...');

            const batchMethod = `
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
                    message: \`Processed \${result.movedCount} approved articles\`,
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
    }`;

            // Add the route
            const routeAdd = `        this.app.post('/api/process-pending-approvals', this.processPendingApprovals.bind(this));`;

            // Find where to insert the route (after other publish routes)
            const routeInsertPoint = serverContent.indexOf("this.app.post('/api/publish/quick'");
            if (routeInsertPoint !== -1) {
                const endOfLine = serverContent.indexOf('\n', routeInsertPoint);
                serverContent = serverContent.slice(0, endOfLine + 1) + routeAdd + '\n' + serverContent.slice(endOfLine + 1);

                // Add the method before the last closing brace of the class
                const lastMethodEnd = serverContent.lastIndexOf('    }');
                serverContent = serverContent.slice(0, lastMethodEnd) + batchMethod + '\n' + serverContent.slice(lastMethodEnd);

                await fs.writeFile(serverPath, serverContent);
                console.log('✅ Added batch approval processing method');
            }
        }

        console.log('✅ Review Console approval publishing fix completed');

    } catch (error) {
        console.error('❌ Fix failed:', error);
        throw error;
    }
}

// Run the fix
if (require.main === module) {
    fixApprovalPublishing()
        .then(() => {
            console.log('🎉 Approval publishing fix applied successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Fix failed:', error);
            process.exit(1);
        });
}

module.exports = fixApprovalPublishing;