#!/bin/bash

# Smart Finance Hub System Restart Script
# This script cleans up, fixes, and restarts the entire content generation system

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}==========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}==========================================${NC}"
}

# Step 1: Kill any running processes on port 3000
print_header "🔄 Step 1: Cleaning up existing processes"
print_status "Checking for processes running on port 3000..."

if lsof -ti:3000 > /dev/null 2>&1; then
    print_status "Found processes on port 3000, terminating..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 2
    print_success "Processes on port 3000 terminated"
else
    print_success "No processes found on port 3000"
fi

# Step 2: Run fix-directories.js to ensure folders exist
print_header "📁 Step 2: Setting up directory structure"
print_status "Running fix-directories.js..."

if [ -f "automation/fix-directories.js" ]; then
    node automation/fix-directories.js
    print_success "Directory structure verified and fixed"
else
    print_warning "fix-directories.js not found, creating directories manually..."
    mkdir -p content/{drafts,approved,published,rejected,archive,social-queue}
    mkdir -p automation/{logs,monitoring,data}
    print_success "Directories created manually"
fi

# Step 3: Clear corrupted draft files
print_header "🧹 Step 3: Cleaning up corrupted draft files"
print_status "Checking for corrupted or invalid draft files..."

draft_count=0
removed_count=0

if [ -d "content/drafts" ]; then
    for file in content/drafts/*.json; do
        if [ -f "$file" ]; then
            draft_count=$((draft_count + 1))
            # Check if file is valid JSON and has required fields
            if ! jq -e '.title and .content and .metadata' "$file" > /dev/null 2>&1; then
                print_status "Removing corrupted file: $(basename "$file")"
                rm "$file"
                removed_count=$((removed_count + 1))
            fi
        fi
    done
fi

print_success "Checked $draft_count draft files, removed $removed_count corrupted files"

# Step 4: Generate 5 new test articles
print_header "📝 Step 4: Generating fresh test articles"
print_status "Generating 5 new test articles..."

# Create a simple article generation script
cat > automation/generate-test-articles.js << 'EOF'
const ContentGenerator = require('./content-generator/generator');

async function generateTestArticles() {
    try {
        console.log('🚀 Starting test article generation...');

        const generator = new ContentGenerator();
        console.log('📁 Loading configurations...');
        await generator.loadConfigurations();

        console.log('📝 Generating 5 test articles...');
        const articles = await generator.generateArticles(5);

        console.log(`✅ Successfully generated ${articles.length} articles`);

        // Display summary
        articles.forEach((article, index) => {
            const title = article.title.length > 50
                ? article.title.substring(0, 47) + '...'
                : article.title;
            const score = article.metadata?.qualityScore?.overall || 'Unknown';
            const wordCount = article.metadata?.wordCount || 'Unknown';
            const isMock = article.metadata?.isMockArticle ? ' (Mock)' : '';
            console.log(`${index + 1}. ${title} | Score: ${score} | Words: ${wordCount}${isMock}`);
        });

        return articles.length;

    } catch (error) {
        console.error('❌ Error generating test articles:', error.message);
        return 0;
    }
}

generateTestArticles().then(count => {
    process.exit(count > 0 ? 0 : 1);
});
EOF

# Run the article generation
if node automation/generate-test-articles.js; then
    print_success "Test articles generated successfully"
    # Clean up the temporary script
    rm automation/generate-test-articles.js
else
    print_error "Failed to generate test articles, but continuing..."
    rm -f automation/generate-test-articles.js
fi

# Step 5: Start the review console server
print_header "🚀 Step 5: Starting the review console server"
print_status "Starting review console on port 3000..."

# Create a script to start the server in the background
cat > automation/start-server.js << 'EOF'
const ReviewConsoleServer = require('./review-console/server');

console.log('🌟 Starting Smart Finance Hub Review Console...');
console.log('⏰ Started at:', new Date().toLocaleString());

const server = new ReviewConsoleServer();
server.start();

// Keep the process running
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Server terminated');
    process.exit(0);
});
EOF

# Start the server in the background
nohup node automation/start-server.js > automation/logs/server.log 2>&1 &
SERVER_PID=$!

# Wait a moment for server to start
sleep 3

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
    print_success "Review console server started (PID: $SERVER_PID)"
    echo $SERVER_PID > automation/logs/server.pid
else
    print_error "Failed to start review console server"
    exit 1
fi

# Step 6: Verify server is responding
print_header "🔍 Step 6: Verifying server health"
print_status "Checking server health..."

# Wait for server to be fully ready
for i in {1..10}; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        print_success "Server is responding on http://localhost:3000"
        break
    else
        if [ $i -eq 10 ]; then
            print_error "Server is not responding after 10 seconds"
            exit 1
        fi
        print_status "Waiting for server to respond... ($i/10)"
        sleep 1
    fi
done

# Step 7: Open browser and show success message
print_header "🌐 Step 7: Opening browser"

# Open browser (works on macOS, Linux, and Windows)
if command -v open > /dev/null 2>&1; then
    # macOS
    open http://localhost:3000
    print_success "Browser opened (macOS)"
elif command -v xdg-open > /dev/null 2>&1; then
    # Linux
    xdg-open http://localhost:3000
    print_success "Browser opened (Linux)"
elif command -v start > /dev/null 2>&1; then
    # Windows
    start http://localhost:3000
    print_success "Browser opened (Windows)"
else
    print_warning "Could not detect browser command. Please open http://localhost:3000 manually"
fi

# Final success message
print_header "🎉 SYSTEM RESTART COMPLETE"
echo ""
echo -e "${GREEN}✅ Smart Finance Hub is now running successfully!${NC}"
echo ""
echo -e "${BLUE}📊 System Status:${NC}"
echo -e "   🌐 Review Console: ${GREEN}http://localhost:3000${NC}"
echo -e "   📝 Server PID: ${YELLOW}$SERVER_PID${NC}"
echo -e "   📁 Log File: ${YELLOW}automation/logs/server.log${NC}"
echo ""
echo -e "${BLUE}🛠️  Available Commands:${NC}"
echo -e "   📈 View server logs: ${YELLOW}tail -f automation/logs/server.log${NC}"
echo -e "   🔄 Generate more articles: ${YELLOW}node automation/content-generator/generator.js 3${NC}"
echo -e "   🧪 Run system tests: ${YELLOW}node automation/test-system.js${NC}"
echo -e "   🛑 Stop server: ${YELLOW}kill $SERVER_PID${NC}"
echo ""
echo -e "${BLUE}📋 What to do next:${NC}"
echo "   1. The dashboard should have opened in your browser"
echo "   2. You can review generated articles in the 'Drafts' section"
echo "   3. Use the dashboard to approve, reject, or edit articles"
echo "   4. Check the API health at: http://localhost:3000/api/health"
echo ""
echo -e "${GREEN}🚀 Smart Finance Hub is ready for use!${NC}"
echo ""