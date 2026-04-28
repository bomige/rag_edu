/**
 * canvas.js - Canvas Rendering and Node Interactions
 */

const Canvas = {
  container: null,
  nodesContainer: null,

  // Initialize canvas
  init() {
    this.container = document.getElementById('canvas');
    this.nodesContainer = document.getElementById('nodesContainer');

    this.render();
    this.bindEvents();
  },

  // Render all nodes
  render() {
    if (!this.nodesContainer) return;

    this.nodesContainer.innerHTML = '';

    AppState.nodes.forEach(node => {
      const el = NodeUtils.createNodeElement(node);
      this.nodesContainer.appendChild(el);
    });

    Connections.render();
    AppState.updateStats();
  },

  // Bind canvas events
  bindEvents() {
    if (!this.container) return;

    // Drag over
    this.container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      this.container.classList.add('drag-over');
      AppState.isDragOver = true;
      document.getElementById('dropHint').style.display = 'flex';
    });

    // Drag leave
    this.container.addEventListener('dragleave', (e) => {
      if (!this.container.contains(e.relatedTarget)) {
        this.container.classList.remove('drag-over');
        AppState.isDragOver = false;
        document.getElementById('dropHint').style.display = 'none';
      }
    });

    // Drop
    this.container.addEventListener('drop', (e) => {
      e.preventDefault();
      this.container.classList.remove('drag-over');
      AppState.isDragOver = false;
      document.getElementById('dropHint').style.display = 'none';

      const nodeType = e.dataTransfer.getData('nodeType');
      const nodeCategory = e.dataTransfer.getData('nodeCategory');

      if (nodeType && nodeCategory) {
        const rect = this.container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / (AppState.zoom / 100) - 100;
        const y = (e.clientY - rect.top) / (AppState.zoom / 100) - 60;

        const newNode = NodeUtils.createNode(nodeType, nodeCategory, { x, y });
        if (newNode) {
          AppState.addNode(newNode);
          const el = NodeUtils.createNodeElement(newNode);
          this.nodesContainer.appendChild(el);
          Toast.show('노드가 추가되었습니다', 'success');
        }
      }
    });

    // Click on canvas (deselect)
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container || e.target.classList.contains('nodes-container')) {
        AppState.selectNode(null);
        AppState.selectConnection(null);
        this.updateSelection();
        Connections.render();
        Panels.updateRightPanel();
      }
    });

    // Mouse move (for dragging and connection preview)
    this.container.addEventListener('mousemove', (e) => {
      const rect = this.container.getBoundingClientRect();
      AppState.mousePos = {
        x: (e.clientX - rect.left) / (AppState.zoom / 100),
        y: (e.clientY - rect.top) / (AppState.zoom / 100)
      };

      // Node dragging
      if (AppState.draggingNode) {
        const x = AppState.mousePos.x - AppState.dragOffset.x;
        const y = AppState.mousePos.y - AppState.dragOffset.y;

        AppState.updateNodePosition(AppState.draggingNode, x, y);
        NodeUtils.updateNodeElement(AppState.draggingNode);
        Connections.render();
      }

      // Connection preview
      if (AppState.connectingFrom) {
        Connections.render();
      }
    });

    // Mouse up
    this.container.addEventListener('mouseup', () => {
      AppState.draggingNode = null;
      if (AppState.connectingFrom) {
        AppState.connectingFrom = null;
        document.getElementById('connectionHint').style.display = 'none';
        Connections.render();
      }
    });

    // Mouse leave
    this.container.addEventListener('mouseleave', () => {
      AppState.draggingNode = null;
    });

    // Node events (delegated)
    this.nodesContainer.addEventListener('mousedown', (e) => {
      const node = e.target.closest('.canvas-node');
      if (!node) return;

      const nodeId = node.dataset.nodeId;

      // Run button - Execute single node
      if (e.target.closest('[data-action="run"]')) {
        e.stopPropagation();
        NodeRunner.executeNode(nodeId);
        return;
      }

      // Delete button
      if (e.target.closest('[data-action="delete"]')) {
        e.stopPropagation();
        AppState.removeNode(nodeId);
        node.remove();
        Connections.render();
        Panels.updateRightPanel();
        Toast.show('노드가 삭제되었습니다', 'info');
        return;
      }

      // Output port (start connection)
      if (e.target.closest('.output-port')) {
        e.stopPropagation();
        AppState.connectingFrom = { nodeId, type: 'output' };
        document.getElementById('connectionHint').style.display = 'block';
        return;
      }

      // Input port (end connection) - handle both click to start and click to end
      if (e.target.closest('.input-port')) {
        e.stopPropagation();
        e.preventDefault();
        if (AppState.connectingFrom && AppState.connectingFrom.nodeId !== nodeId) {
          const newConnection = {
            id: `conn-${AppState.connectingFrom.nodeId}-${nodeId}-${Date.now()}`,
            source: AppState.connectingFrom.nodeId,
            target: nodeId
          };
          AppState.addConnection(newConnection);
          Connections.render();
          Toast.show('연결이 추가되었습니다', 'success');
          AppState.connectingFrom = null;
          document.getElementById('connectionHint').style.display = 'none';
        }
        return;
      }

      // Node selection and drag start
      const rect = node.getBoundingClientRect();
      AppState.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      AppState.draggingNode = nodeId;
      AppState.selectNode(nodeId);
      this.updateSelection();
      Panels.updateRightPanel();
    });

    // Handle mouseup on input ports for connection completion
    this.nodesContainer.addEventListener('mouseup', (e) => {
      if (!AppState.connectingFrom) return;

      const inputPort = e.target.closest('.input-port');
      if (inputPort) {
        const node = inputPort.closest('.canvas-node');
        if (node) {
          const nodeId = node.dataset.nodeId;
          if (AppState.connectingFrom.nodeId !== nodeId) {
            const newConnection = {
              id: `conn-${AppState.connectingFrom.nodeId}-${nodeId}-${Date.now()}`,
              source: AppState.connectingFrom.nodeId,
              target: nodeId
            };
            AppState.addConnection(newConnection);
            Connections.render();
            Toast.show('연결이 추가되었습니다', 'success');
          }
        }
        AppState.connectingFrom = null;
        document.getElementById('connectionHint').style.display = 'none';
        e.stopPropagation();
      }
    });

    // Double click to open settings
    this.nodesContainer.addEventListener('dblclick', (e) => {
      const node = e.target.closest('.canvas-node');
      if (node) {
        AppState.selectNode(node.dataset.nodeId);
        this.updateSelection();
        Panels.updateRightPanel();
        Panels.showRightPanelTab('settings');
      }
    });

    // Keyboard events
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (AppState.selectedConnectionId) {
          AppState.removeConnection(AppState.selectedConnectionId);
          Connections.render();
          Toast.show('연결이 삭제되었습니다', 'info');
        } else if (AppState.selectedNodeId) {
          const node = document.getElementById(`node-${AppState.selectedNodeId}`);
          AppState.removeNode(AppState.selectedNodeId);
          if (node) node.remove();
          Connections.render();
          Panels.updateRightPanel();
          Toast.show('노드가 삭제되었습니다', 'info');
        }
      }
    });

    // Zoom controls
    document.getElementById('zoomIn').addEventListener('click', () => {
      AppState.zoomIn();
      this.applyZoom();
    });

    document.getElementById('zoomOut').addEventListener('click', () => {
      AppState.zoomOut();
      this.applyZoom();
    });

    document.getElementById('zoomFit').addEventListener('click', () => {
      AppState.resetZoom();
      this.applyZoom();
    });
  },

  // Update selection visual
  updateSelection() {
    document.querySelectorAll('.canvas-node').forEach(el => {
      el.classList.toggle('selected', el.dataset.nodeId === AppState.selectedNodeId);
    });
  },

  // Apply zoom
  applyZoom() {
    if (this.container) {
      this.container.style.transform = `scale(${AppState.zoom / 100})`;
      this.container.style.transformOrigin = 'top left';
    }
  }
};
