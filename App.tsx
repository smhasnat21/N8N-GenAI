import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Node, Edge, NodeType, NODE_TYPES, NodeData } from './types';
import WorkflowNode from './components/WorkflowNode';
import PropertiesPanel from './components/PropertiesPanel';
import { generateAgentResponse, performSearch } from './services/gemini';
import { Plus, Play, MousePointer2, AlertTriangle, Github, Info, Bot, Search, Terminal } from 'lucide-react';

const INITIAL_NODES: Node[] = [
  { 
    id: '1', 
    type: 'trigger', 
    x: 100, 
    y: 300, 
    data: { label: 'Start Trigger', initialPrompt: 'Who is the CEO of Google?', status: 'idle' } 
  },
  { 
    id: '2', 
    type: 'agent', 
    x: 500, 
    y: 300, 
    data: { 
      label: 'Gemini Agent', 
      model: 'gemini-2.5-flash',
      systemInstruction: 'You are a concise assistant.',
      status: 'idle' 
    } 
  },
  {
    id: '3',
    type: 'output',
    x: 900,
    y: 300,
    data: { label: 'Final Output', status: 'idle' }
  }
];

const INITIAL_EDGES: Edge[] = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' }
];

const App: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Viewport state for pan/zoom (simple implementation)
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Connection state
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  const [connectingHandle, setConnectingHandle] = useState<'source' | 'target' | null>(null);
  const [tempMousePos, setTempMousePos] = useState({ x: 0, y: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Execution state
  const [isRunning, setIsRunning] = useState(false);

  // --- Workflow Execution Logic ---

  const resetExecutionState = () => {
    setNodes(prev => prev.map(n => ({
      ...n,
      data: { ...n.data, status: 'idle', errorMessage: undefined }
    })));
  };

  const runWorkflow = async () => {
    if (isRunning) return;
    setIsRunning(true);
    resetExecutionState();

    try {
      // Find trigger
      const trigger = nodes.find(n => n.type === 'trigger');
      if (!trigger) throw new Error("No Start Trigger found.");

      // Initial Execution Queue
      // This is a simplified BFS execution engine
      let queue: { nodeId: string; inputData: string }[] = [
        { nodeId: trigger.id, inputData: trigger.data.initialPrompt || '' }
      ];

      // Track processed to avoid infinite loops in this simple engine
      const processed = new Set<string>();

      while (queue.length > 0) {
        const currentItem = queue.shift();
        if (!currentItem) break;

        const { nodeId, inputData } = currentItem;
        if (processed.has(nodeId + inputData)) continue; // Basic loop prevention

        // Update Node Status: Running
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'running' } } : n));

        // Wait a tiny bit for UI update
        await new Promise(r => setTimeout(r, 100));

        const currentNode = nodes.find(n => n.id === nodeId)!;
        let outputData = inputData;

        try {
          // Execute Node Logic
          if (currentNode.type === 'trigger') {
            outputData = currentNode.data.initialPrompt || '';
          } else if (currentNode.type === 'agent') {
            outputData = await generateAgentResponse(inputData, {
                model: currentNode.data.model || 'gemini-2.5-flash',
                systemInstruction: currentNode.data.systemInstruction,
                temperature: currentNode.data.temperature,
                useSearch: currentNode.data.useSearch,
            });
          } else if (currentNode.type === 'search') {
            outputData = await performSearch(inputData);
          } else if (currentNode.type === 'output') {
            outputData = inputData;
          }

          // Update Node Status: Success & Output
          setNodes(prev => prev.map(n => n.id === nodeId ? { 
            ...n, 
            data: { ...n.data, status: 'success', output: outputData } 
          } : n));

          // Find connected next nodes
          const nextEdges = edges.filter(e => e.source === nodeId);
          for (const edge of nextEdges) {
            queue.push({ nodeId: edge.target, inputData: outputData });
          }

        } catch (error: any) {
          console.error(`Error in node ${nodeId}:`, error);
          setNodes(prev => prev.map(n => n.id === nodeId ? { 
            ...n, 
            data: { ...n.data, status: 'error', errorMessage: error.message } 
          } : n));
          // Stop this branch
        }
      }

    } catch (error: any) {
        alert("Workflow Error: " + error.message);
    } finally {
      setIsRunning(false);
    }
  };


  // --- Node Interactions ---

  const addNode = (type: NodeType) => {
    const id = Date.now().toString();
    const newNode: Node = {
      id,
      type,
      x: -offset.x + 100 + (Math.random() * 50),
      y: -offset.y + 100 + (Math.random() * 50),
      data: {
        label: NODE_TYPES[type].label,
        status: 'idle',
        model: type === 'agent' ? 'gemini-2.5-flash' : undefined,
        initialPrompt: type === 'trigger' ? 'Write a poem about coding.' : undefined
      }
    };
    setNodes([...nodes, newNode]);
  };

  const updateNodeData = (id: string, data: Partial<NodeData>) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
  };

  const deleteNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
    setEdges(edges.filter(e => e.source !== id && e.target !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  // --- Canvas Interaction Handlers ---

  const handleMouseDown = (e: React.MouseEvent) => {
    // If clicking on canvas bg
    if (e.target === wrapperRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      setSelectedNodeId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Panning
    if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }

    // Node Dragging
    if (isDragging && draggedNodeId) {
       // Convert screen coords to canvas coords, considering scale
       // For simplicity, we assume scale is 1 for drag calculation logic or adjust strictly by delta
       const dx = e.movementX;
       const dy = e.movementY;
       setNodes(prev => prev.map(n => n.id === draggedNodeId ? { ...n, x: n.x + dx, y: n.y + dy } : n));
    }

    // Connecting line visual
    if (connectingNodeId) {
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (rect) {
            setTempMousePos({
                x: e.clientX - rect.left - offset.x,
                y: e.clientY - rect.top - offset.y
            });
        }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDragging(false);
    setDraggedNodeId(null);
    setConnectingNodeId(null);
    setConnectingHandle(null);
  };

  // --- Node Dragging wrappers ---
  const onNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setIsDragging(true);
    setDraggedNodeId(id);
    setSelectedNodeId(id);
  };

  // --- Connection Logic ---
  const onConnectStart = (e: React.MouseEvent, nodeId: string, handleType: 'source' | 'target') => {
    e.stopPropagation();
    // Only allow starting from source (output) for now to keep it simple, or both.
    // Let's allow source->target.
    if (handleType === 'source') {
        setConnectingNodeId(nodeId);
        setConnectingHandle(handleType);
        
        // Initial temp pos
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            setTempMousePos({ x: node.x + 240, y: node.y + 40 }); // Approx handle loc
        }
    }
  };

  const onConnectEnd = (e: React.MouseEvent, nodeId: string, handleType: 'source' | 'target') => {
      e.stopPropagation();
      if (connectingNodeId && connectingHandle === 'source' && handleType === 'target') {
          // Create Edge
          if (connectingNodeId !== nodeId) { // No self loops
             // Check if exists
             if (!edges.find(edge => edge.source === connectingNodeId && edge.target === nodeId)) {
                 setEdges(prev => [...prev, {
                     id: `e${connectingNodeId}-${nodeId}-${Date.now()}`,
                     source: connectingNodeId,
                     target: nodeId
                 }]);
             }
          }
      }
      setConnectingNodeId(null);
      setConnectingHandle(null);
  };

  // --- SVG Path Generation ---
  const getEdgePath = (source: Node, target: Node) => {
      const sx = source.x + 256; // Width of node (w-64 = 16rem = 256px) + offset? No, handle is at right edge
      const sy = source.y + 42; // Header (approx 45) + half body? Center of node roughly.
      // Let's refine handle positions based on NodeComponent CSS
      // Width 256px. Header ~48px. Body variable.
      // Actually, my CSS puts handles at top-1/2.
      // Node height isn't fixed, but let's approximate anchor points.
      // A robust system calculates height. Here we assume center-ish or fix it.
      // Let's just trust the visual flow and hardcode an anchor offset that looks "okay".
      
      // Node is w-64 (256px). 
      // Handle is -right-3.
      const startX = source.x + 256; 
      const startY = source.y + 40; // Approx top-10
      
      const endX = target.x;
      const endY = target.y + 40;

      const deltaX = Math.abs(endX - startX) * 0.5;
      return `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`;
  };

  const getTempPath = () => {
      if (!connectingNodeId) return '';
      const source = nodes.find(n => n.id === connectingNodeId);
      if (!source) return '';
      
      const startX = source.x + 256;
      const startY = source.y + 40;
      
      const endX = tempMousePos.x;
      const endY = tempMousePos.y;
      
      const deltaX = Math.abs(endX - startX) * 0.5;
      return `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`;
  };

  return (
    <div className="flex h-screen w-screen bg-slate-900 overflow-hidden select-none">
      
      {/* Left Sidebar / Toolbox */}
      <div className="w-16 flex flex-col items-center py-4 bg-slate-950 border-r border-slate-800 z-30 gap-4">
         <div className="mb-4 text-orange-500 font-bold text-xl">n8n</div>
         
         {Object.entries(NODE_TYPES).map(([type, config]) => (
            <button
                key={type}
                onClick={() => addNode(type as NodeType)}
                className="w-10 h-10 rounded hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all relative group"
                title={config.label}
            >
                {type === 'trigger' && <Play size={20} />}
                {type === 'agent' && <Bot size={20} />}
                {type === 'search' && <Search size={20} />}
                {type === 'output' && <Terminal size={20} />}
                
                {/* Tooltip */}
                <div className="absolute left-12 bg-slate-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity border border-slate-700">
                    Add {config.label}
                </div>
            </button>
         ))}

         <div className="flex-1" />
         
         <a href="https://github.com/google/generative-ai-js" target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-white">
            <Github size={20} />
         </a>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative flex flex-col">
        {/* Top Bar */}
        <div className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center px-4 justify-between z-20">
            <div className="flex items-center gap-2">
                <h1 className="font-semibold text-slate-200">Workflow 1</h1>
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Unsaved</span>
            </div>

            <div className="flex items-center gap-4">
                {isRunning && <span className="text-blue-400 text-sm animate-pulse flex items-center gap-2"><Info size={14}/> Executing Workflow...</span>}
                <button 
                    onClick={runWorkflow}
                    disabled={isRunning}
                    className={`flex items-center gap-2 px-4 py-2 rounded font-medium text-sm transition-all ${
                        isRunning 
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                    }`}
                >
                    <Play size={16} fill="currentColor" />
                    {isRunning ? 'Running...' : 'Execute Workflow'}
                </button>
            </div>
        </div>

        {/* Canvas Wrapper */}
        <div 
            ref={wrapperRef}
            className="flex-1 relative overflow-hidden bg-slate-900 grid-bg cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div 
                className="absolute w-full h-full transform origin-top-left"
                style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
            >
                {/* Edges Layer (SVG) */}
                <svg className="absolute top-0 left-0 w-[5000px] h-[5000px] pointer-events-none overflow-visible">
                     <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                          <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                        </marker>
                      </defs>
                    {edges.map(edge => {
                        const source = nodes.find(n => n.id === edge.source);
                        const target = nodes.find(n => n.id === edge.target);
                        if (!source || !target) return null;
                        return (
                            <path
                                key={edge.id}
                                d={getEdgePath(source, target)}
                                stroke="#64748b"
                                strokeWidth="2"
                                fill="none"
                                markerEnd="url(#arrowhead)"
                            />
                        );
                    })}
                    {/* Temp Connection Line */}
                    {connectingNodeId && (
                        <path
                            d={getTempPath()}
                            stroke="#f97316" // Orange
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            fill="none"
                        />
                    )}
                </svg>

                {/* Nodes Layer */}
                {nodes.map(node => (
                    <WorkflowNode
                        key={node.id}
                        node={node}
                        isSelected={selectedNodeId === node.id}
                        onSelect={setSelectedNodeId}
                        onMouseDown={onNodeMouseDown}
                        onConnectStart={onConnectStart}
                        onConnectEnd={onConnectEnd}
                    />
                ))}
            </div>
            
            {/* Overlay Instructions if Empty */}
            {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-slate-600 text-center">
                        <MousePointer2 size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">Drag and drop nodes from the sidebar</p>
                        <p className="text-sm opacity-70">Connect nodes to build your AI agent</p>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Right Sidebar / Properties */}
      {selectedNodeId && (
          <PropertiesPanel 
            node={nodes.find(n => n.id === selectedNodeId) || null} 
            onClose={() => setSelectedNodeId(null)}
            onUpdate={updateNodeData}
            onDelete={deleteNode}
          />
      )}
    </div>
  );
};

export default App;