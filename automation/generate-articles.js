require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

async function generateMockArticle(index) {
    const topics = [
        'Best High-Yield Savings Accounts for 2025',
        'How to Build an Emergency Fund in 6 Months',
        'Understanding Credit Scores: A Complete Guide',
        'Investment Strategies for Beginners',
        'Debt Consolidation: Pros, Cons, and Best Practices'
    ];
    
    return {
        id: crypto.randomUUID(),
        title: topics[index] || `Financial Planning Guide ${index + 1}`,
        metaDescription: `Learn everything about ${topics[index] || 'financial planning'} with expert tips.`,
        keywords: ['finance', 'money', 'savings', 'investment'],
        introduction: 'This comprehensive guide will help you understand...',
        sections: [
            { heading: 'Introduction', content: 'Getting started with financial planning...' },
            { heading: 'Key Concepts', content: 'Important concepts to understand...' },
            { heading: 'Best Practices', content: 'Follow these proven strategies...' },
            { heading: 'Common Mistakes', content: 'Avoid these pitfalls...' },
            { heading: 'Next Steps', content: 'Take action with these steps...' }
        ],
        conclusion: 'Start your journey to financial freedom today.',
        callToAction: 'Sign up for our newsletter for more tips!',
        qualityScore: 75 + Math.floor(Math.random() * 20),
        qualityBreakdown: {
            readability: 80 + Math.floor(Math.random() * 15),
            originality: 75 + Math.floor(Math.random() * 20),
            seoOptimization: 70 + Math.floor(Math.random() * 20),
            factualAccuracy: 85 + Math.floor(Math.random() * 10),
            userValue: 80 + Math.floor(Math.random() * 15)
        },
        status: 'draft',
        generatedAt: new Date().toISOString()
    };
}

async function generate() {
    console.log('🚀 Generating 5 mock articles...\n');
    
    const draftsPath = path.join(__dirname, '../content/drafts');
    await fs.mkdir(draftsPath, { recursive: true });
    
    for (let i = 0; i < 5; i++) {
        const article = await generateMockArticle(i);
        const filePath = path.join(draftsPath, `${article.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(article, null, 2));
        console.log(`✅ Generated: ${article.title}`);
        console.log(`   Score: ${article.qualityScore}/100\n`);
    }
    
    console.log('✨ Successfully generated 5 articles!');
    console.log('📝 Run "npm run review" to see them in the console');
}

generate().catch(console.error);
