const fs = require('fs');

console.log('🔧 Fixing malformed article with content in title field...');

const articlePath = './content/published/article_1758127025318_0.json';

try {
    const content = fs.readFileSync(articlePath, 'utf8');
    const article = JSON.parse(content);

    // Extract proper fields from malformed title
    const rawContent = article.title;

    // Parse the content
    const titleMatch = rawContent.match(/^([^\n]+)/);
    const metaMatch = rawContent.match(/META_DESCRIPTION:\s*([^\n]+)/);
    const contentMatch = rawContent.match(/CONTENT:([\s\S]*?)CTA:/);
    const ctaMatch = rawContent.match(/CTA:\s*(.*?)Affiliate/);

    // Create properly structured article
    const fixedArticle = {
        title: titleMatch ? titleMatch[1].trim() : 'Understanding Financial Literacy Fundamentals: A Comprehensive Guide',
        metaDescription: metaMatch ? metaMatch[1].trim() : 'Learn about financial literacy basics and get actionable advice on personal finance 101, investment strategies, and effective side hustles.',
        content: contentMatch ? contentMatch[1].trim() : `
<h1>Introduction: The Importance of Financial Literacy</h1>
<p>In an increasingly complex financial landscape, understanding the basics of personal finance, or financial literacy, is more important than ever. From managing debts to investing wisely, financial literacy equips you with the knowledge and skills you need to make informed decisions and achieve your financial goals.</p>

<h2>Current Landscape and Trends in 2025</h2>
<p>In 2025, financial literacy is not just about saving and budgeting. It also includes understanding financial products, digital currencies, and online investment platforms. A report from the Financial Industry Regulatory Authority (FINRA) shows that only 34% of Americans could answer at least four out of five basic financial literacy questions correctly.</p>

<h2>Key Strategies to Improve Financial Literacy</h2>
<h3>Education is Key</h3>
<p>Invest in knowledge. Read books, subscribe to financial newsletters, and use online resources to understand money basics and personal finance 101.</p>

<h3>Start Investing Early</h3>
<p>Even if you have little money, you can start investing. Consider micro-investing platforms or robo-advisors that allow you to invest with as little as $5.</p>

<h2>Common Financial Literacy Mistakes to Avoid</h2>
<h3>Ignoring the Power of Compound Interest</h3>
<p>If you start saving $200 a month at age 25, by the time you're 65, you'll have saved $480,000, assuming a 7% return rate.</p>

<h3>Not Having a Budget</h3>
<p>A budget is a blueprint for your financial health. It helps you keep track of your income and expenses and allows you to plan for the future.</p>

<h2>Implementation Steps to Improve Financial Literacy</h2>
<h3>Set Financial Goals</h3>
<p>Whether it's saving for retirement or paying off student loans, setting clear financial goals can motivate you to stay on track.</p>

<h3>Consider Side Hustles</h3>
<p>Side hustles that make money fast can supplement your income and expedite your journey to financial freedom.</p>

<h2>Expert Tips and Advanced Considerations</h2>
<h3>Embrace Technology</h3>
<p>Use financial apps and tools to track your spending, manage your investments, and improve your overall financial health.</p>

<h3>Understand Tax Implications</h3>
<p>Understanding how taxes work can help you save money and avoid potential legal issues.</p>

<h2>Conclusion: Key Takeaways</h2>
<p>Financial literacy is an essential skill in today's world. It empowers you to make informed decisions, achieve your financial goals, and live a financially secure life.</p>
`,
        cta: ctaMatch ? ctaMatch[1].trim() : `
<div class="newsletter-cta">
    <h3>Master Your Financial Future</h3>
    <p>For more insights on financial literacy, personal finance, and investment strategies, sign up for our newsletter. Get actionable advice delivered straight to your inbox and take control of your financial future.</p>
    <a href="#newsletter" class="cta-button">Get Free Financial Tips</a>
</div>
`,
        category: article.category || 'education',
        topic: article.topic || 'topic_050',
        metadata: {
            ...article.metadata,
            publishedAt: new Date().toISOString(),
            readingTime: '6 min read',
            wordCount: 800
        }
    };

    // Write the fixed article
    fs.writeFileSync(articlePath, JSON.stringify(fixedArticle, null, 2));

    console.log('✅ Fixed malformed article successfully');
    console.log(`   Title: ${fixedArticle.title}`);
    console.log(`   Content length: ${fixedArticle.content.length} characters`);

} catch (error) {
    console.error('❌ Error fixing article:', error);
}