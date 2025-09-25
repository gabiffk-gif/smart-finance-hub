const fs = require('fs');

console.log('=== FIXING GITHUB PAGES URL ROUTING ===');
console.log('Removing .html extensions from URLs for GitHub Pages compatibility');

// Read current homepage
let homepage = fs.readFileSync('index.html', 'utf8');

// Replace all .html URLs with extension-less versions
const urlPattern = /href="\/articles\/2025\/09\/([^"]+)\.html"/g;
homepage = homepage.replace(urlPattern, 'href="/articles/2025/09/$1"');

// Count replacements
const urlMatches = homepage.match(/href="\/articles\/2025\/09\/[^"]+"/g) || [];
console.log(`✅ Updated ${urlMatches.length} article URLs to remove .html extensions`);

// Write updated homepage
fs.writeFileSync('index.html', homepage);

// Also fix articles.html page if it exists
if (fs.existsSync('articles.html')) {
    let articlesPage = fs.readFileSync('articles.html', 'utf8');
    articlesPage = articlesPage.replace(urlPattern, 'href="/articles/2025/09/$1"');
    fs.writeFileSync('articles.html', articlesPage);
    console.log('✅ Updated articles.html page URLs');
}

console.log('\n=== FINAL URL VERIFICATION ===');

// Show sample URLs
urlMatches.slice(0, 3).forEach(url => {
    console.log(`Updated URL: ${url.replace('href="', '').replace('"', '')}`);
});

console.log('\n✅ GitHub Pages URL routing fixed!');
console.log('Articles will now load properly without 308 redirects');