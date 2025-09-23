/**
 * Advanced Article Editor for Smart Finance Hub Review Console
 * Handles rich text editing, auto-save, undo/redo, SEO analysis
 */

class ArticleEditor {
    constructor() {
        this.currentArticle = null;
        this.changeHistory = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        this.autoSaveTimer = null;
        this.hasUnsavedChanges = false;
        this.seoIssues = [];
        this.qualityScore = 0;
        
        // Rich text editing state
        this.isRichTextMode = false;
        this.selectedRange = null;
        
        this.initializeEditor();
    }

    initializeEditor() {
        this.setupEventListeners();
        this.startAutoSave();
        this.setupKeyboardShortcuts();
    }

    /**
     * Load article content into the editor
     */
    async loadArticle(articleId) {
        try {
            const response = await this.apiCall(`/articles/${articleId}`);
            this.currentArticle = response.article;
            
            // Populate form fields
            this.populateForm(this.currentArticle);
            
            // Initialize change tracking
            this.saveInitialState();
            
            // Run initial SEO analysis
            this.analyzeSEO();
            
            // Calculate initial quality score
            this.calculateQualityScore();
            
            console.log(`Loaded article: ${this.currentArticle.title}`);
            return this.currentArticle;
            
        } catch (error) {
            console.error('Failed to load article:', error);
            this.showNotification('Failed to load article', 'error');
            throw error;
        }
    }

    populateForm(article) {
        const fields = {
            'editTitle': article.title,
            'editMetaDescription': article.metaDescription,
            'editContent': article.content,
            'editCTA': article.cta || ''
        };
        
        Object.entries(fields).forEach(([fieldId, value]) => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.value = value;
                this.setupFieldTracking(element);
            }
        });
        
        // Update word count and other metrics
        this.updateMetrics();
    }

    setupFieldTracking(element) {
        // Track changes for undo/redo
        element.addEventListener('input', (e) => {
            this.onFieldChange(e.target.id, e.target.value);
        });
        
        // Track focus for rich text editing
        if (element.id === 'editContent') {
            element.addEventListener('focus', () => this.onContentFocus());
            element.addEventListener('blur', () => this.onContentBlur());
            element.addEventListener('select', () => this.saveSelection());
        }
    }

    /**
     * Change tracking system for undo/redo
     */
    onFieldChange(fieldId, newValue) {
        const oldValue = this.getFieldValue(fieldId, this.currentArticle);
        
        if (oldValue !== newValue) {
            this.recordChange({
                type: 'field_change',
                fieldId,
                oldValue,
                newValue,
                timestamp: Date.now()
            });
            
            this.hasUnsavedChanges = true;
            this.updateSaveStatus();
            
            // Real-time updates
            this.debouncedAnalyze();
        }
    }

    recordChange(change) {
        // Remove any changes after current index (for redo functionality)
        if (this.historyIndex < this.changeHistory.length - 1) {
            this.changeHistory = this.changeHistory.slice(0, this.historyIndex + 1);
        }
        
        // Add new change
        this.changeHistory.push(change);
        this.historyIndex++;
        
        // Limit history size
        if (this.changeHistory.length > this.maxHistorySize) {
            this.changeHistory.shift();
            this.historyIndex--;
        }
        
        this.updateUndoRedoButtons();
    }

    saveInitialState() {
        this.changeHistory = [];
        this.historyIndex = -1;
        this.hasUnsavedChanges = false;
        this.updateSaveStatus();
        this.updateUndoRedoButtons();
    }

    undo() {
        if (this.historyIndex >= 0) {
            const change = this.changeHistory[this.historyIndex];
            this.applyChange(change, true); // true = reverse
            this.historyIndex--;
            this.updateUndoRedoButtons();
            this.hasUnsavedChanges = true;
            this.debouncedAnalyze();
        }
    }

    redo() {
        if (this.historyIndex < this.changeHistory.length - 1) {
            this.historyIndex++;
            const change = this.changeHistory[this.historyIndex];
            this.applyChange(change, false); // false = forward
            this.updateUndoRedoButtons();
            this.hasUnsavedChanges = true;
            this.debouncedAnalyze();
        }
    }

    applyChange(change, reverse = false) {
        if (change.type === 'field_change') {
            const element = document.getElementById(change.fieldId);
            if (element) {
                element.value = reverse ? change.oldValue : change.newValue;
            }
        }
    }

    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        if (undoBtn) undoBtn.disabled = this.historyIndex < 0;
        if (redoBtn) redoBtn.disabled = this.historyIndex >= this.changeHistory.length - 1;
    }

    /**
     * Auto-save functionality
     */
    startAutoSave() {
        this.autoSaveTimer = setInterval(() => {
            if (this.hasUnsavedChanges && this.currentArticle) {
                this.autoSave();
            }
        }, 30000); // 30 seconds
    }

    async autoSave() {
        if (!this.currentArticle || !this.hasUnsavedChanges) return;
        
        try {
            await this.saveArticle(true); // true = auto-save
            this.showNotification('Auto-saved', 'info', 2000);
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }

    async saveArticle(isAutoSave = false) {
        if (!this.currentArticle) return;
        
        const updates = {
            title: document.getElementById('editTitle').value,
            metaDescription: document.getElementById('editMetaDescription').value,
            content: document.getElementById('editContent').value,
            cta: document.getElementById('editCTA').value,
            updatedBy: isAutoSave ? 'Auto-save' : 'Manual Save'
        };
        
        try {
            await this.apiCall(`/articles/${this.currentArticle.metadata.id}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            
            // Update current article
            Object.assign(this.currentArticle, updates);
            
            this.hasUnsavedChanges = false;
            this.updateSaveStatus();
            
            if (!isAutoSave) {
                this.showNotification('Article saved successfully!', 'success');
            }
            
        } catch (error) {
            console.error('Save failed:', error);
            this.showNotification('Failed to save article', 'error');
            throw error;
        }
    }

    /**
     * SEO Analysis and Issue Highlighting
     */
    analyzeSEO() {
        this.seoIssues = [];
        
        const title = document.getElementById('editTitle').value;
        const metaDescription = document.getElementById('editMetaDescription').value;
        const content = document.getElementById('editContent').value;
        
        // Title length analysis
        if (title.length < 40) {
            this.seoIssues.push({
                field: 'title',
                type: 'length',
                severity: 'warning',
                message: `Title too short (${title.length}/60 characters)`,
                suggestion: 'Expand title to 40-60 characters for better SEO'
            });
        } else if (title.length > 60) {
            this.seoIssues.push({
                field: 'title',
                type: 'length',
                severity: 'error',
                message: `Title too long (${title.length}/60 characters)`,
                suggestion: 'Shorten title to under 60 characters'
            });
        }
        
        // Meta description analysis
        if (metaDescription.length < 140) {
            this.seoIssues.push({
                field: 'metaDescription',
                type: 'length',
                severity: 'warning',
                message: `Meta description too short (${metaDescription.length}/160 characters)`,
                suggestion: 'Expand to 140-160 characters for better SERP display'
            });
        } else if (metaDescription.length > 160) {
            this.seoIssues.push({
                field: 'metaDescription',
                type: 'length',
                severity: 'error',
                message: `Meta description too long (${metaDescription.length}/160 characters)`,
                suggestion: 'Shorten to under 160 characters'
            });
        }
        
        // Content analysis
        const wordCount = this.getWordCount(content);
        if (wordCount < 2000) {
            this.seoIssues.push({
                field: 'content',
                type: 'length',
                severity: 'warning',
                message: `Content too short (${wordCount} words)`,
                suggestion: 'Aim for at least 2000 words for comprehensive coverage'
            });
        }
        
        // Keyword density analysis
        const keywordDensity = this.calculateKeywordDensity(content, title);
        if (keywordDensity < 1.0) {
            this.seoIssues.push({
                field: 'content',
                type: 'keyword_density',
                severity: 'warning',
                message: `Low keyword density (${keywordDensity.toFixed(1)}%)`,
                suggestion: 'Increase target keyword usage naturally'
            });
        } else if (keywordDensity > 2.0) {
            this.seoIssues.push({
                field: 'content',
                type: 'keyword_density',
                severity: 'error',
                message: `High keyword density (${keywordDensity.toFixed(1)}%)`,
                suggestion: 'Reduce keyword usage to avoid over-optimization'
            });
        }
        
        // Heading structure analysis
        const headingIssues = this.analyzeHeadingStructure(content);
        this.seoIssues.push(...headingIssues);
        
        this.highlightIssues();
        this.updateSEOPanel();
    }

    analyzeHeadingStructure(content) {
        const issues = [];
        const h1Count = (content.match(/<h1[^>]*>/gi) || []).length;
        const h2Count = (content.match(/<h2[^>]*>/gi) || []).length;
        
        if (h1Count === 0) {
            issues.push({
                field: 'content',
                type: 'heading',
                severity: 'error',
                message: 'No H1 heading found',
                suggestion: 'Add one main H1 heading for the article'
            });
        } else if (h1Count > 1) {
            issues.push({
                field: 'content',
                type: 'heading',
                severity: 'warning',
                message: `Multiple H1 headings (${h1Count})`,
                suggestion: 'Use only one H1 heading per article'
            });
        }
        
        if (h2Count < 3) {
            issues.push({
                field: 'content',
                type: 'heading',
                severity: 'warning',
                message: `Too few H2 headings (${h2Count})`,
                suggestion: 'Add more H2 headings to structure content better'
            });
        }
        
        return issues;
    }

    highlightIssues() {
        // Remove previous highlights
        document.querySelectorAll('.seo-issue').forEach(el => {
            el.classList.remove('seo-issue', 'seo-warning', 'seo-error');
        });
        
        // Add new highlights
        this.seoIssues.forEach(issue => {
            const element = document.getElementById(`edit${issue.field.charAt(0).toUpperCase() + issue.field.slice(1)}`);
            if (element) {
                element.classList.add('seo-issue', `seo-${issue.severity}`);
                
                // Add tooltip with issue details
                element.title = `${issue.message} - ${issue.suggestion}`;
            }
        });
    }

    updateSEOPanel() {
        const panel = document.getElementById('seoIssuesPanel');
        if (!panel) return;
        
        if (this.seoIssues.length === 0) {
            panel.innerHTML = '<div class="seo-success">✅ No SEO issues found!</div>';
            return;
        }
        
        const issuesByField = this.seoIssues.reduce((acc, issue) => {
            if (!acc[issue.field]) acc[issue.field] = [];
            acc[issue.field].push(issue);
            return acc;
        }, {});
        
        panel.innerHTML = Object.entries(issuesByField).map(([field, issues]) => `
            <div class="seo-field-issues">
                <h4>${field.charAt(0).toUpperCase() + field.slice(1)} Issues:</h4>
                ${issues.map(issue => `
                    <div class="seo-issue-item seo-${issue.severity}">
                        <span class="seo-issue-icon">${issue.severity === 'error' ? '🚫' : '⚠️'}</span>
                        <div>
                            <div class="seo-issue-message">${issue.message}</div>
                            <div class="seo-issue-suggestion">${issue.suggestion}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    /**
     * Article Preview Functionality
     */
    updatePreview() {
        const title = document.getElementById('editTitle').value;
        const metaDescription = document.getElementById('editMetaDescription').value;
        const content = document.getElementById('editContent').value;
        const cta = document.getElementById('editCTA').value;
        
        const previewContainer = document.getElementById('articlePreview');
        if (!previewContainer) return;
        
        // Generate preview HTML with Smart Finance Hub styling
        previewContainer.innerHTML = `
            <div class="article-preview-wrapper">
                <div class="preview-header">
                    <div class="preview-breadcrumb">
                        <a href="/">Home</a> › <a href="/articles">Articles</a> › ${title}
                    </div>
                </div>
                
                <article class="preview-article">
                    <header class="preview-article-header">
                        <h1 class="preview-title">${title}</h1>
                        <p class="preview-meta-description">${metaDescription}</p>
                        <div class="preview-article-meta">
                            <span class="preview-author">By Smart Finance Hub Team</span>
                            <span class="preview-date">${new Date().toLocaleDateString()}</span>
                            <span class="preview-read-time">${this.calculateReadTime(content)} min read</span>
                        </div>
                    </header>
                    
                    <div class="preview-featured-image">
                        <div class="preview-image-placeholder">
                            📊 Featured Image Placeholder
                        </div>
                    </div>
                    
                    <div class="preview-content">
                        ${this.processContentForPreview(content)}
                    </div>
                    
                    ${cta ? `
                        <div class="preview-cta">
                            <div class="cta-box">
                                ${cta}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="preview-newsletter-signup">
                        <div class="newsletter-preview">
                            📧 Newsletter Signup Component (Auto-inserted)
                        </div>
                    </div>
                </article>
            </div>
        `;
        
        // Apply preview styling
        this.applyPreviewStyling();
    }

    processContentForPreview(content) {
        // Convert relative links to absolute
        let processedContent = content.replace(/href="\/([^"]*)/g, 'href="https://smartfinancehub.vip/$1');
        
        // Add placeholder images for image tags without src
        processedContent = processedContent.replace(/<img([^>]*?)>/g, (match, attrs) => {
            if (!attrs.includes('src=')) {
                return `<div class="preview-image-placeholder">🖼️ Image Placeholder</div>`;
            }
            return match;
        });
        
        return processedContent;
    }

    applyPreviewStyling() {
        // Inject preview-specific CSS if not already present
        if (!document.getElementById('previewStyles')) {
            const style = document.createElement('style');
            style.id = 'previewStyles';
            style.textContent = `
                .article-preview-wrapper {
                    max-width: 800px;
                    margin: 0 auto;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #2d3748;
                }
                
                .preview-breadcrumb {
                    font-size: 0.9rem;
                    color: #64748b;
                    margin-bottom: 1rem;
                }
                
                .preview-breadcrumb a {
                    color: #667eea;
                    text-decoration: none;
                }
                
                .preview-title {
                    font-size: 2.5rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                    color: #2d3748;
                }
                
                .preview-meta-description {
                    font-size: 1.2rem;
                    color: #64748b;
                    margin-bottom: 1.5rem;
                }
                
                .preview-article-meta {
                    display: flex;
                    gap: 1rem;
                    font-size: 0.9rem;
                    color: #64748b;
                    border-bottom: 1px solid #e2e8f0;
                    padding-bottom: 1rem;
                    margin-bottom: 2rem;
                }
                
                .preview-featured-image {
                    margin-bottom: 2rem;
                }
                
                .preview-image-placeholder {
                    background: #f8fafc;
                    border: 2px dashed #cbd5e1;
                    padding: 2rem;
                    text-align: center;
                    border-radius: 8px;
                    color: #64748b;
                }
                
                .preview-content h1 { font-size: 2rem; margin: 2rem 0 1rem 0; }
                .preview-content h2 { font-size: 1.5rem; margin: 1.5rem 0 0.75rem 0; }
                .preview-content h3 { font-size: 1.25rem; margin: 1.25rem 0 0.5rem 0; }
                .preview-content p { margin-bottom: 1rem; }
                .preview-content ul, .preview-content ol { margin-bottom: 1rem; padding-left: 2rem; }
                .preview-content li { margin-bottom: 0.5rem; }
                
                .preview-cta {
                    margin: 2rem 0;
                }
                
                .cta-box {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 2rem;
                    border-radius: 12px;
                    text-align: center;
                }
                
                .newsletter-preview {
                    background: #f8fafc;
                    border: 2px dashed #cbd5e1;
                    padding: 2rem;
                    text-align: center;
                    border-radius: 8px;
                    color: #64748b;
                    margin-top: 2rem;
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Quality Score Calculation
     */
    async calculateQualityScore() {
        if (!this.currentArticle) return;
        
        const title = document.getElementById('editTitle').value;
        const metaDescription = document.getElementById('editMetaDescription').value;
        const content = document.getElementById('editContent').value;
        
        // Mock article object for scoring
        const mockArticle = {
            title,
            metaDescription,
            content,
            cta: document.getElementById('editCTA').value
        };
        
        const scores = {
            readability: this.calculateReadabilityScore(content),
            seo: this.calculateSEOScore(mockArticle),
            keywordDensity: this.calculateKeywordDensityScore(content, title),
            structure: this.calculateStructureScore(mockArticle),
            length: this.calculateLengthScore(content)
        };
        
        // Weighted overall score
        this.qualityScore = Math.round(
            (scores.readability * 0.25) +
            (scores.seo * 0.25) +
            (scores.keywordDensity * 0.20) +
            (scores.structure * 0.20) +
            (scores.length * 0.10)
        );
        
        this.updateQualityDisplay(this.qualityScore, scores);
    }

    calculateReadabilityScore(content) {
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = content.split(/\s+/).filter(w => w.length > 0);
        
        if (sentences.length === 0 || words.length === 0) return 0;
        
        const avgWordsPerSentence = words.length / sentences.length;
        
        // Simple readability based on sentence length
        if (avgWordsPerSentence <= 15) return 100;
        if (avgWordsPerSentence <= 20) return 85;
        if (avgWordsPerSentence <= 25) return 70;
        return 50;
    }

    calculateSEOScore(article) {
        let score = 0;
        
        // Title length
        const titleLen = article.title.length;
        if (titleLen >= 40 && titleLen <= 60) score += 25;
        else if (titleLen <= 70) score += 15;
        else score += 5;
        
        // Meta description length
        const metaLen = article.metaDescription.length;
        if (metaLen >= 140 && metaLen <= 160) score += 25;
        else if (metaLen <= 170) score += 15;
        else score += 5;
        
        // Heading structure
        const h1Count = (article.content.match(/<h1[^>]*>/gi) || []).length;
        const h2Count = (article.content.match(/<h2[^>]*>/gi) || []).length;
        
        if (h1Count === 1 && h2Count >= 3) score += 25;
        else if (h1Count <= 1 && h2Count >= 2) score += 15;
        else score += 5;
        
        // Links (simplified)
        const linkCount = (article.content.match(/href=/gi) || []).length;
        if (linkCount >= 5) score += 25;
        else if (linkCount >= 3) score += 15;
        else score += 5;
        
        return Math.min(score, 100);
    }

    calculateKeywordDensityScore(content, title) {
        const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const keyword = title.split(' ')[0]?.toLowerCase();
        
        if (!keyword || words.length === 0) return 0;
        
        const keywordCount = words.filter(w => w.includes(keyword)).length;
        const density = (keywordCount / words.length) * 100;
        
        if (density >= 1.0 && density <= 2.0) return 100;
        if (density >= 0.5 && density <= 2.5) return 75;
        if (density >= 0.1 && density <= 3.0) return 50;
        return 25;
    }

    calculateStructureScore(article) {
        let score = 0;
        
        if (article.content.length > 500) score += 25; // Has substantial content
        if (article.content.includes('<h2')) score += 25; // Has sections
        if (article.cta && article.cta.length > 20) score += 25; // Has CTA
        if (article.content.toLowerCase().includes('conclusion') || 
            article.content.toLowerCase().includes('summary')) score += 25; // Has conclusion
        
        return score;
    }

    calculateLengthScore(content) {
        const wordCount = this.getWordCount(content);
        
        if (wordCount >= 2000 && wordCount <= 3500) return 100;
        if (wordCount >= 1500 && wordCount <= 4000) return 85;
        if (wordCount >= 1000 && wordCount <= 4500) return 70;
        if (wordCount >= 500) return 50;
        return 25;
    }

    updateQualityDisplay(overallScore, breakdown) {
        const qualityElement = document.getElementById('qualityScore');
        const breakdownElement = document.getElementById('qualityBreakdown');
        
        if (qualityElement) {
            qualityElement.textContent = overallScore;
            qualityElement.className = `quality-score ${this.getQualityClass(overallScore)}`;
        }
        
        if (breakdownElement) {
            breakdownElement.innerHTML = Object.entries(breakdown).map(([key, score]) => `
                <div class="quality-metric">
                    <span class="metric-label">${key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    <span class="metric-score ${this.getQualityClass(score)}">${score}</span>
                </div>
            `).join('');
        }
    }

    getQualityClass(score) {
        if (score >= 85) return 'quality-high';
        if (score >= 70) return 'quality-medium';
        return 'quality-low';
    }

    /**
     * Rich Text Editing Functions
     */
    toggleRichText() {
        this.isRichTextMode = !this.isRichTextMode;
        const contentArea = document.getElementById('editContent');
        
        if (this.isRichTextMode) {
            this.enableRichTextMode(contentArea);
        } else {
            this.disableRichTextMode(contentArea);
        }
    }

    enableRichTextMode(element) {
        element.style.fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif';
        element.style.fontSize = '14px';
        element.style.lineHeight = '1.5';
        
        // Add rich text toolbar
        this.showRichTextToolbar();
    }

    disableRichTextMode(element) {
        element.style.fontFamily = 'Monaco, Menlo, monospace';
        element.style.fontSize = '13px';
        element.style.lineHeight = '1.4';
        
        // Hide rich text toolbar
        this.hideRichTextToolbar();
    }

    showRichTextToolbar() {
        let toolbar = document.getElementById('richTextToolbar');
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.id = 'richTextToolbar';
            toolbar.className = 'rich-text-toolbar';
            toolbar.innerHTML = `
                <button type="button" onclick="editor.formatText('bold')" title="Bold">B</button>
                <button type="button" onclick="editor.formatText('italic')" title="Italic">I</button>
                <button type="button" onclick="editor.insertHeading(2)" title="Heading 2">H2</button>
                <button type="button" onclick="editor.insertHeading(3)" title="Heading 3">H3</button>
                <button type="button" onclick="editor.insertList('ul')" title="Bullet List">• List</button>
                <button type="button" onclick="editor.insertList('ol')" title="Numbered List">1. List</button>
                <button type="button" onclick="editor.insertLink()" title="Insert Link">🔗</button>
            `;
            
            const contentArea = document.getElementById('editContent');
            contentArea.parentNode.insertBefore(toolbar, contentArea);
        }
        toolbar.style.display = 'flex';
    }

    hideRichTextToolbar() {
        const toolbar = document.getElementById('richTextToolbar');
        if (toolbar) {
            toolbar.style.display = 'none';
        }
    }

    saveSelection() {
        const contentArea = document.getElementById('editContent');
        if (contentArea && contentArea === document.activeElement) {
            this.selectedRange = {
                start: contentArea.selectionStart,
                end: contentArea.selectionEnd
            };
        }
    }

    restoreSelection() {
        const contentArea = document.getElementById('editContent');
        if (contentArea && this.selectedRange) {
            contentArea.focus();
            contentArea.setSelectionRange(this.selectedRange.start, this.selectedRange.end);
        }
    }

    formatText(command) {
        const contentArea = document.getElementById('editContent');
        const start = contentArea.selectionStart;
        const end = contentArea.selectionEnd;
        const selectedText = contentArea.value.substring(start, end);
        
        if (selectedText) {
            let formattedText = '';
            
            switch(command) {
                case 'bold':
                    formattedText = `<strong>${selectedText}</strong>`;
                    break;
                case 'italic':
                    formattedText = `<em>${selectedText}</em>`;
                    break;
            }
            
            this.insertTextAtCursor(formattedText, start, end);
        }
    }

    insertHeading(level) {
        const contentArea = document.getElementById('editContent');
        const start = contentArea.selectionStart;
        const end = contentArea.selectionEnd;
        const selectedText = contentArea.value.substring(start, end) || 'New Heading';
        
        const headingText = `<h${level}>${selectedText}</h${level}>`;
        this.insertTextAtCursor(headingText, start, end);
    }

    insertList(type) {
        const listType = type === 'ul' ? 'ul' : 'ol';
        const listText = `<${listType}>\n    <li>List item 1</li>\n    <li>List item 2</li>\n    <li>List item 3</li>\n</${listType}>`;
        
        this.insertTextAtCursor(listText);
    }

    insertLink() {
        const url = prompt('Enter URL:');
        const text = prompt('Enter link text:') || url;
        
        if (url) {
            const linkText = `<a href="${url}">${text}</a>`;
            this.insertTextAtCursor(linkText);
        }
    }

    insertTextAtCursor(text, start = null, end = null) {
        const contentArea = document.getElementById('editContent');
        
        if (start === null) {
            start = contentArea.selectionStart;
            end = contentArea.selectionEnd;
        }
        
        const beforeText = contentArea.value.substring(0, start);
        const afterText = contentArea.value.substring(end);
        
        contentArea.value = beforeText + text + afterText;
        
        // Set cursor position after inserted text
        const newCursorPos = start + text.length;
        contentArea.setSelectionRange(newCursorPos, newCursorPos);
        
        // Trigger change event
        contentArea.dispatchEvent(new Event('input'));
    }

    /**
     * Utility Functions
     */
    getWordCount(text) {
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }

    calculateReadTime(content) {
        const wordsPerMinute = 200;
        const wordCount = this.getWordCount(content);
        return Math.max(1, Math.round(wordCount / wordsPerMinute));
    }

    calculateKeywordDensity(content, title) {
        const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const keyword = title.split(' ')[0]?.toLowerCase();
        
        if (!keyword || words.length === 0) return 0;
        
        const keywordCount = words.filter(w => w.includes(keyword)).length;
        return (keywordCount / words.length) * 100;
    }

    updateMetrics() {
        const title = document.getElementById('editTitle').value;
        const metaDescription = document.getElementById('editMetaDescription').value;
        const content = document.getElementById('editContent').value;
        
        // Update metric displays
        const metrics = {
            titleLength: title.length,
            metaLength: metaDescription.length,
            wordCount: this.getWordCount(content),
            keywordDensity: this.calculateKeywordDensity(content, title).toFixed(1) + '%',
            readTime: this.calculateReadTime(content) + ' min'
        };
        
        Object.entries(metrics).forEach(([key, value]) => {
            const element = document.getElementById(key);
            if (element) {
                element.textContent = value;
            }
        });
    }

    updateSaveStatus() {
        const statusElement = document.getElementById('saveStatus');
        if (statusElement) {
            statusElement.textContent = this.hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved';
            statusElement.className = this.hasUnsavedChanges ? 'save-status unsaved' : 'save-status saved';
        }
    }

    getFieldValue(fieldId, article) {
        const fieldMap = {
            'editTitle': 'title',
            'editMetaDescription': 'metaDescription',
            'editContent': 'content',
            'editCTA': 'cta'
        };
        
        const articleField = fieldMap[fieldId];
        return article ? (article[articleField] || '') : '';
    }

    setupEventListeners() {
        // Debounced analysis function
        this.debouncedAnalyze = this.debounce(() => {
            this.analyzeSEO();
            this.calculateQualityScore();
            this.updateMetrics();
        }, 1000);
        
        // Modal focus management
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('editModal').classList.contains('active')) {
                this.closeEditor();
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 's':
                        e.preventDefault();
                        this.saveArticle();
                        break;
                    case 'z':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.redo();
                        } else {
                            e.preventDefault();
                            this.undo();
                        }
                        break;
                }
            }
        });
    }

    onContentFocus() {
        // Setup content-specific event listeners
    }

    onContentBlur() {
        this.saveSelection();
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    showNotification(message, type = 'info', duration = 4000) {
        // This should integrate with the main dashboard notification system
        console.log(`${type.toUpperCase()}: ${message}`);
    }

    async apiCall(endpoint, options = {}) {
        const response = await fetch(`/api${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    closeEditor() {
        if (this.hasUnsavedChanges) {
            const shouldSave = confirm('You have unsaved changes. Save before closing?');
            if (shouldSave) {
                this.saveArticle().then(() => {
                    this.cleanup();
                });
                return;
            }
        }
        
        this.cleanup();
    }

    cleanup() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        this.currentArticle = null;
        this.changeHistory = [];
        this.historyIndex = -1;
        this.hasUnsavedChanges = false;
        this.seoIssues = [];
    }
}

// Initialize global editor instance
const editor = new ArticleEditor();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ArticleEditor;
}