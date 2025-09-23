const ContentGenerator = require('./automation/content-generator/generator.js');
const fs = require('fs').promises;
const path = require('path');

async function generateTestMockArticle() {
    try {
        console.log('🎭 Creating test mock article...');

        const generator = new ContentGenerator();

        // Load configurations
        console.log('📁 Loading configurations...');
        await generator.loadConfigurations();

        // Select a test topic
        const testTopic = generator.selectTopic();
        console.log(`🎯 Selected topic: "${testTopic.title}" (${testTopic.category})`);

        // Select test keywords
        const testKeywords = generator.selectKeywords(testTopic);
        console.log(`🔑 Target keywords: ${testKeywords.primary.join(', ')}`);

        // Create fallback article
        const fallbackArticle = generator.generateFallbackArticle(testTopic, testKeywords, 1);

        // Save to drafts directory
        const draftsDir = path.join(__dirname, 'content/drafts');
        const filename = `test-fallback-${fallbackArticle.metadata.id}.json`;
        const filepath = path.join(draftsDir, filename);

        const draftData = {
            ...fallbackArticle,
            savedAt: new Date().toISOString(),
            version: '1.0',
            testGenerated: true
        };

        await fs.writeFile(filepath, JSON.stringify(draftData, null, 2));

        console.log(`✅ Test fallback article saved: ${filename}`);
        console.log(`📊 Quality Score: ${fallbackArticle.metadata.qualityScore.overall}`);
        console.log(`📝 Word Count: ${fallbackArticle.metadata.wordCount}`);
        console.log(`🎯 Status: ${fallbackArticle.metadata.status}`);
        console.log(`🎯 Template: ${fallbackArticle.metadata.templateUsed}`);
        console.log(`🔗 File: content/drafts/${filename}`);

        // Display article structure
        console.log('\n📋 Article Structure:');
        console.log(`Title: ${fallbackArticle.title}`);
        console.log(`Meta: ${fallbackArticle.metaDescription}`);
        console.log(`Keywords: ${fallbackArticle.keywords.join(', ')}`);
        console.log(`Content sections: ${(fallbackArticle.content.match(/<h[1-6][^>]*>/gi) || []).length}`);

    } catch (error) {
        console.error('❌ Error generating test mock article:', error.message);
        process.exit(1);
    }
}

generateTestMockArticle();