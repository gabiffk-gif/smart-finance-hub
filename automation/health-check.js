require('dotenv').config({ path: '../.env' });
const OpenAI = require('openai');
const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');
const ContentGenerator = require('./content-generator/generator');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function colorLog(color, message) {
    console.log(colors[color] + message + colors.reset);
}

function checkmark() {
    return colors.green + '✅' + colors.reset;
}

function xmark() {
    return colors.red + '❌' + colors.reset;
}

function warning() {
    return colors.yellow + '⚠️' + colors.reset;
}

class HealthChecker {
    constructor() {
        this.results = [];
        this.issues = [];
        this.startTime = Date.now();
    }

    async runHealthCheck() {
        console.log('\n' + '='.repeat(70));
        colorLog('cyan', '🏥 Smart Finance Hub - System Health Check');
        console.log('='.repeat(70));
        
        try {
            await this.checkEnvironmentVariables();
            await this.checkDirectories();
            await this.checkConfigurationFiles();
            await this.checkOpenAIConnection();
            await this.checkGitHubConnection();
            await this.checkContentGeneration();
            
            this.displayResults();
            this.displaySolutions();
            
        } catch (error) {
            colorLog('red', '\n💥 Critical error during health check:');
            console.error(error);
            process.exit(1);
        }
    }

    async checkEnvironmentVariables() {
        colorLog('blue', '\n🔧 Checking Environment Variables...');
        
        const requiredVars = [
            'OPENAI_API_KEY',
            'GITHUB_TOKEN',
            'GITHUB_OWNER',
            'GITHUB_REPO',
            'GOOGLE_ANALYTICS_ID'
        ];

        const optionalVars = [
            'ADSENSE_CLIENT_ID',
            'PORT',
            'NODE_ENV'
        ];

        let allGood = true;

        for (const envVar of requiredVars) {
            if (process.env[envVar]) {
                console.log(`  ${checkmark()} ${envVar} - Set`);
            } else {
                console.log(`  ${xmark()} ${envVar} - Missing`);
                this.issues.push({
                    component: 'Environment Variables',
                    issue: `${envVar} is not set`,
                    solution: `Add ${envVar}=your_value to .env file`
                });
                allGood = false;
            }
        }

        for (const envVar of optionalVars) {
            if (process.env[envVar]) {
                console.log(`  ${checkmark()} ${envVar} - Set (${process.env[envVar]})`);
            } else {
                console.log(`  ${warning()} ${envVar} - Not set (optional)`);
            }
        }

        this.results.push({
            component: 'Environment Variables',
            status: allGood ? 'pass' : 'fail',
            details: `${requiredVars.length} required variables checked`
        });
    }

    async checkDirectories() {
        colorLog('blue', '\n📁 Checking Required Directories...');
        
        const requiredDirs = [
            '../content',
            '../content/drafts',
            '../content/published',
            '../content/archived',
            '../content/images',
            './config',
            './logs',
            './data'
        ];

        let allGood = true;

        for (const dir of requiredDirs) {
            try {
                const fullPath = path.join(__dirname, dir);
                await fs.access(fullPath);
                console.log(`  ${checkmark()} ${dir.replace('../', '').replace('./', 'automation/')} - Exists`);
            } catch (error) {
                console.log(`  ${xmark()} ${dir.replace('../', '').replace('./', 'automation/')} - Missing`);
                
                try {
                    const fullPath = path.join(__dirname, dir);
                    await fs.mkdir(fullPath, { recursive: true });
                    console.log(`  ${checkmark()} ${dir.replace('../', '').replace('./', 'automation/')} - Created`);
                } catch (createError) {
                    this.issues.push({
                        component: 'Directories',
                        issue: `Cannot create directory ${dir}`,
                        solution: `Manually create directory: mkdir -p ${dir}`
                    });
                    allGood = false;
                }
            }
        }

        this.results.push({
            component: 'Directory Structure',
            status: allGood ? 'pass' : 'fail',
            details: `${requiredDirs.length} directories checked`
        });
    }

    async checkConfigurationFiles() {
        colorLog('blue', '\n⚙️  Checking Configuration Files...');
        
        const configFiles = [
            { file: './config/settings.json', required: true },
            { file: './config/topics.json', required: true },
            { file: './config/keywords.json', required: true },
            { file: './templates/article-template.html', required: true }
        ];

        let allGood = true;

        for (const config of configFiles) {
            try {
                const fullPath = path.join(__dirname, config.file);
                const content = await fs.readFile(fullPath, 'utf8');
                
                if (config.file.endsWith('.json')) {
                    JSON.parse(content); // Validate JSON
                    console.log(`  ${checkmark()} ${config.file.replace('./', 'automation/')} - Valid JSON`);
                } else {
                    console.log(`  ${checkmark()} ${config.file.replace('./', 'automation/')} - Exists`);
                }
                
            } catch (error) {
                console.log(`  ${xmark()} ${config.file.replace('./', 'automation/')} - ${error.code === 'ENOENT' ? 'Missing' : 'Invalid'}`);
                
                if (config.required) {
                    this.issues.push({
                        component: 'Configuration Files',
                        issue: `${config.file} is missing or invalid`,
                        solution: `Ensure ${config.file} exists and contains valid data`
                    });
                    allGood = false;
                }
            }
        }

        this.results.push({
            component: 'Configuration Files',
            status: allGood ? 'pass' : 'fail',
            details: `${configFiles.length} configuration files checked`
        });
    }

    async checkOpenAIConnection() {
        colorLog('blue', '\n🤖 Testing OpenAI API Connection...');
        
        if (!process.env.OPENAI_API_KEY) {
            console.log(`  ${xmark()} OpenAI API Key not set`);
            this.results.push({
                component: 'OpenAI API',
                status: 'fail',
                details: 'API key not configured'
            });
            return;
        }

        try {
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });

            console.log(`  ${checkmark()} OpenAI API Key - Set`);
            
            // Test API connection with a simple request
            const testStart = Date.now();
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 5
            });
            const testTime = Date.now() - testStart;

            console.log(`  ${checkmark()} OpenAI API Connection - Working (${testTime}ms)`);
            console.log(`  ${checkmark()} Model Access - ${response.model} available`);

            this.results.push({
                component: 'OpenAI API',
                status: 'pass',
                details: `Connection successful in ${testTime}ms`
            });

        } catch (error) {
            console.log(`  ${xmark()} OpenAI API Connection - Failed`);
            console.log(`     Error: ${error.message}`);
            
            let solution = 'Check OpenAI API key validity';
            if (error.message.includes('quota')) {
                solution = 'Add credits to your OpenAI account';
            } else if (error.message.includes('rate limit')) {
                solution = 'Wait before retrying or upgrade OpenAI plan';
            }

            this.issues.push({
                component: 'OpenAI API',
                issue: error.message,
                solution: solution
            });

            this.results.push({
                component: 'OpenAI API',
                status: 'fail',
                details: 'Connection failed'
            });
        }
    }

    async checkGitHubConnection() {
        colorLog('blue', '\n🐙 Testing GitHub API Connection...');
        
        if (!process.env.GITHUB_TOKEN) {
            console.log(`  ${xmark()} GitHub Token not set`);
            this.results.push({
                component: 'GitHub API',
                status: 'fail',
                details: 'Token not configured'
            });
            return;
        }

        try {
            const octokit = new Octokit({
                auth: process.env.GITHUB_TOKEN
            });

            console.log(`  ${checkmark()} GitHub Token - Set`);

            // Test authentication
            const testStart = Date.now();
            const { data: user } = await octokit.rest.users.getAuthenticated();
            const testTime = Date.now() - testStart;

            console.log(`  ${checkmark()} GitHub Authentication - Working (${testTime}ms)`);
            console.log(`  ${checkmark()} GitHub User - ${user.login}`);

            // Test repository access
            if (process.env.GITHUB_OWNER && process.env.GITHUB_REPO) {
                try {
                    const { data: repo } = await octokit.rest.repos.get({
                        owner: process.env.GITHUB_OWNER,
                        repo: process.env.GITHUB_REPO
                    });

                    console.log(`  ${checkmark()} Repository Access - ${repo.full_name}`);
                    console.log(`  ${checkmark()} Repository Permissions - ${repo.permissions.push ? 'Write' : 'Read'}`);
                    
                } catch (repoError) {
                    console.log(`  ${xmark()} Repository Access - Failed`);
                    this.issues.push({
                        component: 'GitHub API',
                        issue: `Cannot access repository ${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`,
                        solution: 'Verify repository name and token permissions'
                    });
                }
            }

            this.results.push({
                component: 'GitHub API',
                status: 'pass',
                details: `Authentication successful in ${testTime}ms`
            });

        } catch (error) {
            console.log(`  ${xmark()} GitHub API Connection - Failed`);
            console.log(`     Error: ${error.message}`);

            this.issues.push({
                component: 'GitHub API',
                issue: error.message,
                solution: 'Check GitHub token validity and permissions'
            });

            this.results.push({
                component: 'GitHub API',
                status: 'fail',
                details: 'Connection failed'
            });
        }
    }

    async checkContentGeneration() {
        colorLog('blue', '\n📝 Testing Content Generation...');

        try {
            console.log(`  ${checkmark()} ContentGenerator - Loading class`);

            const generator = new ContentGenerator();
            
            console.log(`  ${checkmark()} ContentGenerator - Instantiated`);

            // Load configurations
            await generator.loadConfigurations();
            console.log(`  ${checkmark()} Configurations - Loaded successfully`);

            if (!generator.settings || !generator.topics || !generator.keywords) {
                throw new Error('Configuration data not properly loaded');
            }

            console.log(`  ${checkmark()} Topics Available - ${generator.topics.topics.length} topics`);
            console.log(`  ${checkmark()} Keyword Groups - ${Object.keys(generator.keywords.keywordGroups).length} groups`);

            // Test article generation (but don't actually generate - just validate setup)
            const testTopic = generator.topics.topics[0];
            if (!testTopic) {
                throw new Error('No topics available for testing');
            }

            console.log(`  ${checkmark()} Test Topic Selected - "${testTopic.title}"`);
            console.log(`  ${checkmark()} Content Generation - Ready (OpenAI connection required for full test)`);

            this.results.push({
                component: 'Content Generation',
                status: 'pass',
                details: `Ready with ${generator.topics.topics.length} topics`
            });

        } catch (error) {
            console.log(`  ${xmark()} Content Generation - Failed`);
            console.log(`     Error: ${error.message}`);

            this.issues.push({
                component: 'Content Generation',
                issue: error.message,
                solution: 'Check configuration files and OpenAI API setup'
            });

            this.results.push({
                component: 'Content Generation',
                status: 'fail',
                details: 'Setup validation failed'
            });
        }
    }

    displayResults() {
        const totalTime = Date.now() - this.startTime;
        
        console.log('\n' + '='.repeat(70));
        colorLog('cyan', '📊 HEALTH CHECK RESULTS');
        console.log('='.repeat(70));

        const passed = this.results.filter(r => r.status === 'pass').length;
        const failed = this.results.filter(r => r.status === 'fail').length;
        const total = this.results.length;

        console.log(`\n⏱️  Total Check Time: ${totalTime}ms`);
        console.log(`📊 Components Checked: ${total}`);
        console.log(`${checkmark()} Passed: ${passed}`);
        console.log(`${xmark()} Failed: ${failed}`);

        console.log('\n📋 Component Status:');
        this.results.forEach(result => {
            const status = result.status === 'pass' ? checkmark() : xmark();
            console.log(`  ${status} ${result.component} - ${result.details}`);
        });

        // Overall system health
        console.log('\n' + '-'.repeat(50));
        if (failed === 0) {
            colorLog('green', '🎉 SYSTEM HEALTH: EXCELLENT');
            colorLog('green', '✨ All components are working perfectly!');
            console.log('\n🚀 Your Smart Finance Hub automation system is ready to run!');
        } else if (failed <= 2) {
            colorLog('yellow', '⚠️  SYSTEM HEALTH: GOOD WITH ISSUES');
            colorLog('yellow', '🔧 Minor issues detected - see solutions below');
        } else {
            colorLog('red', '❌ SYSTEM HEALTH: NEEDS ATTENTION');
            colorLog('red', '🚨 Multiple issues detected - please resolve before proceeding');
        }
    }

    displaySolutions() {
        if (this.issues.length === 0) {
            console.log('\n' + '='.repeat(70));
            colorLog('green', '🎯 NO ISSUES FOUND - SYSTEM READY!');
            console.log('='.repeat(70));
            
            console.log('\n🚀 Next Steps:');
            console.log('  1. Start the automation system: ./start-automation.sh');
            console.log('  2. Access the dashboard: http://localhost:3000');
            console.log('  3. Generate test content: node test-generation.js');
            console.log('  4. Monitor logs: tail -f automation/logs/automation-server.log');
            
            return;
        }

        console.log('\n' + '='.repeat(70));
        colorLog('red', '🔧 ISSUES FOUND - SOLUTIONS REQUIRED');
        console.log('='.repeat(70));

        this.issues.forEach((issue, index) => {
            console.log(`\n${index + 1}. ${colors.red}${issue.component}${colors.reset}`);
            console.log(`   Issue: ${issue.issue}`);
            console.log(`   ${colors.green}Solution: ${issue.solution}${colors.reset}`);
        });

        console.log('\n🔄 After fixing issues, run health check again:');
        console.log('   node automation/health-check.js');
    }
}

// Run health check if called directly
if (require.main === module) {
    const healthChecker = new HealthChecker();
    healthChecker.runHealthCheck().catch(error => {
        console.error('\n💥 Health check failed:', error);
        process.exit(1);
    });
}

module.exports = HealthChecker;