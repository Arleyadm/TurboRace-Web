# Turbo Race Web

Versão web independente do Turbo Race, com as 28 fases, garagem, configurações,
áudio, controles por teclado/toque e salas online para até 24 jogadores.

## Rodar localmente

```bash
python -m http.server 8080
```

Abra `http://localhost:8080`. O servidor WebSocket fica no projeto separado
`TurboRace-Servidor-Render`.

## Controles

- Setas ou WASD: dirigir, acelerar e frear
- Espaço: turbo
- Escape: voltar ao World Tour

Este projeto é um porte separado. O projeto Android original não é alterado.
