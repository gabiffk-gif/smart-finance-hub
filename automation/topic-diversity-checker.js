#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

class TopicDiversityChecker {
    constructor() {
        this.categories = [
            'Personal Finance',
            'Investing',
            'Retirement',
            'Credit',
            'Tax',
            'Business',
            'Insurance',
            'FinTech',
            'Economic Trends',
            'Education'
        ];

        this.categoryKeywords = {
            'Personal Finance': ['budget', 'savings', 'money management', 'financial planning', 'personal finance', 'emergency fund', 'debt management', 'side hustle', 'income'],
            'Investing': ['stocks', 'bonds', 'portfolio', 'mutual funds', 'etf', 'investment', 'dividend', 'real estate', 'reit', 'cryptocurrency', 'trading', 'market'],
            'Retirement': ['401k', 'ira', 'retirement', 'pension', 'social security', 'retirement planning', 'seniors', 'elderly'],
            'Credit': ['credit score', 'credit card', 'credit report', 'credit history', 'credit repair', 'fico', 'credit utilization'],
            'Tax': ['tax', 'irs', 'deductions', 'tax planning', 'tax optimization', 'tax strategies', 'filing', 'refund'],
            'Business': ['business', 'entrepreneur', 'startup', 'small business', 'llc', 'corporation', 'business loan'],
            'Insurance': ['insurance', 'life insurance', 'health insurance', 'auto insurance', 'homeowners', 'term life', 'whole life'],
            'FinTech': ['fintech', 'app', 'digital', 'online banking', 'mobile payment', 'robo advisor', 'blockchain', 'payment'],
            'Economic Trends': ['economy', 'inflation', 'recession', 'market trends', 'interest rates', 'federal reserve', 'gdp', 'unemployment'],
            'Education': ['financial literacy', 'education', 'learning', 'course', 'guide', 'basics', 'fundamentals', 'college', '529']
        };

        this.recentTopics = [];
        this.categoryDistribution = {};
        this.diversityScore = 0;
    }

    analyzeExistingContent() {
        console.log('🔍 Analyzing existing content for topic diversity...');

        const folders = ['content/published', 'content/approved', 'content/drafts'];
        let totalArticles = 0;

        // Initialize category counts
        this.categories.forEach(cat => {
            this.categoryDistribution[cat] = 0;
        });

        folders.forEach(folder => {
            if (fs.existsSync(folder)) {
                const files = fs.readdirSync(folder);

                files.forEach(file => {
                    if (file.endsWith('.json') && file !== '.gitkeep') {
                        try {
                            const article = JSON.parse(fs.readFileSync(path.join(folder, file), 'utf8'));
                            const category = this.categorizeArticle(article);

                            if (category) {
                                this.categoryDistribution[category]++;
                                totalArticles++;

                                // Track recent topics (last 30 days if we have dates)
                                const createdAt = article.metadata?.createdAt || article.metadata?.publishedAt;
                                if (createdAt) {
                                    const articleDate = new Date(createdAt);
                                    const thirtyDaysAgo = new Date();
                                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                                    if (articleDate > thirtyDaysAgo) {
                                        this.recentTopics.push({
                                            title: article.title,
                                            category: category,
                                            date: articleDate
                                        });
                                    }
                                }
                            }
                        } catch (e) {
                            // Skip invalid files
                        }
                    }
                });
            }
        });

        this.calculateDiversityScore(totalArticles);
        return this.diversityScore;
    }

    categorizeArticle(article) {
        const text = (article.title + ' ' + (article.content || '') + ' ' + (article.metaDescription || '')).toLowerCase();

        let bestMatch = null;
        let bestScore = 0;

        for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
            let score = 0;
            keywords.forEach(keyword => {
                if (text.includes(keyword.toLowerCase())) {
                    score += keyword.length; // Longer keywords get more weight
                }
            });

            if (score > bestScore) {
                bestScore = score;
                bestMatch = category;
            }
        }

        return bestMatch;
    }

    calculateDiversityScore(totalArticles) {
        if (totalArticles === 0) {
            this.diversityScore = 100; // Perfect score if no articles
            return;
        }

        // Calculate how evenly distributed the categories are
        const idealPercentage = 100 / this.categories.length; // ~10% per category
        let varianceSum = 0;

        this.categories.forEach(category => {
            const actualPercentage = (this.categoryDistribution[category] / totalArticles) * 100;
            const variance = Math.abs(actualPercentage - idealPercentage);
            varianceSum += variance;
        });

        // Convert variance to a score (lower variance = higher score)
        const averageVariance = varianceSum / this.categories.length;
        this.diversityScore = Math.max(0, 100 - (averageVariance * 2));
    }

    checkRecentTopicSaturation() {
        if (this.recentTopics.length === 0) return { saturated: false, categories: [] };

        const recentCategoryCounts = {};
        this.categories.forEach(cat => {
            recentCategoryCounts[cat] = 0;
        });

        this.recentTopics.forEach(topic => {
            recentCategoryCounts[topic.category]++;
        });

        // Identify oversaturated categories (more than 40% of recent content)
        const threshold = Math.max(1, Math.floor(this.recentTopics.length * 0.4));
        const saturatedCategories = [];

        Object.entries(recentCategoryCounts).forEach(([category, count]) => {
            if (count >= threshold) {
                saturatedCategories.push(category);
            }
        });

        return {
            saturated: saturatedCategories.length > 0,
            categories: saturatedCategories,
            recentCounts: recentCategoryCounts
        };
    }

    getUnderrepresentedCategories(limit = 3) {
        // Sort categories by count (ascending) to find underrepresented ones
        const sortedCategories = Object.entries(this.categoryDistribution)
            .sort((a, b) => a[1] - b[1])
            .slice(0, limit)
            .map(entry => entry[0]);

        return sortedCategories;
    }

    generateContentSuggestions() {
        const underrepresented = this.getUnderrepresentedCategories();
        const saturationCheck = this.checkRecentTopicSaturation();

        const suggestions = [];

        // Suggest underrepresented categories
        underrepresented.forEach(category => {
            suggestions.push({
                category: category,
                reason: 'Underrepresented in content portfolio',
                priority: 'High',
                keywords: this.categoryKeywords[category].slice(0, 3)
            });
        });

        // Warn about oversaturated categories
        if (saturationCheck.saturated) {
            saturationCheck.categories.forEach(category => {
                suggestions.push({
                    category: category,
                    reason: 'Oversaturated in recent content - consider avoiding',
                    priority: 'Avoid',
                    count: saturationCheck.recentCounts[category]
                });
            });
        }

        return suggestions;
    }

    generateReport() {
        console.log('\n📊 TOPIC DIVERSITY ANALYSIS REPORT');
        console.log('=' .repeat(50));

        console.log(`\n🎯 Overall Diversity Score: ${this.diversityScore.toFixed(1)}/100`);

        if (this.diversityScore >= 80) {
            console.log('✅ Excellent diversity - well balanced content portfolio');
        } else if (this.diversityScore >= 60) {
            console.log('⚠️  Good diversity - some categories could use more coverage');
        } else {
            console.log('❌ Poor diversity - significant category imbalance detected');
        }

        console.log('\n📈 Category Distribution:');
        Object.entries(this.categoryDistribution)
            .sort((a, b) => b[1] - a[1])
            .forEach(([category, count]) => {
                const percentage = ((count / Object.values(this.categoryDistribution).reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                console.log(`  ${category}: ${count} articles (${percentage}%)`);
            });

        console.log('\n💡 Content Suggestions:');
        const suggestions = this.generateContentSuggestions();

        suggestions.forEach(suggestion => {
            if (suggestion.priority === 'High') {
                console.log(`  ✅ FOCUS ON: ${suggestion.category}`);
                console.log(`     Keywords: ${suggestion.keywords.join(', ')}`);
            } else if (suggestion.priority === 'Avoid') {
                console.log(`  ❌ AVOID: ${suggestion.category} (${suggestion.count} recent articles)`);
            }
        });

        if (this.recentTopics.length > 0) {
            console.log(`\n📅 Recent Content (Last 30 days): ${this.recentTopics.length} articles`);
        }

        return {
            diversityScore: this.diversityScore,
            categoryDistribution: this.categoryDistribution,
            suggestions: suggestions,
            recentTopics: this.recentTopics.length
        };
    }

    shouldGenerateContent(proposedCategory) {
        const saturationCheck = this.checkRecentTopicSaturation();

        if (saturationCheck.saturated && saturationCheck.categories.includes(proposedCategory)) {
            console.log(`⚠️  Warning: ${proposedCategory} is oversaturated in recent content`);
            return false;
        }

        return true;
    }
}

// Run analysis if called directly
if (require.main === module) {
    const checker = new TopicDiversityChecker();
    const score = checker.analyzeExistingContent();
    const report = checker.generateReport();

    console.log(`\n🏆 Final Diversity Score: ${score.toFixed(1)}/100`);

    process.exit(0);
}

module.exports = TopicDiversityChecker;