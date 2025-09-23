require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;
const ContentGenerator = require('./automation/content-generator/generator');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function colorLog(color, message) {
    console.log(colors[color] + message + colors.reset);
}

async function testContentGeneration() {
    console.log('\n' + '='.repeat(60));
    colorLog('cyan', '🧪 Smart Finance Hub Content Generation Test');
    console.log('='.repeat(60));
    
    try {
        // 1. Load the ContentGenerator
        colorLog('blue', '\n📥 Loading ContentGenerator...');
        const contentGenerator = new ContentGenerator();
        
        // Wait for configurations to load
        colorLog('blue', '🔧 Loading configurations...');
        await contentGenerator.loadConfigurations();
        colorLog('green', '✅ ContentGenerator loaded successfully');
        
        // Check if drafts directory exists
        const draftsDir = path.join(__dirname, 'content', 'drafts');
        try {
            await fs.access(draftsDir);
        } catch (error) {
            colorLog('yellow', '📁 Creating drafts directory...');
            await fs.mkdir(draftsDir, { recursive: true });
            colorLog('green', '✅ Drafts directory created');
        }
        
        // 2. Generate 1 test article
        colorLog('blue', '\n🤖 Generating test article...');
        colorLog('yellow', '⏳ This may take 30-60 seconds...');
        
        // Generate the article (ContentGenerator will select a topic automatically)
        colorLog('magenta', '📝 ContentGenerator will select a topic automatically based on priority');
        
        const startTime = Date.now();
        const articles = await contentGenerator.generateArticles(1);
        const article = articles[0];
        const generationTime = ((Date.now() - startTime) / 1000).toFixed(2);
        
        colorLog('green', `✅ Article generated successfully in ${generationTime} seconds`);
        
        // 3. Display the article content and quality score
        console.log('\n' + '='.repeat(60));
        colorLog('cyan', '📊 ARTICLE DETAILS');
        console.log('='.repeat(60));
        
        colorLog('white', `📰 Title: ${article.title || 'N/A'}`);
        colorLog('white', `📂 Category: ${article.metadata?.topic?.category || 'N/A'}`);
        colorLog('white', `👤 Author: ${article.author || 'Smart Finance Hub'}`);
        colorLog('white', `📅 Created: ${new Date(article.metadata?.createdAt || Date.now()).toLocaleString()}`);
        colorLog('white', `🔗 Slug: ${article.slug || 'N/A'}`);
        colorLog('white', `📏 Word Count: ${article.metadata?.wordCount || 'N/A'} words`);
        colorLog('white', `⏱️  Reading Time: ${article.metadata?.readingTime || 'N/A'}`);
        
        // Quality Score Breakdown
        console.log('\n' + '-'.repeat(40));
        colorLog('cyan', '🎯 QUALITY SCORE BREAKDOWN');
        console.log('-'.repeat(40));
        
        const qualityScore = article.metadata?.qualityScore || 0;
        const overallScore = qualityScore;
        
        // Color-code the overall score
        let scoreColor = 'red';
        if (overallScore >= 80) scoreColor = 'green';
        else if (overallScore >= 60) scoreColor = 'yellow';
        
        colorLog(scoreColor, `🏆 Overall Score: ${overallScore}/100`);
        
        colorLog('white', `🎯 This is a basic quality score - detailed breakdown available in review console`);
        
        // Keywords Details
        console.log('\n' + '-'.repeat(40));
        colorLog('cyan', '🔍 KEYWORD TARGETING');
        console.log('-'.repeat(40));
        
        const keywords = article.metadata?.targetKeywords;
        if (keywords) {
            colorLog('white', `🎯 Primary Keywords: ${keywords.primary?.join(', ') || 'N/A'}`);
            colorLog('white', `📝 Long-tail Keywords: ${keywords.longTail?.join(', ') || 'N/A'}`);
            colorLog('white', `🎯 Target Keyword: ${keywords.target || 'N/A'}`);
        } else {
            colorLog('white', `🔍 Keywords will be shown in the review console`);
        }
        
        // Content Preview
        console.log('\n' + '-'.repeat(40));
        colorLog('cyan', '📖 CONTENT PREVIEW (First 300 characters)');
        console.log('-'.repeat(40));
        
        const contentPreview = article.content.substring(0, 300) + '...';
        colorLog('white', contentPreview);
        
        // Topic Information
        console.log('\n' + '-'.repeat(40));
        colorLog('cyan', '📋 TOPIC INFORMATION');
        console.log('-'.repeat(40));
        
        const topicInfo = article.metadata?.topic;
        if (topicInfo) {
            colorLog('white', `📰 Topic: ${topicInfo.title || 'N/A'}`);
            colorLog('white', `📂 Category: ${topicInfo.category || 'N/A'}`);
            colorLog('white', `⭐ Priority: ${topicInfo.priority || 'N/A'}`);
        } else {
            colorLog('white', `📋 Topic details available in review console`);
        }
        
        // 4. Save it to content/drafts/
        colorLog('blue', '\n💾 Saving article to drafts...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const slug = article.slug || article.metadata?.id || 'test-article';
        const filename = `${slug}_${timestamp}.json`;
        const filePath = path.join(draftsDir, filename);
        
        // Save as JSON with proper formatting
        const articleData = {
            ...article,
            generatedAt: new Date().toISOString(),
            generationTime: `${generationTime}s`,
            testGeneration: true
        };
        
        await fs.writeFile(filePath, JSON.stringify(articleData, null, 2), 'utf8');
        colorLog('green', `✅ Article saved to: ${filePath}`);
        
        // Also save as HTML for preview
        const htmlFilename = `${slug}_${timestamp}.html`;
        const htmlFilePath = path.join(draftsDir, htmlFilename);
        
        // Load the article template
        const templatePath = path.join(__dirname, 'automation', 'templates', 'article-template.html');
        let htmlTemplate;
        
        try {
            htmlTemplate = await fs.readFile(templatePath, 'utf8');
            
            // Replace template variables with article data
            const htmlContent = htmlTemplate
                .replace(/\$\{title\}/g, article.title || 'Test Article')
                .replace(/\$\{description\}/g, article.metaDescription || 'Generated test article')
                .replace(/\$\{keywords\}/g, article.metadata?.targetKeywords?.primary?.join(', ') || '')
                .replace(/\$\{author\}/g, article.author || 'Smart Finance Hub')
                .replace(/\$\{content\}/g, article.content || 'Content will be available in review console')
                .replace(/\$\{publishedDate\}/g, article.metadata?.createdAt || new Date().toISOString())
                .replace(/\$\{modifiedDate\}/g, article.metadata?.createdAt || new Date().toISOString())
                .replace(/\$\{categoryName\}/g, article.metadata?.topic?.category || 'Finance')
                .replace(/\$\{readingTime\}/g, article.metadata?.readingTime || '5 min read')
                .replace(/\$\{wordCount\}/g, article.metadata?.wordCount || '1500')
                .replace(/\$\{url\}/g, `https://smartfinancehub.vip/articles/${slug}`)
                .replace(/\$\{featuredImage\}/g, `/images/${slug}-featured.jpg`)
                .replace(/\$\{currentYear\}/g, new Date().getFullYear());
            
            await fs.writeFile(htmlFilePath, htmlContent, 'utf8');
            colorLog('green', `✅ HTML preview saved to: ${htmlFilePath}`);
            
        } catch (error) {
            colorLog('yellow', '⚠️  Could not create HTML preview: ' + error.message);
        }
        
        // 5. Confirm successful generation
        console.log('\n' + '='.repeat(60));
        colorLog('green', '🎉 TEST GENERATION COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(60));
        
        colorLog('white', '📊 Summary:');
        colorLog('white', `   • Article generated in ${generationTime} seconds`);
        colorLog('white', `   • Quality score: ${overallScore}/100`);
        colorLog('white', `   • Word count: ${article.wordCount} words`);
        colorLog('white', `   • Files saved: ${filename} (JSON) and ${htmlFilename} (HTML)`);
        
        // Recommendations based on quality score
        console.log('\n' + '-'.repeat(40));
        colorLog('cyan', '💡 RECOMMENDATIONS');
        console.log('-'.repeat(40));
        
        if (overallScore >= 80) {
            colorLog('green', '✨ Excellent quality! This article is ready for review and publication.');
        } else if (overallScore >= 60) {
            colorLog('yellow', '📝 Good quality, but could use some improvements before publication.');
            colorLog('white', '   Consider enhancing SEO optimization, readability, or content depth.');
        } else {
            colorLog('red', '⚠️  Below recommended quality threshold. Significant improvements needed.');
            colorLog('white', '   Focus on content quality, structure, and SEO optimization.');
        }
        
        colorLog('blue', '\n🔍 Next steps:');
        colorLog('white', '   1. Review the generated content in the drafts folder');
        colorLog('white', '   2. Use the Review Console to edit and approve articles');
        colorLog('white', '   3. Run the full automation system with ./start-automation.sh');
        
        console.log('\n' + '='.repeat(60));
        
    } catch (error) {
        colorLog('red', '\n❌ Error during content generation test:');
        console.error(error);
        
        if (error.message.includes('API key')) {
            colorLog('yellow', '\n💡 Tip: Make sure your OPENAI_API_KEY is set correctly in the .env file');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            colorLog('yellow', '\n💡 Tip: Check your internet connection and API endpoints');
        }
        
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    colorLog('yellow', '\n\n⏹️  Test generation interrupted by user');
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    colorLog('red', '\n❌ Unhandled rejection:', reason);
    process.exit(1);
});

// Run the test
if (require.main === module) {
    testContentGeneration().catch(error => {
        colorLog('red', '\n💥 Unexpected error:');
        console.error(error);
        process.exit(1);
    });
}

module.exports = testContentGeneration;