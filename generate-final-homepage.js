const fs = require('fs');
const path = require('path');

console.log('🎨 Generating final harmonized homepage...');

// Read and process articles with strict formatting
const publishedDir = './content/published';
let articles = [];

try {
    const files = fs.readdirSync(publishedDir);
    console.log(`📄 Found ${files.length} files in published directory`);

    files.forEach((file, index) => {
        if (file.endsWith('.json')) {
            try {
                const content = fs.readFileSync(path.join(publishedDir, file), 'utf8');
                const article = JSON.parse(content);

                // Generate consistent slug from metadata or title
                let slug = '';
                if (article.metadata && article.metadata.slug) {
                    slug = article.metadata.slug;
                } else {
                    slug = (article.title || 'article')
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '')
                        .substring(0, 60);
                }

                // Create standardized excerpt (exactly 120 characters max)
                let rawExcerpt = article.summary || article.metaDescription || '';
                if (!rawExcerpt && article.content) {
                    rawExcerpt = article.content.replace(/<[^>]*>/g, '').trim();
                }
                const excerpt = rawExcerpt.length > 117 ? rawExcerpt.substring(0, 117) + '...' : rawExcerpt + '...';

                // Standardize title length (max 75 characters for 3-line display)
                const title = (article.title || 'Untitled Article').length > 72 ?
                    (article.title || 'Untitled Article').substring(0, 72) + '...' :
                    (article.title || 'Untitled Article');

                // Get consistent category
                const category = article.category || 'Guide';

                articles.push({
                    title: title.replace(/"/g, '&quot;'),
                    category: category,
                    excerpt: excerpt.replace(/"/g, '&quot;'),
                    url: `/articles/2025/09/${slug}`,
                    date: new Date(article.metadata?.publishedAt || article.publishDate || Date.now()).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    }),
                    readingTime: article.metadata?.readingTime || Math.ceil(((article.content || '').split(' ').length) / 200) || 5,
                    imageId: (index % 20) + 1, // Cycle through 20 different images for variety
                    slug: slug
                });

                console.log(`✅ Processed: ${title.substring(0, 50)}...`);
            } catch (error) {
                console.log(`⚠️  Skipped malformed file: ${file}`);
            }
        }
    });

} catch (error) {
    console.log('⚠️  Error reading articles directory, using fallback content');
}

// Sort by date (newest first) and ensure we have content
articles.sort((a, b) => new Date(b.date) - new Date(a.date));
articles = articles.slice(0, 15); // Show max 15 articles for optimal layout

// Add fallback articles if none found
if (articles.length === 0) {
    articles = [
        {
            title: 'The Complete Guide to Tax Optimization Strategies for 2025',
            category: 'Taxes',
            excerpt: 'Discover proven tax optimization strategies and tax deductions tips from financial experts. Learn actionable steps to improve your financial future...',
            url: '/articles/2025/09/tax-optimization-strategies',
            date: 'Sep 23, 2025',
            readingTime: '8 min read',
            imageId: 1
        },
        {
            title: 'Financial Literacy Fundamentals: Master Your Money Basics',
            category: 'Education',
            excerpt: 'Learn about financial literacy basics, from personal finance 101 to investment strategies. Equip yourself with the knowledge to manage and grow...',
            url: '/articles/2025/09/financial-literacy-fundamentals',
            date: 'Sep 22, 2025',
            readingTime: '6 min read',
            imageId: 2
        },
        {
            title: 'Comprehensive Guide to Wealth Building Strategies',
            category: 'Wealth',
            excerpt: 'Discover practical, actionable wealth building strategies to increase your net worth. Develop a millionaire mindset with current trends and expert...',
            url: '/articles/2025/09/wealth-building-strategies',
            date: 'Sep 21, 2025',
            readingTime: '10 min read',
            imageId: 3
        }
    ];
}

// Generate unique categories for filtering
const categories = [...new Set(articles.map(a => a.category))];
console.log(`📊 Categories found: ${categories.join(', ')}`);

// Generate perfectly formatted article cards with strict controls
const articleCards = articles.map(article => `
            <article class="article-card">
                <img src="https://picsum.photos/400/200?random=${article.imageId}"
                     alt="${article.title}"
                     class="article-image">
                <div class="article-content">
                    <span class="article-category">${article.category.toUpperCase()}</span>
                    <h3 class="article-title">
                        <a href="${article.url}">${article.title}</a>
                    </h3>
                    <div class="article-meta">
                        ${article.category.toLowerCase()} • ${article.date} • ${typeof article.readingTime === 'string' ? article.readingTime : article.readingTime + ' min read'}
                    </div>
                    <p class="article-excerpt">${article.excerpt}</p>
                    <a href="${article.url}" class="read-more-btn">Read Full Article →</a>
                </div>
            </article>`).join('');

// Generate category filter buttons
const categoryFilters = categories.map(category =>
    `<button class="category-btn" data-category="${category.toLowerCase()}">${category}</button>`
).join('');

// Generate complete homepage with strict CSS and layout controls
const homepage = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Finance Hub - AI-Driven Financial Insights</title>
    <meta name="description" content="Expert financial advice, investment strategies, and money management tips from Smart Finance Hub's expert team.">
    <meta property="og:title" content="Smart Finance Hub - AI-Driven Financial Insights">
    <meta property="og:description" content="Expert financial advice, investment strategies, and money management tips to help you build wealth and achieve financial freedom.">
    <meta property="og:url" content="https://smartfinancehub.vip">
    <meta property="og:type" content="website">
    <meta property="og:image" content="https://smartfinancehub.vip/assets/logo/SFH_VIP_Logo.png">
    <link rel="canonical" href="https://smartfinancehub.vip">
    <link rel="stylesheet" href="/public/assets/css/homepage-final.css">
</head>
<body>
    <header class="site-header">
        <nav class="main-nav">
            <a href="/" class="logo">
                <img src="/assets/logo/SFH_VIP_Logo.png" alt="Smart Finance Hub VIP">
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
            <p style="font-size: 0.9rem; opacity: 0.8; margin-top: 1rem;">${articles.length} expert articles • Updated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
    </section>

    <main class="articles-section">
        <div class="category-filters">
            <button class="category-btn active" data-category="all">All Articles</button>
            ${categoryFilters}
        </div>

        <div class="articles-grid">
            ${articleCards}
        </div>
    </main>

    <script>
    // Category filtering functionality
    document.addEventListener('DOMContentLoaded', function() {
        const filters = document.querySelectorAll('.category-btn');
        const articles = document.querySelectorAll('.article-card');

        filters.forEach(filter => {
            filter.addEventListener('click', function() {
                // Update active filter
                filters.forEach(f => f.classList.remove('active'));
                this.classList.add('active');

                const category = this.dataset.category;

                // Filter articles
                articles.forEach(article => {
                    const articleCategory = article.querySelector('.article-category').textContent.toLowerCase();

                    if (category === 'all' || articleCategory === category) {
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

fs.writeFileSync('index.html', homepage);
console.log(`✅ Generated perfectly harmonized homepage with ${articles.length} articles`);
console.log(`🎯 All article cards will have uniform 480px height`);
console.log(`📐 All images standardized to 200px height`);
console.log(`📝 All titles, excerpts, and buttons positioned consistently`);
console.log(`📱 Responsive design maintained for mobile devices`);

// Summary
console.log('\n📊 HOMEPAGE HARMONIZATION SUMMARY:');
console.log(`✅ Articles processed: ${articles.length}`);
console.log(`✅ Categories: ${categories.length} (${categories.join(', ')})`);
console.log(`✅ Layout: Uniform card heights enforced`);
console.log(`✅ Typography: Consistent text truncation applied`);
console.log(`✅ Images: Standardized aspect ratios (400x200)`);
console.log(`✅ Spacing: Fixed padding and margins throughout`);