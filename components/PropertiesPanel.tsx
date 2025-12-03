import React from 'react';
import { Node } from '../types';
import { X, ExternalLink, Trash2 } from 'lucide-react';

interface PropertiesPanelProps {
  node: Node | null;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Node['data']>) => void;
  onDelete: (id: string) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ node, onClose, onUpdate, onDelete }) => {
  if (!node) return null;

  const handleChange = (key: string, value: any) => {
    onUpdate(node.id, { [key]: value });
  };

  return (
    <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col h-full shadow-2xl z-20">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
        <h2 className="font-semibold text-white">Properties</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Common: Label */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Node Name</label>
          <input
            type="text"
            value={node.data.label}
            onChange={(e) => handleChange('label', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:ring-1 focus:ring-orange-500 outline-none"
          />
        </div>

        {/* Trigger Node Config */}
        {node.type === 'trigger' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Initial User Message</label>
            <textarea
              value={node.data.initialPrompt || ''}
              onChange={(e) => handleChange('initialPrompt', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:ring-1 focus:ring-orange-500 outline-none h-32 resize-none"
              placeholder="Enter the starting prompt for the workflow..."
            />
          </div>
        )}

        {/* Agent Node Config */}
        {node.type === 'agent' && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Model</label>
              <select
                value={node.data.model || 'gemini-2.5-flash'}
                onChange={(e) => handleChange('model', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:ring-1 focus:ring-orange-500 outline-none"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast)</option>
                <option value="gemini-2.5-flash-lite-latest">Gemini 2.5 Flash Lite</option>
                <option value="gemini-3-pro-preview">Gemini 3.0 Pro (Reasoning)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">System Instruction</label>
              <textarea
                value={node.data.systemInstruction || ''}
                onChange={(e) => handleChange('systemInstruction', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:ring-1 focus:ring-orange-500 outline-none h-32"
                placeholder="You are a helpful assistant..."
              />
            </div>

            <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                        type="checkbox"
                        checked={node.data.useSearch || false}
                        onChange={(e) => handleChange('useSearch', e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-orange-500 focus:ring-offset-slate-900 focus:ring-orange-500"
                    />
                    <span className="text-sm text-slate-300">Enable Google Search Grounding</span>
                </label>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Temperature: {node.data.temperature ?? 0.7}</label>
              <input 
                type="range" 
                min="0" 
                max="2" 
                step="0.1"
                value={node.data.temperature ?? 0.7}
                onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>
          </>
        )}

        {/* Search Node Config */}
        {node.type === 'search' && (
          <div className="space-y-2">
             <p className="text-xs text-slate-400">
                This node will take the input from the previous node as a search query and return a summarized answer using Google Search Grounding.
             </p>
          </div>
        )}

        {/* Output Node Config */}
        {node.type === 'output' && (
          <div className="space-y-2">
             <p className="text-xs text-slate-400">
                Displays the final text output of the workflow.
             </p>
          </div>
        )}

        {/* Result Viewer (Read Only) */}
        <div className="pt-6 border-t border-slate-700">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex justify-between">
                <span>Last Run Output</span>
                {node.data.output && <span className="text-xs text-emerald-400">Available</span>}
            </label>
            <div className="mt-2 bg-black/30 rounded p-3 text-sm text-slate-300 font-mono min-h-[100px] max-h-[300px] overflow-y-auto whitespace-pre-wrap break-words border border-slate-800">
                {node.data.output ? (
                     typeof node.data.output === 'string' ? node.data.output : JSON.stringify(node.data.output, null, 2)
                ) : (
                    <span className="text-slate-600 italic">No output yet...</span>
                )}
            </div>
        </div>

      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-900/50">
        <button 
            onClick={() => onDelete(node.id)}
            className="w-full flex items-center justify-center gap-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 py-2 rounded transition-colors text-sm font-medium"
        >
            <Trash2 size={16} />
            Delete Node
        </button>
      </div>
    </div>
  );
};

export default PropertiesPanel;
