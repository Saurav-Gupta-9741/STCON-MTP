import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';

const GraphVisualizer = ({ graph, activeNodes, isBuildMode, onGraphUpdate }) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  
  // State for building mode
  const [sourceNodeForEdge, setSourceNodeForEdge] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: [
        ...graph.nodes.map(n => ({ data: { id: n.id.toString(), label: `Node ${n.id}` } })),
        ...graph.edges.map((e, i) => ({ data: { id: `e${i}-${e.source}-${e.target}`, source: e.source.toString(), target: e.target.toString() } }))
      ],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#1e293b',
            'background-fill': 'linear-gradient',
            'background-gradient-stop-colors': '#334155 #0f172a',
            'background-gradient-stop-positions': '0 100',
            'label': 'data(label)',
            'color': '#ffffff',
            'font-weight': 'bold',
            'text-valign': 'center',
            'font-size': '14px',
            'width': '45px',
            'height': '45px',
            'border-width': 3,
            'border-color': '#475569',
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': '0.3s'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 3,
            'line-color': '#64748b',
            'target-arrow-color': '#64748b',
            'target-arrow-shape': 'chevron',
            'arrow-scale': 1.2,
            'curve-style': 'bezier',
            'control-point-step-size': 40
          }
        },
        {
          selector: '.active',
          style: {
            'background-color': '#3b82f6',
            'background-gradient-stop-colors': '#60a5fa #2563eb',
            'border-color': '#93c5fd',
            'border-width': 4,
            'width': '52px',
            'height': '52px',
            'z-index': 100
          }
        },
        {
          selector: '.bfs-active',
          style: {
            'background-color': '#f59e0b',
            'background-gradient-stop-colors': '#fbbf24 #d97706',
            'border-color': '#fde68a',
            'border-width': 4,
            'width': '52px',
            'height': '52px',
            'z-index': 100
          }
        },
        {
          selector: '.selected-source',
          style: {
            'border-color': '#ef4444',
            'border-style': 'dashed',
            'border-width': 4
          }
        }
      ],
      layout: {
        name: 'circle',
        padding: 30
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
    });

    // Build Mode Logic
    cyRef.current.on('tap', (evt) => {
      if (!isBuildMode) return;
      
      const target = evt.target;
      
      if (target === cyRef.current) {
        // Tapped background: Add a node
        setSourceNodeForEdge(null);
        if (onGraphUpdate) {
          const nextId = graph.nodes.length > 0 ? Math.max(...graph.nodes.map(n => n.id)) + 1 : 0;
          onGraphUpdate({
            nodes: [...graph.nodes, { id: nextId }],
            edges: [...graph.edges, { source: nextId, target: nextId }] // self loop for robustness
          });
        }
      } else if (target.isNode()) {
        // Tapped a node: Select for edge creation
        const nodeId = parseInt(target.id());
        
        if (sourceNodeForEdge === null) {
          setSourceNodeForEdge(nodeId);
        } else {
          // Add edge from source to this node
          if (onGraphUpdate && sourceNodeForEdge !== nodeId) {
             onGraphUpdate({
               nodes: graph.nodes,
               edges: [...graph.edges, { source: sourceNodeForEdge, target: nodeId }]
             });
          }
          setSourceNodeForEdge(null);
        }
      }
    });

    return () => {
      if (cyRef.current) cyRef.current.destroy();
    };
  }, [graph, isBuildMode, sourceNodeForEdge, onGraphUpdate]); 

  // Handle visual highlights without full re-render
  useEffect(() => {
    if (!cyRef.current) return;
    cyRef.current.nodes().removeClass('active bfs-active selected-source');

    if (sourceNodeForEdge !== null) {
      cyRef.current.getElementById(sourceNodeForEdge.toString()).addClass('selected-source');
    }

    if (activeNodes) {
      activeNodes.forEach(nodeId => {
        cyRef.current.getElementById(nodeId.toString()).addClass(window.activeAlgorithmType === 'bfs' ? 'bfs-active' : 'active');
      });
    }

  }, [activeNodes, sourceNodeForEdge]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '400px' }} />;
};

export default GraphVisualizer;
