import { AIAgent } from './aiAgent';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  files?: string[];
  visualizations?: any[];
}

interface CodeExecutionResult extends ToolResult {
  output: string;
  executionTime: number;
}

interface DocumentAnalysisResult extends ToolResult {
  text: string;
  metadata: any;
  images?: string[];
}

interface WebBrowsingResult extends ToolResult {
  content: string;
  title: string;
  url: string;
  links: string[];
  images: string[];
}

export class EnhancedAIAgent extends AIAgent {
  private tools: Map<string, Function>;

  constructor(geminiKey: string, searchKey: string, callbacks: any) {
    super(geminiKey, searchKey, callbacks);
    this.tools = new Map();
    this.initializeTools();
  }

  private initializeTools() {
    this.tools.set('code_execution', this.executeCode.bind(this));
    this.tools.set('document_analysis', this.analyzeDocument.bind(this));
    this.tools.set('web_browsing', this.browseWeb.bind(this));
    this.tools.set('data_visualization', this.createVisualization.bind(this));
    this.tools.set('file_processing', this.processFile.bind(this));
    this.tools.set('enhanced_search', this.enhancedSearch.bind(this));
  }

  async performEnhancedTask(query: string, toolsNeeded: string[] = []): Promise<any> {
    try {
      // Phase 1: Enhanced Planning
      this.callbacks.onPhaseStart('planning', 'Analyzing query and selecting optimal tools');
      const plan = await this.createEnhancedPlan(query, toolsNeeded);
      this.callbacks.onPhaseComplete('planning', plan);

      // Phase 2: Tool Execution
      this.callbacks.onPhaseStart('execution', 'Executing selected tools');
      const toolResults = await this.executeTools(plan.tools);
      this.callbacks.onPhaseComplete('execution', toolResults);

      // Phase 3: Enhanced Analysis
      this.callbacks.onPhaseStart('analysis', 'Analyzing results from multiple sources');
      const analysis = await this.analyzeEnhancedResults(query, toolResults);
      this.callbacks.onPhaseComplete('analysis', analysis);

      // Phase 4: Synthesis with Rich Content
      this.callbacks.onPhaseStart('synthesis', 'Creating comprehensive response with rich content');
      const finalResponse = await this.synthesizeEnhancedResponse(query, analysis, toolResults);
      this.callbacks.onPhaseComplete('synthesis', finalResponse);

      return finalResponse;
    } catch (error) {
      this.callbacks.onError(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async createEnhancedPlan(query: string, suggestedTools: string[]): Promise<any> {
    const planPrompt = `Analyze this query and create an enhanced execution plan: "${query}"

Available tools:
- code_execution: Execute Python/JavaScript code for calculations, data processing
- document_analysis: Analyze PDF, Word, Excel files
- web_browsing: Browse websites and extract real-time information
- data_visualization: Create charts, graphs, and visual representations
- file_processing: Process and manipulate various file formats
- enhanced_search: Multi-source search with fact-checking

Suggested tools: ${suggestedTools.join(', ')}

Return a JSON object with:
- tools: array of tools to use with specific parameters
- searchQueries: enhanced search queries if needed
- expectedOutputs: what each tool should produce
- synthesisStrategy: how to combine results

Example:
{
  "tools": [
    {"name": "enhanced_search", "params": {"queries": ["AI trends 2024"], "sources": ["academic", "news"]}},
    {"name": "data_visualization", "params": {"type": "chart", "data_source": "search_results"}}
  ],
  "searchQueries": ["comprehensive AI trends analysis 2024"],
  "expectedOutputs": ["search results", "trend visualization"],
  "synthesisStrategy": "combine search data with visual analysis"
}`;

    const response = await this.callGemini(planPrompt);
    
    try {
      return JSON.parse(response);
    } catch {
      return {
        tools: suggestedTools.map(tool => ({ name: tool, params: {} })),
        searchQueries: [query],
        expectedOutputs: ["analysis results"],
        synthesisStrategy: "comprehensive analysis"
      };
    }
  }

  private async executeTools(tools: any[]): Promise<Map<string, ToolResult>> {
    const results = new Map<string, ToolResult>();
    
    for (const tool of tools) {
      try {
        const toolFunction = this.tools.get(tool.name);
        if (toolFunction) {
          const result = await toolFunction(tool.params);
          results.set(tool.name, result);
        }
      } catch (error) {
        results.set(tool.name, {
          success: false,
          error: error instanceof Error ? error.message : 'Tool execution failed'
        });
      }
    }
    
    return results;
  }

  // Tool Implementations
  private async executeCode(params: any): Promise<CodeExecutionResult> {
    const { language = 'python', code, timeout = 30000 } = params;
    
    try {
      // This would integrate with a code execution service
      // For now, return a mock result
      const startTime = Date.now();
      
      // Simulate code execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        output: `Code executed successfully in ${language}`,
        executionTime,
        data: { language, code }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Code execution failed',
        output: '',
        executionTime: 0
      };
    }
  }

  private async analyzeDocument(params: any): Promise<DocumentAnalysisResult> {
    const { filePath, analysisType = 'full' } = params;
    
    try {
      // This would integrate with document processing libraries
      return {
        success: true,
        text: 'Document analysis completed',
        metadata: { pages: 10, words: 5000, analysisType },
        data: { filePath, analysisType }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Document analysis failed',
        text: '',
        metadata: {}
      };
    }
  }

  private async browseWeb(params: any): Promise<WebBrowsingResult> {
    const { url, extractData = true } = params;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      const title = $('title').text();
      const content = $('body').text().substring(0, 5000);
      const links = $('a[href]').map((_, el) => $(el).attr('href')).get().slice(0, 20);
      const images = $('img[src]').map((_, el) => $(el).attr('src')).get().slice(0, 10);
      
      return {
        success: true,
        content,
        title,
        url,
        links,
        images,
        data: { url, extractData }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Web browsing failed',
        content: '',
        title: '',
        url,
        links: [],
        images: []
      };
    }
  }

  private async createVisualization(params: any): Promise<ToolResult> {
    const { type = 'chart', data, title } = params;
    
    try {
      // This would generate actual visualizations
      return {
        success: true,
        data: { type, title, chartData: data },
        visualizations: [{
          type,
          title,
          data,
          config: { responsive: true, maintainAspectRatio: false }
        }]
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Visualization creation failed'
      };
    }
  }

  private async processFile(params: any): Promise<ToolResult> {
    const { filePath, operation = 'analyze' } = params;
    
    try {
      // File processing logic would go here
      return {
        success: true,
        data: { filePath, operation, result: 'File processed successfully' }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'File processing failed'
      };
    }
  }

  private async enhancedSearch(params: any): Promise<ToolResult> {
    const { queries, sources = ['web'], factCheck = true } = params;
    
    try {
      // Enhanced search with multiple sources
      const results = [];
      
      for (const query of queries) {
        // Use existing search functionality
        const searchResults = await this.performWebSearch([query]);
        results.push(...searchResults);
      }
      
      return {
        success: true,
        data: { queries, sources, results, factCheck }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Enhanced search failed'
      };
    }
  }

  private async analyzeEnhancedResults(query: string, toolResults: Map<string, ToolResult>): Promise<any> {
    const resultsArray = Array.from(toolResults.entries());
    
    const analysisPrompt = `Analyze these enhanced tool results for the query: "${query}"

Tool Results:
${JSON.stringify(resultsArray, null, 2)}

Provide a comprehensive analysis that:
- Identifies key insights from each tool
- Finds connections between different data sources
- Highlights any contradictions or inconsistencies
- Suggests additional analysis if needed
- Evaluates the reliability of sources

Focus on creating a cohesive understanding that leverages all available information.`;

    return await this.callGemini(analysisPrompt);
  }

  private async synthesizeEnhancedResponse(query: string, analysis: string, toolResults: Map<string, ToolResult>): Promise<any> {
    const hasVisualizations = Array.from(toolResults.values()).some(result => result.visualizations?.length);
    const hasFiles = Array.from(toolResults.values()).some(result => result.files?.length);
    
    const synthesisPrompt = `Create a comprehensive response based on this enhanced analysis.

Query: "${query}"
Analysis: ${analysis}

Available enhancements:
- Visualizations: ${hasVisualizations ? 'Yes' : 'No'}
- Generated files: ${hasFiles ? 'Yes' : 'No'}
- Multiple data sources: Yes

Create a response that:
- Directly answers the query without restating it
- Uses natural, flowing paragraphs
- Incorporates insights from multiple tools
- References specific data points and sources
- Suggests actionable next steps if relevant

Format: Natural paragraphs only, no headers or bullet points.`;

    const response = await this.callGemini(synthesisPrompt);
    
    return {
      text: response,
      toolResults: Array.from(toolResults.entries()),
      hasEnhancements: hasVisualizations || hasFiles
    };
  }

  // Enhanced capability detection
  static detectRequiredTools(query: string): string[] {
    const tools = [];
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('code') || lowerQuery.includes('calculate') || lowerQuery.includes('program')) {
      tools.push('code_execution');
    }
    
    if (lowerQuery.includes('document') || lowerQuery.includes('pdf') || lowerQuery.includes('file')) {
      tools.push('document_analysis');
    }
    
    if (lowerQuery.includes('website') || lowerQuery.includes('browse') || lowerQuery.includes('current')) {
      tools.push('web_browsing');
    }
    
    if (lowerQuery.includes('chart') || lowerQuery.includes('graph') || lowerQuery.includes('visualize')) {
      tools.push('data_visualization');
    }
    
    if (lowerQuery.includes('research') || lowerQuery.includes('analyze') || lowerQuery.includes('compare')) {
      tools.push('enhanced_search');
    }
    
    return tools;
  }
}

