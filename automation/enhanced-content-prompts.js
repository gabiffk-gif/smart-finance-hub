const fs = require('fs');

function enhanceContentPrompts() {
    console.log('🔧 Enhancing content generation prompts for higher quality...');

    const generatorPath = 'automation/content-generator/generator.js';
    let content = fs.readFileSync(generatorPath, 'utf8');

    // Add enhanced quality requirements for 85+ scores
    const qualityInstructions = `

    // Enhanced quality requirements for 85+ scores
    const qualityRequirements = {
        wordCount: 2000, // Minimum for high scores
        headings: 5, // At least 5 headings for structure
        actionableContent: true, // Must include actionable advice
        currentYear: '2025', // Include current year references
        expertCredibility: true, // Reference expert sources
        stepByStep: true, // Include step-by-step guidance
        keywordDensity: 1.5, // Optimal keyword density
        metaLength: 150 // Optimal meta description length
    };

    // Enhanced prompt templates for higher quality content
    getEnhancedPromptTemplate(contentType, topic, keywords) {
        const basePrompt = this.getPromptForContentType(contentType, topic, keywords);

        // Add quality enhancement instructions
        const qualityEnhancement = \`

CRITICAL QUALITY REQUIREMENTS FOR 85+ SCORE:

📝 CONTENT STRUCTURE (Required for high scores):
- Start with compelling H1 title (40-80 characters)
- Include at least 5-6 well-structured headings (H2/H3)
- Write comprehensive content (1500+ words minimum)
- Include introduction, main sections, and conclusion
- Add step-by-step actionable advice throughout
- Reference current 2025 trends and data

🎯 SEO OPTIMIZATION (Required for monetization):
- Include target keywords naturally (1-2% density)
- Write compelling meta description (140-160 characters)
- Use semantic keywords and related terms
- Include internal linking opportunities
- Optimize for featured snippets potential

💡 CONTENT QUALITY STANDARDS:
- Provide expert-level insights and analysis
- Include specific examples and case studies
- Add actionable takeaways in each section
- Reference authoritative sources when possible
- Use conversational but professional tone
- Include current year (2025) context and relevance

📊 ENGAGEMENT ELEMENTS:
- Add bullet points and numbered lists
- Include statistics and data points
- Provide practical tips and strategies
- Use questions to engage readers
- Include comparison tables when relevant
- Add call-to-action at the end

WRITING STYLE REQUIREMENTS:
- Write in active voice
- Use transition words between sections
- Keep paragraphs concise (2-4 sentences)
- Include power words for emotional impact
- Ensure content flows logically
- Add subheadings every 200-300 words
\`;

        return basePrompt + qualityEnhancement;
    }`;

    // Enhanced content generation function
    const enhancedGenerationFunction = `
    async generateEnhancedContent(topic, keywords, contentType) {
        console.log('🤖 Generating enhanced high-quality content...');

        const enhancedPrompt = this.getEnhancedPromptTemplate(contentType, topic, keywords);

        // Add quality-focused system message
        const systemMessage = \`You are a world-class financial content writer for Smart Finance Hub.
        Your articles consistently score 90+ on quality metrics and drive high engagement.

        MANDATORY REQUIREMENTS:
        - Write exactly 1800-2500 words
        - Include 6-8 strategic headings
        - Provide actionable, expert-level advice
        - Reference 2025 market conditions
        - Use professional yet engaging tone
        - Include specific examples and data
        - End with compelling call-to-action

        Format your response as:
        TITLE: [Compelling 50-70 character title]
        META_DESCRIPTION: [Engaging 140-160 character description]
        CONTENT: [Full article with HTML headings and formatting]
        CTA: [Strong call-to-action paragraph]\`;

        const response = await this.callOpenAIAPI(enhancedPrompt, systemMessage, topic);
        return this.parseArticleContent(response);
    }`;

    // Enhanced API call with better parameters
    const enhancedAPICall = `
    async callEnhancedOpenAIAPI(prompt, systemMessage, topic) {
        const requestConfig = {
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: systemMessage
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 4000,      // Increased for longer content
            temperature: 0.7,      // Balanced creativity and accuracy
            top_p: 0.9,           // High quality completions
            frequency_penalty: 0.3, // Reduce repetition
            presence_penalty: 0.1   // Encourage diverse topics
        };

        console.log('🔗 Making enhanced API call for high-quality content...');

        try {
            const response = await this.openai.chat.completions.create(requestConfig);

            if (response.choices && response.choices[0] && response.choices[0].message) {
                return response.choices[0].message.content;
            } else {
                throw new Error('Invalid response structure from OpenAI');
            }
        } catch (error) {
            console.error('❌ Enhanced API call failed:', error.message);
            throw error;
        }
    }`;

    // Add quality instructions if not already present
    if (!content.includes('qualityRequirements')) {
        const insertPoint = content.indexOf('class ContentGenerator');
        if (insertPoint !== -1) {
            content = content.slice(0, insertPoint) + qualityInstructions + '\n' + content.slice(insertPoint);
            console.log('✅ Enhanced quality requirements added');
        }
    }

    // Add enhanced prompt template function
    if (!content.includes('getEnhancedPromptTemplate')) {
        const insertPoint = content.indexOf('getPromptForContentType');
        if (insertPoint !== -1) {
            const functionStart = content.lastIndexOf('    ', insertPoint);
            content = content.slice(0, functionStart) + enhancedGenerationFunction + '\n\n' + content.slice(functionStart);
            console.log('✅ Enhanced prompt template function added');
        }
    }

    // Update the main generation function to use enhanced prompts
    if (content.includes('async generateArticle(')) {
        content = content.replace(
            /const response = await this\.callOpenAIAPI\([^)]*\);/g,
            'const response = await this.callEnhancedOpenAIAPI(enhancedPrompt, systemMessage, topic);'
        );
        console.log('✅ Updated main generation function to use enhanced API calls');
    }

    // Write updated content
    fs.writeFileSync(generatorPath, content);
    console.log('✅ Content generation prompts enhanced successfully!');
    console.log('🎯 New features:');
    console.log('   - Enhanced quality requirements (85+ score targets)');
    console.log('   - Improved prompt templates with specific instructions');
    console.log('   - Better API parameters for high-quality output');
    console.log('   - Structured content requirements');
    console.log('   - SEO optimization guidelines');
    console.log('   - Engagement element specifications');
}

enhanceContentPrompts();