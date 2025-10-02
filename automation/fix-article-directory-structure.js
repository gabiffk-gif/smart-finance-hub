const fs = require('fs').promises;
const path = require('path');

class ArticleDirectoryFixer {
    constructor() {
        this.baseDir = process.cwd();
        this.publishedDir = path.join(this.baseDir, 'content', 'published');
        this.publicArticlesDir = path.join(this.baseDir, 'public', 'articles');
        this.homepagePath = path.join(this.baseDir, 'index.html');
        this.stylesPath = path.join(this.baseDir, 'styles.css');
        this.generatedArticles = [];
        this.directoryStructure = new Set();
    }

    async run() {
        console.log('🏗️  FIXING ARTICLE DIRECTORY STRUCTURE');
        console.log('=====================================\n');

        try {
            await this.readStylesCSS();
            await this.processAllArticles();
            await this.updateHomepageLinks();
            await this.cleanupOldStructure();
            await this.showResults();
        } catch (error) {
            console.error('❌ Error:', error.message);
            throw error;
        }
    }

    async readStylesCSS() {
        try {
            this.stylesContent = await fs.readFile(this.stylesPath, 'utf8');
            console.log('✅ Loaded styles.css');
        } catch (error) {
            console.log('⚠️  Could not load styles.css, using default styles');
            this.stylesContent = `
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                .container { max-width: 800px; margin: 0 auto; }
                .back-nav { margin-bottom: 20px; }
                .article-content { line-height: 1.6; }
                .author-info { margin-top: 30px; padding: 15px; background: #f5f5f5; border-radius: 5px; }
            `;
        }
    }

    async processAllArticles() {
        console.log('📁 Reading published articles...');

        const files = await fs.readdir(this.publishedDir);
        const jsonFiles = files.filter(file => file.endsWith('.json') && file !== '.gitkeep');

        console.log(`   Found ${jsonFiles.length} published articles\n`);

        for (const file of jsonFiles) {
            await this.processArticle(file);
        }
    }

    async processArticle(filename) {
        const filePath = path.join(this.publishedDir, filename);
        const articleData = JSON.parse(await fs.readFile(filePath, 'utf8'));

        // Get publish date from article
        const publishDate = this.getPublishDate(articleData);
        const [year, month] = publishDate.split('-');

        // Create directory structure
        const articleDir = path.join(this.publicArticlesDir, year, month);
        await fs.mkdir(articleDir, { recursive: true });
        this.directoryStructure.add(`articles/${year}/${month}`);

        // Generate HTML file
        const slug = articleData.slug || this.generateSlug(articleData.title);
        const htmlFilename = `${slug}.html`;
        const htmlPath = path.join(articleDir, htmlFilename);
        const relativePath = `articles/${year}/${month}/${htmlFilename}`;

        const htmlContent = this.generateArticleHTML(articleData, year, month);
        await fs.writeFile(htmlPath, htmlContent, 'utf8');

        this.generatedArticles.push({
            title: articleData.title,
            path: relativePath,
            fullPath: htmlPath,
            date: publishDate,
            slug: htmlFilename
        });

        console.log(`   ✅ Generated: ${relativePath}`);
    }

    getPublishDate(articleData) {
        // Try multiple date fields
        let dateStr = articleData.publishDate ||
                     articleData.metadata?.publishedAt ||
                     articleData.metadata?.createdAt ||
                     articleData.publishedAt ||
                     articleData.createdAt;

        if (!dateStr) {
            console.log(`   ⚠️  No date found for ${articleData.title}, using 2025-09`);
            return '2025-09';
        }

        // Parse date and format as YYYY-MM
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            console.log(`   ⚠️  Invalid date "${dateStr}" for ${articleData.title}, using 2025-09`);
            return '2025-09';
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 50);
    }

    generateArticleHTML(articleData, year, month) {
        const author = articleData.author || { name: 'Smart Finance Hub', title: 'Financial Expert' };
        const publishDate = this.getPublishDate(articleData);
        const formattedDate = this.formatDisplayDate(publishDate);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${articleData.title} | Smart Finance Hub</title>
    <meta name="description" content="${articleData.metaDescription || 'Expert financial advice and insights from Smart Finance Hub'}">
    <link rel="stylesheet" href="../../../styles.css">
    <style>
        ${this.stylesContent}

        /* Additional article-specific styles */
        .article-header {
            margin-bottom: 30px;
            border-bottom: 2px solid #eee;
            padding-bottom: 20px;
        }

        .article-title {
            color: #2c3e50;
            font-size: 2.2em;
            margin-bottom: 10px;
            line-height: 1.3;
        }

        .article-meta {
            color: #7f8c8d;
            font-size: 14px;
            margin-bottom: 15px;
        }

        .back-nav a {
            color: #3498db;
            text-decoration: none;
            font-weight: 500;
        }

        .back-nav a:hover {
            color: #2980b9;
            text-decoration: underline;
        }

        .article-content h1,
        .article-content h2,
        .article-content h3 {
            color: #2c3e50;
            margin-top: 30px;
            margin-bottom: 15px;
        }

        .article-content p {
            margin-bottom: 15px;
        }

        .article-content ul,
        .article-content ol {
            margin-bottom: 15px;
            padding-left: 30px;
        }

        .author-info {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 10px;
            margin: 40px 0;
        }

        .author-name {
            font-size: 1.3em;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .author-title {
            font-size: 1.1em;
            opacity: 0.9;
            margin-bottom: 10px;
        }

        .author-bio {
            font-size: 0.95em;
            opacity: 0.85;
            line-height: 1.5;
        }

        .cta-section {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            text-align: center;
        }

        .footer {
            margin-top: 50px;
            padding: 30px 0;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <nav class="back-nav">
            <a href="../../../index.html">← Back to Smart Finance Hub</a>
        </nav>

        <article>
            <header class="article-header">
                <h1 class="article-title">${articleData.title}</h1>
                <div class="article-meta">
                    Published on ${formattedDate} | ${articleData.metadata?.readingTime || '5 min read'}
                </div>
            </header>

            <div class="article-content">
                ${articleData.content}
            </div>

            <div class="author-info">
                <div class="author-name">By ${author.name}</div>
                <div class="author-title">${author.title}</div>
                ${author.bio ? `<div class="author-bio">${author.bio}</div>` : ''}
            </div>

            ${articleData.cta ? `
            <div class="cta-section">
                <p><strong>Ready to take control of your finances?</strong></p>
                <p>${articleData.cta}</p>
            </div>
            ` : ''}
        </article>

        <footer class="footer">
            <p>&copy; 2025 Smart Finance Hub. All rights reserved.</p>
            <p><a href="../../../index.html">Return to Homepage</a></p>
        </footer>
    </div>
</body>
</html>`;
    }

    formatDisplayDate(dateStr) {
        try {
            const [year, month] = dateStr.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long'
            });
        } catch (error) {
            return dateStr;
        }
    }

    async updateHomepageLinks() {
        console.log('\n🏠 Updating homepage article links...');

        try {
            const homepageContent = await fs.readFile(this.homepagePath, 'utf8');
            let updatedContent = homepageContent;

            // Update article links to use new structure
            for (const article of this.generatedArticles) {
                // Find and replace old flat structure links
                const oldPattern = new RegExp(`articles/${article.slug}`, 'g');
                updatedContent = updatedContent.replace(oldPattern, article.path);

                // Also update any href patterns that might exist
                const hrefPattern = new RegExp(`href=["']articles/${article.slug}["']`, 'g');
                updatedContent = updatedContent.replace(hrefPattern, `href="${article.path}"`);
            }

            await fs.writeFile(this.homepagePath, updatedContent, 'utf8');
            console.log('   ✅ Homepage links updated');
        } catch (error) {
            console.log('   ⚠️  Could not update homepage:', error.message);
        }
    }

    async cleanupOldStructure() {
        console.log('\n🧹 Cleaning up old flat-structure HTML files...');

        try {
            const files = await fs.readdir(this.publicArticlesDir);
            let deletedCount = 0;

            for (const file of files) {
                const filePath = path.join(this.publicArticlesDir, file);
                const stat = await fs.stat(filePath);

                // Delete HTML files in the root articles directory (keep directories)
                if (stat.isFile() && file.endsWith('.html')) {
                    await fs.unlink(filePath);
                    deletedCount++;
                    console.log(`   🗑️  Deleted: articles/${file}`);
                }
            }

            console.log(`   ✅ Cleaned up ${deletedCount} old HTML files`);
        } catch (error) {
            console.log('   ⚠️  Cleanup error:', error.message);
        }
    }

    async showResults() {
        console.log('\n📊 RESULTS SUMMARY');
        console.log('=================\n');

        console.log(`📈 Total articles generated: ${this.generatedArticles.length}`);
        console.log(`📁 Directory structure created:`);

        const sortedDirs = Array.from(this.directoryStructure).sort();
        for (const dir of sortedDirs) {
            const fullPath = path.join(this.baseDir, 'public', dir);
            const files = await fs.readdir(fullPath);
            const htmlFiles = files.filter(f => f.endsWith('.html'));
            console.log(`   📂 ${dir}/ (${htmlFiles.length} articles)`);
        }

        console.log('\n📄 Example article path:');
        if (this.generatedArticles.length > 0) {
            const example = this.generatedArticles[0];
            console.log(`   Title: ${example.title}`);
            console.log(`   Path: ${example.path}`);
            console.log(`   Full Path: ${example.fullPath}`);
            console.log(`   Date: ${example.date}`);
        }

        console.log('\n✅ Article directory structure fixed successfully!');
        console.log('🔍 Test the structure before committing:');
        console.log('   1. Open index.html and click article links');
        console.log('   2. Verify articles load with proper styling');
        console.log('   3. Check "Back to Homepage" navigation works');
        console.log('   4. Confirm CSS is loading (../../../styles.css)');
    }
}

// Run the fixer
const fixer = new ArticleDirectoryFixer();
fixer.run().catch(console.error);