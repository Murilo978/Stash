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
    const dataToSave = {
      tasks: tasks,
      palette: currentPalette,
      selectedColorIndex: selectedColorIndex,
      currentThemeName: currentThemeName
    };
    localStorage.setItem('stash_app_data', JSON.stringify(dataToSave));
  }
  
  function loadStored() {
    try {
      const raw = localStorage.getItem('stash_app_data');
      if (raw) {
        const data = JSON.parse(raw);
        tasks = data.tasks || [];
        if (data.palette && Array.isArray(data.palette) && data.palette.length > 0) {
          currentPalette = data.palette;
        } else {
          currentPalette = [...THEMES["Warm Sunset"]];
        }
        selectedColorIndex = data.selectedColorIndex || 0;
        currentThemeName = data.currentThemeName || "Warm Sunset";
        if (selectedColorIndex >= currentPalette.length) selectedColorIndex = 0;
        
        // Garantir que todas as tasks tenham description
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
    const dots = document.querySelectorAll('.color-dot');
    dots.forEach((dot, idx) => {
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
    
    tasks = tasks.map((task, idx) => {
      const newColor = currentPalette[idx % currentPalette.length];
      return { ...task, color: newColor };
    });
    
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
    const themeNames = Object.keys(THEMES);
    
    themeNames.forEach(themeName => {
      const colors = THEMES[themeName];
      const card = document.createElement('div');
      card.className = 'theme-card';
      if (currentThemeName === themeName) card.classList.add('active-theme');
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'theme-name';
      nameSpan.innerText = themeName;
      
      const previewDiv = document.createElement('div');
      previewDiv.className = 'theme-colors-preview';
      
      colors.forEach(col => {
        const dot = document.createElement('div');
        dot.className = 'preview-dot';
        dot.style.backgroundColor = col;
        dot.style.border = '1px solid rgba(0,0,0,0.15)';
        if (col === "#69FFF1" || col === "#F9DF74" || col === "#F9EDCC") {
          dot.style.border = '1px solid rgba(0,0,0,0.4)';
        }
        previewDiv.appendChild(dot);
      });
      
      card.appendChild(nameSpan);
      card.appendChild(previewDiv);
      card.addEventListener('click', () => {
        applyTheme(themeName);
        buildThemeModal();
        document.getElementById('themeModal')?.classList.remove('active');
      });
      container.appendChild(card);
    });
  }
  
  // ======================== RENDER TASKS ========================
  function renderAll() {
    const list = document.getElementById('task-list');
    const empty = document.getElementById('empty-state');
    if (!list) return;
    list.querySelectorAll('.task-item').forEach(el => el.remove());
    if (tasks.length === 0) {
      empty.style.display = '';
    } else {
      empty.style.display = 'none';
      tasks.forEach((t) => list.appendChild(createItem(t)));
    }
    updateCount();
  }
  
  function createItem(task) {
    const item = document.createElement('div');
    item.className = 'task-item';
    item.dataset.id = task.id;
    const taskColor = task.color || currentPalette[0];
    const hasDescHint = task.description && task.description.trim() !== '' ? '<i class="bi bi-file-text-fill task-has-desc"></i>' : '';
    
    item.innerHTML = `
      <div class="task-pill" style="background:${taskColor}">
        <span class="task-pill-text">${escHtml(task.text)} ${hasDescHint}</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="task-edit" data-id="${task.id}" title="Editar"><i class="bi bi-pencil-square"></i></button>
          <span class="drag-handle">⠿</span>
          <button class="task-delete" data-id="${task.id}" title="Remover">×</button>
        </div>
      </div>
    `;
    
    const pill = item.querySelector('.task-pill');
    const editBtn = item.querySelector('.task-edit');
    const deleteBtn = item.querySelector('.task-delete');
    
    pill.addEventListener('touchstart', onDragStart, { passive: false });
    pill.addEventListener('mousedown', onDragStart);
    
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
  
  function escHtml(s) {
    if (!s) return '';
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  
  function updateCount() {
    const el = document.getElementById('task-count');
    if (!el) return;
    const n = tasks.length;
    el.textContent = n === 0 ? '0 tasks' : n === 1 ? '1 task' : `${n} tasks`;
  }
  
  // ======================== RESET TASKS ========================
  function resetAllTasks() {
    const resetBtn = document.getElementById('resetBtn');
    if (!resetBtn) return;
    
    resetBtn.classList.remove('gangorra-animation');
    void resetBtn.offsetWidth;
    resetBtn.classList.add('gangorra-animation');
    
    setTimeout(() => {
      resetBtn.classList.remove('gangorra-animation');
    }, 350);
    
    if (tasks.length === 0) return;
    
    tasks = [];
    save();
    renderAll();
  }
  
  // ======================== ADD TASK ========================
  function addTask() {
    const input = document.getElementById('task-input');
    const text = input.value.trim();
    if (!text) { 
      input.focus(); 
      return; 
    }
  
    const newColor = getNextColor();
    const newTask = { 
      id: Date.now().toString(), 
      text: text, 
      color: newColor,
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
    if (list.firstChild) {
      list.insertBefore(item, list.firstChild);
    } else {
      list.appendChild(item);
    }
  
    updateCount();
    advanceColorPickerUI();
    input.value = '';
    input.focus();
    
    setTimeout(() => {
      item.classList.remove('new');
    }, 300);
  }
  
  // ======================== DELETE TASK ========================
  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    save();
    const el = document.querySelector(`[data-id="${id}"]`);
    if (el) {
      el.style.transition = 'opacity .2s, transform .2s';
      el.style.opacity = '0';
      el.style.transform = 'translateX(60px)';
      setTimeout(() => { 
        el.remove(); 
        updateCount(); 
        if (tasks.length === 0) document.getElementById('empty-state').style.display = '';
      }, 220);
    } else {
      renderAll();
    }
  }
  
  // ======================== MODAL DE EDIÇÃO ========================
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
  
  // ======================== DRAG & DROP ========================
  function onDragStart(e) {
    if (dragState) return;
    e.preventDefault();
    const item = e.currentTarget.closest('.task-item');
    if (!item) return;
    const touch = e.touches ? e.touches[0] : e;
    const rect = item.getBoundingClientRect();
    item.classList.add('dragging');
    if (navigator.vibrate) navigator.vibrate(12);
    
    dragState = {
      item, 
      id: item.dataset.id, 
      offsetY: touch.clientY - rect.top,
      startY: touch.clientY, 
      currentY: touch.clientY, 
      clone: null
    };
    
    const clone = item.cloneNode(true);
    clone.style.cssText = `position:fixed; left:${rect.left}px; top:${rect.top}px; width:${rect.width}px; z-index:999; pointer-events:none; transition:none; opacity:.97;`;
    clone.querySelector('.task-delete')?.setAttribute('style', 'opacity:0');
    clone.querySelector('.task-edit')?.setAttribute('style', 'opacity:0');
    document.body.appendChild(clone);
    dragState.clone = clone;
    item.classList.add('placeholder');
    
    if (e.touches) {
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
    const dy = touch.clientY - dragState.currentY;
    dragState.currentY = touch.clientY;
    const cloneRect = dragState.clone.getBoundingClientRect();
    dragState.clone.style.top = (cloneRect.top + dy) + 'px';
    
    const list = document.getElementById('task-list');
    const items = [...list.querySelectorAll('.task-item:not(.placeholder)')];
    const cloneCenterY = dragState.clone.getBoundingClientRect().top + dragState.clone.getBoundingClientRect().height / 2;
    
    let targetItem = null, insertBefore = false;
    for (const it of items) {
      const r = it.getBoundingClientRect();
      const centerY = r.top + r.height / 2;
      if (cloneCenterY < centerY) { 
        targetItem = it; 
        insertBefore = true; 
        break; 
      }
      targetItem = it; 
      insertBefore = false;
    }
    
    const placeholder = list.querySelector('.task-item.placeholder');
    if (targetItem && placeholder) {
      if (insertBefore) list.insertBefore(placeholder, targetItem);
      else targetItem.after(placeholder);
    } else if (!items.length && placeholder) {
      list.insertBefore(placeholder, list.firstChild);
    }
  }
  
  function onDragEnd(e) {
    if (!dragState) return;
    document.removeEventListener('touchmove', onDragMove);
    document.removeEventListener('touchend', onDragEnd);
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    
    const { item, clone } = dragState;
    dragState = null;
    const placeholder = item;
    const rect = placeholder.getBoundingClientRect();
    clone.style.transition = 'top .2s cubic-bezier(.34,1.4,.64,1), left .2s';
    clone.style.top = rect.top + 'px';
    clone.style.left = rect.left + 'px';
    
    setTimeout(() => {
      clone.remove();
      item.classList.remove('dragging', 'placeholder');
      const list = document.getElementById('task-list');
      const newOrder = [...list.querySelectorAll('.task-item')].map(el => el.dataset.id);
      tasks = newOrder.map(tid => tasks.find(t => t.id === tid)).filter(Boolean);
      save();
    }, 200);
  }
  
  // ======================== UI HELPERS ========================
  function buildColorRow() {
    const row = document.getElementById('color-row');
    if (!row) return;
    row.innerHTML = '';
    
    currentPalette.forEach((c, idx) => {
      const dot = document.createElement('div');
      dot.className = 'color-dot' + (idx === selectedColorIndex ? ' active' : '');
      dot.style.background = c;
      dot.style.border = `2px solid ${idx === selectedColorIndex ? 'white' : 'rgba(255,255,255,0.5)'}`;
      dot.title = `Cor ${idx + 1}`;
      
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
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
  
  // ======================== EVENTOS ========================
  function setupEventListeners() {
    const startBtn = document.getElementById('startBtn');
    const backBtn = document.getElementById('backBtn');
    const addBtn = document.getElementById('addBtn');
    const taskInput = document.getElementById('task-input');
    const themeMenuBtn = document.getElementById('themeMenuBtn');
    const closeThemeBtn = document.getElementById('closeThemeBtn');
    const modalOverlay = document.getElementById('themeModal');
    const resetBtn = document.getElementById('resetBtn');
    const editCancelBtn = document.getElementById('editCancelBtn');
    const editSaveBtn = document.getElementById('editSaveBtn');
    const editModal = document.getElementById('editModal');
    
    if (startBtn) startBtn.addEventListener('click', goToMain);
    if (backBtn) backBtn.addEventListener('click', goToSplash);
    if (addBtn) addBtn.addEventListener('click', addTask);
    if (resetBtn) resetBtn.addEventListener('click', resetAllTasks);
    if (themeMenuBtn) themeMenuBtn.addEventListener('click', openThemeModal);
    if (closeThemeBtn) closeThemeBtn.addEventListener('click', closeThemeModal);
    if (editCancelBtn) editCancelBtn.addEventListener('click', closeEditModal);
    if (editSaveBtn) editSaveBtn.addEventListener('click', saveEdit);
    if (modalOverlay) modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeThemeModal();
    });
    if (editModal) editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeEditModal();
    });
    if (taskInput) taskInput.addEventListener('keydown', (e) => { 
      if (e.key === 'Enter') {
        e.preventDefault();
        addTask(); 
      }
    });
  }
  
  // ======================== INICIALIZAÇÃO ========================
  loadStored();
  tasks = tasks.map((t, idx) => {
    if (!t.color || t.color === 'undefined' || !currentPalette.includes(t.color)) {
      return { ...t, color: currentPalette[idx % currentPalette.length], description: t.description || '' };
    }
    return { ...t, description: t.description || '' };
  });
  save();
  setupEventListeners();
