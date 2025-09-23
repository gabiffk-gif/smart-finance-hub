const fs = require('fs').promises;
const path = require('path');

class AnalyticsMonitor {
    constructor(options = {}) {
        this.contentDir = options.contentDir || path.join(__dirname, '../../content');
        this.dataDir = options.dataDir || path.join(__dirname, '../../data');
        this.metricsFile = path.join(this.dataDir, 'analytics-metrics.json');
        this.reportsDir = path.join(this.dataDir, 'reports');
        
        // Performance thresholds
        this.thresholds = {
            minQualityScore: options.minQualityScore || 80,
            maxReviewTimeHours: options.maxReviewTimeHours || 24,
            minPublishingSuccessRate: options.minPublishingSuccessRate || 85,
            minArticlesPerWeek: options.minArticlesPerWeek || 10,
            maxFailuresPerDay: options.maxFailuresPerDay || 3
        };
        
        // Initialize data structure
        this.metrics = {
            articles: {
                daily: {},
                weekly: {},
                monthly: {}
            },
            quality: {
                daily: {},
                trends: []
            },
            performance: {
                publishingSuccess: {},
                reviewTimes: {},
                systemHealth: {}
            },
            alerts: [],
            lastUpdated: null
        };
        
        this.setupDirectories();
    }

    async setupDirectories() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            await fs.mkdir(this.reportsDir, { recursive: true });
            
            // Load existing metrics
            try {
                const data = await fs.readFile(this.metricsFile, 'utf8');
                this.metrics = { ...this.metrics, ...JSON.parse(data) };
            } catch (error) {
                // File doesn't exist yet, use defaults
                console.log('📊 Initializing new analytics metrics database');
            }
        } catch (error) {
            console.error('❌ Error setting up analytics directories:', error);
        }
    }

    /**
     * Main analytics collection method - run daily
     */
    async collectMetrics() {
        try {
            console.log('📊 Collecting analytics metrics...');
            
            const startTime = Date.now();
            const today = new Date().toISOString().split('T')[0];
            
            // Collect article metrics
            const articleMetrics = await this.collectArticleMetrics();
            
            // Collect quality metrics
            const qualityMetrics = await this.collectQualityMetrics();
            
            // Collect performance metrics
            const performanceMetrics = await this.collectPerformanceMetrics();
            
            // Update metrics database
            this.updateMetrics(today, {
                articles: articleMetrics,
                quality: qualityMetrics,
                performance: performanceMetrics
            });
            
            // Generate alerts
            const alerts = this.generateAlerts(articleMetrics, qualityMetrics, performanceMetrics);
            this.metrics.alerts = alerts;
            
            // Save updated metrics
            await this.saveMetrics();
            
            const processingTime = Date.now() - startTime;
            
            console.log(`✅ Metrics collection completed in ${processingTime}ms`);
            
            return {
                success: true,
                processingTime,
                metricsCollected: {
                    articles: Object.keys(articleMetrics).length,
                    alerts: alerts.length
                }
            };
            
        } catch (error) {
            console.error('❌ Metrics collection failed:', error);
            throw new Error(`Analytics collection failed: ${error.message}`);
        }
    }

    /**
     * Collect article publication metrics
     */
    async collectArticleMetrics() {
        try {
            const metrics = {
                published: 0,
                drafted: 0,
                approved: 0,
                rejected: 0,
                archived: 0,
                totalWordCount: 0,
                averageWordCount: 0,
                categories: {},
                publicationTimes: []
            };
            
            // Get articles from each folder
            const folders = ['published', 'drafts', 'approved', 'rejected', 'archive'];
            
            for (const folder of folders) {
                const articles = await this.getArticlesFromFolder(folder);
                
                for (const article of articles) {
                    // Count by status
                    if (folder === 'published') metrics.published++;
                    else if (folder === 'drafts') metrics.drafted++;
                    else if (folder === 'approved') metrics.approved++;
                    else if (folder === 'rejected') metrics.rejected++;
                    else if (folder === 'archive') metrics.archived++;
                    
                    // Track categories
                    const category = article.category || 'uncategorized';
                    metrics.categories[category] = (metrics.categories[category] || 0) + 1;
                    
                    // Track word counts
                    const wordCount = article.metadata?.wordCount || 0;
                    if (wordCount > 0) {
                        metrics.totalWordCount += wordCount;
                    }
                    
                    // Track publication times for published articles
                    if (folder === 'published' && article.metadata?.publishedAt) {
                        const publishTime = new Date(article.metadata.publishedAt);
                        metrics.publicationTimes.push({
                            date: publishTime.toISOString().split('T')[0],
                            hour: publishTime.getHours(),
                            dayOfWeek: publishTime.getDay()
                        });
                    }
                }
            }
            
            // Calculate averages
            const totalArticles = metrics.published + metrics.drafted + metrics.approved + metrics.rejected;
            if (totalArticles > 0) {
                metrics.averageWordCount = Math.round(metrics.totalWordCount / totalArticles);
            }
            
            return metrics;
            
        } catch (error) {
            console.error('❌ Error collecting article metrics:', error);
            return {};
        }
    }

    /**
     * Collect quality score metrics
     */
    async collectQualityMetrics() {
        try {
            const metrics = {
                averageQualityScore: 0,
                qualityDistribution: {
                    excellent: 0, // 90+
                    good: 0,      // 80-89
                    average: 0,   // 70-79
                    poor: 0       // <70
                },
                categoryQuality: {},
                qualityTrends: [],
                topPerformingArticles: [],
                improvementNeeded: []
            };
            
            const allArticles = [];
            const folders = ['published', 'drafts', 'approved'];
            
            // Collect all articles with quality scores
            for (const folder of folders) {
                const articles = await this.getArticlesFromFolder(folder);
                allArticles.push(...articles.filter(a => a.metadata?.qualityScore?.overall));
            }
            
            if (allArticles.length === 0) return metrics;
            
            let totalQualityScore = 0;
            
            for (const article of allArticles) {
                const qualityScore = article.metadata.qualityScore.overall;
                totalQualityScore += qualityScore;
                
                // Quality distribution
                if (qualityScore >= 90) metrics.qualityDistribution.excellent++;
                else if (qualityScore >= 80) metrics.qualityDistribution.good++;
                else if (qualityScore >= 70) metrics.qualityDistribution.average++;
                else metrics.qualityDistribution.poor++;
                
                // Category quality tracking
                const category = article.category || 'uncategorized';
                if (!metrics.categoryQuality[category]) {
                    metrics.categoryQuality[category] = {
                        total: 0,
                        sum: 0,
                        average: 0,
                        count: 0
                    };
                }
                
                metrics.categoryQuality[category].sum += qualityScore;
                metrics.categoryQuality[category].count++;
                
                // Track top and poor performing articles
                if (qualityScore >= 95) {
                    metrics.topPerformingArticles.push({
                        title: article.title,
                        score: qualityScore,
                        category: category,
                        id: article.metadata.id
                    });
                } else if (qualityScore < 75) {
                    metrics.improvementNeeded.push({
                        title: article.title,
                        score: qualityScore,
                        category: category,
                        id: article.metadata.id,
                        issues: article.metadata.qualityScore.recommendations || []
                    });
                }
            }
            
            // Calculate averages
            metrics.averageQualityScore = Math.round(totalQualityScore / allArticles.length);
            
            // Calculate category averages
            Object.keys(metrics.categoryQuality).forEach(category => {
                const cat = metrics.categoryQuality[category];
                cat.average = Math.round(cat.sum / cat.count);
            });
            
            // Sort and limit lists
            metrics.topPerformingArticles.sort((a, b) => b.score - a.score).splice(10);
            metrics.improvementNeeded.sort((a, b) => a.score - b.score).splice(20);
            
            // Generate quality trends (last 30 days)
            metrics.qualityTrends = await this.generateQualityTrends();
            
            return metrics;
            
        } catch (error) {
            console.error('❌ Error collecting quality metrics:', error);
            return {};
        }
    }

    /**
     * Collect system performance metrics
     */
    async collectPerformanceMetrics() {
        try {
            const metrics = {
                publishingSuccessRate: 0,
                averageReviewTime: 0,
                systemUptime: process.uptime(),
                errorRate: 0,
                processingTimes: {
                    generation: [],
                    review: [],
                    publishing: []
                },
                failureReasons: {},
                bottlenecks: []
            };
            
            // Calculate publishing success rate
            const published = await this.getArticlesFromFolder('published');
            const rejected = await this.getArticlesFromFolder('rejected');
            const total = published.length + rejected.length;
            
            if (total > 0) {
                metrics.publishingSuccessRate = Math.round((published.length / total) * 100);
            }
            
            // Calculate review times
            const reviewTimes = [];
            const approved = await this.getArticlesFromFolder('approved');
            
            [...published, ...approved].forEach(article => {
                if (article.metadata?.createdAt && article.metadata?.approvedAt) {
                    const created = new Date(article.metadata.createdAt);
                    const approved = new Date(article.metadata.approvedAt);
                    const reviewTimeHours = (approved - created) / (1000 * 60 * 60);
                    reviewTimes.push(reviewTimeHours);
                }
            });
            
            if (reviewTimes.length > 0) {
                metrics.averageReviewTime = Math.round(
                    reviewTimes.reduce((sum, time) => sum + time, 0) / reviewTimes.length * 100
                ) / 100;
            }
            
            // Analyze failure reasons from rejected articles
            const rejected_articles = await this.getArticlesFromFolder('rejected');
            rejected_articles.forEach(article => {
                const reason = article.metadata?.rejectionReason || 'Unknown';
                metrics.failureReasons[reason] = (metrics.failureReasons[reason] || 0) + 1;
            });
            
            // Identify bottlenecks
            if (metrics.averageReviewTime > this.thresholds.maxReviewTimeHours) {
                metrics.bottlenecks.push('Review process is slower than expected');
            }
            
            if (metrics.publishingSuccessRate < this.thresholds.minPublishingSuccessRate) {
                metrics.bottlenecks.push('Publishing success rate is below threshold');
            }
            
            return metrics;
            
        } catch (error) {
            console.error('❌ Error collecting performance metrics:', error);
            return {};
        }
    }

    /**
     * Update metrics database with new data
     */
    updateMetrics(date, newMetrics) {
        const today = new Date().toISOString().split('T')[0];
        const week = this.getWeekNumber(new Date());
        const month = today.substring(0, 7); // YYYY-MM
        
        // Update daily metrics
        this.metrics.articles.daily[today] = newMetrics.articles;
        this.metrics.quality.daily[today] = newMetrics.quality;
        this.metrics.performance[today] = newMetrics.performance;
        
        // Update weekly aggregates
        if (!this.metrics.articles.weekly[week]) {
            this.metrics.articles.weekly[week] = {
                published: 0,
                drafted: 0,
                approved: 0,
                rejected: 0,
                totalWordCount: 0
            };
        }
        
        const weekData = this.metrics.articles.weekly[week];
        weekData.published += newMetrics.articles.published || 0;
        weekData.drafted += newMetrics.articles.drafted || 0;
        weekData.approved += newMetrics.articles.approved || 0;
        weekData.rejected += newMetrics.articles.rejected || 0;
        weekData.totalWordCount += newMetrics.articles.totalWordCount || 0;
        
        // Update monthly aggregates
        if (!this.metrics.articles.monthly[month]) {
            this.metrics.articles.monthly[month] = {
                published: 0,
                drafted: 0,
                approved: 0,
                rejected: 0,
                averageQualityScore: 0,
                totalWordCount: 0
            };
        }
        
        const monthData = this.metrics.articles.monthly[month];
        monthData.published += newMetrics.articles.published || 0;
        monthData.drafted += newMetrics.articles.drafted || 0;
        monthData.approved += newMetrics.articles.approved || 0;
        monthData.rejected += newMetrics.articles.rejected || 0;
        monthData.averageQualityScore = newMetrics.quality.averageQualityScore || 0;
        monthData.totalWordCount += newMetrics.articles.totalWordCount || 0;
        
        // Clean up old data (keep last 90 days)
        this.cleanupOldMetrics();
        
        this.metrics.lastUpdated = new Date().toISOString();
    }

    /**
     * Generate alerts based on metrics
     */
    generateAlerts(articleMetrics, qualityMetrics, performanceMetrics) {
        const alerts = [];
        const today = new Date().toISOString().split('T')[0];
        
        // Quality score alerts
        if (qualityMetrics.averageQualityScore < this.thresholds.minQualityScore) {
            alerts.push({
                type: 'warning',
                category: 'quality',
                title: 'Low Average Quality Score',
                message: `Average quality score (${qualityMetrics.averageQualityScore}) is below threshold (${this.thresholds.minQualityScore})`,
                severity: 'medium',
                date: today,
                recommendations: [
                    'Review content generation parameters',
                    'Improve fact-checking processes',
                    'Enhance SEO optimization'
                ]
            });
        }
        
        // Publishing success rate alerts
        if (performanceMetrics.publishingSuccessRate < this.thresholds.minPublishingSuccessRate) {
            alerts.push({
                type: 'error',
                category: 'performance',
                title: 'Low Publishing Success Rate',
                message: `Publishing success rate (${performanceMetrics.publishingSuccessRate}%) is below threshold (${this.thresholds.minPublishingSuccessRate}%)`,
                severity: 'high',
                date: today,
                recommendations: [
                    'Investigate common rejection reasons',
                    'Improve content generation quality',
                    'Review approval criteria'
                ]
            });
        }
        
        // Review time alerts
        if (performanceMetrics.averageReviewTime > this.thresholds.maxReviewTimeHours) {
            alerts.push({
                type: 'warning',
                category: 'workflow',
                title: 'Slow Review Process',
                message: `Average review time (${performanceMetrics.averageReviewTime}h) exceeds threshold (${this.thresholds.maxReviewTimeHours}h)`,
                severity: 'medium',
                date: today,
                recommendations: [
                    'Increase reviewer capacity',
                    'Streamline review process',
                    'Implement auto-approval for high-quality content'
                ]
            });
        }
        
        // Production volume alerts
        const weeklyPublished = this.getWeeklyPublishedCount();
        if (weeklyPublished < this.thresholds.minArticlesPerWeek) {
            alerts.push({
                type: 'info',
                category: 'production',
                title: 'Low Weekly Production',
                message: `Weekly published articles (${weeklyPublished}) is below target (${this.thresholds.minArticlesPerWeek})`,
                severity: 'low',
                date: today,
                recommendations: [
                    'Increase content generation frequency',
                    'Reduce bottlenecks in approval process',
                    'Consider automated publishing for high-quality content'
                ]
            });
        }
        
        // Category performance alerts
        Object.entries(qualityMetrics.categoryQuality || {}).forEach(([category, data]) => {
            if (data.average < 70) {
                alerts.push({
                    type: 'warning',
                    category: 'quality',
                    title: `Low Quality in ${category} Category`,
                    message: `Average quality score for ${category} (${data.average}) is concerning`,
                    severity: 'medium',
                    date: today,
                    recommendations: [
                        `Review ${category} content templates`,
                        `Improve ${category} keyword research`,
                        `Add more sources for ${category} topics`
                    ]
                });
            }
        });
        
        return alerts;
    }

    /**
     * Generate daily report
     */
    async generateDailyReport() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const report = {
                date: today,
                generatedAt: new Date().toISOString(),
                summary: await this.generateSummaryStatistics(),
                insights: this.generateInsights(),
                recommendations: this.generateRecommendations(),
                alerts: this.metrics.alerts.filter(a => a.date === today),
                trends: await this.generateTrendAnalysis(),
                forecast: this.generateForecast()
            };
            
            // Save report
            const reportPath = path.join(this.reportsDir, `daily-report-${today}.json`);
            await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
            
            // Also save as latest report
            const latestPath = path.join(this.reportsDir, 'latest-daily-report.json');
            await fs.writeFile(latestPath, JSON.stringify(report, null, 2));
            
            console.log(`📋 Daily report generated: ${reportPath}`);
            
            return report;
            
        } catch (error) {
            console.error('❌ Error generating daily report:', error);
            throw error;
        }
    }

    /**
     * Generate summary statistics
     */
    async generateSummaryStatistics() {
        const today = new Date().toISOString().split('T')[0];
        const week = this.getWeekNumber(new Date());
        const month = today.substring(0, 7);
        
        const dailyMetrics = this.metrics.articles.daily[today] || {};
        const weeklyMetrics = this.metrics.articles.weekly[week] || {};
        const monthlyMetrics = this.metrics.articles.monthly[month] || {};
        const qualityMetrics = this.metrics.quality.daily[today] || {};
        
        return {
            today: {
                published: dailyMetrics.published || 0,
                drafted: dailyMetrics.drafted || 0,
                approved: dailyMetrics.approved || 0,
                rejected: dailyMetrics.rejected || 0,
                averageQuality: qualityMetrics.averageQualityScore || 0,
                totalWordCount: dailyMetrics.totalWordCount || 0
            },
            thisWeek: {
                published: weeklyMetrics.published || 0,
                drafted: weeklyMetrics.drafted || 0,
                approved: weeklyMetrics.approved || 0,
                rejected: weeklyMetrics.rejected || 0,
                totalWordCount: weeklyMetrics.totalWordCount || 0
            },
            thisMonth: {
                published: monthlyMetrics.published || 0,
                drafted: monthlyMetrics.drafted || 0,
                approved: monthlyMetrics.approved || 0,
                rejected: monthlyMetrics.rejected || 0,
                averageQuality: monthlyMetrics.averageQualityScore || 0,
                totalWordCount: monthlyMetrics.totalWordCount || 0
            },
            allTime: await this.calculateAllTimeStats()
        };
    }

    /**
     * Generate insights from data
     */
    generateInsights() {
        const insights = [];
        const qualityData = this.metrics.quality.daily;
        const recentDays = Object.keys(qualityData).slice(-7);
        
        // Quality trend insight
        if (recentDays.length >= 2) {
            const recent = qualityData[recentDays[recentDays.length - 1]]?.averageQualityScore || 0;
            const previous = qualityData[recentDays[recentDays.length - 2]]?.averageQualityScore || 0;
            
            if (recent > previous) {
                insights.push({
                    type: 'positive',
                    title: 'Quality Improvement',
                    message: `Quality scores have improved by ${(recent - previous).toFixed(1)} points compared to yesterday`,
                    impact: 'high'
                });
            } else if (recent < previous - 5) {
                insights.push({
                    type: 'negative',
                    title: 'Quality Decline',
                    message: `Quality scores have dropped by ${(previous - recent).toFixed(1)} points compared to yesterday`,
                    impact: 'high'
                });
            }
        }
        
        // Production volume insight
        const weeklyCount = this.getWeeklyPublishedCount();
        const targetWeekly = this.thresholds.minArticlesPerWeek;
        
        if (weeklyCount > targetWeekly * 1.2) {
            insights.push({
                type: 'positive',
                title: 'High Production Volume',
                message: `Weekly production (${weeklyCount} articles) exceeds target by ${Math.round(((weeklyCount / targetWeekly) - 1) * 100)}%`,
                impact: 'medium'
            });
        }
        
        return insights;
    }

    /**
     * Generate recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        const qualityMetrics = this.metrics.quality.daily[new Date().toISOString().split('T')[0]] || {};
        
        // Quality-based recommendations
        if (qualityMetrics.averageQualityScore < 80) {
            recommendations.push({
                category: 'quality',
                priority: 'high',
                title: 'Improve Content Quality',
                actions: [
                    'Review and update content generation prompts',
                    'Implement additional fact-checking steps',
                    'Enhance SEO optimization processes',
                    'Provide feedback to content generation system'
                ],
                expectedImpact: 'Increase average quality score by 5-10 points'
            });
        }
        
        // Performance-based recommendations
        const performance = this.metrics.performance[new Date().toISOString().split('T')[0]] || {};
        if (performance.averageReviewTime > 12) {
            recommendations.push({
                category: 'workflow',
                priority: 'medium',
                title: 'Optimize Review Process',
                actions: [
                    'Implement automated quality checks',
                    'Create review priority queues',
                    'Add more reviewers during peak times',
                    'Streamline approval workflow'
                ],
                expectedImpact: 'Reduce review time by 20-30%'
            });
        }
        
        // Category-specific recommendations
        const categoryQuality = qualityMetrics.categoryQuality || {};
        Object.entries(categoryQuality).forEach(([category, data]) => {
            if (data.average < 75) {
                recommendations.push({
                    category: 'content',
                    priority: 'medium',
                    title: `Improve ${category} Content`,
                    actions: [
                        `Research trending ${category} topics`,
                        `Update ${category} content templates`,
                        `Add authoritative sources for ${category}`,
                        `Review ${category} keyword strategies`
                    ],
                    expectedImpact: `Improve ${category} quality scores by 10-15 points`
                });
            }
        });
        
        return recommendations;
    }

    /**
     * Generate trend analysis
     */
    async generateTrendAnalysis() {
        const trends = {
            quality: this.analyzeQualityTrends(),
            production: this.analyzeProductionTrends(),
            categories: this.analyzeCategoryTrends()
        };
        
        return trends;
    }

    /**
     * Generate forecast
     */
    generateForecast() {
        const forecast = {
            nextWeek: {
                expectedArticles: this.forecastWeeklyProduction(),
                qualityProjection: this.forecastQuality(),
                potentialIssues: this.identifyPotentialIssues()
            },
            nextMonth: {
                productionGoals: this.calculateMonthlyGoals(),
                improvementTargets: this.setImprovementTargets()
            }
        };
        
        return forecast;
    }

    /**
     * Export data for dashboard
     */
    async exportDashboardData() {
        try {
            const dashboardData = {
                lastUpdated: this.metrics.lastUpdated,
                summary: await this.generateSummaryStatistics(),
                alerts: this.metrics.alerts.filter(a => {
                    const alertDate = new Date(a.date);
                    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    return alertDate > weekAgo;
                }),
                charts: {
                    qualityTrends: this.getQualityTrendsForChart(),
                    productionVolume: this.getProductionVolumeForChart(),
                    categoryBreakdown: this.getCategoryBreakdownForChart(),
                    reviewTimes: this.getReviewTimesForChart()
                },
                kpis: this.calculateKPIs(),
                recommendations: this.generateRecommendations().slice(0, 5)
            };
            
            // Save dashboard data
            const dashboardPath = path.join(this.dataDir, 'dashboard-data.json');
            await fs.writeFile(dashboardPath, JSON.stringify(dashboardData, null, 2));
            
            return dashboardData;
            
        } catch (error) {
            console.error('❌ Error exporting dashboard data:', error);
            throw error;
        }
    }

    /**
     * Utility methods
     */
    async getArticlesFromFolder(folder) {
        try {
            const folderPath = path.join(this.contentDir, folder);
            const files = await fs.readdir(folderPath);
            const articles = [];
            
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                
                try {
                    const content = await fs.readFile(path.join(folderPath, file), 'utf8');
                    articles.push(JSON.parse(content));
                } catch (error) {
                    console.warn(`⚠️ Error reading ${folder}/${file}:`, error.message);
                }
            }
            
            return articles;
        } catch (error) {
            // Folder might not exist
            return [];
        }
    }

    async saveMetrics() {
        try {
            await fs.writeFile(this.metricsFile, JSON.stringify(this.metrics, null, 2));
        } catch (error) {
            console.error('❌ Error saving metrics:', error);
        }
    }

    getWeekNumber(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }

    getWeeklyPublishedCount() {
        const week = this.getWeekNumber(new Date());
        return this.metrics.articles.weekly[week]?.published || 0;
    }

    cleanupOldMetrics() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90);
        const cutoffString = cutoffDate.toISOString().split('T')[0];
        
        // Clean up daily metrics
        Object.keys(this.metrics.articles.daily).forEach(date => {
            if (date < cutoffString) {
                delete this.metrics.articles.daily[date];
                delete this.metrics.quality.daily[date];
                delete this.metrics.performance[date];
            }
        });
    }

    async generateQualityTrends() {
        const trends = [];
        const last30Days = Object.keys(this.metrics.quality.daily)
            .sort()
            .slice(-30);
        
        last30Days.forEach(date => {
            const data = this.metrics.quality.daily[date];
            if (data && data.averageQualityScore) {
                trends.push({
                    date,
                    score: data.averageQualityScore,
                    distribution: data.qualityDistribution
                });
            }
        });
        
        return trends;
    }

    analyzeQualityTrends() {
        const trends = this.metrics.quality.trends || [];
        if (trends.length < 7) return { trend: 'insufficient_data' };
        
        const recent = trends.slice(-7);
        const scores = recent.map(t => t.score);
        const avgRecent = scores.reduce((a, b) => a + b, 0) / scores.length;
        const avgPrevious = trends.slice(-14, -7).map(t => t.score).reduce((a, b) => a + b, 0) / 7;
        
        const change = avgRecent - avgPrevious;
        
        return {
            trend: change > 2 ? 'improving' : change < -2 ? 'declining' : 'stable',
            change: change.toFixed(1),
            current: avgRecent.toFixed(1),
            direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
        };
    }

    analyzeProductionTrends() {
        // Similar analysis for production volume
        return { trend: 'stable', weeklyAverage: this.getWeeklyPublishedCount() };
    }

    analyzeCategoryTrends() {
        // Analyze trends by category
        return {};
    }

    forecastWeeklyProduction() {
        const recentWeeks = Object.values(this.metrics.articles.weekly).slice(-4);
        if (recentWeeks.length === 0) return 0;
        
        const avg = recentWeeks.reduce((sum, week) => sum + (week.published || 0), 0) / recentWeeks.length;
        return Math.round(avg);
    }

    forecastQuality() {
        const recentQuality = Object.values(this.metrics.quality.daily).slice(-7);
        if (recentQuality.length === 0) return 0;
        
        const avg = recentQuality.reduce((sum, day) => sum + (day.averageQualityScore || 0), 0) / recentQuality.length;
        return Math.round(avg);
    }

    identifyPotentialIssues() {
        const issues = [];
        
        if (this.getWeeklyPublishedCount() < this.thresholds.minArticlesPerWeek) {
            issues.push('Production volume may fall short of weekly targets');
        }
        
        return issues;
    }

    calculateMonthlyGoals() {
        return {
            articlesTarget: this.thresholds.minArticlesPerWeek * 4,
            qualityTarget: this.thresholds.minQualityScore,
            successRateTarget: this.thresholds.minPublishingSuccessRate
        };
    }

    setImprovementTargets() {
        const current = this.metrics.quality.daily[new Date().toISOString().split('T')[0]] || {};
        
        return {
            qualityImprovement: Math.max(85, (current.averageQualityScore || 0) + 5),
            reviewTimeReduction: Math.max(12, this.metrics.performance.averageReviewTime * 0.8),
            successRateImprovement: Math.min(95, this.metrics.performance.publishingSuccessRate + 5)
        };
    }

    async calculateAllTimeStats() {
        // Calculate cumulative statistics
        const allPublished = await this.getArticlesFromFolder('published');
        const allRejected = await this.getArticlesFromFolder('rejected');
        
        return {
            totalPublished: allPublished.length,
            totalRejected: allRejected.length,
            overallSuccessRate: Math.round((allPublished.length / (allPublished.length + allRejected.length)) * 100) || 0,
            totalWordCount: allPublished.reduce((sum, article) => sum + (article.metadata?.wordCount || 0), 0)
        };
    }

    getQualityTrendsForChart() {
        return this.metrics.quality.trends.slice(-30);
    }

    getProductionVolumeForChart() {
        const last30Days = Object.keys(this.metrics.articles.daily)
            .sort()
            .slice(-30)
            .map(date => ({
                date,
                published: this.metrics.articles.daily[date]?.published || 0,
                drafted: this.metrics.articles.daily[date]?.drafted || 0
            }));
        
        return last30Days;
    }

    getCategoryBreakdownForChart() {
        const today = new Date().toISOString().split('T')[0];
        const todayMetrics = this.metrics.articles.daily[today] || {};
        
        return Object.entries(todayMetrics.categories || {}).map(([category, count]) => ({
            category,
            count
        }));
    }

    getReviewTimesForChart() {
        return Object.keys(this.metrics.performance)
            .sort()
            .slice(-14)
            .map(date => ({
                date,
                reviewTime: this.metrics.performance[date]?.averageReviewTime || 0
            }));
    }

    calculateKPIs() {
        const today = new Date().toISOString().split('T')[0];
        const todayQuality = this.metrics.quality.daily[today] || {};
        const todayPerformance = this.metrics.performance[today] || {};
        
        return {
            qualityScore: todayQuality.averageQualityScore || 0,
            publishingSuccessRate: todayPerformance.publishingSuccessRate || 0,
            weeklyProduction: this.getWeeklyPublishedCount(),
            averageReviewTime: todayPerformance.averageReviewTime || 0,
            alertCount: this.metrics.alerts.filter(a => a.severity === 'high').length
        };
    }
}

module.exports = AnalyticsMonitor;

// CLI usage
if (require.main === module) {
    const monitor = new AnalyticsMonitor();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'collect':
            monitor.collectMetrics()
                .then(result => {
                    console.log('✅ Metrics collection completed:', result);
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Collection failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'report':
            monitor.generateDailyReport()
                .then(report => {
                    console.log('📋 Daily report generated');
                    console.log('Summary:', report.summary);
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Report generation failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'export':
            monitor.exportDashboardData()
                .then(data => {
                    console.log('📊 Dashboard data exported');
                    console.log('KPIs:', data.kpis);
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Export failed:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log('Usage: node analytics.js <command>');
            console.log('Commands:');
            console.log('  collect - Collect current metrics');
            console.log('  report  - Generate daily report');
            console.log('  export  - Export dashboard data');
            process.exit(1);
    }
}

module.exports = AnalyticsMonitor;