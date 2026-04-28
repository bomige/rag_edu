/**
 * nodes.js - Node Definitions and Utilities
 */

const NodeUtils = {
  // Generate unique ID
  generateId(type) {
    return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Create new node from palette
  createNode(type, category, position) {
    const categoryData = NODE_CATEGORIES.find(c => c.category === category);
    const nodeData = categoryData?.nodes.find(n => n.type === type);

    if (!nodeData) return null;

    return {
      id: this.generateId(type),
      type,
      category,
      name: nodeData.name,
      description: nodeData.description,
      status: 'idle',
      position,
      params: this.getDefaultParams(category)
    };
  },

  // Get default params for category
  getDefaultParams(category, type) {
    switch (category) {
      case 'data':
        return {
          text: '',
          file: null,
          fileName: null,
          url: '',
          loadedText: ''
        };
      case 'chunking':
        return {
          chunkSize: CONFIG.defaults.chunkSize,
          chunkOverlap: CONFIG.defaults.chunkOverlap
        };
      case 'retriever':
        return {
          topK: CONFIG.defaults.topK
        };
      case 'llm':
        return {
          temperature: CONFIG.defaults.temperature
        };
      case 'embedding':
        return {
          model: 'text-embedding-3-small'
        };
      default:
        return {};
    }
  },

  // Get node color
  getColor(category) {
    return NODE_COLORS[category] || '#64748b';
  },

  // Get port position
  getPortPosition(node, portType) {
    const x = portType === 'output'
      ? node.position.x + CONFIG.canvas.nodeWidth
      : node.position.x;
    const y = node.position.y + 90; // Approximate port y position

    return { x, y };
  },

  // Render node body content based on category
  renderNodeBody(node) {
    switch (node.category) {
      case 'chunking':
        return `
          <div class="node-param">
            <span>chunk_size:</span>
            <span class="node-param-value">${node.params?.chunkSize || 500}</span>
          </div>
          <div class="node-param">
            <span>overlap:</span>
            <span class="node-param-value">${node.params?.chunkOverlap || 50}</span>
          </div>
        `;

      case 'retriever':
        return `
          <div class="node-param">
            <span>top_k:</span>
            <span class="node-param-value">${node.params?.topK || 3}</span>
          </div>
          <div class="node-param">
            <span>method:</span>
            <span class="node-param-value">Similarity</span>
          </div>
        `;

      case 'llm':
        return `
          <div class="node-param">
            <span>model:</span>
            <span class="node-param-value">${node.name}</span>
          </div>
          <div class="node-param">
            <span>temp:</span>
            <span class="node-param-value">${node.params?.temperature || 0.7}</span>
          </div>
        `;

      default:
        return `<p>${node.description || 'Click to configure'}</p>`;
    }
  },

  // Create canvas node element
  createNodeElement(node) {
    const div = document.createElement('div');
    div.className = 'canvas-node';
    div.id = `node-${node.id}`;
    div.dataset.nodeId = node.id;
    div.style.left = `${node.position.x}px`;
    div.style.top = `${node.position.y}px`;

    if (node.status !== 'idle') {
      div.classList.add(node.status);
    }

    div.innerHTML = `
      <div class="node-color-indicator" style="background-color: ${this.getColor(node.category)}"></div>
      <div class="node-header">
        <span class="node-title">${node.name}</span>
        <div class="node-actions">
          <button class="node-run-btn" data-action="run" title="노드 실행">
            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </button>
          <button class="node-delete-btn" data-action="delete" title="노드 삭제">
            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div class="node-status ${node.status}"></div>
        </div>
      </div>
      <div class="node-body">
        ${this.renderNodeBody(node)}
      </div>
      <div class="node-ports">
        <div class="node-port input-port" data-port="input">
          <div class="port-dot"></div>
          <span class="port-label">in</span>
        </div>
        <div class="node-port output-port" data-port="output">
          <span class="port-label">out</span>
          <div class="port-dot output"></div>
        </div>
      </div>
    `;

    return div;
  },

  // Update node element
  updateNodeElement(nodeId) {
    const node = AppState.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const el = document.getElementById(`node-${nodeId}`);
    if (!el) return;

    // Update position
    el.style.left = `${node.position.x}px`;
    el.style.top = `${node.position.y}px`;

    // Update status
    el.classList.remove('idle', 'running', 'completed', 'error');
    if (node.status !== 'idle') {
      el.classList.add(node.status);
    }

    const statusEl = el.querySelector('.node-status');
    if (statusEl) {
      statusEl.className = `node-status ${node.status}`;
    }

    // Update selected state
    el.classList.toggle('selected', AppState.selectedNodeId === nodeId);

    // Update body content
    const bodyEl = el.querySelector('.node-body');
    if (bodyEl) {
      bodyEl.innerHTML = this.renderNodeBody(node);
    }
  }
};
