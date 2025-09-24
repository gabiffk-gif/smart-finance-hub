#!/bin/bash

# Daily Content Generation Script for Smart Finance Hub
# This script generates 3 diverse articles daily at 6 AM

# Change to the project directory
cd /Users/gabrielferrer/Documents/Projects/smart-finance-hub

# Set up environment
export NODE_ENV=production

# Log the start time
echo "$(date): Starting daily content generation..." >> logs/daily-generation.log

# Generate 3 diverse articles
node automation/content-generator/generator.js 3 >> logs/daily-generation.log 2>&1

# Check if generation was successful
if [ $? -eq 0 ]; then
    echo "$(date): Successfully generated 3 diverse articles" >> logs/daily-generation.log
else
    echo "$(date): ERROR: Content generation failed" >> logs/daily-generation.log
fi

# Log completion
echo "$(date): Daily content generation completed" >> logs/daily-generation.log
echo "---" >> logs/daily-generation.log