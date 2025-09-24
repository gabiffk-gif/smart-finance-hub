const fs = require('fs');
const path = require('path');

console.log('🚨 EMERGENCY HOMEPAGE FIX STARTING...');

// Read published articles
const publishedDir = './content/published';
let articles = [];

try {
    const files = fs.readdirSync(publishedDir);
    console.log(`📄 Found ${files.length} files in published directory`);

    files.forEach(file => {
        if (file.endsWith('.json')) {
            try {
                const content = fs.readFileSync(path.join(publishedDir, file), 'utf8');
                const article = JSON.parse(content);

                // Create clean article data
                articles.push({
                    title: (article.title || 'Untitled Article').replace(/"/g, ''),
                    category: (article.category || 'Guide').toLowerCase().replace(' ', '-'),
                    categoryDisplay: article.category || 'Guide',
                    excerpt: ((article.summary || article.metaDescription || '').substring(0, 150) + '...').replace(/"/g, ''),
                    url: `/articles/2025/09/${generateSlug(article.title || file.replace('.json', ''))}.html`,
                    date: new Date(article.metadata?.publishedAt || article.publishDate || Date.now()).toLocaleDateString(),
                    readingTime: article.metadata?.readingTime || '5 min read',
                    imageId: Math.floor(Math.random() * 1000) + 100
                });
            } catch (error) {
                console.log(`⚠️  Skipping malformed file: ${file}`);
            }
        }
    });

    // Sort and limit to 9 articles
    articles = articles.slice(0, 9);
    console.log(`✅ Processed ${articles.length} articles successfully`);

} catch (error) {
    console.log('⚠️  Error reading articles, creating sample articles');
    // Create sample articles if reading fails
    articles = [
        {
            title: 'The Complete Guide to Tax Optimization Strategies',
            category: 'taxes',
            categoryDisplay: 'Taxes',
            excerpt: 'Discover proven tax optimization strategies and tax deductions tips from financial experts. Learn how to minimize your tax burden legally...',
            url: '/articles/2025/09/tax-optimization-strategies.html',
            date: '9/23/2025',
            readingTime: '8 min read',
            imageId: 101
        },
        {
            title: 'Comprehensive Guide to Wealth Building',
            category: 'wealth',
            categoryDisplay: 'Wealth',
            excerpt: 'Learn practical, actionable wealth building strategies to increase your net worth and achieve financial independence...',
            url: '/articles/2025/09/wealth-building-guide.html',
            date: '9/22/2025',
            readingTime: '10 min read',
            imageId: 102
        },
        {
            title: 'Financial Literacy Fundamentals',
            category: 'education',
            categoryDisplay: 'Education',
            excerpt: 'Master the basics of personal finance and investment strategies with this comprehensive guide to financial literacy...',
            url: '/articles/2025/09/financial-literacy-basics.html',
            date: '9/21/2025',
            readingTime: '6 min read',
            imageId: 103
        }
    ];
}

// Generate article cards HTML with proper formatting
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

// Generate unique categories for filters
const categories = [...new Set(articles.map(a => a.categoryDisplay))];
const categoryFilters = categories.map(category =>
    `<button class="category-filter" data-category="${category.toLowerCase().replace(' ', '-')}">${category}</button>`
).join('');

// Create complete homepage HTML with embedded CSS
const homepageHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Finance Hub - AI-Driven Financial Insights & Expert Strategies</title>
    <meta name="description" content="Get expert financial advice, investment strategies, and money management tips powered by AI. Build wealth and achieve financial freedom with Smart Finance Hub.">

    <!-- SEO Meta Tags -->
    <meta property="og:title" content="Smart Finance Hub - AI-Driven Financial Insights">
    <meta property="og:description" content="Expert financial advice, investment strategies, and money management tips to help you build wealth and achieve financial freedom.">
    <meta property="og:url" content="https://smartfinancehub.vip">
    <meta property="og:type" content="website">
    <meta property="og:image" content="https://smartfinancehub.vip/assets/logo/SFH_VIP_Logo.png">

    <link rel="canonical" href="https://smartfinancehub.vip">
    <style>
    /* Reset and Base Styles */
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        background: #f8f9fa;
    }

    /* Header Styles */
    .site-header {
        background: #ffffff;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        padding: 1rem 0;
        position: sticky;
        top: 0;
        z-index: 100;
    }

    .site-header .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .logo img {
        height: 60px !important;
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

    /* Hero Section */
    .hero-section {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 4rem 0;
        text-align: center;
    }

    .hero-content h1 {
        font-size: 3rem;
        margin-bottom: 1rem;
        font-weight: 700;
    }

    .hero-content p {
        font-size: 1.25rem;
        margin-bottom: 2rem;
        opacity: 0.9;
    }

    .last-updated {
        font-size: 1rem;
        opacity: 0.8;
    }

    /* Articles Section */
    .articles-section {
        padding: 3rem 0;
        background: #f8fafc;
    }

    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
    }

    .section-header {
        text-align: center;
        margin-bottom: 3rem;
    }

    .section-header h2 {
        font-size: 2.5rem;
        color: #2d3748;
        margin-bottom: 1rem;
        font-weight: 700;
    }

    .section-header p {
        font-size: 1.1rem;
        color: #6b7280;
        max-width: 600px;
        margin: 0 auto;
    }

    /* Category Filters */
    .category-filters {
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin-bottom: 3rem;
        flex-wrap: wrap;
    }

    .category-filter {
        background: white;
        border: 2px solid #e2e8f0;
        color: #4a5568;
        padding: 0.5rem 1.5rem;
        border-radius: 25px;
        cursor: pointer;
        transition: all 0.2s;
        font-weight: 500;
        font-size: 0.95rem;
    }

    .category-filter:hover,
    .category-filter.active {
        background: #f59e0b;
        color: white;
        border-color: #f59e0b;
    }

    /* Articles Grid */
    .articles-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 2rem;
    }

    .article-card {
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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
        padding: 0.25rem 0.75rem;
        border-radius: 15px;
        font-size: 0.8rem;
        font-weight: 600;
        display: inline-block;
        margin-bottom: 1rem;
        width: fit-content;
        text-transform: uppercase;
    }

    .article-content h3 {
        margin-bottom: 0.75rem;
        font-size: 1.25rem;
        line-height: 1.4;
        font-weight: 700;
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
        font-weight: 500;
        display: inline-block;
        transition: all 0.2s;
        text-align: center;
        width: fit-content;
    }

    .read-more-btn:hover {
        background: #d97706;
        transform: translateY(-1px);
    }

    /* Footer */
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

    /* Responsive Design */
    @media (max-width: 768px) {
        .hero-content h1 {
            font-size: 2rem;
        }

        .articles-grid {
            grid-template-columns: 1fr;
        }

        .nav-links {
            display: none;
        }

        .category-filters {
            padding: 0 1rem;
        }

        .container {
            padding: 0 1rem;
        }
    }
    </style>
</head>
<body>
    <header class="site-header">
        <div class="container">
            <a href="/" class="logo">
                <img src="/assets/logo/SFH_VIP_Logo.png" alt="Smart Finance Hub">
            </a>
            <nav>
                <ul class="nav-links">
                    <li><a href="/">Home</a></li>
                    <li><a href="/articles">All Articles</a></li>
                    <li><a href="/categories">Categories</a></li>
                    <li><a href="/about.html">About</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <main>
        <section class="hero-section">
            <div class="container">
                <div class="hero-content">
                    <h1>Smart Finance Hub</h1>
                    <p>AI-driven financial insights and expert strategies for modern investors</p>
                    <p class="last-updated">Latest insights updated ${new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}</p>
                </div>
            </div>
        </section>

        <section class="articles-section">
            <div class="container">
                <div class="section-header">
                    <h2>Latest Financial Insights</h2>
                    <p>Discover expert strategies, market analysis, and practical tips to grow your wealth</p>
                </div>

                <div class="category-filters">
                    <button class="category-filter active" data-category="all">All Articles</button>
                    ${categoryFilters}
                </div>

                <div class="articles-grid" id="articlesGrid">
                    ${articleCards}
                </div>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="container">
            <p>&copy; 2025 Smart Finance Hub. All rights reserved. |
               <a href="/privacy-policy.html">Privacy Policy</a> |
               <a href="/terms.html">Terms of Service</a>
            </p>
        </div>
    </footer>

    <script>
    // Category filtering functionality
    document.addEventListener('DOMContentLoaded', function() {
        const filters = document.querySelectorAll('.category-filter');
        const articles = document.querySelectorAll('.article-card');

        filters.forEach(filter => {
            filter.addEventListener('click', function() {
                // Update active filter
                filters.forEach(f => f.classList.remove('active'));
                this.classList.add('active');

                const category = this.dataset.category;

                // Filter articles
                articles.forEach(article => {
                    if (category === 'all' || article.dataset.category === category) {
                        article.style.display = 'block';
                    } else {
                        article.style.display = 'none';
                    }
                });
            });
        });
    });
    </script>
</body>
</html>`;

// Write the fixed homepage
fs.writeFileSync('index.html', homepageHTML);
console.log(`✅ EMERGENCY FIX COMPLETE: Generated homepage with ${articles.length} article cards`);
console.log('🎯 Homepage now has proper grid layout with article cards');

function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}