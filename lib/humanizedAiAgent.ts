interface AgentCallbacks {
  onPhaseStart: (phaseId: string, description: string) => void;
  onPhaseUpdate: (phaseId: string, progress: number, data?: any) => void;
  onPhaseComplete: (phaseId: string, result: any) => void;
  onError: (error: string) => void;
}

interface FileAnalysisResult {
  type: string;
  content: string;
  metadata: any;
  insights: string[];
}

export class HumanizedAIAgent {
  private geminiKey: string;
  private searchKey: string;
  private callbacks: AgentCallbacks;
  private agentName: string = "ScynV";

  constructor(geminiKey: string, searchKey: string, callbacks: AgentCallbacks) {
    this.geminiKey = geminiKey;
    this.searchKey = searchKey;
    this.callbacks = callbacks;
  }

  async processMessage(message: string, files?: FileList): Promise<string> {
    try {
      // Phase 1: Initial Analysis
      this.callbacks.onPhaseStart('analysis', 'Understanding your message and context');
      const messageAnalysis = await this.analyzeMessage(message);
      this.callbacks.onPhaseComplete('analysis', messageAnalysis);

      // Phase 2: File Processing (if files provided)
      let fileResults: FileAnalysisResult[] = [];
      if (files && files.length > 0) {
        this.callbacks.onPhaseStart('file_processing', 'Processing your files and extracting insights');
        fileResults = await this.processFiles(files);
        this.callbacks.onPhaseComplete('file_processing', fileResults);
      }

      // Phase 3: Enhanced Response Generation
      this.callbacks.onPhaseStart('response_generation', 'Crafting a personalized response');
      const enhancedResponse = await this.generateHumanizedResponse(message, messageAnalysis, fileResults);
      this.callbacks.onPhaseComplete('response_generation', enhancedResponse);

      // Phase 4: Final Polish
      this.callbacks.onPhaseStart('polishing', 'Adding final touches for natural flow');
      const finalResponse = await this.polishResponse(enhancedResponse);
      this.callbacks.onPhaseComplete('polishing', finalResponse);

      return this.formatFinalResponse(finalResponse);
    } catch (error) {
      this.callbacks.onError(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async performDeepSearch(query: string): Promise<string> {
    try {
      // Phase 1: Query Enhancement
      this.callbacks.onPhaseStart('query_enhancement', 'Enhancing your search query for better results');
      const enhancedQueries = await this.enhanceSearchQuery(query);
      this.callbacks.onPhaseComplete('query_enhancement', enhancedQueries);

      // Phase 2: Multi-Source Search
      this.callbacks.onPhaseStart('deep_search', 'Searching across multiple sources');
      const searchResults = await this.performMultiSourceSearch(enhancedQueries);
      this.callbacks.onPhaseComplete('deep_search', searchResults);

      // Phase 3: Information Synthesis
      this.callbacks.onPhaseStart('synthesis', 'Analyzing and connecting information from different sources');
      const synthesizedInfo = await this.synthesizeSearchResults(query, searchResults);
      this.callbacks.onPhaseComplete('synthesis', synthesizedInfo);

      // Phase 4: Human-like Response
      this.callbacks.onPhaseStart('humanization', 'Creating a natural, conversational response');
      const humanizedResponse = await this.humanizeSearchResponse(query, synthesizedInfo);
      this.callbacks.onPhaseComplete('humanization', humanizedResponse);

      return this.formatFinalResponse(humanizedResponse);
    } catch (error) {
      this.callbacks.onError(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async analyzeMessage(message: string): Promise<any> {
    const analysisPrompt = `Analyze this user message to understand intent, context, and required response style:

Message: "${message}"

Provide analysis in this format:
- Intent: What the user wants to achieve
- Tone: Formal, casual, technical, creative, etc.
- Complexity: Simple, moderate, complex
- Required_elements: What should be included in response
- Emotional_context: User's likely emotional state
- Response_style: How to respond naturally

Keep analysis concise and practical.`;

    return await this.callGemini(analysisPrompt);
  }

  private async processFiles(files: FileList): Promise<FileAnalysisResult[]> {
    const results: FileAnalysisResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.callbacks.onPhaseUpdate('file_processing', (i / files.length) * 100);
      
      try {
        const fileContent = await this.extractFileContent(file);
        const analysis = await this.analyzeFileContent(file.name, fileContent, file.type);
        
        results.push({
          type: file.type,
          content: fileContent,
          metadata: {
            name: file.name,
            size: file.size,
            lastModified: file.lastModified
          },
          insights: analysis.insights || []
        });
      } catch (error) {
        results.push({
          type: file.type,
          content: '',
          metadata: { name: file.name, error: 'Failed to process file' },
          insights: ['File could not be processed']
        });
      }
    }
    
    return results;
  }

  private async extractFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          // For binary files, convert to base64 or handle appropriately
          resolve('[Binary file content]');
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        reader.readAsText(file);
      } else if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file); // Try as text first
      }
    });
  }

  private async analyzeFileContent(fileName: string, content: string, fileType: string): Promise<any> {
    const analysisPrompt = `Analyze this file content and provide insights:

File: ${fileName}
Type: ${fileType}
Content: ${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}

Provide:
- Key insights about the content
- Important data points or information
- Potential questions the user might have
- Suggestions for further analysis

Keep insights practical and actionable.`;

    const analysis = await this.callGemini(analysisPrompt);
    
    try {
      return JSON.parse(analysis);
    } catch {
      return {
        insights: [analysis]
      };
    }
  }

  private async enhanceSearchQuery(query: string): Promise<string[]> {
    const enhancementPrompt = `Create 3-5 enhanced search queries based on this original query: "${query}"

Make them:
- More specific and targeted
- Include relevant synonyms and related terms
- Cover different aspects of the topic
- Suitable for getting comprehensive information

Return as a simple array of strings, one query per line.`;

    const response = await this.callGemini(enhancementPrompt);
    return response.split('\n').filter(line => line.trim()).slice(0, 5);
  }

  private async performMultiSourceSearch(queries: string[]): Promise<any[]> {
    const results = [];
    
    for (let i = 0; i < queries.length; i++) {
      this.callbacks.onPhaseUpdate('deep_search', (i / queries.length) * 100);
      
      try {
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${this.searchKey}&cx=${process.env.GOOGLE_SEARCH_CX || '017576662512468239146:omuauf_lfve'}&q=${encodeURIComponent(queries[i])}&num=8`;
        
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (data.items) {
          results.push({
            query: queries[i],
            results: data.items.map((item: any) => ({
              title: item.title,
              snippet: item.snippet,
              link: item.link,
              displayLink: item.displayLink
            }))
          });
        }
      } catch (error) {
        console.error(`Search failed for query: ${queries[i]}`, error);
      }
    }
    
    return results;
  }

  private async synthesizeSearchResults(originalQuery: string, searchResults: any[]): Promise<string> {
    const synthesisPrompt = `Synthesize information from these search results for the query: "${originalQuery}"

Search Results:
${JSON.stringify(searchResults, null, 2)}

Create a comprehensive synthesis that:
- Combines information from multiple sources
- Identifies key themes and patterns
- Highlights the most reliable and current information
- Notes any conflicting information
- Provides a balanced perspective

Write in a natural, informative style that flows well.`;

    return await this.callGemini(synthesisPrompt);
  }

  private async generateHumanizedResponse(message: string, analysis: any, fileResults: FileAnalysisResult[]): Promise<string> {
    const hasFiles = fileResults.length > 0;
    const fileContext = hasFiles ? `\n\nFile Analysis Results:\n${JSON.stringify(fileResults, null, 2)}` : '';
    
    const responsePrompt = `Create a natural, human-like response to this message.

User Message: "${message}"
Message Analysis: ${analysis}${fileContext}

Response Guidelines:
- Write like a knowledgeable, friendly human assistant
- Use natural language flow, not robotic or overly formal
- Include relevant insights from file analysis if files were provided
- Be conversational but informative
- Avoid excessive formatting (# or * symbols)
- Make it feel like talking to a real person
- Show understanding of context and nuance

Write the response directly without any meta-commentary.`;

    return await this.callGemini(responsePrompt);
  }

  private async humanizeSearchResponse(query: string, synthesizedInfo: string): Promise<string> {
    const humanizationPrompt = `Transform this synthesized information into a natural, conversational response.

Original Query: "${query}"
Synthesized Information: ${synthesizedInfo}

Make it:
- Sound like a knowledgeable friend sharing information
- Natural and engaging to read
- Well-structured but not overly formatted
- Include specific details and examples
- Show connections between different pieces of information
- End with helpful next steps or related suggestions if appropriate

Write as if you're having a conversation, not delivering a report.`;

    return await this.callGemini(humanizationPrompt);
  }

  private async polishResponse(response: string): Promise<string> {
    const polishPrompt = `Polish this response to make it more natural and engaging:

Response: ${response}

Improvements to make:
- Ensure smooth flow between sentences and paragraphs
- Remove any robotic or overly formal language
- Add natural transitions and connectors
- Make sure it sounds conversational
- Keep the same information but improve readability
- Ensure it feels human and approachable

Return only the polished response.`;

    return await this.callGemini(polishPrompt);
  }

  private formatFinalResponse(response: string): string {
    // Add branding with logo and agent name
    const brandedResponse = `**${this.agentName}** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">

${response}`;

    return brandedResponse;
  }

  private async callGemini(prompt: string): Promise<string> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${this.geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
          topP: 0.9,
          topK: 40
        }
      })
    });

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I couldn\'t generate a response at the moment. Please try again.';
  }

  // Utility method to detect if message needs deep search
  static shouldUseDeepSearch(message: string): boolean {
    const deepSearchTriggers = [
      'research', 'find information', 'tell me about', 'what is', 'how does',
      'compare', 'analyze', 'investigate', 'explore', 'discover', 'latest',
      'current', 'recent', 'trends', 'news', 'updates', 'comprehensive'
    ];
    
    const lowerMessage = message.toLowerCase();
    return deepSearchTriggers.some(trigger => lowerMessage.includes(trigger));
  }

  // Utility method to detect if message has file processing intent
  static hasFileProcessingIntent(message: string): boolean {
    const fileProcessingTriggers = [
      'analyze', 'review', 'check', 'examine', 'process', 'read',
      'summarize', 'extract', 'convert', 'translate'
    ];
    
    const lowerMessage = message.toLowerCase();
    return fileProcessingTriggers.some(trigger => lowerMessage.includes(trigger));
  }
}

