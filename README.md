# Desbloqueie Meu Coração ❤️

**Criado por Pedro Henrique Dias Fener**

Um pequeno jogo indie romântico em **pixel art 2D** (puzzle + aventura + romance), feito com HTML5, CSS3, JavaScript puro e Canvas. Funciona no navegador do celular e do computador, sem cadastro e sem internet, e foi pensado para virar APK Android.

O jogador encontra uma carta misteriosa e precisa desbloquear as **cinco partes de um coração mágico**. No fim, aparece a declaração personalizada para a pessoa amada.

## Status — v1.0.0 (jogo completo)

| Fase | O que é |
|---|---|
| **1 — A Primeira Chave** | Jardim explorável ao entardecer: carta misteriosa, placa com pista, arbustos para revistar, chave escondida, baú animado e 5 corações brilhantes. |
| **2 — Peças que se Encaixam** | Quebra-cabeça de 9 peças com encaixes de verdade, formando uma ilustração pixel art do casal. Arraste as peças; elas encaixam sozinhas perto do lugar certo. Botão para espiar a imagem. |
| **3 — Nosso Destino** | Constelação: ligue as estrelas na ordem certa para desenhar um coração. Rodada 1 numerada; rodada 2 maior, sem números e com estrelas intrusas. Cada estrela toca uma nota. |
| **4 — O Caminho Até Você** | Labirinto noturno de sebes com nuvenzinhas de chuva patrulhando, pontos de descanso, corações nos becos, lanternas, bússola de coração e a pessoa amada esperando na saída. |
| **5 — A Última Surpresa** | Jardim iluminado: lanternas acendem ao passar, as 4 partes orbitam o jogador e se unem à 5ª no pedestal; fogos de coração, música final, a pessoa amada chega e a **declaração personalizada** aparece com botões de resposta, comemoração e créditos. |

Também incluído: menu animado, personalização, salvamento automático, continuar, seleção de fases, pausa, telas de conclusão com estatísticas, opções de som e controles, créditos, 5 músicas originais e mais de 20 efeitos sonoros.

## Como jogar

**Opção mais simples:** abra o `index.html` direto no navegador. Tudo funciona, menos o modo offline (que exige um servidor).

**Com servidor local (recomendado):**

```bash
cd desbloqueie-meu-coracao
python3 -m http.server 8080
# abra http://localhost:8080
```

### Controles

| Ação | Celular | Computador |
|---|---|---|
| Andar | Joystick virtual (toque em qualquer lugar da metade esquerda da tela) | Setas ou WASD |
| Interagir / avançar diálogo | Botão **A** ou tocar na caixa de diálogo | Espaço, E, Enter ou Z |
| Pausar | Botão **II** | Esc ou P |

O botão **A** fica dourado e pulsando quando há algo para interagir, e um balão "!" aparece sobre o objeto.

**Tela cheia:** toque no botão de quatro cantos no topo do menu, ou ligue em **Opções** (ou na **Pausa**). Se você deixar ligada, o jogo volta para a tela cheia no próximo "Toque para começar". No app Android o jogo já abre em tela cheia, e essa opção fica escondida. No iPhone, o Safari não permite tela cheia para sites; ali, use "Adicionar à Tela de Início".

### Dicas por fase

- **Fase 2:** toque no quadradinho ao lado da moldura para ver a imagem completa por alguns segundos.
- **Fase 3:** comece pela estrela da ponta de baixo; pode seguir em qualquer sentido. Depois de dois erros, a próxima estrela correta pisca mais forte.
- **Fase 4:** as flores que brilham salvam seu ponto de volta. O coraçãozinho na borda da tela aponta para a saída.
- **Fase 5:** chegue ao pedestal sob o arco de rosas e aperte **A**.

### Fase 1 — como funciona

1. A bandeirinha da caixa de correio está levantada: o jogo abre com a carta misteriosa.
2. Explore o jardim: casa, lagos, ponte, cerejeiras, arbustos, pedras, postes de luz e vaga-lumes.
3. Leia a **placa** perto do caminho: ela dá a pista.
4. Procure nos **arbustos** (cada um tem uma reação diferente). A chave está no centro da roda de flores.
5. Leve a chave até o **baú** na clareira iluminada: o baú abre, um feixe de luz sobe, a primeira parte do coração aparece e a mensagem romântica é revelada.
6. Bônus: 5 **corações brilhantes** escondidos pelo mapa.

## Estrutura do projeto

```
desbloqueie-meu-coracao/
├── index.html            # telas (menu, personalização, pausa, carta...) + canvas
├── manifest.json         # PWA: ícone, nome, tela cheia
├── sw.js                 # service worker: jogo funciona offline
├── css/
│   └── style.css         # interface pixel (botões, painéis, HUD, joystick)
├── js/
│   ├── utils.js          # namespace DMC, matemática, RNG determinístico, eventos
│   ├── save.js           # salvamento local (localStorage) e progresso
│   ├── audio.js          # música e efeitos sintetizados (Web Audio API)
│   ├── input.js          # teclado, joystick virtual flutuante, botão de ação
│   ├── sprites.js        # TODA a pixel art, gerada por código e guardada em cache
│   ├── particles.js      # partículas com pool (corações, brilhos, pétalas, vaga-lumes)
│   ├── player.js         # personagem: movimento, colisão, animação
│   ├── dialogue.js       # caixa de diálogo com efeito máquina de escrever
│   ├── levels.js         # registro das fases + mensagens românticas por tipo
│   ├── scene-base.js     # base comum das fases 2–5 (timers, diálogos, recompensa)
│   ├── levels/
│   │   ├── level1.js     # Fase 1 — A Primeira Chave (exploração)
│   │   ├── level2.js     # Fase 2 — Peças que se Encaixam (quebra-cabeça)
│   │   ├── level3.js     # Fase 3 — Nosso Destino (constelação)
│   │   ├── level4.js     # Fase 4 — O Caminho Até Você (labirinto)
│   │   └── level5.js     # Fase 5 — A Última Surpresa (final)
│   ├── ui.js             # menus, HUD, carta, confirmações, transições
│   └── main.js           # laço do jogo, cenas, resolução adaptável, fluxo
├── android/              # app Android pronto (WebView em tela cheia)
├── .github/workflows/    # gera o APK/AAB automaticamente no GitHub
├── assets/
│   ├── icons/            # ícones do app (192 e 512 px)
│   ├── sprites/          # (reservado) sprites em PNG, se você quiser trocar a arte
│   ├── backgrounds/      # (reservado)
│   └── audio/            # (reservado) arquivos de áudio locais
└── README.md
```

### Por que a arte e o áudio são gerados por código?

- **Pixel art:** cada sprite é desenhado uma única vez em um canvas fora da tela (a partir de mapas de caracteres ou formas) e depois só é copiado. Resultado: zero downloads, zero problemas de direitos autorais, e é rápido em celulares modestos.
- **Áudio:** as músicas (menu e jardim) e todos os efeitos são compostos para este jogo e sintetizados em tempo real pela Web Audio API. São originais, livres de direitos autorais e funcionam offline. As pastas `assets/audio` e `assets/sprites` ficam prontas caso você queira substituir por arquivos próprios no futuro.

## Personalização

No menu, em **Personalizar** (ou ao começar uma **Nova partida**):

- Nome de quem vai receber
- Nome de quem está declarando
- Tipo: **pedido de namoro**, **declaração de amor** ou **surpresa romântica** (cada tipo tem cinco mensagens próprias)
- Mensagem final, que aparecerá na Fase 5

Tudo fica salvo só no aparelho (`localStorage`, chave `dmc_save_v1`). Se a mensagem final ficar em branco, o jogo usa um texto padrão para o tipo escolhido.

Para editar os textos, abra `js/levels.js`:

- `MESSAGES`: as 5 mensagens (uma por parte do coração) de cada tipo
- `DEFAULT_FINAL`: mensagem final padrão
- `FINAL_CLOSING`: a frase de fechamento (ex.: "quer namorar comigo?")
- `FINAL_ANSWERS`: os botões de resposta
- `FINAL_CELEBRATE`: o título da comemoração

Use `{to}` e `{from}` para inserir os nomes.

## Salvamento

- Automático: a cada evento importante (carta lida, arbusto revistado, chave, coração coletado) e a cada ~2,5 s se o personagem se mexeu.
- Ao pausar, ao trocar de aba ou minimizar o app, o jogo salva e pausa sozinho.
- **Continuar** volta exatamente ao ponto salvo, com posição, itens e arbustos já revistados.
- **Opções → Apagar progresso** zera tudo.

## Como adicionar uma nova fase (expansões)

1. Crie `js/levels/level6.js`. O jeito mais fácil é estender `DMC.SceneBase` (veja `level2.js` a `level5.js`). Uma cena precisa ter:
   - `enter()`, `exit()`, `update(dt)`, `render(ctx)`
   - `persist()` (salvar estado) e, opcionalmente, `onResize()`
   - `usesJoystick = true` se o jogador anda pelo mapa (senão, a fase recebe toques em `onPointer`)
   - ao terminar: `this.reward({ text: 'estatísticas' })`, que mostra a mensagem e conclui a fase
2. Acrescente a fase em `LIST` (em `js/levels.js`) e registre no final do arquivo dela:
   ```js
   DMC.Levels.register(6, (game, saved) => new Level6(game, saved));
   ```
3. Adicione o `<script>` no `index.html` e o caminho em `sw.js` (mude também a versão do `CACHE`).

## Publicar no GitHub Pages

1. Crie um repositório e envie a pasta (`git init`, `git add .`, `git commit`, `git push`).
2. Em **Settings → Pages**, escolha a branch `main` e a pasta `/ (root)`.
3. O jogo fica em `https://SEU-USUARIO.github.io/NOME-DO-REPO/` e pode ser "instalado" na tela inicial do celular.

## Gerar APK Android

O projeto já vem com um app Android pronto na pasta `android/`. É um app nativo simples que abre o jogo em tela cheia, funciona offline e não pede nenhuma permissão. Também vem uma automação do GitHub (`.github/workflows/android.yml`) que gera o APK na nuvem, sem instalar nada no computador.

### Opção 1: pelo GitHub (recomendado, grátis)

1. Crie uma conta em github.com e um repositório novo (pode ser privado).
2. Envie **todo o conteúdo** desta pasta para o repositório, incluindo as pastas `android/` e `.github/`. Pelo site: "Add file → Upload files" e arraste os arquivos e pastas.
3. Abra a aba **Actions**. O processo "Gerar APK" começa sozinho e leva uns 3 a 5 minutos.
4. Quando ficar verde ✅, clique nele e baixe **DesbloqueieMeuCoracao-APK-teste** em "Artifacts".
5. Descompacte e instale o `.apk` no celular (o Android vai pedir para permitir "instalar apps desconhecidos").

Esse APK de teste serve para jogar e compartilhar direto. **Para a Play Store**, é preciso uma versão assinada (AAB):

### Versão assinada para a Play Store

1. Crie sua chave de assinatura **uma única vez** (num computador com Java):
   ```bash
   keytool -genkeypair -v -keystore upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```
   ⚠️ Guarde esse arquivo e as senhas em lugar seguro. Sem eles você não consegue atualizar o jogo na loja.
2. Transforme a chave em texto: `base64 -w0 upload-keystore.jks > chave.txt` (no Windows: `certutil -encode upload-keystore.jks chave.txt` e apague as linhas BEGIN/END).
3. No repositório, vá em **Settings → Secrets and variables → Actions** e crie quatro segredos:
   - `KEYSTORE_BASE64`: o conteúdo de `chave.txt`
   - `KEYSTORE_PASSWORD`: a senha da chave
   - `KEY_ALIAS`: `upload`
   - `KEY_PASSWORD`: a senha do alias (geralmente a mesma)
4. Rode o processo de novo (Actions → Gerar APK → "Run workflow"). Agora aparece também **DesbloqueieMeuCoracao-PlayStore**, com o `.aab` para enviar ao Play Console.

### Opção 2: Android Studio

Abra a pasta `android/` no Android Studio e use **Build → Build App Bundle(s) / APK(s)**. Os arquivos do jogo são copiados para dentro do app automaticamente.

### Dados do app

- Identificador: `com.pedrofener.meucoracao` (não pode mudar depois de publicar)
- Versão: `1.0.0` (versionCode `1`). A cada atualização na loja, aumente o `versionCode` em `android/app/build.gradle`.
- Android 7.0 ou mais novo (minSdk 24), targetSdk 36
- O botão "voltar" do Android pausa o jogo; no menu principal, fecha o app.

## Desempenho

- Resolução virtual baixa (~200 px no menor lado) ampliada com escala inteira e `image-rendering: pixelated`.
- Chão estático pré-renderizado; só água, flores, objetos visíveis e partículas são redesenhados.
- Pool fixo de partículas (sem coletor de lixo travando).
- Áudio suspenso quando o app fica em segundo plano.

## Ideias para futuras atualizações

- Fases bônus (memória com cartas, ritmo com as músicas do jogo)
- Foto ou desenho próprio no quebra-cabeça da Fase 2
- Compartilhar a personalização por link
- Mais idiomas

## Autor e licença

Criado por **Pedro Henrique Dias Fener**.

© 2026 Pedro Henrique Dias Fener. Código, arte e áudio originais deste projeto. Todos os direitos reservados.
