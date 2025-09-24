#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { generateArticleHTML } = require('./templates/article-template');
const Publisher = require('./publisher/deploy');

async function regenerateAllArticles() {
    console.log('🔄 Starting article regeneration with new universal template...');

    try {
        // Initialize publisher
        const publisher = new Publisher();

        // Get all published articles
        const publishedDir = path.join(__dirname, '..', 'content', 'published');

        let articleFiles;
        try {
            articleFiles = await fs.readdir(publishedDir);
            console.log(`📄 Found ${articleFiles.length} published articles`);
        } catch (error) {
            console.log('⚠️  No published articles directory found');
            return;
        }

        let regeneratedCount = 0;
        const failedArticles = [];

        // Process each article
        for (const file of articleFiles) {
            if (!file.endsWith('.json')) continue;

            try {
                console.log(`\n🔄 Regenerating: ${file}`);

                // Read article JSON
                const articlePath = path.join(publishedDir, file);
                const articleContent = await fs.readFile(articlePath, 'utf8');
                const article = JSON.parse(articleContent);

                // Skip if article doesn't have required fields
                if (!article.title || !article.content) {
                    console.log(`⚠️  Skipping ${file} - missing title or content`);
                    continue;
                }

                // Generate new HTML using universal template
                const newHTML = generateArticleHTML(article);

                // Determine file path for the HTML
                let htmlFilePath;
                if (article.metadata?.filePath) {
                    htmlFilePath = article.metadata.filePath;
                } else {
                    // Generate new path
                    const slug = generateSlug(article.title);
                    const publishDate = new Date(article.metadata?.publishedAt || Date.now());
                    const year = publishDate.getFullYear();
                    const month = String(publishDate.getMonth() + 1).padStart(2, '0');
                    htmlFilePath = `articles/${year}/${month}/${slug}.html`;
                }

                // Commit the regenerated article to GitHub
                await publisher.commitToGitHub(
                    htmlFilePath,
                    newHTML,
                    `Regenerate article with new template: ${article.title}`
                );

                console.log(`✅ Successfully regenerated: ${article.title}`);
                console.log(`   📍 Path: ${htmlFilePath}`);

                regeneratedCount++;

                // Add small delay to avoid hitting GitHub API limits
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`❌ Failed to regenerate ${file}:`, error.message);
                failedArticles.push({ file, error: error.message });
            }
        }

        // Generate new dynamic homepage
        console.log('\n🏠 Regenerating dynamic homepage...');
        try {
            const { generateDynamicHomepage } = require('./homepage-generator');
            await generateDynamicHomepage();
            console.log('✅ Dynamic homepage regenerated');
        } catch (error) {
            console.error('❌ Failed to regenerate homepage:', error.message);
        }

        // Summary
        console.log('\n📊 REGENERATION SUMMARY:');
        console.log(`✅ Successfully regenerated: ${regeneratedCount} articles`);
        console.log(`❌ Failed: ${failedArticles.length} articles`);

        if (failedArticles.length > 0) {
            console.log('\n❌ Failed Articles:');
            failedArticles.forEach(({ file, error }) => {
                console.log(`   • ${file}: ${error}`);
            });
        }

        console.log('\n🎉 Article regeneration complete!');
        console.log('🌐 All articles now use the new universal template with SFH VIP branding');

    } catch (error) {
        console.error('❌ Regeneration process failed:', error);
        throw error;
    }
}

function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

// Run if called directly
if (require.main === module) {
    regenerateAllArticles()
        .then(() => {
            console.log('✅ Regeneration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Regeneration failed:', error);
            process.exit(1);
        });
}

module.exports = { regenerateAllArticles };