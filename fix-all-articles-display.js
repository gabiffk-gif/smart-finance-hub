const fs = require('fs');
const path = require('path');

console.log('=== UPDATING HOMEPAGE TO SHOW ALL ARTICLES ===');

// Read ALL published articles
const publishedDir = './content/published';
let articles = [];

try {
    const files = fs.readdirSync(publishedDir);
    console.log('Found published files:', files.length);

    files.forEach((file, index) => {
        if (file.endsWith('.json')) {
            try {
                const content = fs.readFileSync(path.join(publishedDir, file), 'utf8');
                const article = JSON.parse(content);

                // Use existing slug from metadata if available, otherwise generate one
                let slug = '';
                if (article.metadata && article.metadata.slug) {
                    slug = article.metadata.slug;
                } else {
                    // Generate slug from title
                    slug = (article.title || 'untitled')
                        .toLowerCase()
                        .replace(/[^a-z0-9\s-]/g, '')
                        .replace(/\s+/g, '-')
                        .replace(/-+/g, '-')
                        .trim()
                        .substring(0, 60);
                }

                // Clean up excerpt
                let excerpt = article.summary || article.metaDescription || '';
                if (!excerpt && article.content) {
                    // Extract text from HTML content
                    excerpt = article.content.replace(/<[^>]*>/g, '').substring(0, 150);
                }
                excerpt = excerpt.replace(/"/g, '&quot;').trim();
                if (excerpt.length > 0 && !excerpt.endsWith('...')) {
                    excerpt += '...';
                }

                articles.push({
                    title: (article.title || 'Untitled Article').replace(/"/g, '&quot;'),
                    category: (article.category || 'Guide').toLowerCase().replace(' ', '-'),
                    categoryDisplay: article.category || 'Guide',
                    excerpt: excerpt || 'Financial insights and strategies from Smart Finance Hub.',
                    url: `/articles/2025/09/${slug}.html`,
                    date: new Date(article.metadata?.publishedAt || article.publishDate || Date.now()).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    }),
                    readingTime: article.metadata?.readingTime || Math.ceil(((article.content || '').split(' ').length) / 200) + ' min read',
                    imageId: (index * 137 + 100) % 1000 + 100, // Generate consistent but varied image IDs
                    slug: slug
                });

                console.log(`Processed article: ${article.title} -> ${slug}.html`);
            } catch (e) {
                console.log(`Error processing ${file}:`, e.message);
            }
        }
    });

} catch (error) {
    console.log('Error reading articles directory:', error.message);
}

console.log(`Total articles processed: ${articles.length}`);

// Sort by date (newest first)
articles.sort((a, b) => new Date(b.date) - new Date(a.date));

// Generate unique categories for filters
const categories = [...new Set(articles.map(a => a.categoryDisplay))];
const categoryFilters = categories.map(category =>
    `<button class="category-filter" data-category="${category.toLowerCase().replace(' ', '-')}">${category}</button>`
).join('');

// Generate article cards HTML for ALL articles with proper formatting
const articleCards = articles.map(article => `
        <article class="article-card" data-category="${article.category}">
            <img src="https://picsum.photos/400/250?random=${article.imageId}"
                 alt="${article.title}"
                 class="article-image"
                 loading="lazy">
            <div class="article-content">
                <div class="article-badge">${article.categoryDisplay}</div>
                <h3><a href="${article.url}">${article.title}</a></h3>
                <p class="article-meta">
                    <span class="category">${article.categoryDisplay}</span> •
                    <span class="date">${article.date}</span> •
                    <span class="reading-time">${article.readingTime}</span>
                </p>
                <p class="article-excerpt">${article.excerpt}</p>
                <a href="${article.url}" class="read-more-btn">Read Full Article →</a>
            </div>
        </article>`).join('');

// Read current homepage and update it
let homepage = fs.readFileSync('index.html', 'utf8');

// Update category filters
const filterSectionStart = homepage.indexOf('<div class="category-filters">');
const filterSectionEnd = homepage.indexOf('</div>', filterSectionStart) + 6;

if (filterSectionStart !== -1 && filterSectionEnd !== -1) {
    const before = homepage.substring(0, filterSectionStart);
    const after = homepage.substring(filterSectionEnd);

    homepage = before + `<div class="category-filters">
                    <button class="category-filter active" data-category="all">All Articles</button>
                    ${categoryFilters}
                </div>` + after;
}

// Update articles grid section
const articlesGridStart = homepage.indexOf('<div class="articles-grid" id="articlesGrid">');
const articlesGridEnd = homepage.indexOf('</div>', articlesGridStart) + 6;

if (articlesGridStart !== -1 && articlesGridEnd !== -1) {
    const before = homepage.substring(0, articlesGridStart);
    const after = homepage.substring(articlesGridEnd);

    homepage = before + `<div class="articles-grid" id="articlesGrid">
                    ${articleCards}
                </div>` + after;

    console.log(`✅ Updated homepage with ${articles.length} articles`);
} else {
    console.log('❌ Could not find articles-grid section to update');
}

// Write updated homepage
fs.writeFileSync('index.html', homepage);

// Create comprehensive articles.html page
const allArticlesPage = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>All Articles - Smart Finance Hub VIP</title>
    <meta name="description" content="Complete collection of financial insights, investment strategies, and money management tips from Smart Finance Hub's expert team.">
    <link rel="canonical" href="https://smartfinancehub.vip/articles">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
        }

        .site-header {
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            position: sticky;
            top: 0;
            z-index: 100;
            padding: 1rem 0;
        }

        .main-nav {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo img {
            height: 60px;
            width: auto;
            max-width: 200px;
        }

        .nav-links {
            display: flex;
            list-style: none;
            gap: 2rem;
            margin: 0;
            padding: 0;
        }

        .nav-links a {
            color: #2d3748;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s;
        }

        .nav-links a:hover {
            color: #f59e0b;
        }

        .articles-section {
            max-width: 1200px;
            margin: 4rem auto;
            padding: 0 2rem;
        }

        .page-title {
            text-align: center;
            margin-bottom: 3rem;
        }

        .page-title h1 {
            font-size: 2.5rem;
            color: #2d3748;
            margin-bottom: 1rem;
            font-weight: 700;
        }

        .page-title p {
            font-size: 1.1rem;
            color: #6b7280;
            max-width: 600px;
            margin: 0 auto;
        }

        .articles-stats {
            text-align: center;
            margin-bottom: 3rem;
            padding: 1rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .articles-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 2rem;
            margin-top: 2rem;
        }

        .article-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .article-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .article-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }

        .article-content {
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            flex-grow: 1;
        }

        .article-badge {
            background: #f59e0b;
            color: white;
            font-size: 0.8rem;
            font-weight: 600;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            align-self: flex-start;
            margin-bottom: 1rem;
            text-transform: uppercase;
        }

        .article-content h3 {
            font-size: 1.25rem;
            font-weight: 700;
            line-height: 1.3;
            margin-bottom: 0.75rem;
        }

        .article-content h3 a {
            color: #2d3748;
            text-decoration: none;
            transition: color 0.2s;
        }

        .article-content h3 a:hover {
            color: #f59e0b;
        }

        .article-meta {
            color: #718096;
            font-size: 0.9rem;
            margin-bottom: 1rem;
        }

        .article-meta .category {
            color: #f59e0b;
            font-weight: 500;
        }

        .article-excerpt {
            color: #4a5568;
            line-height: 1.6;
            margin-bottom: 1.5rem;
            flex-grow: 1;
        }

        .read-more-btn {
            background: #f59e0b;
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            text-align: center;
            transition: all 0.2s;
            align-self: flex-start;
        }

        .read-more-btn:hover {
            background: #d97706;
            transform: translateY(-1px);
        }

        .footer {
            background: #2d3748;
            color: white;
            padding: 2rem 0;
            text-align: center;
            margin-top: 4rem;
        }

        .footer p {
            color: #cbd5e0;
        }

        .footer a {
            color: #f59e0b;
            text-decoration: none;
        }

        .footer a:hover {
            color: #fbbf24;
        }

        @media (max-width: 768px) {
            .articles-grid {
                grid-template-columns: 1fr;
            }

            .nav-links {
                display: none;
            }

            .page-title h1 {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <header class="site-header">
        <nav class="main-nav">
            <a href="/" class="logo">
                <img src="/assets/logo/SFH_VIP_Logo.png" alt="Smart Finance Hub VIP">
            </a>
            <ul class="nav-links">
                <li><a href="/">Home</a></li>
                <li><a href="/articles" style="color: #f59e0b; font-weight: 700;">All Articles</a></li>
                <li><a href="/categories">Categories</a></li>
                <li><a href="/about.html">About</a></li>
            </ul>
        </nav>
    </header>

    <main class="articles-section">
        <div class="page-title">
            <h1>All Financial Articles</h1>
            <p>Complete collection of expert financial insights, investment strategies, and money management tips</p>
        </div>

        <div class="articles-stats">
            <p><strong>${articles.length}</strong> expert articles covering <strong>${categories.length}</strong> financial topics</p>
        </div>

        <div class="articles-grid">
            ${articleCards}
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <p>&copy; 2025 Smart Finance Hub VIP. All rights reserved. |
               <a href="/privacy-policy.html">Privacy Policy</a> |
               <a href="/terms.html">Terms of Service</a>
            </p>
        </div>
    </footer>
</body>
</html>`;

fs.writeFileSync('articles.html', allArticlesPage);
console.log(`✅ Created comprehensive articles page with ${articles.length} articles`);

// Verify all homepage URLs point to existing files
console.log('\n=== VERIFYING ALL ARTICLE LINKS ===');
let brokenLinks = 0;
articles.forEach(article => {
    const filename = article.url.replace('/articles/2025/09/', '');
    const filePath = 'articles/2025/09/' + filename;
    const exists = fs.existsSync(filePath);

    if (!exists) {
        console.log(`❌ BROKEN: ${article.url} -> ${filePath}`);
        brokenLinks++;
    } else {
        console.log(`✅ WORKING: ${article.url}`);
    }
});

console.log(`\n=== FINAL SUMMARY ===`);
console.log(`✅ Homepage updated with ${articles.length} articles`);
console.log(`✅ Articles page created with ${articles.length} articles`);
console.log(`✅ ${categories.length} categories: ${categories.join(', ')}`);
console.log(`${brokenLinks === 0 ? '✅' : '❌'} Article links: ${articles.length - brokenLinks}/${articles.length} working`);

if (brokenLinks === 0) {
    console.log('\n🎉 ALL ARTICLE LINKS WORKING! No routing issues detected.');
} else {
    console.log(`\n⚠️  ${brokenLinks} broken article links found. Check file paths.`);
}