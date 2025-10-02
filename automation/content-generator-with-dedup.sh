#!/bin/bash
# Generate content with automatic deduplication

echo "[$(date)] Starting content generation with deduplication"

# Create logs directory if it doesn't exist
mkdir -p logs

# Generate new articles
echo "[$(date)] Generating new content..."
node automation/content-generator/generator.js 3

# Remove duplicates
echo "[$(date)] Running deduplication process..."
node automation/content-deduplication.js

# Count remaining drafts
DRAFTS=$(ls content/drafts/*.json 2>/dev/null | wc -l | tr -d ' ')
echo "[$(date)] Unique drafts ready for review: $DRAFTS"

# If we have drafts, log the success
if [ "$DRAFTS" -gt 0 ]; then
    echo "[$(date)] Content generation with deduplication completed successfully"
else
    echo "[$(date)] Warning: No drafts generated or all were removed as duplicates"
fi