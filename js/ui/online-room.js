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
  }

  entrar() { this.app.sound.startMusic("menu_music"); }
  sair() { if (!OnlineSession.enabled) OnlineSession.service?.close(); }
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

  configurarSala() {
    const nomePadrao = "Sala de " + (this.save.playerName || "Jogador");
    const salaNome = String(prompt("Nome da sala:", nomePadrao) || nomePadrao).trim().slice(0, 24);
    const maxDigitado = Number(prompt("Quantos jogadores? Escolha de 2 até 24:", "4"));
    const max = limitar(Number.isFinite(maxDigitado) ? Math.trunc(maxDigitado) : 4, 2, 24);
    const faseDigitada = Number(prompt("Número da fase (1 até " + StageCatalog.count() + "):", "1"));
    const fase = limitar(Number.isFinite(faseDigitada) ? Math.trunc(faseDigitada) - 1 : 0, 0, StageCatalog.count() - 1);
    const voltasPadrao = StageCatalog.byIndex(fase).laps || 3;
    const voltasDigitadas = Number(prompt("Número de voltas (1 até 10):", String(voltasPadrao)));
    const voltas = limitar(Number.isFinite(voltasDigitadas) ? Math.trunc(voltasDigitadas) : voltasPadrao, 1, 10);
    const clima = this.climaEscolhido(prompt(
      "Clima: 1 Automático, 2 Sol, 3 Chuva leve, 4 Chuva forte, 5 Neve, 6 Neblina, 7 Noite:",
      "1"
    ));
    const pocaAgua = confirm("Ativar poças d'água nesta corrida?");
    const pocaOleo = confirm("Ativar poças de óleo nesta corrida?");
    return { salaNome, max, fase, voltas, clima, pocaAgua, pocaOleo };
  }

  conectar(criar) {
    const digitado = criar ? "" : String(prompt("Código da sala:", this.codigo) || "").trim().toUpperCase();
    if (!criar && !digitado) return;
    const configuracao = criar ? this.configurarSala() : {};
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
    ctx.font = `900 ${Math.max(28, h * .085)}px ${FONTE}`;
    ctx.fillStyle = "#39efff";
    ctx.fillText("SALA ONLINE", w / 2, h * .13);
    ctx.font = `700 ${Math.max(15, h * .031)}px ${FONTE}`;
    ctx.fillStyle = "#fff";
    ctx.fillText(this.codigo ? "CÓDIGO: " + this.codigo : this.status, w / 2, h * .22);

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

    const labels = this.codigo ? ["PRONTO", "INICIAR CORRIDA", "VOLTAR"] : ["CRIAR SALA", "ENTRAR NA SALA", "VOLTAR"];
    this.botoes = [];
    labels.forEach((t, i) => {
      const inicio = this.codigo ? .37 : .36;
      const r = { left: w * .28, right: w * .72, top: h * (inicio + i * .15), bottom: h * (inicio + .105 + i * .15) };
      this.botoes.push(r);
      const grad = ctx.createLinearGradient(r.left, 0, r.right, 0);
      grad.addColorStop(0, i === 1 ? "#fe2d9b" : "#196dff");
      grad.addColorStop(1, "#632cff");
      ctx.fillStyle = grad;
      retanguloArredondado(ctx, r, 18);
      ctx.fill();
      ctx.strokeStyle = "#63f6ff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = `800 ${Math.max(14, h * .032)}px ${FONTE}`;
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
    if (!this.codigo) {
      if (i === 0) this.conectar(true);
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
}

window.TelaOnline = TelaOnline;
