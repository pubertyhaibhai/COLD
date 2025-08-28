
interface ResearchTask {
  query: string;
  steps: string[];
  results: any[];
}

interface AgentCallbacks {
  onPhaseStart: (phaseId: string, description: string) => void;
  onPhaseUpdate: (phaseId: string, progress: number, data?: any) => void;
  onPhaseComplete: (phaseId: string, result: any) => void;
  onError: (error: string) => void;
}

export class AIAgent {
  private geminiKey: string;
  private searchKey: string;
  private callbacks: AgentCallbacks;

  constructor(geminiKey: string, searchKey: string, callbacks: AgentCallbacks) {
    this.geminiKey = geminiKey;
    this.searchKey = searchKey;
    this.callbacks = callbacks;
  }

  async performResearch(query: string): Promise<any> {
    try {
      // Phase 1: Planning
      this.callbacks.onPhaseStart('planning', 'Analyzing query and creating research plan');
      const plan = await this.createResearchPlan(query);
      this.callbacks.onPhaseComplete('planning', plan);

      // Phase 2: Web Search
      this.callbacks.onPhaseStart('search', 'Searching the web for relevant information');
      const searchResults = await this.performWebSearch(plan.searchQueries);
      this.callbacks.onPhaseComplete('search', searchResults);

      // Phase 3: Analysis
      this.callbacks.onPhaseStart('analysis', 'Analyzing and synthesizing information');
      const analysis = await this.analyzeResults(query, searchResults);
      this.callbacks.onPhaseComplete('analysis', analysis);

      // Phase 4: Synthesis
      this.callbacks.onPhaseStart('synthesis', 'Creating final comprehensive response');
      const finalResponse = await this.synthesizeResponse(query, analysis);
      this.callbacks.onPhaseComplete('synthesis', finalResponse);

      return finalResponse;
    } catch (error) {
      this.callbacks.onError(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async createResearchPlan(query: string): Promise<any> {
    this.callbacks.onPhaseUpdate('planning', 30);
    
    const planPrompt = `Create a research plan for: "${query}"
    
    Return a JSON object with:
    - searchQueries: array of 3-5 specific search queries
    - focusAreas: key areas to investigate
    - expectedOutcome: what the final response should contain
    
    Example:
    {
      "searchQueries": ["popular AI tools 2024", "best artificial intelligence platforms", "trending AI applications"],
      "focusAreas": ["AI tools", "platforms", "applications", "trends"],
      "expectedOutcome": "Comprehensive list of popular AI tools with descriptions"
    }`;

    const response = await this.callGemini(planPrompt);
    this.callbacks.onPhaseUpdate('planning', 80);
    
    try {
      const plan = JSON.parse(response);
      this.callbacks.onPhaseUpdate('planning', 100);
      return plan;
    } catch {
      // Fallback plan if JSON parsing fails
      return {
        searchQueries: [query, `${query} 2024`, `best ${query}`, `popular ${query}`],
        focusAreas: [query],
        expectedOutcome: `Information about ${query}`
      };
    }
  }

  private async performWebSearch(queries: string[]): Promise<any[]> {
    const results = [];
    
    for (let i = 0; i < queries.length; i++) {
      this.callbacks.onPhaseUpdate('search', (i / queries.length) * 100);
      
      try {
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${this.searchKey}&cx=${process.env.GOOGLE_SEARCH_CX || '017576662512468239146:omuauf_lfve'}&q=${encodeURIComponent(queries[i])}&num=5`;
        
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (data.items) {
          results.push({
            query: queries[i],
            results: data.items.map((item: any) => ({
              title: item.title,
              snippet: item.snippet,
              link: item.link
            }))
          });
        }
      } catch (error) {
        console.error(`Search failed for query: ${queries[i]}`, error);
      }
    }
    
    return results;
  }

  private async analyzeResults(originalQuery: string, searchResults: any[]): Promise<any> {
    this.callbacks.onPhaseUpdate('analysis', 25);

    const analysisPrompt = `Analyze these search results for the query: "${originalQuery}"

Search Results:
${JSON.stringify(searchResults, null, 2)}

Extract and organize the most relevant information in a way that can be used to create a natural, conversational response. Focus on:
- Key findings and important details
- Specific examples, tools, platforms, or entities mentioned
- Current trends and patterns
- Most credible and useful sources
- Interesting insights that would be valuable to share

Organize this information in a clear, structured way that will help create an engaging, flowing response rather than a rigid list format.`;

    this.callbacks.onPhaseUpdate('analysis', 70);
    const analysis = await this.callGemini(analysisPrompt);
    this.callbacks.onPhaseUpdate('analysis', 100);
    
    return analysis;
  }

  private async synthesizeResponse(query: string, analysis: string): Promise<string> {
    this.callbacks.onPhaseUpdate('synthesis', 30);

    const synthesisPrompt = `Based on this research analysis, provide a direct answer. DO NOT repeat or mention the user's question.

Analysis:
${analysis}

STRICT FORMATTING RULES:
- NO # headings at all
- NO * bullet points or excessive formatting
- Write in natural flowing paragraphs
- Keep it conversational and direct
- Just give the answer, don't restate what was asked
- Use simple paragraph breaks for structure
- Be concise but informative

Provide the answer directly without any preamble or question repetition.`;

    this.callbacks.onPhaseUpdate('synthesis', 80);
    const response = await this.callGemini(synthesisPrompt);
    this.callbacks.onPhaseUpdate('synthesis', 100);
    
    return response;
  }

  private async callGemini(prompt: string): Promise<string> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${this.geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
  }
}
