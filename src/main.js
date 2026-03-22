// ═══════════════════════════════════════════════════
//  Code Review Agent — Frontend Logic
// ═══════════════════════════════════════════════════

// ── DOM Elements ──
const codeInput = document.getElementById('code-input');
const lineNumbers = document.getElementById('line-numbers');
const languageSelect = document.getElementById('language-select');
const fileUpload = document.getElementById('file-upload');
const fileInfo = document.getElementById('file-info');
const analyzeBtn = document.getElementById('analyze-btn');
const retryBtn = document.getElementById('retry-btn');
const copyBtn = document.getElementById('copy-btn');
const fileSidebar = document.getElementById('file-sidebar');
const fileSidebarToolbar = document.getElementById('file-sidebar-toolbar');
const selectAllBtn = document.getElementById('select-all-btn');
const deselectAllBtn = document.getElementById('deselect-all-btn');
const fileTree = document.getElementById('file-tree');
const editorWrapper = document.getElementById('editor-wrapper');
const closeWorkspaceBtn = document.getElementById('close-workspace-btn');

if (closeWorkspaceBtn) {
  closeWorkspaceBtn.addEventListener('click', () => {
    workspaceFiles.clear();
    fileSidebar.classList.add('hidden');
    fileTree.innerHTML = '';
    codeInput.value = '';
    updateLineNumbers();
    fileInfo.textContent = '';
  });
}

const inputPanel = document.getElementById('input-panel');
const loadingPanel = document.getElementById('loading-panel');
const errorPanel = document.getElementById('error-panel');
const resultsPanel = document.getElementById('results-panel');

const scoreFill = document.getElementById('score-fill');
const scoreNumber = document.getElementById('score-number');
const scoreText = document.getElementById('score-text');
const summaryText = document.getElementById('summary-text');
const issueCounts = document.getElementById('issue-counts');
const issuesList = document.getElementById('issues-list');
const improvedCode = document.getElementById('improved-code');

// ── Extension → Language Map ──
const EXT_MAP = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  py: 'python',
  java: 'java',
  cs: 'csharp',
  cpp: 'cpp', cc: 'cpp', cxx: 'cpp', h: 'cpp', hpp: 'cpp',
  go: 'go',
  rs: 'rust',
  php: 'php',
  rb: 'ruby',
  swift: 'swift',
  kt: 'kotlin', kts: 'kotlin',
  html: 'html', htm: 'html',
  css: 'css', scss: 'css',
  sql: 'sql',
};

// ── Line Numbers ──
function updateLineNumbers() {
  const lines = codeInput.value.split('\n').length;
  lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) =>
    `<span>${i + 1}</span>`
  ).join('');
}

codeInput.addEventListener('input', updateLineNumbers);
codeInput.addEventListener('scroll', () => {
  lineNumbers.scrollTop = codeInput.scrollTop;
});

// Initialize with 1 line number
updateLineNumbers();

// ── File Upload ──
fileUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    codeInput.value = evt.target.result;
    updateLineNumbers();

    // Auto-detect language from extension
    const ext = file.name.split('.').pop().toLowerCase();
    if (EXT_MAP[ext]) {
      languageSelect.value = EXT_MAP[ext];
    }

    fileInfo.textContent = `📄 ${file.name} (${formatBytes(file.size)})`;
  };
  reader.readAsText(file);
});

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── Drag & Drop Folder Support ──
let workspaceFiles = new Map();

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  editorWrapper.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
  editorWrapper.addEventListener(eventName, () => {
    editorWrapper.classList.add('drag-over');
  }, false);
});

['dragleave', 'drop'].forEach(eventName => {
  editorWrapper.addEventListener(eventName, () => {
    editorWrapper.classList.remove('drag-over');
  }, false);
});

editorWrapper.addEventListener('drop', handleDrop, false);

async function handleDrop(e) {
  const dt = e.dataTransfer;
  if (!dt.items) return;
  
  workspaceFiles.clear();
  fileSidebar.classList.remove('hidden');
  fileTree.innerHTML = '<li style="padding: 10px; color: var(--text-muted); font-size: 0.8rem;">Reading folder...</li>';
  
  const entries = [];
  for (let i = 0; i < dt.items.length; i++) {
    const item = dt.items[i];
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry();
      if (entry) entries.push(entry);
    }
  }
  
  await readEntries(entries);
  renderFileTree();
}

async function readEntries(entries) {
  for (const entry of entries) {
    if (entry.isFile) {
      if (entry.name === 'package-lock.json') continue;
      const file = await new Promise(resolve => entry.file(resolve));
      workspaceFiles.set(entry.fullPath, file);
    } else if (entry.isDirectory) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const dirReader = entry.createReader();
      const childEntries = await new Promise(resolve => {
        dirReader.readEntries(resolve);
      });
      await readEntries(childEntries);
    }
  }
}

function buildFileTree(paths) {
  const root = { name: 'root', isDir: true, children: {}, fullPath: '' };
  
  paths.forEach(fullPath => {
    if (fullPath.includes('/.git/') || fullPath.includes('/node_modules/') || fullPath.includes('node_modules') || fullPath.endsWith('.DS_Store') || fullPath.endsWith('package-lock.json')) return;
    
    const parts = fullPath.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
        if(!parts[i]) continue;
        const part = parts[i];
        const isFile = i === parts.length - 1;
        
        if (!current.children[part]) {
            current.children[part] = {
                name: part,
                isDir: !isFile,
                fullPath: isFile ? fullPath : parts.slice(0, i + 1).join('/'),
                children: {}
            };
        }
        current = current.children[part];
    }
  });
  
  while (Object.keys(root.children).length === 1) {
    const onlyChildKey = Object.keys(root.children)[0];
    const onlyChild = root.children[onlyChildKey];
    if (onlyChild.isDir) {
       root.children = onlyChild.children;
       root.name = onlyChild.name;
    } else {
       break;
    }
  }
  
  return root;
}

function renderTreeNodes(node, container, depth = 0) {
  const children = Object.values(node.children).sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });
  
  children.forEach(child => {
    if (child.isDir) {
      const li = document.createElement('li');
      
      const folderDiv = document.createElement('div');
      folderDiv.className = 'folder-item open';
      folderDiv.style.paddingLeft = `${16 + depth * 16}px`;
      
      folderDiv.innerHTML = `
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
        <input type="checkbox" class="folder-item-checkbox" data-path="${child.fullPath}" checked>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
        <span>${child.name}</span>
      `;
      
      const ul = document.createElement('ul');
      ul.className = 'folder-children';
      
      folderDiv.querySelector('.chevron').addEventListener('click', (e) => {
        e.stopPropagation();
        folderDiv.classList.toggle('open');
      });
      folderDiv.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
          folderDiv.classList.toggle('open');
        }
      });
      
      const folderCheckbox = folderDiv.querySelector('.folder-item-checkbox');
      folderCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        ul.querySelectorAll('.file-item-checkbox, .folder-item-checkbox').forEach(cb => {
          cb.checked = isChecked;
        });
      });
      folderCheckbox.addEventListener('click', e => e.stopPropagation());

      li.appendChild(folderDiv);
      li.appendChild(ul);
      
      renderTreeNodes(child, ul, depth + 1);
      container.appendChild(li);
    } else {
      const li = document.createElement('li');
      li.className = 'file-item';
      li.style.paddingLeft = `${16 + depth * 16}px`;
      
      li.innerHTML = `
        <input type="checkbox" class="file-item-checkbox" data-path="${child.fullPath}" checked>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
        <span title="${child.fullPath}">${child.name}</span>
      `;
      
      li.querySelector('.file-item-checkbox').addEventListener('click', (e) => {
        e.stopPropagation();
      });
      
      li.addEventListener('click', () => {
        document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
        li.classList.add('active');
        loadFileIntoEditor(child.fullPath);
      });
      
      container.appendChild(li);
    }
  });
}

function renderFileTree() {
  fileTree.innerHTML = '';
  if (workspaceFiles.size === 0) {
    fileSidebarToolbar.style.display = 'none';
    fileTree.innerHTML = '<li style="padding: 10px; color: var(--accent-red); font-size: 0.8rem;">No files found</li>';
    return;
  }
  
  fileSidebarToolbar.style.display = 'flex';
  const paths = Array.from(workspaceFiles.keys());
  
  const treeRoot = buildFileTree(paths);
  renderTreeNodes(treeRoot, fileTree, 0);
  
  const firstItem = fileTree.querySelector('.file-item');
  if (firstItem) firstItem.click();
}

selectAllBtn.addEventListener('click', () => {
  document.querySelectorAll('.file-item-checkbox').forEach(cb => cb.checked = true);
});
deselectAllBtn.addEventListener('click', () => {
  document.querySelectorAll('.file-item-checkbox').forEach(cb => cb.checked = false);
});

function loadFileIntoEditor(path) {
  const file = workspaceFiles.get(path);
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (evt) => {
    codeInput.value = evt.target.result;
    updateLineNumbers();
    
    const ext = path.split('.').pop().toLowerCase();
    if (EXT_MAP[ext]) {
      languageSelect.value = EXT_MAP[ext];
    }
    
    fileInfo.textContent = `📄 ${path.split('/').pop()} (${formatBytes(file.size)})`;
  };
  reader.readAsText(file);
}

// ── Loading Steps Animation ──
function animateLoadingSteps() {
  const steps = ['step-parse', 'step-analyze', 'step-generate'];
  let index = 0;

  const interval = setInterval(() => {
    if (index > 0) {
      document.getElementById(steps[index - 1]).classList.remove('active');
      document.getElementById(steps[index - 1]).classList.add('done');
    }

    if (index < steps.length) {
      document.getElementById(steps[index]).classList.add('active');
      index++;
    } else {
      clearInterval(interval);
    }
  }, 1200);

  return interval;
}

// ── Show / Hide Panels ──
function showPanel(panel) {
  [loadingPanel, errorPanel, resultsPanel].forEach(p => p.classList.add('hidden'));
  panel.classList.remove('hidden');
  panel.classList.add('fade-in');
}

function showError(title, message) {
  document.getElementById('error-title').textContent = title;
  document.getElementById('error-message').textContent = message;
  showPanel(errorPanel);
}

// ── Animated Score Counter ──
function animateScore(target) {
  let current = 0;
  const duration = 1500;
  const startTime = performance.now();

  // Determine color based on score
  let color;
  if (target >= 80) color = '#10b981';
  else if (target >= 60) color = '#f59e0b';
  else color = '#ef4444';

  scoreFill.style.stroke = color;

  // Determine text
  let text;
  if (target >= 90) text = 'Excellent';
  else if (target >= 80) text = 'Great';
  else if (target >= 70) text = 'Good';
  else if (target >= 60) text = 'Fair';
  else if (target >= 40) text = 'Needs Work';
  else text = 'Poor';

  scoreText.textContent = text;
  scoreText.style.color = color;

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

    current = Math.round(target * eased);
    scoreNumber.textContent = current;

    // Update ring
    const circumference = 326.73;
    const offset = circumference - (circumference * (current / 100));
    scoreFill.style.strokeDashoffset = offset;

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

// ── Render Issues ──
function renderIssues(issues) {
  issuesList.innerHTML = '';

  // Count by severity
  const counts = { critical: 0, warning: 0, info: 0 };
  issues.forEach(i => counts[i.severity] = (counts[i.severity] || 0) + 1);

  // Render count badges
  issueCounts.innerHTML = '';
  if (counts.critical > 0) {
    issueCounts.innerHTML += `<span class="count-badge critical">🔴 ${counts.critical} Critical</span>`;
  }
  if (counts.warning > 0) {
    issueCounts.innerHTML += `<span class="count-badge warning">🟡 ${counts.warning} Warning</span>`;
  }
  if (counts.info > 0) {
    issueCounts.innerHTML += `<span class="count-badge info">🔵 ${counts.info} Info</span>`;
  }

  // Sort: critical first, then warning, then info
  const order = { critical: 0, warning: 1, info: 2 };
  issues.sort((a, b) => (order[a.severity] || 2) - (order[b.severity] || 2));

  issues.forEach((issue, idx) => {
    const item = document.createElement('div');
    item.className = `issue-item ${issue.severity}`;
    item.style.animationDelay = `${idx * 0.1}s`;

    item.innerHTML = `
      <div class="issue-top">
        <span class="severity-badge ${issue.severity}">${issue.severity}</span>
        ${issue.line ? `<span class="issue-line">Line ${issue.line}</span>` : ''}
        <span class="issue-title">${escapeHtml(issue.title)}</span>
      </div>
      <p class="issue-desc">${escapeHtml(issue.description)}</p>
      ${issue.suggestion ? `<div class="issue-suggestion">${escapeHtml(issue.suggestion)}</div>` : ''}
    `;

    issuesList.appendChild(item);
  });
}

// ── Render Improved Code ──
function renderImprovedCode(code, language) {
  const lang = language || 'javascript';
  improvedCode.className = `language-${lang}`;
  improvedCode.textContent = code;

  // Highlight with Prism
  if (window.Prism) {
    Prism.highlightElement(improvedCode);
  }
}

// ── Copy Button ──
copyBtn.addEventListener('click', () => {
  const code = improvedCode.textContent;
  navigator.clipboard.writeText(code).then(() => {
    const original = copyBtn.innerHTML;
    copyBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
      Copied!
    `;
    copyBtn.style.borderColor = '#10b981';
    copyBtn.style.color = '#10b981';

    setTimeout(() => {
      copyBtn.innerHTML = original;
      copyBtn.style.borderColor = '';
      copyBtn.style.color = '';
    }, 2000);
  });
});

// ── Analyze ──
async function analyzeCode() {
  const checkboxes = document.querySelectorAll('.file-item-checkbox:checked');
  let filesPayload = [];
  
  if (checkboxes.length > 0) {
    for (const cb of checkboxes) {
      const path = cb.dataset.path;
      const file = workspaceFiles.get(path);
      if (file) {
        const code = await file.text();
        const ext = path.split('.').pop().toLowerCase();
        filesPayload.push({
          filename: path.split('/').pop(),
          language: EXT_MAP[ext] || undefined,
          code: code
        });
      }
    }
  } else {
    const code = codeInput.value.trim();
    if (code) {
      filesPayload.push({
        code,
        language: languageSelect.value || undefined,
        filename: fileInfo.textContent?.replace('📄 ', '').split(' (')[0] || undefined
      });
    }
  }

  if (filesPayload.length === 0) {
    codeInput.focus();
    return;
  }

  analyzeBtn.disabled = true;
  showPanel(loadingPanel);

  // Reset loading steps
  document.querySelectorAll('.loading-steps .step').forEach(s => {
    s.classList.remove('active', 'done');
  });

  const stepInterval = animateLoadingSteps();

  try {
    const response = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: filesPayload[0].code,
        language: filesPayload[0].language,
        filename: filesPayload[0].filename,
        files: filesPayload
      }),
    });

    clearInterval(stepInterval);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Server error: ${response.status}`);
    }

    const review = await response.json();

    // Mark all steps as done
    document.querySelectorAll('.loading-steps .step').forEach(s => {
      s.classList.remove('active');
      s.classList.add('done');
    });

    // Short delay then show results
    setTimeout(() => {
      showPanel(resultsPanel);
      animateScore(review.score);
      summaryText.textContent = review.summary;
      renderIssues(review.issues || []);
      renderImprovedCode(review.improvedCode || '', languageSelect.value);
    }, 500);

  } catch (err) {
    clearInterval(stepInterval);
    showError('Analysis Failed', err.message);
  } finally {
    analyzeBtn.disabled = false;
  }
}

analyzeBtn.addEventListener('click', analyzeCode);
retryBtn.addEventListener('click', () => {
  errorPanel.classList.add('hidden');
  analyzeCode();
});

// ── Escape HTML ──
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ── Keyboard Shortcut ──
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    analyzeCode();
  }
});
