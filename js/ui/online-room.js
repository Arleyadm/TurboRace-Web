"use strict";

class TelaOnline {
  constructor(app) {
    this.app = app;
    this.save = app.save;
    this.status = "Crie uma sala ou entre com um código";
    this.codigo = "";
    this.host = false;
    this.resumo = null;
    this.botoes = [];
    this.formularioSala = null;
    this.foco = -1;
  }

  entrar() { this.app.sound.startMusic("menu_music"); }
  sair() {
    this.fecharConfiguracaoSala();
    if (!OnlineSession.enabled) OnlineSession.service?.close();
  }
  update() {}
  medir() {}

  climaEscolhido(valor) {
    const entrada = String(valor || "auto").trim().toLowerCase();
    const mapa = {
      "1": "auto", "auto": "auto", "automático": "auto", "automatico": "auto",
      "2": "sun", "sol": "sun", "ensolarado": "sun",
      "3": "rain_light", "chuva": "rain_light", "chuva leve": "rain_light",
      "4": "rain_heavy", "chuva forte": "rain_heavy", "temporal": "rain_heavy",
      "5": "snow", "neve": "snow",
      "6": "fog", "neblina": "fog", "névoa": "fog", "nevoa": "fog",
      "7": "night", "noite": "night"
    };
    return mapa[entrada] || "auto";
  }

  configuracaoPadrao() {
    const nomePadrao = "Sala de " + (this.save.playerName || "Jogador");
    const fase = 0;
    return { salaNome: nomePadrao, max: 4, fase, voltas: StageCatalog.byIndex(fase).laps || 3, clima: "auto", pocaAgua: true, pocaOleo: false };
  }

  abrirConfiguracaoSala() {
    if (this.formularioSala) return;
    const padrao = this.configuracaoPadrao();
    const opcoesFase = [];
    for (let i = 0; i < StageCatalog.count(); i++) {
      const fase = StageCatalog.byIndex(i);
      opcoesFase.push(`<option value="${i}">${i + 1}. ${fase.countryName} — ${fase.name}</option>`);
    }
    const overlay = document.createElement("div");
    overlay.className = "sala-config-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Configurar sala online");
    overlay.innerHTML = `
      <form class="sala-config-card">
        <header class="sala-config-header">
          <span class="sala-config-kicker">JOGAR ONLINE</span>
          <h1>CONFIGURAR SALA</h1>
          <p>Monte a corrida do seu jeito e convide até 24 pilotos.</p>
        </header>
        <section class="sala-config-bloco">
          <h2>IDENTIDADE DA SALA</h2>
          <div class="sala-config-grid sala-config-grid-identidade">
            <label><span>Nome da sala</span><input name="salaNome" maxlength="24" autocomplete="off"></label>
            <label><span>Máximo de jogadores</span><input name="max" type="number" min="2" max="24" inputmode="numeric"></label>
          </div>
        </section>
        <section class="sala-config-bloco">
          <h2>PISTA E CORRIDA</h2>
          <div class="sala-config-grid">
            <label class="sala-config-largo"><span>Pista</span><select name="fase">${opcoesFase.join("")}</select></label>
            <label><span>Voltas</span><input name="voltas" type="number" min="1" max="10" inputmode="numeric"></label>
            <label><span>Clima</span><select name="clima"><option value="auto">Automático</option><option value="sun">Sol</option><option value="rain_light">Chuva leve</option><option value="rain_heavy">Chuva forte</option><option value="snow">Neve</option><option value="fog">Neblina</option><option value="night">Noite</option></select></label>
          </div>
        </section>
        <section class="sala-config-bloco">
          <h2>DESAFIOS DA PISTA</h2>
          <div class="sala-config-opcoes">
            <label class="sala-config-toggle"><span><b>Poças d'água</b><small>Perda de aderência em trechos molhados</small></span><input name="pocaAgua" type="checkbox"><i></i></label>
            <label class="sala-config-toggle"><span><b>Poças de óleo</b><small>Derrapagens e mais risco nas curvas</small></span><input name="pocaOleo" type="checkbox"><i></i></label>
          </div>
        </section>
        <footer class="sala-config-acoes"><button class="sala-config-voltar" type="button">VOLTAR</button><button class="sala-config-criar" type="submit">CRIAR SALA</button></footer>
      </form>`;
    const form = overlay.querySelector("form");
    form.elements.salaNome.value = padrao.salaNome;
    form.elements.max.value = padrao.max;
    form.elements.fase.value = padrao.fase;
    form.elements.voltas.value = padrao.voltas;
    form.elements.clima.value = padrao.clima;
    form.elements.pocaAgua.checked = padrao.pocaAgua;
    form.elements.pocaOleo.checked = padrao.pocaOleo;
    form.elements.fase.addEventListener("change", () => {
      form.elements.voltas.value = StageCatalog.byIndex(Number(form.elements.fase.value)).laps || 3;
    });
    form.querySelector(".sala-config-voltar").addEventListener("click", () => this.fecharConfiguracaoSala());
    form.addEventListener("submit", evento => {
      evento.preventDefault();
      const salaNome = String(form.elements.salaNome.value || padrao.salaNome).trim().slice(0, 24) || padrao.salaNome;
      const max = limitar(Math.trunc(Number(form.elements.max.value) || 4), 2, 24);
      const fase = limitar(Math.trunc(Number(form.elements.fase.value) || 0), 0, StageCatalog.count() - 1);
      const voltas = limitar(Math.trunc(Number(form.elements.voltas.value) || 3), 1, 10);
      const clima = this.climaEscolhido(form.elements.clima.value);
      const configuracao = { salaNome, max, fase, voltas, clima, pocaAgua: form.elements.pocaAgua.checked, pocaOleo: form.elements.pocaOleo.checked };
      this.fecharConfiguracaoSala();
      this.conectar(true, configuracao);
    });
    this.app.camadaHtml.appendChild(overlay);
    this.formularioSala = overlay;
  }

  fecharConfiguracaoSala() {
    if (this.formularioSala?.parentNode) this.formularioSala.parentNode.removeChild(this.formularioSala);
    this.formularioSala = null;
  }

  conectar(criar, configuracao) {
    const digitado = criar ? "" : String(prompt("Código da sala:", this.codigo) || "").trim().toUpperCase();
    if (!criar && !digitado) return;
    configuracao = criar ? (configuracao || this.configuracaoPadrao()) : {};
    this.status = "Conectando ao servidor…";
    const service = new OnlineService(this.save.onlineServerUrl);
    OnlineSession.service = service;
    OnlineSession.isHost = criar;
    OnlineSession.enabled = false;
    service.setListener({
      onStatus: m => { this.status = m; },
      onConnected: () => {},
      onDisconnected: m => { this.status = m; },
      onRawMessage: () => {},
      onStateReceived: () => {},
      onRoomUpdate: r => {
        this.resumo = r;
        this.codigo = r.id || this.codigo;
        this.host = r.anfitriaoPid === service.pid;
        this.status = "Sala pronta — compartilhe o código";
      },
      onRaceStart: r => {
        OnlineSession.enabled = true;
        OnlineSession.stageIndex = r.fase;
        const esperaSincronizada = Math.max(0, (r.emMs || 0) - (service.latenciaMs || 0) / 2);
        this.app.irPara("corrida", {
          stageIndex: r.fase,
          semente: r.semente,
          esperaLargadaMs: esperaSincronizada,
          clima: r.clima,
          pocaAgua: r.pocaAgua,
          pocaOleo: r.pocaOleo,
          voltas: r.voltas
        });
      }
    });
    service.conectar(Object.assign({
      criar: criar,
      sala: digitado,
      nome: this.save.playerName,
      carId: this.save.selectedCarId
    }, configuracao));
  }

  nomeDoClima(clima) {
    return ({
      auto: "AUTOMÁTICO", sun: "SOL", rain_light: "CHUVA LEVE",
      rain_heavy: "CHUVA FORTE", snow: "NEVE", fog: "NEBLINA", night: "NOITE"
    })[clima] || "AUTOMÁTICO";
  }

  render(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#07152f");
    g.addColorStop(1, "#27062f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    // Antes de criar a sala, preserva a composição original: título maior,
    // mais respiro e botões largos. O painel detalhado só aparece na sala.
    ctx.font = `900 ${Math.max(28, h * (this.codigo ? .085 : .10))}px ${FONTE}`;
    ctx.fillStyle = "#39efff";
    ctx.fillText("SALA ONLINE", w / 2, h * (this.codigo ? .13 : .16));
    ctx.font = `700 ${Math.max(15, h * (this.codigo ? .031 : .035))}px ${FONTE}`;
    ctx.fillStyle = "#fff";
    ctx.fillText(this.codigo ? "CÓDIGO: " + this.codigo : this.status, w / 2, h * (this.codigo ? .22 : .27));

    if (this.resumo) {
      const s = this.resumo;
      ctx.font = `700 ${Math.max(11, h * .021)}px ${FONTE}`;
      ctx.fillStyle = "#b8faff";
      ctx.fillText((s.nome || "SALA") + "  •  " + s.jogadores.length + "/" + s.maxJogadores + " JOGADORES", w / 2, h * .275);
      ctx.fillStyle = "#ffe36a";
      ctx.fillText(
        "FASE " + (Number(s.fase) + 1) + "  •  " + s.voltas + " VOLTAS  •  " + this.nomeDoClima(s.clima) +
        "  •  ÁGUA " + (s.pocaAgua ? "SIM" : "NÃO") + "  •  ÓLEO " + (s.pocaOleo ? "SIM" : "NÃO"),
        w / 2, h * .315
      );
    }

    const labels = this.codigo ? ["PRONTO", "INICIAR CORRIDA", "VOLTAR"] : ["CONFIGURAR SALA", "ENTRAR NA SALA", "VOLTAR"];
    this.botoes = [];
    labels.forEach((t, i) => {
      const inicio = this.codigo ? .37 : .38;
      const passo = this.codigo ? .15 : .16;
      const alturaBotao = this.codigo ? .105 : .11;
      const r = { left: w * .28, right: w * .72, top: h * (inicio + i * passo), bottom: h * (inicio + alturaBotao + i * passo) };
      this.botoes.push(r);
      const grad = ctx.createLinearGradient(r.left, 0, r.right, 0);
      grad.addColorStop(0, i === 1 ? "#fe2d9b" : "#196dff");
      grad.addColorStop(1, "#632cff");
      ctx.fillStyle = grad;
      retanguloArredondado(ctx, r, 18);
      ctx.fill();
      ctx.strokeStyle = "#63f6ff";
      ctx.lineWidth = this.foco === i ? 4 : 2;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = `800 ${Math.max(14, h * (this.codigo ? .032 : .035))}px ${FONTE}`;
      ctx.fillText(t, w / 2, (r.top + r.bottom) / 2 + h * .011);
    });

    if (this.resumo?.jogadores) {
      ctx.font = `600 ${Math.max(11, h * .021)}px ${FONTE}`;
      ctx.fillStyle = "#fff";
      const nomes = this.resumo.jogadores.map(p => p.nome + (p.pronto ? " ✓" : ""));
      const limite = 8;
      ctx.fillText(nomes.slice(0, limite).join("  •  ") + (nomes.length > limite ? "  +" + (nomes.length - limite) : ""), w / 2, h * .91);
    }
  }

  aoApontar(tipo, x, y) {
    if (tipo !== "cima") return;
    const i = this.botoes.findIndex(r => Ret.contem(r, x, y));
    if (i < 0) return;
    this.foco = i;
    this.acionarIndice(i);
  }

  acionarIndice(i) {
    if (!this.codigo) {
      if (i === 0) this.abrirConfiguracaoSala();
      else if (i === 1) this.conectar(false);
      else this.app.irPara("menu");
    } else {
      if (i === 0) OnlineSession.service?.setReady(true);
      else if (i === 1) {
        if (this.host) OnlineSession.service?.startRace();
        else this.status = "Somente o anfitrião pode iniciar";
      } else {
        OnlineSession.clear();
        this.app.irPara("menu");
      }
    }
  }

  aoTeclar(evento, apertou) {
    if (!apertou || this.formularioSala) return;
    if (evento.code === "ArrowDown" || evento.code === "ArrowRight") this.foco = (this.foco + 1) % 3;
    else if (evento.code === "ArrowUp" || evento.code === "ArrowLeft") this.foco = this.foco <= 0 ? 2 : this.foco - 1;
    else if ((evento.code === "Enter" || evento.code === "Space") && this.foco >= 0) this.acionarIndice(this.foco);
    else if (evento.code === "Escape") this.acionarIndice(2);
  }
}

window.TelaOnline = TelaOnline;
