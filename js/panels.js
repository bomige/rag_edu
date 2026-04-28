/**
 * panels.js - Panel Logic (Right Panel, Bottom Panel)
 */

const Panels = {
  // Initialize panels
  init() {
    this.bindBottomPanelEvents();
    this.bindRightPanelEvents();
    this.initBottomPanelResize();
    this.initRightPanelResize();
  },

  // === Bottom Panel ===

  bindBottomPanelEvents() {
    const header = document.getElementById('bottomPanelHeader');
    const panel = document.getElementById('bottomPanel');
    const toggleBtn = document.getElementById('toggleBottomPanel');

    if (header && panel) {
      // 헤더 클릭 시 토글 (리사이즈 핸들 제외)
      header.addEventListener('click', (e) => {
        if (!e.target.closest('.bottom-panel-resize')) {
          this.toggleBottomPanel();
        }
      });
    }

    // Start collapsed
    panel?.classList.add('collapsed');
  },

  // Bottom Panel Resize
  initBottomPanelResize() {
    const panel = document.getElementById('bottomPanel');
    if (!panel) return;

    // 리사이즈 핸들 추가
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'bottom-panel-resize';
    panel.insertBefore(resizeHandle, panel.firstChild);

    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    resizeHandle.addEventListener('mousedown', (e) => {
      if (panel.classList.contains('collapsed')) return;

      isResizing = true;
      startY = e.clientY;
      startHeight = panel.offsetHeight;
      resizeHandle.classList.add('active');
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;

      const deltaY = startY - e.clientY;
      const newHeight = Math.max(100, Math.min(window.innerHeight * 0.7, startHeight + deltaY));
      panel.style.height = `${newHeight}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        resizeHandle.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  },

  toggleBottomPanel() {
    const panel = document.getElementById('bottomPanel');
    if (panel) {
      AppState.bottomPanelCollapsed = !AppState.bottomPanelCollapsed;
      panel.classList.toggle('collapsed', AppState.bottomPanelCollapsed);
    }
  },

  showBottomPanelResult(result) {
    const panel = document.getElementById('bottomPanel');
    const content = document.getElementById('bottomPanelContent');
    const status = document.getElementById('bottomPanelStatus');

    if (panel && AppState.bottomPanelCollapsed) {
      panel.classList.remove('collapsed');
      AppState.bottomPanelCollapsed = false;
    }

    if (status) {
      status.style.display = 'flex';
    }

    if (content) {
      content.innerHTML = this.renderResultViewer(result);
    }
  },

  renderResultViewer(result) {
    if (!result) {
      return `
        <div class="result-viewer">
          <div class="result-empty">
            <svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/>
            </svg>
            <p class="empty-title">아직 실행 결과가 없습니다</p>
            <p class="empty-desc">상단의 Run 버튼을 클릭하여 파이프라인을 실행하세요</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="result-viewer">
        <div class="result-timeline">
          <div class="timeline-header">
            <span class="timeline-title">실행 타임라인</span>
            <span class="badge badge-warning">테스트 샘플</span>
          </div>
          ${result.logs.map(log => `
            <div class="timeline-item ${log.status}">
              <div class="timeline-step">
                ${this.getStatusIcon(log.status)}
                <span>${log.step}</span>
              </div>
              ${log.duration ? `<span class="timeline-duration">${log.duration}ms</span>` : ''}
            </div>
          `).join('')}
        </div>
        <div class="result-content">
          <div class="result-header">
            <div class="result-title">
              <span>Generation 결과</span>
              <span class="badge badge-warning">테스트 샘플</span>
            </div>
          </div>

          <div class="result-metrics">
            <div class="metric-card">
              <div class="metric-label">
                <svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                실행 시간
              </div>
              <div class="metric-value">${result.totalTime.toFixed(1)}s</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">
                <svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 3L14 9L20 9L15 13L17 20L12 16L7 20L9 13L4 9L10 9Z"/>
                </svg>
                토큰 사용
              </div>
              <div class="metric-value">${result.tokenCount.toLocaleString()}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">
                <svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                예상 비용
              </div>
              <div class="metric-value">$${result.estimatedCost}</div>
            </div>
          </div>

          <div class="result-section">
            <div class="query-box">
              <div class="query-label">질문</div>
              <div class="query-text">${result.query}</div>
            </div>
          </div>

          <div class="result-section">
            <div class="answer-box">
              <div class="answer-label">
                생성된 답변
                <span class="badge badge-warning">테스트 샘플 응답</span>
              </div>
              <div class="answer-text">${result.generatedAnswer}</div>
            </div>
          </div>

          <div class="result-section">
            <div class="result-section-title">검색된 청크 (${result.retrievedChunks.length}개)</div>
            ${result.retrievedChunks.map(chunk => `
              <div class="chunk-item">
                <div class="chunk-header">
                  <span class="badge">청크 ${chunk.chunkId + 1}</span>
                  <div class="chunk-score">
                    <div class="progress-bar" style="width: 64px;">
                      <div class="progress-fill" style="width: ${chunk.score * 100}%"></div>
                    </div>
                    <span class="font-mono text-muted">${chunk.score.toFixed(2)}</span>
                  </div>
                </div>
                <p class="chunk-text">${chunk.text}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  getStatusIcon(status) {
    const icons = {
      success: `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>`,
      error: `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>`,
      info: `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>`
    };
    return icons[status] || icons.info;
  },

  // === Right Panel ===

  // Right Panel Resize
  initRightPanelResize() {
    const panel = document.querySelector('.right-panel');
    if (!panel) return;

    // 리사이즈 핸들 추가
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'right-panel-resize';
    panel.insertBefore(resizeHandle, panel.firstChild);

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = panel.offsetWidth;
      resizeHandle.classList.add('active');
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;

      const deltaX = startX - e.clientX;
      const newWidth = Math.max(280, Math.min(600, startWidth + deltaX));
      panel.style.width = `${newWidth}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        resizeHandle.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  },

  bindRightPanelEvents() {
    const tabs = document.querySelectorAll('.right-panel-tabs .tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        this.showRightPanelTab(tabName);
      });
    });
  },

  showRightPanelTab(tabName) {
    AppState.rightPanelTab = tabName;

    // Update tab active state
    document.querySelectorAll('.right-panel-tabs .tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    this.updateRightPanel();
  },

  updateRightPanel() {
    const content = document.getElementById('rightPanelContent');
    if (!content) return;

    const selectedNode = AppState.getSelectedNode();

    switch (AppState.rightPanelTab) {
      case 'settings':
        content.innerHTML = selectedNode
          ? this.renderNodeSettings(selectedNode)
          : this.renderNoSelection();
        if (selectedNode) this.bindNodeSettingsEvents(selectedNode);
        break;

      case 'result':
        content.innerHTML = this.renderResultTab();
        break;

      case 'logs':
        content.innerHTML = this.renderLogsTab();
        break;

      case 'tip':
        content.innerHTML = this.renderTipTab(selectedNode);
        break;

      default:
        content.innerHTML = this.renderNoSelection();
    }
  },

  renderNoSelection() {
    return `
      <div class="settings-content">
        <div class="no-selection">
          <div class="no-selection-icon">
            <svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </div>
          <p class="no-selection-title">노드를 선택하세요</p>
          <p class="no-selection-desc">캔버스에서 노드를 클릭하거나 더블클릭하여 설정을 확인합니다</p>
        </div>
      </div>
    `;
  },

  renderNodeSettings(node) {
    let settingsContent = '';

    switch (node.category) {
      case 'data':
        settingsContent = this.renderDataSettings(node);
        break;
      case 'chunking':
        settingsContent = this.renderChunkingSettings(node);
        break;
      case 'retriever':
        settingsContent = this.renderRetrieverSettings(node);
        break;
      case 'llm':
        settingsContent = this.renderLLMSettings(node);
        break;
      case 'prompt':
        settingsContent = this.renderPromptSettings(node);
        break;
      default:
        settingsContent = this.renderDefaultSettings(node);
    }

    return `
      <div class="node-settings" style="display: block;">
        <div class="node-settings-header">
          <div class="node-settings-info">
            <h3>${node.name}</h3>
            <p>${node.description || 'Configure this node'}</p>
          </div>
          <div class="node-settings-actions">
            <button class="btn-icon-sm" title="복사">
              <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            <button class="btn-icon-sm btn-danger" title="삭제">
              <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
        ${settingsContent}
      </div>
    `;
  },

  renderChunkingSettings(node) {
    const chunkSize = node.params?.chunkSize || AppState.chunkSize;
    const chunkOverlap = node.params?.chunkOverlap || AppState.chunkOverlap;

    return `
      <div class="form-group">
        <div class="slider-header">
          <label>chunk_size</label>
          <span class="slider-value" id="chunkSizeValue">${chunkSize}</span>
        </div>
        <input type="range" class="slider" id="chunkSizeSlider" min="100" max="2000" step="50" value="${chunkSize}">
        <p class="form-hint">각 청크의 최대 문자 수 (100-2000)</p>
      </div>

      <div class="form-group">
        <div class="slider-header">
          <label>chunk_overlap</label>
          <span class="slider-value" id="chunkOverlapValue">${chunkOverlap}</span>
        </div>
        <input type="range" class="slider" id="chunkOverlapSlider" min="0" max="500" step="10" value="${chunkOverlap}">
        <p class="form-hint">청크 간 겹치는 문자 수 (0-500)</p>
      </div>

      <div class="form-group">
        <label>separator</label>
        <select class="select" id="separatorSelect">
          <option value="newline">Newline (\\n)</option>
          <option value="paragraph">Paragraph (\\n\\n)</option>
          <option value="sentence">Sentence (. )</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div class="chunk-preview">
        <div class="chunk-preview-header">
          <label>청크 미리보기</label>
          <span class="badge badge-warning">테스트 샘플</span>
        </div>
        <div class="chunk-preview-content" id="chunkPreview">
          ${this.renderChunkPreview(chunkSize, chunkOverlap)}
        </div>
      </div>
    `;
  },

  renderChunkPreview(chunkSize, chunkOverlap) {
    const totalChars = 1500;
    const numChunks = Math.ceil(totalChars / (chunkSize - chunkOverlap + 1));

    return `
      <div class="chunk-tags">
        ${Array.from({ length: numChunks }, (_, i) => {
          const size = Math.min(chunkSize, totalChars - i * (chunkSize - chunkOverlap));
          return `<span class="chunk-tag">청크 ${i + 1} (${size}자)</span>`;
        }).join('')}
      </div>
      <div class="chunk-visual">
        ${Array.from({ length: Math.min(5, numChunks) }, (_, i) => `
          <div class="chunk-block" style="width: 40px;"></div>
          ${i < numChunks - 1 ? `<div class="chunk-overlap" style="width: ${Math.max(4, chunkOverlap / 20)}px;"></div>` : ''}
        `).join('')}
      </div>
      <p class="chunk-preview-hint">오버랩 영역이 하이라이트됩니다 (현재 ${chunkOverlap}자)</p>
    `;
  },

  renderRetrieverSettings(node) {
    const topK = node.params?.topK || AppState.topK;

    return `
      <div class="form-group">
        <div class="slider-header">
          <label>top_k</label>
          <span class="slider-value" id="topKValue">${topK}</span>
        </div>
        <input type="range" class="slider" id="topKSlider" min="1" max="10" step="1" value="${topK}">
      </div>

      <div class="form-group">
        <label>검색 방식</label>
        <select class="select" id="searchMethodSelect">
          <option value="similarity">Similarity Search</option>
          <option value="mmr">MMR (Maximum Marginal Relevance)</option>
          <option value="hybrid">Hybrid (BM25 + Dense)</option>
        </select>
      </div>

      <div class="form-group">
        <div class="slider-header">
          <label>MMR lambda</label>
          <span class="slider-value">0.5</span>
        </div>
        <input type="range" class="slider" min="0" max="100" step="5" value="50">
        <p class="form-hint">다양성 vs 관련성 (0: 다양성, 1: 관련성)</p>
      </div>
    `;
  },

  renderLLMSettings(node) {
    const temperature = node.params?.temperature || AppState.temperature;

    return `
      <div class="form-group">
        <label>모델</label>
        <select class="select" id="modelSelect">
          <option value="gpt-4o" ${node.type === 'gpt-4o' ? 'selected' : ''}>GPT-4o</option>
          <option value="gpt-4o-mini">GPT-4o-mini</option>
          <option value="claude-3.5" ${node.type === 'claude' ? 'selected' : ''}>Claude 3.5 Sonnet</option>
          <option value="gemini-pro" ${node.type === 'gemini' ? 'selected' : ''}>Gemini Pro</option>
        </select>
      </div>

      <div class="form-group">
        <div class="slider-header">
          <label>Temperature</label>
          <span class="slider-value" id="temperatureValue">${temperature}</span>
        </div>
        <input type="range" class="slider" id="temperatureSlider" min="0" max="100" step="5" value="${temperature * 100}">
      </div>

      <div class="form-group">
        <div class="slider-header">
          <label>Max Tokens</label>
          <span class="slider-value">1024</span>
        </div>
        <input type="range" class="slider" min="256" max="4096" step="128" value="1024">
      </div>
    `;
  },

  renderPromptSettings(node) {
    return `
      <div class="form-group">
        <div class="slider-header">
          <label>프롬프트 템플릿</label>
          <span class="badge">토큰: 245</span>
        </div>
        <textarea class="textarea" placeholder="You are a helpful assistant...">다음 컨텍스트를 기반으로 질문에 답변하세요.

컨텍스트:
{context}

질문: {question}

답변:</textarea>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
          <span class="badge badge-outline">{context}</span>
          <span class="badge badge-outline">{question}</span>
          <span class="badge badge-outline">{history}</span>
        </div>
      </div>
    `;
  },

  renderDefaultSettings(node) {
    return `
      <div class="form-group">
        <label>노드 이름</label>
        <input type="text" class="input" value="${node.name}">
      </div>
      <div class="form-group">
        <label>설명</label>
        <textarea class="textarea" placeholder="이 노드의 역할을 설명하세요..." style="min-height: 100px;">${node.description || ''}</textarea>
      </div>
    `;
  },

  renderDataSettings(node) {
    if (node.type === 'pdf-loader') {
      // 이미 업로드된 파일이 있는지 확인
      const hasFile = node.params?.file && node.params?.fileName;
      const uploadContentStyle = hasFile ? 'display: none;' : '';
      const fileInfoStyle = hasFile ? 'display: flex;' : 'display: none;';

      return `
        <div class="form-group">
          <label>PDF 파일 업로드</label>
          <div class="file-upload-area" id="pdfUploadArea">
            <input type="file" id="pdfFileInput" accept=".pdf" style="display: none;">
            <div class="file-upload-content" id="pdfUploadContent" style="${uploadContentStyle}">
              <svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              <p class="file-upload-text">PDF 파일을 드래그하거나 클릭하여 선택</p>
              <p class="file-upload-hint">최대 10MB</p>
            </div>
          </div>
          <div id="pdfFileInfo" class="file-info" style="${fileInfoStyle}">
            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span id="pdfFileName">${hasFile ? node.params.fileName : ''}</span>
            <button class="btn-icon-sm" id="pdfRemoveBtn" title="제거">
              <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="form-group">
          <label>로더 옵션</label>
          <select class="select" id="pdfLoaderType">
            <option value="pypdf">PyPDF (기본)</option>
            <option value="pymupdf">PyMuPDF (빠른 처리)</option>
          </select>
          <p class="form-hint">PDF 파싱 라이브러리 선택</p>
        </div>
      `;
    } else if (node.type === 'web-loader') {
      return `
        <div class="form-group">
          <label>웹 페이지 URL</label>
          <input type="url" class="input" id="webUrlInput" placeholder="https://example.com" value="${node.params?.url || ''}">
          <p class="form-hint">스크래핑할 웹 페이지 주소</p>
        </div>
        <div class="form-group">
          <label>파싱 클래스 (선택)</label>
          <input type="text" class="input" id="webParseClass" placeholder="article, main, .content" value="${node.params?.parseClass || ''}">
          <p class="form-hint">특정 HTML 요소만 추출 (CSS 선택자)</p>
        </div>
        <button class="btn btn-primary" id="webLoadBtn" style="width: 100%;">
          <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/>
          </svg>
          웹 페이지 로드
        </button>
      `;
    } else if (node.type === 'text-input') {
      return `
        <div class="form-group">
          <label>텍스트 입력</label>
          <textarea class="textarea" id="textInputArea" placeholder="분석할 텍스트를 직접 입력하세요..." style="min-height: 200px;">${node.params?.text || ''}</textarea>
          <p class="form-hint">직접 텍스트를 입력하거나 붙여넣기</p>
        </div>
        <div class="form-group">
          <button class="btn btn-outline" id="loadSampleBtn" style="width: 100%;">
            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            샘플 텍스트 불러오기
          </button>
        </div>
      `;
    }
    return this.renderDefaultSettings(node);
  },

  bindNodeSettingsEvents(node) {
    // Data settings events
    this.bindDataSettingsEvents(node);

    // Chunk size slider
    const chunkSizeSlider = document.getElementById('chunkSizeSlider');
    const chunkSizeValue = document.getElementById('chunkSizeValue');
    if (chunkSizeSlider && chunkSizeValue) {
      chunkSizeSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        chunkSizeValue.textContent = value;
        node.params.chunkSize = value;
        AppState.chunkSize = value;
        NodeUtils.updateNodeElement(node.id);

        const preview = document.getElementById('chunkPreview');
        if (preview) {
          preview.innerHTML = this.renderChunkPreview(value, node.params.chunkOverlap || AppState.chunkOverlap);
        }
      });
    }

    // Chunk overlap slider
    const chunkOverlapSlider = document.getElementById('chunkOverlapSlider');
    const chunkOverlapValue = document.getElementById('chunkOverlapValue');
    if (chunkOverlapSlider && chunkOverlapValue) {
      chunkOverlapSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        chunkOverlapValue.textContent = value;
        node.params.chunkOverlap = value;
        AppState.chunkOverlap = value;
        NodeUtils.updateNodeElement(node.id);

        const preview = document.getElementById('chunkPreview');
        if (preview) {
          preview.innerHTML = this.renderChunkPreview(node.params.chunkSize || AppState.chunkSize, value);
        }
      });
    }

    // Top K slider
    const topKSlider = document.getElementById('topKSlider');
    const topKValue = document.getElementById('topKValue');
    if (topKSlider && topKValue) {
      topKSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        topKValue.textContent = value;
        node.params.topK = value;
        AppState.topK = value;
        NodeUtils.updateNodeElement(node.id);
      });
    }

    // Temperature slider
    const temperatureSlider = document.getElementById('temperatureSlider');
    const temperatureValue = document.getElementById('temperatureValue');
    if (temperatureSlider && temperatureValue) {
      temperatureSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value) / 100;
        temperatureValue.textContent = value.toFixed(1);
        node.params.temperature = value;
        AppState.temperature = value;
        NodeUtils.updateNodeElement(node.id);
      });
    }
  },

  bindDataSettingsEvents(node) {
    if (node.category !== 'data') return;

    // PDF Loader events
    if (node.type === 'pdf-loader') {
      const uploadArea = document.getElementById('pdfUploadArea');
      const fileInput = document.getElementById('pdfFileInput');
      const fileInfo = document.getElementById('pdfFileInfo');
      const fileName = document.getElementById('pdfFileName');
      const removeBtn = document.getElementById('pdfRemoveBtn');
      const uploadContent = document.getElementById('pdfUploadContent');

      if (uploadArea && fileInput) {
        // Click to upload
        uploadArea.addEventListener('click', () => fileInput.click());

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
          e.preventDefault();
          uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
          uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
          e.preventDefault();
          uploadArea.classList.remove('drag-over');
          const file = e.dataTransfer.files[0];
          if (file && file.type === 'application/pdf') {
            this.handlePdfFile(node, file, fileInfo, fileName, uploadContent);
          } else {
            Toast.show('PDF 파일만 업로드 가능합니다', 'error');
          }
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            this.handlePdfFile(node, file, fileInfo, fileName, uploadContent);
          }
        });

        // Remove file
        if (removeBtn) {
          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            node.params.file = null;
            node.params.fileName = null;
            fileInfo.style.display = 'none';
            uploadContent.style.display = 'flex';
            Toast.show('파일이 제거되었습니다', 'info');
          });
        }
      }
    }

    // Web Loader events
    if (node.type === 'web-loader') {
      const urlInput = document.getElementById('webUrlInput');
      const parseClassInput = document.getElementById('webParseClass');
      const loadBtn = document.getElementById('webLoadBtn');

      if (urlInput) {
        urlInput.addEventListener('change', (e) => {
          node.params = node.params || {};
          node.params.url = e.target.value;
        });
      }

      if (parseClassInput) {
        parseClassInput.addEventListener('change', (e) => {
          node.params = node.params || {};
          node.params.parseClass = e.target.value;
        });
      }

      if (loadBtn) {
        loadBtn.addEventListener('click', async () => {
          const url = urlInput?.value;
          if (!url) {
            Toast.show('URL을 입력하세요', 'error');
            return;
          }
          loadBtn.disabled = true;
          loadBtn.innerHTML = '로딩 중...';
          try {
            const result = await API.loadWeb(url, parseClassInput?.value || null);
            node.params.loadedText = result.text;
            node.params.metadata = result.metadata;
            Toast.show(`웹 페이지 로드 완료 (${result.metadata?.char_count || 0}자)`, 'success');
          } catch (error) {
            Toast.show('웹 페이지 로드 실패: ' + error.message, 'error');
          } finally {
            loadBtn.disabled = false;
            loadBtn.innerHTML = `
              <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/>
              </svg>
              웹 페이지 로드
            `;
          }
        });
      }
    }

    // Text Input events
    if (node.type === 'text-input') {
      const textArea = document.getElementById('textInputArea');
      const loadSampleBtn = document.getElementById('loadSampleBtn');

      if (textArea) {
        textArea.addEventListener('input', (e) => {
          node.params = node.params || {};
          node.params.text = e.target.value;
        });
      }

      if (loadSampleBtn) {
        loadSampleBtn.addEventListener('click', () => {
          if (textArea) {
            textArea.value = SAMPLE_DOCUMENT;
            node.params = node.params || {};
            node.params.text = SAMPLE_DOCUMENT;
            Toast.show('샘플 텍스트가 로드되었습니다', 'success');
          }
        });
      }
    }
  },

  handlePdfFile(node, file, fileInfo, fileName, uploadContent) {
    if (file.size > 10 * 1024 * 1024) {
      Toast.show('파일 크기는 10MB 이하여야 합니다', 'error');
      return;
    }

    // 디버깅: 파일 저장 확인
    console.log('=== PDF File Upload ===');
    console.log('Node ID:', node.id);
    console.log('File:', file);
    console.log('File name:', file.name);
    console.log('File size:', file.size);

    node.params = node.params || {};
    node.params.file = file;
    node.params.fileName = file.name;

    console.log('Node params after save:', node.params);
    console.log('Stored file:', node.params.file);

    if (fileInfo && fileName && uploadContent) {
      fileName.textContent = file.name;
      fileInfo.style.display = 'flex';
      uploadContent.style.display = 'none';
    }

    Toast.show(`"${file.name}" 파일이 선택되었습니다`, 'success');
  },

  renderResultTab() {
    // 먼저 선택된 노드의 lastResult 확인
    const selectedNode = AppState.getSelectedNode();
    if (selectedNode && selectedNode.lastResult) {
      // NodeRunner의 렌더링 함수를 사용하여 결과 표시
      if (typeof NodeRunner !== 'undefined' && NodeRunner.renderNodePreview) {
        return NodeRunner.renderNodePreview(selectedNode, selectedNode.lastResult);
      }
    }

    // 전체 파이프라인 실행 결과 확인
    if (!AppState.executionResult) {
      return `
        <div class="no-selection">
          <div class="no-selection-icon">
            <svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/>
            </svg>
          </div>
          <p class="no-selection-title">실행 결과 없음</p>
          <p class="no-selection-desc">노드의 ▶ 버튼을 클릭하여 실행하거나, 상단 Run 버튼으로 전체 파이프라인을 실행하세요</p>
        </div>
      `;
    }

    const result = AppState.executionResult;
    return `
      <div style="margin-bottom: 1rem;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <h4 style="font-weight: 500;">실행 결과</h4>
          <span class="badge badge-warning">테스트 샘플</span>
        </div>
      </div>

      <div class="result-metrics">
        <div class="metric-card">
          <div class="metric-label">실행 시간</div>
          <div class="metric-value">${result.totalTime.toFixed(1)}s</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">토큰 사용</div>
          <div class="metric-value">${result.tokenCount.toLocaleString()}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">예상 비용</div>
          <div class="metric-value">$${result.estimatedCost}</div>
        </div>
      </div>

      <div class="result-section">
        <div class="result-section-title">검색된 청크 (${result.retrievedChunks.length}개)</div>
        ${result.retrievedChunks.map(chunk => `
          <div class="chunk-item">
            <div class="chunk-header">
              <span class="badge">청크 ${chunk.chunkId + 1}</span>
              <div class="chunk-score">
                <div class="progress-bar" style="width: 64px;">
                  <div class="progress-fill" style="width: ${chunk.score * 100}%"></div>
                </div>
                <span class="font-mono text-muted">${chunk.score.toFixed(2)}</span>
              </div>
            </div>
            <p class="chunk-text">${chunk.text}</p>
          </div>
        `).join('')}
      </div>

      <div class="result-section">
        <div class="answer-box">
          <div class="answer-label">
            생성된 답변
            <span class="badge badge-warning">테스트 샘플</span>
          </div>
          <div class="answer-text">${result.generatedAnswer}</div>
        </div>
      </div>
    `;
  },

  renderLogsTab() {
    if (!AppState.executionResult) {
      return `
        <div class="no-selection">
          <div class="no-selection-icon">
            <svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <p class="no-selection-title">로그 없음</p>
          <p class="no-selection-desc">실행 로그가 여기에 표시됩니다</p>
        </div>
      `;
    }

    return `
      <div style="margin-bottom: 0.75rem;">
        <span class="badge badge-warning">테스트 샘플 로그</span>
      </div>
      ${AppState.executionResult.logs.map(log => `
        <div style="display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.75rem; font-family: var(--font-mono); margin-bottom: 0.25rem;">
          <span class="text-muted">[${log.timestamp}]</span>
          ${this.getStatusIcon(log.status)}
          <span>${log.message}</span>
        </div>
      `).join('')}
    `;
  },

  renderTipTab(selectedNode) {
    const category = selectedNode?.category;

    let tipTitle = 'RAG 파이프라인 팁';
    let tipText = '노드를 선택하면 해당 노드에 대한 상세한 팁을 확인할 수 있습니다. Run 버튼을 클릭하여 파이프라인을 실행해보세요!';

    if (category === 'chunking') {
      tipTitle = '청킹 최적화 팁';
      tipText = 'chunk_size가 너무 작으면 컨텍스트가 부족해지고, 너무 크면 노이즈가 증가합니다. 일반적으로 500-1000자가 적당합니다.';
    } else if (category === 'retriever') {
      tipTitle = '검색 최적화 팁';
      tipText = 'top_k 값이 높을수록 더 많은 컨텍스트를 제공하지만, 비용과 노이즈도 증가합니다. MMR을 사용하면 다양성을 확보할 수 있습니다.';
    } else if (category === 'llm') {
      tipTitle = 'LLM 파라미터 팁';
      tipText = 'temperature가 낮을수록 일관된 응답을 생성하고, 높을수록 창의적인 응답을 생성합니다. RAG에서는 보통 0.3-0.7을 권장합니다.';
    }

    return `
      <div class="tip-box">
        <div class="tip-header">
          <svg class="icon tip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
          </svg>
          <div>
            <div class="tip-title">${tipTitle}</div>
            <p class="tip-text">${tipText}</p>
          </div>
        </div>
      </div>

      <div class="concepts-section">
        <h4 class="concepts-title">주요 개념</h4>
        <div class="concept-item">
          <span class="concept-term">RAG</span>
          <span class="concept-desc">- Retrieval-Augmented Generation - 검색 기반 생성</span>
        </div>
        <div class="concept-item">
          <span class="concept-term">Chunking</span>
          <span class="concept-desc">- 문서를 작은 조각으로 분할하는 과정</span>
        </div>
        <div class="concept-item">
          <span class="concept-term">Embedding</span>
          <span class="concept-desc">- 텍스트를 벡터로 변환하는 과정</span>
        </div>
        <div class="concept-item">
          <span class="concept-term">top_k</span>
          <span class="concept-desc">- 검색할 상위 문서 개수</span>
        </div>
        <div class="concept-item">
          <span class="concept-term">Temperature</span>
          <span class="concept-desc">- LLM 응답의 랜덤성 조절 파라미터</span>
        </div>
      </div>

      <div class="test-notice">
        <span class="badge badge-warning" style="margin-bottom: 0.5rem;">테스트 샘플</span>
        <p>현재 테스트 샘플 데이터로 실행 중입니다. 설정에서 OpenAI API 키를 입력하면 실제 API를 사용하여 파이프라인을 실행할 수 있습니다.</p>
      </div>
    `;
  }
};
