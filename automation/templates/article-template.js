const fs = require('fs').promises;
const path = require('path');

/**
 * Universal Article Template for Smart Finance Hub
 * Creates consistent, professional article pages with SFH VIP branding
 */

function generateArticleHTML(article) {
    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const publishDate = article.metadata?.publishedAt ?
        new Date(article.metadata.publishedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : currentDate;

    const category = article.category || article.metadata?.topic?.category || 'Finance';
    const author = article.metadata?.author || 'Smart Finance Hub Team';
    const readingTime = article.metadata?.readingTime || '5 min read';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title} | Smart Finance Hub</title>
    <meta name="description" content="${article.metaDescription || 'Expert financial insights and strategies from Smart Finance Hub'}">

    <!-- SEO Meta Tags -->
    <meta property="og:title" content="${article.title}">
    <meta property="og:description" content="${article.metaDescription || 'Expert financial insights and strategies'}">
    <meta property="og:url" content="https://smartfinancehub.vip${generateArticleUrl(article)}">
    <meta property="og:type" content="article">
    <meta property="og:image" content="https://smartfinancehub.vip/assets/logo/SFH_VIP_Logo.png">

    <link rel="canonical" href="https://smartfinancehub.vip${generateArticleUrl(article)}">
    <link rel="stylesheet" href="/assets/css/style.css">
    <link rel="stylesheet" href="/assets/css/article.css">

    <!-- ConvertKit Newsletter Integration -->
    <script async data-uid="a1b2c3d4e5" src="https://f.convertkit.com/a1b2c3d4e5/e1f2g3h4i5.js"></script>

    <style>
        /* Enhanced Article Styles with SFH VIP Branding */
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
            width: auto !important;
            max-width: 200px !important;
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

        .article-container {
            max-width: 800px;
            margin: 2rem auto;
            padding: 2rem;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .breadcrumbs {
            margin-bottom: 1rem;
            font-size: 0.9rem;
            color: #6b7280;
        }

        .breadcrumbs a {
            color: #f59e0b;
            text-decoration: none;
        }

        .breadcrumbs a:hover {
            color: #d97706;
        }

        .newsletter-signup {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            border-radius: 12px;
            margin: 3rem 0;
            text-align: center;
        }

        .newsletter-signup h3 {
            color: white !important;
            margin-bottom: 1rem;
        }

        .newsletter-form {
            display: flex;
            gap: 1rem;
            justify-content: center;
            max-width: 400px;
            margin: 0 auto;
        }

        .newsletter-form input {
            flex: 1;
            padding: 0.75rem;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
        }

        .newsletter-form button {
            background: #f59e0b;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }

        .newsletter-form button:hover {
            background: #d97706;
        }

        .related-articles {
            background: #f8fafc;
            padding: 2rem;
            border-radius: 12px;
            margin: 3rem 0;
        }

        .related-articles h3 {
            color: #1f2937 !important;
            margin-bottom: 1rem;
            text-align: center;
        }

        .footer {
            background: #2d3748;
            color: white;
            padding: 3rem 0 2rem 0;
            margin-top: 4rem;
        }

        .footer-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
        }

        .footer-section h4 {
            color: #f59e0b;
            margin-bottom: 1rem;
            font-size: 1.1rem;
        }

        .footer-section a {
            color: #cbd5e0;
            text-decoration: none;
            line-height: 1.8;
            transition: color 0.2s;
        }

        .footer-section a:hover {
            color: #f59e0b;
        }

        .footer-bottom {
            border-top: 1px solid #4a5568;
            margin-top: 2rem;
            padding-top: 2rem;
            text-align: center;
            color: #a0aec0;
        }

        @media (max-width: 768px) {
            .article-container {
                margin: 0;
                border-radius: 0;
                padding: 1rem;
            }

            .newsletter-form {
                flex-direction: column;
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
                <img src="/assets/logo/SFH_VIP_Logo.png" alt="Smart Finance Hub VIP">
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
        <article class="article-container">
            <div class="breadcrumbs">
                <a href="/">Home</a> > <a href="/categories/${category.toLowerCase().replace(' ', '-')}">${category}</a> > ${article.title}
            </div>

            <header class="article-header">
                <h1 class="article-title">${article.title}</h1>
                <div class="article-meta">
                    <div class="article-author">
                        👤 ${author}
                    </div>
                    <div class="article-date">
                        📅 ${publishDate}
                    </div>
                    <div class="article-reading-time">
                        ⏱️ ${readingTime}
                    </div>
                    <a href="/categories/${category.toLowerCase().replace(' ', '-')}" class="article-category">
                        ${category}
                    </a>
                </div>
            </header>

            <div class="article-content">
                ${article.content || ''}
            </div>

            ${article.cta ? `
            <div class="article-cta">
                ${article.cta}
            </div>
            ` : ''}

            <div class="affiliate-disclosure">
                <strong>Affiliate Disclosure:</strong> Smart Finance Hub may earn commissions from affiliate links in this content.
                Our recommendations are based on thorough research and genuine belief in the products' value.
                <a href="/affiliate-disclosure.html" style="color: #f59e0b;">Learn more about our affiliate policy</a>.
            </div>
        </article>

        <div class="newsletter-signup">
            <h3>Get Weekly Financial Insights</h3>
            <p>Join thousands of smart investors getting our weekly newsletter with actionable financial tips.</p>
            <form class="newsletter-form" data-convertkit-form="newsletter">
                <input type="email" placeholder="Enter your email address" required>
                <button type="submit">Subscribe Free</button>
            </form>
        </div>

        <div class="related-articles">
            <h3>You Might Also Like</h3>
            <p>Discover more expert financial insights and strategies to grow your wealth.</p>
            <div style="text-align: center; margin-top: 1rem;">
                <a href="/articles" style="background: #f59e0b; color: white; padding: 0.75rem 2rem; border-radius: 6px; text-decoration: none; font-weight: 500;">Explore All Articles</a>
            </div>
        </div>
    </main>

    <footer class="footer">
        <div class="footer-content">
            <div class="footer-section">
                <h4>Smart Finance Hub</h4>
                <p>AI-driven financial insights and expert strategies for modern investors. Build wealth with confidence.</p>
            </div>
            <div class="footer-section">
                <h4>Quick Links</h4>
                <div style="display: flex; flex-direction: column;">
                    <a href="/">Home</a>
                    <a href="/articles">All Articles</a>
                    <a href="/categories">Categories</a>
                    <a href="/about.html">About</a>
                </div>
            </div>
            <div class="footer-section">
                <h4>Legal</h4>
                <div style="display: flex; flex-direction: column;">
                    <a href="/privacy-policy.html">Privacy Policy</a>
                    <a href="/terms.html">Terms of Service</a>
                    <a href="/affiliate-disclosure.html">Affiliate Disclosure</a>
                    <a href="/contact.html">Contact</a>
                </div>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2025 Smart Finance Hub VIP. All rights reserved. | Professional Financial Education Platform</p>
        </div>
    </footer>

    <script>
    // ConvertKit Integration
    document.addEventListener('DOMContentLoaded', function() {
        const newsletterForm = document.querySelector('.newsletter-form');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const email = this.querySelector('input[type="email"]').value;
                // ConvertKit API integration would go here
                console.log('Newsletter signup:', email);
                alert('Thanks for subscribing! Please check your email to confirm.');
            });
        }
    });
    </script>
</body>
</html>`;
}

function generateArticleUrl(article) {
    if (article.metadata?.publishedAt || article.metadata?.createdAt) {
        const date = new Date(article.metadata.publishedAt || article.metadata.createdAt);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const slug = generateSlug(article.title || 'article');
        return `/articles/${year}/${month}/${slug}.html`;
    }

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

module.exports = { generateArticleHTML, generateArticleUrl };