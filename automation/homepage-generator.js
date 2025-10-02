const fs = require('fs').promises;
const path = require('path');

async function generateDynamicHomepage() {
    try {
        console.log('📱 Generating dynamic homepage with latest articles...');

        // Read all published articles
        const publishedDir = path.join(__dirname, '..', 'content', 'published');
        let articles = [];

        try {
            const articleFiles = await fs.readdir(publishedDir);
            console.log(`📄 Found ${articleFiles.length} published articles`);

            // Process each article file
            for (const file of articleFiles) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(publishedDir, file);
                        const content = await fs.readFile(filePath, 'utf8');
                        const article = JSON.parse(content);

                        // Extract essential article data
                        const articleData = {
                            id: article.metadata?.id || file.replace('.json', ''),
                            title: article.title?.replace(/"/g, '') || 'Untitled',
                            summary: article.metaDescription?.replace(/"/g, '') || 'Financial insights and strategies',
                            category: article.category || article.metadata?.topic?.category || 'Finance',
                            publishDate: article.metadata?.publishedAt || article.metadata?.createdAt || new Date().toISOString(),
                            readingTime: article.metadata?.readingTime || '5 min read',
                            url: generateArticleUrl(article),
                            contentType: article.metadata?.topic?.contentType?.name || 'Guide'
                        };

                        articles.push(articleData);
                    } catch (error) {
                        console.log(`⚠️  Skipping malformed article: ${file}`);
                    }
                }
            }
        } catch (error) {
            console.log(`⚠️  No published directory found, using fallback content`);

            // Fallback articles if no published content
            articles = [
                {
                    id: 'savings-accounts',
                    title: 'Best High-Yield Savings Accounts for 2025',
                    summary: 'Compare top savings accounts with highest interest rates and best features for 2025',
                    category: 'Banking',
                    publishDate: '2025-03-15',
                    readingTime: '8 min read',
                    url: '/articles/savings-accounts-2025.html',
                    contentType: 'Guide'
                },
                {
                    id: 'debt-consolidation',
                    title: 'Credit Card Debt Consolidation Strategies',
                    summary: 'Proven methods to consolidate credit card debt and save thousands in interest',
                    category: 'Debt Management',
                    publishDate: '2025-03-12',
                    readingTime: '12 min read',
                    url: '/articles/debt-consolidation.html',
                    contentType: 'Strategy Guide'
                },
                {
                    id: 'index-funds',
                    title: 'Index Fund Investing for Beginners',
                    summary: 'Complete guide to building wealth with index funds and passive investing',
                    category: 'Investing',
                    publishDate: '2025-03-10',
                    readingTime: '10 min read',
                    url: '/articles/index-fund-investing.html',
                    contentType: 'Beginner Guide'
                }
            ];
        }

        // Sort by date and get latest 12 articles
        articles.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
        const latestArticles = articles.slice(0, 12);

        console.log(`🎯 Selected ${latestArticles.length} latest articles for homepage`);

        // Generate dynamic homepage HTML
        const homepage = generateHomepageHTML(latestArticles);
        const homepagePath = path.join(__dirname, '..', 'index.html');
        await fs.writeFile(homepagePath, homepage);

        console.log('✅ Dynamic homepage generated successfully!');
        return { success: true, articlesCount: latestArticles.length };

    } catch (error) {
        console.error('❌ Error generating dynamic homepage:', error);
        throw error;
    }
}

function generateArticleUrl(article) {
    // Generate proper article URL based on article data
    if (article.metadata?.publishedAt || article.metadata?.createdAt) {
        const date = new Date(article.metadata.publishedAt || article.metadata.createdAt);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const slug = generateSlug(article.title || 'article');
        return `/articles/${year}/${month}/${slug}.html`;
    }

    // Fallback URL generation
    const slug = generateSlug(article.title || 'article');
    return `/articles/${slug}.html`;
}

function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

function generateHomepageHTML(articles) {
    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const articleCards = articles.map((article, index) => `
        <article class="article-card" data-category="${article.category.toLowerCase().replace(' ', '-')}">
            <img src="https://picsum.photos/400/250?random=${index + 100}"
                 alt="${article.title}"
                 class="article-image"
                 loading="lazy">
            <div class="article-content">
                <div class="article-badge">${article.contentType}</div>
                <h3><a href="${article.url}">${article.title}</a></h3>
                <p class="article-meta">
                    <span class="category">${article.category}</span> •
                    <span class="date">${new Date(article.publishDate).toLocaleDateString()}</span> •
                    <span class="reading-time">${article.readingTime}</span>
                </p>
                <p class="article-excerpt">${article.summary}</p>
                <a href="${article.url}" class="read-more-btn">Read Full Article →</a>
            </div>
        </article>
    `).join('');

    const categoryFilters = [...new Set(articles.map(a => a.category))].map(category =>
        `<button class="category-filter" data-category="${category.toLowerCase().replace(' ', '-')}">${category}</button>`
    ).join('');

    return `<!DOCTYPE html>
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
    <link rel="stylesheet" href="/assets/css/style.css">
    <style>
    /* Dynamic Homepage Styles */
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
    }

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
    }

    .category-filter:hover,
    .category-filter.active {
        background: #f59e0b;
        color: white;
        border-color: #f59e0b;
    }

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
        transition: transform 0.2s, box-shadow 0.2s;
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
    }

    .article-content h3 {
        margin-bottom: 0.75rem;
        font-size: 1.25rem;
        line-height: 1.4;
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
    }

    .read-more-btn {
        background: #f59e0b;
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 500;
        display: inline-block;
        transition: background 0.2s;
    }

    .read-more-btn:hover {
        background: #d97706;
    }

    .footer {
        background: #2d3748;
        color: white;
        padding: 2rem 0;
        text-align: center;
        margin-top: 4rem;
    }

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
                    <p class="last-updated">Latest insights updated ${currentDate}</p>
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
               <a href="/privacy-policy.html" style="color: #f59e0b;">Privacy Policy</a> |
               <a href="/terms.html" style="color: #f59e0b;">Terms of Service</a>
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
}

// Run if called directly
if (require.main === module) {
    generateDynamicHomepage().catch(console.error);
}

module.exports = { generateDynamicHomepage };