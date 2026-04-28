/**
 * api.js - Backend API Client
 * Python 백엔드와 통신하는 API 클라이언트
 */

const API = {
  baseUrl: 'http://localhost:8523/api',

  // ============ Helper Methods ============

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'API 요청 실패');
      }

      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  },

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  async uploadFile(endpoint, file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || '파일 업로드 실패');
    }
    return data;
  },

  // ============ Data Loading ============

  async loadText(text, metadata = {}) {
    return this.post('/load/text', { text, metadata });
  },

  async loadWeb(url, parseClass = null) {
    return this.post('/load/web', { url, parse_class: parseClass });
  },

  async loadPdf(file) {
    return this.uploadFile('/load/pdf', file);
  },

  async loadSample(sampleName) {
    return this.get(`/load/sample/${sampleName}`);
  },

  async listSamples() {
    return this.get('/samples');
  },

  // ============ Chunking ============

  async chunk(text, options = {}) {
    return this.post('/chunk', {
      text,
      chunk_size: options.chunkSize || 500,
      chunk_overlap: options.chunkOverlap || 50,
      method: options.method || 'recursive',
      separators: options.separators || null
    });
  },

  async previewChunks(text, options = {}) {
    return this.post('/chunk/preview', {
      text,
      chunk_size: options.chunkSize || 500,
      chunk_overlap: options.chunkOverlap || 50
    });
  },

  // ============ Embedding ============

  async embed(texts, options = {}) {
    return this.post('/embed', {
      texts,
      model: options.model || 'openai',
      api_key: options.apiKey || AppState.openaiApiKey || null
    });
  },

  // ============ Retrieval ============

  async retrieve(query, options = {}) {
    return this.post('/retrieve', {
      query,
      top_k: options.topK || 3,
      method: options.method || 'similarity',
      api_key: options.apiKey || AppState.openaiApiKey || null
    });
  },

  // ============ Generation ============

  async generate(query, context, options = {}) {
    return this.post('/generate', {
      query,
      context,
      model: options.model || 'gpt-4o',
      temperature: options.temperature || 0.7,
      prompt_template: options.promptTemplate || null,
      api_key: options.apiKey || AppState.openaiApiKey || null
    });
  },

  async listPrompts() {
    return this.get('/prompts');
  },

  // ============ Evaluation ============

  async evaluate(query, answer, contexts, groundTruth = null) {
    return this.post('/evaluate', {
      query,
      answer,
      contexts,
      ground_truth: groundTruth,
      api_key: AppState.openaiApiKey || null
    });
  },

  // ============ Pipeline ============

  async runPipeline(options = {}) {
    return this.post('/pipeline/run', {
      query: options.query || 'RAG란 무엇인가요?',
      text: options.text || null,
      chunk_size: options.chunkSize || AppState.chunkSize,
      chunk_overlap: options.chunkOverlap || AppState.chunkOverlap,
      chunk_method: options.chunkMethod || 'recursive',
      embedding_model: options.embeddingModel || 'openai',
      retriever_method: options.retrieverMethod || 'similarity',
      top_k: options.topK || AppState.topK,
      llm_model: options.llmModel || 'gpt-4o',
      temperature: options.temperature || AppState.temperature,
      api_key: options.apiKey || AppState.openaiApiKey || null
    });
  },

  // ============ Project Management ============

  async saveProject(projectId, name, nodes, connections, settings = {}) {
    return this.post('/project/save', {
      project_id: projectId,
      name,
      nodes,
      connections,
      settings
    });
  },

  async loadProject(projectId) {
    return this.get(`/project/load/${projectId}`);
  },

  async deleteProject(projectId) {
    return this.delete(`/project/delete/${projectId}`);
  },

  async listProjects() {
    return this.get('/projects');
  },

  // ============ Session ============

  async clearSession() {
    return this.post('/session/clear', {});
  },

  async getSessionStatus() {
    return this.get('/session/status');
  },

  // ============ Health Check ============

  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
};

// API 상태 확인
async function checkApiConnection() {
  const isConnected = await API.healthCheck();
  const statusEl = document.getElementById('apiConnectionStatus');

  if (statusEl) {
    if (isConnected) {
      statusEl.innerHTML = `
        <span class="badge badge-success">
          <svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          서버 연결됨
        </span>
      `;
    } else {
      statusEl.innerHTML = `
        <span class="badge badge-error">
          <svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          서버 연결 안됨
        </span>
      `;
    }
  }

  return isConnected;
}
