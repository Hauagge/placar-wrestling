(function () {
  const PERIOD_SECONDS = 180; // 3 minutos por período
  const REST_SECONDS = 30;    // descanso entre períodos (30s)

  const els = {
    redPoints: document.getElementById('redPoints'),
    bluePoints: document.getElementById('bluePoints'),
    redLast: document.getElementById('redLast'),
    blueLast: document.getElementById('blueLast'),
    redCaution: document.getElementById('redCaution'),
    blueCaution: document.getElementById('blueCaution'),
    redHi: document.getElementById('redHi'),
    blueHi: document.getElementById('blueHi'),
    time: document.getElementById('time'),
    period: document.getElementById('period'),
    techGap: document.getElementById('techGap'),
    status: document.getElementById('status'),
    redScoreBox: document.getElementById('redScoreBox'),
    blueScoreBox: document.getElementById('blueScoreBox'),
    redShortClock: document.getElementById('redShortClock'),
    blueShortClock: document.getElementById('blueShortClock'),
    redPanel: document.getElementById('redPanel'),
    bluePanel: document.getElementById('bluePanel'),
  };

  const app = document.getElementById('app');
  const controls = app.querySelectorAll('[data-act]');

  const state = {
    red: { score: 0, cautions: 0, hi: 0 },
    blue: { score: 0, cautions: 0, hi: 0 },
    lastScorer: null, // 'red' | 'blue'
    period: 1,
    seconds: PERIOD_SECONDS,
    running: false,
    timerId: null,
    history: [], // stack de ações para desfazer
    isRest: false, // está em tempo de descanso entre períodos
  };

  // short clock (passividade) separado do tempo principal
  const shortClock = {
    side: null, // 'red' | 'blue'
    seconds: 0,
    timerId: null,
  };

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${pad(m)}:${pad(s)}`;
  }

  function render() {
    els.redPoints.textContent = state.red.score;
    els.bluePoints.textContent = state.blue.score;
    els.redCaution.textContent = state.red.cautions;
    els.blueCaution.textContent = state.blue.cautions;
    els.redHi.textContent = state.red.hi;
    els.blueHi.textContent = state.blue.hi;
    els.time.textContent = fmtTime(state.seconds);
    els.period.textContent = state.period;

    document.getElementById('redLast').textContent =
      'Último ponto: ' +
      (state.lastScorer === 'red'
        ? 'Vermelho'
        : state.lastScorer === 'blue'
        ? 'Azul'
        : '—');

    document.getElementById('blueLast').textContent =
      'Último ponto: ' +
      (state.lastScorer === 'blue'
        ? 'Azul'
        : state.lastScorer === 'red'
        ? 'Vermelho'
        : '—');

    // superioridade técnica (só mostra se não estiver em descanso nem com short clock ativo)
    const gap = Math.abs(state.red.score - state.blue.score);
    const tech = Number(els.techGap.value || 10);

    [els.redScoreBox, els.blueScoreBox].forEach((b) =>
      b.classList.remove('winner', 'super'),
    );

    if (!state.isRest && shortClock.side === null && gap >= tech) {
      if (state.red.score > state.blue.score) {
        els.redScoreBox.classList.add('winner', 'super');
      } else {
        els.blueScoreBox.classList.add('winner', 'super');
      }
      els.status.textContent =
        'Vitória por superioridade técnica (diferença ≥ ' + tech + ').';
    }

    // render short clock
    if (shortClock.side === 'red') {
      els.redShortClock.textContent = `0:${pad(shortClock.seconds)}`;
      els.blueShortClock.textContent = '—';
    } else if (shortClock.side === 'blue') {
      els.blueShortClock.textContent = `0:${pad(shortClock.seconds)}`;
      els.redShortClock.textContent = '—';
    } else {
      els.redShortClock.textContent = '—';
      els.blueShortClock.textContent = '—';
    }

    // destaque visual do atleta em passividade
    els.redPanel.classList.remove('passive');
    els.bluePanel.classList.remove('passive');
    if (shortClock.side === 'red') {
      els.redPanel.classList.add('passive');
    } else if (shortClock.side === 'blue') {
      els.bluePanel.classList.add('passive');
    }
  }

  function pushHistory(action) {
    state.history.push(
      JSON.stringify({ action, snapshot: structuredClone(state) }),
    );
  }

  function score(side, val) {
    pushHistory({ type: 'score', side, val });
    const s = state[side];
    s.score += val;
    if (s.score < 0) s.score = 0;
    s.hi = Math.max(s.hi, val);
    state.lastScorer = side;

    // se o atleta em short clock pontuar, cancela o short
    if (shortClock.side === side) {
      els.status.textContent = `Short clock cancelado: ${
        side === 'red' ? 'Vermelho' : 'Azul'
      } pontuou durante o tempo de passividade.`;
      stopShortClock();
    }

    render();
  }

  function deduct(side, val) {
    pushHistory({ type: 'deduct', side, val });
    state[side].score = Math.max(0, state[side].score - val);
    // normalmente ponto vai ao oponente em penalidades
    state.lastScorer = side === 'red' ? 'blue' : 'red';
    render();
  }

  function caution(side) {
    pushHistory({ type: 'caution', side });
    state[side].cautions++;
    render();
  }

  function fall(side) {
    // Vitória imediata por queda
    state.running = false;
    clearInterval(state.timerId);
    els.status.textContent = `Queda! Vitória de ${
      side === 'red' ? 'Vermelho' : 'Azul'
    }.`;
    if (side === 'red') {
      els.redScoreBox.classList.add('winner');
      els.blueScoreBox.classList.remove('winner');
    } else {
      els.blueScoreBox.classList.add('winner');
      els.redScoreBox.classList.remove('winner');
    }
    beep(700, 600);
    stopShortClock();
  }

  function undo() {
    if (!state.history.length) return;

    state.history.pop(); // remove o último registro

    const last = [...state.history]
      .reverse()
      .find((h) => JSON.parse(h).snapshot);

    if (last) {
      const snap = JSON.parse(last).snapshot;
      ['red', 'blue', 'lastScorer', 'period', 'seconds', 'running', 'isRest'].forEach(
        (k) => {
          state[k] = structuredClone(snap[k]);
        },
      );
    } else {
      Object.assign(state, {
        red: { score: 0, cautions: 0, hi: 0 },
        blue: { score: 0, cautions: 0, hi: 0 },
        lastScorer: null,
        period: 1,
        seconds: PERIOD_SECONDS,
        running: false,
        isRest: false,
      });
    }

    clearInterval(state.timerId);
    state.timerId = null;
    render();
  }

  function start() {
    if (state.running || state.isRest) return; // não iniciar se estiver em descanso
    state.running = true;
    state.timerId = setInterval(() => {
      if (state.seconds > 0) {
        state.seconds--;
        render();
        if (state.seconds === 0) {
          endPeriod();
        }
      }
    }, 1000);
  }

  function pause() {
    state.running = false;
    clearInterval(state.timerId);
    state.timerId = null;
  }

  function resetTimer() {
    pause();
    state.isRest = false;
    state.seconds = PERIOD_SECONDS;
    els.status.textContent = '';
    render();
  }

  function nextPeriod() {
    // botão manual para pular direto pro próximo período
    pause();
    stopShortClock();
    state.isRest = false;
    if (state.period < 2) {
      state.period++;
      state.seconds = PERIOD_SECONDS;
      els.status.textContent = '';
      render();
    }
  }

  function endPeriod() {
    pause();
    beep(440, 800);
    stopShortClock();

    if (state.period === 2) {
      const winner = decideByCriteria();
      if (winner) {
        els.status.textContent = `Fim da luta. Vitória por critério: ${
          winner === 'red' ? 'Vermelho' : 'Azul'
        }.`;
        if (winner === 'red') {
          els.redScoreBox.classList.add('winner');
        } else {
          els.blueScoreBox.classList.add('winner');
        }
      } else {
        els.status.textContent = 'Fim da luta.';
      }
    } else {
      els.status.textContent = `Fim do 1º período. Descanso de ${REST_SECONDS}s.`;
      startRest();
    }
  }

  function decideByCriteria() {
    if (state.red.score !== state.blue.score) {
      return state.red.score > state.blue.score ? 'red' : 'blue';
    }
    // 1) Maior valor de ação
    if (state.red.hi !== state.blue.hi) {
      return state.red.hi > state.blue.hi ? 'red' : 'blue';
    }
    // 2) Menos cautelas
    if (state.red.cautions !== state.blue.cautions) {
      return state.red.cautions < state.blue.cautions ? 'red' : 'blue';
    }
    // 3) Quem marcou por último
    if (state.lastScorer) {
      return state.lastScorer;
    }
    return null;
  }

  function swapSides() {
    const r = structuredClone(state.red);
    const b = structuredClone(state.blue);
    state.red = b;
    state.blue = r;
    state.lastScorer =
      state.lastScorer === 'red'
        ? 'blue'
        : state.lastScorer === 'blue'
        ? 'red'
        : null;

    // se tiver short clock ativo, troca de lado também
    if (shortClock.side === 'red') shortClock.side = 'blue';
    else if (shortClock.side === 'blue') shortClock.side = 'red';

    render();
  }

  function resetMatch() {
    pause();
    Object.assign(state, {
      red: { score: 0, cautions: 0, hi: 0 },
      blue: { score: 0, cautions: 0, hi: 0 },
      lastScorer: null,
      period: 1,
      seconds: PERIOD_SECONDS,
      running: false,
      history: [],
      isRest: false,
    });
    els.status.textContent = '';
    [els.redScoreBox, els.blueScoreBox].forEach((b) =>
      b.classList.remove('winner', 'super'),
    );
    stopShortClock();
    render();
  }

  function beep(freq = 440, ms = 500) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = 'square';
      o.frequency.value = freq;
      g.gain.value = 0.03;
      o.start();
      setTimeout(() => {
        o.stop();
        ctx.close();
      }, ms);
    } catch (e) {
      // ignora falha de áudio
    }
  }

  // ==== DESCANSO ENTRE PERÍODOS ====
  function startRest() {
    state.isRest = true;
    state.seconds = REST_SECONDS;
    render();
    state.running = true;
    state.timerId = setInterval(() => {
      if (state.seconds > 0) {
        state.seconds--;
        render();
        if (state.seconds === 0) {
          endRest();
        }
      }
    }, 1000);
  }

  function endRest() {
    pause();
    state.isRest = false;
    state.period = 2;
    state.seconds = PERIOD_SECONDS;
    els.status.textContent = 'Início do 2º período.';
    render();
  }

  // ==== SHORT CLOCK (30s de passividade) ====
  function startShortClock(side) {
    // reinicia se já tiver algum ativo
    stopShortClock();

    shortClock.side = side;
    shortClock.seconds = 45;
    els.status.textContent = `Tempo de passividade iniciado para ${
      side === 'red' ? 'Vermelho' : 'Azul'
    } (45s).`;
    render();

    shortClock.timerId = setInterval(() => {
      if (shortClock.seconds > 0) {
        shortClock.seconds--;
        render();
        if (shortClock.seconds === 0) {
          shortClockExpired();
        }
      }
    }, 1000);
  }

  function stopShortClock() {
    if (shortClock.timerId) {
      clearInterval(shortClock.timerId);
      shortClock.timerId = null;
    }
    shortClock.side = null;
    shortClock.seconds = 0;
    render();
  }

  function shortClockExpired() {
    const side = shortClock.side;
    if (!side) return;

    const opponent = side === 'red' ? 'blue' : 'red';
    score(opponent, 1);
    els.status.textContent = `Tempo de passividade (45s) esgotado: +1 ponto para ${
      opponent === 'red' ? 'Vermelho' : 'Azul'
    }.`;
    stopShortClock();
  }

  function cancelShortClock(side) {
    if (shortClock.side !== side) return;
    els.status.textContent = `Short clock cancelado para ${
      side === 'red' ? 'Vermelho' : 'Azul'
    } pelo árbitro.`;
    stopShortClock();
  }

  // Actions dos botões
  controls.forEach((btn) =>
    btn.addEventListener('click', (e) => {
      const { act, side, val } = e.currentTarget.dataset;
      if (act === 'score') score(side, Number(val));
      if (act === 'deduct') deduct(side, Number(val));
      if (act === 'caution') caution(side);
      if (act === 'fall') fall(side);
      if (act === 'undoSide') undo();
      if (act === 'shortclock') startShortClock(side);
      if (act === 'cancelShort') cancelShortClock(side);
    }),
  );

  // Top toolbar
  document.getElementById('btnStart').onclick = start;
  document.getElementById('btnPause').onclick = pause;
  document.getElementById('btnResetTimer').onclick = resetTimer;
  document.getElementById('btnNextPeriod').onclick = nextPeriod;
  document.getElementById('btnSwap').onclick = swapSides;
  document.getElementById('btnReset').onclick = resetMatch;
  document.getElementById('btnFullscreen').onclick = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  // atalhos de teclado
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === ' ') {
      e.preventDefault();
      state.running ? pause() : start();
    } else if (k === 'r') {
      resetTimer();
    } else if (k === 'p') {
      nextPeriod();
    } else if (k === 'u') {
      undo();
    }
    // Red: A/S/D/F
    else if (k === 'a') {
      score('red', 1);
    } else if (k === 's') {
      score('red', 2);
    } else if (k === 'd') {
      score('red', 4);
    } else if (k === 'f') {
      score('red', 5);
    }
    // Blue: J/K/L/;
    else if (k === 'j') {
      score('blue', 1);
    } else if (k === 'k') {
      score('blue', 2);
    } else if (k === 'l') {
      score('blue', 4);
    } else if (k === ';') {
      score('blue', 5);
    }
  });

  render();
})();
