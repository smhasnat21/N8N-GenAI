export type NodeType = 'trigger' | 'agent' | 'search' | 'output';

export interface NodeData {
  label: string;
  // Trigger specific
  initialPrompt?: string;
  // Agent specific
  model?: string;
  systemInstruction?: string;
  temperature?: number;
  useSearch?: boolean; // For grounding
  // Search specific
  query?: string; // If hardcoded, otherwise uses input
  // Execution state
  output?: string | any;
  status?: 'idle' | 'running' | 'success' | 'error';
  errorMessage?: string;
}

export interface Node {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  data: NodeData;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
}

export interface DragItem {
  type: NodeType;
  label: string;
}

export const NODE_TYPES: Record<NodeType, { label: string; color: string; icon: string }> = {
  trigger: { label: 'Start Trigger', color: 'bg-emerald-600', icon: 'Play' },
  agent: { label: 'Gemini Agent', color: 'bg-orange-600', icon: 'Bot' },
  search: { label: 'Google Search', color: 'bg-blue-600', icon: 'Search' },
  output: { label: 'Output Viewer', color: 'bg-slate-600', icon: 'Terminal' },
};
