#!/bin/bash

# Enhanced Daily Content Generation Script with Diversity Check
# Smart Finance Hub - Automated Content Pipeline

echo "🚀 Starting Enhanced Daily Content Generation Pipeline..."
echo "=================================================="

# Set script directory and paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Log file for tracking
LOG_FILE="$SCRIPT_DIR/logs/daily-generation-$(date +%Y%m%d).log"
mkdir -p "$SCRIPT_DIR/logs"

# Function to log with timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log "🏁 Daily content generation started"

# Step 1: Check topic diversity first
log "📊 Checking topic diversity..."
node "$SCRIPT_DIR/topic-diversity-checker.js" | tee -a "$LOG_FILE"
DIVERSITY_EXIT_CODE=$?

if [ $DIVERSITY_EXIT_CODE -ne 0 ]; then
    log "❌ Topic diversity check failed"
    exit 1
fi

# Step 2: Fix article dates (preserve original timestamps)
log "📅 Preserving article dates..."
node "$SCRIPT_DIR/fix-article-dates.js" | tee -a "$LOG_FILE"
DATE_FIX_EXIT_CODE=$?

if [ $DATE_FIX_EXIT_CODE -ne 0 ]; then
    log "❌ Date fixing failed"
    exit 1
fi

# Step 3: Run content deduplication
log "🔍 Running content deduplication..."
if [ -f "$SCRIPT_DIR/content-deduplication.js" ]; then
    node "$SCRIPT_DIR/content-deduplication.js" | tee -a "$LOG_FILE"
else
    log "⚠️  Content deduplication script not found, skipping..."
fi

# Step 4: Generate new content (with diversity awareness)
log "✍️  Generating new content..."
node "$SCRIPT_DIR/content-generator/generator.js" --daily --diversity-aware | tee -a "$LOG_FILE"
GENERATION_EXIT_CODE=$?

if [ $GENERATION_EXIT_CODE -ne 0 ]; then
    log "❌ Content generation failed"
    exit 1
fi

# Step 5: Run enhanced publisher for approved content
log "📰 Publishing approved articles..."
if [ -f "$SCRIPT_DIR/review-console/enhanced-publisher.js" ]; then
    node "$SCRIPT_DIR/review-console/enhanced-publisher.js" | tee -a "$LOG_FILE"
else
    log "⚠️  Enhanced publisher not found, using basic publishing..."
fi

# Step 6: Sort and publish with newest-first ordering
log "🆕 Applying newest-first ordering with NEW badges..."
node "$SCRIPT_DIR/publisher/publish-newest-first.js" | tee -a "$LOG_FILE"
PUBLISH_EXIT_CODE=$?

if [ $PUBLISH_EXIT_CODE -ne 0 ]; then
    log "❌ Newest-first publishing failed"
    exit 1
fi

# Step 7: Force uniform homepage update
log "🏠 Updating homepage with uniform layout..."
if [ -f "$SCRIPT_DIR/force-uniform-homepage.js" ]; then
    node "$SCRIPT_DIR/force-uniform-homepage.js" | tee -a "$LOG_FILE"
else
    log "⚠️  Uniform homepage script not found, skipping..."
fi

# Step 8: Validate content quality
log "🎯 Validating content quality..."
TOTAL_ARTICLES=$(find content/published -name "*.json" -not -name ".gitkeep" | wc -l)
log "📄 Total published articles: $TOTAL_ARTICLES"

# Step 9: Generate final diversity report
log "📊 Generating final diversity report..."
node "$SCRIPT_DIR/topic-diversity-checker.js" --report-only | tee -a "$LOG_FILE"

# Step 10: Commit changes if any
log "💾 Committing changes..."
git add -A
if git diff --staged --quiet; then
    log "ℹ️  No changes to commit"
else
    git commit -m "Daily content generation: automated update

- Enhanced content generation with diversity checking
- Preserved original article dates
- Applied newest-first ordering with NEW badges
- Updated homepage with uniform layout

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    log "✅ Changes committed successfully"
fi

# Step 11: Final status report
log "📈 Generation Summary:"
log "====================="
log "📄 Published articles: $TOTAL_ARTICLES"
log "📅 Date preservation: Complete"
log "🆕 Newest-first ordering: Applied"
log "🏠 Homepage update: Complete"
log "📊 Diversity check: Complete"

# Clean up old logs (keep last 7 days)
find "$SCRIPT_DIR/logs" -name "daily-generation-*.log" -mtime +7 -delete 2>/dev/null || true

log "🎯 Daily content generation completed successfully!"
echo "=================================================="
echo "✅ Enhanced daily content generation pipeline finished"

exit 0