# Smart Finance Hub Automation System

## Overview
Automated content generation and publishing system for [smartfinancehub.vip](https://smartfinancehub.vip) - A comprehensive platform that uses AI to generate high-quality financial content, manages human review workflows, and automates publishing to GitHub Pages.

The system generates educational articles on personal finance topics including investing, banking, credit cards, loans, budgeting, and retirement planning, ensuring all content meets quality standards and compliance requirements.

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- OpenAI API key
- GitHub Personal Access Token
- Git configured for your repository

### Setup Steps
1. **Clone repository**
   ```bash
   git clone https://github.com/gabifk-gif/smart-finance-hub.git
   cd smart-finance-hub
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and tokens
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start the system**
   ```bash
   ./start-automation.sh
   ```

5. **Access review console**
   Open [http://localhost:3000](http://localhost:3000) in your browser

### Testing the System
Before running the full automation, test content generation:
```bash
node test-generation.js
```

## Features

### 🤖 AI Content Generation
- **GPT-4 Integration**: Generates comprehensive articles using OpenAI's latest models
- **50 Financial Topics**: Covers investing, banking, credit cards, loans, budgeting, and retirement
- **Quality Scoring**: Multi-factor quality assessment with 100-point scale
- **SEO Optimization**: Automatic keyword integration, meta tags, and schema markup
- **Fact Checking**: Built-in validation for statistics, citations, and financial claims

### 👥 Human Review System
- **Web-based Dashboard**: Modern interface for article review and editing
- **Real-time Editor**: Rich text editing with undo/redo and auto-save
- **Approval Workflow**: Three-stage process (draft → review → approved)
- **Quality Metrics**: Visual quality score breakdown and improvement suggestions
- **Bulk Operations**: Approve, reject, or archive multiple articles

### 📤 Automated Publishing
- **GitHub Integration**: Direct publishing to GitHub Pages via API
- **HTML Generation**: Converts articles to SEO-optimized web pages
- **Sitemap Management**: Automatic XML sitemap updates and search engine pings
- **Social Media**: Auto-generates social media posts for published content
- **Archive Management**: Intelligent content lifecycle with evergreen protection

### 📊 Analytics & Monitoring
- **Performance Tracking**: Page views, engagement, and conversion metrics
- **Quality Analytics**: Content performance correlation with quality scores
- **Daily Reports**: Automated analytics summaries and trend analysis
- **Error Monitoring**: Comprehensive logging and error recovery mechanisms

### 🔒 Compliance & Security
- **Legal Disclaimers**: Automatic insertion of investment and affiliate disclosures
- **E-E-A-T Validation**: Expertise, Experience, Authoritativeness, Trustworthiness scoring
- **Citation Verification**: Ensures all claims are properly attributed
- **Policy Checking**: Validates content against platform policies

## Architecture

### Folder Structure
```
smart-finance-hub/
├── automation/                 # Core automation system
│   ├── config/                # Configuration files
│   │   ├── settings.json      # Main system settings
│   │   ├── topics.json        # Content topics and keywords
│   │   └── keywords.json      # SEO keyword groups
│   ├── content-generator/     # AI content generation
│   │   ├── generator.js       # Main ContentGenerator class
│   │   ├── seo-optimizer.js   # SEO optimization engine
│   │   └── fact-checker.js    # Fact checking and compliance
│   ├── review-console/        # Human review interface
│   │   ├── server.js          # Express.js server
│   │   ├── dashboard.html     # Review dashboard UI
│   │   └── editor.js          # Article editor logic
│   ├── publisher/             # Publishing automation
│   │   ├── deploy.js          # GitHub Pages publisher
│   │   ├── sitemap-updater.js # XML sitemap management
│   │   └── archive-manager.js # Content lifecycle management
│   ├── monitoring/            # Analytics and compliance
│   │   ├── analytics.js       # Performance monitoring
│   │   └── compliance.js      # Policy compliance checking
│   ├── templates/             # HTML templates
│   │   └── article-template.html # Article page template
│   ├── logs/                  # System logs and PIDs
│   ├── data/                  # Analytics and metrics data
│   └── server.js              # Main automation server
├── content/                   # Content storage
│   ├── drafts/                # Generated drafts awaiting review
│   ├── published/             # Approved content ready for publishing
│   ├── archived/              # Archived content
│   └── images/                # Article images and media
├── articles/                  # Published HTML articles
├── components/                # Reusable HTML components
├── css/                       # Stylesheets
├── js/                        # Client-side JavaScript
├── images/                    # Website images
└── tools/                     # Utility scripts
```

### Data Flow
1. **Content Generation**: AI generates articles based on topic queue and settings
2. **Quality Assessment**: Multi-factor scoring evaluates content quality
3. **Human Review**: Articles enter review queue for human approval
4. **Publishing**: Approved content converts to HTML and deploys to GitHub
5. **Monitoring**: Analytics track performance and compliance metrics
6. **Optimization**: Data feeds back into generation parameters

### Component Integration
- **ContentGenerator** → Creates articles using GPT-4 and quality scoring
- **SEOOptimizer** → Enhances content with keywords, meta tags, and schema
- **FactChecker** → Validates claims and ensures compliance
- **ReviewConsole** → Provides web interface for human oversight
- **Publisher** → Converts approved content to live web pages
- **AnalyticsMonitor** → Tracks performance and generates insights

## API Endpoints

### Review Console API (`http://localhost:3000/api/`)

#### Articles Management
- `GET /articles` - List all articles with filters
- `GET /articles/:id` - Get specific article details
- `POST /articles` - Create new article manually
- `PUT /articles/:id` - Update article content
- `DELETE /articles/:id` - Delete article
- `POST /articles/:id/approve` - Approve article for publishing
- `POST /articles/:id/reject` - Reject article with feedback

#### Content Generation
- `POST /generate` - Trigger manual content generation
- `POST /generate/batch` - Generate multiple articles
- `GET /generation/status` - Check generation progress
- `GET /topics` - List available topics
- `PUT /topics/:id/priority` - Update topic priority

#### Publishing
- `POST /publish/:id` - Publish specific article
- `POST /publish/batch` - Publish multiple articles
- `GET /publish/status` - Check publishing status
- `POST /sitemap/update` - Trigger sitemap update

#### Analytics
- `GET /analytics/dashboard` - Dashboard metrics
- `GET /analytics/articles/:id` - Article-specific analytics
- `GET /analytics/performance` - Performance trends
- `POST /analytics/report` - Generate custom report

#### Quality & Compliance
- `GET /quality/score/:id` - Get article quality score
- `POST /quality/rescore/:id` - Recalculate quality score
- `GET /compliance/check/:id` - Run compliance check
- `GET /compliance/report` - System compliance report

#### System Management
- `GET /system/status` - System health and uptime
- `GET /system/logs` - Recent system logs
- `POST /system/backup` - Create system backup
- `POST /system/restart` - Restart specific services

## Scheduling

### Automated Tasks (Production Mode)
- **Content Generation**: Daily at 6:00 AM
  - Generates 5 new articles based on topic priority
  - Runs quality assessment and SEO optimization
  - Adds articles to review queue

- **Analytics Collection**: Every hour
  - Collects page view and engagement metrics
  - Updates performance dashboards
  - Triggers alerts for anomalies

- **Daily Analytics Report**: Daily at 8:00 AM
  - Generates comprehensive daily report
  - Emails summary to administrators
  - Updates trending content lists

- **Compliance Check**: Daily at 10:00 AM
  - Scans all content for policy violations
  - Validates disclaimer placement
  - Checks citation accuracy

- **Sitemap Update**: Daily at 2:00 AM
  - Regenerates XML sitemap
  - Pings search engines with updates
  - Updates robots.txt if needed

- **Archive Management**: Weekly on Sundays at 3:00 AM
  - Reviews content age and performance
  - Archives underperforming content
  - Protects evergreen high-performers

### Manual Triggers
All scheduled tasks can be triggered manually through the Review Console or API endpoints.

### Development Mode
In development mode (`NODE_ENV=development`), cron jobs are configured but not automatically started. Use the Review Console to trigger tasks manually.

## Configuration

### Main Settings (`automation/config/settings.json`)

#### Content Generation Settings
```json
{
  "contentGeneration": {
    "articlesPerDay": 5,
    "minWordCount": 1500,
    "maxWordCount": 3000,
    "qualityThreshold": 75,
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 4000
  }
}
```

#### Quality Assessment Weights
```json
{
  "qualityWeights": {
    "contentQuality": 30,    // Depth, accuracy, usefulness
    "seoOptimization": 25,   // Keywords, meta tags, structure
    "readability": 20,       // Flesch score, sentence length
    "structure": 15,         // Headers, formatting, flow
    "engagement": 10         // Hook, CTA, interactive elements
  }
}
```

#### SEO Configuration
```json
{
  "seo": {
    "keywordDensity": {
      "min": 1.0,
      "max": 2.5
    },
    "metaDescriptionLength": {
      "min": 140,
      "max": 160
    },
    "internalLinksPerArticle": {
      "min": 3,
      "max": 8
    }
  }
}
```

#### Publishing Settings
```json
{
  "publishing": {
    "githubBranch": "main",
    "deployPath": "/",
    "generateSocialPosts": true,
    "updateSitemap": true,
    "notifySearchEngines": true
  }
}
```

### Topic Configuration (`automation/config/topics.json`)
Controls which topics are generated and their priority:
- **Priority Levels**: 1 (highest) to 5 (lowest)
- **Categories**: investing, banking, credit-cards, loans, budgeting, retirement
- **Keywords**: SEO-focused keyword sets for each topic
- **Seasonality**: Optional seasonal boosting for relevant topics

### Keyword Groups (`automation/config/keywords.json`)
SEO keyword organization:
- **Primary Keywords**: Main focus keywords
- **Secondary Keywords**: Supporting keywords
- **Long-tail Keywords**: Specific phrases
- **Search Intent**: Informational, commercial, navigational

## Environment Variables

Required variables in `.env`:
```bash
# AI Content Generation
OPENAI_API_KEY=your_openai_api_key

# GitHub Integration
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repository_name

# Analytics
GOOGLE_ANALYTICS_ID=your_ga_measurement_id

# Monetization
ADSENSE_CLIENT_ID=your_adsense_client_id

# Server Configuration
PORT=3000
NODE_ENV=production
```

## Troubleshooting

### Common Issues

#### Content Generation Fails
- **Check API Key**: Ensure `OPENAI_API_KEY` is valid and has sufficient credits
- **Review Rate Limits**: OpenAI has rate limits that may cause temporary failures
- **Validate Topics**: Ensure `topics.json` contains valid topic configurations

#### Publishing Errors
- **GitHub Token**: Verify token has repository write permissions
- **Branch Permissions**: Ensure target branch allows direct pushes
- **File Conflicts**: Check for merge conflicts in the repository

#### Review Console Not Loading
- **Port Conflicts**: Check if port 3000 is already in use
- **Dependencies**: Run `npm install` in both root and automation directories
- **Log Files**: Check `automation/logs/automation-server.log` for errors

#### Low Quality Scores
- **Adjust Weights**: Modify quality weights in `settings.json`
- **Review Prompts**: Update generation prompts for better content
- **Topic Keywords**: Ensure topics have relevant keyword sets

### Getting Help
- **Logs**: Check `automation/logs/` for detailed error information
- **Status**: Use the system status API endpoint for health checks
- **Test Generation**: Run `node test-generation.js` to isolate issues

## License
This project is proprietary software for Smart Finance Hub.

## Support
For technical support or feature requests, please contact the development team.
