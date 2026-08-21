# Turbo Race no navegador — contrato do porte

Este projeto é a versão web do **Turbo Race** (`com.turboroad.racer`). É uma
**cópia à parte**: o projeto do Android Studio em
`C:\Users\arley\Music\tudo turbo race\TurboRoadRacer_v113_FIX_ICON_DRIFT_OVERTAKE`
é **somente leitura** e nunca deve ser alterado.

O porte é **1:1 com o Kotlin**. Quem abrir os dois lado a lado tem que
reconhecer o mesmo código: mesmos nomes de função, mesma ordem, mesmos números
mágicos, mesmos comentários explicando as mesmas decisões.

## Onde fica cada coisa

| Kotlin (somente leitura) | JavaScript (aqui) |
|---|---|
| `game/MathUtils.kt` | `js/mathutils.js` |
| `game/RoadSegment.kt` | `js/roadsegment.js` |
| `game/Coin.kt` | `js/coin.js` |
| `game/Controls.kt` | `js/controls.js` |
| `game/EnemyCar.kt` | `js/enemycar.js` |
| `game/GameState.kt` | `js/gamestate.js` |
| `game/PlayerCar.kt` | `js/playercar.js` |
| `game/ParticleSystem.kt` | `js/particles.js` |
| `game/TrackGenerator.kt` | `js/trackgenerator.js` |
| `game/SpeechBank.kt` | `js/speechbank.js` |
| `game/Renderer.kt` | `js/renderer.js` |
| `game/HUD.kt` | `js/hud.js` |
| `game/GameView.kt` + `GameActivity.kt` | `js/game.js` |
| `data/CarData.kt` | `js/data/cars.js` |
| `data/StageData.kt` | `js/data/stages.js` |
| `data/SaveManager.kt` | `js/data/save.js` |
| `audio/SoundManager.kt` | `js/audio.js` |
| `MainActivity.kt` | `js/ui/menu.js` |
| `WorldTourActivity.kt` | `js/ui/worldtour.js` |
| `GarageActivity.kt` | `js/ui/garage.js` |
| `SettingsActivity.kt` | `js/ui/settings.js` |
| `IntroActivity.kt` + as 4 Activities de zeramento | `js/ui/videos.js` |
| `MultiplayerActivity.kt` + `multiplayer/` (Bluetooth) | `js/ui/online.js` + `js/online.js` |
| — | `js/colors.js`, `js/assets.js`, `js/manifesto.js`, `js/main.js` |

Os arquivos de `res/drawable`, `res/drawable-nodpi` e `res/raw` foram copiados
para `assets/img`, `assets/audio` e `assets/video` **sem renomear**. O
`js/manifesto.js` é gerado a partir das pastas e faz o papel do
`resources.getIdentifier()`: nome do recurso → caminho do arquivo.

## Regras de escrita

1. **Script clássico, sem `import`/`export`.** Cada arquivo começa com
   `"use strict";` e termina publicando o que criou: `window.Renderer = Renderer;`.
   O `index.html` carrega tudo em ordem com `<script src>`. Isso evita CORS ao
   abrir o arquivo direto e facilita empacotar num WebView depois.
2. **Nomes iguais aos do Kotlin.** `drawSegmentBand` continua `drawSegmentBand`.
   Nada de renomear para "melhorar".
3. **Comentários em português**, na mesma densidade do original. Onde o Kotlin
   explica um porquê (por exemplo o "V88: reta única"), o JS explica igual.
4. **Nada de `let` sem necessidade nem de esperteza nova.** Se o Kotlin faz uma
   conta em duas linhas, o JS faz em duas linhas.
5. Toda alteração tem que passar em `node --check arquivo.js`.
   O node desta máquina: `"C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe"`.

## Equivalências de API (Android Canvas → Canvas 2D)

O jogo desenha com `Canvas` + `Paint`. No navegador é o `CanvasRenderingContext2D`.

| Kotlin | JavaScript |
|---|---|
| `Color.rgb(r,g,b)` / `Color.argb(a,r,g,b)` | `Cor.rgb(r,g,b)` / `Cor.argb(a,r,g,b)` — inteiro `0xAARRGGBB`, igual ao Android |
| `paint.color = c; paint.alpha = a` | `ctx.fillStyle = Cor.css(c, a)` (o `a` é opcional, 0..255) |
| `canvas.drawRect(l,t,r,b,paint)` | `ctx.fillStyle = ...; ctx.fillRect(l, t, r - l, b - t)` |
| `canvas.drawCircle(cx,cy,r,paint)` | `ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill()` |
| `canvas.drawPath(path,paint)` | `Path2D` + `ctx.fill(path)` / `ctx.stroke(path)` |
| `paint.style = Paint.Style.STROKE; paint.strokeWidth = w` | `ctx.strokeStyle = ...; ctx.lineWidth = w; ctx.stroke()` |
| `paint.textSize = s`; `Paint.Align.CENTER` | `ctx.font = "bold " + s + "px " + FONTE`; `ctx.textAlign = "center"` |
| `canvas.drawText(t,x,y,paint)` | `ctx.fillText(t,x,y)` — a linha de base é a mesma nos dois |
| `paint.measureText(t)` | `ctx.measureText(t).width` |
| `canvas.drawBitmap(bmp, srcRect, dstRect, paint)` | `ctx.drawImage(img, sx,sy,sw,sh, dx,dy,dw,dh)` |
| `canvas.drawBitmap(bmp, null, dstRect, paint)` | `ctx.drawImage(img, dx,dy,dw,dh)` |
| `paint.alpha` num bitmap | `ctx.globalAlpha = a/255` antes do `drawImage`, e volta para 1 depois |
| `LinearGradient(x0,y0,x1,y1,cores,posicoes,CLAMP)` | `ctx.createLinearGradient(x0,y0,x1,y1)` + `addColorStop` |
| `RadialGradient(cx,cy,r,cores,posicoes,CLAMP)` | `ctx.createRadialGradient(cx,cy,0,cx,cy,r)` + `addColorStop` |
| `canvas.save()` / `canvas.restore()` | iguais |
| `canvas.drawColor(c)` | `ctx.fillStyle = Cor.css(c); ctx.fillRect(0,0,largura,altura)` |
| `PorterDuffColorFilter(c, SRC_ATOP)` num bitmap | desenha o bitmap, depois `ctx.globalCompositeOperation = "source-atop"` sobre uma cópia, ou simplesmente pinta o retângulo do carro com a cor por cima usando alfa — ver `Renderer.flashFilter` |
| `Bitmap` | `HTMLImageElement` (`Assets.img("car_0")`, devolve `null` se não existe) |
| `RectF(l,t,r,b)` | `{ left, top, right, bottom }` com os ajudantes `Ret.novo/largura/altura/contem` |
| `value.coerceIn(a,b)` | `limitar(value, a, b)` |
| `value.coerceAtLeast(a)` | `Math.max(a, value)` |
| `value.coerceAtMost(b)` | `Math.min(b, value)` |
| `x.toInt()` | `Math.trunc(x)` (o Kotlin trunca; `Math.floor` erraria com negativo) |
| `kotlin.math.abs/sin/cos/hypot` | `Math.abs/sin/cos/hypot` |
| `String.format("%.1f", x)` | `x.toFixed(1)` |
| `"%02d".format(n)` | `String(n).padStart(2, "0")` |

Fonte de texto: a constante global `FONTE` (definida em `js/main.js`) traz a
mesma pilha para todo o jogo. Use sempre `ctx.font = peso + " " + tamanho + "px " + FONTE`.

## Globais disponíveis

Carregados antes de qualquer arquivo de desenho, na ordem do `index.html`:

`Cor`, `MathUtils`, `limitar`, `hashCodeDeTexto`, `FONTE`, `Ret`,
`P3D`, `ScreenPoint`, `RoadPoint`, `SpriteType`, `Sprite`, `SegmentColor`, `RoadSegment`,
`Coin`, `Controls`, `EnemyCar`, `GameState`, `GamePhase`, `RaceOutcome`, `PlayerStanding`,
`PlayerCar`, `ParticleSystem`, `TrackGenerator`, `SpeechBank`,
`CarCatalog`, `StageCatalog`, `SaveManager`, `SoundManager`, `Assets`.

## O que muda de propósito em relação ao app

- **Multiplayer local por Bluetooth vira sala online por WebSocket.** O
  navegador não fala Bluetooth clássico. O `js/online.js` conversa com o
  servidor em `TurboRace-Servidor-Render` (mesmo desenho do servidor do Sugar
  Strike: Node + `ws`, várias salas, estado só em memória). O restante do jogo
  continua vendo a mesma interface que via com o `BluetoothService`, então o
  `game.js` quase não muda.
- **Anúncios (`ads/TurboAds.kt`) e notificações (FCM) ficam de fora.** Não
  existem no navegador; o gancho `onBeforeStageStart` continua no código,
  chamando o `start()` direto.
- **Vibração** usa `navigator.vibrate` quando o aparelho tem.
- **Sensor de inclinação** usa `DeviceOrientationEvent` (no iOS exige pedir
  permissão num toque).
- **Gamepad** usa a Gamepad API e o teclado; os `KEYCODE_*` do Android viraram
  `KeyboardEvent.code` em `SaveManager.teclasPadrao`.
- **Progresso** sai do SharedPreferences e vai para o `localStorage`, com o
  mesmo prefixo `turbo_road_racer`.

## A sala online (o que substitui o Bluetooth)

`js/online.js` publica dois globais com a **mesma forma** que o `game.js`
esperava do Bluetooth, para o porte do `GameView.kt` ficar quase literal:

```js
// Equivale ao objeto BluetoothSession
OnlineSession = {
  service,            // OnlineService ou null
  isHost,             // boolean
  stageIndex,         // fase escolhida pelo anfitriao
  enabled,            // boolean: a corrida atual e online?
  localPlayerId,      // string
  maxPlayers,         // 2..8
  raceLaunchId,       // string: identifica a largada; vira a semente da pista
  raceOpening,        // boolean
  refreshPlayerId(), clear()
}

// Equivale a classe BluetoothService
class OnlineService {
  setListener(ouvinte)      // ouvinte: ver abaixo
  connectedCount()          // quantos jogadores estao na sala agora (sem contar voce)
  sendState(estado)         // {x, position, speed, lap, fuel, carId, rank, finished, playerName, playerId}
  sendRaw(texto)            // mensagem livre (usada para provocacoes)
  setReady(pronto)          // so no saguao
  setStage(indice)          // so o anfitriao
  startRace()               // so o anfitriao
  close()
}
```

O `ouvinte` tem os mesmos nomes do `BluetoothService.Listener` do Kotlin:
`onStatus(msg)`, `onConnected()`, `onDisconnected(msg)`, `onRawMessage(msg)`,
`onStateReceived(estado)`, e mais dois que so existem aqui:
`onRoomUpdate(resumo)` e `onRaceStart({semente, fase, emMs})`.

O `estado` recebido em `onStateReceived` tem exatamente os campos do
`MultiplayerState.kt`: `x`, `position`, `speed`, `lap`, `fuel`, `carId`,
`rank`, `finished`, `playerName`, `playerId`.

**Todos correm a mesma fase.** O anfitriao escolhe a fase no saguao; o servidor
manda `largada` com uma **semente** que todos usam em
`MathUtils.setRandomSeed(...)`, então a pista, o cenário, as moedas e o tráfego
saem idênticos em todas as telas — é o mesmo truque que o app já usava com o
`raceLaunchId`.
