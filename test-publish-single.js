const Publisher = require('./automation/publisher/deploy.js');
const fs = require('fs').promises;
const path = require('path');

async function testPublish() {
    try {
        console.log('🚀 Testing single article publishing...');

        // Load one published article to test republishing
        const publishedDir = path.join(__dirname, 'content/published');
        console.log(`🔍 Looking in: ${publishedDir}`);

        const files = await fs.readdir(publishedDir);
        console.log(`📁 Files found: ${files.length}`, files);

        let testArticle = null;
        for (const file of files) {
            console.log(`🔍 Checking file: ${file}`);
            if (file.endsWith('.json')) {
                const filePath = path.join(publishedDir, file);
                console.log(`📖 Reading: ${filePath}`);
                const content = await fs.readFile(filePath, 'utf8');
                testArticle = JSON.parse(content);
                console.log(`📄 Found test article: ${testArticle.title}`);
                break;
            }
        }

        if (!testArticle) {
            console.log('❌ No approved articles found');
            return;
        }

        // Initialize publisher
        const publisher = new Publisher();

        // Publish the article
        console.log('📝 Publishing article to GitHub...');
        const result = await publisher.publishArticle(testArticle);

        console.log('✅ Successfully published!');
        console.log('Result:', result);

    } catch (error) {
        console.error('❌ Publishing failed:', error);
    }
}

testPublish();