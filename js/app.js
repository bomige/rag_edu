/**
 * app.js - Main Application Initialization
 */

// Toast notifications
const Toast = {
  show(title, type = 'info', description = '') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';

    const iconSvg = this.getIcon(type);

    toast.innerHTML = `
      <div class="toast-icon ${type}">
        ${iconSvg}
      </div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${description ? `<div class="toast-desc">${description}</div>` : ''}
      </div>
      <button class="toast-close">
        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    container.appendChild(toast);

    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
      this.remove(toast);
    });

    // Auto remove
    setTimeout(() => {
      this.remove(toast);
    }, CONFIG.animation.toast);
  },

  remove(toast) {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  },

  getIcon(type) {
    const icons = {
      success: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>`,
      error: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>`,
      info: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>`,
      warning: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>`
    };
    return icons[type] || icons.info;
  }
};

// API Key Modal
const ApiKeyModal = {
  init() {
    this.modal = document.getElementById('apiKeyModal');
    this.input = document.getElementById('apiKeyInput');
    this.status = document.getElementById('apiStatus');
    this.validation = document.getElementById('apiValidation');

    this.bindEvents();
    this.updateStatus();
  },

  bindEvents() {
    // Open modal
    document.getElementById('settingsBtn')?.addEventListener('click', () => this.open());

    // Close modal
    document.getElementById('closeApiKeyModal')?.addEventListener('click', () => this.close());
    document.getElementById('cancelApiKey')?.addEventListener('click', () => this.close());

    // Close on overlay click
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // Save
    document.getElementById('saveApiKey')?.addEventListener('click', () => this.save());

    // Clear
    document.getElementById('clearApiKey')?.addEventListener('click', () => this.clear());

    // Toggle visibility
    document.getElementById('toggleApiKeyVisibility')?.addEventListener('click', () => this.toggleVisibility());

    // Validate on input
    this.input?.addEventListener('input', () => this.validate());
  },

  open() {
    if (this.modal) {
      this.modal.style.display = 'flex';
      this.input.value = AppState.openaiApiKey;
      this.validate();
    }
  },

  close() {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  },

  save() {
    const key = this.input?.value || '';
    AppState.saveApiKey(key);
    this.updateStatus();
    this.close();

    if (key) {
      Toast.show('API 키가 저장되었습니다', 'success', '이제 실제 OpenAI API를 사용하여 파이프라인을 실행합니다.');
    } else {
      Toast.show('API 키가 제거되었습니다', 'info', '테스트 샘플로 실행됩니다.');
    }
  },

  clear() {
    this.input.value = '';
    AppState.saveApiKey('');
    this.updateStatus();
    this.validate();
    Toast.show('API 키가 제거되었습니다', 'info', '테스트 샘플 데이터로 실행됩니다.');
  },

  toggleVisibility() {
    const type = this.input.type === 'password' ? 'text' : 'password';
    this.input.type = type;

    const eyeIcon = document.querySelector('.eye-icon');
    const eyeOffIcon = document.querySelector('.eye-off-icon');
    if (eyeIcon && eyeOffIcon) {
      eyeIcon.style.display = type === 'password' ? 'block' : 'none';
      eyeOffIcon.style.display = type === 'password' ? 'none' : 'block';
    }
  },

  validate() {
    const key = this.input?.value || '';
    const isValid = key.startsWith('sk-') && key.length > 20;

    if (this.validation) {
      if (!key) {
        this.validation.style.display = 'none';
      } else {
        this.validation.style.display = 'flex';
        this.validation.className = `api-validation ${isValid ? 'valid' : 'invalid'}`;
        this.validation.innerHTML = isValid
          ? `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span>유효한 API 키 형식입니다</span>`
          : `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>API 키는 sk-로 시작해야 합니다</span>`;
      }
    }
  },

  updateStatus() {
    if (this.status) {
      const hasKey = !!AppState.openaiApiKey;
      this.status.className = `api-status ${hasKey ? 'has-key' : ''}`;
      this.status.innerHTML = hasKey
        ? `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>API 키가 설정되어 있습니다</span>
          <span class="badge badge-success">실제 API 사용</span>`
        : `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>API 키가 설정되지 않았습니다</span>
          <span class="badge badge-warning">테스트 샘플</span>`;
    }
  }
};

// Project Modal
const ProjectModal = {
  modal: null,
  isOpen: false,

  init() {
    this.createModal();
    this.bindEvents();
  },

  createModal() {
    const modalHtml = `
      <div class="modal-overlay" id="projectModal" style="display: none;">
        <div class="modal" style="max-width: 600px;">
          <div class="modal-header">
            <h3 class="modal-title">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              프로젝트 관리
            </h3>
            <button class="btn-icon" id="closeProjectModal">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="modal-body" style="padding: 1rem;">
            <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
              <button class="btn btn-primary" id="newProjectBtn">
                <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                새 프로젝트
              </button>
              <button class="btn btn-outline" id="clearCanvasBtn">
                <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                캔버스 초기화
              </button>
            </div>

            <div class="project-list" id="projectList" style="max-height: 300px; overflow-y: auto;">
              <div class="loading">프로젝트 목록을 불러오는 중...</div>
            </div>
          </div>

          <div class="modal-footer">
            <div id="serverStatus"></div>
            <button class="btn btn-outline" id="closeProjectModalBtn">닫기</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.modal = document.getElementById('projectModal');
  },

  bindEvents() {
    document.getElementById('closeProjectModal')?.addEventListener('click', () => this.close());
    document.getElementById('closeProjectModalBtn')?.addEventListener('click', () => this.close());

    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    document.getElementById('newProjectBtn')?.addEventListener('click', () => {
      AppState.newProject();
      this.close();
    });

    document.getElementById('clearCanvasBtn')?.addEventListener('click', () => {
      if (confirm('정말 캔버스를 초기화하시겠습니까?')) {
        AppState.clearCanvas();
        this.close();
      }
    });
  },

  async open() {
    if (this.modal) {
      this.modal.style.display = 'flex';
      this.isOpen = true;
      await this.loadProjectList();
      await this.checkServerStatus();
    }
  },

  close() {
    if (this.modal) {
      this.modal.style.display = 'none';
      this.isOpen = false;
    }
  },

  async checkServerStatus() {
    const statusEl = document.getElementById('serverStatus');
    if (!statusEl) return;

    const isConnected = await API.healthCheck();
    statusEl.innerHTML = isConnected
      ? `<span class="badge badge-success">서버 연결됨</span>`
      : `<span class="badge badge-warning">로컬 모드</span>`;
  },

  async loadProjectList() {
    const listEl = document.getElementById('projectList');
    if (!listEl) return;

    listEl.innerHTML = '<div class="loading">프로젝트 목록을 불러오는 중...</div>';

    try {
      const projects = await AppState.getProjectList();

      if (projects.length === 0) {
        listEl.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: var(--muted-foreground);">
            <svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 0.5rem;">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <p>저장된 프로젝트가 없습니다</p>
          </div>
        `;
        return;
      }

      listEl.innerHTML = projects.map(p => `
        <div class="project-item" style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 0.5rem;">
          <div style="flex: 1;">
            <div style="font-weight: 500;">${p.name}</div>
            <div style="font-size: 0.75rem; color: var(--muted-foreground);">
              노드 ${p.node_count}개 · 연결 ${p.connection_count}개
            </div>
          </div>
          <div style="display: flex; gap: 0.25rem;">
            <button class="btn-icon-sm" onclick="ProjectModal.loadProject('${p.id}')" title="불러오기">
              <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
            <button class="btn-icon-sm btn-danger" onclick="ProjectModal.deleteProject('${p.id}')" title="삭제">
              <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      `).join('');
    } catch (error) {
      listEl.innerHTML = `<div style="color: var(--destructive);">프로젝트 목록을 불러올 수 없습니다.</div>`;
    }
  },

  async loadProject(projectId) {
    await AppState.loadProject(projectId);
    this.close();
  },

  async deleteProject(projectId) {
    if (confirm('정말 이 프로젝트를 삭제하시겠습니까?')) {
      await AppState.deleteProject(projectId);
      await this.loadProjectList();
    }
  }
};

// Main App
const App = {
  async init() {
    // Initialize state
    AppState.init();

    // Initialize components
    Palette.init();
    Connections.init();
    Canvas.init();
    Panels.init();
    ApiKeyModal.init();
    ProjectModal.init();

    // Bind global events
    this.bindEvents();

    // Check server connection
    await this.checkServerConnection();

    console.log('RAG Playground initialized');
  },

  bindEvents() {
    // Theme toggle
    document.getElementById('themeToggle')?.addEventListener('click', () => {
      AppState.toggleTheme();
    });

    // Mode tabs
    document.querySelectorAll('.mode-tabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        AppState.setMode(mode);

        // Update active tab
        document.querySelectorAll('.mode-tabs .tab').forEach(t => {
          t.classList.toggle('active', t.dataset.mode === mode);
        });

        if (mode === 'guide') {
          Toast.show('가이드 모드로 전환되었습니다', 'info', '단계별로 학습을 진행하세요.');
        } else if (mode === 'harness') {
          Toast.show('체인 하네스 모드입니다', 'info', '여러 RAG 전략을 비교해보세요.');
        }
      });
    });

    // Run button
    document.getElementById('runBtn')?.addEventListener('click', () => {
      Pipeline.execute();
    });

    // Save button
    document.querySelector('[title="저장"]')?.addEventListener('click', () => {
      AppState.saveProject();
    });

    // Project dropdown
    document.getElementById('projectDropdownBtn')?.addEventListener('click', () => {
      ProjectModal.open();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+Enter: Run pipeline
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        Pipeline.execute();
      }

      // Ctrl+S: Save project
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        AppState.saveProject();
      }

      // Ctrl+N: New project
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        AppState.newProject();
      }

      // Ctrl+O: Open project modal
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        ProjectModal.open();
      }

      // Escape: Close modals
      if (e.key === 'Escape') {
        ApiKeyModal.close();
        ProjectModal.close();
      }
    });
  },

  async checkServerConnection() {
    const isConnected = await API.healthCheck();

    if (isConnected) {
      console.log('Backend server connected');
    } else {
      console.log('Backend server not available, running in local mode');
      Toast.show('로컬 모드로 실행 중', 'warning', '백엔드 서버에 연결할 수 없습니다. python_backend/run.bat을 실행하세요.');
    }
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
