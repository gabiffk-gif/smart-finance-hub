const Publisher = require('../publisher/deploy.js');
const fs = require('fs').promises;
const path = require('path');

class PublisherIntegration {
    constructor() {
        this.publisher = new Publisher();
        this.contentDir = path.join(__dirname, '../../content');
    }

    /**
     * Publish approved articles to the website
     */
    async publishApprovedArticles() {
        try {
            console.log('🚀 Starting publication process...');

            // Get all approved articles
            const approvedDir = path.join(this.contentDir, 'approved');
            const files = await fs.readdir(approvedDir);

            const approvedArticles = [];
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(approvedDir, file);
                        const content = await fs.readFile(filePath, 'utf8');
                        const article = JSON.parse(content);
                        approvedArticles.push(article);
                    } catch (error) {
                        console.error(`Error reading article ${file}:`, error);
                    }
                }
            }

            console.log(`📄 Found ${approvedArticles.length} approved articles to publish`);

            const publishResults = [];
            for (const article of approvedArticles) {
                try {
                    console.log(`📝 Publishing: ${article.title}`);

                    // Publish the article
                    const result = await this.publisher.publishArticle(article);

                    // Move article to published folder (skip if already there)
                    await this.moveToPublished(article);

                    publishResults.push({
                        success: true,
                        article: article.title,
                        result: result
                    });

                    console.log(`✅ Successfully published: ${article.title}`);
                } catch (error) {
                    console.error(`❌ Failed to publish: ${article.title}`, error);
                    publishResults.push({
                        success: false,
                        article: article.title,
                        error: error.message
                    });
                }
            }

            console.log('🎉 Publication process completed');
            return {
                success: true,
                published: publishResults.filter(r => r.success).length,
                failed: publishResults.filter(r => !r.success).length,
                results: publishResults
            };

        } catch (error) {
            console.error('❌ Publication process failed:', error);
            throw error;
        }
    }

    /**
     * Publish a single approved article
     */
    async publishSingleArticle(articleId) {
        try {
            console.log(`🚀 Publishing single article: ${articleId}`);

            // Find the article in approved folder
            const article = await this.findApprovedArticle(articleId);
            if (!article) {
                throw new Error(`Article ${articleId} not found in approved folder`);
            }

            // Publish the article
            const result = await this.publisher.publishArticle(article);

            // Move article to published folder
            await this.moveToPublished(article);

            console.log(`✅ Successfully published: ${article.title}`);
            return {
                success: true,
                article: article.title,
                result: result
            };

        } catch (error) {
            console.error(`❌ Failed to publish article ${articleId}:`, error);
            throw error;
        }
    }

    /**
     * Find an approved article by ID
     */
    async findApprovedArticle(articleId) {
        const approvedDir = path.join(this.contentDir, 'approved');
        const files = await fs.readdir(approvedDir);

        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(approvedDir, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const article = JSON.parse(content);

                    const id = article.id || article.metadata?.id;
                    if (id === articleId) {
                        return article;
                    }
                } catch (error) {
                    continue;
                }
            }
        }
        return null;
    }

    /**
     * Move article to published folder
     */
    async moveToPublished(article) {
        const articleId = article.id || article.metadata?.id;
        const approvedDir = path.join(this.contentDir, 'approved');
        const publishedDir = path.join(this.contentDir, 'published');

        // Find the actual filename in approved folder
        const files = await fs.readdir(approvedDir);
        let sourceFile = null;

        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(approvedDir, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const fileArticle = JSON.parse(content);
                    const id = fileArticle.id || fileArticle.metadata?.id;
                    if (id === articleId) {
                        sourceFile = file;
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }
        }

        if (!sourceFile) {
            throw new Error(`Source file for article ${articleId} not found`);
        }

        const sourcePath = path.join(approvedDir, sourceFile);
        const targetPath = path.join(publishedDir, `${articleId}.json`);

        // Update metadata
        article.metadata = article.metadata || {};
        article.metadata.status = 'published';
        article.metadata.publishedAt = new Date().toISOString();
        article.metadata.publishedBy = 'Publisher System';

        // Save to published folder
        await fs.writeFile(targetPath, JSON.stringify(article, null, 2));

        // Remove from approved folder
        await fs.unlink(sourcePath);

        console.log(`📁 Moved article ${articleId} from approved to published`);
    }
}

module.exports = PublisherIntegration;