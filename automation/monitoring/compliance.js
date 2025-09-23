const fs = require('fs').promises;
const path = require('path');

class ComplianceMonitor {
    constructor(options = {}) {
        this.contentDir = options.contentDir || path.join(__dirname, '../../content');
        this.settings = null;
        
        // Compliance thresholds
        this.thresholds = {
            minComplianceScore: options.minComplianceScore || 85,
            maxPolicyViolations: options.maxPolicyViolations || 0,
            requiredDisclaimers: options.requiredDisclaimers || ['affiliate', 'investment'],
            minEEATSignals: options.minEEATSignals || 3
        };
        
        // Required disclaimers by category
        this.disclaimerRequirements = {
            investing: ['investment', 'risk', 'affiliate'],
            banking: ['affiliate', 'deposit_insurance'],
            credit: ['affiliate', 'credit_impact'],
            debt: ['financial_advice', 'affiliate'],
            retirement: ['investment', 'tax_advice', 'affiliate'],
            taxes: ['tax_advice', 'professional_consultation'],
            insurance: ['insurance_advice', 'affiliate'],
            business: ['business_advice', 'affiliate'],
            default: ['affiliate', 'financial_advice']
        };
        
        // E-E-A-T signal patterns
        this.eatSignals = {
            experience: {
                patterns: [
                    /years?\s+of\s+experience/gi,
                    /worked\s+(?:in|with|at|for).{1,50}(?:finance|banking|investment|insurance)/gi,
                    /managed\s+(?:portfolios?|funds?|investments?)/gi,
                    /personal\s+experience\s+with/gi,
                    /I\s+have\s+(?:used|tried|tested|worked\s+with)/gi
                ],
                weight: 0.3
            },
            expertise: {
                patterns: [
                    /(?:CFA|CFP|CPA|ChFC|CLU|FRM|CAIA)\s*(?:charter|certification|certified)?/gi,
                    /(?:certified|licensed)\s+(?:financial|investment)\s+(?:planner|advisor)/gi,
                    /(?:bachelor|master|MBA|degree)\s+in\s+(?:finance|economics|business)/gi,
                    /(?:expert|specialist)\s+in\s+(?:finance|investment|banking)/gi,
                    /studied\s+(?:finance|economics|business)/gi
                ],
                weight: 0.4
            },
            authoritativeness: {
                patterns: [
                    /(?:published|written|authored)\s+(?:articles?|books?|research)/gi,
                    /(?:quoted|featured|interviewed)\s+(?:in|by|on).{1,50}(?:Forbes|Bloomberg|WSJ|CNBC|Reuters)/gi,
                    /(?:speaking|spoke|presented)\s+at\s+(?:conferences?|events?|seminars?)/gi,
                    /recognized\s+(?:expert|authority|leader)/gi,
                    /award.{1,30}(?:financial|investment|business)/gi
                ],
                weight: 0.3
            },
            trustworthiness: {
                patterns: [
                    /(?:regulated|licensed)\s+by\s+(?:SEC|FINRA|CFTC|state\s+regulators?)/gi,
                    /(?:fiduciary|ethical)\s+(?:standard|obligation|duty)/gi,
                    /transparent\s+(?:about|regarding)\s+(?:fees|conflicts|compensation)/gi,
                    /(?:disclosure|conflicts?\s+of\s+interest)/gi,
                    /client\s+(?:testimonials?|reviews?|feedback)/gi
                ],
                weight: 0.2
            }
        };
        
        // Policy violation patterns
        this.policyViolations = {
            guarantees: {
                patterns: [
                    /guaranteed?\s+(?:returns?|profits?|gains?|income)/gi,
                    /(?:will|shall)\s+(?:definitely|certainly|always)\s+(?:make|earn|return|profit)/gi,
                    /(?:risk.free|no\s+risk)\s+(?:investment|strategy|return)/gi,
                    /(?:sure\s+thing|can't\s+lose|certain\s+to\s+win)/gi
                ],
                severity: 'critical',
                message: 'Contains prohibited guarantee language'
            },
            unlicensed_advice: {
                patterns: [
                    /(?:I|we)\s+(?:recommend|advise|suggest)\s+(?:you|that\s+you)\s+(?:buy|sell|invest)/gi,
                    /(?:you\s+should|must|need\s+to)\s+(?:buy|sell|invest\s+in|purchase)/gi,
                    /(?:best|perfect|ideal)\s+(?:investment|stock|fund|strategy)\s+for\s+you/gi,
                    /personalized?\s+(?:investment|financial)\s+advice/gi
                ],
                severity: 'high',
                message: 'Contains language that may constitute unlicensed financial advice'
            },
            misleading_claims: {
                patterns: [
                    /(?:secret|hidden|insider)\s+(?:strategy|method|technique|knowledge)/gi,
                    /(?:wallstreet|wall\s+street)\s+(?:doesn't\s+want|hates|fears)/gi,
                    /(?:banks|government|institutions)\s+(?:don't\s+want|hate|fear)/gi,
                    /(?:this\s+one\s+trick|simple\s+trick|easy\s+method)\s+(?:that|to)/gi,
                    /(?:get\s+rich|make\s+millions?)\s+(?:quick|fast|overnight)/gi
                ],
                severity: 'medium',
                message: 'Contains potentially misleading or sensationalized claims'
            },
            unsubstantiated_claims: {
                patterns: [
                    /(?:studies\s+show|research\s+(?:proves|shows|indicates))\s+(?!.*(?:according\s+to|source|study|research))/gi,
                    /(?:experts?\s+(?:say|believe|recommend))\s+(?!.*(?:according\s+to|expert|source))/gi,
                    /(?:data\s+(?:shows|proves|indicates))\s+(?!.*(?:data\s+from|according\s+to|source))/gi,
                    /(?:\d+%|\d+\s+percent)\s+of\s+(?!.*(?:according\s+to|source|study))/gi
                ],
                severity: 'medium',
                message: 'Contains claims that appear unsubstantiated'
            },
            inappropriate_language: {
                patterns: [
                    /(?:scam|fraud|rip.?off|con|scheme)/gi,
                    /(?:stupid|idiotic|moronic)\s+(?:investors?|people|decisions?)/gi,
                    /(?:hate|despise|loathe)\s+(?:banks|financial\s+institutions)/gi,
                    /(?:financial\s+(?:advisors?|planners?)\s+are\s+(?:useless|worthless|scammers?))/gi
                ],
                severity: 'low',
                message: 'Contains unprofessional or inappropriate language'
            }
        };
        
        // Required disclaimer templates
        this.disclaimerTemplates = {
            investment: {
                required: true,
                pattern: /(?:investment|investing).{0,200}(?:risk|risks?|lose|loss|losses)/gi,
                template: 'Investment advice disclaimer: All investments carry risk of loss. Past performance does not guarantee future results. This content is for educational purposes only and should not be considered personalized investment advice.'
            },
            affiliate: {
                required: true,
                pattern: /affiliate.{0,100}(?:disclosure|commission|earn|compensation)/gi,
                template: 'Affiliate disclosure: Smart Finance Hub may earn a commission from partner links on this page. This doesn\'t affect our editorial opinions or recommendations.'
            },
            financial_advice: {
                required: true,
                pattern: /(?:not|educational).{0,50}(?:financial|investment|tax)\s+advice/gi,
                template: 'This content is for educational purposes only and should not be considered personalized financial advice. Consult with a qualified financial advisor before making financial decisions.'
            },
            risk: {
                required: false,
                pattern: /(?:risk|risks?).{0,100}(?:loss|losses?|lose|losing)/gi,
                template: 'Risk disclosure: All investments carry risk of loss. Consider your risk tolerance and investment objectives before making financial decisions.'
            },
            tax_advice: {
                required: false,
                pattern: /(?:not|educational).{0,50}tax\s+advice/gi,
                template: 'Tax advice disclaimer: This information is general in nature and should not be considered tax advice. Consult with a qualified tax professional for your specific situation.'
            },
            deposit_insurance: {
                required: false,
                pattern: /FDIC.{0,50}insured?/gi,
                template: 'FDIC insurance covers deposits up to $250,000 per depositor, per insured bank, for each account ownership category.'
            },
            credit_impact: {
                required: false,
                pattern: /credit.{0,50}(?:score|report|rating|impact)/gi,
                template: 'Credit impact: Financial decisions may affect your credit score. Monitor your credit report regularly and understand the potential impacts.'
            }
        };
        
        this.loadSettings();
    }

    async loadSettings() {
        try {
            const settingsPath = path.join(__dirname, '../config/settings.json');
            const content = await fs.readFile(settingsPath, 'utf8');
            this.settings = JSON.parse(content);
        } catch (error) {
            console.warn('⚠️ Could not load compliance settings, using defaults');
            this.settings = { complianceRequirements: {} };
        }
    }

    /**
     * Main compliance validation function
     */
    validateCompliance(article) {
        try {
            const validation = {
                articleId: article.metadata?.id || 'unknown',
                title: article.title,
                category: article.category,
                overallScore: 0,
                passed: false,
                
                // Individual check results
                disclaimers: this.checkDisclaimers(article),
                eatSignals: this.validateEEATSignals(article),
                attribution: this.checkAttribution(article),
                policyViolations: this.checkPolicyViolations(article),
                
                // Summary
                warnings: [],
                criticalIssues: [],
                recommendations: [],
                
                // Metadata
                checkedAt: new Date().toISOString(),
                complianceVersion: '1.0'
            };
            
            // Calculate overall compliance score
            validation.overallScore = this.calculateComplianceScore(validation);
            validation.passed = validation.overallScore >= this.thresholds.minComplianceScore && 
                               validation.criticalIssues.length === 0;
            
            // Generate warnings and recommendations
            this.generateComplianceRecommendations(validation);
            
            return validation;
            
        } catch (error) {
            console.error('❌ Compliance validation failed:', error);
            return {
                articleId: article.metadata?.id || 'unknown',
                error: error.message,
                passed: false,
                overallScore: 0,
                checkedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Check for required disclaimers based on article category
     */
    checkDisclaimers(article) {
        const category = article.category || 'default';
        const requiredDisclaimers = this.disclaimerRequirements[category] || this.disclaimerRequirements.default;
        const content = (article.content + ' ' + (article.cta || '')).toLowerCase();
        
        const results = {
            required: requiredDisclaimers,
            found: [],
            missing: [],
            score: 0,
            details: {}
        };
        
        // Check each required disclaimer
        for (const disclaimerType of requiredDisclaimers) {
            const disclaimer = this.disclaimerTemplates[disclaimerType];
            if (!disclaimer) continue;
            
            const found = disclaimer.pattern.test(content);
            results.details[disclaimerType] = {
                required: disclaimer.required,
                found,
                pattern: disclaimer.pattern.source,
                template: disclaimer.template
            };
            
            if (found) {
                results.found.push(disclaimerType);
            } else {
                results.missing.push(disclaimerType);
            }
        }
        
        // Calculate disclaimer score
        if (requiredDisclaimers.length > 0) {
            results.score = Math.round((results.found.length / requiredDisclaimers.length) * 100);
        } else {
            results.score = 100;
        }
        
        return results;
    }

    /**
     * Validate E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) signals
     */
    validateEEATSignals(article) {
        const content = article.content + ' ' + (article.metaDescription || '');
        const authorBio = this.extractAuthorBio(content);
        
        const results = {
            experience: { score: 0, signals: [], matches: [] },
            expertise: { score: 0, signals: [], matches: [] },
            authoritativeness: { score: 0, signals: [], matches: [] },
            trustworthiness: { score: 0, signals: [], matches: [] },
            overallScore: 0,
            totalSignals: 0,
            recommendedSignals: []
        };
        
        // Check each E-E-A-T category
        Object.entries(this.eatSignals).forEach(([category, config]) => {
            let categoryScore = 0;
            const matches = [];
            
            config.patterns.forEach((pattern, index) => {
                const match = content.match(pattern);
                if (match) {
                    matches.push({
                        pattern: pattern.source,
                        match: match[0],
                        context: this.extractContext(content, match.index, 100)
                    });
                    categoryScore += 20; // Each pattern match adds 20 points
                }
            });
            
            results[category].score = Math.min(categoryScore, 100);
            results[category].signals = matches.length;
            results[category].matches = matches;
            results.totalSignals += matches.length;
        });
        
        // Calculate weighted overall E-E-A-T score
        results.overallScore = Math.round(
            (results.experience.score * this.eatSignals.experience.weight) +
            (results.expertise.score * this.eatSignals.expertise.weight) +
            (results.authoritativeness.score * this.eatSignals.authoritativeness.weight) +
            (results.trustworthiness.score * this.eatSignals.trustworthiness.weight)
        );
        
        // Generate recommendations for missing signals
        results.recommendedSignals = this.generateEEATRecommendations(results, article.category);
        
        return results;
    }

    /**
     * Check for proper attribution of claims and statistics
     */
    checkAttribution(article) {
        const content = article.content;
        
        const results = {
            claims: [],
            statistics: [],
            unattributedClaims: [],
            unattributedStatistics: [],
            score: 0,
            issues: []
        };
        
        // Patterns for claims that need attribution
        const claimPatterns = [
            /(?:studies\s+show|research\s+(?:shows|indicates|proves))/gi,
            /(?:experts?\s+(?:say|believe|recommend|suggest))/gi,
            /(?:data\s+(?:shows|indicates|proves|reveals))/gi,
            /(?:according\s+to\s+(?:a\s+)?(?:study|research|report|survey))/gi,
            /(?:analysts?\s+(?:predict|expect|forecast))/gi
        ];
        
        // Patterns for statistics that need sources
        const statisticPatterns = [
            /\d+%\s+of\s+(?:Americans?|people|investors?|consumers?)/gi,
            /\$[\d,]+(?:\.\d{2})?\s+(?:average|median|typical)/gi,
            /(?:increased|decreased|rose|fell)\s+(?:by\s+)?\d+%/gi,
            /\d+\s+(?:times|x)\s+more\s+likely/gi
        ];
        
        // Check for claims
        claimPatterns.forEach(pattern => {
            const matches = [...content.matchAll(pattern)];
            matches.forEach(match => {
                const context = this.extractContext(content, match.index, 200);
                const hasAttribution = this.hasNearbyAttribution(content, match.index);
                
                const claim = {
                    text: match[0],
                    context,
                    hasAttribution,
                    position: match.index
                };
                
                results.claims.push(claim);
                if (!hasAttribution) {
                    results.unattributedClaims.push(claim);
                }
            });
        });
        
        // Check for statistics
        statisticPatterns.forEach(pattern => {
            const matches = [...content.matchAll(pattern)];
            matches.forEach(match => {
                const context = this.extractContext(content, match.index, 200);
                const hasAttribution = this.hasNearbyAttribution(content, match.index);
                
                const statistic = {
                    text: match[0],
                    context,
                    hasAttribution,
                    position: match.index
                };
                
                results.statistics.push(statistic);
                if (!hasAttribution) {
                    results.unattributedStatistics.push(statistic);
                }
            });
        });
        
        // Calculate attribution score
        const totalClaims = results.claims.length + results.statistics.length;
        const totalUnattributed = results.unattributedClaims.length + results.unattributedStatistics.length;
        
        if (totalClaims > 0) {
            results.score = Math.round(((totalClaims - totalUnattributed) / totalClaims) * 100);
        } else {
            results.score = 100; // No claims to attribute
        }
        
        // Generate issues
        if (results.unattributedClaims.length > 0) {
            results.issues.push(`${results.unattributedClaims.length} claims need proper attribution`);
        }
        if (results.unattributedStatistics.length > 0) {
            results.issues.push(`${results.unattributedStatistics.length} statistics need source citations`);
        }
        
        return results;
    }

    /**
     * Check for policy violations
     */
    checkPolicyViolations(article) {
        const content = article.content + ' ' + article.title + ' ' + (article.metaDescription || '');
        
        const results = {
            violations: [],
            severityBreakdown: {
                critical: 0,
                high: 0,
                medium: 0,
                low: 0
            },
            score: 100, // Start with perfect score, deduct for violations
            riskLevel: 'low'
        };
        
        // Check each violation type
        Object.entries(this.policyViolations).forEach(([violationType, config]) => {
            config.patterns.forEach(pattern => {
                const matches = [...content.matchAll(pattern)];
                matches.forEach(match => {
                    const violation = {
                        type: violationType,
                        severity: config.severity,
                        message: config.message,
                        text: match[0],
                        context: this.extractContext(content, match.index, 150),
                        position: match.index
                    };
                    
                    results.violations.push(violation);
                    results.severityBreakdown[config.severity]++;
                    
                    // Deduct points based on severity
                    const deduction = {
                        critical: 50,
                        high: 25,
                        medium: 10,
                        low: 5
                    };
                    results.score -= deduction[config.severity];
                });
            });
        });
        
        results.score = Math.max(results.score, 0);
        
        // Determine risk level
        if (results.severityBreakdown.critical > 0) {
            results.riskLevel = 'critical';
        } else if (results.severityBreakdown.high > 0) {
            results.riskLevel = 'high';
        } else if (results.severityBreakdown.medium > 2) {
            results.riskLevel = 'medium';
        } else {
            results.riskLevel = 'low';
        }
        
        return results;
    }

    /**
     * Calculate overall compliance score
     */
    calculateComplianceScore(validation) {
        const weights = {
            disclaimers: 0.3,
            eatSignals: 0.25,
            attribution: 0.25,
            policyViolations: 0.2
        };
        
        const scores = {
            disclaimers: validation.disclaimers.score || 0,
            eatSignals: validation.eatSignals.overallScore || 0,
            attribution: validation.attribution.score || 0,
            policyViolations: validation.policyViolations.score || 0
        };
        
        let weightedScore = 0;
        Object.entries(weights).forEach(([category, weight]) => {
            weightedScore += scores[category] * weight;
        });
        
        return Math.round(weightedScore);
    }

    /**
     * Generate compliance recommendations
     */
    generateComplianceRecommendations(validation) {
        // Critical issues (must fix)
        if (validation.policyViolations.severityBreakdown.critical > 0) {
            validation.criticalIssues.push('Critical policy violations detected - immediate action required');
        }
        
        if (validation.disclaimers.score < 50) {
            validation.criticalIssues.push('Missing required disclaimers - legal compliance issue');
        }
        
        // Warnings (should fix)
        if (validation.disclaimers.score < 80) {
            validation.warnings.push('Some required disclaimers are missing');
        }
        
        if (validation.eatSignals.overallScore < 60) {
            validation.warnings.push('Insufficient E-E-A-T signals - may impact search rankings');
        }
        
        if (validation.attribution.score < 70) {
            validation.warnings.push('Several claims lack proper attribution');
        }
        
        if (validation.policyViolations.severityBreakdown.high > 0) {
            validation.warnings.push('High-severity policy violations detected');
        }
        
        // Recommendations for improvement
        validation.disclaimers.missing.forEach(disclaimer => {
            const template = this.disclaimerTemplates[disclaimer];
            if (template) {
                validation.recommendations.push({
                    type: 'disclaimer',
                    priority: 'high',
                    title: `Add ${disclaimer} disclaimer`,
                    suggestion: template.template
                });
            }
        });
        
        if (validation.eatSignals.recommendedSignals.length > 0) {
            validation.recommendations.push({
                type: 'eeat',
                priority: 'medium',
                title: 'Enhance E-E-A-T signals',
                suggestions: validation.eatSignals.recommendedSignals
            });
        }
        
        if (validation.attribution.unattributedClaims.length > 0) {
            validation.recommendations.push({
                type: 'attribution',
                priority: 'high',
                title: 'Add source attribution',
                count: validation.attribution.unattributedClaims.length,
                suggestion: 'Add sources for research claims and statistics'
            });
        }
        
        // Policy violation specific recommendations
        validation.policyViolations.violations.forEach(violation => {
            if (violation.severity === 'critical' || violation.severity === 'high') {
                validation.recommendations.push({
                    type: 'policy',
                    priority: violation.severity === 'critical' ? 'critical' : 'high',
                    title: `Fix ${violation.type}`,
                    suggestion: `Remove or revise: "${violation.text.substring(0, 100)}..."`
                });
            }
        });
    }

    /**
     * Generate E-E-A-T improvement recommendations
     */
    generateEEATRecommendations(eatResults, category) {
        const recommendations = [];
        
        if (eatResults.experience.score < 50) {
            recommendations.push('Add personal experience or case studies related to the topic');
            recommendations.push('Include real-world examples from financial situations');
        }
        
        if (eatResults.expertise.score < 50) {
            recommendations.push('Add author credentials or qualifications');
            recommendations.push('Reference formal education or professional certifications');
            recommendations.push('Mention specialized knowledge in financial topics');
        }
        
        if (eatResults.authoritativeness.score < 50) {
            recommendations.push('Add references to published work or media appearances');
            recommendations.push('Include recognition or awards in the financial field');
            recommendations.push('Mention speaking engagements or industry involvement');
        }
        
        if (eatResults.trustworthiness.score < 50) {
            recommendations.push('Add clear disclosure of any conflicts of interest');
            recommendations.push('Include information about regulatory compliance');
            recommendations.push('Add transparency about the review process');
        }
        
        // Category-specific E-E-A-T recommendations
        const categoryRecommendations = {
            investing: [
                'Include portfolio management experience',
                'Reference CFA or investment certifications',
                'Add disclaimers about investment risks'
            ],
            banking: [
                'Mention experience with various banking products',
                'Include knowledge of banking regulations',
                'Reference deposit insurance information'
            ],
            retirement: [
                'Include retirement planning experience',
                'Reference knowledge of retirement accounts',
                'Add tax implications expertise'
            ]
        };
        
        if (categoryRecommendations[category]) {
            recommendations.push(...categoryRecommendations[category]);
        }
        
        return recommendations;
    }

    /**
     * Utility methods
     */
    extractContext(content, position, length = 100) {
        const start = Math.max(0, position - length);
        const end = Math.min(content.length, position + length);
        return content.substring(start, end).trim();
    }

    hasNearbyAttribution(content, position) {
        // Look for attribution patterns within 300 characters of the claim
        const contextLength = 300;
        const start = Math.max(0, position - contextLength);
        const end = Math.min(content.length, position + contextLength);
        const context = content.substring(start, end);
        
        const attributionPatterns = [
            /according\s+to/gi,
            /source:\s*/gi,
            /\([^)]*(?:study|research|report|survey|data)[^)]*\)/gi,
            /(?:study|research|report|survey)\s+(?:by|from|conducted)/gi,
            /\[[^\]]*(?:citation|ref|source)[^\]]*\]/gi,
            /https?:\/\/[^\s]+/gi // URLs as sources
        ];
        
        return attributionPatterns.some(pattern => pattern.test(context));
    }

    extractAuthorBio(content) {
        // Look for author bio sections
        const bioPatterns = [
            /<div[^>]*author[^>]*>(.*?)<\/div>/gis,
            /<section[^>]*bio[^>]*>(.*?)<\/section>/gis,
            /about\s+the\s+author:?\s*(.*?)(?:\n\n|\n\s*\n|$)/gis
        ];
        
        for (const pattern of bioPatterns) {
            const match = content.match(pattern);
            if (match) {
                return match[1].replace(/<[^>]+>/g, '').trim();
            }
        }
        
        return '';
    }

    /**
     * Batch validate multiple articles
     */
    async validateMultipleArticles(articles) {
        const results = {
            totalArticles: articles.length,
            passed: 0,
            failed: 0,
            averageScore: 0,
            criticalIssues: 0,
            validations: []
        };
        
        let totalScore = 0;
        
        for (const article of articles) {
            try {
                const validation = this.validateCompliance(article);
                results.validations.push(validation);
                
                if (validation.passed) {
                    results.passed++;
                } else {
                    results.failed++;
                }
                
                totalScore += validation.overallScore;
                
                if (validation.criticalIssues.length > 0) {
                    results.criticalIssues++;
                }
                
            } catch (error) {
                console.error(`❌ Validation failed for article ${article.metadata?.id}:`, error);
                results.failed++;
            }
        }
        
        if (results.totalArticles > 0) {
            results.averageScore = Math.round(totalScore / results.totalArticles);
        }
        
        return results;
    }

    /**
     * Generate compliance report
     */
    generateComplianceReport(validationResults) {
        const report = {
            generatedAt: new Date().toISOString(),
            summary: {
                totalArticles: validationResults.length,
                passedCompliance: validationResults.filter(v => v.passed).length,
                averageScore: Math.round(validationResults.reduce((sum, v) => sum + v.overallScore, 0) / validationResults.length),
                criticalIssues: validationResults.filter(v => v.criticalIssues.length > 0).length
            },
            categoryBreakdown: {},
            commonIssues: this.identifyCommonIssues(validationResults),
            recommendations: this.generateGlobalRecommendations(validationResults),
            riskAssessment: this.assessOverallRisk(validationResults)
        };
        
        // Category breakdown
        validationResults.forEach(validation => {
            const category = validation.category || 'uncategorized';
            if (!report.categoryBreakdown[category]) {
                report.categoryBreakdown[category] = {
                    count: 0,
                    averageScore: 0,
                    passRate: 0,
                    totalScore: 0
                };
            }
            
            const catData = report.categoryBreakdown[category];
            catData.count++;
            catData.totalScore += validation.overallScore;
            catData.averageScore = Math.round(catData.totalScore / catData.count);
            catData.passRate = Math.round((validationResults.filter(v => v.category === category && v.passed).length / catData.count) * 100);
        });
        
        return report;
    }

    identifyCommonIssues(validationResults) {
        const issues = {};
        
        validationResults.forEach(validation => {
            // Count missing disclaimers
            validation.disclaimers.missing.forEach(disclaimer => {
                const key = `missing_${disclaimer}_disclaimer`;
                issues[key] = (issues[key] || 0) + 1;
            });
            
            // Count policy violations
            validation.policyViolations.violations.forEach(violation => {
                const key = `policy_${violation.type}`;
                issues[key] = (issues[key] || 0) + 1;
            });
            
            // Count attribution issues
            if (validation.attribution.unattributedClaims.length > 0) {
                issues['missing_attribution'] = (issues['missing_attribution'] || 0) + 1;
            }
        });
        
        // Return top 10 issues
        return Object.entries(issues)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([issue, count]) => ({ issue, count }));
    }

    generateGlobalRecommendations(validationResults) {
        const recommendations = [];
        
        const avgScores = {
            disclaimers: 0,
            eatSignals: 0,
            attribution: 0,
            policyViolations: 0
        };
        
        validationResults.forEach(validation => {
            avgScores.disclaimers += validation.disclaimers.score;
            avgScores.eatSignals += validation.eatSignals.overallScore;
            avgScores.attribution += validation.attribution.score;
            avgScores.policyViolations += validation.policyViolations.score;
        });
        
        Object.keys(avgScores).forEach(key => {
            avgScores[key] = avgScores[key] / validationResults.length;
        });
        
        // Generate recommendations based on average scores
        if (avgScores.disclaimers < 80) {
            recommendations.push({
                category: 'disclaimers',
                priority: 'high',
                title: 'Improve disclaimer compliance across all content',
                impact: 'legal',
                actions: [
                    'Create standardized disclaimer templates',
                    'Implement automatic disclaimer insertion',
                    'Train content creators on legal requirements'
                ]
            });
        }
        
        if (avgScores.eatSignals < 70) {
            recommendations.push({
                category: 'eeat',
                priority: 'medium',
                title: 'Enhance E-E-A-T signals site-wide',
                impact: 'seo',
                actions: [
                    'Develop comprehensive author profiles',
                    'Add credentials and experience information',
                    'Implement author bio standardization'
                ]
            });
        }
        
        return recommendations;
    }

    assessOverallRisk(validationResults) {
        const riskFactors = {
            criticalViolations: validationResults.filter(v => v.policyViolations.severityBreakdown.critical > 0).length,
            missingDisclaimers: validationResults.filter(v => v.disclaimers.score < 50).length,
            lowCompliance: validationResults.filter(v => v.overallScore < 60).length
        };
        
        const totalArticles = validationResults.length;
        let riskLevel = 'low';
        
        if (riskFactors.criticalViolations > 0 || riskFactors.missingDisclaimers > totalArticles * 0.1) {
            riskLevel = 'high';
        } else if (riskFactors.lowCompliance > totalArticles * 0.2) {
            riskLevel = 'medium';
        }
        
        return {
            level: riskLevel,
            factors: riskFactors,
            recommendation: this.getRiskRecommendation(riskLevel)
        };
    }

    getRiskRecommendation(riskLevel) {
        const recommendations = {
            low: 'Continue monitoring compliance. Consider periodic audits.',
            medium: 'Implement systematic compliance checks. Address failing articles within 30 days.',
            high: 'Immediate action required. Halt publication until critical issues are resolved.'
        };
        
        return recommendations[riskLevel];
    }
}

// Export validation functions for use in review process
function validateArticleCompliance(article) {
    const monitor = new ComplianceMonitor();
    return monitor.validateCompliance(article);
}

function checkDisclaimers(article) {
    const monitor = new ComplianceMonitor();
    return monitor.checkDisclaimers(article);
}

function validateEEAT(article) {
    const monitor = new ComplianceMonitor();
    return monitor.validateEEATSignals(article);
}

function checkPolicyViolations(article) {
    const monitor = new ComplianceMonitor();
    return monitor.checkPolicyViolations(article);
}

function generateComplianceReport(articles) {
    const monitor = new ComplianceMonitor();
    const validations = articles.map(article => monitor.validateCompliance(article));
    return monitor.generateComplianceReport(validations);
}

module.exports = {
    ComplianceMonitor,
    validateArticleCompliance,
    checkDisclaimers,
    validateEEAT,
    checkPolicyViolations,
    generateComplianceReport
};

// CLI usage
if (require.main === module) {
    const monitor = new ComplianceMonitor();
    
    const command = process.argv[2];
    const filePath = process.argv[3];
    
    switch (command) {
        case 'validate':
            if (!filePath) {
                console.error('❌ Article file path required');
                process.exit(1);
            }
            
            fs.readFile(filePath, 'utf8')
                .then(content => {
                    const article = JSON.parse(content);
                    const result = monitor.validateCompliance(article);
                    
                    console.log('📋 Compliance Validation Results:');
                    console.log(`Overall Score: ${result.overallScore}/100`);
                    console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
                    
                    if (result.criticalIssues.length > 0) {
                        console.log('\\n🚨 Critical Issues:');
                        result.criticalIssues.forEach(issue => console.log(`  • ${issue}`));
                    }
                    
                    if (result.warnings.length > 0) {
                        console.log('\\n⚠️ Warnings:');
                        result.warnings.forEach(warning => console.log(`  • ${warning}`));
                    }
                    
                    if (result.recommendations.length > 0) {
                        console.log('\\n💡 Recommendations:');
                        result.recommendations.forEach(rec => {
                            console.log(`  • [${rec.priority}] ${rec.title}`);
                            if (rec.suggestion) console.log(`    ${rec.suggestion}`);
                        });
                    }
                    
                    process.exit(result.passed ? 0 : 1);
                })
                .catch(error => {
                    console.error('❌ Validation failed:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log('Usage: node compliance.js <command> [options]');
            console.log('Commands:');
            console.log('  validate <file>  - Validate article compliance');
            process.exit(1);
    }
}

module.exports = ComplianceMonitor;