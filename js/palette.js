/**
 * palette.js - Node Palette Rendering and Interactions
 */

const Palette = {
  collapsedCategories: new Set(),

  // Initialize palette
  init() {
    this.render();
    this.bindEvents();
  },

  // Render all categories
  render() {
    const container = document.getElementById('paletteCategories');
    if (!container) return;

    container.innerHTML = NODE_CATEGORIES.map(category => this.renderCategory(category)).join('');
  },

  // Render single category
  renderCategory(category) {
    const isCollapsed = this.collapsedCategories.has(category.category);
    const color = NODE_COLORS[category.category];

    return `
      <div class="category ${isCollapsed ? 'collapsed' : ''}" data-category="${category.category}">
        <button class="category-header">
          <div class="category-info">
            <div class="category-icon" style="background-color: ${color}20">
              ${this.getCategoryIcon(category.icon, color)}
            </div>
            <span class="category-label">${category.label}</span>
          </div>
          <span class="category-count">${category.nodes.length}</span>
          <svg class="icon-sm category-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <div class="category-nodes">
          ${category.nodes.map(node => this.renderNode(node, category.category)).join('')}
        </div>
      </div>
    `;
  },

  // Render single palette node
  renderNode(node, category) {
    const color = NODE_COLORS[category];

    return `
      <div class="palette-node"
           draggable="true"
           data-type="${node.type}"
           data-category="${category}">
        <svg class="icon-xs node-grip" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
        </svg>
        <div class="node-color-bar" style="background-color: ${color}"></div>
        <div class="node-info">
          <div class="node-name">${node.name}</div>
          <div class="node-desc">${node.description}</div>
        </div>
      </div>
    `;
  },

  // Get category icon SVG
  getCategoryIcon(iconName, color) {
    const icons = {
      'file-text': `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>`,
      'scissors': `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
        <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>
      </svg>`,
      'sparkles': `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
        <path d="M12 3L14 9L20 9L15 13L17 20L12 16L7 20L9 13L4 9L10 9Z"/>
      </svg>`,
      'database': `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
        <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>`,
      'search': `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>`,
      'message-square': `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>`,
      'bot': `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
        <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>
      </svg>`,
      'bar-chart': `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
        <line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>
      </svg>`
    };

    return icons[iconName] || icons['file-text'];
  },

  // Bind events
  bindEvents() {
    const container = document.getElementById('paletteCategories');
    if (!container) return;

    // Category toggle
    container.addEventListener('click', (e) => {
      const header = e.target.closest('.category-header');
      if (header) {
        const category = header.closest('.category');
        const categoryName = category.dataset.category;

        if (this.collapsedCategories.has(categoryName)) {
          this.collapsedCategories.delete(categoryName);
        } else {
          this.collapsedCategories.add(categoryName);
        }

        category.classList.toggle('collapsed');
      }
    });

    // Node drag start
    container.addEventListener('dragstart', (e) => {
      const node = e.target.closest('.palette-node');
      if (node) {
        node.classList.add('dragging');
        e.dataTransfer.setData('nodeType', node.dataset.type);
        e.dataTransfer.setData('nodeCategory', node.dataset.category);
        e.dataTransfer.effectAllowed = 'copy';
      }
    });

    // Node drag end
    container.addEventListener('dragend', (e) => {
      const node = e.target.closest('.palette-node');
      if (node) {
        node.classList.remove('dragging');
      }
    });

    // Search
    const searchInput = document.getElementById('nodeSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterNodes(e.target.value);
      });
    }
  },

  // Filter nodes by search query
  filterNodes(query) {
    const lowerQuery = query.toLowerCase();
    const categories = document.querySelectorAll('.category');

    categories.forEach(category => {
      const nodes = category.querySelectorAll('.palette-node');
      let visibleCount = 0;

      nodes.forEach(node => {
        const name = node.querySelector('.node-name').textContent.toLowerCase();
        const desc = node.querySelector('.node-desc').textContent.toLowerCase();
        const matches = name.includes(lowerQuery) || desc.includes(lowerQuery);

        node.style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
      });

      // Show/hide category based on visible nodes
      category.style.display = visibleCount > 0 || !query ? '' : 'none';

      // Update count
      const countEl = category.querySelector('.category-count');
      if (countEl) {
        countEl.textContent = query ? visibleCount : nodes.length;
      }

      // Expand categories when searching
      if (query && visibleCount > 0) {
        category.classList.remove('collapsed');
        this.collapsedCategories.delete(category.dataset.category);
      }
    });
  }
};
