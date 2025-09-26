const fs = require('fs');
const path = require('path');

console.log('🔧 Forcing completely uniform homepage structure...');

// Read ALL published articles
const publishedDir = './content/published';
let allArticles = [];

try {
    const files = fs.readdirSync(publishedDir);

    files.forEach((file, index) => {
        if (file.endsWith('.json')) {
            try {
                const content = fs.readFileSync(path.join(publishedDir, file), 'utf8');
                const article = JSON.parse(content);

                // Force standardized data structure
                const slug = (article.slug || article.title || 'article-' + index)
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '')
                    .substring(0, 50);

                // Standardize all text lengths EXACTLY
                const title = (article.title || 'Financial Article').length > 70 ?
                    (article.title || 'Financial Article').substring(0, 67) + '...' :
                    (article.title || 'Financial Article');

                const excerpt = (article.summary || article.metaDescription || article.content || 'Expert financial advice...')
                    .replace(/<[^>]*>/g, '') // Remove HTML tags
                    .substring(0, 120) + '...';

                const category = (article.category || 'FINANCE').toUpperCase();

                allArticles.push({
                    title: title,
                    category: category,
                    excerpt: excerpt,
                    url: `/articles/2025/09/${slug}`,
                    date: new Date(article.publishDate || Date.now()).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    }),
                    readingTime: Math.max(3, Math.min(15, Math.ceil(((article.content || '').split(' ').length) / 200))),
                    imageId: (index % 50) + 1 // Use different images
                });
            } catch (e) {
                console.log(`Error processing ${file}: ${e.message}`);
            }
        }
    });
} catch (error) {
    console.log('Error reading published directory:', error.message);
}

// If no articles found, create sample data
if (allArticles.length === 0) {
    allArticles = [
        {
            title: 'The Complete Guide to Tax Optimization Strategies',
            category: 'TAXES',
            excerpt: 'Discover proven tax optimization strategies and tax deductions tips from financial experts. Learn actionable steps...',
            url: '/articles/2025/09/tax-optimization-strategies',
            date: 'Sep 23, 2025',
            readingTime: 8,
            imageId: 1
        },
        {
            title: 'Comprehensive Guide to Wealth Building Strategies',
            category: 'WEALTH',
            excerpt: 'Learn practical, actionable wealth building strategies to increase your net worth with current trends...',
            url: '/articles/2025/09/wealth-building-strategies',
            date: 'Sep 22, 2025',
            readingTime: 10,
            imageId: 2
        }
    ];
}

console.log(`Processing ${allArticles.length} articles with uniform structure`);

// Generate ABSOLUTELY UNIFORM article cards - NO EXCEPTIONS
const generateUniformCard = (article) => `
            <article class="uniform-article-card">
                <div class="uniform-image-container">
                    <img src="https://picsum.photos/400/240?random=${article.imageId}"
                         alt="${article.title.replace(/"/g, '&quot;')}"
                         class="uniform-article-image">
                </div>
                <div class="uniform-card-content">
                    <div class="uniform-category-badge">${article.category}</div>
                    <h3 class="uniform-article-title">
                        <a href="${article.url}">${article.title}</a>
                    </h3>
                    <div class="uniform-article-meta">
                        ${article.category.toLowerCase()} • ${article.date} • ${article.readingTime} min read
                    </div>
                    <p class="uniform-article-excerpt">${article.excerpt}</p>
                    <div class="uniform-button-container">
                        <a href="${article.url}" class="uniform-read-more-btn">Read Full Article →</a>
                    </div>
                </div>
            </article>`;

const articleCards = allArticles.map(generateUniformCard).join('');

// Generate complete homepage with embedded uniform CSS
const completeHomepage = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Finance Hub - AI-Driven Financial Insights</title>
    <meta name="description" content="Expert financial advice, investment strategies, and money management tips.">
    <style>
        /* RESET - Force uniform baseline */
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
        }

        /* HEADER */
        .site-header {
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .main-nav {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo img { height: 60px; width: auto; }

        .nav-links {
            display: flex;
            list-style: none;
            gap: 2rem;
        }

        .nav-links a {
            color: #333;
            text-decoration: none;
            font-weight: 500;
        }

        /* HERO SECTION */
        .hero-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 4rem 2rem;
            text-align: center;
        }

        .hero-content h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            font-weight: 700;
        }

        .hero-content p {
            font-size: 1.2rem;
            opacity: 0.9;
        }

        /* ARTICLES SECTION */
        .articles-section {
            max-width: 1200px;
            margin: 3rem auto;
            padding: 0 2rem;
        }

        /* FORCE UNIFORM GRID - NO EXCEPTIONS */
        .uniform-articles-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
            gap: 2rem;
            margin-top: 2rem;
        }

        /* UNIFORM ARTICLE CARDS - IDENTICAL STRUCTURE */
        .uniform-article-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            display: flex;
            flex-direction: column;

            /* FORCE EXACT SAME HEIGHT */
            height: 500px !important;
            min-height: 500px !important;
            max-height: 500px !important;
        }

        .uniform-article-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        /* UNIFORM IMAGE CONTAINER */
        .uniform-image-container {
            width: 100%;
            height: 240px !important;
            min-height: 240px !important;
            max-height: 240px !important;
            overflow: hidden;
        }

        .uniform-article-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
            display: block;
        }

        /* UNIFORM CONTENT CONTAINER */
        .uniform-card-content {
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            flex-grow: 1;
            height: 260px !important;
            min-height: 260px !important;
            max-height: 260px !important;
        }

        /* UNIFORM CATEGORY BADGE */
        .uniform-category-badge {
            background: #f7931e;
            color: white;
            font-size: 0.75rem;
            font-weight: 600;
            padding: 0.3rem 0.8rem;
            border-radius: 20px;
            align-self: flex-start;
            margin-bottom: 1rem;
            text-transform: uppercase;
            white-space: nowrap;
        }

        /* UNIFORM TITLE */
        .uniform-article-title {
            font-size: 1.2rem;
            font-weight: 700;
            line-height: 1.3;
            margin-bottom: 0.8rem;

            /* FORCE EXACT HEIGHT */
            height: 65px !important;
            min-height: 65px !important;
            max-height: 65px !important;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
        }

        .uniform-article-title a {
            color: #2d3748;
            text-decoration: none;
        }

        .uniform-article-title a:hover {
            color: #f7931e;
        }

        /* UNIFORM META */
        .uniform-article-meta {
            color: #718096;
            font-size: 0.85rem;
            margin-bottom: 1rem;
            height: 20px !important;
            min-height: 20px !important;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* UNIFORM EXCERPT */
        .uniform-article-excerpt {
            color: #4a5568;
            line-height: 1.5;
            font-size: 0.9rem;

            /* FORCE EXACT HEIGHT */
            height: 80px !important;
            min-height: 80px !important;
            max-height: 80px !important;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 4;
            -webkit-box-orient: vertical;
            margin-bottom: 1rem;
        }

        /* UNIFORM BUTTON CONTAINER */
        .uniform-button-container {
            margin-top: auto;
            height: 40px !important;
            min-height: 40px !important;
            display: flex;
            align-items: center;
        }

        .uniform-read-more-btn {
            background: #f7931e;
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.85rem;
            white-space: nowrap;
            transition: background-color 0.2s ease;
        }

        .uniform-read-more-btn:hover {
            background: #e6851a;
        }

        /* MOBILE RESPONSIVE */
        @media (max-width: 768px) {
            .uniform-articles-grid {
                grid-template-columns: 1fr;
                gap: 1.5rem;
            }

            .hero-content h1 {
                font-size: 2rem;
            }

            .uniform-article-card {
                height: 480px !important;
            }

            .uniform-card-content {
                height: 240px !important;
            }
        }

        /* OVERRIDE ANY OTHER STYLES */
        .uniform-article-card * {
            max-width: 100%;
        }
    </style>
</head>
<body>
    <header class="site-header">
        <nav class="main-nav">
            <a href="/" class="logo">
                <img src="/assets/logo/SFH_VIP_Logo.png" alt="Smart Finance Hub">
            </a>
            <ul class="nav-links">
                <li><a href="/">Home</a></li>
                <li><a href="/articles">All Articles</a></li>
                <li><a href="/categories">Categories</a></li>
                <li><a href="/about">About</a></li>
            </ul>
        </nav>
    </header>

    <section class="hero-section">
        <div class="hero-content">
            <h1>Latest Financial Insights</h1>
            <p>Discover expert strategies, market analysis, and practical tips to grow your wealth</p>
        </div>
    </section>

    <main class="articles-section">
        <div class="uniform-articles-grid">
            ${articleCards}
        </div>
    </main>
</body>
</html>`;

// Write the uniform homepage
fs.writeFileSync('index.html', completeHomepage);
console.log(`✅ Generated completely uniform homepage with ${allArticles.length} identical article cards`);

// Also update articles.html with same uniform structure
const articlesPage = completeHomepage.replace(
    '<title>Smart Finance Hub - AI-Driven Financial Insights</title>',
    '<title>All Articles - Smart Finance Hub</title>'
).replace(
    '<h1>Latest Financial Insights</h1>',
    '<h1>All Articles</h1>'
).replace(
    '<p>Discover expert strategies, market analysis, and practical tips to grow your wealth</p>',
    '<p>Complete collection of financial insights and strategies</p>'
);

fs.writeFileSync('articles.html', articlesPage);
console.log('✅ Generated uniform articles.html page');