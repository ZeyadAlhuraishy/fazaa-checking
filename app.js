(() => {
  "use strict";

  const STORAGE_KEY = "fazza_vehicle_inspection_draft_v1";
  const PHONE_URL = "https://wa.me/966575003013";
  const statuses = [
    { value: "excellent", label: "ممتاز" },
    { value: "good", label: "جيد" },
    { value: "followup", label: "يحتاج متابعة" },
    { value: "replace", label: "يحتاج تغيير" },
    { value: "damaged", label: "تالف" },
  ];
  const points = [
    { id: 1, sequence: 1, name: "فحص مروحة الرديتر", group: "engine" },
    { id: 2, sequence: 2, name: "فحص الكويلات", group: "engine" },
    { id: 3, sequence: 3, name: "فحص البواجي", group: "engine" },
    { id: 4, sequence: 4, name: "فحص البخاخات", group: "engine" },
    { id: 5, sequence: 5, name: "فحص الدينمو", group: "engine" },
    { id: 6, sequence: 6, name: "فحص البطارية", group: "engine" },
    { id: 8, sequence: 7, name: "فحص الظفيرة", group: "engine" },
    { id: 11, sequence: 8, name: "فحص كمبيوتر", group: "engine" },
    { id: 12, sequence: 9, name: "فحص حالة المحرك", group: "engine" },
    { id: 24, sequence: 10, name: "فحص فلتر الهواء", group: "engine" },
    { id: 28, sequence: 11, name: "فحص خفض مياه الرديتر", group: "engine" },
    { id: 7, sequence: 12, name: "فحص المكيف", group: "engine" },
    { id: 14, sequence: 13, name: "فحص كراسي المكينة", group: "engine" },
    { id: 26, sequence: 14, name: "فحص القير", group: "engine" },
    {
      id: 27,
      sequence: 15,
      name: "فحص خلايا بطاريات الليثيوم",
      group: "engine",
    },
    { id: 13, sequence: 16, name: "فحص الفحمات", group: "runningGear" },
    { id: 17, sequence: 17, name: "فحص الأقمشة", group: "runningGear" },
    { id: 15, sequence: 18, name: "فحص كراسي المساعدات", group: "runningGear" },
    { id: 16, sequence: 19, name: "فحص المساعدات", group: "runningGear" },
    { id: 18, sequence: 20, name: "فحص مسامير التوازن", group: "runningGear" },
    {
      id: 19,
      sequence: 21,
      name: "فحص ربلات عمود التوازن",
      group: "runningGear",
    },
    { id: 20, sequence: 22, name: "فحص المقصات", group: "runningGear" },
    { id: 21, sequence: 23, name: "فحص الرمان", group: "runningGear" },
    { id: 22, sequence: 24, name: "فحص الفرنجات", group: "runningGear" },
    { id: 23, sequence: 25, name: "فحص العكوس", group: "runningGear" },
    { id: 29, sequence: 26, name: "فحص الكفرات", group: "runningGear" },
    { id: 25, sequence: 27, name: "فحص فلتر المكيف", group: "cabin" },
    { id: 9, sequence: 28, name: "فحص الاصطبات والأنوار", group: "cabin" },
    { id: 10, sequence: 29, name: "فحص المساحات", group: "cabin" },
  ];
  const inspectionZones = [
    {
      key: "engine",
      title: "حجرة المحرك",
      subtitle: "15 نقطة — ابدأ هنا قبل الانتقال",
      icon: "01",
    },
    {
      key: "runningGear",
      title: "التعليق والفرامل",
      subtitle: "11 نقطة — اختبارات فنية وسمعية وتجريبية",
      disclaimer:
        "يُجرى الفحص فنياً، وليس فحصاً فعلياً مباشراً للمكوّنات؛ إذ يعتمد على اختبارات سمعية وتجريبية للسيارة للتعرّف على حالتها، تحقيقاً للشفافية والمصداقية مع العميل.",
      icon: "02",
    },
    { key: "cabin", title: "المقصورة", subtitle: "3 نقاط", icon: "03" },
  ];
  const readinessWeights = {
    excellent: 100,
    good: 85,
    followup: 55,
    replace: 20,
    damaged: 0,
  };
  const statusIndicators = {
    excellent: { percent: 100, color: "#16a34a", marker: "#166534" },
    good: { percent: 85, color: "#0284c7", marker: "#075985" },
    followup: { percent: 55, color: "#eab308", marker: "#854d0e" },
    replace: { percent: 20, color: "#f97316", marker: "#9a3412" },
    damaged: { percent: 0, color: "#ef4444", marker: "#991b1b" },
  };
  const fields = [
    "customerName",
    "customerPhone",
    "carType",
    "modelYear",
    "plate",
    "vin",
    "odometer",
    "reportNo",
    "inspectionDate",
    "technician",
  ];
  const signatures = {
    technician: "tech-signature",
    customer: "customer-signature",
  };
  const form = document.getElementById("report-form");
  const groupRoot = document.getElementById("inspection-groups");
  const saveState = document.getElementById("save-state");
  let saveTimer = null;
  let isRestoring = false;
  const defaultDocumentTitle = document.title;
  let printRestoreHandler = null;

  function escapeHtml(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  }

  function renderGroup(title, subtitle, icon, groupName, disclaimer = "") {
    const groupPoints = points.filter((point) => point.group === groupName);
    const articles = groupPoints
      .map((point) => {
        const options = statuses
          .map(
            (status) => `
        <label class="status-option" data-value="${status.value}">
          <input type="radio" name="status-${point.id}" value="${status.value}" aria-label="${escapeHtml(status.label)} — ${escapeHtml(point.name)}">
          <span>${escapeHtml(status.label)}</span>
        </label>`,
          )
          .join("");
        return `
        <article class="inspection-item" data-point="${point.id}">
          <div class="point-title"><span class="point-number">${point.sequence.toString().padStart(2, "0")}</span><span class="point-name">${escapeHtml(point.name)}</span></div>
          <div class="status-options" role="radiogroup" aria-label="حالة ${escapeHtml(point.name)}">${options}</div>
        </article>`;
      })
      .join("");
    return `<section class="inspection-group" aria-label="${title}">
      <div class="inspection-group-head"><span class="group-icon" aria-hidden="true">${icon}</span><strong>${title}</strong><small>${subtitle}</small></div>
      ${disclaimer ? `<p class="inspection-group-note">${escapeHtml(disclaimer)}</p>` : ""}
      ${articles}
    </section>`;
  }

  groupRoot.innerHTML = inspectionZones
    .map((zone) =>
      renderGroup(
        zone.title,
        zone.subtitle,
        zone.icon,
        zone.key,
        zone.disclaimer,
      ),
    )
    .join("");

  function todaySaudi() {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const dateParts = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  }

  const dateInput = document.getElementById("inspectionDate");
  const reportNoInput = document.getElementById("reportNo");
  dateInput.value = todaySaudi();

  function generateReportNumber(reportDate = todaySaudi()) {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(reportDate)
      ? reportDate
      : todaySaudi();
    const counterKey = `fazza_report_sequence_${date}`;
    try {
      const lastSequence = Number.parseInt(
        localStorage.getItem(counterKey) || "0",
        10,
      );
      const nextSequence =
        Number.isFinite(lastSequence) && lastSequence >= 0
          ? lastSequence + 1
          : 1;
      localStorage.setItem(counterKey, String(nextSequence));
      return `FZ-${date.replace(/-/g, "")}${String(nextSequence).padStart(3, "0")}`;
    } catch (error) {
      return `FZ-${date.replace(/-/g, "")}${String(Date.now()).slice(-6)}`;
    }
  }

  function getStatus(pointId) {
    const selected = form.querySelector(
      `input[name="status-${pointId}"]:checked`,
    );
    return selected ? selected.value : "";
  }

  function snapshot() {
    const data = {};
    fields.forEach((id) => {
      data[id] = document.getElementById(id)?.value || "";
    });
    data.statuses = {};
    points.forEach((point) => {
      data.statuses[point.id] = getStatus(point.id);
    });
    data.signatures = {};
    Object.entries(signatures).forEach(([key, id]) => {
      const canvas = document.getElementById(id);
      data.signatures[key] = canvas.dataset.image || "";
    });
    return data;
  }

  function saveDraft(showMessage = true) {
    if (isRestoring) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
      saveState.textContent = "حُفظت المسودة على هذا الجهاز";
      if (!showMessage) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        saveState.textContent = "حفظ تلقائي";
      }, 2400);
    } catch (error) {
      saveState.textContent = "تعذر الحفظ المحلي";
    }
  }

  function restoreDraft() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      saveState.textContent = "الحفظ المحلي غير متاح في هذا المتصفح";
      return false;
    }
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      isRestoring = true;
      fields.forEach((id) => {
        if (Object.prototype.hasOwnProperty.call(data, id))
          document.getElementById(id).value = data[id];
      });
      const legacyReportNo = reportNoInput.value
        .trim()
        .match(/^FZ-(\d{4})-(\d{2})-(\d{2})-(\d+)$/);
      if (legacyReportNo)
        reportNoInput.value = `FZ-${legacyReportNo[1]}${legacyReportNo[2]}${legacyReportNo[3]}${legacyReportNo[4]}`;
      points.forEach((point) => {
        const val = data.statuses?.[point.id];
        if (val) {
          const radio = form.querySelector(
            `input[name="status-${point.id}"][value="${CSS.escape(val)}"]`,
          );
          if (radio) radio.checked = true;
        }
      });
      Object.entries(signatures).forEach(([key, id]) => {
        if (data.signatures?.[key])
          document.getElementById(id).__restore?.(data.signatures[key]);
      });
      isRestoring = false;
      saveState.textContent = "استُعيدت المسودة المحفوظة";
      return true;
    } catch (error) {
      isRestoring = false;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (storageError) {
        /* التخزين المحلي غير متاح */
      }
      return false;
    }
  }

  function signatureSetup(canvas) {
    const ctx = canvas.getContext("2d");
    let drawing = false;
    let hasInk = Boolean(canvas.dataset.image);
    const resize = () => {
      const saved = hasInk ? canvas.toDataURL() : "";
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const bounds = canvas.getBoundingClientRect();
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#17191c";
      if (saved) drawSavedSignature(canvas, saved);
    };
    const position = (event) => {
      const bounds = canvas.getBoundingClientRect();
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };
    canvas.addEventListener("pointerdown", (event) => {
      drawing = true;
      canvas.setPointerCapture(event.pointerId);
      const p = position(event);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!drawing) return;
      const p = position(event);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      hasInk = true;
    });
    const finish = () => {
      if (!drawing) return;
      drawing = false;
      if (hasInk) canvas.dataset.image = canvas.toDataURL("image/png");
      saveDraft();
    };
    canvas.addEventListener("pointerup", finish);
    canvas.addEventListener("pointercancel", finish);
    window.addEventListener("resize", resize);
    resize();
    canvas.__clear = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.dataset.image = "";
      hasInk = false;
      saveDraft();
    };
    canvas.__restore = (dataUrl) => {
      hasInk = true;
      drawSavedSignature(canvas, dataUrl);
    };
  }

  function drawSavedSignature(canvas, dataUrl) {
    const ctx = canvas.getContext("2d");
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

  Object.values(signatures).forEach((id) =>
    signatureSetup(document.getElementById(id)),
  );
  const hadDraft = restoreDraft();
  if (!hadDraft) {
    dateInput.value = todaySaudi();
    reportNoInput.value = generateReportNumber(dateInput.value);
  } else {
    if (!dateInput.value) dateInput.value = todaySaudi();
    if (!reportNoInput.value.trim())
      reportNoInput.value = generateReportNumber(dateInput.value);
  }

  function statusLabel(value) {
    return (
      statuses.find((status) => status.value === value)?.label || "لم تُحدد"
    );
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(`${value}T12:00:00`);
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  }

  function updateProgress() {
    const filled = points.filter((point) => getStatus(point.id)).length;
    document.getElementById("progress-count").innerHTML =
      `<bdi dir="ltr">${filled} / 29</bdi> مكتملة`;
    document.getElementById("progress-bar").style.width =
      `${(filled / 29) * 100}%`;
    const counts = statuses
      .map((status) => ({
        ...status,
        count: points.filter((point) => getStatus(point.id) === status.value)
          .length,
      }))
      .filter((item) => item.count);
    const summary = document.getElementById("status-summary");
    summary.innerHTML = counts.length
      ? counts
          .map(
            (item) =>
              `<span class="status-count">${escapeHtml(item.label)} <b>${item.count}</b></span>`,
          )
          .join("")
      : '<span class="status-count">ابدأ بتحديد حالة النقاط</span>';
  }

  function getReadinessSummary() {
    const counts = Object.fromEntries(
      statuses.map((status) => [status.value, 0]),
    );
    let selected = 0;
    let scored = 0;
    let scoreTotal = 0;
    points.forEach((point) => {
      const state = getStatus(point.id);
      if (!state) return;
      selected += 1;
      counts[state] = (counts[state] || 0) + 1;
      scored += 1;
      scoreTotal += readinessWeights[state] || 0;
    });

    const unresolved = points.length - scored;
    const score =
      unresolved === 0 ? Math.round(scoreTotal / points.length) : null;
    let color = unresolved > 0 ? "#d97706" : "#64748b";
    let rating =
      unresolved > 0
        ? `أكمل تحديد حالة ${unresolved} نقطة`
        : "أكمل نتائج الفحص";
    if (score !== null) {
      if (score >= 85) {
        color = "#15803d";
        rating = "جاهزية تقديرية مرتفعة";
      } else if (score >= 60) {
        color = "#d97706";
        rating = "تحتاج بعض النقاط إلى معالجة";
      } else {
        color = "#b91c1c";
        rating = "يوصى بالإصلاح قبل الفحص";
      }
    }

    const ready = counts.excellent + counts.good;
    const followup = counts.followup;
    const repair = counts.replace + counts.damaged;
    const categories = [
      { key: "positive", label: "ممتاز / جيد", count: ready },
      { key: "followup", label: "تحتاج متابعة", count: followup },
      { key: "repair", label: "تحتاج إصلاح", count: repair },
    ].map((item) => ({
      ...item,
      percentage: Math.round((item.count / points.length) * 100),
    }));

    return {
      score,
      color,
      rating,
      selected,
      scored,
      unresolved,
      coverage: `تم تحديد الحالة لـ ${scored} من ${points.length} نقطة • متبقية ${unresolved}`,
      categories,
    };
  }

  function renderReadiness(prefix, summary) {
    const gauge = document.getElementById(`${prefix}-readiness-gauge`);
    const scoreNode = document.getElementById(`${prefix}-readiness-score`);
    const ratingNode = document.getElementById(`${prefix}-readiness-rating`);
    const coverageNode = document.getElementById(
      `${prefix}-readiness-coverage`,
    );
    const metricsNode = document.getElementById(`${prefix}-summary-metrics`);
    const score = summary.score;

    scoreNode.textContent = score === null ? "—%" : `${score}%`;
    ratingNode.textContent = summary.rating;
    coverageNode.textContent = summary.coverage;
    gauge.style.setProperty("--score-angle", `${(score || 0) * 3.6}deg`);
    gauge.style.setProperty("--gauge-color", summary.color);
    gauge.setAttribute(
      "aria-label",
      score === null
        ? "مؤشر الجاهزية غير متاح قبل تسجيل حالات الفحص"
        : `مؤشر جاهزية تقديري ${score} بالمئة`,
    );
    metricsNode.innerHTML = summary.categories
      .map(
        (item) => `
      <div class="summary-metric metric-${item.key}">
        <div class="summary-circle" style="--metric-angle:${item.percentage * 3.6}deg" role="img" aria-label="${escapeHtml(item.label)}: ${item.percentage}%، ${item.count} من ${points.length}">
          <div class="summary-circle-inner"><strong dir="ltr">${item.percentage}%</strong><small><bdi dir="ltr">${item.count}/${points.length}</bdi></small></div>
        </div>
        <strong class="summary-circle-label">${escapeHtml(item.label)}</strong>
      </div>`,
      )
      .join("");

    if (prefix === "print") {
      const finalCard = document.getElementById("print-final-score-card");
      const finalScore = document.getElementById("print-final-score");
      const finalScale = document.getElementById("print-final-scale");
      const finalRating = document.getElementById("print-final-rating");
      const finalCoverage = document.getElementById("print-final-coverage");
      const palette =
        score === null
          ? {
              background: "#cbd5e1",
              ink: "#334155",
              border: "#64748b",
              band: "incomplete",
            }
          : score >= 85
            ? {
                background: "#4ade80",
                ink: "#052e16",
                border: "#15803d",
                band: "high",
              }
            : score >= 65
              ? {
                  background: "#facc15",
                  ink: "#422006",
                  border: "#a16207",
                  band: "medium",
                }
              : score >= 40
                ? {
                    background: "#fb923c",
                    ink: "#431407",
                    border: "#c2410c",
                    band: "low",
                  }
                : {
                    background: "#ef4444",
                    ink: "#450a0a",
                    border: "#b91c1c",
                    band: "very-low",
                  };
      finalCard.style.setProperty("--score-card-bg", palette.background);
      finalCard.style.setProperty("--score-card-ink", palette.ink);
      finalCard.style.setProperty("--score-card-border", palette.border);
      finalCard.dataset.scoreBand = palette.band;
      finalScore.textContent = score === null ? "غير مكتمل" : `${score}%`;
      finalScale.hidden = score === null;
      finalRating.textContent = summary.rating;
      finalCoverage.textContent =
        score === null
          ? `أكمل تحديد حالة ${summary.unresolved} نقطة — تم تقييم ${summary.scored} من ${points.length}`
          : `التقدير الإجمالي: ${score}% من 100% • ${summary.scored} من ${points.length} نقطة قابلة للتقييم`;
    }
  }

  function updatePrintReport(summary = getReadinessSummary()) {
    const data = snapshot();
    document.querySelectorAll("[data-print]").forEach((node) => {
      const key = node.dataset.print;
      const value =
        key === "inspectionDate" ? formatDate(data[key]) : data[key];
      node.textContent = value || "—";
    });
    document
      .querySelectorAll('.print-meta-grid [data-print="odometer"]')
      .forEach((node) => {
        node.textContent = data.odometer ? `${data.odometer} كم` : "—";
      });
    const makeRows = (selectedPoints, showZoneHeadings = false) => {
      let previousGroup = null;
      return selectedPoints
        .map((point) => {
          const state = data.statuses[point.id];
          const zone = inspectionZones.find((item) => item.key === point.group);
          const isEngineContinuation =
            showZoneHeadings &&
            point.group === "engine" &&
            point.sequence === 11;
          const zoneTitle = isEngineContinuation
            ? `${zone.title} — استكمال`
            : zone.title;
          const zoneSubtitle = isEngineContinuation
            ? "استكمال النقاط 11–15"
            : zone.subtitle;
          const zoneHeading =
            showZoneHeadings && previousGroup !== point.group
              ? `<tr class="print-zone-separator${zone.disclaimer ? " print-zone-disclaimer-row" : ""}"><td colspan="2"><strong>${escapeHtml(zoneTitle)}</strong><small>${escapeHtml(zoneSubtitle)}</small>${zone.disclaimer ? `<p class="print-zone-disclaimer">${escapeHtml(zone.disclaimer)}</p>` : ""}</td></tr>`
              : "";
          const indicator = statusIndicators[state];
          const indicatorMarkup = indicator
            ? `<div class="print-indicator" style="--indicator-position:${Math.min(97, Math.max(3, indicator.percent))}%;--marker-color:${indicator.marker};--indicator-color:${indicator.color}" role="img" aria-label="${escapeHtml(statusLabel(state))}: ${indicator.percent}%"><span class="print-indicator-value" dir="ltr">${indicator.percent}%</span><i class="print-indicator-pointer" aria-hidden="true"></i><span class="print-indicator-bar" aria-hidden="true"></span></div>`
            : `<div class="print-indicator print-indicator-unavailable" role="img" aria-label="لم يحدد الفني الحالة"><span class="print-indicator-value">—</span><span class="print-indicator-bar" aria-hidden="true"></span><span class="print-indicator-unavailable-label">غير محدد</span></div>`;
          previousGroup = point.group;
          return `${zoneHeading}<tr>
          <td class="print-point-cell"><div class="print-point-content"><span class="print-point-number" dir="ltr">${String(point.sequence).padStart(2, "0")}</span><span class="print-point-name">${escapeHtml(point.name)}</span></div></td>
          <td class="print-indicator-cell">${indicatorMarkup}</td>
        </tr>`;
        })
        .join("");
    };
    const orderedPoints = points
      .slice()
      .sort((a, b) => a.sequence - b.sequence);
    document.getElementById("print-engine").innerHTML = makeRows(
      orderedPoints.filter((point) => point.sequence <= 10),
    );
    document.getElementById("print-vehicle-zones").innerHTML = makeRows(
      orderedPoints.filter((point) => point.sequence > 10),
      true,
    );
    renderReadiness("print", summary);
    const reportLabel = data.reportNo.trim()
      ? ` رقم ${data.reportNo.trim()}`
      : "";
    const repairMessage = `السلام عليكم، أرغب بإصلاح الأعطال الظاهرة في تقرير فحص السيارة${reportLabel}.`;
    document.getElementById("print-repair-cta").href =
      `${PHONE_URL}?text=${encodeURIComponent(repairMessage)}`;
    const techImage = document.getElementById("print-tech-signature");
    const customerImage = document.getElementById("print-customer-signature");
    [
      [techImage, data.signatures.technician],
      [customerImage, data.signatures.customer],
    ].forEach(([image, source]) => {
      image.style.display = source ? "block" : "none";
      if (source) image.src = source;
      else image.removeAttribute("src");
    });
  }

  function refresh() {
    updateProgress();
    const summary = getReadinessSummary();
    renderReadiness("screen", summary);
    updatePrintReport(summary);
  }

  form.addEventListener("input", () => {
    refresh();
    saveDraft();
  });
  form.addEventListener("change", () => {
    refresh();
    saveDraft();
  });

  function suggestedPdfTitle(data) {
    const cleanPart = (value) =>
      String(value || "")
        .replace(/[\\/:*?"<>|]/g, "-")
        .replace(/\s+/g, " ")
        .trim();

    const customer = cleanPart(data.customerName) || "اسم العميل";
    const reportNo = cleanPart(data.reportNo) || "رقم التقرير";

    return `تقرير فحص السيارة - فزاع - ${customer} - ${reportNo}`;
  }

  document.getElementById("print-btn").addEventListener("click", async () => {
    updatePrintReport();
    const images = [
      document.getElementById("print-tech-signature"),
      document.getElementById("print-customer-signature"),
    ].filter((image) => image.getAttribute("src"));
    await Promise.all(
      images.map((image) =>
        image.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              image.onload = resolve;
              image.onerror = resolve;
              setTimeout(resolve, 1800);
            }),
      ),
    );
    document.title = suggestedPdfTitle(snapshot());
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    if (printRestoreHandler)
      window.removeEventListener("afterprint", printRestoreHandler);
    printRestoreHandler = () => {
      document.title = defaultDocumentTitle;
      printRestoreHandler = null;
    };
    window.addEventListener("afterprint", printRestoreHandler, { once: true });
    window.print();
  });

  document.getElementById("new-report-btn").addEventListener("click", () => {
    const editableFields = fields.filter(
      (id) => id !== "reportNo" && id !== "inspectionDate",
    );
    const hasContent =
      editableFields.some((id) => document.getElementById(id).value.trim()) ||
      points.some((point) => getStatus(point.id)) ||
      Object.values(signatures).some(
        (id) => document.getElementById(id).dataset.image,
      );
    if (
      hasContent &&
      !window.confirm("هل تريد مسح التقرير الحالي وبدء تقرير جديد؟")
    )
      return;
    form.reset();
    Object.values(signatures).forEach((id) =>
      document.getElementById(id).__clear?.(),
    );
    dateInput.value = todaySaudi();
    reportNoInput.value = generateReportNumber(dateInput.value);
    document.title = defaultDocumentTitle;
    localStorage.removeItem(STORAGE_KEY);
    saveState.textContent = "بدأ تقرير جديد";
    refresh();
    saveDraft(false);
  });

  document.querySelectorAll(".clear-signature").forEach((button) => {
    button.addEventListener("click", () =>
      document.getElementById(button.dataset.pad).__clear?.(),
    );
  });

  refresh();
  saveDraft(false);
})();
