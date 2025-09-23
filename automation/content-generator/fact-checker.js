const fs = require('fs').promises;
const path = require('path');

class FactChecker {
    constructor() {
        this.settings = null;
        this.loadConfigurations();
        
        // Common financial data sources for validation
        this.trustedSources = [
            'federalreserve.gov',
            'treasury.gov',
            'sec.gov',
            'fdic.gov',
            'bls.gov',
            'irs.gov',
            'cfpb.gov',
            'investopedia.com',
            'morningstar.com',
            'fidelity.com',
            'vanguard.com',
            'schwab.com'
        ];
        
        // Patterns for detecting claims that need fact-checking
        this.statisticalPatterns = [
            /(\d+(?:\.\d+)?)\s*%/g,                    // Percentages
            /\$[\d,]+(?:\.\d{2})?(?:\s*(?:billion|million|thousand|trillion))?/gi, // Dollar amounts
            /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:times|x)/gi, // Multipliers
            /(?:increased|decreased|rose|fell|grew|dropped)\s+(?:by\s+)?(\d+(?:\.\d+)?%?)/gi, // Changes
            /(\d+(?:,\d{3})*)\s+(?:people|Americans|households|investors|companies)/gi, // Population stats
            /(?:average|median|typical)\s+(?:of\s+)?\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/gi, // Averages
            /(\d+(?:\.\d+)?)\s*(?:basis\s*points?|bps)/gi, // Basis points
            /(\d+(?:\.\d+)?)\s*(?:years?|months?|decades?)\s*(?:ago|from\s*now)/gi // Time periods
        ];
        
        // Patterns for financial advice that needs disclaimers
        this.advicePatterns = [
            /(?:you\s+should|we\s+recommend|best\s+choice|ideal\s+option)/gi,
            /(?:invest\s+in|buy|sell|purchase|avoid)/gi,
            /(?:guaranteed|promise|ensure|certain\s+to)/gi,
            /(?:will\s+(?:increase|decrease|rise|fall|grow|return))/gi,
            /(?:always|never)\s+(?:invest|buy|sell|choose)/gi,
            /(?:risk-free|no\s+risk|safe\s+investment)/gi
        ];
        
        // Statements requiring citations
        this.citationPatterns = [
            /(?:studies\s+show|research\s+indicates|data\s+reveals)/gi,
            /(?:according\s+to|based\s+on|as\s+reported\s+by)/gi,
            /(?:experts\s+(?:say|believe|recommend|suggest))/gi,
            /(?:recent\s+(?:study|research|report|survey))/gi,
            /(?:financial\s+(?:experts|advisors|analysts)\s+(?:say|recommend))/gi
        ];
        
        // Date-sensitive content patterns
        this.datePatterns = [
            /(?:current|currently|now|today|this\s+year)/gi,
            /(?:recent|recently|latest|new|updated)/gi,
            /(?:2024|2025)\s*(?:rates?|rules?|limits?|changes?)/gi,
            /(?:as\s+of|effective|starting)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)/gi
        ];
    }

    async loadConfigurations() {
        try {
            const settingsPath = path.join(__dirname, '../config/settings.json');
            this.settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
        } catch (error) {
            console.error('Error loading fact-checker configurations:', error);
        }
    }

    checkArticle(article) {
        const content = article.content;
        const title = article.title;
        
        const analysis = {
            statistics: this.flagStatistics(content),
            citationNeeds: this.identifyCitationNeeds(content),
            financialAdvice: this.markFinancialAdvice(content),
            dateValidation: this.validateDateReferences(content),
            confidenceScore: 0,
            overallIssues: [],
            recommendations: []
        };
        
        // Calculate confidence score
        analysis.confidenceScore = this.calculateConfidenceScore(analysis);
        
        // Generate overall assessment
        analysis.overallIssues = this.generateOverallIssues(analysis);
        analysis.recommendations = this.generateRecommendations(analysis);
        
        return analysis;
    }

    flagStatistics(content) {
        const flaggedStats = [];
        
        for (const pattern of this.statisticalPatterns) {
            let match;
            const regex = new RegExp(pattern.source, pattern.flags);
            
            while ((match = regex.exec(content)) !== null) {
                const statistic = match[0];
                const context = this.extractContext(content, match.index, 100);
                
                flaggedStats.push({
                    statistic,
                    context,
                    position: match.index,
                    type: this.classifyStatistic(statistic),
                    priority: this.assessStatisticPriority(statistic, context),
                    verificationNeeded: true,
                    suggestedSources: this.suggestSourcesForStatistic(statistic, context)
                });
            }
        }
        
        return this.deduplicateStatistics(flaggedStats);
    }

    classifyStatistic(statistic) {
        if (statistic.includes('%')) return 'percentage';
        if (statistic.includes('$')) return 'monetary';
        if (statistic.includes('basis') || statistic.includes('bps')) return 'basis_points';
        if (/\d+\s*(?:times|x)/i.test(statistic)) return 'multiplier';
        if (/\d+\s*(?:years?|months?)/i.test(statistic)) return 'time_period';
        if (/\d+(?:,\d{3})*\s+(?:people|Americans)/i.test(statistic)) return 'population';
        return 'numerical';
    }

    assessStatisticPriority(statistic, context) {
        // High priority for specific financial claims
        const highPriorityKeywords = [
            'return', 'profit', 'loss', 'rate', 'fee', 'cost', 'tax',
            'inflation', 'market', 'performance', 'yield', 'interest'
        ];
        
        const contextLower = context.toLowerCase();
        
        if (highPriorityKeywords.some(keyword => contextLower.includes(keyword))) {
            return 'high';
        }
        
        // Medium priority for general financial statistics
        if (statistic.includes('$') || statistic.includes('%')) {
            return 'medium';
        }
        
        return 'low';
    }

    suggestSourcesForStatistic(statistic, context) {
        const suggestions = [];
        const contextLower = context.toLowerCase();
        
        if (contextLower.includes('fed') || contextLower.includes('interest rate')) {
            suggestions.push('Federal Reserve (federalreserve.gov)');
        }
        
        if (contextLower.includes('inflation') || contextLower.includes('cpi')) {
            suggestions.push('Bureau of Labor Statistics (bls.gov)');
        }
        
        if (contextLower.includes('market') || contextLower.includes('stock')) {
            suggestions.push('SEC (sec.gov)', 'Morningstar', 'Yahoo Finance');
        }
        
        if (contextLower.includes('tax') || contextLower.includes('irs')) {
            suggestions.push('IRS (irs.gov)');
        }
        
        if (contextLower.includes('bank') || contextLower.includes('deposit')) {
            suggestions.push('FDIC (fdic.gov)');
        }
        
        // Default suggestions
        if (suggestions.length === 0) {
            suggestions.push('Government financial agencies', 'Reputable financial institutions');
        }
        
        return suggestions;
    }

    identifyCitationNeeds(content) {
        const citationNeeds = [];
        
        for (const pattern of this.citationPatterns) {
            let match;
            const regex = new RegExp(pattern.source, pattern.flags);
            
            while ((match = regex.exec(content)) !== null) {
                const statement = this.extractSentence(content, match.index);
                const context = this.extractContext(content, match.index, 150);
                
                citationNeeds.push({
                    statement,
                    context,
                    position: match.index,
                    trigger: match[0],
                    priority: this.assessCitationPriority(statement),
                    suggestedCitationType: this.suggestCitationType(statement),
                    reason: this.explainCitationNeed(match[0])
                });
            }
        }
        
        return citationNeeds;
    }

    assessCitationPriority(statement) {
        const statementLower = statement.toLowerCase();
        
        // High priority for specific claims
        if (statementLower.includes('study') || 
            statementLower.includes('research') ||
            statementLower.includes('data shows')) {
            return 'high';
        }
        
        // Medium priority for expert opinions
        if (statementLower.includes('experts') || 
            statementLower.includes('analysts')) {
            return 'medium';
        }
        
        return 'low';
    }

    suggestCitationType(statement) {
        const statementLower = statement.toLowerCase();
        
        if (statementLower.includes('study') || statementLower.includes('research')) {
            return 'academic_study';
        }
        
        if (statementLower.includes('survey') || statementLower.includes('poll')) {
            return 'survey_data';
        }
        
        if (statementLower.includes('report') || statementLower.includes('analysis')) {
            return 'industry_report';
        }
        
        if (statementLower.includes('expert') || statementLower.includes('analyst')) {
            return 'expert_opinion';
        }
        
        return 'general_source';
    }

    explainCitationNeed(trigger) {
        const explanations = {
            'studies show': 'Specific study citation required',
            'research indicates': 'Research source needed',
            'data reveals': 'Data source must be cited',
            'experts say': 'Expert identification required',
            'according to': 'Source attribution needed'
        };
        
        const lowerTrigger = trigger.toLowerCase();
        for (const [key, explanation] of Object.entries(explanations)) {
            if (lowerTrigger.includes(key)) {
                return explanation;
            }
        }
        
        return 'Citation recommended for credibility';
    }

    markFinancialAdvice(content) {
        const adviceFlags = [];
        
        for (const pattern of this.advicePatterns) {
            let match;
            const regex = new RegExp(pattern.source, pattern.flags);
            
            while ((match = regex.exec(content)) !== null) {
                const sentence = this.extractSentence(content, match.index);
                const context = this.extractContext(content, match.index, 120);
                
                const adviceType = this.classifyAdviceType(sentence);
                const disclaimerNeeded = this.assessDisclaimerNeed(sentence, adviceType);
                
                adviceFlags.push({
                    sentence,
                    context,
                    position: match.index,
                    trigger: match[0],
                    adviceType,
                    disclaimerNeeded,
                    severity: this.assessAdviceSeverity(sentence),
                    suggestedDisclaimer: this.generateDisclaimer(adviceType),
                    recommendations: this.generateAdviceRecommendations(sentence, adviceType)
                });
            }
        }
        
        return adviceFlags;
    }

    classifyAdviceType(sentence) {
        const sentenceLower = sentence.toLowerCase();
        
        if (sentenceLower.includes('invest') || sentenceLower.includes('portfolio')) {
            return 'investment_advice';
        }
        
        if (sentenceLower.includes('buy') || sentenceLower.includes('sell') || sentenceLower.includes('purchase')) {
            return 'transaction_advice';
        }
        
        if (sentenceLower.includes('guaranteed') || sentenceLower.includes('risk-free')) {
            return 'guarantee_claim';
        }
        
        if (sentenceLower.includes('should') || sentenceLower.includes('recommend')) {
            return 'recommendation';
        }
        
        return 'general_advice';
    }

    assessDisclaimerNeed(sentence, adviceType) {
        const highRiskTypes = ['investment_advice', 'transaction_advice', 'guarantee_claim'];
        const sentenceLower = sentence.toLowerCase();
        
        // Always need disclaimer for high-risk advice types
        if (highRiskTypes.includes(adviceType)) {
            return 'required';
        }
        
        // Need disclaimer for strong language
        if (sentenceLower.includes('guaranteed') || 
            sentenceLower.includes('will return') ||
            sentenceLower.includes('risk-free')) {
            return 'required';
        }
        
        // Recommended for general advice
        if (adviceType === 'recommendation') {
            return 'recommended';
        }
        
        return 'optional';
    }

    assessAdviceSeverity(sentence) {
        const sentenceLower = sentence.toLowerCase();
        
        // High severity for guarantees and specific recommendations
        if (sentenceLower.includes('guaranteed') ||
            sentenceLower.includes('will definitely') ||
            sentenceLower.includes('certain to') ||
            sentenceLower.includes('risk-free')) {
            return 'high';
        }
        
        // Medium severity for strong recommendations
        if (sentenceLower.includes('should') ||
            sentenceLower.includes('must') ||
            sentenceLower.includes('best choice')) {
            return 'medium';
        }
        
        return 'low';
    }

    generateDisclaimer(adviceType) {
        const disclaimers = {
            'investment_advice': 'This content is for educational purposes only and should not be considered personalized investment advice. Consult with a qualified financial advisor before making investment decisions.',
            'transaction_advice': 'This information is general in nature and may not be suitable for your specific financial situation. Consider your individual circumstances before making financial decisions.',
            'guarantee_claim': 'No investment or financial strategy can guarantee returns. All investments carry risk of loss.',
            'recommendation': 'This recommendation may not be suitable for all individuals. Consider your personal financial situation and consult with professionals as needed.',
            'general_advice': 'This content is for informational purposes only and should not replace professional financial advice.'
        };
        
        return disclaimers[adviceType] || disclaimers['general_advice'];
    }

    generateAdviceRecommendations(sentence, adviceType) {
        const recommendations = [];
        
        if (adviceType === 'guarantee_claim') {
            recommendations.push('Remove guarantee language or add risk disclosure');
            recommendations.push('Use conditional language (e.g., "may", "could", "potentially")');
        }
        
        if (adviceType === 'investment_advice') {
            recommendations.push('Add investment disclaimer');
            recommendations.push('Suggest consulting with financial advisor');
        }
        
        if (sentence.toLowerCase().includes('you should')) {
            recommendations.push('Consider softer language: "you might consider" or "one option is"');
        }
        
        return recommendations;
    }

    validateDateReferences(content) {
        const dateIssues = [];
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        
        for (const pattern of this.datePatterns) {
            let match;
            const regex = new RegExp(pattern.source, pattern.flags);
            
            while ((match = regex.exec(content)) !== null) {
                const dateRef = match[0];
                const context = this.extractContext(content, match.index, 80);
                
                const validation = this.validateSpecificDateReference(dateRef, context, currentYear, currentMonth);
                
                if (validation.needsUpdate || validation.isStale) {
                    dateIssues.push({
                        dateReference: dateRef,
                        context,
                        position: match.index,
                        issue: validation.issue,
                        severity: validation.severity,
                        recommendation: validation.recommendation,
                        staleness: validation.staleness
                    });
                }
            }
        }
        
        return dateIssues;
    }

    validateSpecificDateReference(dateRef, context, currentYear, currentMonth) {
        const dateRefLower = dateRef.toLowerCase();
        const contextLower = context.toLowerCase();
        
        // Check for outdated year references
        if (dateRefLower.includes('2024') && currentYear > 2024) {
            return {
                needsUpdate: true,
                issue: 'Outdated year reference',
                severity: 'high',
                recommendation: `Update to ${currentYear}`,
                staleness: 'outdated'
            };
        }
        
        // Check for potentially stale "current" references
        if ((dateRefLower.includes('current') || dateRefLower.includes('currently')) &&
            (contextLower.includes('rate') || contextLower.includes('rule') || contextLower.includes('law'))) {
            return {
                needsUpdate: false,
                isStale: true,
                issue: 'Current reference may become stale',
                severity: 'medium',
                recommendation: 'Add specific date or update frequency note',
                staleness: 'potentially_stale'
            };
        }
        
        // Check for "recent" without specific timeframe
        if (dateRefLower.includes('recent') && !contextLower.includes('202')) {
            return {
                needsUpdate: false,
                isStale: true,
                issue: 'Vague time reference',
                severity: 'low',
                recommendation: 'Add specific date or timeframe',
                staleness: 'vague'
            };
        }
        
        return { needsUpdate: false, isStale: false };
    }

    calculateConfidenceScore(analysis) {
        let score = 100;
        
        // Deduct points for issues
        score -= analysis.statistics.filter(s => s.priority === 'high').length * 15;
        score -= analysis.statistics.filter(s => s.priority === 'medium').length * 10;
        score -= analysis.statistics.filter(s => s.priority === 'low').length * 5;
        
        score -= analysis.citationNeeds.filter(c => c.priority === 'high').length * 12;
        score -= analysis.citationNeeds.filter(c => c.priority === 'medium').length * 8;
        score -= analysis.citationNeeds.filter(c => c.priority === 'low').length * 4;
        
        score -= analysis.financialAdvice.filter(a => a.severity === 'high').length * 20;
        score -= analysis.financialAdvice.filter(a => a.severity === 'medium').length * 10;
        score -= analysis.financialAdvice.filter(a => a.severity === 'low').length * 5;
        
        score -= analysis.dateValidation.filter(d => d.severity === 'high').length * 15;
        score -= analysis.dateValidation.filter(d => d.severity === 'medium').length * 8;
        score -= analysis.dateValidation.filter(d => d.severity === 'low').length * 3;
        
        return Math.max(score, 0);
    }

    generateOverallIssues(analysis) {
        const issues = [];
        
        const highPriorityStats = analysis.statistics.filter(s => s.priority === 'high').length;
        const highPriorityCitations = analysis.citationNeeds.filter(c => c.priority === 'high').length;
        const highSeverityAdvice = analysis.financialAdvice.filter(a => a.severity === 'high').length;
        const outdatedDates = analysis.dateValidation.filter(d => d.severity === 'high').length;
        
        if (highPriorityStats > 3) {
            issues.push(`${highPriorityStats} high-priority statistics need verification`);
        }
        
        if (highPriorityCitations > 2) {
            issues.push(`${highPriorityCitations} statements require citations`);
        }
        
        if (highSeverityAdvice > 0) {
            issues.push(`${highSeverityAdvice} statements contain problematic financial advice`);
        }
        
        if (outdatedDates > 0) {
            issues.push(`${outdatedDates} date references are outdated`);
        }
        
        return issues;
    }

    generateRecommendations(analysis) {
        const recommendations = [];
        
        if (analysis.statistics.length > 5) {
            recommendations.push('Consider reducing number of statistics or provide sources for all claims');
        }
        
        if (analysis.citationNeeds.length > 3) {
            recommendations.push('Add citations for research claims and expert opinions');
        }
        
        if (analysis.financialAdvice.some(a => a.severity === 'high')) {
            recommendations.push('Review financial advice language and add appropriate disclaimers');
        }
        
        if (analysis.dateValidation.length > 0) {
            recommendations.push('Update or clarify date references for accuracy');
        }
        
        if (analysis.confidenceScore < 70) {
            recommendations.push('Article requires significant fact-checking before publication');
        }
        
        return recommendations;
    }

    // Utility methods
    extractContext(content, position, length = 100) {
        const start = Math.max(0, position - length);
        const end = Math.min(content.length, position + length);
        return content.substring(start, end).trim();
    }

    extractSentence(content, position) {
        // Find sentence boundaries around the position
        let start = position;
        let end = position;
        
        // Go backwards to find sentence start
        while (start > 0 && !/[.!?]/.test(content[start - 1])) {
            start--;
        }
        
        // Go forwards to find sentence end
        while (end < content.length && !/[.!?]/.test(content[end])) {
            end++;
        }
        
        return content.substring(start, end + 1).trim();
    }

    deduplicateStatistics(stats) {
        const seen = new Set();
        return stats.filter(stat => {
            const key = `${stat.statistic}_${Math.floor(stat.position / 50)}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
}

// Export functions for use by generator module
function checkArticleAccuracy(article) {
    const checker = new FactChecker();
    return checker.checkArticle(article);
}

function flagStatistics(content) {
    const checker = new FactChecker();
    return checker.flagStatistics(content);
}

function identifyCitationNeeds(content) {
    const checker = new FactChecker();
    return checker.identifyCitationNeeds(content);
}

function markFinancialAdvice(content) {
    const checker = new FactChecker();
    return checker.markFinancialAdvice(content);
}

function validateDateReferences(content) {
    const checker = new FactChecker();
    return checker.validateDateReferences(content);
}

module.exports = {
    FactChecker,
    checkArticleAccuracy,
    flagStatistics,
    identifyCitationNeeds,
    markFinancialAdvice,
    validateDateReferences
};