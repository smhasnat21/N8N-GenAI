import React from 'react';
import { Node, NODE_TYPES } from '../types';
import { Play, Bot, Search, Terminal, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface WorkflowNodeProps {
  node: Node;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onConnectStart: (e: React.MouseEvent, nodeId: string, handleType: 'source' | 'target') => void;
  onConnectEnd: (e: React.MouseEvent, nodeId: string, handleType: 'source' | 'target') => void;
}

const WorkflowNode: React.FC<WorkflowNodeProps> = ({ 
  node, 
  isSelected, 
  onSelect, 
  onMouseDown,
  onConnectStart,
  onConnectEnd
}) => {
  const nodeType = NODE_TYPES[node.type];
  const Icon = () => {
    switch (node.type) {
      case 'trigger': return <Play size={16} />;
      case 'agent': return <Bot size={16} />;
      case 'search': return <Search size={16} />;
      case 'output': return <Terminal size={16} />;
      default: return <div />;
    }
  };

  const getStatusIcon = () => {
    switch (node.data.status) {
      case 'running': return <Loader2 size={14} className="animate-spin text-blue-400" />;
      case 'success': return <CheckCircle size={14} className="text-emerald-400" />;
      case 'error': return <AlertCircle size={14} className="text-red-400" />;
      default: return null;
    }
  };

  return (
    <div
      className={`absolute shadow-lg rounded-lg w-64 select-none group transition-all duration-200 ${
        isSelected ? 'ring-2 ring-orange-500 z-50' : 'z-10'
      }`}
      style={{
        left: node.x,
        top: node.y,
        backgroundColor: '#1e293b', // slate-800
        border: '1px solid #334155' // slate-700
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
    >
      {/* Input Handle */}
      {node.type !== 'trigger' && (
        <div
          className="absolute -left-3 top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-500 rounded-full border-2 border-slate-800 hover:bg-orange-500 hover:scale-125 transition-all cursor-crosshair z-50"
          onMouseDown={(e) => { e.stopPropagation(); onConnectStart(e, node.id, 'target'); }}
          onMouseUp={(e) => { e.stopPropagation(); onConnectEnd(e, node.id, 'target'); }}
          title="Input"
        />
      )}

      {/* Node Header */}
      <div 
        className={`flex items-center gap-2 p-3 rounded-t-lg cursor-grab active:cursor-grabbing ${nodeType.color}`}
        onMouseDown={(e) => onMouseDown(e, node.id)}
      >
        <div className="text-white opacity-90">
            <Icon />
        </div>
        <span className="font-semibold text-white text-sm flex-1">{node.data.label}</span>
        <div className="flex items-center">{getStatusIcon()}</div>
      </div>

      {/* Node Body */}
      <div className="p-3">
        <div className="text-xs text-slate-400 truncate">
          {node.type === 'agent' && `Model: ${node.data.model || 'Flash 2.5'}`}
          {node.type === 'trigger' && `Start: ${node.data.initialPrompt?.substring(0, 20) || 'Empty'}...`}
          {node.type === 'search' && 'Google Search'}
          {node.type === 'output' && (node.data.output ? 'Has Result' : 'Waiting...')}
        </div>
        
        {/* Preview of Output if Success */}
        {node.data.status === 'success' && node.data.output && (
          <div className="mt-2 p-2 bg-slate-900 rounded border border-slate-700 max-h-20 overflow-hidden text-xs text-slate-300 font-mono relative">
             <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/90 pointer-events-none" />
             {typeof node.data.output === 'string' ? node.data.output : JSON.stringify(node.data.output)}
          </div>
        )}
        
        {node.data.status === 'error' && (
          <div className="mt-2 text-xs text-red-400">
             {node.data.errorMessage}
          </div>
        )}
      </div>

      {/* Output Handle */}
      {node.type !== 'output' && (
        <div
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-500 rounded-full border-2 border-slate-800 hover:bg-orange-500 hover:scale-125 transition-all cursor-crosshair z-50"
          onMouseDown={(e) => { e.stopPropagation(); onConnectStart(e, node.id, 'source'); }}
          onMouseUp={(e) => { e.stopPropagation(); onConnectEnd(e, node.id, 'source'); }}
          title="Output"
        />
      )}
    </div>
  );
};

export default WorkflowNode;
