// ======================== TEMAS ========================
const THEMES = {
  "Vibrant Green": ["#32CD32", "#228B22", "#2E8B57", "#3CB371", "#90EE90"],
  "Warm Sunset": ["#DF3B57", "#EF8354", "#D8A47F", "#F9DF74", "#FF8C00"],
  "Sunset Ember": ["#61210F", "#EA2B1F", "#EDAE49", "#F9DF74", "#F9EDCC"],
  "Coastal Breeze": ["#16697A", "#489FB5", "#82C0CC", "#EDE7E3", "#FFA62B"],
  "Aurora": ["#0F172A", "#1E3A5F", "#2DD4BF", "#38BDF8", "#E2E8F0"],
  "Coffee Shop": ["#C4A484", "#D2B48C", "#DEB887", "#E8C99B", "#F5DEB3"]
};

let tasks = [];
let dragState = null;
let currentPalette = [...THEMES["Warm Sunset"]];
let selectedColorIndex = 0;
let currentThemeName = "Warm Sunset";
let currentEditingTaskId = null;

// ======================== STORAGE ========================
function save() {
  localStorage.setItem('stash_app_data', JSON.stringify({
    tasks, palette: currentPalette, selectedColorIndex, currentThemeName
  }));
}

function loadStored() {
  try {
    const raw = localStorage.getItem('stash_app_data');
    if (raw) {
      const data = JSON.parse(raw);
      tasks = data.tasks || [];
      currentPalette = data.palette?.length ? data.palette : [...THEMES["Warm Sunset"]];
      selectedColorIndex = data.selectedColorIndex || 0;
      currentThemeName = data.currentThemeName || "Warm Sunset";
      if (selectedColorIndex >= currentPalette.length) selectedColorIndex = 0;
      tasks = tasks.map(t => ({ ...t, description: t.description || '' }));
    } else {
      tasks = [];
      currentPalette = [...THEMES["Warm Sunset"]];
      selectedColorIndex = 0;
      currentThemeName = "Warm Sunset";
    }
  } catch { 
    tasks = []; 
    currentPalette = [...THEMES["Warm Sunset"]];
    selectedColorIndex = 0;
    currentThemeName = "Warm Sunset";
  }
}

// ======================== COR CÍCLICA ========================
function getNextColor() {
  const color = currentPalette[selectedColorIndex % currentPalette.length];
  selectedColorIndex = (selectedColorIndex + 1) % currentPalette.length;
  return color;
}

function advanceColorPickerUI() {
  document.querySelectorAll('.color-dot').forEach((dot, idx) => {
    if (idx === selectedColorIndex) dot.classList.add('active');
    else dot.classList.remove('active');
  });
}

// ======================== APLICAR TEMA ========================
function applyTheme(themeName) {
  if (!THEMES[themeName]) return;
  currentPalette = [...THEMES[themeName]];
  currentThemeName = themeName;
  if (selectedColorIndex >= currentPalette.length) selectedColorIndex = 0;
  tasks = tasks.map((task, idx) => ({ ...task, color: currentPalette[idx % currentPalette.length] }));
  renderAll();
  buildColorRow();
  advanceColorPickerUI();
  save();
}

// ======================== RENDER TEMA MODAL ========================
function buildThemeModal() {
  const container = document.getElementById('themeListContainer');
  if (!container) return;
  container.innerHTML = '';
  Object.keys(THEMES).forEach(themeName => {
    const colors = THEMES[themeName];
    const card = document.createElement('div');
    card.className = 'theme-card' + (currentThemeName === themeName ? ' active-theme' : '');
    card.innerHTML = `
      <span class="theme-name">${themeName}</span>
      <div class="theme-colors-preview">
        ${colors.map(col => `<div class="preview-dot" style="background:${col}"></div>`).join('')}
      </div>
    `;
    card.addEventListener('click', () => {
      applyTheme(themeName);
      buildThemeModal();
      document.getElementById('themeModal')?.classList.remove('active');
    });
    container.appendChild(card);
  });
}

function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function updateCount() {
  const el = document.getElementById('task-count');
  if (el) {
    const n = tasks.length;
    el.textContent = n === 0 ? '0 tasks' : n === 1 ? '1 task' : `${n} tasks`;
  }
}

// ======================== CREATE ITEM ========================
function createItem(task) {
    const item = document.createElement('div');
    item.className = 'task-item';
    item.dataset.id = task.id;
    const taskColor = task.color || currentPalette[0];
    const hasDescHint = task.description && task.description.trim() !== '' ? '<i class="bi bi-file-text-fill task-has-desc"></i>' : '';
    
    // Estrutura: pill (com texto, lápis e alça) + botão deletar FORA
    item.innerHTML = `
      <div class="task-pill" style="background:${taskColor}">
        <span class="task-pill-text">${escHtml(task.text)} ${hasDescHint}</span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button class="task-edit" data-id="${task.id}" title="Editar"><i class="bi bi-pencil-square"></i></button>
          <span class="drag-handle">⠿</span>
        </div>
      </div>
      <button class="task-delete" data-id="${task.id}" title="Remover">x</button>
    `;
    
    const pill = item.querySelector('.task-pill');
    const editBtn = item.querySelector('.task-edit');
    const deleteBtn = item.querySelector('.task-delete');
    
    // ========== DRAG NA TASK (arrasta pela pill, exceto nos botões) ==========
    let touchStartX = 0, touchStartY = 0;
    let isDragging = false;
    let dragStarted = false;
    const DRAG_THRESHOLD = 8;
    
    // Início do toque na pill
    pill.addEventListener('touchstart', (e) => {
      // Se clicou no botão de editar, NÃO inicia drag
      if (e.target.closest('.task-edit')) {
        dragStarted = false;
        return;
      }
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isDragging = false;
      dragStarted = true;
    });
    
    // Movimento do toque
    pill.addEventListener('touchmove', (e) => {
      if (!dragStarted) return;
      if (e.target.closest('.task-edit')) return;
      
      const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
      const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
      
      if (!isDragging && (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD)) {
        isDragging = true;
        startDrag(item, e.touches[0]);
      }
      
      if (isDragging) {
        e.preventDefault();
        onDragMove(e);
      }
    });
    
    // Fim do toque
    pill.addEventListener('touchend', () => {
      dragStarted = false;
      isDragging = false;
    });
    
    // Eventos para mouse (desktop)
    let mouseDownX = 0, mouseDownY = 0;
    let isMouseDragging = false;
    let mouseDragStarted = false;
    
    pill.addEventListener('mousedown', (e) => {
      if (e.target.closest('.task-edit')) {
        mouseDragStarted = false;
        return;
      }
      mouseDownX = e.clientX;
      mouseDownY = e.clientY;
      isMouseDragging = false;
      mouseDragStarted = true;
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!mouseDragStarted) return;
      if (e.target.closest('.task-edit')) return;
      
      const deltaX = Math.abs(e.clientX - mouseDownX);
      const deltaY = Math.abs(e.clientY - mouseDownY);
      
      if (!isMouseDragging && (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD)) {
        isMouseDragging = true;
        startDrag(item, e);
      }
      
      if (isMouseDragging) {
        onDragMove(e);
      }
    });
    
    document.addEventListener('mouseup', () => {
      mouseDownX = 0;
      mouseDownY = 0;
      isMouseDragging = false;
      mouseDragStarted = false;
    });
    
    // ========== BOTÕES ==========
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(task.id);
    });
    
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTask(task.id);
    });
    
    return item;
  }

  function startDrag(item, touch) {
    if (dragState) return;
    
    const rect = item.getBoundingClientRect();
    item.classList.add('dragging');
    if (navigator.vibrate) navigator.vibrate(12);
    
    // Calcula o offset do clique em relação ao topo do item
    const offsetY = touch.clientY - rect.top;
    
    dragState = {
      item: item,
      id: item.dataset.id,
      startY: touch.clientY,
      currentY: touch.clientY,
      offsetY: offsetY,
      clone: null,
      placeholder: null
    };
    
    // Cria clone para feedback visual (segue o cursor)
    const clone = item.cloneNode(true);
    clone.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      z-index: 9999;
      pointer-events: none;
      transition: none;
      opacity: 0.9;
      transform: scale(1.02);
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    `;
    clone.querySelectorAll('.task-edit, .task-delete').forEach(el => {
      if (el) el.style.opacity = '0';
    });
    document.body.appendChild(clone);
    dragState.clone = clone;
    
    // Esconde o item original
    item.style.opacity = '0';
    item.style.transition = 'none';
    
    // Cria placeholder do MESMO TAMANHO da task
    const placeholder = document.createElement('div');
    placeholder.className = 'drag-placeholder';
    placeholder.style.height = rect.height + 'px';
    placeholder.style.margin = '5px 0';
    placeholder.style.borderRadius = '30px';
    placeholder.style.background = 'rgba(255,255,255,0.15)';
    placeholder.style.border = '2px dashed rgba(255,255,255,0.5)';
    placeholder.style.transition = 'all 0.2s ease';
    
    // Remove o item e insere o placeholder no lugar
    const list = document.getElementById('task-list');
    const itemIndex = [...list.children].indexOf(item);
    item.remove();
    
    if (itemIndex >= 0 && itemIndex <= list.children.length) {
      if (itemIndex === 0) {
        list.insertBefore(placeholder, list.firstChild);
      } else if (itemIndex >= list.children.length) {
        list.appendChild(placeholder);
      } else {
        list.insertBefore(placeholder, list.children[itemIndex]);
      }
    } else {
      list.appendChild(placeholder);
    }
    
    dragState.placeholder = placeholder;
    
    // Eventos de movimento
    if (touch.touches) {
      document.addEventListener('touchmove', onDragMove, { passive: false });
      document.addEventListener('touchend', onDragEnd);
    } else {
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup', onDragEnd);
    }
  }
  
  function onDragMove(e) {
    if (!dragState) return;
    e.preventDefault();
    
    const touch = e.touches ? e.touches[0] : e;
    const clone = dragState.clone;
    const placeholder = dragState.placeholder;
    
    if (!clone || !placeholder) return;
    
    // Calcula a nova posição do clone baseado no offset do clique
    const newY = touch.clientY - dragState.offsetY;
    clone.style.top = newY + 'px';
    
    // Encontra onde inserir o placeholder baseado na posição do clone
    const list = document.getElementById('task-list');
    const allItems = [...list.querySelectorAll('.task-item, .drag-placeholder')];
    const cloneCenterY = newY + (clone.offsetHeight / 2);
    
    let targetIndex = -1;
    for (let i = 0; i < allItems.length; i++) {
      const it = allItems[i];
      if (it === placeholder) continue;
      const rect = it.getBoundingClientRect();
      const itemCenterY = rect.top + (rect.height / 2);
      if (cloneCenterY < itemCenterY) {
        targetIndex = i;
        break;
      }
      targetIndex = i + 1;
    }
    
    const currentIndex = [...list.children].indexOf(placeholder);
    
    if (targetIndex !== -1 && targetIndex !== currentIndex) {
      // Move o placeholder suavemente
      if (targetIndex > currentIndex) {
        if (targetIndex < list.children.length) {
          list.insertBefore(placeholder, list.children[targetIndex]);
        } else {
          list.appendChild(placeholder);
        }
      } else if (targetIndex < currentIndex) {
        list.insertBefore(placeholder, list.children[targetIndex]);
      }
    }
  }
  
  function onDragEnd(e) {
    if (!dragState) return;
    
    document.removeEventListener('touchmove', onDragMove);
    document.removeEventListener('touchend', onDragEnd);
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    
    const { item, clone, placeholder } = dragState;
    
    // Remove o clone
    if (clone) clone.remove();
    
    // Remove o placeholder e insere o item original no lugar
    const list = document.getElementById('task-list');
    const placeholderIndex = [...list.children].indexOf(placeholder);
    
    placeholder.remove();
    
    // Restaura o item
    item.style.opacity = '';
    item.style.transition = '';
    item.classList.remove('dragging', 'placeholder');
    
    // Insere o item na posição do placeholder
    if (placeholderIndex >= 0 && placeholderIndex <= list.children.length) {
      if (placeholderIndex === 0) {
        list.insertBefore(item, list.firstChild);
      } else if (placeholderIndex >= list.children.length) {
        list.appendChild(item);
      } else {
        list.insertBefore(item, list.children[placeholderIndex]);
      }
    } else {
      list.appendChild(item);
    }
    
    // Animação suave de entrada
    item.style.animation = 'slideIn 0.2s ease';
    setTimeout(() => {
      item.style.animation = '';
    }, 200);
    
    // Atualiza a ordem das tasks
    const newOrder = [...list.querySelectorAll('.task-item')].map(el => el.dataset.id);
    tasks = newOrder.map(tid => tasks.find(t => t.id === tid)).filter(Boolean);
    save();
    
    dragState = null;
  }
function renderAll() {
  const list = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');
  if (!list) return;
  list.querySelectorAll('.task-item').forEach(el => el.remove());
  if (tasks.length === 0) {
    empty.style.display = '';
  } else {
    empty.style.display = 'none';
    tasks.forEach(t => list.appendChild(createItem(t)));
  }
  updateCount();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save();
  const el = document.querySelector(`.task-item[data-id="${id}"]`);
  if (el) {
    el.style.transition = 'opacity .2s, transform .2s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(60px)';
    setTimeout(() => { 
      el.remove(); 
      updateCount(); 
      if (tasks.length === 0) document.getElementById('empty-state').style.display = '';
    }, 200);
  } else {
    renderAll();
  }
}

function addTask() {
  const input = document.getElementById('task-input');
  const text = input.value.trim();
  if (!text) { input.focus(); return; }

  const newTask = { 
    id: Date.now().toString(), 
    text: text, 
    color: getNextColor(),
    description: '',
    createdAt: Date.now()
  };

  tasks.unshift(newTask);
  save();

  const list = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');
  if (empty) empty.style.display = 'none';
  if (!list) return;

  const item = createItem(newTask);
  item.classList.add('new');
  list.insertBefore(item, list.firstChild || null);
  if (!list.firstChild) list.appendChild(item);

  updateCount();
  advanceColorPickerUI();
  input.value = '';
  input.focus();
  setTimeout(() => item.classList.remove('new'), 300);
}

function resetAllTasks() {
  const resetBtn = document.getElementById('resetBtn');
  if (!resetBtn) return;
  resetBtn.classList.remove('gangorra-animation');
  void resetBtn.offsetWidth;
  resetBtn.classList.add('gangorra-animation');
  setTimeout(() => resetBtn.classList.remove('gangorra-animation'), 350);
  if (tasks.length === 0) return;
  tasks = [];
  save();
  renderAll();
}

function openEditModal(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  currentEditingTaskId = taskId;
  document.getElementById('editTitle').value = task.text;
  document.getElementById('editDesc').value = task.description || '';
  document.getElementById('editModal').classList.add('active');
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('active');
  currentEditingTaskId = null;
}

function saveEdit() {
  if (!currentEditingTaskId) return;
  const taskIndex = tasks.findIndex(t => t.id === currentEditingTaskId);
  if (taskIndex === -1) return;
  const newTitle = document.getElementById('editTitle').value.trim();
  if (!newTitle) return;
  tasks[taskIndex].text = newTitle;
  tasks[taskIndex].description = document.getElementById('editDesc').value.trim();
  save();
  renderAll();
  closeEditModal();
}

function buildColorRow() {
  const row = document.getElementById('color-row');
  if (!row) return;
  row.innerHTML = '';
  currentPalette.forEach((c, idx) => {
    const dot = document.createElement('div');
    dot.className = 'color-dot' + (idx === selectedColorIndex ? ' active' : '');
    dot.style.background = c;
    dot.style.border = `2px solid ${idx === selectedColorIndex ? 'white' : 'rgba(255,255,255,0.5)'}`;
    dot.addEventListener('click', () => {
      selectedColorIndex = idx;
      buildColorRow();
      advanceColorPickerUI();
      save();
    });
    row.appendChild(dot);
  });
}

function goToMain() {
  document.getElementById('splash').classList.add('hidden');
  document.getElementById('main').classList.remove('hidden');
  buildColorRow();
  renderAll();
  buildThemeModal();
  setTimeout(() => document.getElementById('task-input')?.focus(), 450);
}

function goToSplash() {
  document.getElementById('main').classList.add('hidden');
  document.getElementById('splash').classList.remove('hidden');
}

function openThemeModal() {
  buildThemeModal();
  document.getElementById('themeModal').classList.add('active');
}

function closeThemeModal() {
  document.getElementById('themeModal').classList.remove('active');
}

function setupEventListeners() {
  document.getElementById('startBtn')?.addEventListener('click', goToMain);
  document.getElementById('backBtn')?.addEventListener('click', goToSplash);
  document.getElementById('addBtn')?.addEventListener('click', addTask);
  document.getElementById('resetBtn')?.addEventListener('click', resetAllTasks);
  document.getElementById('themeMenuBtn')?.addEventListener('click', openThemeModal);
  document.getElementById('closeThemeBtn')?.addEventListener('click', closeThemeModal);
  document.getElementById('editCancelBtn')?.addEventListener('click', closeEditModal);
  document.getElementById('editSaveBtn')?.addEventListener('click', saveEdit);
  document.getElementById('themeModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('themeModal')) closeThemeModal();
  });
  document.getElementById('editModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('editModal')) closeEditModal();
  });
  document.getElementById('task-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTask(); }
  });
}

loadStored();
tasks = tasks.map((t, idx) => ({
  ...t,
  color: t.color && currentPalette.includes(t.color) ? t.color : currentPalette[idx % currentPalette.length],
  description: t.description || ''
}));
save();
setupEventListeners();
