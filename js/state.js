/**
 * state.js - Application State Management
 * 프로젝트 저장/로드/삭제 기능 포함
 */

const AppState = {
  // 프로젝트 정보
  projectId: null,
  projectName: 'Naive RAG 파이프라인',

  // Current mode
  mode: 'free', // 'guide' | 'free' | 'compare' | 'harness'

  // Canvas state
  nodes: [],
  connections: [],
  selectedNodeId: null,
  selectedConnectionId: null,

  // Canvas view
  zoom: 100,
  showMinimap: true,

  // Drag state
  draggingNode: null,
  dragOffset: { x: 0, y: 0 },
  isDragOver: false,

  // Connection state
  connectingFrom: null,
  mousePos: { x: 0, y: 0 },

  // Pipeline state
  isRunning: false,
  executionResult: null,

  // Settings
  openaiApiKey: '',
  chunkSize: CONFIG.defaults.chunkSize,
  chunkOverlap: CONFIG.defaults.chunkOverlap,
  topK: CONFIG.defaults.topK,
  temperature: CONFIG.defaults.temperature,

  // UI state
  bottomPanelCollapsed: true,
  rightPanelTab: 'settings',

  // Initialize state
  init() {
    // Load from localStorage
    this.loadFromStorage();

    // Set default nodes and connections
    this.nodes = JSON.parse(JSON.stringify(DEFAULT_NODES));
    this.connections = JSON.parse(JSON.stringify(DEFAULT_CONNECTIONS));

    // Generate project ID if none
    if (!this.projectId) {
      this.projectId = this.generateProjectId();
    }
  },

  // Generate unique project ID
  generateProjectId() {
    return `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Load settings from localStorage
  loadFromStorage() {
    const savedApiKey = localStorage.getItem('rag_openai_api_key');
    if (savedApiKey) {
      this.openaiApiKey = savedApiKey;
    }

    const savedTheme = localStorage.getItem('rag_theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }

    // Load last project ID
    const lastProjectId = localStorage.getItem('rag_last_project_id');
    if (lastProjectId) {
      this.projectId = lastProjectId;
    }
  },

  // Save API key to localStorage
  saveApiKey(key) {
    this.openaiApiKey = key;
    if (key) {
      localStorage.setItem('rag_openai_api_key', key);
    } else {
      localStorage.removeItem('rag_openai_api_key');
    }
  },

  // Toggle theme
  toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('rag_theme', isDark ? 'dark' : 'light');
    return isDark;
  },

  // ============ Project Management ============

  // Save project to backend
  async saveProject() {
    try {
      const result = await API.saveProject(
        this.projectId,
        this.projectName,
        this.nodes,
        this.connections,
        {
          chunkSize: this.chunkSize,
          chunkOverlap: this.chunkOverlap,
          topK: this.topK,
          temperature: this.temperature,
          mode: this.mode
        }
      );

      localStorage.setItem('rag_last_project_id', this.projectId);
      Toast.show('프로젝트가 저장되었습니다', 'success');
      return result;
    } catch (error) {
      // 서버 연결 실패 시 로컬 저장
      this.saveProjectLocal();
      return { success: true, local: true };
    }
  },

  // Save project to localStorage (fallback)
  saveProjectLocal() {
    const projectData = {
      id: this.projectId,
      name: this.projectName,
      nodes: this.nodes,
      connections: this.connections,
      settings: {
        chunkSize: this.chunkSize,
        chunkOverlap: this.chunkOverlap,
        topK: this.topK,
        temperature: this.temperature,
        mode: this.mode
      },
      savedAt: new Date().toISOString()
    };

    const projects = JSON.parse(localStorage.getItem('rag_projects') || '{}');
    projects[this.projectId] = projectData;
    localStorage.setItem('rag_projects', JSON.stringify(projects));
    localStorage.setItem('rag_last_project_id', this.projectId);

    Toast.show('프로젝트가 로컬에 저장되었습니다', 'success');
  },

  // Load project from backend
  async loadProject(projectId) {
    try {
      const result = await API.loadProject(projectId);

      this.projectId = result.id;
      this.projectName = result.name;
      this.nodes = result.nodes || [];
      this.connections = result.connections || [];

      if (result.settings) {
        this.chunkSize = result.settings.chunkSize || CONFIG.defaults.chunkSize;
        this.chunkOverlap = result.settings.chunkOverlap || CONFIG.defaults.chunkOverlap;
        this.topK = result.settings.topK || CONFIG.defaults.topK;
        this.temperature = result.settings.temperature || CONFIG.defaults.temperature;
        this.mode = result.settings.mode || 'free';
      }

      localStorage.setItem('rag_last_project_id', this.projectId);

      // Re-render canvas
      Canvas.render();
      this.updateProjectName();

      Toast.show('프로젝트를 불러왔습니다', 'success');
      return result;
    } catch (error) {
      // 서버 연결 실패 시 로컬에서 로드
      return this.loadProjectLocal(projectId);
    }
  },

  // Load project from localStorage (fallback)
  loadProjectLocal(projectId) {
    const projects = JSON.parse(localStorage.getItem('rag_projects') || '{}');
    const projectData = projects[projectId];

    if (!projectData) {
      Toast.show('프로젝트를 찾을 수 없습니다', 'error');
      return null;
    }

    this.projectId = projectData.id;
    this.projectName = projectData.name;
    this.nodes = projectData.nodes || [];
    this.connections = projectData.connections || [];

    if (projectData.settings) {
      this.chunkSize = projectData.settings.chunkSize || CONFIG.defaults.chunkSize;
      this.chunkOverlap = projectData.settings.chunkOverlap || CONFIG.defaults.chunkOverlap;
      this.topK = projectData.settings.topK || CONFIG.defaults.topK;
      this.temperature = projectData.settings.temperature || CONFIG.defaults.temperature;
      this.mode = projectData.settings.mode || 'free';
    }

    localStorage.setItem('rag_last_project_id', this.projectId);

    // Re-render canvas
    Canvas.render();
    this.updateProjectName();

    Toast.show('로컬에서 프로젝트를 불러왔습니다', 'success');
    return projectData;
  },

  // Delete project
  async deleteProject(projectId) {
    try {
      await API.deleteProject(projectId);
      Toast.show('프로젝트가 삭제되었습니다', 'info');
    } catch (error) {
      // 로컬에서도 삭제
      this.deleteProjectLocal(projectId);
    }

    // 현재 프로젝트가 삭제된 경우 새 프로젝트 생성
    if (projectId === this.projectId) {
      this.newProject();
    }
  },

  // Delete project from localStorage
  deleteProjectLocal(projectId) {
    const projects = JSON.parse(localStorage.getItem('rag_projects') || '{}');
    delete projects[projectId];
    localStorage.setItem('rag_projects', JSON.stringify(projects));
    Toast.show('프로젝트가 삭제되었습니다', 'info');
  },

  // Create new project
  newProject() {
    this.projectId = this.generateProjectId();
    this.projectName = '새 RAG 파이프라인';
    this.nodes = JSON.parse(JSON.stringify(DEFAULT_NODES));
    this.connections = JSON.parse(JSON.stringify(DEFAULT_CONNECTIONS));
    this.selectedNodeId = null;
    this.selectedConnectionId = null;
    this.executionResult = null;

    Canvas.render();
    this.updateProjectName();
    Panels.updateRightPanel();

    Toast.show('새 프로젝트가 생성되었습니다', 'success');
  },

  // Clear canvas (remove all nodes and connections)
  clearCanvas() {
    this.nodes = [];
    this.connections = [];
    this.selectedNodeId = null;
    this.selectedConnectionId = null;

    Canvas.render();
    Panels.updateRightPanel();

    Toast.show('캔버스가 초기화되었습니다', 'info');
  },

  // Get project list
  async getProjectList() {
    try {
      const result = await API.listProjects();
      return result.projects || [];
    } catch (error) {
      // 로컬 프로젝트 목록 반환
      return this.getLocalProjectList();
    }
  },

  // Get local project list
  getLocalProjectList() {
    const projects = JSON.parse(localStorage.getItem('rag_projects') || '{}');
    return Object.values(projects).map(p => ({
      id: p.id,
      name: p.name,
      node_count: p.nodes?.length || 0,
      connection_count: p.connections?.length || 0,
      savedAt: p.savedAt
    }));
  },

  // Update project name in UI
  updateProjectName() {
    const nameEl = document.querySelector('.project-name');
    if (nameEl) {
      nameEl.innerHTML = `
        ${this.projectName}
        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      `;
    }

    const breadcrumbEl = document.querySelector('.breadcrumb-current');
    if (breadcrumbEl) {
      breadcrumbEl.textContent = this.projectName;
    }
  },

  // ============ Node Operations ============

  addNode(node) {
    this.nodes.push(node);
    this.updateStats();
  },

  removeNode(nodeId) {
    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    this.connections = this.connections.filter(
      c => c.source !== nodeId && c.target !== nodeId
    );
    if (this.selectedNodeId === nodeId) {
      this.selectedNodeId = null;
    }
    this.updateStats();
  },

  updateNodePosition(nodeId, x, y) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.position = { x, y };
    }
  },

  updateNodeStatus(nodeId, status) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.status = status;
    }
  },

  setAllNodesStatus(status) {
    this.nodes.forEach(node => {
      node.status = status;
    });
  },

  selectNode(nodeId) {
    this.selectedNodeId = nodeId;
    this.selectedConnectionId = null;
  },

  getSelectedNode() {
    return this.nodes.find(n => n.id === this.selectedNodeId);
  },

  // ============ Connection Operations ============

  addConnection(connection) {
    // Check if connection already exists
    const exists = this.connections.some(
      c => c.source === connection.source && c.target === connection.target
    );
    if (!exists) {
      this.connections.push(connection);
      this.updateStats();
    }
  },

  removeConnection(connectionId) {
    this.connections = this.connections.filter(c => c.id !== connectionId);
    if (this.selectedConnectionId === connectionId) {
      this.selectedConnectionId = null;
    }
    this.updateStats();
  },

  selectConnection(connectionId) {
    this.selectedConnectionId = connectionId;
    this.selectedNodeId = null;
  },

  // Update stats display
  updateStats() {
    const nodeCountEl = document.getElementById('nodeCount');
    const connectionCountEl = document.getElementById('connectionCount');

    if (nodeCountEl) {
      nodeCountEl.textContent = `노드: ${this.nodes.length}개`;
    }
    if (connectionCountEl) {
      connectionCountEl.textContent = `연결: ${this.connections.length}개`;
    }

    // Show/hide empty state
    const emptyEl = document.getElementById('canvasEmpty');
    if (emptyEl) {
      emptyEl.style.display = this.nodes.length === 0 ? 'flex' : 'none';
    }
  },

  // ============ Mode Operations ============

  setMode(mode) {
    this.mode = mode;
  },

  // ============ Zoom Operations ============

  setZoom(zoom) {
    this.zoom = Math.max(CONFIG.canvas.minZoom, Math.min(CONFIG.canvas.maxZoom, zoom));
    const zoomEl = document.getElementById('zoomLevel');
    if (zoomEl) {
      zoomEl.textContent = `${this.zoom}%`;
    }
  },

  zoomIn() {
    this.setZoom(this.zoom + CONFIG.canvas.zoomStep);
  },

  zoomOut() {
    this.setZoom(this.zoom - CONFIG.canvas.zoomStep);
  },

  resetZoom() {
    this.setZoom(100);
  }
};
