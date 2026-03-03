// Modal system for data entry forms

let currentModal = null;

export function openModal(title, formHTML, onSubmit) {
  closeModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">${title}</h2>
        <button class="modal-close" id="modal-close-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <form id="modal-form" class="modal-body">
        ${formHTML}
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="modal-cancel-btn">취소</button>
          <button type="submit" class="btn btn-primary">저장</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));

  const close = () => closeModal();
  overlay.querySelector('#modal-close-btn').addEventListener('click', close);
  overlay.querySelector('#modal-cancel-btn').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#modal-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    onSubmit(data);
    close();
  });

  currentModal = overlay;

  // Focus first input
  const firstInput = overlay.querySelector('input, select, textarea');
  if (firstInput) setTimeout(() => firstInput.focus(), 100);
}

export function closeModal() {
  if (currentModal) {
    currentModal.classList.remove('active');
    setTimeout(() => { if (currentModal && currentModal.parentNode) currentModal.parentNode.removeChild(currentModal); currentModal = null; }, 200);
  }
}

// Confirm dialog — returns Promise<boolean>
export function confirmDialog(message, { confirmText = '확인', danger = false } = {}) {
  return new Promise((resolve) => {
    closeModal();

    let resolved = false;
    const safeResolve = (val) => { if (!resolved) { resolved = true; resolve(val); } };

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px">
        <div class="modal-header">
          <h2 class="modal-title">확인</h2>
          <button class="modal-close" id="confirm-close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="font-size:15px;color:var(--color-text-secondary);line-height:1.6">${message}</p>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="confirm-cancel-btn">취소</button>
            <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-ok-btn">${confirmText}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    const closeAndResolve = (val) => {
      overlay.classList.remove('active');
      setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
      safeResolve(val);
    };

    overlay.querySelector('#confirm-ok-btn').addEventListener('click', () => closeAndResolve(true));
    overlay.querySelector('#confirm-cancel-btn').addEventListener('click', () => closeAndResolve(false));
    overlay.querySelector('#confirm-close-btn').addEventListener('click', () => closeAndResolve(false));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAndResolve(false); });
  });
}

// Toast notification
export function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Form field helpers
export function formField(name, label, type = 'text', options = {}) {
  const { required = false, placeholder = '', value = '', selectOptions = [], step = '' } = options;
  const req = required ? 'required' : '';

  if (type === 'select') {
    return `
      <div class="form-group">
        <label class="form-label" for="field-${name}">${label}</label>
        <select class="form-input" name="${name}" id="field-${name}" ${req}>
          <option value="">선택하세요</option>
          ${selectOptions.map(o => `<option value="${o.value || o}" ${(o.value || o) === value ? 'selected' : ''}>${o.label || o}</option>`).join('')}
        </select>
      </div>
    `;
  }

  const listAttr = options.list ? `list="${options.list}"` : '';
  const datalist = options.listData ? `
    <datalist id="${options.list}">
      ${options.listData.map(d => `<option value="${d.value || d}">${d.label || d}</option>`).join('')}
    </datalist>
  ` : '';

  if (type === 'textarea') {
    return `
      <div class="form-group">
        <label class="form-label" for="field-${name}">${label}</label>
        <textarea class="form-input form-textarea" name="${name}" id="field-${name}" placeholder="${placeholder}" ${req}>${value}</textarea>
      </div>
    `;
  }

  return `
    <div class="form-group">
      <label class="form-label" for="field-${name}">${label}</label>
      <input class="form-input" type="${type}" name="${name}" id="field-${name}" placeholder="${placeholder}" value="${value}" ${step ? `step="${step}"` : ''} ${listAttr} ${req} />
      ${datalist}
    </div>
  `;
}

export function updateFormField(name, value) {
  const input = document.getElementById(`field-${name}`);
  if (input) {
    if (input.type === 'number' && typeof value === 'number') {
      const step = input.getAttribute('step') || '1';
      const decimals = step.includes('0.') ? step.split('.')[1].length : 0;
      input.value = value.toFixed(decimals);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

export function formRow(...fields) {
  return `<div class="form-row">${fields.join('')}</div>`;
}
