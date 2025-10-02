#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

class ArticleDateFixer {
    constructor() {
        this.fixedCount = 0;
        this.preservedCount = 0;
        this.errorCount = 0;
    }

    fixArticleDates() {
        console.log('📅 Starting article date preservation process...');

        const folders = ['content/published', 'content/approved', 'content/drafts'];

        folders.forEach(folder => {
            if (fs.existsSync(folder)) {
                console.log(`\n📁 Processing folder: ${folder}`);
                this.processFolderDates(folder);
            } else {
                console.log(`📁 Folder ${folder} does not exist, skipping...`);
            }
        });

        this.generateReport();
    }

    processFolderDates(folderPath) {
        const files = fs.readdirSync(folderPath);

        files.forEach(file => {
            if (file.endsWith('.json') && file !== '.gitkeep') {
                this.processArticleDate(path.join(folderPath, file));
            }
        });
    }

    processArticleDate(filePath) {
        try {
            // Get file stats for creation/modification time
            const stats = fs.statSync(filePath);
            const fileCreationTime = stats.birthtime || stats.mtime; // Fallback to mtime if birthtime not available

            // Read article content
            const articleContent = fs.readFileSync(filePath, 'utf8');
            const article = JSON.parse(articleContent);

            let needsUpdate = false;
            const fileName = path.basename(filePath);

            // Ensure metadata exists
            if (!article.metadata) {
                article.metadata = {};
                needsUpdate = true;
            }

            // Preserve original creation date if not set
            if (!article.metadata.originalCreatedAt) {
                article.metadata.originalCreatedAt = fileCreationTime.toISOString();
                needsUpdate = true;
                console.log(`✅ Set original creation date for ${fileName}: ${fileCreationTime.toISOString()}`);
            } else {
                this.preservedCount++;
                console.log(`🔒 Preserved existing date for ${fileName}: ${article.metadata.originalCreatedAt}`);
            }

            // Set created date if missing (but don't overwrite existing)
            if (!article.metadata.createdAt) {
                article.metadata.createdAt = article.metadata.originalCreatedAt;
                needsUpdate = true;
            }

            // Handle publish date for published articles
            if (filePath.includes('published') && !article.metadata.publishedAt) {
                // Use original creation date as publish date to maintain chronological order
                article.metadata.publishedAt = article.metadata.originalCreatedAt;
                article.metadata.status = 'published';
                needsUpdate = true;
                console.log(`📰 Set publish date for ${fileName}: ${article.metadata.originalCreatedAt}`);
            }

            // Handle approval date for approved articles
            if (filePath.includes('approved') && !article.metadata.approvedAt) {
                article.metadata.approvedAt = new Date().toISOString();
                article.metadata.status = 'approved';
                needsUpdate = true;
            }

            // Generate publish date from title or filename if needed
            if (!article.publishDate && article.metadata.originalCreatedAt) {
                const originalDate = new Date(article.metadata.originalCreatedAt);
                article.publishDate = originalDate.toISOString().split('T')[0]; // YYYY-MM-DD format
                needsUpdate = true;
            }

            // Ensure slug exists
            if (!article.slug && article.title) {
                article.slug = this.generateSlugFromTitle(article.title);
                needsUpdate = true;
            }

            // Update URL based on original creation date
            if (article.metadata.originalCreatedAt && !article.url) {
                const date = new Date(article.metadata.originalCreatedAt);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                article.url = `/articles/${year}/${month}/${article.slug}`;
                needsUpdate = true;
            }

            // Save if changes were made
            if (needsUpdate) {
                fs.writeFileSync(filePath, JSON.stringify(article, null, 2));
                this.fixedCount++;
            }

        } catch (error) {
            this.errorCount++;
            console.error(`❌ Error processing ${path.basename(filePath)}: ${error.message}`);
        }
    }

    generateSlugFromTitle(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .substring(0, 50) // Limit length
            .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    }

    sortArticlesByDate(articles) {
        return articles.sort((a, b) => {
            const dateA = new Date(a.metadata?.originalCreatedAt || a.metadata?.publishedAt || a.metadata?.createdAt || 0);
            const dateB = new Date(b.metadata?.originalCreatedAt || b.metadata?.publishedAt || b.metadata?.createdAt || 0);
            return dateB - dateA; // Newest first
        });
    }

    generateReport() {
        console.log('\n📅 ARTICLE DATE FIXING REPORT');
        console.log('=' .repeat(40));
        console.log(`✅ Articles fixed: ${this.fixedCount}`);
        console.log(`🔒 Dates preserved: ${this.preservedCount}`);
        console.log(`❌ Errors: ${this.errorCount}`);

        if (this.fixedCount > 0) {
            console.log('\n🔄 Updating homepage to reflect proper date ordering...');
            try {
                const { execSync } = require('child_process');
                execSync('node automation/update-homepage-scheduler.js --once', { stdio: 'inherit' });
                console.log('✅ Homepage updated with proper date ordering');
            } catch (e) {
                console.log('⚠️  Could not update homepage automatically');
            }
        }

        return {
            fixed: this.fixedCount,
            preserved: this.preservedCount,
            errors: this.errorCount
        };
    }

    validateDateConsistency() {
        console.log('\n🔍 Validating date consistency across all articles...');

        const folders = ['content/published', 'content/approved', 'content/drafts'];
        let inconsistencies = 0;

        folders.forEach(folder => {
            if (fs.existsSync(folder)) {
                const files = fs.readdirSync(folder);

                files.forEach(file => {
                    if (file.endsWith('.json') && file !== '.gitkeep') {
                        try {
                            const article = JSON.parse(fs.readFileSync(path.join(folder, file), 'utf8'));

                            if (article.metadata) {
                                // Check for date inconsistencies
                                const originalDate = article.metadata.originalCreatedAt;
                                const createdDate = article.metadata.createdAt;
                                const publishDate = article.metadata.publishedAt;

                                if (originalDate && createdDate && originalDate !== createdDate) {
                                    console.log(`⚠️  Date inconsistency in ${file}: original != created`);
                                    inconsistencies++;
                                }

                                if (publishDate && originalDate && new Date(publishDate) < new Date(originalDate)) {
                                    console.log(`⚠️  Date inconsistency in ${file}: publish < original`);
                                    inconsistencies++;
                                }
                            }
                        } catch (e) {
                            // Skip invalid files
                        }
                    }
                });
            }
        });

        if (inconsistencies === 0) {
            console.log('✅ All article dates are consistent');
        } else {
            console.log(`❌ Found ${inconsistencies} date inconsistencies`);
        }

        return inconsistencies;
    }
}

// Run date fixing if called directly
if (require.main === module) {
    const fixer = new ArticleDateFixer();
    fixer.fixArticleDates();
    fixer.validateDateConsistency();

    console.log('\n🎯 Article date preservation completed!');
    process.exit(0);
}

module.exports = ArticleDateFixer;