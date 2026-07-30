(() => {
  "use strict";

  const API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_URL || "").trim();
  const STORAGE_KEY = "aeon_price_card_session_v1";

  const state = {
    token: "",
    user: null,
    gondolas: [],
    checks: [],
    approvalQueue: [],
    selectedCheckId: "",
    location: null,
    evidenceData: "",
    evidenceName: "",
    evidenceType: ""
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const els = {
    loginView: $("#loginView"),
    appView: $("#appView"),
    loginForm: $("#loginForm"),
    loginButton: $("#loginButton"),
    loginUserId: $("#loginUserId"),
    loginPin: $("#loginPin"),
    togglePin: $("#togglePin"),
    sidebar: $(".sidebar"),
    mobileMenuButton: $("#mobileMenuButton"),
    logoutButton: $("#logoutButton"),
    refreshButton: $("#refreshButton"),
    currentDate: $("#currentDate"),
    currentTime: $("#currentTime"),
    pageEyebrow: $("#pageEyebrow"),
    pageTitle: $("#pageTitle"),
    sidebarUserName: $("#sidebarUserName"),
    sidebarUserRole: $("#sidebarUserRole"),
    userAvatar: $("#userAvatar"),
    heroGreeting: $("#heroGreeting"),
    heroRole: $("#heroRole"),
    statToday: $("#statToday"),
    statPending: $("#statPending"),
    statApproved: $("#statApproved"),
    statFindings: $("#statFindings"),
    recentChecks: $("#recentChecks"),
    approvalBadge: $("#approvalBadge"),
    checkForm: $("#checkForm"),
    checkDate: $("#checkDate"),
    checkTime: $("#checkTime"),
    gondolaSelect: $("#gondolaSelect"),
    checkBy: $("#checkBy"),
    description: $("#description"),
    descriptionCount: $("#descriptionCount"),
    evidenceInput: $("#evidenceInput"),
    evidencePreview: $("#evidencePreview"),
    uploadPlaceholder: $("#uploadPlaceholder"),
    getLocationButton: $("#getLocationButton"),
    locationText: $("#locationText"),
    submitPin: $("#submitPin"),
    submitCheckButton: $("#submitCheckButton"),
    approvalList: $("#approvalList"),
    approvalRoleHint: $("#approvalRoleHint"),
    historyTableBody: $("#historyTableBody"),
    historySearch: $("#historySearch"),
    historyStatusFilter: $("#historyStatusFilter"),
    exportCsvButton: $("#exportCsvButton"),
    approvalModal: $("#approvalModal"),
    closeApprovalModal: $("#closeApprovalModal"),
    approvalSummary: $("#approvalSummary"),
    approvalNote: $("#approvalNote"),
    approvalPin: $("#approvalPin"),
    rejectButton: $("#rejectButton"),
    approveButton: $("#approveButton"),
    detailModal: $("#detailModal"),
    closeDetailModal: $("#closeDetailModal"),
    detailContent: $("#detailContent"),
    toastContainer: $("#toastContainer"),
    loadingOverlay: $("#loadingOverlay")
  };

  const pageMeta = {
    dashboardPage: ["OVERVIEW", "Dashboard"],
    inputPage: ["FORM PEKERJAAN", "Input Pengecekan"],
    approvalPage: ["WORKFLOW", "Persetujuan"],
    historyPage: ["ARSIP", "Riwayat Pengecekan"]
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function nowLocalParts() {
    const now = new Date();
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit"
    }).format(now);
    const time = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false
    }).format(now);
    return { date, time };
  }

  function updateClock() {
    const now = new Date();
    els.currentDate.textContent = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta", weekday: "short", day: "2-digit", month: "short", year: "numeric"
    }).format(now);
    els.currentTime.textContent = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit"
    }).format(now) + " WIB";
  }

  function setDefaultDateTime() {
    const { date, time } = nowLocalParts();
    els.checkDate.value = date;
    els.checkTime.value = time;
  }

  function showLoading(show) {
    els.loadingOverlay.classList.toggle("hidden", !show);
  }

  function toast(message, type = "success") {
    const node = document.createElement("div");
    node.className = `toast ${type}`;
    node.textContent = message;
    els.toastContainer.appendChild(node);
    setTimeout(() => node.remove(), 3800);
  }

  function ensureApiConfigured() {
    if (!API_URL || API_URL.includes("PASTE_YOUR")) {
      throw new Error("API_URL belum diisi pada file config.js.");
    }
  }

  async function api(action, payload = {}, method = "POST") {
    ensureApiConfigured();
    const bodyPayload = {
      action,
      token: state.token || "",
      ...payload
    };

    let response;
    if (method === "GET") {
      const url = new URL(API_URL);
      Object.entries(bodyPayload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
      });
      response = await fetch(url.toString(), { method: "GET", redirect: "follow" });
    } else {
      const body = new URLSearchParams();
      Object.entries(bodyPayload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) body.append(key, String(value));
      });
      response = await fetch(API_URL, {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body
      });
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    if (!result.success) {
      if (/session|sesi|token/i.test(result.message || "")) logout(false);
      throw new Error(result.message || "Permintaan gagal.");
    }
    return result.data;
  }

  function saveSession() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: state.token, user: state.user }));
  }

  function loadSession() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (stored?.token && stored?.user) {
        state.token = stored.token;
        state.user = stored.user;
        return true;
      }
    } catch (_) {}
    return false;
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
    state.token = "";
    state.user = null;
  }

  async function login(event) {
    event.preventDefault();
    const userId = els.loginUserId.value.trim().toUpperCase();
    const pin = els.loginPin.value.trim();

    if (!userId || !/^\d{6}$/.test(pin)) {
      toast("Masukkan ID karyawan dan PIN 6 digit.", "error");
      return;
    }

    showLoading(true);
    try {
      const data = await api("login", {
        userId,
        pin,
        device: navigator.userAgent
      });
      state.token = data.token;
      state.user = data.user;
      saveSession();
      await enterApp();
      els.loginForm.reset();
      toast(`Selamat datang, ${state.user.name}.`);
    } catch (error) {
      toast(error.message, "error");
    } finally {
      showLoading(false);
    }
  }

  async function enterApp() {
    els.loginView.classList.add("hidden");
    els.appView.classList.remove("hidden");
    applyUserUI();
    setDefaultDateTime();
    els.checkBy.value = state.user.name;
    await refreshAll();
  }

  function applyUserUI() {
    const { name, role } = state.user;
    els.sidebarUserName.textContent = name;
    els.sidebarUserRole.textContent = role;
    els.userAvatar.textContent = name.charAt(0).toUpperCase();
    els.heroGreeting.textContent = `Selamat bekerja, ${name.split(" ")[0]}!`;
    els.heroRole.textContent = role;
    els.approvalRoleHint.textContent = role === "AGL" ? "Verifikasi tahap AGL" : "Persetujuan final GL";

    $$("[data-role-visible]").forEach((el) => {
      const roles = el.dataset.roleVisible.split(",");
      el.classList.toggle("hidden", !roles.includes(role));
    });
  }

  async function logout(callApi = true) {
    if (callApi && state.token) {
      try { await api("logout", {}); } catch (_) {}
    }
    clearSession();
    state.gondolas = [];
    state.checks = [];
    state.approvalQueue = [];
    els.appView.classList.add("hidden");
    els.loginView.classList.remove("hidden");
    showPage("dashboardPage");
  }

  async function refreshAll() {
    showLoading(true);
    try {
      const [master, checks, stats, queue] = await Promise.all([
        api("getMasterData", {}, "GET"),
        api("listChecks", { limit: 300 }, "GET"),
        api("getDashboardStats", {}, "GET"),
        ["AGL", "GL"].includes(state.user.role)
          ? api("getApprovalQueue", {}, "GET")
          : Promise.resolve([])
      ]);

      state.gondolas = master.gondolas || [];
      state.checks = checks || [];
      state.approvalQueue = queue || [];
      renderGondolas();
      renderStats(stats || {});
      renderRecentChecks();
      renderApprovalQueue();
      renderHistory();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      showLoading(false);
    }
  }

  function renderGondolas() {
    els.gondolaSelect.innerHTML = '<option value="">Pilih gondola</option>' +
      state.gondolas.map((g) =>
        `<option value="${escapeHtml(g.id)}">${escapeHtml(g.name)}${g.area ? " — " + escapeHtml(g.area) : ""}</option>`
      ).join("");
  }

  function renderStats(stats) {
    els.statToday.textContent = stats.today || 0;
    els.statPending.textContent = stats.pending || 0;
    els.statApproved.textContent = stats.approved || 0;
    els.statFindings.textContent = stats.findings || 0;
  }

  function formatDateTime(date, time) {
    if (!date) return "-";
    const parsed = new Date(`${date}T${time || "00:00"}:00`);
    const d = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
    return `${d} • ${time || "-"}`;
  }

  function statusClass(status) {
    if (/selesai|disetujui/i.test(status)) return "success";
    if (/ditolak/i.test(status)) return "danger";
    if (/menunggu/i.test(status)) return "pending";
    return "neutral";
  }

  function renderRecentChecks() {
    const items = state.checks.slice(0, 6);
    if (!items.length) {
      els.recentChecks.className = "activity-list empty-state";
      els.recentChecks.textContent = "Belum ada data pengecekan.";
      return;
    }
    els.recentChecks.className = "activity-list";
    els.recentChecks.innerHTML = items.map((item) => `
      <div class="activity-item">
        <div class="activity-icon">${item.resultStatus === "Sesuai" ? "✓" : "!"}</div>
        <div class="activity-copy">
          <strong>${escapeHtml(item.gondolaName)}</strong>
          <small>${escapeHtml(item.checkByName)} • ${escapeHtml(item.resultStatus)} • ${escapeHtml(item.workflowStatus)}</small>
        </div>
        <div class="activity-time">${escapeHtml(item.checkTime)}</div>
      </div>
    `).join("");
  }

  function renderApprovalQueue() {
    const count = state.approvalQueue.length;
    els.approvalBadge.textContent = count;
    els.approvalBadge.classList.toggle("hidden", count === 0);

    if (!count) {
      els.approvalList.className = "record-grid empty-state";
      els.approvalList.textContent = "Tidak ada data yang menunggu persetujuan.";
      return;
    }

    els.approvalList.className = "record-grid";
    els.approvalList.innerHTML = state.approvalQueue.map((item) => `
      <article class="record-card">
        <div class="record-top">
          <div>
            <h4>${escapeHtml(item.gondolaName)}</h4>
            <small>${escapeHtml(formatDateTime(item.checkDate, item.checkTime))}</small>
          </div>
          <span class="status-pill ${statusClass(item.workflowStatus)}">${escapeHtml(item.workflowStatus)}</span>
        </div>
        <div class="record-meta">
          <div><span>Check By</span><strong>${escapeHtml(item.checkByName)}</strong></div>
          <div><span>Hasil</span><strong>${escapeHtml(item.resultStatus)}</strong></div>
        </div>
        <div class="record-note">${escapeHtml(item.description)}</div>
        <div class="record-actions">
          <button class="secondary-button" data-detail-id="${escapeHtml(item.checkId)}">Detail</button>
          <button class="primary-button" data-approve-id="${escapeHtml(item.checkId)}">Verifikasi</button>
        </div>
      </article>
    `).join("");
  }

  function getFilteredChecks() {
    const q = els.historySearch.value.trim().toLowerCase();
    const status = els.historyStatusFilter.value;
    return state.checks.filter((item) => {
      const haystack = [
        item.gondolaName, item.checkByName, item.resultStatus, item.workflowStatus, item.description, item.checkId
      ].join(" ").toLowerCase();
      const matchesQuery = !q || haystack.includes(q);
      const matchesStatus = !status ||
        (status === "Ditolak" ? /ditolak/i.test(item.workflowStatus) : item.workflowStatus === status);
      return matchesQuery && matchesStatus;
    });
  }

  function renderHistory() {
    const items = getFilteredChecks();
    if (!items.length) {
      els.historyTableBody.innerHTML = '<tr><td colspan="7" class="empty-cell">Data tidak ditemukan.</td></tr>';
      return;
    }

    els.historyTableBody.innerHTML = items.map((item) => `
      <tr>
        <td><strong>${escapeHtml(item.checkDate)}</strong><small>${escapeHtml(item.checkTime)} WIB</small></td>
        <td><strong>${escapeHtml(item.gondolaName)}</strong><small>${escapeHtml(item.checkId)}</small></td>
        <td><strong>${escapeHtml(item.checkByName)}</strong><small>${escapeHtml(item.checkById)}</small></td>
        <td><span class="status-pill ${item.resultStatus === "Sesuai" ? "success" : "finding"}">${escapeHtml(item.resultStatus)}</span></td>
        <td><span class="status-pill ${statusClass(item.workflowStatus)}">${escapeHtml(item.workflowStatus)}</span></td>
        <td>${item.evidenceUrl ? `<a class="evidence-link" href="${escapeHtml(item.evidenceUrl)}" target="_blank" rel="noopener">Lihat foto</a>` : "<small>Tidak ada</small>"}</td>
        <td><button class="table-button" data-detail-id="${escapeHtml(item.checkId)}">Detail</button></td>
      </tr>
    `).join("");
  }

  async function submitCheck(event) {
    event.preventDefault();
    if (state.user.role !== "PIC") return;

    const selectedGondola = state.gondolas.find((g) => g.id === els.gondolaSelect.value);
    const resultStatus = $('input[name="resultStatus"]:checked')?.value || "";
    const pin = els.submitPin.value.trim();

    if (!selectedGondola || !els.checkDate.value || !els.checkTime.value || !els.description.value.trim()) {
      toast("Lengkapi semua kolom wajib.", "error");
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      toast("PIN harus 6 digit.", "error");
      return;
    }

    showLoading(true);
    els.submitCheckButton.disabled = true;
    try {
      await api("createCheck", {
        checkDate: els.checkDate.value,
        checkTime: els.checkTime.value,
        gondolaId: selectedGondola.id,
        gondolaName: selectedGondola.name,
        resultStatus,
        description: els.description.value.trim(),
        pin,
        device: navigator.userAgent,
        latitude: state.location?.latitude || "",
        longitude: state.location?.longitude || "",
        accuracy: state.location?.accuracy || "",
        evidenceData: state.evidenceData,
        evidenceName: state.evidenceName,
        evidenceType: state.evidenceType
      });

      els.checkForm.reset();
      resetEvidence();
      resetLocation();
      setDefaultDateTime();
      els.checkBy.value = state.user.name;
      els.descriptionCount.textContent = "0";
      toast("Pengecekan tersimpan dan diajukan ke AGL.");
      showPage("dashboardPage");
      await refreshAll();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      showLoading(false);
      els.submitCheckButton.disabled = false;
    }
  }

  function handleEvidence(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const maxBytes = 1.5 * 1024 * 1024;
    if (!file.type.startsWith("image/")) {
      toast("File bukti harus berupa gambar.", "error");
      event.target.value = "";
      return;
    }
    if (file.size > maxBytes) {
      toast("Ukuran foto maksimal 1,5 MB.", "error");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const full = String(reader.result);
      state.evidenceData = full.split(",")[1] || "";
      state.evidenceName = file.name;
      state.evidenceType = file.type;
      els.evidencePreview.src = full;
      els.evidencePreview.classList.remove("hidden");
      els.uploadPlaceholder.classList.add("hidden");
    };
    reader.onerror = () => toast("Foto gagal dibaca.", "error");
    reader.readAsDataURL(file);
  }

  function resetEvidence() {
    state.evidenceData = "";
    state.evidenceName = "";
    state.evidenceType = "";
    els.evidenceInput.value = "";
    els.evidencePreview.src = "";
    els.evidencePreview.classList.add("hidden");
    els.uploadPlaceholder.classList.remove("hidden");
  }

  function getLocation() {
    if (!navigator.geolocation) {
      toast("Perangkat tidak mendukung geolokasi.", "error");
      return;
    }
    els.locationText.textContent = "Mengambil lokasi...";
    navigator.geolocation.getCurrentPosition((position) => {
      state.location = {
        latitude: position.coords.latitude.toFixed(6),
        longitude: position.coords.longitude.toFixed(6),
        accuracy: Math.round(position.coords.accuracy)
      };
      els.locationText.textContent = `${state.location.latitude}, ${state.location.longitude} (±${state.location.accuracy} m)`;
      toast("Lokasi berhasil diambil.");
    }, (error) => {
      els.locationText.textContent = "Lokasi tidak tersedia";
      toast(`Lokasi gagal: ${error.message}`, "error");
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  }

  function resetLocation() {
    state.location = null;
    els.locationText.textContent = "Belum diambil";
  }

  function openApprovalModal(checkId) {
    const item = state.approvalQueue.find((x) => x.checkId === checkId);
    if (!item) return;
    state.selectedCheckId = checkId;
    els.approvalSummary.innerHTML = `
      <strong>${escapeHtml(item.gondolaName)}</strong><br />
      ${escapeHtml(formatDateTime(item.checkDate, item.checkTime))}<br />
      PIC: ${escapeHtml(item.checkByName)}<br />
      Hasil: ${escapeHtml(item.resultStatus)}
    `;
    els.approvalNote.value = "";
    els.approvalPin.value = "";
    els.approvalModal.classList.remove("hidden");
  }

  async function submitDecision(decision) {
    const pin = els.approvalPin.value.trim();
    const note = els.approvalNote.value.trim();
    if (!/^\d{6}$/.test(pin)) {
      toast("PIN harus 6 digit.", "error");
      return;
    }
    if (decision === "reject" && !note) {
      toast("Alasan penolakan wajib diisi.", "error");
      return;
    }

    showLoading(true);
    try {
      await api("approveCheck", {
        checkId: state.selectedCheckId,
        decision,
        note,
        pin,
        device: navigator.userAgent
      });
      els.approvalModal.classList.add("hidden");
      toast(decision === "approve" ? "Persetujuan berhasil disimpan." : "Pengecekan telah ditolak.");
      await refreshAll();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      showLoading(false);
    }
  }

  function openDetailModal(checkId) {
    const item = state.checks.find((x) => x.checkId === checkId) ||
      state.approvalQueue.find((x) => x.checkId === checkId);
    if (!item) return;

    const mapsLink = item.latitude && item.longitude
      ? `https://www.google.com/maps?q=${encodeURIComponent(item.latitude)},${encodeURIComponent(item.longitude)}`
      : "";

    const audits = [
      item.picApprovedAt && { title: "Disubmit oleh PIC", name: item.picApprovedByName || item.checkByName, time: item.picApprovedAt, note: item.picNote || "Pengecekan dibuat dan dikonfirmasi dengan PIN." },
      item.aglApprovedAt && { title: item.aglDecision === "reject" ? "Ditolak AGL" : "Disetujui AGL", name: item.aglApprovedByName, time: item.aglApprovedAt, note: item.aglNote || "-" },
      item.glApprovedAt && { title: item.glDecision === "reject" ? "Ditolak GL" : "Disetujui GL", name: item.glApprovedByName, time: item.glApprovedAt, note: item.glNote || "-" }
    ].filter(Boolean);

    els.detailContent.innerHTML = `
      <h3>${escapeHtml(item.gondolaName)}</h3>
      <div class="detail-grid">
        <div class="detail-item"><span>ID Pengecekan</span><strong>${escapeHtml(item.checkId)}</strong></div>
        <div class="detail-item"><span>Status Workflow</span><strong>${escapeHtml(item.workflowStatus)}</strong></div>
        <div class="detail-item"><span>Tanggal & Jam</span><strong>${escapeHtml(formatDateTime(item.checkDate, item.checkTime))}</strong></div>
        <div class="detail-item"><span>Check By</span><strong>${escapeHtml(item.checkByName)} (${escapeHtml(item.checkById)})</strong></div>
        <div class="detail-item"><span>Hasil</span><strong>${escapeHtml(item.resultStatus)}</strong></div>
        <div class="detail-item"><span>Perangkat</span><strong>${escapeHtml(item.device || "-")}</strong></div>
        <div class="detail-item detail-wide"><span>Keterangan</span><strong>${escapeHtml(item.description)}</strong></div>
        <div class="detail-item"><span>Foto Bukti</span>${item.evidenceUrl ? `<a class="evidence-link" href="${escapeHtml(item.evidenceUrl)}" target="_blank" rel="noopener">Buka foto</a>` : "<strong>-</strong>"}</div>
        <div class="detail-item"><span>Lokasi</span>${mapsLink ? `<a class="evidence-link" href="${mapsLink}" target="_blank" rel="noopener">Buka Google Maps</a>` : "<strong>-</strong>"}</div>
      </div>
      <div class="audit-timeline">
        <p class="eyebrow pink">AUDIT TRAIL</p>
        ${audits.length ? audits.map((a) => `
          <div class="audit-item">
            <span class="audit-dot"></span>
            <div><strong>${escapeHtml(a.title)} — ${escapeHtml(a.name)}</strong><small>${escapeHtml(a.time)} • ${escapeHtml(a.note)}</small></div>
          </div>
        `).join("") : "<small>Belum ada audit trail.</small>"}
      </div>
    `;
    els.detailModal.classList.remove("hidden");
  }

  function exportCsv() {
    const rows = getFilteredChecks();
    if (!rows.length) {
      toast("Tidak ada data untuk diekspor.", "error");
      return;
    }
    const columns = [
      ["checkId", "ID Pengecekan"],
      ["checkDate", "Tanggal"],
      ["checkTime", "Jam"],
      ["gondolaName", "Gondola"],
      ["checkById", "ID PIC"],
      ["checkByName", "Nama PIC"],
      ["resultStatus", "Hasil"],
      ["description", "Keterangan"],
      ["workflowStatus", "Status Approval"],
      ["picApprovedAt", "Waktu PIC"],
      ["aglApprovedByName", "AGL"],
      ["aglApprovedAt", "Waktu AGL"],
      ["glApprovedByName", "GL"],
      ["glApprovedAt", "Waktu GL"],
      ["evidenceUrl", "Foto"],
      ["latitude", "Latitude"],
      ["longitude", "Longitude"]
    ];
    const csvEscape = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const csv = [
      columns.map((c) => csvEscape(c[1])).join(","),
      ...rows.map((row) => columns.map((c) => csvEscape(row[c[0]])).join(","))
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `price-card-check-${nowLocalParts().date}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function showPage(pageId) {
    $$(".page").forEach((page) => page.classList.toggle("active", page.id === pageId));
    $$(".nav-item").forEach((nav) => nav.classList.toggle("active", nav.dataset.page === pageId));
    const [eyebrow, title] = pageMeta[pageId] || ["", ""];
    els.pageEyebrow.textContent = eyebrow;
    els.pageTitle.textContent = title;
    els.sidebar.classList.remove("open");
  }

  function bindEvents() {
    els.loginForm.addEventListener("submit", login);
    els.togglePin.addEventListener("click", () => {
      els.loginPin.type = els.loginPin.type === "password" ? "text" : "password";
    });
    els.logoutButton.addEventListener("click", () => logout(true));
    els.refreshButton.addEventListener("click", refreshAll);
    els.mobileMenuButton.addEventListener("click", () => els.sidebar.classList.toggle("open"));

    $$(".nav-item").forEach((button) => button.addEventListener("click", () => showPage(button.dataset.page)));
    $$("[data-go-page]").forEach((button) => button.addEventListener("click", () => showPage(button.dataset.goPage)));

    els.checkForm.addEventListener("submit", submitCheck);
    els.description.addEventListener("input", () => els.descriptionCount.textContent = els.description.value.length);
    els.evidenceInput.addEventListener("change", handleEvidence);
    els.getLocationButton.addEventListener("click", getLocation);

    els.approvalList.addEventListener("click", (event) => {
      const approveButton = event.target.closest("[data-approve-id]");
      const detailButton = event.target.closest("[data-detail-id]");
      if (approveButton) openApprovalModal(approveButton.dataset.approveId);
      if (detailButton) openDetailModal(detailButton.dataset.detailId);
    });
    els.historyTableBody.addEventListener("click", (event) => {
      const button = event.target.closest("[data-detail-id]");
      if (button) openDetailModal(button.dataset.detailId);
    });

    els.historySearch.addEventListener("input", renderHistory);
    els.historyStatusFilter.addEventListener("change", renderHistory);
    els.exportCsvButton.addEventListener("click", exportCsv);

    els.closeApprovalModal.addEventListener("click", () => els.approvalModal.classList.add("hidden"));
    els.closeDetailModal.addEventListener("click", () => els.detailModal.classList.add("hidden"));
    els.approveButton.addEventListener("click", () => submitDecision("approve"));
    els.rejectButton.addEventListener("click", () => submitDecision("reject"));

    [els.approvalModal, els.detailModal].forEach((modal) => {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) modal.classList.add("hidden");
      });
    });
  }

  async function init() {
    bindEvents();
    updateClock();
    setInterval(updateClock, 1000);
    setDefaultDateTime();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    }

    if (loadSession()) {
      showLoading(true);
      try {
        const session = await api("validateSession", {}, "GET");
        state.user = session.user;
        await enterApp();
      } catch (_) {
        clearSession();
      } finally {
        showLoading(false);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
