const fs = require('fs');
const path = require('path');

class ContentDeduplicator {
    constructor() {
        this.existingTitles = new Set();
        this.existingSlugs = new Set();
        this.existingTopics = new Set();
        this.duplicatesFound = [];
    }

    loadExistingContent() {
        console.log('🔍 Loading existing content for deduplication...');

        const folders = ['content/drafts', 'content/approved', 'content/published'];

        folders.forEach(folder => {
            try {
                if (!fs.existsSync(folder)) {
                    console.log(`📁 Folder ${folder} does not exist, skipping...`);
                    return;
                }

                const files = fs.readdirSync(folder);
                files.forEach(file => {
                    if (file.endsWith('.json') && file !== '.gitkeep') {
                        try {
                            const article = JSON.parse(fs.readFileSync(path.join(folder, file), 'utf8'));
                            if (article.title) {
                                const normalizedTitle = this.normalizeTitle(article.title);
                                this.existingTitles.add(normalizedTitle);
                            }
                            if (article.slug) this.existingSlugs.add(article.slug);
                            if (article.topic) this.existingTopics.add(article.topic.toLowerCase());
                            if (article.metadata && article.metadata.topic) {
                                this.existingTopics.add(article.metadata.topic.toLowerCase());
                            }
                        } catch (e) {
                            console.log(`⚠️  Error parsing ${file}: ${e.message}`);
                        }
                    }
                });
            } catch (e) {
                console.log(`⚠️  Could not read ${folder}: ${e.message}`);
            }
        });

        console.log(`📊 Loaded ${this.existingTitles.size} existing titles`);
        console.log(`📊 Loaded ${this.existingSlugs.size} existing slugs`);
        console.log(`📊 Loaded ${this.existingTopics.size} existing topics`);
    }

    normalizeTitle(title) {
        return title.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Remove special characters
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }

    isDuplicate(article) {
        const title = article.title ? this.normalizeTitle(article.title) : '';
        const slug = article.slug || '';
        const topic = (article.topic || article.metadata?.topic || '').toLowerCase();

        // Check exact title match
        if (title && this.existingTitles.has(title)) {
            return {
                isDuplicate: true,
                reason: 'Exact title match',
                matchedTitle: title
            };
        }

        // Check exact slug match
        if (slug && this.existingSlugs.has(slug)) {
            return {
                isDuplicate: true,
                reason: 'Exact slug match',
                matchedSlug: slug
            };
        }

        // Check similar titles (fuzzy match)
        if (title) {
            for (const existingTitle of this.existingTitles) {
                const similarity = this.calculateSimilarity(title, existingTitle);
                if (similarity > 0.85) { // 85% similarity threshold
                    return {
                        isDuplicate: true,
                        reason: 'Similar title',
                        similarity: Math.round(similarity * 100) + '%',
                        existingTitle: existingTitle,
                        newTitle: title
                    };
                }
            }
        }

        // Check for repeated topics with slight variations
        if (topic) {
            for (const existingTopic of this.existingTopics) {
                const similarity = this.calculateSimilarity(topic, existingTopic);
                if (similarity > 0.9) { // 90% topic similarity
                    return {
                        isDuplicate: true,
                        reason: 'Similar topic',
                        similarity: Math.round(similarity * 100) + '%',
                        existingTopic: existingTopic,
                        newTopic: topic
                    };
                }
            }
        }

        return { isDuplicate: false };
    }

    calculateSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;

        const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 2)); // Ignore short words
        const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 2));

        if (words1.size === 0 || words2.size === 0) return 0;

        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);

        return intersection.size / union.size;
    }

    removeDuplicates(folder) {
        console.log(`🔍 Scanning ${folder} for duplicates...`);

        try {
            if (!fs.existsSync(folder)) {
                console.log(`📁 Folder ${folder} does not exist, skipping...`);
                return 0;
            }

            const files = fs.readdirSync(folder);
            let removed = 0;

            files.forEach(file => {
                if (file.endsWith('.json') && file !== '.gitkeep') {
                    try {
                        const filePath = path.join(folder, file);
                        const article = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                        const check = this.isDuplicate(article);
                        if (check.isDuplicate) {
                            console.log(`🗑️  Removing duplicate: ${article.title || 'Unknown title'}`);
                            console.log(`   Reason: ${check.reason}`);
                            if (check.similarity) console.log(`   Similarity: ${check.similarity}`);

                            // Move to rejected folder instead of deleting
                            const rejectedDir = 'content/rejected';
                            if (!fs.existsSync(rejectedDir)) {
                                fs.mkdirSync(rejectedDir, { recursive: true });
                            }

                            // Add rejection metadata
                            if (article.metadata) {
                                article.metadata.rejectedAt = new Date().toISOString();
                                article.metadata.rejectionReason = `Duplicate content: ${check.reason}`;
                                article.metadata.status = 'rejected';
                            }

                            const rejectedPath = path.join(rejectedDir, `duplicate_${Date.now()}_${file}`);
                            fs.writeFileSync(rejectedPath, JSON.stringify(article, null, 2));
                            fs.unlinkSync(filePath);

                            this.duplicatesFound.push({
                                file: file,
                                title: article.title,
                                reason: check.reason,
                                folder: folder
                            });

                            removed++;
                        } else {
                            // Add to tracking for future checks
                            if (article.title) {
                                const normalizedTitle = this.normalizeTitle(article.title);
                                this.existingTitles.add(normalizedTitle);
                            }
                            if (article.slug) this.existingSlugs.add(article.slug);
                            if (article.topic) this.existingTopics.add(article.topic.toLowerCase());
                        }
                    } catch (e) {
                        console.log(`⚠️  Error processing ${file}: ${e.message}`);
                    }
                }
            });

            console.log(`✅ Removed ${removed} duplicates from ${folder}`);
            return removed;

        } catch (e) {
            console.log(`❌ Could not scan ${folder}: ${e.message}`);
            return 0;
        }
    }

    generateReport() {
        if (this.duplicatesFound.length > 0) {
            console.log('\n📋 DEDUPLICATION REPORT:');
            console.log('=' .repeat(50));

            this.duplicatesFound.forEach((dup, index) => {
                console.log(`${index + 1}. ${dup.title}`);
                console.log(`   File: ${dup.file}`);
                console.log(`   Folder: ${dup.folder}`);
                console.log(`   Reason: ${dup.reason}`);
                console.log('');
            });

            console.log(`📊 Total duplicates removed: ${this.duplicatesFound.length}`);
        } else {
            console.log('✅ No duplicates found - content is unique!');
        }
    }

    runDeduplication() {
        console.log('🚀 Starting content deduplication process...');

        // Load existing content first
        this.loadExistingContent();

        // Remove duplicates from each folder
        const removedFromDrafts = this.removeDuplicates('content/drafts');
        const removedFromApproved = this.removeDuplicates('content/approved');

        // Generate report
        this.generateReport();

        const totalRemoved = removedFromDrafts + removedFromApproved;
        console.log(`\n🎯 Deduplication complete! Total duplicates removed: ${totalRemoved}`);

        return {
            totalRemoved: totalRemoved,
            removedFromDrafts: removedFromDrafts,
            removedFromApproved: removedFromApproved,
            duplicatesFound: this.duplicatesFound
        };
    }
}

// Run deduplication if called directly
if (require.main === module) {
    const deduplicator = new ContentDeduplicator();
    const result = deduplicator.runDeduplication();

    if (result.totalRemoved > 0) {
        console.log('\n🔄 Updating homepage to reflect changes...');
        try {
            const { execSync } = require('child_process');
            execSync('node automation/update-homepage-scheduler.js --once', { stdio: 'inherit' });
        } catch (e) {
            console.log('⚠️  Could not update homepage automatically');
        }
    }

    process.exit(0);
}

module.exports = ContentDeduplicator;