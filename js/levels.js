/* =========================================================
   levels.js — registro das fases e textos românticos.
   Para adicionar uma fase nova: crie js/levels/levelN.js e
   chame DMC.Levels.register(N, (game, savedState) => cena).
   ========================================================= */
(function () {
  'use strict';
  const DMC = window.DMC;

  const LIST = [
    { id: 1, name: 'A Primeira Chave', desc: 'Explore o jardim e encontre a chave escondida.', music: 'garden' },
    { id: 2, name: 'Peças que se Encaixam', desc: 'Monte o quebra-cabeça do casal.', music: 'garden' },
    { id: 3, name: 'Nosso Destino', desc: 'Ligue as estrelas e forme um coração.', music: 'menu' },
    { id: 4, name: 'O Caminho Até Você', desc: 'Atravesse o labirinto.', music: 'garden' },
    { id: 5, name: 'A Última Surpresa', desc: 'O jardim iluminado e a mensagem final.', music: 'menu' },
  ];

  /* Mensagens desbloqueadas a cada parte do coração, por tipo de declaração.
     {to} e {from} são trocados pelos nomes configurados. */
  const MESSAGES = {
    namoro: [
      'Desde o dia em que te conheci, {to}, uma porta se abriu aqui dentro — e eu nem sabia que ela existia.',
      'A gente se encaixa de um jeito que nenhum quebra-cabeça explica.',
      'Se as estrelas escrevem destinos, o meu tem o seu nome em todas as constelações.',
      'Todos os caminhos que eu fiz, até os mais tortos, me trouxeram até você.',
      'Eu quero viver essa história com você, de mãos dadas, todos os dias.',
    ],
    amor: [
      'Cada sorriso seu, {to}, é uma chave que abre um pedacinho de mim.',
      'Você completa as partes de mim que eu nem sabia que estavam faltando.',
      'Entre bilhões de estrelas, meu coração escolheu brilhar perto de você.',
      'Não importa o labirinto: eu sempre vou encontrar o caminho de volta para você.',
      'Eu te amo hoje, amanhã e em todas as fases desta vida.',
    ],
    surpresa: [
      'Toda grande surpresa começa com um pequeno segredo, {to}. Este é o primeiro.',
      'Cada peça desta aventura foi pensada com carinho, só para você.',
      'Olhe para o céu: algumas estrelas se alinharam hoje por um motivo especial.',
      'Falta pouco! O fim deste caminho guarda algo que eu preparei com o coração.',
      'Surpresa! Tudo isso foi só uma desculpa para dizer o quanto você é especial.',
    ],
  };

  /* Fechamento da carta final por tipo */
  const FINAL_CLOSING = {
    namoro: 'Então eu pergunto, com o coração inteiro desbloqueado: quer namorar comigo?',
    amor: 'Meu coração agora está aberto — e ele é todo seu.',
    surpresa: 'Obrigado por existir e por jogar até aqui. Esta surpresa era você o tempo todo.',
  };

  /* Mensagem final padrão (usada se a pessoa não escrever uma própria) */
  const DEFAULT_FINAL = {
    namoro: 'Cada dia ao seu lado, {to}, é o meu jogo favorito. Você deixa tudo mais bonito, mais leve e mais divertido — e eu não quero mais jogar sozinho.',
    amor: 'Você é a pessoa com quem eu quero dividir todos os capítulos da minha vida, {to}. Obrigado por existir e por ser exatamente quem você é.',
    surpresa: 'Eu construí este pequeno mundo só para ver você sorrir, {to}. Cada flor, cada estrela e cada caminho foram pensados em você.',
  };

  /* Botões de resposta da declaração final */
  const FINAL_ANSWERS = {
    namoro: ['Sim! ❤', 'Mil vezes sim!'],
    amor: ['Eu também te amo ❤'],
    surpresa: ['Amei! ❤'],
  };

  const FINAL_CELEBRATE = {
    namoro: 'Agora é oficial! ❤',
    amor: 'Amor correspondido ❤',
    surpresa: 'Surpresa desbloqueada ❤',
  };

  const factories = {};

  DMC.Levels = {
    list: LIST,
    total: LIST.length,
    MESSAGES,
    FINAL_CLOSING,
    DEFAULT_FINAL,
    FINAL_ANSWERS,
    FINAL_CELEBRATE,

    get(id) { return LIST.find((l) => l.id === id) || null; },

    register(id, factory) { factories[id] = factory; },

    isImplemented(id) { return typeof factories[id] === 'function'; },

    /** Cria a cena da fase. */
    create(id, game, savedState) {
      const f = factories[id];
      if (!f) throw new Error('Fase ' + id + ' ainda não implementada');
      return f(game, savedState);
    },

    /** Mensagem romântica da parte N do coração. */
    message(id, cfg) {
      const set = MESSAGES[cfg.type] || MESSAGES.namoro;
      return DMC.util.fill(set[id - 1] || set[0], cfg);
    },
  };
})();
