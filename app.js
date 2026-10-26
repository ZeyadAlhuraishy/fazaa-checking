(() => {
  'use strict';

  const STORAGE_KEY = 'fazza_vehicle_inspection_draft_v1';
  const PHONE_URL = 'https://wa.me/966575003013';
  const statuses = [
    { value: 'excellent', label: 'ممتاز' },
    { value: 'good', label: 'جيد' },
    { value: 'followup', label: 'يحتاج متابعة' },
    { value: 'replace', label: 'يحتاج تغيير' },
    { value: 'damaged', label: 'تالف' },
    { value: 'uninspectable', label: 'غير قابل للفحص' }
  ];
  const points = [
    { id: 1, name: 'فحص مروحة الرديتر', group: 'electric' },
    { id: 2, name: 'فحص الكويلات', group: 'electric' },
    { id: 3, name: 'فحص البواجي', group: 'electric' },
    { id: 4, name: 'فحص البخاخات', group: 'electric' },
    { id: 5, name: 'فحص الدينمو', group: 'electric' },
    { id: 6, name: 'فحص البطارية', group: 'electric' },
    { id: 7, name: 'فحص المكيف', group: 'electric' },
    { id: 8, name: 'فحص الظفيرة', group: 'electric' },
    { id: 9, name: 'فحص الاصطبات والأنوار', group: 'electric' },
    { id: 10, name: 'فحص المساحات', group: 'electric' },
    { id: 11, name: 'فحص كمبيوتر', group: 'electric' },
    { id: 12, name: 'فحص حالة المحرك', group: 'mechanical' },
    { id: 13, name: 'فحص الفحمات', group: 'mechanical' },
    { id: 14, name: 'فحص كراسي المكينة', group: 'mechanical' },
    { id: 15, name: 'فحص كراسي المساعدات', group: 'mechanical' },
    { id: 16, name: 'فحص المساعدات', group: 'mechanical' },
    { id: 17, name: 'فحص الأقمشة', group: 'mechanical' },
    { id: 18, name: 'فحص مسامير التوازن', group: 'mechanical' },
    { id: 19, name: 'فحص ربلات عمود التوازن', group: 'mechanical' },
    { id: 20, name: 'فحص المقصات', group: 'mechanical' },
    { id: 21, name: 'فحص الرمان', group: 'mechanical' },
    { id: 22, name: 'فحص الفرنجات', group: 'mechanical' },
    { id: 23, name: 'فحص العكوس', group: 'mechanical' },
    { id: 24, name: 'فحص فلتر الهواء', group: 'mechanical' },
    { id: 25, name: 'فحص فلتر المكيف', group: 'mechanical' },
    { id: 26, name: 'فحص القير', group: 'mechanical' },
    { id: 27, name: 'فحص خلايا بطاريات الليثيوم', group: 'mechanical' },
    { id: 28, name: 'فحص خفض مياه الرديتر', group: 'mechanical' },
    { id: 29, name: 'فحص الكفرات', group: 'mechanical' }
  ];
  const fields = ['customerName', 'customerPhone', 'carType', 'modelYear', 'plate', 'vin', 'odometer', 'reportNo', 'inspectionDate', 'technician', 'overallStatus', 'finalNotes'];
  const signatures = { technician: 'tech-signature', customer: 'customer-signature' };
  const form = document.getElementById('report-form');
  const groupRoot = document.getElementById('inspection-groups');
  const saveState = document.getElementById('save-state');
  let saveTimer = null;
  let isRestoring = false;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function renderGroup(title, subtitle, icon, groupName) {
    const groupPoints = points.filter(point => point.group === groupName);
    const articles = groupPoints.map(point => {
      const options = statuses.map(status => `
        <label class="status-option" data-value="${status.value}">
          <input type="radio" name="status-${point.id}" value="${status.value}" aria-label="${escapeHtml(status.label)} — ${escapeHtml(point.name)}">
          <span>${escapeHtml(status.label)}</span>
        </label>`).join('');
      return `
        <article class="inspection-item" data-point="${point.id}">
          <div class="point-title"><span class="point-number">${point.id.toString().padStart(2, '0')}</span><span class="point-name">${escapeHtml(point.name)}</span></div>
          <div class="status-options" role="radiogroup" aria-label="حالة ${escapeHtml(point.name)}">${options}</div>
          <input class="point-note" type="text" id="note-${point.id}" name="note-${point.id}" placeholder="ملاحظة لهذه النقطة (اختياري)" aria-label="ملاحظة ${escapeHtml(point.name)}">
        </article>`;
    }).join('');
    return `<section class="inspection-group" aria-label="${title}">
      <div class="inspection-group-head"><span class="group-icon" aria-hidden="true">${icon}</span><strong>${title}</strong><small>${subtitle}</small></div>
      ${articles}
    </section>`;
  }

  groupRoot.innerHTML = renderGroup('الكهرباء', '11 نقطة فحص', 'ϟ', 'electric') + renderGroup('الميكانيكا', '18 نقطة فحص', '⚙', 'mechanical');

  function todayLocal() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }

  const dateInput = document.getElementById('inspectionDate');
  dateInput.value = todayLocal();

  function getStatus(pointId) {
    const selected = form.querySelector(`input[name="status-${pointId}"]:checked`);
    return selected ? selected.value : '';
  }

  function snapshot() {
    const data = {};
    fields.forEach(id => { data[id] = document.getElementById(id)?.value || ''; });
    data.statuses = {};
    data.notes = {};
    points.forEach(point => {
      data.statuses[point.id] = getStatus(point.id);
      data.notes[point.id] = document.getElementById(`note-${point.id}`).value || '';
    });
    data.signatures = {};
    Object.entries(signatures).forEach(([key, id]) => {
      const canvas = document.getElementById(id);
      data.signatures[key] = canvas.dataset.image || '';
    });
    return data;
  }

  function saveDraft(showMessage = true) {
    if (isRestoring) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
      saveState.textContent = 'حُفظت المسودة على هذا الجهاز';
      if (!showMessage) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => { saveState.textContent = 'حفظ تلقائي'; }, 2400);
    } catch (error) {
      saveState.textContent = 'تعذر الحفظ المحلي';
    }
  }

  function restoreDraft() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      saveState.textContent = 'الحفظ المحلي غير متاح في هذا المتصفح';
      return false;
    }
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      isRestoring = true;
      fields.forEach(id => {
        if (Object.prototype.hasOwnProperty.call(data, id)) document.getElementById(id).value = data[id];
      });
      points.forEach(point => {
        const val = data.statuses?.[point.id];
        if (val) {
          const radio = form.querySelector(`input[name="status-${point.id}"][value="${CSS.escape(val)}"]`);
          if (radio) radio.checked = true;
        }
        document.getElementById(`note-${point.id}`).value = data.notes?.[point.id] || '';
      });
      Object.entries(signatures).forEach(([key, id]) => {
        if (data.signatures?.[key]) document.getElementById(id).__restore?.(data.signatures[key]);
      });
      isRestoring = false;
      saveState.textContent = 'استُعيدت المسودة المحفوظة';
      return true;
    } catch (error) {
      isRestoring = false;
      try { localStorage.removeItem(STORAGE_KEY); } catch (storageError) { /* التخزين المحلي غير متاح */ }
      return false;
    }
  }

  function signatureSetup(canvas) {
    const ctx = canvas.getContext('2d');
    let drawing = false;
    let hasInk = Boolean(canvas.dataset.image);
    const resize = () => {
      const saved = hasInk ? canvas.toDataURL() : '';
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const bounds = canvas.getBoundingClientRect();
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#17191c';
      if (saved) drawSavedSignature(canvas, saved);
    };
    const position = event => {
      const bounds = canvas.getBoundingClientRect();
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };
    canvas.addEventListener('pointerdown', event => {
      drawing = true;
      canvas.setPointerCapture(event.pointerId);
      const p = position(event);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    });
    canvas.addEventListener('pointermove', event => {
      if (!drawing) return;
      const p = position(event);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      hasInk = true;
    });
    const finish = () => {
      if (!drawing) return;
      drawing = false;
      if (hasInk) canvas.dataset.image = canvas.toDataURL('image/png');
      saveDraft();
    };
    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('pointercancel', finish);
    window.addEventListener('resize', resize);
    resize();
    canvas.__clear = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.dataset.image = '';
      hasInk = false;
      saveDraft();
    };
    canvas.__restore = dataUrl => {
      hasInk = true;
      drawSavedSignature(canvas, dataUrl);
    };
  }

  function drawSavedSignature(canvas, dataUrl) {
    const ctx = canvas.getContext('2d');
    const image = new Image();
    image.onload = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      ctx.save();
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.drawImage(image, 0, 0, bounds.width, bounds.height);
      ctx.restore();
      canvas.dataset.image = dataUrl;
    };
    image.src = dataUrl;
  }

  Object.values(signatures).forEach(id => signatureSetup(document.getElementById(id)));
  const hadDraft = restoreDraft();
  if (!hadDraft) dateInput.value = todayLocal();

  function statusLabel(value) {
    return statuses.find(status => status.value === value)?.label || 'لم تُحدد';
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(`${value}T12:00:00`);
    return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  }

  function updateProgress() {
    const filled = points.filter(point => getStatus(point.id)).length;
    document.getElementById('progress-count').innerHTML = `<bdi dir="ltr">${filled} / 29</bdi> مكتملة`;
    document.getElementById('progress-bar').style.width = `${(filled / 29) * 100}%`;
    const counts = statuses.map(status => ({ ...status, count: points.filter(point => getStatus(point.id) === status.value).length })).filter(item => item.count);
    const summary = document.getElementById('status-summary');
    summary.innerHTML = counts.length ? counts.map(item => `<span class="status-count">${escapeHtml(item.label)} <b>${item.count}</b></span>`).join('') : '<span class="status-count">ابدأ بتحديد حالة النقاط</span>';
  }

  function updatePrintReport() {
    const data = snapshot();
    document.querySelectorAll('[data-print]').forEach(node => {
      const key = node.dataset.print;
      const value = key === 'inspectionDate' ? formatDate(data[key]) : data[key];
      node.textContent = value || '—';
    });
    document.querySelectorAll('.print-meta-grid [data-print="odometer"]').forEach(node => {
      node.textContent = data.odometer ? `${data.odometer} كم` : '—';
    });
    const makeRows = group => points.filter(point => point.group === group).map(point => {
      const state = data.statuses[point.id];
      const note = data.notes[point.id];
      return `<tr>
        <td style="text-align:center">${point.id}</td>
        <td>${escapeHtml(point.name)}</td>
        <td class="print-state-cell" data-state="${escapeHtml(state)}">${escapeHtml(statusLabel(state))}</td>
        <td>${note ? escapeHtml(note) : '<span class="print-empty">—</span>'}</td>
      </tr>`;
    }).join('');
    document.getElementById('print-electricity').innerHTML = makeRows('electric');
    document.getElementById('print-mechanical').innerHTML = makeRows('mechanical');
    const techImage = document.getElementById('print-tech-signature');
    const customerImage = document.getElementById('print-customer-signature');
    [[techImage, data.signatures.technician], [customerImage, data.signatures.customer]].forEach(([image, source]) => {
      image.style.display = source ? 'block' : 'none';
      if (source) image.src = source;
      else image.removeAttribute('src');
    });
  }

  function refresh() {
    updateProgress();
    updatePrintReport();
  }

  form.addEventListener('input', () => {
    refresh();
    saveDraft();
  });
  form.addEventListener('change', () => {
    refresh();
    saveDraft();
  });

  document.getElementById('print-btn').addEventListener('click', async () => {
    updatePrintReport();
    const images = [document.getElementById('print-tech-signature'), document.getElementById('print-customer-signature')].filter(image => image.getAttribute('src'));
    await Promise.all(images.map(image => image.complete ? Promise.resolve() : new Promise(resolve => {
      image.onload = resolve;
      image.onerror = resolve;
      setTimeout(resolve, 1800);
    })));
    window.print();
  });

  document.getElementById('new-report-btn').addEventListener('click', () => {
    const hasContent = fields.some(id => document.getElementById(id).value.trim()) || points.some(point => getStatus(point.id) || document.getElementById(`note-${point.id}`).value.trim()) || Object.values(signatures).some(id => document.getElementById(id).dataset.image);
    if (hasContent && !window.confirm('هل تريد مسح التقرير الحالي وبدء تقرير جديد؟')) return;
    form.reset();
    points.forEach(point => { document.getElementById(`note-${point.id}`).value = ''; });
    Object.values(signatures).forEach(id => document.getElementById(id).__clear?.());
    dateInput.value = todayLocal();
    localStorage.removeItem(STORAGE_KEY);
    saveState.textContent = 'بدأ تقرير جديد';
    refresh();
  });

  document.querySelectorAll('.clear-signature').forEach(button => {
    button.addEventListener('click', () => document.getElementById(button.dataset.pad).__clear?.());
  });

  refresh();
})();
