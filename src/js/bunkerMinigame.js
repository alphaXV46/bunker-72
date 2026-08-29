/**
 * Bunker entry maintenance console.
 *
 * This module owns the temporary post-entry interaction layer. It deliberately
 * does not persist state: if the page reloads, the story remains safely at the
 * title card and the player can start the console again.
 */

export const STATIONS = {
  card: {
    id: 'card',
    code: 'SEAL 72-A',
    kicker: 'PINTU LUAR // PROTOKOL MASUK',
    name: 'OTENTIKASI KARTU AKSES',
    shortName: 'KARTU AKSES',
    tutorial: 'Geser kartu akses dari kiri ke kanan melewati sensor pembaca palka tanpa melepasnya.',
    defaultSuccessMessage: 'KREDENSIAL 72-A DITERIMA // PINTU TERBUKA',
  },
  power: {
    id: 'power',
    code: 'ACTUATOR A-01',
    kicker: 'GENERATOR UTAMA // BOOT SISTEM',
    name: 'NAIKKAN DAYA UTAMA',
    shortName: 'TUAS DAYA',
    tutorial: 'Tekan dan tarik tuas daya ke atas sampai indikator mencapai ZONA AMAN (100%).',
    defaultSuccessMessage: 'BUS DAYA UTAMA STABIL // LAMPU MENYALA',
  },
  rotor: {
    id: 'rotor',
    code: 'TURBIN STABILIZER',
    kicker: 'STRUKTUR BUNKER // REDAM GEMPA',
    name: 'PENYELARASAN ROTOR 1—2—3',
    shortName: 'KUNCI ROTOR',
    tutorial: 'Ketuk masing-masing soket tepat saat angka berputar cocok dengan kotak target.',
    defaultSuccessMessage: 'SEKUENSI 1—2—3 TERKUNCI // STRUKTUR STABIL',
  },
  wires: {
    id: 'wires',
    code: 'PATCH-04 BATERAI',
    kicker: 'DISTRIBUSI DAYA // REKONFIGURASI',
    name: 'SAMBUNG KABEL CADANGAN',
    shortName: 'KABEL WARNA',
    tutorial: 'Tarik kabel dari setiap terminal kiri ke soket kanan dengan warna yang serasi.',
    defaultSuccessMessage: 'SEMUA JALUR KABEL TERUJI // SIRKUIT ONLINE',
  },
};

const COLORS = {
  red: { label: 'MERAH', hex: '#ef5b5b' },
  yellow: { label: 'KUNING', hex: '#ffd166' },
  blue: { label: 'BIRU', hex: '#5bc0be' },
  green: { label: 'HIJAU', hex: '#63e6be' },
};

export class BunkerMinigame {
  constructor({ root, onComplete }) {
    this.root = root;
    this.defaultOnComplete = onComplete;
    this.currentStationId = null;
    this.activeOptions = null;
    this.cleanupFns = [];
    this.timeouts = [];
    this.numberTimer = null;
    this.numberValues = [2, 3, 1];
    this.numberLocked = [false, false, false];
    this.numberMistakes = 0;
    this.cardX = 0;
    this.wireConnections = {};
  }

  /**
   * Opens a specific standalone minigame station.
   * @param {'card'|'power'|'rotor'|'wires'|'numbers'} stationId
   * @param {Object} options
   */
  openStation(stationId = 'card', options = {}) {
    if (!this.root) return;
    this.reset();

    if (stationId === 'numbers') stationId = 'rotor';
    if (!STATIONS[stationId]) stationId = 'card';

    this.currentStationId = stationId;
    this.activeOptions = options;
    const station = STATIONS[stationId];

    this.renderShell(station);
    this.root.hidden = false;
    this.root.setAttribute('aria-hidden', 'false');

    const intro = `
      <div class="mg-station-heading">
        <div>
          <span class="mg-eyebrow">${options.kicker || station.kicker}</span>
          <h1>${options.title || station.name}</h1>
          <p>${options.tutorial || station.tutorial}</p>
        </div>
        <div class="mg-state-badge">
          <span class="mg-state-led"></span>
          <span>STATUS <b>AKTIF</b></span>
        </div>
      </div>`;

    if (stationId === 'power') this.renderPower(intro);
    else if (stationId === 'rotor') this.renderRotor(intro);
    else if (stationId === 'card') this.renderCard(intro);
    else if (stationId === 'wires') this.renderWires(intro);
  }

  /** Backwards-compatible open method defaults to 'card' */
  open(stationId = 'card', options = {}) {
    this.openStation(stationId, options);
  }

  close() {
    this.reset();
    if (!this.root) return;
    this.root.hidden = true;
    this.root.setAttribute('aria-hidden', 'true');
    this.root.innerHTML = '';
  }

  reset() {
    this.timeouts.forEach((t) => window.clearTimeout(t));
    this.timeouts = [];
    this.clearStation();
    this.currentStationId = null;
    this.activeOptions = null;
    this.numberValues = [2, 3, 1];
    this.numberLocked = [false, false, false];
    this.numberMistakes = 0;
    this.cardX = 0;
    this.wireConnections = {};
  }

  renderShell(station) {
    if (!this.root) return;
    this.root.innerHTML = `
      <div class="mg-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="mg-brand-title">
        <div class="mg-shell">
          <header class="mg-header">
            <div class="mg-brand-block">
              <span class="mg-kicker">${station.kicker}</span>
              <strong id="mg-brand-title" class="mg-brand">${station.name} <span>[${station.code}]</span></strong>
            </div>
            <div class="mg-header-status">
              <span class="mg-live-dot"></span>
              <span class="mg-status-pill">SIAGA</span>
              <button id="mg-close-btn" class="mg-close-btn" type="button" aria-label="Tutup konsol" title="Tutup / Batal">✕</button>
            </div>
          </header>

          <main class="mg-console" aria-live="polite">
            <div id="mg-panel" class="mg-panel"></div>
          </main>

          <footer class="mg-footer">
            <div class="mg-hint">
              <span class="mg-hint-mark">i</span>
              <span id="mg-hint-text">${station.tutorial}</span>
            </div>
            <div id="mg-feedback" class="mg-feedback" role="status">SIAP MENERIMA INPUT</div>
          </footer>
        </div>
      </div>`;

    this.panel = this.root.querySelector('#mg-panel');
    this.hint = this.root.querySelector('#mg-hint-text');
    this.feedback = this.root.querySelector('#mg-feedback');

    const closeBtn = this.root.querySelector('#mg-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const onCancel = this.activeOptions?.onCancel || this.activeOptions?.onFailure;
        this.close();
        onCancel?.({ canceled: true, success: false, stationId: this.currentStationId });
      });
    }
  }

  renderPower(intro) {
    this.panel.innerHTML = `${intro}
      <div class="mg-power-layout">
        <div class="mg-meter-card">
          <div class="mg-meter-label"><span>BUS VOLTAGE</span><b id="mg-power-percent">00%</b></div>
          <div class="mg-power-meter"><span id="mg-power-fill"></span><i class="mg-meter-zone zone-yellow"></i><i class="mg-meter-zone zone-green"></i></div>
          <div class="mg-meter-scale"><span>0</span><span>RISIKO</span><span>AMAN</span><span>100</span></div>
          <div class="mg-readout"><span class="mg-readout-led"></span><span id="mg-power-readout">MENUNGGU TARIKAN TUAS</span></div>
        </div>
        <div class="mg-lever-console">
          <div class="mg-lever-title"><span>ACTUATOR A-01</span><small>UPWARD LIFT</small></div>
          <div class="mg-lever-track"><span class="mg-lever-line"></span><button id="mg-lever" class="mg-lever" aria-label="Tuas daya, tarik ke atas" title="Tekan dan tarik ke atas"><span class="mg-lever-grip">↑</span></button><span class="mg-lever-notch notch-top"></span><span class="mg-lever-notch notch-bottom"></span></div>
          <div class="mg-lever-caption"><span>LOCK</span><b>TARIK KE ATAS</b><span>RELEASE</span></div>
        </div>
      </div>
      <div class="mg-instruction-strip"><span class="mg-strip-icon">↑</span><span>Tekan kepala tuas, tahan, lalu geser lurus ke atas. Jangan lepas sebelum lampu hijau menyala.</span><span class="mg-strip-code">PWR-LIFT</span></div>`;

    let value = 0;
    const lever = this.panel.querySelector('#mg-lever');
    const fill = this.panel.querySelector('#mg-power-fill');
    const percent = this.panel.querySelector('#mg-power-percent');
    const readout = this.panel.querySelector('#mg-power-readout');
    let lastY = null;
    let dragging = false;

    const update = (next) => {
      value = Math.max(0, Math.min(100, next));
      fill.style.width = `${value}%`;
      percent.textContent = `${Math.round(value).toString().padStart(2, '0')}%`;
      lever.style.setProperty('--lever-progress', `${value}%`);
      readout.textContent = value >= 100 ? 'BUS UTAMA TERKUNCI' : value > 0 ? 'DAYA MENINGKAT...' : 'MENUNGGU TARIKAN TUAS';
      if (value >= 100) this.finishStation('power');
    };
    const start = (event) => {
      dragging = true;
      lastY = event.clientY;
      lever.classList.add('is-grabbed');
      lever.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    };
    const move = (event) => {
      if (!dragging) return;
      const delta = lastY - event.clientY;
      lastY = event.clientY;
      if (delta > 0) update(value + delta * 0.72);
      event.preventDefault();
    };
    const end = () => {
      dragging = false;
      lastY = null;
      lever.classList.remove('is-grabbed');
    };
    const key = (event) => {
      if (event.key === 'ArrowUp' || event.key === ' ') {
        event.preventDefault();
        update(value + 12);
      }
    };
    lever.addEventListener('pointerdown', start);
    lever.addEventListener('pointermove', move);
    lever.addEventListener('pointerup', end);
    lever.addEventListener('pointercancel', end);
    lever.addEventListener('keydown', key);
    this.cleanupFns.push(() => {
      lever.removeEventListener('pointerdown', start);
      lever.removeEventListener('pointermove', move);
      lever.removeEventListener('pointerup', end);
      lever.removeEventListener('pointercancel', end);
      lever.removeEventListener('keydown', key);
    });
  }

  renderNumbers(intro) {
    const targets = [1, 2, 3];
    this.numberValues = [2, 3, 1];
    this.numberLocked = [false, false, false];
    this.numberMistakes = 0;
    this.panel.innerHTML = `${intro}
      <div class="mg-number-head"><span>ALIGNMENT ARRAY / LIVE ROTOR</span><span id="mg-number-lives">KESEMPATAN: <b>3</b></span></div>
      <div class="mg-number-board">
        ${targets.map((target, index) => `
          <div class="mg-number-row" data-number-row="${index}">
            <div class="mg-number-index">0${index + 1}</div>
            <div class="mg-number-dial-shell"><button class="mg-number-dial" data-dial="${index}" aria-label="Soket angka ${target}"><span class="mg-dial-ring"></span><strong>${this.numberValues[index]}</strong><small>ROTATE</small></button></div>
            <div class="mg-number-cable"></div>
            <div class="mg-receptacle"><span class="mg-receptacle-light"></span><b>${target}</b><small>LOCK</small></div>
            <span class="mg-row-status">TAP SAAT COCOK</span>
          </div>`).join('')}
      </div>
      <div class="mg-instruction-strip"><span class="mg-strip-icon">123</span><span>Angka berputar sendiri. Ketuk soket ketika angka di dalamnya sama dengan kotak target.</span><span class="mg-strip-code">SYNC-LOCK</span></div>`;

    const updateRow = (index) => {
      const row = this.panel.querySelector(`[data-number-row="${index}"]`);
      row.querySelector('.mg-number-dial strong').textContent = this.numberValues[index];
    };
    const rotate = () => {
      this.numberValues = this.numberValues.map((value, index) => this.numberLocked[index] ? value : (value % 3) + 1);
      this.numberValues.forEach((_, index) => updateRow(index));
    };
    this.numberTimer = window.setInterval(rotate, 680);
    this.panel.querySelectorAll('.mg-number-dial').forEach((dial) => {
      dial.addEventListener('click', () => {
        const index = Number(dial.dataset.dial);
        if (this.numberLocked[index]) return;
        if (this.numberValues[index] === targets[index]) {
          this.numberLocked[index] = true;
          const row = dial.closest('.mg-number-row');
          row.classList.add('is-locked');
          row.querySelector('.mg-row-status').textContent = 'TERKUNCI ✓';
          this.setFeedback(`ROTOR ${index + 1} TERKUNCI`, 'success');
          if (this.numberLocked.every(Boolean)) this.finishStation('rotor');
        } else {
          this.numberMistakes += 1;
          const lives = Math.max(0, 3 - this.numberMistakes);
          const livesEl = this.panel.querySelector('#mg-number-lives b');
          if (livesEl) livesEl.textContent = lives;
          this.setFeedback(lives ? 'SALAH WAKTU — TUNGGU ANGKA TARGET' : 'ROTOR GAGAL', 'error');
          dial.classList.remove('is-missed');
          void dial.offsetWidth;
          dial.classList.add('is-missed');
          if (!lives) {
            if (this.activeOptions?.allowFailure) {
              this.failStation('rotor', 'SEKUENSI GAGAL — GETARAN MERUSAK STRUKTUR');
            } else {
              this.numberMistakes = 0;
              this.numberValues = [2, 3, 1];
              this.numberLocked = [false, false, false];
              this.panel.querySelectorAll('.mg-number-row').forEach((row) => row.classList.remove('is-locked'));
              this.panel.querySelectorAll('.mg-row-status').forEach((status) => { status.textContent = 'TAP SAAT COCOK'; });
              if (livesEl) livesEl.textContent = '3';
              this.setFeedback('ROTOR RESET — KESEMPATAN DIPULIHKAN', 'error');
              this.numberValues.forEach((_, idx) => updateRow(idx));
            }
          }
        }
      });
    });
  }

  renderCard(intro) {
    this.cardX = 0;
    this.panel.innerHTML = `${intro}
      <div class="mg-card-layout">
        <div class="mg-card-readout"><span class="mg-reader-beacon"></span><div><span class="mg-eyebrow">READER / PORT B</span><strong id="mg-card-status">MENUNGGU KARTU</strong><small>Jarak aman: 15 cm</small></div></div>
        <div class="mg-card-track" id="mg-card-track">
          <div class="mg-track-label track-label-left">INSERT</div><div class="mg-track-label track-label-right">ACCEPT</div>
          <div class="mg-access-reader" id="mg-access-reader"><span class="mg-reader-scan"></span><b>72-A</b><small>SCAN</small></div>
          <button id="mg-access-card" class="mg-access-card" aria-label="Kartu akses Bunker 72, geser ke kanan"><span class="mg-card-chip"></span><span class="mg-card-title">BUNKER <b>72</b></span><span class="mg-card-name">KELUARGA // PRIORITAS</span><span class="mg-card-barcode"></span><span class="mg-card-number">72 04 19 87</span></button>
        </div>
      </div>
      <div class="mg-instruction-strip"><span class="mg-strip-icon">→</span><span>Tekan kartu lalu geser lurus ke kanan sampai masuk penuh ke area pembaca.</span><span class="mg-strip-code">ID-SWIPE</span></div>`;

    const track = this.panel.querySelector('#mg-card-track');
    const card = this.panel.querySelector('#mg-access-card');
    const status = this.panel.querySelector('#mg-card-status');
    let dragging = false;
    let startX = 0;
    let originX = 0;
    const maxX = () => Math.max(0, track.clientWidth - card.offsetWidth - 18);
    const update = (x) => {
      const max = maxX();
      this.cardX = Math.max(0, Math.min(max, x));
      card.style.transform = `translateX(${this.cardX}px)`;
      card.style.setProperty('--swipe-progress', `${max ? (this.cardX / max) * 100 : 0}%`);
      if (max > 20 && this.cardX >= max - 3) {
        status.textContent = 'KARTU TERBACA — TAHAN';
        status.parentElement.parentElement.classList.add('is-ready');
      } else if (dragging) {
        status.textContent = 'MEMBACA STRIPE...';
      }
    };
    const start = (event) => {
      dragging = true;
      startX = event.clientX;
      originX = this.cardX;
      card.classList.add('is-grabbed');
      card.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    };
    const move = (event) => {
      if (!dragging) return;
      update(originX + event.clientX - startX);
      event.preventDefault();
    };
    const end = () => {
      if (!dragging) return;
      dragging = false;
      card.classList.remove('is-grabbed');
      const max = maxX();
      if (max > 20 && this.cardX >= max - 3) {
        status.textContent = 'AKSES DITERIMA';
        this.finishStation('card');
      } else {
        status.textContent = 'GESER LEBIH JAUH KE KANAN';
        card.classList.add('is-returning');
        update(0);
        window.setTimeout(() => card.classList.remove('is-returning'), 360);
        this.setFeedback('KARTU BELUM MELEWATI PEMBACA', 'error');
      }
    };
    const key = (event) => {
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        const max = maxX();
        update(this.cardX + max * 0.18);
        if (max > 20 && this.cardX >= max - 3) {
          status.textContent = 'AKSES DITERIMA';
          this.finishStation('card');
        }
      }
    };
    card.addEventListener('pointerdown', start);
    card.addEventListener('pointermove', move);
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
    card.addEventListener('keydown', key);
    this.cleanupFns.push(() => {
      card.removeEventListener('pointerdown', start);
      card.removeEventListener('pointermove', move);
      card.removeEventListener('pointerup', end);
      card.removeEventListener('pointercancel', end);
      card.removeEventListener('keydown', key);
    });
  }

  renderWires(intro) {
    const colors = ['red', 'yellow', 'blue', 'green'];
    const rightOrder = ['blue', 'green', 'red', 'yellow'];
    this.wireConnections = {};
    this.panel.innerHTML = `${intro}
      <div class="mg-wire-head"><span>PATCH BAY / 04 CHANNELS</span><b id="mg-wire-count">0 / 4 TERHUBUNG</b></div>
      <div class="mg-wire-board" id="mg-wire-board">
        <div class="mg-wire-column"><span class="mg-wire-column-label">SUMBER</span>${colors.map((color) => `<button class="mg-wire-terminal mg-wire-terminal--left wire-${color}" data-color="${color}" aria-label="Terminal ${COLORS[color].label} kiri"><i></i><b>${COLORS[color].label}</b><small>OUT</small></button>`).join('')}</div>
        <div class="mg-wire-cables" id="mg-wire-cables"></div>
        <div class="mg-wire-column mg-wire-column--right"><span class="mg-wire-column-label">DISTRIBUSI</span>${rightOrder.map((color) => `<button class="mg-wire-terminal mg-wire-terminal--right wire-${color}" data-color="${color}" aria-label="Terminal ${COLORS[color].label} kanan"><i></i><b>${COLORS[color].label}</b><small>IN</small></button>`).join('')}</div>
        <div class="mg-wire-harness"><span></span><span></span><span></span><span></span></div>
      </div>
      <div class="mg-instruction-strip"><span class="mg-strip-icon">⌁</span><span>Tarik kabel dari terminal SUMBER menuju DISTRIBUSI dengan warna yang sama.</span><span class="mg-strip-code">PATCH-04</span></div>`;

    const board = this.panel.querySelector('#mg-wire-board');
    const cableLayer = this.panel.querySelector('#mg-wire-cables');
    let drag = null;

    const pointFor = (element) => {
      const boardRect = board.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      return {
        x: rect.left - boardRect.left + rect.width / 2,
        y: rect.top - boardRect.top + rect.height / 2,
      };
    };
    const drawLine = (line, from, to, color) => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      line.style.left = `${from.x}px`;
      line.style.top = `${from.y}px`;
      line.style.width = `${length}px`;
      line.style.setProperty('--wire-color', COLORS[color].hex);
      line.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    };
    const redraw = () => {
      cableLayer.querySelectorAll('.mg-wire-cable').forEach((line) => {
        const from = board.querySelector(`[data-color="${line.dataset.color}"].mg-wire-terminal--left`);
        const to = board.querySelector(`[data-color="${line.dataset.color}"].mg-wire-terminal--right`);
        if (from && to) drawLine(line, pointFor(from), pointFor(to), line.dataset.color);
      });
      if (drag?.preview) drawLine(drag.preview, pointFor(drag.from), drag.pointer, drag.color);
    };
    const move = (event) => {
      if (!drag) return;
      const rect = board.getBoundingClientRect();
      drag.pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      drawLine(drag.preview, pointFor(drag.from), drag.pointer, drag.color);
      event.preventDefault();
    };
    const end = (event) => {
      if (!drag) return;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.mg-wire-terminal--right');
      const color = drag.color;
      if (target?.dataset.color === color && !this.wireConnections[color]) {
        this.wireConnections[color] = target;
        drag.preview.remove();
        drag = null;
        const left = board.querySelector(`[data-color="${color}"].mg-wire-terminal--left`);
        const line = document.createElement('div');
        line.className = 'mg-wire-cable';
        line.dataset.color = color;
        cableLayer.appendChild(line);
        left.classList.add('is-connected');
        target.classList.add('is-connected');
        drawLine(line, pointFor(left), pointFor(target), color);
        const count = Object.keys(this.wireConnections).length;
        this.panel.querySelector('#mg-wire-count').textContent = `${count} / 4 TERHUBUNG`;
        this.setFeedback(`${COLORS[color].label} TERHUBUNG`, 'success');
        if (count === colors.length) this.finishStation('wires');
      } else {
        drag.preview.remove();
        drag = null;
        this.setFeedback(target ? 'SALAH WARNA — KABEL DILEPAS' : 'KABEL TERPUTUS — COBA LAGI', 'error');
      }
      event.preventDefault();
    };
    const start = (event) => {
      const terminal = event.target.closest('.mg-wire-terminal--left');
      if (!terminal || this.wireConnections[terminal.dataset.color]) return;
      const preview = document.createElement('div');
      preview.className = 'mg-wire-cable mg-wire-cable--preview';
      cableLayer.appendChild(preview);
      drag = { color: terminal.dataset.color, from: terminal, preview, pointer: pointFor(terminal) };
      board.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    };
    board.addEventListener('pointerdown', start);
    board.addEventListener('pointermove', move);
    board.addEventListener('pointerup', end);
    board.addEventListener('pointercancel', end);
    this.wireResizeHandler = redraw;
    window.addEventListener('resize', redraw);
    this.cleanupFns.push(() => {
      window.removeEventListener('resize', redraw);
      board.removeEventListener('pointerdown', start);
      board.removeEventListener('pointermove', move);
      board.removeEventListener('pointerup', end);
      board.removeEventListener('pointercancel', end);
    });
    window.requestAnimationFrame(redraw);
  }

  finishStation(stationId) {
    this.clearStation({ keepPanel: true });
    const station = STATIONS[stationId] || {};
    const successMsg = station.defaultSuccessMessage || 'PROTOKOL BERHASIL';
    this.setFeedback(successMsg, 'success');

    const badge = this.panel?.querySelector('.mg-state-badge');
    if (badge) {
      badge.classList.add('is-success');
      badge.innerHTML = '<span class="mg-state-led"></span><span>STATUS <b>SELESAI ✓</b></span>';
    }

    const pill = this.root?.querySelector('.mg-status-pill');
    if (pill) {
      pill.textContent = 'SELESAI';
      pill.classList.add('is-success');
    }

    this.timeouts.push(window.setTimeout(() => {
      const onDone = this.activeOptions?.onComplete || this.defaultOnComplete;
      this.close();
      onDone?.({ success: true, stationId });
    }, 900));
  }

  failStation(stationId, message) {
    this.clearStation({ keepPanel: true });
    const failMsg = message || 'SEKUENSI GAGAL';
    this.setFeedback(failMsg, 'error');

    const badge = this.panel?.querySelector('.mg-state-badge');
    if (badge) {
      badge.classList.remove('is-success');
      badge.style.borderColor = 'var(--mg-red)';
      badge.innerHTML = '<span class="mg-state-led" style="background:var(--mg-red);box-shadow:0 0 10px var(--mg-red)"></span><span>STATUS <b>ERROR ✕</b></span>';
    }

    const pill = this.root?.querySelector('.mg-status-pill');
    if (pill) {
      pill.textContent = 'ERROR';
      pill.classList.add('is-error');
    }

    this.timeouts.push(window.setTimeout(() => {
      const onFail = this.activeOptions?.onFailure;
      this.close();
      onFail?.({ success: false, stationId });
    }, 1000));
  }

  clearStation({ keepPanel = false } = {}) {
    this.timeouts.forEach((t) => window.clearTimeout(t));
    this.timeouts = [];
    if (this.numberTimer) {
      window.clearInterval(this.numberTimer);
      this.numberTimer = null;
    }
    this.cleanupFns.splice(0).forEach((cleanup) => cleanup());
    if (!keepPanel && this.panel) this.panel.innerHTML = '';
  }

  setFeedback(message, tone = 'neutral') {
    if (!this.feedback) return;
    this.feedback.textContent = message;
    this.feedback.dataset.tone = tone;
  }
}
