(function () {
  const workflows = window.WORKFLOW_DATA || [];
  const byKey = Object.fromEntries(workflows.map(item => [item.key, item]));
  const projects = [
    { id: 'marketing', no: '01', eyebrow: 'MARKETING ASSISTANT', title: '智能营销方案助手', note: '从机会发现到可执行 Campaign，把证据检索、方案选择与用户反馈串成闭环。', color: 'coral', keys: ['marketing_1_opportunity', 'marketing_2_solution'], labels: { marketing_1_opportunity: ['01', '营销机会发现', 'RAG 检索 · Top 3 机会 · 人工反馈'], marketing_2_solution: ['02', '营销方案生成', '历史案例 · 三套方案 · 最终修订'] } },
    { id: 'massing', no: '02', eyebrow: 'MASSING STUDY ASSISTANT', title: '强排方案决策助手', note: '把任务书解析、指标算法与规范审核拆成三个协作 workflow，形成可检查的决策链。', color: 'blue', keys: ['massing_study_READ', 'massing_study_algorithm', 'massing_study_AUDIT'], labels: { massing_study_READ: ['01', 'READ · 指标解析', '63 节点 · 缺失信息补问 · 变量聚合'], massing_study_algorithm: ['02', 'ALGORITHM · 方案生成', '8 类算法方案 · 指标边界 · 结构化返回'], massing_study_AUDIT: ['03', 'AUDIT · 合规审核', '四路规范检索 · 去重 · 可追溯证据'] } },
    { id: 'garden', no: '03', eyebrow: 'GARDENWISE AI', title: '节水花园方案生成助手', note: '项目材料已收录，workflow 将在下一轮更新后加入拆解。', color: 'green', keys: [], pending: true }
  ];
  const folderView = document.querySelector('#folder-view');
  const workflowView = document.querySelector('#workflow-view');
  const canvasView = document.querySelector('#canvas-view');
  const folderGrid = document.querySelector('#folder-grid');
  const workflowGrid = document.querySelector('#workflow-grid');
  const viewport = document.querySelector('#viewport');
  const world = document.querySelector('#world');
  const edgeLayer = document.querySelector('#edge-layer');
  const nodeLayer = document.querySelector('#node-layer');
  const inspector = document.querySelector('#inspector');
  let activeProject = null;
  let activeWorkflow = null;
  let transform = { x: 0, y: 0, scale: 1 };
  let worldSize = { width: 1000, height: 600 };
  let drag = null;

  function escapeHTML(value) { const div = document.createElement('div'); div.textContent = value == null ? '' : String(value); return div.innerHTML; }
  function nodeTypeLabel(type) { const labels = { start: '开始', end: '结束', llm: 'LLM', knowledge: '知识库', plugin: '插件', http: 'HTTP', question: '人工确认', condition: '条件分支', variable_merge: '变量聚合', code: '代码', output: '过程输出', Input: '人工输入', insert_record: '数据写入' }; return labels[type] || type; }
  function typeFamily(type) { if (['start', 'end', 'output', 'Input'].includes(type)) return 'start'; if (['code', 'condition', 'variable_merge', 'http'].includes(type)) return 'code'; if (type === 'knowledge') return 'knowledge'; if (type === 'question') return 'question'; if (type === 'llm') return 'llm'; return 'plugin'; }

  function renderFolders() {
    folderGrid.innerHTML = projects.map(project => {
      const list = project.pending ? '<li><span>COMING NEXT</span><b>Workflow 待更新</b></li>' : project.keys.map(key => `<li><span>${project.labels[key][0]}</span><b>${escapeHTML(project.labels[key][1])}</b></li>`).join('');
      return `<article class="project-folder folder-${project.color}${project.pending ? ' is-pending' : ''}"><div class="folder-tab">PROJECT ${project.no}</div><div class="folder-cover"><div class="folder-meta"><span>${project.eyebrow}</span><span>${project.pending ? 'PENDING' : `${project.keys.length} WORKFLOWS`}</span></div><h3>${project.title}</h3><p>${project.note}</p><ul class="folder-files">${list}</ul>${project.pending ? '<span class="pending-stamp">待更新</span>' : `<button class="open-folder" type="button" data-project="${project.id}">打开文件夹 <span>↗</span></button>`}</div></article>`;
    }).join('');
    folderGrid.querySelectorAll('[data-project]').forEach(button => button.addEventListener('click', () => openProject(button.dataset.project)));
  }

  function showOnly(view) { [folderView, workflowView, canvasView].forEach(item => { item.hidden = item !== view; }); window.scrollTo({ top: Math.max(0, document.querySelector('main').offsetTop - 90), behavior: 'smooth' }); }

  function openProject(id) {
    activeProject = projects.find(item => item.id === id);
    if (!activeProject || activeProject.pending) return;
    document.querySelector('#folder-kicker').textContent = `${activeProject.eyebrow} / ${activeProject.keys.length} WORKFLOWS`;
    document.querySelector('#workflow-heading').textContent = activeProject.title;
    document.querySelector('#folder-description').textContent = activeProject.note;
    workflowGrid.innerHTML = activeProject.keys.map(key => {
      const item = byKey[key]; const label = activeProject.labels[key];
      const types = Object.entries(item.nodes.reduce((acc, node) => { const family = typeFamily(node.type); acc[family] = (acc[family] || 0) + 1; return acc; }, {}));
      return `<article class="workflow-file"><div class="workflow-file-top"><span>WORKFLOW ${label[0]}</span><span>${item.nodes.length} NODES / ${item.edges.length} EDGES</span></div><h3>${escapeHTML(label[1])}</h3><p>${escapeHTML(label[2])}</p><div class="type-strip">${types.map(([type, count]) => `<span><i class="legend-dot type-${type}"></i>${nodeTypeLabel(type)} ${count}</span>`).join('')}</div><button type="button" class="open-workflow" data-workflow="${key}">查看搭建细节 <span>→</span></button></article>`;
    }).join('');
    workflowGrid.querySelectorAll('[data-workflow]').forEach(button => button.addEventListener('click', () => openWorkflow(button.dataset.workflow)));
    showOnly(workflowView);
  }

  function openWorkflow(key) {
    activeWorkflow = byKey[key]; if (!activeWorkflow) return;
    const label = activeProject.labels[key];
    document.querySelector('#canvas-kicker').textContent = `${activeProject.eyebrow} / WORKFLOW ${label[0]}`;
    document.querySelector('#canvas-heading').textContent = label[1];
    document.querySelector('#canvas-description').textContent = activeWorkflow.description || label[2];
    document.querySelector('#canvas-stats').innerHTML = `<span><b>${activeWorkflow.nodes.length}</b> nodes</span><span><b>${activeWorkflow.edges.length}</b> edges</span><span><b>${new Set(activeWorkflow.nodes.map(n => typeFamily(n.type))).size}</b> node types</span>`;
    renderCanvas(activeWorkflow); resetInspector(); showOnly(canvasView); requestAnimationFrame(fitView);
  }

  function renderCanvas(flow) {
    const minX = Math.min(...flow.nodes.map(node => node.x)); const maxX = Math.max(...flow.nodes.map(node => node.x)); const minY = Math.min(...flow.nodes.map(node => node.y)); const maxY = Math.max(...flow.nodes.map(node => node.y));
    const sx = 0.68; const sy = flow.nodes.length > 30 ? 0.34 : 0.72; const positions = {};
    flow.nodes.forEach(node => { positions[node.id] = { x: (node.x - minX) * sx + 130, y: (node.y - minY) * sy + 120 }; });
    worldSize = { width: Math.max(980, (maxX - minX) * sx + 500), height: Math.max(560, (maxY - minY) * sy + 390) };
    world.style.width = `${worldSize.width}px`; world.style.height = `${worldSize.height}px`;
    edgeLayer.setAttribute('width', worldSize.width); edgeLayer.setAttribute('height', worldSize.height); edgeLayer.setAttribute('viewBox', `0 0 ${worldSize.width} ${worldSize.height}`);
    edgeLayer.innerHTML = flow.edges.map(([source, target]) => { const a = positions[source], b = positions[target]; if (!a || !b) return ''; const x1 = a.x + 210, y1 = a.y + 42, x2 = b.x, y2 = b.y + 42; const bend = Math.max(55, Math.abs(x2 - x1) * 0.46); return `<path d="M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}" />`; }).join('');
    nodeLayer.innerHTML = flow.nodes.map((node, index) => { const pos = positions[node.id]; const family = typeFamily(node.type); return `<button class="canvas-node node-${family}" type="button" data-node-id="${escapeHTML(node.id)}" style="left:${pos.x}px;top:${pos.y}px"><span class="node-index">${String(index + 1).padStart(2, '0')}</span><span class="node-type">${nodeTypeLabel(node.type)}</span><strong>${escapeHTML(node.title)}</strong><small>${escapeHTML(node.description || '点击查看节点配置')}</small></button>`; }).join('');
    nodeLayer.querySelectorAll('[data-node-id]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); nodeLayer.querySelectorAll('.is-active').forEach(item => item.classList.remove('is-active')); button.classList.add('is-active'); showInspector(flow.nodes.find(item => item.id === button.dataset.nodeId)); }));
  }

  function resetInspector() { inspector.innerHTML = '<div class="inspector-empty"><span class="inspector-cross">＋</span><strong>选择一个节点</strong><p>查看节点说明、模型参数、输入输出，以及 Prompt 或代码摘要。</p></div>'; }
  function showInspector(node) {
    const family = typeFamily(node.type); const inputs = node.inputs.length ? node.inputs.map(value => `<code>${escapeHTML(value)}</code>`).join('') : '<span class="none-value">—</span>'; const outputs = node.outputs.length ? node.outputs.map(value => `<code>${escapeHTML(value)}</code>`).join('') : '<span class="none-value">—</span>'; const detailLabel = node.type === 'code' ? 'Code excerpt' : 'Prompt / configuration excerpt';
    inspector.innerHTML = `<div class="inspector-head"><span class="inspector-type type-text-${family}">${nodeTypeLabel(node.type)} · ${escapeHTML(node.id)}</span><h3>${escapeHTML(node.title)}</h3><p>${escapeHTML(node.description || '暂无节点说明')}</p></div>${(node.model || node.temperature) ? `<div class="inspector-model">${node.model ? `<span>MODEL <b>${escapeHTML(node.model)}</b></span>` : ''}${node.temperature ? `<span>TEMP <b>${escapeHTML(node.temperature)}</b></span>` : ''}</div>` : ''}<div class="io-block"><span>INPUTS</span><div>${inputs}</div></div><div class="io-block"><span>OUTPUTS</span><div>${outputs}</div></div>${node.detail ? `<div class="detail-block"><span>${detailLabel}</span><pre>${escapeHTML(node.detail)}</pre><small>为阅读体验展示摘要，内容来自导出的 Coze workflow 文件。</small></div>` : '<div class="detail-missing">该节点没有可展示的 Prompt 或代码配置。</div>'}`;
  }

  function applyTransform() { world.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`; }
  function fitView() { const rect = viewport.getBoundingClientRect(); const scale = Math.min(1, Math.max(0.1, Math.min((rect.width - 48) / worldSize.width, (rect.height - 48) / worldSize.height))); transform = { x: (rect.width - worldSize.width * scale) / 2, y: (rect.height - worldSize.height * scale) / 2, scale }; applyTransform(); }
  function zoomAt(nextScale, clientX, clientY) { const rect = viewport.getBoundingClientRect(); const px = clientX - rect.left; const py = clientY - rect.top; const old = transform.scale; const scale = Math.min(1.8, Math.max(0.08, nextScale)); transform.x = px - (px - transform.x) * (scale / old); transform.y = py - (py - transform.y) * (scale / old); transform.scale = scale; applyTransform(); }
  viewport.addEventListener('wheel', event => { event.preventDefault(); zoomAt(transform.scale * (event.deltaY > 0 ? 0.9 : 1.1), event.clientX, event.clientY); }, { passive: false });
  viewport.addEventListener('pointerdown', event => { if (event.target.closest('.canvas-node')) return; drag = { x: event.clientX, y: event.clientY, tx: transform.x, ty: transform.y }; viewport.setPointerCapture(event.pointerId); viewport.classList.add('is-dragging'); });
  viewport.addEventListener('pointermove', event => { if (!drag) return; transform.x = drag.tx + event.clientX - drag.x; transform.y = drag.ty + event.clientY - drag.y; applyTransform(); });
  viewport.addEventListener('pointerup', () => { drag = null; viewport.classList.remove('is-dragging'); }); viewport.addEventListener('pointercancel', () => { drag = null; viewport.classList.remove('is-dragging'); });
  document.querySelector('#fit-view').addEventListener('click', fitView);
  document.querySelector('#zoom-in').addEventListener('click', () => { const r = viewport.getBoundingClientRect(); zoomAt(transform.scale * 1.2, r.left + r.width / 2, r.top + r.height / 2); });
  document.querySelector('#zoom-out').addEventListener('click', () => { const r = viewport.getBoundingClientRect(); zoomAt(transform.scale / 1.2, r.left + r.width / 2, r.top + r.height / 2); });
  document.querySelector('#back-folders').addEventListener('click', () => showOnly(folderView)); document.querySelector('#back-workflows').addEventListener('click', () => showOnly(workflowView)); window.addEventListener('resize', () => { if (!canvasView.hidden) fitView(); });
  renderFolders();
})();
