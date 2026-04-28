/**
 * connections.js - Connection Lines Rendering
 */

const Connections = {
  svg: null,

  // Initialize
  init() {
    this.svg = document.getElementById('connectionsSvg');
  },

  // Render all connections
  render() {
    if (!this.svg) return;

    let html = '';

    // Render existing connections
    AppState.connections.forEach(conn => {
      html += this.renderConnection(conn);
    });

    // Render connection being drawn
    if (AppState.connectingFrom) {
      html += this.renderPreviewConnection();
    }

    this.svg.innerHTML = html;

    // Bind click events on connections
    this.bindEvents();
  },

  // Render single connection
  renderConnection(conn) {
    const sourceNode = AppState.nodes.find(n => n.id === conn.source);
    const targetNode = AppState.nodes.find(n => n.id === conn.target);

    if (!sourceNode || !targetNode) return '';

    const sourcePos = NodeUtils.getPortPosition(sourceNode, 'output');
    const targetPos = NodeUtils.getPortPosition(targetNode, 'input');

    const midX = (sourcePos.x + targetPos.x) / 2;
    const path = `M ${sourcePos.x} ${sourcePos.y} C ${midX} ${sourcePos.y}, ${midX} ${targetPos.y}, ${targetPos.x} ${targetPos.y}`;

    const isSelected = AppState.selectedConnectionId === conn.id;
    const isRunning = sourceNode.status === 'running';
    const isCompleted = sourceNode.status === 'completed';

    let strokeColor = 'var(--border)';
    if (isSelected) strokeColor = 'var(--destructive)';
    else if (isCompleted) strokeColor = 'var(--primary)';

    let deleteButton = '';
    if (isSelected) {
      const midY = (sourcePos.y + targetPos.y) / 2;
      deleteButton = `
        <circle cx="${midX}" cy="${midY}" r="10" fill="var(--destructive)" class="connection-delete" data-conn-id="${conn.id}"/>
        <text x="${midX}" y="${midY + 1}" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="14" font-weight="bold" class="connection-delete" data-conn-id="${conn.id}">×</text>
      `;
    }

    let animatedPath = '';
    if (isRunning) {
      animatedPath = `
        <path d="${path}" fill="none" stroke="var(--primary)" stroke-width="2"
              stroke-dasharray="8 8" class="connection-animated"/>
      `;
    }

    return `
      <g class="connection-group" data-conn-id="${conn.id}">
        <!-- Invisible wider path for easier clicking -->
        <path d="${path}" fill="none" stroke="transparent" stroke-width="20" class="connection-hitarea"/>
        <!-- Visible path -->
        <path d="${path}" fill="none" stroke="${strokeColor}" stroke-width="${isSelected ? 3 : 2}" class="connection-path"/>
        ${animatedPath}
        ${deleteButton}
      </g>
    `;
  },

  // Render connection being drawn
  renderPreviewConnection() {
    const sourceNode = AppState.nodes.find(n => n.id === AppState.connectingFrom.nodeId);
    if (!sourceNode) return '';

    const sourcePos = NodeUtils.getPortPosition(sourceNode, 'output');
    const midX = (sourcePos.x + AppState.mousePos.x) / 2;

    const path = `M ${sourcePos.x} ${sourcePos.y} C ${midX} ${sourcePos.y}, ${midX} ${AppState.mousePos.y}, ${AppState.mousePos.x} ${AppState.mousePos.y}`;

    return `
      <path d="${path}" fill="none" stroke="var(--primary)" stroke-width="2"
            stroke-dasharray="5 5" class="connection-preview" pointer-events="none"/>
    `;
  },

  // Bind events
  bindEvents() {
    if (!this.svg) return;

    // Connection click
    this.svg.querySelectorAll('.connection-group').forEach(group => {
      group.addEventListener('click', (e) => {
        e.stopPropagation();
        const connId = group.dataset.connId;

        // Delete button click
        if (e.target.classList.contains('connection-delete')) {
          AppState.removeConnection(connId);
          this.render();
          Toast.show('연결이 삭제되었습니다', 'info');
          return;
        }

        // Select connection
        AppState.selectConnection(connId);
        AppState.selectNode(null);
        Canvas.updateSelection();
        this.render();
        Panels.updateRightPanel();
      });
    });
  }
};
