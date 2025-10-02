#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

class NewestFirstPublisher {
    constructor() {
        this.publishedArticles = [];
        this.processedCount = 0;
    }

    loadPublishedArticles() {
        console.log('📄 Loading published articles for newest-first sorting...');

        const publishedDir = 'content/published';

        if (!fs.existsSync(publishedDir)) {
            console.log('❌ Published directory does not exist');
            return;
        }

        const files = fs.readdirSync(publishedDir);

        files.forEach(file => {
            if (file.endsWith('.json') && file !== '.gitkeep') {
                try {
                    const article = JSON.parse(fs.readFileSync(path.join(publishedDir, file), 'utf8'));

                    // Extract date for sorting (prioritize original creation date)
                    const dateStr = article.metadata?.originalCreatedAt ||
                                   article.metadata?.publishedAt ||
                                   article.metadata?.createdAt ||
                                   article.publishDate;

                    const articleDate = dateStr ? new Date(dateStr) : new Date(0);

                    this.publishedArticles.push({
                        ...article,
                        sortDate: articleDate,
                        fileName: file
                    });

                    this.processedCount++;

                } catch (error) {
                    console.log(`⚠️  Error loading ${file}: ${error.message}`);
                }
            }
        });

        // Sort by date (newest first)
        this.publishedArticles.sort((a, b) => b.sortDate - a.sortDate);

        console.log(`✅ Loaded and sorted ${this.processedCount} published articles`);
    }

    markLatestArticles() {
        console.log('🆕 Marking latest 3 articles with NEW badge...');

        // Mark first 3 articles as "new"
        this.publishedArticles.forEach((article, index) => {
            if (index < 3) {
                if (!article.metadata) article.metadata = {};
                article.metadata.isNew = true;
                article.metadata.newBadge = 'NEW';
                console.log(`🆕 Marked as NEW: ${article.title?.substring(0, 50)}...`);
            } else {
                // Remove new badge from older articles
                if (article.metadata) {
                    delete article.metadata.isNew;
                    delete article.metadata.newBadge;
                }
            }
        });
    }

    generateHomepageCards() {
        console.log('🏠 Generating homepage with newest-first ordering...');

        const cards = this.publishedArticles.map((article, index) => {
            // Standardize article data
            const title = (article.title || 'Financial Article').length > 70 ?
                (article.title || 'Financial Article').substring(0, 67) + '...' :
                (article.title || 'Financial Article');

            const excerpt = (article.summary || article.metaDescription || article.content || 'Expert financial advice...')
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .substring(0, 120) + '...';

            const category = (article.category || 'FINANCE').toUpperCase();

            const slug = article.slug ||
                         (article.title || 'article').toLowerCase()
                             .replace(/[^a-z0-9]+/g, '-')
                             .replace(/^-|-$/g, '')
                             .substring(0, 50);

            const articleDate = article.sortDate;
            const dateStr = articleDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            const readingTime = Math.max(3, Math.min(15, Math.ceil(((article.content || '').split(' ').length) / 200)));

            // Add NEW badge HTML if article is new
            const newBadge = article.metadata?.isNew ?
                '<span class="new-badge">NEW</span>' : '';

            const imageId = (index % 50) + 1;

            return `
            <article class="uniform-article-card">
                <div class="uniform-image-container">
                    <img src="https://picsum.photos/400/240?random=${imageId}"
                         alt="${title.replace(/"/g, '&quot;')}"
                         class="uniform-article-image">
                </div>
                <div class="uniform-card-content">
                    <div class="uniform-category-badge">${category}</div>
                    ${newBadge}
                    <h3 class="uniform-article-title">
                        <a href="/articles/2025/09/${slug}">${title}</a>
                    </h3>
                    <div class="uniform-article-meta">
                        ${category.toLowerCase()} • ${dateStr} • ${readingTime} min read
                    </div>
                    <p class="uniform-article-excerpt">${excerpt}</p>
                    <div class="uniform-button-container">
                        <a href="/articles/2025/09/${slug}" class="uniform-read-more-btn">Read Full Article →</a>
                    </div>
                </div>
            </article>`;
        });

        return cards.join('');
    }

    generateNewBadgeCSS() {
        return `
        /* NEW Badge Styles */
        .new-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
            color: white;
            font-size: 0.7rem;
            font-weight: 700;
            padding: 0.3rem 0.6rem;
            border-radius: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
            z-index: 10;
            animation: pulse-glow 2s infinite;
        }

        @keyframes pulse-glow {
            0%, 100% { transform: scale(1); box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3); }
            50% { transform: scale(1.05); box-shadow: 0 4px 16px rgba(255, 107, 107, 0.5); }
        }

        .uniform-image-container {
            position: relative;
        }`;
    }

    updateHomepage() {
        console.log('📝 Updating homepage with newest-first articles...');

        try {
            let homepageContent = fs.readFileSync('index.html', 'utf8');

            const articleCards = this.generateHomepageCards();
            const newBadgeCSS = this.generateNewBadgeCSS();

            // Update article cards
            const gridRegex = /<div class="uniform-articles-grid">\s*([\s\S]*?)\s*<\/div>/;
            const newGrid = `<div class="uniform-articles-grid">
            ${articleCards}
        </div>`;

            homepageContent = homepageContent.replace(gridRegex, newGrid);

            // Add NEW badge CSS to the style section
            const styleEndRegex = /(\s*<\/style>)/;
            homepageContent = homepageContent.replace(styleEndRegex, `\n        ${newBadgeCSS}\n$1`);

            fs.writeFileSync('index.html', homepageContent);
            console.log('✅ Homepage updated with newest-first ordering');

            // Also update articles.html
            let articlesContent = fs.readFileSync('articles.html', 'utf8');
            articlesContent = articlesContent.replace(gridRegex, newGrid);
            articlesContent = articlesContent.replace(styleEndRegex, `\n        ${newBadgeCSS}\n$1`);
            fs.writeFileSync('articles.html', articlesContent);
            console.log('✅ Articles page updated with newest-first ordering');

        } catch (error) {
            console.error('❌ Error updating homepage:', error.message);
        }
    }

    saveArticlesWithNewStatus() {
        console.log('💾 Saving articles with updated NEW status...');

        this.publishedArticles.forEach(article => {
            try {
                // Remove sorting metadata before saving
                const { sortDate, fileName, ...cleanArticle } = article;

                const filePath = path.join('content/published', fileName);
                fs.writeFileSync(filePath, JSON.stringify(cleanArticle, null, 2));
            } catch (error) {
                console.log(`⚠️  Error saving ${article.fileName}: ${error.message}`);
            }
        });

        console.log('✅ All articles saved with updated NEW status');
    }

    generateReport() {
        console.log('\n📰 NEWEST-FIRST PUBLISHING REPORT');
        console.log('=' .repeat(45));
        console.log(`📄 Total articles processed: ${this.processedCount}`);
        console.log(`🆕 Articles marked as NEW: 3`);
        console.log(`📅 Articles sorted by: Original creation date (newest first)`);

        if (this.publishedArticles.length >= 3) {
            console.log('\n🆕 Latest Articles (marked as NEW):');
            this.publishedArticles.slice(0, 3).forEach((article, index) => {
                const date = article.sortDate.toLocaleDateString();
                console.log(`  ${index + 1}. ${article.title?.substring(0, 60)}... (${date})`);
            });
        }

        return {
            totalProcessed: this.processedCount,
            newArticles: 3,
            sortedByDate: true
        };
    }

    run() {
        console.log('🚀 Starting newest-first publishing process...');

        this.loadPublishedArticles();
        this.markLatestArticles();
        this.updateHomepage();
        this.saveArticlesWithNewStatus();

        const report = this.generateReport();

        // Commit changes
        try {
            const { execSync } = require('child_process');
            execSync('git add index.html articles.html content/published/', { stdio: 'inherit' });
            execSync(`git commit -m "Auto-sort: Display articles newest-first with NEW badges

- Sorted ${this.processedCount} articles by original creation date
- Added NEW badges to latest 3 articles
- Updated homepage and articles page ordering

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"`, { stdio: 'inherit' });
            console.log('✅ Changes committed to git');
        } catch (e) {
            console.log('ℹ️  Git operations completed (may have been no changes)');
        }

        console.log('\n🎯 Newest-first publishing completed successfully!');
        return report;
    }
}

// Run newest-first publishing if called directly
if (require.main === module) {
    const publisher = new NewestFirstPublisher();
    publisher.run();
    process.exit(0);
}

module.exports = NewestFirstPublisher;