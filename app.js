// ===== Notes App =====
const STORAGE_KEY = 'mothakrati-notes';
const THEME_KEY = 'mothakrati-theme';

let notes = [];
let editingId = null;
let selectedColor = '#fef3c7';

// DOM Elements
const notesContainer = document.getElementById('notesContainer');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const addNoteBtn = document.getElementById('addNoteBtn');
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const noteTitle = document.getElementById('noteTitle');
const noteContent = document.getElementById('noteContent');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const closeModal = document.getElementById('closeModal');
const themeToggle = document.getElementById('themeToggle');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const toast = document.getElementById('toast');
const colorBtns = document.querySelectorAll('.color-btn');

// ===== Init =====
function init() {
  loadTheme();
  loadNotes();
  renderNotes();
  bindEvents();
}

// ===== Storage =====
function loadNotes() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    notes = data ? JSON.parse(data) : [];
  } catch {
    notes = [];
  }
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// ===== Theme =====
function loadTheme() {
  const theme = localStorage.getItem(THEME_KEY) || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
}

// ===== Render =====
function renderNotes(filter = '') {
  const query = filter.trim().toLowerCase();
  const filtered = query
    ? notes.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query)
      )
    : notes;

  // Sort by newest first
  filtered.sort((a, b) => b.updatedAt - a.updatedAt);

  notesContainer.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.add('show');
    notesContainer.style.display = 'none';
    return;
  }

  emptyState.classList.remove('show');
  notesContainer.style.display = 'grid';

  filtered.forEach(note => {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.style.background = note.color || '#fef3c7';
    card.style.borderColor = 'transparent';

    // Dark mode: slightly adjust if needed, but keep original colors

    card.innerHTML = `
      <button class="delete-btn" data-id="${note.id}" title="حذف">🗑️</button>
      <div class="note-title">${escapeHtml(note.title) || 'بدون عنوان'}</div>
      <div class="note-content">${escapeHtml(note.content)}</div>
      <div class="note-date">${formatDate(note.updatedAt)}</div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.delete-btn')) return;
      openEditModal(note.id);
    });

    card.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteNote(note.id);
    });

    notesContainer.appendChild(card);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ===== Modal =====
function openAddModal() {
  editingId = null;
  modalTitle.textContent = 'ملاحظة جديدة';
  noteTitle.value = '';
  noteContent.value = '';
  selectedColor = '#fef3c7';
  updateColorButtons();
  modalOverlay.classList.add('show');
  noteTitle.focus();
}

function openEditModal(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;

  editingId = id;
  modalTitle.textContent = 'تعديل الملاحظة';
  noteTitle.value = note.title;
  noteContent.value = note.content;
  selectedColor = note.color || '#fef3c7';
  updateColorButtons();
  modalOverlay.classList.add('show');
  noteTitle.focus();
}

function closeModalFn() {
  modalOverlay.classList.remove('show');
  editingId = null;
}

function updateColorButtons() {
  colorBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === selectedColor);
  });
}

// ===== CRUD =====
function saveNote() {
  const title = noteTitle.value.trim();
  const content = noteContent.value.trim();

  if (!title && !content) {
    showToast('اكتب شيئاً قبل الحفظ');
    return;
  }

  const now = Date.now();

  if (editingId) {
    const note = notes.find(n => n.id === editingId);
    if (note) {
      note.title = title;
      note.content = content;
      note.color = selectedColor;
      note.updatedAt = now;
    }
    showToast('تم تحديث الملاحظة ✓');
  } else {
    notes.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(now) + Math.random().toString(36).slice(2),
      title,
      content,
      color: selectedColor,
      createdAt: now,
      updatedAt: now
    });
    showToast('تم حفظ الملاحظة ✓');
  }

  saveNotes();
  renderNotes(searchInput.value);
  closeModalFn();
}

function deleteNote(id) {
  if (!confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) return;
  notes = notes.filter(n => n.id !== id);
  saveNotes();
  renderNotes(searchInput.value);
  showToast('تم حذف الملاحظة');
}

// ===== Export / Import =====
function exportNotes() {
  if (notes.length === 0) {
    showToast('لا توجد ملاحظات للتصدير');
    return;
  }
  const data = JSON.stringify(notes, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mothakrati-notes-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('تم تصدير الملاحظات');
}

function importNotes(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('صيغة غير صحيحة');

      imported.forEach(n => {
        if (!n.id) n.id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
        if (!n.updatedAt) n.updatedAt = Date.now();
      });

      notes = [...notes, ...imported];
      // Remove duplicates by id
      const map = new Map();
      notes.forEach(n => map.set(n.id, n));
      notes = Array.from(map.values());

      saveNotes();
      renderNotes(searchInput.value);
      showToast(`تم استيراد ${imported.length} ملاحظة`);
    } catch {
      showToast('فشل الاستيراد - تأكد من صحة الملف');
    }
  };
  reader.readAsText(file);
}

// ===== Toast =====
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===== Events =====
function bindEvents() {
  addNoteBtn.addEventListener('click', openAddModal);
  saveBtn.addEventListener('click', saveNote);
  cancelBtn.addEventListener('click', closeModalFn);
  closeModal.addEventListener('click', closeModalFn);

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModalFn();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModalFn();
    if (e.key === 'Enter' && e.ctrlKey && modalOverlay.classList.contains('show')) {
      saveNote();
    }
  });

  searchInput.addEventListener('input', () => renderNotes(searchInput.value));

  themeToggle.addEventListener('click', toggleTheme);
  exportBtn.addEventListener('click', exportNotes);
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', (e) => {
    if (e.target.files[0]) {
      importNotes(e.target.files[0]);
      e.target.value = '';
    }
  });

  colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedColor = btn.dataset.color;
      updateColorButtons();
    });
  });
}

// Start
init();
