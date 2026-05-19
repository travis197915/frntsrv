/**
 * Dummy AI agents available for use in workflow orchestration.
 */

export type AgentCategory = 'llm' | 'tool' | 'router' | 'input' | 'output' | 'processor';

export type AgentDefinition = {
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
  icon: string; // Lucide icon name
  inputs: string[];
  outputs: string[];
  configSchema?: Record<string, unknown>;
};

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: 'openai-chat',
    name: 'OpenAI Chat',
    description: 'Chat completion using GPT models',
    category: 'llm',
    icon: 'MessageSquare',
    inputs: ['messages', 'system_prompt'],
    outputs: ['response', 'usage'],
  },
  {
    id: 'anthropic-claude',
    name: 'Claude',
    description: 'Claude models for reasoning and coding',
    category: 'llm',
    icon: 'Brain',
    inputs: ['messages', 'tools'],
    outputs: ['response', 'tool_calls'],
  },
  {
    id: 'web-search',
    name: 'Web Search',
    description: 'Search the web for real-time information',
    category: 'tool',
    icon: 'Search',
    inputs: ['query'],
    outputs: ['results', 'snippets'],
  },
  {
    id: 'code-executor',
    name: 'Code Executor',
    description: 'Execute Python/JS code in a sandbox',
    category: 'tool',
    icon: 'Code',
    inputs: ['code', 'context'],
    outputs: ['result', 'stdout', 'stderr'],
  },
  {
    id: 'document-retriever',
    name: 'Document Retriever',
    description: 'Fetch and parse documents (PDF, HTML)',
    category: 'tool',
    icon: 'FileText',
    inputs: ['url', 'document_type'],
    outputs: ['content', 'metadata'],
  },
  {
    id: 'condition-router',
    name: 'Condition Router',
    description: 'Route flow based on condition outcome',
    category: 'router',
    icon: 'GitBranch',
    inputs: ['value', 'condition'],
    outputs: ['true_path', 'false_path'],
  },
  {
    id: 'multi-agent-router',
    name: 'Multi-Agent Router',
    description: 'Route to different agents by intent',
    category: 'router',
    icon: 'Share2',
    inputs: ['message', 'intent'],
    outputs: ['agent_a', 'agent_b', 'agent_c'],
  },
  {
    id: 'user-input',
    name: 'User Input',
    description: 'Capture input from the user',
    category: 'input',
    icon: 'User',
    inputs: [],
    outputs: ['user_message', 'metadata'],
  },
  {
    id: 'trigger-webhook',
    name: 'Webhook Trigger',
    description: 'Start workflow via HTTP webhook',
    category: 'input',
    icon: 'Zap',
    inputs: [],
    outputs: ['payload', 'headers'],
  },
  {
    id: 'voice-input',
    name: 'Voice Input',
    description: 'Capture voice/audio as input',
    category: 'input',
    icon: 'Mic2',
    inputs: [],
    outputs: ['audio', 'transcript', 'metadata'],
  },
  {
    id: 'text-output',
    name: 'Text Output',
    description: 'Return text response to user',
    category: 'output',
    icon: 'Send',
    inputs: ['content'],
    outputs: [],
  },
  {
    id: 'api-response',
    name: 'API Response',
    description: 'Return structured JSON response',
    category: 'output',
    icon: 'Database',
    inputs: ['data', 'status'],
    outputs: [],
  },
  {
    id: 'text-extractor',
    name: 'Text Extractor',
    description: 'Extract structured data from text',
    category: 'processor',
    icon: 'Filter',
    inputs: ['text', 'schema'],
    outputs: ['extracted_data'],
  },
  {
    id: 'summarizer',
    name: 'Summarizer',
    description: 'Summarize long text',
    category: 'processor',
    icon: 'FileType2',
    inputs: ['text', 'max_length'],
    outputs: ['summary'],
  },
  {
    id: 'embedding-generator',
    name: 'Embedding Generator',
    description: 'Generate vector embeddings for text',
    category: 'processor',
    icon: 'Layers',
    inputs: ['text', 'model'],
    outputs: ['embedding', 'dimensions'],
  },
];

export const AGENT_CATEGORIES: Record<AgentCategory, string> = {
  llm: 'LLM',
  tool: 'Tool',
  router: 'Router',
  input: 'Input',
  output: 'Output',
  processor: 'Processor',
};
