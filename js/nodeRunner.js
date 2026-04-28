/**
 * nodeRunner.js - Individual Node Execution
 * 개별 노드 실행 및 연결된 노드들의 연쇄 실행
 * 각 노드의 실행 결과를 저장하여 연결된 노드에 전달
 */

const NodeRunner = {
  // 노드별 실행 결과 저장소
  nodeResults: {},

  // 개별 노드 실행
  async executeNode(nodeId) {
    const node = AppState.nodes.find(n => n.id === nodeId);
    if (!node) return;

    // 이미 실행 중인 경우 무시
    if (AppState.isRunning) {
      Toast.show('다른 실행이 진행 중입니다', 'warning');
      return;
    }

    // 연결된 선행 노드들 찾기
    const connectedChain = this.findConnectedChain(nodeId);

    if (connectedChain.length > 1) {
      // 연결된 노드들이 있으면 체인 실행
      await this.executeChain(connectedChain);
    } else {
      // 단독 실행
      await this.executeSingleNode(node);
    }
  },

  // 연결된 노드 체인 찾기 (선행 노드들)
  findConnectedChain(nodeId) {
    const chain = [];
    const visited = new Set();

    // 현재 노드부터 시작해서 선행 노드들을 역순으로 찾기
    const findPredecessors = (currentId) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      // 현재 노드로 들어오는 연결 찾기
      const incomingConnections = AppState.connections.filter(c => c.target === currentId);

      // 선행 노드들을 먼저 처리
      incomingConnections.forEach(conn => {
        findPredecessors(conn.source);
      });

      // 현재 노드 추가
      chain.push(currentId);
    };

    findPredecessors(nodeId);
    return chain;
  },

  // 노드 체인 실행 (연결된 노드들 순서대로 실행)
  async executeChain(nodeIds) {
    AppState.isRunning = true;

    // 모든 체인 노드 상태 초기화
    nodeIds.forEach(id => {
      const node = AppState.nodes.find(n => n.id === id);
      if (node) {
        node.status = 'idle';
        NodeUtils.updateNodeElement(id);
      }
    });

    Toast.show(`${nodeIds.length}개 노드 체인 실행 중...`, 'info');

    const results = {};

    try {
      for (const nodeId of nodeIds) {
        const node = AppState.nodes.find(n => n.id === nodeId);
        if (!node) continue;

        // 노드 실행
        node.status = 'running';
        NodeUtils.updateNodeElement(nodeId);
        Connections.render();

        // 선행 노드 결과 수집
        const predecessorResults = this.getPredecessorResults(nodeId, results);

        // 노드 카테고리별 실행
        const result = await this.runNodeByCategory(node, predecessorResults);
        results[nodeId] = result;

        // 노드에 결과 저장 (다음 실행에서도 사용 가능)
        node.lastResult = result;
        this.nodeResults[nodeId] = result;

        // 완료 상태로 변경
        node.status = 'completed';
        NodeUtils.updateNodeElement(nodeId);
        Connections.render();

        // 작은 딜레이
        await this.delay(300);
      }

      // 마지막 노드 결과를 우측 패널에 표시
      const lastNodeId = nodeIds[nodeIds.length - 1];
      const lastResult = results[lastNodeId];
      this.showPreviewInRightPanel(AppState.nodes.find(n => n.id === lastNodeId), lastResult);

      Toast.show('체인 실행이 완료되었습니다!', 'success');
    } catch (error) {
      console.error('Chain execution error:', error);
      Toast.show('실행 중 오류가 발생했습니다', 'error', error.message);
    } finally {
      AppState.isRunning = false;
    }
  },

  // 선행 노드 결과 수집
  getPredecessorResults(nodeId, allResults) {
    const incomingConnections = AppState.connections.filter(c => c.target === nodeId);
    const results = {};

    incomingConnections.forEach(conn => {
      if (allResults[conn.source]) {
        const sourceNode = AppState.nodes.find(n => n.id === conn.source);
        if (sourceNode) {
          results[sourceNode.category] = allResults[conn.source];
        }
      }
    });

    return results;
  },

  // 단독 노드 실행
  async executeSingleNode(node) {
    AppState.isRunning = true;

    // 노드 상태 변경
    node.status = 'running';
    NodeUtils.updateNodeElement(node.id);
    Connections.render();

    Toast.show(`${node.name} 실행 중...`, 'info');

    try {
      // 노드 실행
      const result = await this.runNodeByCategory(node, {});

      // 노드에 결과 저장
      node.lastResult = result;
      this.nodeResults[node.id] = result;

      // 완료 상태로 변경
      node.status = 'completed';
      NodeUtils.updateNodeElement(node.id);
      Connections.render();

      // 우측 패널에 결과 표시
      this.showPreviewInRightPanel(node, result);

      Toast.show(`${node.name} 실행 완료!`, 'success');
    } catch (error) {
      console.error('Node execution error:', error);
      node.status = 'error';
      NodeUtils.updateNodeElement(node.id);
      Toast.show('실행 중 오류가 발생했습니다', 'error', error.message);
    } finally {
      AppState.isRunning = false;
    }
  },

  // 카테고리별 노드 실행
  async runNodeByCategory(node, predecessorResults) {
    switch (node.category) {
      case 'data':
        return await this.runDataNode(node);
      case 'chunking':
        return await this.runChunkingNode(node, predecessorResults);
      case 'embedding':
        return await this.runEmbeddingNode(node, predecessorResults);
      case 'retriever':
        return await this.runRetrieverNode(node, predecessorResults);
      case 'llm':
        return await this.runLLMNode(node, predecessorResults);
      default:
        return { message: `${node.category} 노드가 실행되었습니다` };
    }
  },

  // Data 노드 실행
  async runDataNode(node) {
    let text = '';
    let metadata = {};

    // 디버깅: 노드 파라미터 상태 확인
    console.log('=== Data Node Execution ===');
    console.log('Node type:', node.type);
    console.log('Node params:', node.params);
    console.log('Has file:', !!node.params?.file);
    console.log('File name:', node.params?.fileName);
    if (node.params?.file) {
      console.log('File object:', node.params.file);
      console.log('File instanceof File:', node.params.file instanceof File);
    }

    // 서버 연결 상태 확인
    const isServerConnected = await API.healthCheck();
    console.log('Server connected:', isServerConnected);

    if (node.type === 'pdf-loader' && node.params?.file) {
      Toast.show('PDF 파싱 중...', 'info');

      if (isServerConnected) {
        // Python 백엔드 API 사용
        try {
          console.log('Calling API.loadPdf with file:', node.params.file);
          const result = await API.loadPdf(node.params.file);
          console.log('API.loadPdf result:', result);

          text = result.text || result.content || '';
          console.log('Extracted text length:', text.length);
          console.log('Text preview:', text.substring(0, 200));

          metadata = {
            source: 'pdf',
            fileName: node.params.fileName,
            pageCount: result.page_count || result.metadata?.page_count,
            ...result.metadata
          };
          Toast.show('PDF 로드 완료 (서버)', 'success');
        } catch (error) {
          console.error('PDF API error:', error);
          Toast.show('서버 PDF 파싱 실패, 로컬 파싱 시도...', 'warning');
          // 서버 실패 시 로컬 PDF.js 사용
          try {
            const localResult = await this.extractPdfTextLocal(node.params.file);
            text = localResult.text;
            metadata = { source: 'pdf', fileName: node.params.fileName, pageCount: localResult.pageCount };
          } catch (localError) {
            text = `[PDF 파싱 실패]\n${error.message}`;
            metadata = { source: 'pdf', fileName: node.params.fileName, error: true };
          }
        }
      } else {
        // 서버 없으면 로컬 PDF.js 사용
        try {
          const localResult = await this.extractPdfTextLocal(node.params.file);
          text = localResult.text;
          metadata = { source: 'pdf', fileName: node.params.fileName, pageCount: localResult.pageCount };
          Toast.show('PDF 로드 완료 (로컬)', 'success');
        } catch (error) {
          console.error('PDF parsing error:', error);
          Toast.show('PDF 파싱 실패', 'error', error.message);
          text = `[PDF 파싱 실패: ${node.params.fileName}]\n오류: ${error.message}`;
          metadata = { source: 'pdf', fileName: node.params.fileName, error: true };
        }
      }
    } else if (node.type === 'web-loader') {
      if (node.params?.url && isServerConnected) {
        // URL이 있고 서버 연결되면 웹 페이지 로드
        Toast.show('웹 페이지 로딩 중...', 'info');
        try {
          const result = await API.loadWeb(node.params.url, node.params.parseClass);
          text = result.text || '';
          metadata = { source: 'web', url: node.params.url, ...result.metadata };
          // 결과 저장
          node.params.loadedText = text;
          node.params.metadata = metadata;
          Toast.show('웹 페이지 로드 완료', 'success');
        } catch (error) {
          Toast.show('웹 페이지 로드 실패', 'error', error.message);
          text = node.params?.loadedText || SAMPLE_DOCUMENT;
          metadata = node.params?.metadata || { source: 'sample' };
        }
      } else if (node.params?.loadedText) {
        text = node.params.loadedText;
        metadata = node.params.metadata || { source: 'web' };
      } else {
        text = SAMPLE_DOCUMENT;
        metadata = { source: 'sample' };
      }
    } else if (node.type === 'text-input' && node.params?.text) {
      text = node.params.text;
      metadata = { source: 'text-input' };
    } else {
      // 샘플 데이터 사용
      await this.delay(300);
      text = SAMPLE_DOCUMENT;
      metadata = { source: 'sample', charCount: SAMPLE_DOCUMENT.length };
    }

    return {
      type: 'data',
      text,
      metadata,
      charCount: text.length,
      preview: text.substring(0, 200) + (text.length > 200 ? '...' : '')
    };
  },

  // 로컬 PDF 텍스트 추출 (PDF.js 사용 - 서버 없을 때)
  async extractPdfTextLocal(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          // PDF.js 라이브러리 확인
          if (typeof pdfjsLib === 'undefined') {
            reject(new Error('PDF.js 라이브러리가 로드되지 않았습니다. 서버를 사용하거나 페이지를 새로고침하세요.'));
            return;
          }

          // PDF.js 워커 설정
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

          const typedArray = new Uint8Array(e.target.result);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;

          let fullText = '';
          const pageCount = pdf.numPages;

          for (let i = 1; i <= pageCount; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n';
          }

          resolve({ text: fullText.trim(), pageCount });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('파일 읽기 실패'));
      reader.readAsArrayBuffer(file);
    });
  },

  // Chunking 노드 실행
  async runChunkingNode(node, predecessorResults) {
    // 입력 데이터 확인 - 연결된 Data 노드 또는 샘플 사용
    let inputText = '';
    let inputSource = 'sample';

    if (predecessorResults.data?.text) {
      inputText = predecessorResults.data.text;
      inputSource = predecessorResults.data.metadata?.source || 'connected';
    } else {
      // 연결은 안됐지만 저장된 Data 노드 결과가 있는지 확인
      const dataNodes = AppState.nodes.filter(n => n.category === 'data' && n.lastResult);
      if (dataNodes.length > 0) {
        inputText = dataNodes[0].lastResult.text;
        inputSource = dataNodes[0].lastResult.metadata?.source || 'previous';
      } else {
        inputText = SAMPLE_DOCUMENT;
        inputSource = 'sample';
      }
    }

    const chunkSize = node.params?.chunkSize || AppState.chunkSize;
    const chunkOverlap = node.params?.chunkOverlap || AppState.chunkOverlap;

    // 서버 연결시 실제 API 사용, 아니면 클라이언트 시뮬레이션
    const isServerConnected = await API.healthCheck();
    let chunks = [];

    if (isServerConnected) {
      try {
        const result = await API.chunk(inputText, {
          chunkSize,
          chunkOverlap,
          method: 'recursive'
        });
        // API 응답을 내부 형식으로 변환
        chunks = (result.chunks || []).map((chunk, idx) => ({
          id: idx,
          text: chunk.text,
          charCount: chunk.length || chunk.text.length,
          startPos: chunk.start || 0,
          endPos: chunk.end || chunk.text.length
        }));
        Toast.show('청킹 완료 (서버)', 'success');
      } catch (error) {
        console.error('Chunking API error:', error);
        Toast.show('서버 청킹 실패, 로컬 처리...', 'warning');
        chunks = this.chunkTextLocally(inputText, chunkSize, chunkOverlap);
      }
    } else {
      // 로컬 청킹
      await this.delay(300);
      chunks = this.chunkTextLocally(inputText, chunkSize, chunkOverlap);
    }

    return {
      type: 'chunking',
      chunks,
      chunkCount: chunks.length,
      avgChunkSize: chunks.length > 0 ? Math.round(inputText.length / chunks.length) : 0,
      totalChars: inputText.length,
      inputSource,
      inputPreview: inputText.substring(0, 100) + '...',
      settings: { chunkSize, chunkOverlap }
    };
  },

  // 로컬 텍스트 청킹
  chunkTextLocally(text, chunkSize, chunkOverlap) {
    const chunks = [];
    let position = 0;
    let chunkId = 0;

    while (position < text.length) {
      const end = Math.min(position + chunkSize, text.length);
      chunks.push({
        id: chunkId++,
        text: text.slice(position, end),
        charCount: end - position,
        startPos: position,
        endPos: end
      });
      position = end - chunkOverlap;
      if (position >= text.length - chunkOverlap) break;
    }

    return chunks;
  },

  // Embedding 노드 실행
  async runEmbeddingNode(node, predecessorResults) {
    await this.delay(800);

    const chunks = predecessorResults.chunking?.chunks || [];

    // 임베딩 시뮬레이션
    const embeddings = chunks.map((chunk, idx) => ({
      chunkId: chunk.id,
      dimensions: 1536,
      preview: `[${idx}] dim=1536 [0.023, -0.045, 0.112, ...]`
    }));

    return {
      type: 'embedding',
      embeddings,
      embeddingCount: embeddings.length,
      model: node.type === 'openai-embedding' ? 'text-embedding-3-small' : node.type,
      dimensions: 1536
    };
  },

  // Retriever 노드 실행
  async runRetrieverNode(node, predecessorResults) {
    await this.delay(600);

    const chunks = predecessorResults.chunking?.chunks || [];
    const topK = node.params?.topK || AppState.topK;

    // 검색 시뮬레이션 - 상위 k개 청크 선택
    const results = chunks
      .slice(0, Math.min(topK, chunks.length))
      .map((chunk, idx) => ({
        chunkId: chunk.id,
        text: chunk.text,
        score: Math.round((0.95 - idx * 0.05) * 100) / 100
      }));

    return {
      type: 'retriever',
      results,
      resultCount: results.length,
      query: 'RAG란 무엇인가요?',
      method: node.type === 'mmr' ? 'MMR' : node.type === 'hybrid' ? 'Hybrid' : 'Similarity'
    };
  },

  // LLM 노드 실행
  async runLLMNode(node, predecessorResults) {
    await this.delay(1000);

    const retrievedChunks = predecessorResults.retriever?.results || [];
    const context = retrievedChunks.map(r => r.text).join('\n\n');
    const temperature = node.params?.temperature || AppState.temperature;

    // 응답 생성 시뮬레이션
    const sampleQA = SAMPLE_QA.find(q => q.question.includes('RAG'));
    const answer = sampleQA?.answer ||
      `[${node.name} 샘플 응답]\n\nRAG(Retrieval-Augmented Generation)는 대규모 언어 모델의 성능을 향상시키기 위해 외부 지식 베이스에서 관련 정보를 검색하여 응답 생성에 활용하는 기술입니다.`;

    return {
      type: 'llm',
      answer,
      model: node.name,
      temperature,
      contextChunks: retrievedChunks.length,
      tokenUsage: {
        prompt: Math.floor(context.length / 4),
        completion: Math.floor(answer.length / 4),
        total: Math.floor((context.length + answer.length) / 4)
      }
    };
  },

  // 우측 패널에 미리보기 표시
  showPreviewInRightPanel(node, result) {
    AppState.nodePreviewResult = { node, result };
    AppState.selectNode(node.id);
    Canvas.updateSelection();

    // Result 탭으로 전환하고 내용 업데이트
    Panels.showRightPanelTab('result');
    this.renderNodePreviewToDOM(node, result);
  },

  // 노드 실행 결과 미리보기 HTML 생성 (반환용)
  renderNodePreview(node, result) {
    if (!node || !result) return '';

    let previewHTML = '';

    switch (result.type) {
      case 'data':
        previewHTML = this.renderDataPreview(node, result);
        break;
      case 'chunking':
        previewHTML = this.renderChunkingPreview(node, result);
        break;
      case 'embedding':
        previewHTML = this.renderEmbeddingPreview(node, result);
        break;
      case 'retriever':
        previewHTML = this.renderRetrieverPreview(node, result);
        break;
      case 'llm':
        previewHTML = this.renderLLMPreview(node, result);
        break;
      default:
        previewHTML = `<div class="preview-default">
          <p>${node.name} 실행 완료</p>
          <pre>${JSON.stringify(result, null, 2)}</pre>
        </div>`;
    }

    return `
      <div class="node-preview">
        <div class="preview-header">
          <div class="preview-title">
            <span class="badge" style="background-color: ${NodeUtils.getColor(node.category)}20; color: ${NodeUtils.getColor(node.category)};">${node.category}</span>
            <h4>${node.name}</h4>
          </div>
          <span class="badge badge-success">실행 완료</span>
        </div>
        ${previewHTML}
      </div>
    `;
  },

  // 노드 실행 결과를 DOM에 직접 렌더링
  renderNodePreviewToDOM(node, result) {
    const content = document.getElementById('rightPanelContent');
    if (!content) return;

    content.innerHTML = this.renderNodePreview(node, result);
  },

  // Data 노드 미리보기
  renderDataPreview(node, result) {
    const sourceLabel = {
      'sample': '샘플 데이터',
      'text-input': '직접 입력',
      'pdf': 'PDF 파일',
      'web': '웹 페이지'
    };

    const sourceInfo = result.metadata.fileName
      ? `${sourceLabel[result.metadata.source]} (${result.metadata.fileName})`
      : sourceLabel[result.metadata.source] || result.metadata.source;

    // PDF인 경우 페이지 수 표시
    const pageInfo = result.metadata.pageCount
      ? `<div class="metric-item"><span class="metric-label">페이지 수</span><span class="metric-value">${result.metadata.pageCount}</span></div>`
      : `<div class="metric-item"><span class="metric-label">줄 수</span><span class="metric-value">${result.text.split('\n').length}</span></div>`;

    return `
      <div class="preview-section">
        <label>데이터 소스</label>
        <div class="preview-input-info">
          <span class="badge ${result.metadata.source === 'sample' ? 'badge-warning' : 'badge-success'}">${sourceInfo}</span>
        </div>
      </div>
      <div class="preview-section">
        <div class="preview-metrics">
          <div class="metric-item">
            <span class="metric-label">총 문자 수</span>
            <span class="metric-value">${result.charCount.toLocaleString()}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">단어 수 (추정)</span>
            <span class="metric-value">${Math.round(result.charCount / 3.5).toLocaleString()}</span>
          </div>
          ${pageInfo}
        </div>
      </div>
      <div class="preview-section">
        <label>텍스트 미리보기</label>
        <div class="preview-text-box" style="max-height: 200px;">${this.escapeHtml(result.text.substring(0, 500))}${result.text.length > 500 ? '...' : ''}</div>
      </div>
      ${result.metadata.source === 'sample' ? `
        <div class="preview-notice">
          <span class="badge badge-warning">안내</span>
          <span>샘플 데이터 사용 중입니다. Settings 탭에서 직접 텍스트를 입력하거나 파일을 업로드하세요.</span>
        </div>
      ` : ''}
    `;
  },

  // HTML 이스케이프 (XSS 방지)
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // Chunking 노드 미리보기
  renderChunkingPreview(node, result) {
    const sourceLabel = {
      'sample': '샘플 데이터',
      'text-input': '직접 입력',
      'pdf': 'PDF 파일',
      'web': '웹 페이지',
      'connected': '연결된 노드',
      'previous': '이전 실행 결과'
    };

    return `
      <div class="preview-section">
        <label>입력 데이터</label>
        <div class="preview-input-info">
          <span class="badge badge-outline">${sourceLabel[result.inputSource] || result.inputSource}</span>
          <span class="input-chars">${result.totalChars?.toLocaleString() || 0}자</span>
        </div>
        <div class="preview-text-box" style="max-height: 80px; margin-top: 0.5rem;">${result.inputPreview || ''}</div>
      </div>
      <div class="preview-section">
        <label>청킹 설정</label>
        <div class="preview-settings">
          <div class="setting-item">
            <span class="setting-label">chunk_size</span>
            <span class="setting-value">${result.settings.chunkSize}</span>
          </div>
          <div class="setting-item">
            <span class="setting-label">overlap</span>
            <span class="setting-value">${result.settings.chunkOverlap}</span>
          </div>
        </div>
      </div>
      <div class="preview-section">
        <div class="preview-metrics">
          <div class="metric-item">
            <span class="metric-label">청크 수</span>
            <span class="metric-value">${result.chunkCount}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">평균 크기</span>
            <span class="metric-value">${result.avgChunkSize}자</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">효율</span>
            <span class="metric-value">${Math.round((result.totalChars / (result.chunkCount * result.settings.chunkSize)) * 100)}%</span>
          </div>
        </div>
      </div>
      <div class="preview-section">
        <label>청크 결과 (${result.chunkCount}개)</label>
        <div class="preview-chunks">
          ${result.chunks.slice(0, 5).map((chunk, idx) => `
            <div class="preview-chunk-item">
              <div class="chunk-header-row">
                <span class="chunk-badge">청크 ${idx + 1}</span>
                <span class="chunk-size">${chunk.charCount}자</span>
              </div>
              <p class="chunk-preview-text">${chunk.text.substring(0, 120)}${chunk.text.length > 120 ? '...' : ''}</p>
            </div>
          `).join('')}
          ${result.chunks.length > 5 ? `<p class="preview-more">... 외 ${result.chunks.length - 5}개 청크</p>` : ''}
        </div>
      </div>
    `;
  },

  // Embedding 노드 미리보기
  renderEmbeddingPreview(node, result) {
    return `
      <div class="preview-section">
        <div class="preview-metrics">
          <div class="metric-item">
            <span class="metric-label">임베딩 수</span>
            <span class="metric-value">${result.embeddingCount}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">차원</span>
            <span class="metric-value">${result.dimensions}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">모델</span>
            <span class="metric-value">${result.model}</span>
          </div>
        </div>
      </div>
      <div class="preview-section">
        <label>임베딩 벡터</label>
        <div class="preview-embeddings">
          ${result.embeddings.slice(0, 5).map(emb => `
            <div class="preview-embedding-item">
              <span class="embedding-id">청크 ${emb.chunkId + 1}</span>
              <code class="embedding-preview">${emb.preview}</code>
            </div>
          `).join('')}
          ${result.embeddings.length > 5 ? `<p class="preview-more">... 외 ${result.embeddings.length - 5}개</p>` : ''}
        </div>
      </div>
    `;
  },

  // Retriever 노드 미리보기
  renderRetrieverPreview(node, result) {
    return `
      <div class="preview-section">
        <div class="preview-metrics">
          <div class="metric-item">
            <span class="metric-label">검색 결과</span>
            <span class="metric-value">${result.resultCount}개</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">검색 방식</span>
            <span class="metric-value">${result.method}</span>
          </div>
        </div>
      </div>
      <div class="preview-section">
        <label>검색 쿼리</label>
        <div class="preview-query-box">${result.query}</div>
      </div>
      <div class="preview-section">
        <label>검색된 청크</label>
        <div class="preview-results">
          ${result.results.map(r => `
            <div class="preview-result-item">
              <div class="result-header">
                <span class="badge">청크 ${r.chunkId + 1}</span>
                <div class="result-score">
                  <div class="score-bar">
                    <div class="score-fill" style="width: ${r.score * 100}%"></div>
                  </div>
                  <span>${r.score.toFixed(2)}</span>
                </div>
              </div>
              <p class="result-text">${r.text.substring(0, 150)}...</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  // LLM 노드 미리보기
  renderLLMPreview(node, result) {
    return `
      <div class="preview-section">
        <div class="preview-metrics">
          <div class="metric-item">
            <span class="metric-label">모델</span>
            <span class="metric-value">${result.model}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Temperature</span>
            <span class="metric-value">${result.temperature}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">컨텍스트</span>
            <span class="metric-value">${result.contextChunks}개</span>
          </div>
        </div>
      </div>
      <div class="preview-section">
        <div class="preview-metrics">
          <div class="metric-item">
            <span class="metric-label">프롬프트 토큰</span>
            <span class="metric-value">${result.tokenUsage.prompt}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">응답 토큰</span>
            <span class="metric-value">${result.tokenUsage.completion}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">총 토큰</span>
            <span class="metric-value">${result.tokenUsage.total}</span>
          </div>
        </div>
      </div>
      <div class="preview-section">
        <label>생성된 응답</label>
        <div class="preview-answer-box">${result.answer}</div>
      </div>
    `;
  },

  // Delay helper
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
