const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const https = require('https');
const OpenAI = require('openai');
const ContentGenerator = require('./content-generator/generator');
require('dotenv').config();

class SmartFinanceTestSystem {
    constructor() {
        this.results = {
            openai: { status: 'pending', details: '' },
            filesystem: { status: 'pending', details: '' },
            articleGeneration: { status: 'pending', details: '' },
            apiEndpoints: { status: 'pending', details: '' }
        };
        this.testStartTime = Date.now();
    }

    // ANSI color codes for terminal output
    colors = {
        reset: '\x1b[0m',
        bright: '\x1b[1m',
        dim: '\x1b[2m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m'
    };

    log(message, color = 'white') {
        console.log(`${this.colors[color]}${message}${this.colors.reset}`);
    }

    logSection(title) {
        console.log('\n' + '='.repeat(60));
        this.log(`${title}`, 'cyan');
        console.log('='.repeat(60));
    }

    logTest(testName, status, details = '') {
        const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏳';
        const color = status === 'pass' ? 'green' : status === 'fail' ? 'red' : 'yellow';
        this.log(`${icon} ${testName}`, color);
        if (details) {
            this.log(`   ${details}`, 'dim');
        }
    }

    async testOpenAIConnection() {
        this.logSection('🤖 OpenAI API Connection Test');
        
        try {
            // Check if API key is loaded
            if (!process.env.OPENAI_API_KEY) {
                throw new Error('OPENAI_API_KEY environment variable not found');
            }
            
            this.logTest('API Key Loading', 'pass', 'Environment variable loaded successfully');

            // Initialize OpenAI client
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });

            this.logTest('OpenAI Client Initialization', 'pass', 'Client created successfully');

            // Test simple completion
            this.log('🔄 Testing API connection with simple completion...', 'yellow');
            
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a test assistant. Respond with exactly: "API connection successful"'
                    },
                    {
                        role: 'user',
                        content: 'Test connection'
                    }
                ],
                max_tokens: 10,
                temperature: 0
            });

            const responseText = response.choices[0].message.content.trim();
            
            if (responseText.includes('API connection successful')) {
                this.logTest('API Response Test', 'pass', `Response: "${responseText}"`);
                this.results.openai = { status: 'pass', details: 'OpenAI API connection successful' };
            } else {
                this.logTest('API Response Test', 'fail', `Unexpected response: "${responseText}"`);
                this.results.openai = { status: 'fail', details: `Unexpected response: ${responseText}` };
            }

        } catch (error) {
            this.logTest('OpenAI Connection', 'fail', error.message);
            this.results.openai = { status: 'fail', details: error.message };
            
            // Log additional error details
            if (error.status) {
                this.log(`   Status Code: ${error.status}`, 'red');
            }
            if (error.type) {
                this.log(`   Error Type: ${error.type}`, 'red');
            }
        }
    }

    async testFileSystem() {
        this.logSection('📁 File System Test');
        
        try {
            const requiredDirs = [
                'content/drafts',
                'content/approved',
                'content/published',
                'content/rejected',
                'content/archive',
                'content/social-queue'
            ];

            let allDirsExist = true;
            
            // Check all required directories
            for (const dir of requiredDirs) {
                const fullPath = path.join(__dirname, '..', dir);
                try {
                    const stats = await fs.stat(fullPath);
                    if (stats.isDirectory()) {
                        this.logTest(`Directory ${dir}`, 'pass', `Exists at ${fullPath}`);
                    } else {
                        this.logTest(`Directory ${dir}`, 'fail', 'Path exists but is not a directory');
                        allDirsExist = false;
                    }
                } catch (error) {
                    this.logTest(`Directory ${dir}`, 'fail', 'Directory does not exist');
                    allDirsExist = false;
                }
            }

            // Test file write/read operations
            const testFilePath = path.join(__dirname, '..', 'content', 'drafts', 'test-file.json');
            const testData = {
                test: true,
                timestamp: new Date().toISOString(),
                message: 'This is a test file created by the system test'
            };

            try {
                // Write test file
                await fs.writeFile(testFilePath, JSON.stringify(testData, null, 2));
                this.logTest('File Write Test', 'pass', `Created test file at ${testFilePath}`);

                // Read test file
                const readData = JSON.parse(await fs.readFile(testFilePath, 'utf8'));
                if (readData.test === true && readData.message === testData.message) {
                    this.logTest('File Read Test', 'pass', 'Test file read and verified successfully');
                } else {
                    this.logTest('File Read Test', 'fail', 'Test file content mismatch');
                }

                // Clean up test file
                await fs.unlink(testFilePath);
                this.logTest('File Cleanup', 'pass', 'Test file removed successfully');

            } catch (error) {
                this.logTest('File Operations', 'fail', `Error: ${error.message}`);
                allDirsExist = false;
            }

            this.results.filesystem = { 
                status: allDirsExist ? 'pass' : 'fail', 
                details: allDirsExist ? 'All directories exist and file operations work' : 'Some directories missing or file operations failed'
            };

        } catch (error) {
            this.logTest('File System Test', 'fail', error.message);
            this.results.filesystem = { status: 'fail', details: error.message };
        }
    }

    async testArticleGeneration() {
        this.logSection('📝 Article Generation Test');
        
        try {
            // Initialize content generator
            this.log('🔄 Initializing Content Generator...', 'yellow');
            const generator = new ContentGenerator();
            
            // Load configurations
            await generator.loadConfigurations();
            this.logTest('Configuration Loading', 'pass', 'Settings, topics, and keywords loaded');

            // Generate single article
            this.log('🔄 Generating test article...', 'yellow');
            const articles = await generator.generateArticles(1);
            
            if (articles.length > 0) {
                const article = articles[0];
                this.logTest('Article Generation', 'pass', `Generated article: "${article.title.slice(0, 50)}..."`);
                
                // Check article structure
                const hasRequiredFields = article.title && article.content && article.metadata;
                this.logTest('Article Structure', hasRequiredFields ? 'pass' : 'fail', 
                    hasRequiredFields ? 'All required fields present' : 'Missing required fields');

                // Check quality score
                if (article.metadata.qualityScore) {
                    const score = article.metadata.qualityScore;
                    this.logTest('Quality Scoring', 'pass', `Overall score: ${score.overall}`);
                    
                    this.log('   📊 Score Breakdown:', 'cyan');
                    Object.entries(score.breakdown).forEach(([key, value]) => {
                        this.log(`      ${key}: ${value}`, 'dim');
                    });
                } else {
                    this.logTest('Quality Scoring', 'fail', 'No quality score found');
                }

                // Check if saved to drafts
                const draftPath = path.join(__dirname, '..', 'content', 'drafts', `${article.metadata.id}.json`);
                try {
                    await fs.stat(draftPath);
                    this.logTest('Draft Saving', 'pass', `Article saved to ${article.metadata.id}.json`);
                } catch (error) {
                    this.logTest('Draft Saving', 'fail', 'Article not found in drafts folder');
                }

                this.results.articleGeneration = { 
                    status: 'pass', 
                    details: `Successfully generated article with quality score ${article.metadata.qualityScore?.overall || 'unknown'}`
                };
            } else {
                this.logTest('Article Generation', 'fail', 'No articles were generated');
                this.results.articleGeneration = { status: 'fail', details: 'No articles generated' };
            }

        } catch (error) {
            this.logTest('Article Generation', 'fail', error.message);
            this.results.articleGeneration = { status: 'fail', details: error.message };
        }
    }

    async testAPIEndpoints() {
        this.logSection('🌐 API Endpoints Test');
        
        try {
            // First, check if review console server is running
            const isServerRunning = await this.checkServerStatus();
            
            if (!isServerRunning) {
                this.logTest('Server Status', 'fail', 'Review console server is not running on port 3000');
                this.results.apiEndpoints = { status: 'fail', details: 'Server not running' };
                return;
            }

            this.logTest('Server Status', 'pass', 'Review console server is running');

            // Test health endpoint
            const healthResponse = await this.makeRequest('GET', '/api/health');
            if (healthResponse.status === 'healthy') {
                this.logTest('Health Endpoint', 'pass', `Server uptime: ${healthResponse.uptime?.toFixed(2)}s`);
            } else {
                this.logTest('Health Endpoint', 'fail', 'Health check returned invalid response');
            }

            // Test drafts endpoint
            const draftsResponse = await this.makeRequest('GET', '/api/articles/drafts');
            if (Array.isArray(draftsResponse)) {
                this.logTest('Drafts Endpoint', 'pass', `Found ${draftsResponse.length} draft articles`);
                
                // Show some draft details
                if (draftsResponse.length > 0) {
                    this.log('   📄 Recent drafts:', 'cyan');
                    draftsResponse.slice(0, 3).forEach((draft, index) => {
                        const title = draft.title || draft.metadata?.id || 'Unknown';
                        this.log(`      ${index + 1}. ${title.slice(0, 40)}...`, 'dim');
                    });
                }
            } else {
                this.logTest('Drafts Endpoint', 'fail', 'Invalid response format');
            }

            this.results.apiEndpoints = { status: 'pass', details: 'API endpoints responding correctly' };

        } catch (error) {
            this.logTest('API Endpoints', 'fail', error.message);
            this.results.apiEndpoints = { status: 'fail', details: error.message };
        }
    }

    async checkServerStatus() {
        return new Promise((resolve) => {
            const req = http.request({
                hostname: 'localhost',
                port: 3000,
                path: '/api/health',
                method: 'GET',
                timeout: 5000
            }, (res) => {
                resolve(res.statusCode === 200);
            });
            
            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            
            req.end();
        });
    }

    async makeRequest(method, path) {
        return new Promise((resolve, reject) => {
            const req = http.request({
                hostname: 'localhost',
                port: 3000,
                path: path,
                method: method,
                timeout: 10000
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        resolve(data);
                    }
                });
            });
            
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            
            req.end();
        });
    }

    displaySummary() {
        const duration = ((Date.now() - this.testStartTime) / 1000).toFixed(2);
        
        this.logSection('📊 Test Summary');
        
        let totalTests = 0;
        let passedTests = 0;
        
        Object.entries(this.results).forEach(([testName, result]) => {
            totalTests++;
            if (result.status === 'pass') passedTests++;
            
            const displayName = testName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            this.logTest(displayName, result.status, result.details);
        });

        console.log('\n' + '-'.repeat(60));
        
        if (passedTests === totalTests) {
            this.log(`🎉 All ${totalTests} tests passed! (${duration}s)`, 'green');
        } else {
            this.log(`⚠️  ${passedTests}/${totalTests} tests passed (${duration}s)`, 'yellow');
        }
        
        console.log('-'.repeat(60) + '\n');
    }

    async runAllTests() {
        this.log('🚀 Smart Finance Hub System Test Suite', 'bright');
        this.log(`⏰ Started at ${new Date().toLocaleString()}`, 'dim');
        
        // Run all tests in sequence
        await this.testOpenAIConnection();
        await this.testFileSystem();
        await this.testArticleGeneration();
        await this.testAPIEndpoints();
        
        // Display results
        this.displaySummary();
    }
}

// Run tests if called directly
if (require.main === module) {
    const testSystem = new SmartFinanceTestSystem();
    testSystem.runAllTests().catch(error => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = SmartFinanceTestSystem;