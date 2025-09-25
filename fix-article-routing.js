const fs = require('fs');
const path = require('path');

console.log('=== DIAGNOSING ARTICLE ROUTING ISSUE ===');

// Read published articles and check URL/filename matching
const publishedFiles = fs.readdirSync('content/published/');
console.log('Published JSON files:', publishedFiles.length);

const articles = [];
const urlMismatches = [];

publishedFiles.forEach(file => {
    if (file.endsWith('.json')) {
        try {
            const article = JSON.parse(fs.readFileSync(`content/published/${file}`, 'utf8'));

            // Get the article's URL from metadata or generate one
            let expectedUrl = '';
            let expectedFilename = '';

            if (article.metadata && article.metadata.slug) {
                expectedFilename = article.metadata.slug + '.html';
                expectedUrl = `/articles/2025/09/${article.metadata.slug}.html`;
            } else {
                // Generate slug from title
                const slug = article.title
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .trim()
                    .substring(0, 60);
                expectedFilename = slug + '.html';
                expectedUrl = `/articles/2025/09/${slug}.html`;
            }

            const htmlExists = fs.existsSync(`articles/2025/09/${expectedFilename}`);

            console.log('Article:', article.title);
            console.log('Expected file:', expectedFilename);
            console.log('Expected URL:', expectedUrl);
            console.log('HTML exists:', htmlExists ? '✅' : '❌');

            if (!htmlExists) {
                urlMismatches.push({
                    title: article.title,
                    expectedFile: expectedFilename,
                    expectedUrl: expectedUrl,
                    jsonFile: file
                });
            }

            articles.push({
                title: article.title,
                slug: expectedFilename.replace('.html', ''),
                url: expectedUrl,
                exists: htmlExists,
                category: article.category || 'General',
                metaDescription: article.metaDescription || 'Financial insights and strategies',
                content: article.content || '',
                cta: article.cta || ''
            });

            console.log('---');
        } catch (e) {
            console.log(`Error processing ${file}:`, e.message);
        }
    }
});

// List all HTML files to see what we actually have
console.log('\n=== HTML FILES FOUND ===');
try {
    const htmlFiles = fs.readdirSync('articles/2025/09/');
    console.log('HTML files found:', htmlFiles.length);
    htmlFiles.forEach(file => console.log('HTML:', file));
} catch (e) {
    console.log('Error reading HTML directory:', e.message);
}

// Show mismatches
console.log('\n=== URL/FILE MISMATCHES ===');
if (urlMismatches.length > 0) {
    console.log(`Found ${urlMismatches.length} mismatched articles:`);
    urlMismatches.forEach(mismatch => {
        console.log(`- ${mismatch.title}`);
        console.log(`  Expected: ${mismatch.expectedFile}`);
        console.log(`  JSON: ${mismatch.jsonFile}`);
    });
} else {
    console.log('✅ All articles have matching HTML files');
}

console.log('\n=== SUMMARY ===');
console.log(`Published articles: ${articles.length}`);
console.log(`HTML files: ${fs.readdirSync('articles/2025/09/').length}`);
console.log(`Missing HTML files: ${urlMismatches.length}`);

module.exports = { articles, urlMismatches };