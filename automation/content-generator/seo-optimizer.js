const fs = require('fs').promises;
const path = require('path');
const natural = require('natural');

class SEOOptimizer {
    constructor() {
        this.settings = null;
        this.topics = null;
        this.keywords = null;
        this.existingContent = [];
        this.loadConfigurations();
    }

    async loadConfigurations() {
        try {
            const settingsPath = path.join(__dirname, '../config/settings.json');
            const topicsPath = path.join(__dirname, '../config/topics.json');
            const keywordsPath = path.join(__dirname, '../config/keywords.json');

            this.settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
            this.topics = JSON.parse(await fs.readFile(topicsPath, 'utf8'));
            this.keywords = JSON.parse(await fs.readFile(keywordsPath, 'utf8'));
            
            await this.loadExistingContent();
        } catch (error) {
            console.error('Error loading SEO configurations:', error);
        }
    }

    async loadExistingContent() {
        try {
            // Load published articles
            const publishedDir = path.join(__dirname, '../../content/published');
            const approvedDir = path.join(__dirname, '../../content/approved');
            
            this.existingContent = [];
            
            for (const dir of [publishedDir, approvedDir]) {
                try {
                    const files = await fs.readdir(dir);
                    for (const file of files) {
                        if (file.endsWith('.json')) {
                            const content = JSON.parse(await fs.readFile(path.join(dir, file), 'utf8'));
                            this.existingContent.push(content);
                        }
                    }
                } catch (error) {
                    // Directory might not exist yet
                    continue;
                }
            }
        } catch (error) {
            console.error('Error loading existing content:', error);
        }
    }

    generateSchemaMarkup(article) {
        const schema = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": article.title,
            "description": article.metaDescription,
            "image": this.generateImageSchema(article),
            "author": {
                "@type": "Person",
                "name": "Smart Finance Hub Editorial Team",
                "url": "https://smartfinancehub.vip/about",
                "sameAs": [
                    "https://twitter.com/smartfinancehub",
                    "https://linkedin.com/company/smart-finance-hub"
                ]
            },
            "publisher": {
                "@type": "Organization",
                "name": "Smart Finance Hub",
                "logo": {
                    "@type": "ImageObject",
                    "url": "https://smartfinancehub.vip/assets/images/logo.png",
                    "width": 400,
                    "height": 60
                },
                "url": "https://smartfinancehub.vip",
                "sameAs": [
                    "https://twitter.com/smartfinancehub",
                    "https://facebook.com/smartfinancehub",
                    "https://linkedin.com/company/smart-finance-hub"
                ]
            },
            "datePublished": article.metadata?.createdAt || new Date().toISOString(),
            "dateModified": article.metadata?.updatedAt || article.metadata?.createdAt || new Date().toISOString(),
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": `https://smartfinancehub.vip/articles/${this.generateSlug(article.title)}`
            },
            "articleSection": this.mapCategoryToSection(article.category),
            "keywords": this.extractKeywords(article),
            "wordCount": this.getWordCount(article.content),
            "about": {
                "@type": "Thing",
                "name": article.title.split(':')[0] || article.title
            }
        };

        // Add financial advice specific schema if applicable
        if (this.isFinancialAdvice(article)) {
            schema.disclaimer = "This content is for educational purposes only and should not be considered personalized financial advice. Consult with a qualified financial advisor before making financial decisions.";
        }

        // Add FAQ schema if Q&A content is detected
        const faqs = this.extractFAQs(article.content);
        if (faqs.length > 0) {
            schema.mainEntity = {
                "@type": "FAQPage",
                "mainEntity": faqs
            };
        }

        return schema;
    }

    generateImageSchema(article) {
        const slug = this.generateSlug(article.title);
        return [
            {
                "@type": "ImageObject",
                "url": `https://smartfinancehub.vip/assets/images/articles/${slug}-featured.webp`,
                "width": 1200,
                "height": 630,
                "caption": article.title
            }
        ];
    }

    findInternalLinkingOpportunities(article) {
        const opportunities = [];
        const articleText = article.content.toLowerCase();
        const articleKeywords = this.extractKeywords(article);
        
        for (const existingArticle of this.existingContent) {
            if (existingArticle.metadata?.id === article.metadata?.id) continue;
            
            const relevanceScore = this.calculateRelevanceScore(article, existingArticle);
            
            if (relevanceScore > 0.3) {
                // Find specific anchor text opportunities
                const anchorOpportunities = this.findAnchorTextOpportunities(
                    articleText, 
                    existingArticle
                );
                
                if (anchorOpportunities.length > 0) {
                    opportunities.push({
                        targetArticle: {
                            title: existingArticle.title,
                            url: `/articles/${this.generateSlug(existingArticle.title)}`,
                            category: existingArticle.category
                        },
                        relevanceScore,
                        anchorOpportunities,
                        suggestedPlacement: this.suggestLinkPlacement(articleText, anchorOpportunities[0])
                    });
                }
            }
        }
        
        // Sort by relevance score and limit to top 5
        return opportunities
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 5);
    }

    calculateRelevanceScore(article1, article2) {
        let score = 0;
        
        // Category match
        if (article1.category === article2.category) {
            score += 0.4;
        }
        
        // Keyword overlap
        const keywords1 = this.extractKeywords(article1);
        const keywords2 = this.extractKeywords(article2);
        const overlap = keywords1.filter(k => keywords2.includes(k)).length;
        const totalKeywords = Math.max(keywords1.length, keywords2.length);
        
        if (totalKeywords > 0) {
            score += (overlap / totalKeywords) * 0.6;
        }
        
        return Math.min(score, 1);
    }

    findAnchorTextOpportunities(articleText, targetArticle) {
        const opportunities = [];
        const targetKeywords = this.extractKeywords(targetArticle);
        
        for (const keyword of targetKeywords) {
            const regex = new RegExp(`\\b${keyword}(?:s)?\\b`, 'gi');
            const matches = articleText.match(regex);
            
            if (matches && matches.length > 0) {
                opportunities.push({
                    anchorText: keyword,
                    occurrences: matches.length,
                    context: this.extractContext(articleText, keyword)
                });
            }
        }
        
        return opportunities.slice(0, 3); // Limit to top 3 opportunities
    }

    extractContext(text, keyword, contextLength = 100) {
        const regex = new RegExp(`(.{0,${contextLength}}\\b${keyword}\\b.{0,${contextLength}})`, 'i');
        const match = text.match(regex);
        return match ? match[1].trim() : '';
    }

    suggestLinkPlacement(articleText, anchorOpportunity) {
        const sentences = articleText.split(/[.!?]+/);
        
        for (let i = 0; i < sentences.length; i++) {
            if (sentences[i].toLowerCase().includes(anchorOpportunity.anchorText.toLowerCase())) {
                if (i < sentences.length * 0.3) return 'introduction';
                if (i < sentences.length * 0.7) return 'main_content';
                return 'conclusion';
            }
        }
        
        return 'main_content';
    }

    generateImageAltTexts(article) {
        const baseTitle = article.title;
        const category = article.category;
        const keywords = this.extractKeywords(article);
        
        return {
            featuredImage: {
                alt: `${baseTitle} - Complete guide from Smart Finance Hub`,
                title: baseTitle,
                description: `Comprehensive guide about ${baseTitle.toLowerCase()} with expert financial advice`
            },
            inlineImages: this.generateInlineImageAlts(article, keywords),
            thumbnails: {
                alt: `${baseTitle} thumbnail`,
                title: `Learn about ${baseTitle}`,
                description: `Quick guide to ${baseTitle.toLowerCase()}`
            },
            socialImages: {
                facebook: {
                    alt: `${baseTitle} - Smart Finance Hub`,
                    description: article.metaDescription
                },
                twitter: {
                    alt: `${baseTitle} guide`,
                    description: `Expert advice on ${baseTitle.toLowerCase()}`
                },
                linkedin: {
                    alt: `Professional guide: ${baseTitle}`,
                    description: `Financial insights on ${baseTitle.toLowerCase()}`
                }
            }
        };
    }

    generateInlineImageAlts(article, keywords) {
        const sections = this.extractSections(article.content);
        const altTexts = [];
        
        sections.forEach((section, index) => {
            const sectionKeyword = keywords[index % keywords.length] || 'financial planning';
            altTexts.push({
                position: index + 1,
                alt: `${sectionKeyword} illustration - ${section.title}`,
                title: section.title,
                description: `Visual guide showing ${sectionKeyword} concepts and strategies`
            });
        });
        
        return altTexts;
    }

    validateMetaTags(article) {
        const validation = {
            title: this.validateTitle(article.title),
            metaDescription: this.validateMetaDescription(article.metaDescription),
            keywords: this.validateKeywords(article),
            openGraph: this.validateOpenGraph(article),
            twitterCard: this.validateTwitterCard(article)
        };
        
        validation.overall = this.calculateMetaScore(validation);
        return validation;
    }

    validateTitle(title) {
        const length = title.length;
        const issues = [];
        let score = 100;
        
        if (length < 40) {
            issues.push('Title too short (recommended: 40-60 characters)');
            score -= 20;
        } else if (length > 60) {
            issues.push('Title too long (recommended: 40-60 characters)');
            score -= 15;
        }
        
        if (!title.includes('2025') && !title.includes('Guide') && !title.includes('Tips')) {
            issues.push('Consider adding year or descriptive words for better CTR');
            score -= 10;
        }
        
        return {
            isValid: issues.length === 0,
            length,
            score: Math.max(score, 0),
            issues,
            recommendations: issues.length > 0 ? ['Optimize title length and include engaging words'] : []
        };
    }

    validateMetaDescription(metaDescription) {
        const length = metaDescription.length;
        const issues = [];
        let score = 100;
        
        if (length < 140) {
            issues.push('Meta description too short (recommended: 140-160 characters)');
            score -= 25;
        } else if (length > 160) {
            issues.push('Meta description too long (recommended: 140-160 characters)');
            score -= 20;
        }
        
        if (!metaDescription.includes('Smart Finance Hub')) {
            issues.push('Consider including brand name');
            score -= 10;
        }
        
        return {
            isValid: issues.length === 0,
            length,
            score: Math.max(score, 0),
            issues,
            recommendations: issues.length > 0 ? ['Optimize meta description length and include brand'] : []
        };
    }

    validateKeywords(article) {
        const keywords = this.extractKeywords(article);
        const issues = [];
        let score = 100;
        
        if (keywords.length < 3) {
            issues.push('Too few keywords identified');
            score -= 30;
        } else if (keywords.length > 10) {
            issues.push('Too many keywords may dilute focus');
            score -= 20;
        }
        
        return {
            isValid: issues.length === 0,
            count: keywords.length,
            keywords,
            score: Math.max(score, 0),
            issues
        };
    }

    validateOpenGraph(article) {
        // Check if article has proper OG structure
        return {
            isValid: true,
            recommendations: [
                'Add og:title, og:description, og:image, og:type=article',
                'Include og:site_name=Smart Finance Hub',
                'Add article:author and article:section'
            ]
        };
    }

    validateTwitterCard(article) {
        return {
            isValid: true,
            recommendations: [
                'Use twitter:card=summary_large_image',
                'Include twitter:site=@smartfinancehub',
                'Add twitter:creator for author attribution'
            ]
        };
    }

    calculateMetaScore(validation) {
        const scores = [
            validation.title.score,
            validation.metaDescription.score,
            validation.keywords.score
        ];
        
        return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    checkKeywordDensity(article, targetKeywords = []) {
        const content = this.stripHtml(article.content).toLowerCase();
        const words = content.split(/\\s+/).filter(word => word.length > 0);
        const totalWords = words.length;
        
        const keywordAnalysis = {};
        const allKeywords = [...targetKeywords, ...this.extractKeywords(article)];
        
        for (const keyword of allKeywords) {
            const keywordLower = keyword.toLowerCase();
            const regex = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'g');
            const matches = content.match(regex) || [];
            const density = (matches.length / totalWords) * 100;
            
            keywordAnalysis[keyword] = {
                occurrences: matches.length,
                density: Math.round(density * 100) / 100,
                positions: this.findKeywordPositions(content, keywordLower),
                isOptimal: density >= 1.0 && density <= 2.0,
                recommendation: this.getKeywordRecommendation(density)
            };
        }
        
        const overallDensity = this.calculateOverallKeywordDensity(keywordAnalysis);
        
        return {
            totalWords,
            overallDensity,
            keywords: keywordAnalysis,
            isOptimal: overallDensity >= 1.0 && overallDensity <= 2.0,
            recommendations: this.generateKeywordRecommendations(keywordAnalysis)
        };
    }

    findKeywordPositions(content, keyword) {
        const positions = [];
        const contentLength = content.length;
        let index = content.indexOf(keyword);
        
        while (index !== -1) {
            const percentage = Math.round((index / contentLength) * 100);
            positions.push(percentage);
            index = content.indexOf(keyword, index + 1);
        }
        
        return positions;
    }

    getKeywordRecommendation(density) {
        if (density < 1.0) return 'Increase keyword usage naturally';
        if (density > 2.0) return 'Reduce keyword usage to avoid over-optimization';
        return 'Keyword density is optimal';
    }

    calculateOverallKeywordDensity(keywordAnalysis) {
        const densities = Object.values(keywordAnalysis).map(k => k.density);
        return densities.length > 0 ? 
            Math.round((densities.reduce((a, b) => a + b, 0) / densities.length) * 100) / 100 : 0;
    }

    generateKeywordRecommendations(keywordAnalysis) {
        const recommendations = [];
        
        for (const [keyword, data] of Object.entries(keywordAnalysis)) {
            if (data.density < 1.0) {
                recommendations.push(`Increase usage of "${keyword}" (currently ${data.density}%)`);
            } else if (data.density > 2.0) {
                recommendations.push(`Reduce usage of "${keyword}" (currently ${data.density}%)`);
            }
        }
        
        return recommendations;
    }

    suggestRelatedArticles(article, count = 5) {
        const suggestions = [];
        const articleKeywords = this.extractKeywords(article);
        const articleCategory = article.category;
        
        // Find related topics from configuration
        const relatedTopics = this.topics.topics.filter(topic => {
            if (topic.id === article.topic) return false;
            
            return topic.category === articleCategory || 
                   topic.keywords.some(keyword => articleKeywords.includes(keyword));
        });
        
        // Score and sort related topics
        const scoredTopics = relatedTopics.map(topic => ({
            ...topic,
            relevanceScore: this.calculateTopicRelevance(article, topic)
        })).sort((a, b) => b.relevanceScore - a.relevanceScore);
        
        // Generate suggestions
        for (const topic of scoredTopics.slice(0, count)) {
            suggestions.push({
                title: topic.title,
                category: topic.category,
                keywords: topic.keywords,
                priority: topic.priority,
                relevanceScore: topic.relevanceScore,
                suggestedUrl: `/articles/${this.generateSlug(topic.title)}`,
                reason: this.explainRelevance(article, topic)
            });
        }
        
        return suggestions;
    }

    calculateTopicRelevance(article, topic) {
        let score = 0;
        
        // Category match (40% weight)
        if (article.category === topic.category) {
            score += 0.4;
        }
        
        // Keyword overlap (60% weight)
        const articleKeywords = this.extractKeywords(article);
        const overlap = topic.keywords.filter(k => 
            articleKeywords.some(ak => ak.toLowerCase().includes(k.toLowerCase()) || 
                                k.toLowerCase().includes(ak.toLowerCase()))
        ).length;
        
        if (topic.keywords.length > 0) {
            score += (overlap / topic.keywords.length) * 0.6;
        }
        
        return Math.round(score * 100) / 100;
    }

    explainRelevance(article, topic) {
        if (article.category === topic.category) {
            return `Same category (${article.category})`;
        }
        
        const articleKeywords = this.extractKeywords(article);
        const sharedKeywords = topic.keywords.filter(k => 
            articleKeywords.some(ak => ak.toLowerCase().includes(k.toLowerCase()))
        );
        
        if (sharedKeywords.length > 0) {
            return `Shared keywords: ${sharedKeywords.slice(0, 2).join(', ')}`;
        }
        
        return 'Related financial topic';
    }

    // Utility methods
    extractKeywords(article) {
        if (article.metadata && article.metadata.targetKeywords) {
            return [...article.metadata.targetKeywords.primary, ...article.metadata.targetKeywords.longTail];
        }
        
        // Fallback: extract from content
        const words = this.stripHtml(article.content || '').toLowerCase().split(/\\s+/);
        const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
        const wordFreq = {};
        
        words.filter(word => word.length > 3 && !stopWords.has(word))
             .forEach(word => wordFreq[word] = (wordFreq[word] || 0) + 1);
        
        return Object.entries(wordFreq)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([word]) => word);
    }

    extractSections(content) {
        const sections = [];
        const lines = content.split('\\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.match(/^<h[2-3][^>]*>(.+)<\/h[2-3]>/)) {
                const title = trimmed.replace(/<[^>]+>/g, '');
                sections.push({ title, level: trimmed.includes('<h2') ? 2 : 3 });
            }
        }
        
        return sections;
    }

    extractFAQs(content) {
        const faqs = [];
        const lines = content.split('\\n');
        
        for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim();
            const nextLine = lines[i + 1]?.trim();
            
            if (line.includes('?') && nextLine && nextLine.length > 20) {
                faqs.push({
                    "@type": "Question",
                    "name": this.stripHtml(line),
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": this.stripHtml(nextLine)
                    }
                });
            }
        }
        
        return faqs.slice(0, 5); // Limit to 5 FAQs
    }

    stripHtml(html) {
        return html.replace(/<[^>]+>/g, '').trim();
    }

    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\\s-]/g, '')
            .replace(/\\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    mapCategoryToSection(category) {
        const mapping = {
            'banking': 'Banking & Savings',
            'investing': 'Investment Strategies',
            'credit': 'Credit Management',
            'debt': 'Debt Management',
            'retirement': 'Retirement Planning',
            'taxes': 'Tax Planning',
            'insurance': 'Insurance',
            'budgeting': 'Budgeting & Planning'
        };
        
        return mapping[category] || 'Personal Finance';
    }

    isFinancialAdvice(article) {
        const content = article.content.toLowerCase();
        const adviceKeywords = ['should invest', 'recommend', 'best choice', 'you should', 'advice'];
        return adviceKeywords.some(keyword => content.includes(keyword));
    }

    getWordCount(content) {
        return this.stripHtml(content).split(/\\s+/).filter(word => word.length > 0).length;
    }
}

module.exports = SEOOptimizer;