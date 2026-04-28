/**
 * pipeline.js - RAG Pipeline Execution
 * Python 백엔드 API를 호출하여 실제 RAG 파이프라인 실행
 */

const Pipeline = {
  // 파이프라인 실행
  async execute() {
    if (AppState.isRunning) return;

    // 노드가 없으면 실행하지 않음
    if (AppState.nodes.length === 0) {
      Toast.show('실행할 노드가 없습니다', 'warning', '팔레트에서 노드를 캔버스에 추가하세요.');
      return;
    }

    // 연결된 노드가 있는지 확인
    if (AppState.connections.length > 0) {
      // 연결된 체인을 찾아서 실행
      const endNodes = this.findEndNodes();
      if (endNodes.length > 0) {
        // 마지막 노드부터 체인 실행
        await NodeRunner.executeNode(endNodes[0].id);
        return;
      }
    }

    AppState.isRunning = true;
    AppState.executionResult = null;

    // UI 업데이트
    const runBtn = document.getElementById('runBtn');
    const runBtnText = document.getElementById('runBtnText');
    if (runBtn) runBtn.disabled = true;
    if (runBtnText) runBtnText.textContent = '실행 중...';

    // 모든 노드 상태 초기화
    AppState.setAllNodesStatus('idle');
    this.updateAllNodeElements();

    // 서버 연결 확인
    const isConnected = await API.healthCheck();

    if (isConnected) {
      await this.executeWithApi();
    } else {
      // 서버 연결 안되면 로컬 시뮬레이션
      Toast.show('서버에 연결할 수 없습니다', 'warning', '로컬 시뮬레이션으로 실행합니다.');
      await this.executeLocal();
    }

    // UI 복원
    AppState.isRunning = false;
    if (runBtn) runBtn.disabled = false;
    if (runBtnText) runBtnText.textContent = 'Run';
  },

  // 끝 노드 찾기 (출력 연결이 없는 노드)
  findEndNodes() {
    return AppState.nodes.filter(node => {
      // 이 노드에서 나가는 연결이 있는지 확인
      const hasOutgoingConnection = AppState.connections.some(c => c.source === node.id);
      return !hasOutgoingConnection;
    });
  },

  // API를 사용한 파이프라인 실행
  async executeWithApi() {
    Toast.show('파이프라인을 실행합니다...', 'info', 'Python 백엔드로 RAG 파이프라인을 실행합니다.');

    try {
      // 파이프라인 설정 수집
      const config = this.collectPipelineConfig();

      // 단계별 실행
      await this.runStep('data', '문서 로딩 중...');

      // 문서 로드
      let text = config.text;
      if (!text) {
        const sampleResult = await API.loadSample('rag_intro');
        text = sampleResult.preview;
      }

      await this.runStep('chunking', `청킹 중... (size=${config.chunkSize})`);

      // 청킹 API 호출
      const chunkResult = await API.chunk(text, {
        chunkSize: config.chunkSize,
        chunkOverlap: config.chunkOverlap,
        method: config.chunkMethod
      });

      await this.runStep('embedding', `임베딩 생성 중... (${config.embeddingModel})`);

      // 임베딩 API 호출
      const embedResult = await API.embed(
        chunkResult.chunks.map(c => c.text),
        { model: config.embeddingModel, apiKey: AppState.openaiApiKey }
      );

      await this.runStep('retriever', `검색 중... (top_k=${config.topK})`);

      // 검색 API 호출
      const retrieveResult = await API.retrieve(config.query, {
        topK: config.topK,
        method: config.retrieverMethod,
        apiKey: AppState.openaiApiKey
      });

      await this.runStep('llm', `응답 생성 중... (${config.llmModel})`);

      // 생성 API 호출
      const generateResult = await API.generate(
        config.query,
        retrieveResult.results.map(r => r.text),
        {
          model: config.llmModel,
          temperature: config.temperature,
          apiKey: AppState.openaiApiKey
        }
      );

      // 모든 노드 완료
      AppState.setAllNodesStatus('completed');
      this.updateAllNodeElements();
      Connections.render();

      // 결과 저장
      AppState.executionResult = {
        query: config.query,
        chunks: chunkResult.chunks,
        retrievedChunks: retrieveResult.results.map((r, i) => ({
          chunkId: i,
          text: r.text,
          score: r.score
        })),
        generatedAnswer: generateResult.answer,
        logs: this.createLogs(chunkResult, embedResult, retrieveResult, generateResult),
        totalTime: 2.5,
        tokenCount: generateResult.usage?.prompt_tokens + generateResult.usage?.completion_tokens || 1500,
        estimatedCost: '0.015',
        isTestSample: !AppState.openaiApiKey
      };

      // 패널 업데이트
      Panels.showBottomPanelResult(AppState.executionResult);
      Panels.updateRightPanel();

      Toast.show('파이프라인 실행이 완료되었습니다!', 'success', '하단 패널에서 결과를 확인하세요.');

    } catch (error) {
      console.error('Pipeline error:', error);
      Toast.show('파이프라인 실행 중 오류가 발생했습니다', 'error', error.message);
      AppState.setAllNodesStatus('idle');
      this.updateAllNodeElements();
    }
  },

  // 로컬 시뮬레이션 (서버 없을 때)
  async executeLocal() {
    const logs = [];
    const startTime = Date.now();

    try {
      // Step 1: Document Load
      logs.push({
        timestamp: '00:00.000',
        step: 'Document Load',
        status: 'info',
        message: '[로컬] 문서 로딩 중...'
      });
      await this.animateStep('data', logs);

      logs.push({
        timestamp: '00:00.300',
        step: 'Document Load',
        status: 'success',
        message: `[로컬] 문서 로드 완료 (${SAMPLE_DOCUMENT.length}자)`,
        duration: 300
      });

      // Step 2: Chunking
      logs.push({
        timestamp: '00:00.310',
        step: 'Chunking',
        status: 'info',
        message: `[로컬] RecursiveSplitter로 청킹 중... (chunk_size=${AppState.chunkSize}, overlap=${AppState.chunkOverlap})`
      });
      await this.animateStep('chunking', logs);

      const chunks = this.createChunks();
      logs.push({
        timestamp: '00:00.510',
        step: 'Chunking',
        status: 'success',
        message: `[로컬] ${chunks.length}개 청크 생성 완료`,
        duration: 200
      });

      // Step 3: Embedding
      logs.push({
        timestamp: '00:00.520',
        step: 'Embedding',
        status: 'info',
        message: '[로컬] 임베딩 생성 중...'
      });
      await this.animateStep('embedding', logs);

      logs.push({
        timestamp: '00:01.320',
        step: 'Embedding',
        status: 'success',
        message: `[로컬] ${chunks.length}개 청크 임베딩 완료`,
        duration: 800
      });

      // Step 4: Retrieval
      logs.push({
        timestamp: '00:01.330',
        step: 'Retrieval',
        status: 'info',
        message: `[로컬] 상위 ${AppState.topK}개 청크 검색 중...`
      });
      await this.animateStep('retriever', logs);

      const retrievedChunks = this.retrieveChunks(chunks);
      logs.push({
        timestamp: '00:01.630',
        step: 'Retrieval',
        status: 'success',
        message: `[로컬] ${retrievedChunks.length}개 관련 청크 검색 완료`,
        duration: 300
      });

      // Step 5: Generation
      logs.push({
        timestamp: '00:01.640',
        step: 'Generation',
        status: 'info',
        message: '[로컬] 응답 생성 중...'
      });
      await this.animateStep('llm', logs);

      const answer = this.generateAnswer();
      logs.push({
        timestamp: '00:02.640',
        step: 'Generation',
        status: 'success',
        message: '[로컬] 응답 생성 완료',
        duration: 1000
      });

      // Complete all nodes
      AppState.setAllNodesStatus('completed');
      this.updateAllNodeElements();
      Connections.render();

      const totalTime = (Date.now() - startTime) / 1000;

      // 결과 저장
      AppState.executionResult = {
        query: 'RAG란 무엇인가요?',
        chunks,
        retrievedChunks,
        generatedAnswer: answer,
        logs,
        totalTime,
        tokenCount: Math.floor(1000 + Math.random() * 500),
        estimatedCost: (Math.round((0.01 + Math.random() * 0.02) * 1000) / 1000).toFixed(3),
        isTestSample: true
      };

      // 패널 업데이트
      Panels.showBottomPanelResult(AppState.executionResult);
      Panels.updateRightPanel();

      Toast.show('로컬 시뮬레이션이 완료되었습니다!', 'success', '하단 패널에서 결과를 확인하세요.');

    } catch (error) {
      console.error('Local pipeline error:', error);
      Toast.show('파이프라인 실행 중 오류가 발생했습니다', 'error');
    }
  },

  // 파이프라인 설정 수집
  collectPipelineConfig() {
    const config = {
      query: 'RAG란 무엇인가요?',
      text: null,
      chunkSize: AppState.chunkSize,
      chunkOverlap: AppState.chunkOverlap,
      chunkMethod: 'recursive',
      embeddingModel: 'openai',
      retrieverMethod: 'similarity',
      topK: AppState.topK,
      llmModel: 'gpt-4o',
      temperature: AppState.temperature
    };

    // 노드에서 설정 수집
    AppState.nodes.forEach(node => {
      switch (node.category) {
        case 'chunking':
          config.chunkSize = node.params?.chunkSize || config.chunkSize;
          config.chunkOverlap = node.params?.chunkOverlap || config.chunkOverlap;
          if (node.type === 'sentence-splitter') config.chunkMethod = 'sentence';
          if (node.type === 'semantic-splitter') config.chunkMethod = 'semantic';
          break;

        case 'embedding':
          if (node.type === 'openai-embedding') config.embeddingModel = 'openai';
          if (node.type === 'cohere-embedding') config.embeddingModel = 'cohere';
          if (node.type === 'local-embedding') config.embeddingModel = 'local';
          break;

        case 'retriever':
          config.topK = node.params?.topK || config.topK;
          if (node.type === 'similarity-search') config.retrieverMethod = 'similarity';
          if (node.type === 'mmr') config.retrieverMethod = 'mmr';
          if (node.type === 'hybrid') config.retrieverMethod = 'hybrid';
          break;

        case 'llm':
          config.temperature = node.params?.temperature || config.temperature;
          if (node.type === 'gpt-4o') config.llmModel = 'gpt-4o';
          if (node.type === 'claude') config.llmModel = 'claude-3-sonnet';
          if (node.type === 'gemini') config.llmModel = 'gemini-pro';
          break;
      }
    });

    return config;
  },

  // 단계 실행 (노드 애니메이션)
  async runStep(category, message) {
    const nodeOrder = ['data', 'chunking', 'embedding', 'retriever', 'llm'];
    const currentIndex = nodeOrder.indexOf(category);

    AppState.nodes.forEach(node => {
      const nodeIndex = nodeOrder.indexOf(node.category);
      if (nodeIndex < currentIndex) {
        node.status = 'completed';
      } else if (nodeIndex === currentIndex) {
        node.status = 'running';
      } else {
        node.status = 'idle';
      }
    });

    this.updateAllNodeElements();
    Connections.render();

    await this.delay(CONFIG.animation.pipelineStep);
  },

  // 로그 생성
  createLogs(chunkResult, embedResult, retrieveResult, generateResult) {
    return [
      { timestamp: '00:00.000', step: 'Document Load', status: 'success', message: '문서 로드 완료', duration: 100 },
      { timestamp: '00:00.100', step: 'Chunking', status: 'success', message: `${chunkResult.chunk_count}개 청크 생성`, duration: 200 },
      { timestamp: '00:00.300', step: 'Embedding', status: 'success', message: `${embedResult.text_count}개 텍스트 임베딩 완료`, duration: 800 },
      { timestamp: '00:01.100', step: 'Retrieval', status: 'success', message: `${retrieveResult.result_count}개 관련 문서 검색`, duration: 300 },
      { timestamp: '00:01.400', step: 'Generation', status: 'success', message: '응답 생성 완료', duration: 1000 }
    ];
  },

  // Animate a step by updating node status (로컬용)
  async animateStep(category, logs) {
    const nodeOrder = ['data', 'chunking', 'embedding', 'retriever', 'llm'];
    const currentIndex = nodeOrder.indexOf(category);

    AppState.nodes.forEach(node => {
      const nodeIndex = nodeOrder.indexOf(node.category);
      if (nodeIndex < currentIndex) {
        node.status = 'completed';
      } else if (nodeIndex === currentIndex) {
        node.status = 'running';
      } else {
        node.status = 'idle';
      }
    });

    this.updateAllNodeElements();
    Connections.render();

    await this.delay(CONFIG.animation.pipelineStep);
  },

  // Update all node elements
  updateAllNodeElements() {
    AppState.nodes.forEach(node => {
      NodeUtils.updateNodeElement(node.id);
    });
  },

  // Create chunks from sample document (로컬용)
  createChunks() {
    const chunks = [];
    let position = 0;
    let chunkId = 0;

    while (position < SAMPLE_DOCUMENT.length) {
      const end = Math.min(position + AppState.chunkSize, SAMPLE_DOCUMENT.length);
      chunks.push({
        id: chunkId++,
        text: SAMPLE_DOCUMENT.slice(position, end),
        charCount: end - position
      });
      position = end - AppState.chunkOverlap;
      if (position >= SAMPLE_DOCUMENT.length - AppState.chunkOverlap) break;
    }

    return chunks;
  },

  // Retrieve top-k chunks (로컬용)
  retrieveChunks(chunks) {
    return chunks
      .slice(0, Math.min(AppState.topK, chunks.length))
      .map((chunk, idx) => ({
        chunkId: chunk.id,
        text: chunk.text.slice(0, 150) + '...',
        score: Math.round((0.95 - idx * 0.05) * 100) / 100
      }));
  },

  // Generate answer (로컬용)
  generateAnswer() {
    const sampleQA = SAMPLE_QA.find(q => q.question.includes('RAG'));
    return sampleQA?.answer ||
      '[로컬 샘플 응답] RAG(Retrieval-Augmented Generation)는 대규모 언어 모델의 성능을 향상시키기 위해 외부 지식 베이스에서 관련 정보를 검색하여 응답 생성에 활용하는 기술입니다.';
  },

  // Delay helper
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
