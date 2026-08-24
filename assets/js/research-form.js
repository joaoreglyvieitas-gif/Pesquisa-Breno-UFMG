/**
 * Formulário A — questionário anônimo (PPGIT/UFMG)
 * Renderizador multi-etapas para o modal "Participar da Pesquisa".
 *
 * Estrutura do arquivo:
 *  1. Dados do questionário (fonte: PDF "Formulário para Altos Executivos")
 *  2. Estado do formulário + helpers
 *  3. Engine de renderização (HTML por tipo de pergunta)
 *  4. Navegação entre etapas / validação
 *  5. Montagem (delegação de eventos) + payload final
 */
(function () {
  'use strict';

  /* ============================================================
   * 1. DADOS DO QUESTIONÁRIO
   * ============================================================ */

  var CRITERIOS_Q11 = [
    { id: 'experiencia', label: 'Experiência prévia e resultados comprovados' },
    { id: 'formacao', label: 'Formação e passagem por organizações de prestígio' },
    { id: 'rede', label: 'Rede de relacionamentos e reputação no setor' },
    { id: 'fitcultural', label: 'Compatibilidade cultural / fit cultural' },
    { id: 'dei', label: 'Compromisso com diversidade, equidade e inclusão' },
  ];

  var ROWS_Q12 = [
    { id: 'brancos_negros', label: 'Entre pessoas brancas e pessoas negras' },
    { id: 'homens_mulheres', label: 'Entre homens e mulheres' },
    { id: 'homensbrancos_mulheresnegras', label: 'Entre homens brancos e mulheres negras' },
  ];

  var ROWS_Q13 = [
    { id: 'barreira_racial', label: 'Existem barreiras informais que restringem a ascensão de profissionais negros a posições de alta liderança.' },
    { id: 'barreira_genero', label: 'Existem barreiras informais que restringem a ascensão de mulheres a posições de alta liderança.' },
    { id: 'fit_homogeneo', label: 'O uso de critérios subjetivos, como fit cultural, pode reproduzir perfis homogêneos de liderança.' },
  ];

  var ROWS_Q14 = [
    { id: 'raca', label: 'Relacionado à raça/cor' },
    { id: 'genero', label: 'Relacionado ao gênero' },
  ];

  var OPTIONS_Q14 = ['Nunca', 'Raramente', 'Ocasionalmente', 'Frequentemente', 'Prefiro não responder', 'Não se aplica'];

  var ROWS_Q17 = [
    { id: 'nome', label: 'Nome e sobrenome' },
    { id: 'instituicao', label: 'Instituição de ensino' },
    { id: 'empresas', label: 'Histórico de empresas anteriores' },
    { id: 'endereco', label: 'Endereço, bairro ou cidade' },
    { id: 'foto', label: 'Foto de perfil profissional' },
  ];

  var ROWS_Q18 = [
    { id: 'auditoria', label: 'Auditoria algorítmica independente e periódica' },
    { id: 'revisao', label: 'Revisão humana obrigatória em decisões de corte' },
    { id: 'explicacao', label: 'Direito de o candidato pedir explicação e contestar decisão automatizada' },
    { id: 'transparencia', label: 'Transparência sobre critérios, filtros e dados utilizados' },
  ];

  var EXCLUSIVE_Q15 = [
    'Não identifiquei uso de automação ou IA',
    'Não sei informar se houve uso de automação ou IA',
  ];

  var FORM = {
    consent: {
      // [Nome do(a) Orientador(a)], e-mails e CAAE são dados institucionais
      // que precisam ser preenchidos pela equipe do CEP/UFMG antes da coleta real.
      options: [
        { value: 'agree', label: 'Sim, li o termo, concordo em participar e autorizo o uso dos dados de forma agregada para fins acadêmicos.' },
        { value: 'disagree', label: 'Não concordo em participar.' },
      ],
    },
    blocks: [
      {
        id: 'b1',
        title: 'Bloco 1 — Perfil',
        description: 'Variáveis de estratificação e de composição da amostra qualitativa. Não analisar empresa nem indivíduo.',
        questions: [
          {
            id: 'q1', type: 'select', required: true,
            label: 'Qual posição melhor descreve sua atuação atual ou mais recente?',
            options: ['CEO / Presidência', 'Sócio(a) / Fundador(a) em função executiva', 'Conselheiro(a) de Administração ou Consultivo', 'Vice-presidência / C-level (CFO, COO, CHRO, CTO, CMO ou equivalente)', 'Diretoria', 'Gerência sênior / Head / Superintendência', 'Em transição para alta liderança', 'Outra'],
          },
          {
            id: 'q2', type: 'select', required: true,
            label: 'Há quanto tempo você atua ou atuou em gerência sênior, diretoria, C-level, presidência ou conselho?',
            options: ['Ainda não atuei nesse nível', 'Menos de 2 anos', 'De 2 a 5 anos', 'De 6 a 10 anos', 'De 11 a 20 anos', 'Mais de 20 anos'],
          },
          {
            id: 'q3', type: 'select', required: false, note: 'Classificação IBGE. Dado sensível (LGPD) — não obrigatória.',
            label: 'Como você se autodeclara quanto à raça/cor?',
            options: ['Preta', 'Parda', 'Branca', 'Amarela', 'Indígena', 'Prefiro não responder'],
          },
          {
            id: 'q4', type: 'select', required: false, note: 'Dado sensível (LGPD) — não obrigatória.',
            label: 'Como você se identifica em relação a gênero?',
            options: ['Homem cisgênero', 'Mulher cisgênera', 'Homem transgênero', 'Mulher transgênera', 'Pessoa não binária', 'Outra identidade de gênero', 'Prefiro não responder'],
          },
          {
            id: 'q5', type: 'select', required: false,
            label: 'Qual a sua faixa etária?',
            options: ['Até 34 anos', '35 a 44 anos', '45 a 54 anos', '55 a 64 anos', '65 anos ou mais', 'Prefiro não responder'],
          },
          {
            id: 'q6', type: 'select', required: true,
            label: 'Qual perfil melhor descreve a organização em que você atua ou atuou principalmente?',
            options: ['Multinacional de capital estrangeiro', 'Empresa brasileira de capital aberto', 'Empresa brasileira de capital fechado ou familiar', 'Startup / scale-up', 'Estatal / economia mista', 'Terceiro setor', 'Outra', 'Prefiro não responder'],
          },
          {
            id: 'q7', type: 'select', required: true, note: 'Serve apenas à composição da amostra qualitativa.',
            label: 'Além da atuação executiva, você também atua ou já atuou profissionalmente em recrutamento executivo, plataforma de seleção ou governança de IA?',
            options: ['Não', 'Sim, em consultoria de executive search / headhunting', 'Sim, em HR Tech, plataforma ou ferramenta de seleção', 'Sim, em diversidade, ética, jurídico ou governança aplicada a seleção', 'Sim, em mais de uma dessas frentes'],
          },
        ],
      },
      {
        id: 'b2',
        title: 'Bloco 2 — Acesso e transparência',
        description: 'Mecanismos de acesso e opacidade processual.',
        questions: [
          {
            id: 'q8', type: 'select', required: true,
            label: 'Como você chegou à posição executiva mais relevante da sua trajetória?',
            options: ['Promoção interna', 'Indicação ou networking', 'Abordagem de consultoria / headhunter', 'Processo seletivo aberto', 'Convite de fundadores, acionistas ou conselho', 'Fundação / sociedade no negócio', 'Ainda não ocupei posição executiva', 'Outro meio'],
          },
          {
            id: 'q9', type: 'select', required: true,
            label: 'Nos últimos 24 meses, com que frequência você foi abordado(a) por consultorias ou headhunters para oportunidades executivas?',
            options: ['Nenhuma vez', '1 a 2 vezes', '3 a 5 vezes', '6 a 10 vezes', 'Mais de 10 vezes', 'Não se aplica'],
          },
          {
            id: 'q10', type: 'select', required: true,
            label: 'Nos processos executivos externos dos quais participou nos últimos cinco anos, com que frequência recebeu feedback claro quando não foi selecionado(a)?',
            options: ['Sempre', 'Na maioria das vezes', 'Em cerca de metade das vezes', 'Raramente', 'Nunca', 'Não se aplica'],
          },
        ],
      },
      {
        id: 'b3',
        title: 'Bloco 3 — Critérios: discurso e prática',
        description: 'Gap entre critérios declarados e critérios decisivos.',
        questions: [
          {
            id: 'q11', type: 'likert-double', required: true,
            label: 'Em sua percepção, quanto os critérios abaixo são valorizados no discurso das organizações e consultorias, e quanto de fato decidem a contratação final para cargos executivos?',
            scaleLabels: ['Discurso', 'Prática'],
            minLabel: 'nada valorizado', maxLabel: 'extremamente valorizado',
            rows: CRITERIOS_Q11,
          },
        ],
      },
      {
        id: 'b4',
        title: 'Bloco 4 — Equidade percebida e barreiras',
        description: 'Índice de percepção de equidade (IPE) e barreiras informais.',
        questions: [
          {
            id: 'q12', type: 'likert-single', required: true,
            label: 'Considerando profissionais com qualificação e experiência equivalentes, qual o grau de equidade nas chances de acesso à alta liderança no Brasil?',
            minLabel: 'chances totalmente desiguais', maxLabel: 'chances totalmente iguais',
            rows: ROWS_Q12,
          },
          {
            id: 'q13', type: 'likert-single', required: true,
            label: 'Indique seu grau de concordância com as afirmações abaixo.',
            minLabel: 'discordo totalmente', maxLabel: 'concordo totalmente',
            rows: ROWS_Q13,
          },
        ],
      },
      {
        id: 'b5',
        title: 'Bloco 5 — Tratamento desfavorável',
        optional: true,
        description: 'As perguntas a seguir tratam de vivência pessoal. O formulário é anônimo. Você pode pular este bloco.',
        questions: [
          {
            id: 'q14', type: 'likert-freq', required: false,
            label: 'Em processos seletivos para cargos executivos, você percebe ter recebido pessoalmente tratamento desfavorável em razão da sua raça/cor ou do seu gênero?',
            options: OPTIONS_Q14,
            rows: ROWS_Q14,
          },
        ],
      },
      {
        id: 'b6',
        title: 'Bloco 6 — Inteligência artificial e riscos',
        description: 'Exposição, opacidade e proxies em sistemas de seleção.',
        questions: [
          {
            id: 'q15', type: 'checkbox', required: true,
            label: 'Em processos executivos dos quais participou nos últimos cinco anos, quais situações você vivenciou ou identificou?',
            note: '"Não identifiquei" e "Não sei informar" são exclusivas em relação às demais.',
            exclusiveOptions: EXCLUSIVE_Q15,
            options: ['Triagem automatizada de currículo ou perfil', 'Testes com correção ou ranking automatizado', 'Sistemas de recomendação, matching ou ordenação de candidatos', 'Entrevista gravada ou avaliação digital apoiada por IA', 'Não identifiquei uso de automação ou IA', 'Não sei informar se houve uso de automação ou IA'],
          },
          {
            id: 'q16', type: 'select', required: true,
            label: 'Quando houve ou pareceu haver uso de automação ou IA, você foi informado(a) de forma clara?',
            note: 'Exibida apenas quando aplicável à sua resposta anterior.',
            conditional: function (state) {
              var v = state.q15 || [];
              if (v.length === 0) return false;
              for (var i = 0; i < v.length; i++) {
                if (EXCLUSIVE_Q15.indexOf(v[i]) === -1) return true;
              }
              return false;
            },
            options: ['Sim, em todas as ocasiões', 'Sim, em algumas ocasiões', 'Não fui informado(a), embora tenha identificado ou suspeitado de uso', 'Não sei se houve uso', 'Não se aplica'],
          },
          {
            id: 'q17', type: 'likert-single', required: true,
            label: 'Em sistemas de IA usados para seleção, qual o risco de os critérios abaixo reproduzirem indiretamente vieses de raça e gênero?',
            minLabel: 'nenhum risco', maxLabel: 'risco extremamente alto',
            rows: ROWS_Q17,
          },
        ],
      },
      {
        id: 'b7',
        title: 'Bloco 7 — Governança',
        description: 'Importância e viabilidade de mecanismos para o uso responsável de IA no recrutamento executivo.',
        questions: [
          {
            id: 'q18', type: 'likert-double', required: true,
            label: 'Avalie a importância e a viabilidade, no Brasil de hoje, dos mecanismos abaixo para o uso responsável de IA no recrutamento executivo.',
            scaleLabels: ['Importância', 'Viabilidade'],
            minLabel: '(varia por escala)', maxLabel: '(varia por escala)',
            rows: ROWS_Q18,
          },
        ],
      },
    ],
  };

  /* ============================================================
   * 2. ESTADO
   * ============================================================ */

  function createInitialState() {
    return {
      consent: null,
      q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7: '',
      q8: '', q9: '', q10: '',
      q11: {}, q12: {}, q13: {}, q14: {},
      q15: [], q16: '',
      q17: {}, q18: {},
    };
  }

  var state = createInitialState();
  var stepIndex = 0;
  var steps = [{ type: 'consent' }]
    .concat(FORM.blocks.map(function (block) { return { type: 'block', block: block }; }))
    .concat([{ type: 'end' }]);

  var QUESTIONS_BY_ID = {};
  FORM.blocks.forEach(function (block) {
    block.questions.forEach(function (q) { QUESTIONS_BY_ID[q.id] = q; });
  });

  var lastPayload = null;
  var root = null;

  /* ============================================================
   * Helpers
   * ============================================================ */

  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function slugify(label) {
    return label
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function checkIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  }

  /* ============================================================
   * 3. RENDERIZAÇÃO
   * ============================================================ */

  function renderSelect(q) {
    var current = state[q.id] || '';
    var opts = '<option value="">Selecione uma opção…</option>' +
      q.options.map(function (opt) {
        return '<option value="' + esc(opt) + '"' + (current === opt ? ' selected' : '') + '>' + esc(opt) + '</option>';
      }).join('');
    return '<select class="rf-select" name="' + q.id + '" data-qid="' + q.id + '" aria-label="' + esc(q.label) + '">' + opts + '</select>';
  }

  function renderCheckboxGroup(q) {
    var current = state[q.id] || [];
    var items = q.options.map(function (opt, i) {
      var id = q.id + '__opt' + i;
      var checked = current.indexOf(opt) !== -1;
      return (
        '<input type="checkbox" class="rf-checkbox-input" id="' + id + '" name="' + q.id + '" value="' + esc(opt) + '" data-qid="' + q.id + '"' + (checked ? ' checked' : '') + '>' +
        '<label for="' + id + '" class="rf-checkbox-item">' +
        '<span class="rf-checkbox-box">' + checkIcon() + '</span>' +
        '<span class="rf-checkbox-text">' + esc(opt) + '</span>' +
        '</label>'
      );
    }).join('');
    return '<div class="rf-checkbox-group">' + items + '</div>';
  }

  function renderLikertDots(name, currentVal, extraData) {
    var dataAttrs = extraData || '';
    var dots = [1, 2, 3, 4, 5].map(function (n) {
      var id = name + '__' + n;
      var checked = String(currentVal) === String(n);
      return (
        '<input type="radio" class="rf-likert-input" id="' + id + '" name="' + name + '" value="' + n + '"' + dataAttrs + ' data-value="' + n + '"' + (checked ? ' checked' : '') + '>' +
        '<label for="' + id + '" class="rf-likert-dot"><span class="rf-visually-hidden">' + n + '</span></label>'
      );
    }).join('');
    return '<div class="rf-likert-dots">' + dots + '</div>';
  }

  function renderLikertSingle(q) {
    var rowsHtml = q.rows.map(function (row) {
      var val = (state[q.id] && state[q.id][row.id]) || '';
      var name = q.id + '__' + row.id;
      return (
        '<div class="rf-likert-row">' +
        '<p class="rf-likert-row-label">' + esc(row.label) + '</p>' +
        '<div class="rf-likert-scales">' +
        '<div class="rf-likert-scale">' +
        '<div class="rf-likert-dots-row">' +
        '<span class="rf-likert-endlabel">' + esc(q.minLabel) + '</span>' +
        renderLikertDots(name, val, ' data-qid="' + q.id + '" data-row="' + row.id + '"') +
        '<span class="rf-likert-endlabel is-right">' + esc(q.maxLabel) + '</span>' +
        '</div></div></div></div>'
      );
    }).join('');
    return '<div class="rf-likert-block">' + rowsHtml + '</div>';
  }

  function renderLikertDouble(q) {
    var subKeys = q.scaleLabels.map(slugify);
    var rowsHtml = q.rows.map(function (row) {
      var rowState = (state[q.id] && state[q.id][row.id]) || {};
      var scalesHtml = q.scaleLabels.map(function (scaleLabel, i) {
        var sub = subKeys[i];
        var val = rowState[sub] || '';
        var name = q.id + '__' + row.id + '__' + sub;
        return (
          '<div class="rf-likert-scale">' +
          '<div class="rf-likert-scale-label">' + esc(scaleLabel) + '</div>' +
          '<div class="rf-likert-dots-row">' +
          '<span class="rf-likert-endlabel">' + esc(q.minLabel) + '</span>' +
          renderLikertDots(name, val, ' data-qid="' + q.id + '" data-row="' + row.id + '" data-sub="' + sub + '"') +
          '<span class="rf-likert-endlabel is-right">' + esc(q.maxLabel) + '</span>' +
          '</div></div>'
        );
      }).join('');
      return (
        '<div class="rf-likert-row">' +
        '<p class="rf-likert-row-label">' + esc(row.label) + '</p>' +
        '<div class="rf-likert-scales">' + scalesHtml + '</div>' +
        '</div>'
      );
    }).join('');
    return '<div class="rf-likert-block">' + rowsHtml + '</div>';
  }

  function renderLikertFreq(q) {
    var rowsHtml = q.rows.map(function (row) {
      var val = (state[q.id] && state[q.id][row.id]) || '';
      var name = q.id + '__' + row.id;
      var opts = q.options.map(function (opt, i) {
        var id = name + '__' + i;
        var checked = val === opt;
        return (
          '<input type="radio" class="rf-freq-input" id="' + id + '" name="' + name + '" value="' + esc(opt) + '" data-qid="' + q.id + '" data-row="' + row.id + '"' + (checked ? ' checked' : '') + '>' +
          '<label for="' + id + '" class="rf-freq-option">' + esc(opt) + '</label>'
        );
      }).join('');
      return (
        '<div class="rf-freq-row">' +
        '<p class="rf-likert-row-label">' + esc(row.label) + '</p>' +
        '<div class="rf-freq-options">' + opts + '</div>' +
        '</div>'
      );
    }).join('');
    return rowsHtml;
  }

  function renderQuestion(q) {
    if (q.conditional && !q.conditional(state)) return '';

    var body = '';
    switch (q.type) {
      case 'select': body = renderSelect(q); break;
      case 'checkbox': body = renderCheckboxGroup(q); break;
      case 'likert-single': body = renderLikertSingle(q); break;
      case 'likert-double': body = renderLikertDouble(q); break;
      case 'likert-freq': body = renderLikertFreq(q); break;
      default: body = '';
    }

    var isGrid = q.type.indexOf('likert') === 0;
    return (
      '<div class="rf-field">' +
      '<label class="rf-label">' + esc(q.label) + (q.required ? '<span class="rf-required">*</span>' : '') + '</label>' +
      (q.note ? '<p class="rf-note">' + esc(q.note) + '</p>' : '') +
      body +
      '</div>'
    );
  }

  function renderConsent() {
    var opts = FORM.consent.options.map(function (opt, i) {
      var id = 'consent__' + i;
      var checked = state.consent === opt.value;
      return (
        '<input type="radio" class="rf-consent-input" id="' + id + '" name="consent" value="' + opt.value + '" data-qid="consent"' + (checked ? ' checked' : '') + '>' +
        '<label for="' + id + '" class="rf-consent-card">' +
        '<span class="rf-consent-radio"></span>' +
        '<span class="rf-consent-text">' + esc(opt.label) + '</span>' +
        '</label>'
      );
    }).join('');

    var declineBox = state.consent === 'disagree'
      ? '<div class="rf-decline-box">Tudo bem — obrigado pelo seu tempo. O formulário foi encerrado e nenhuma resposta será registrada. Você pode fechar esta janela.</div>'
      : '';

    return (
      '<div class="rf-progress-label">Termo de Consentimento</div>' +
      '<h4 class="rf-block-title">Termo de Consentimento Livre e Esclarecido</h4>' +
      '<div class="rf-consent-scroll">' +
      '<p>Você está sendo convidado(a) a participar de pesquisa de mestrado do PPGIT/UFMG, desenvolvida por Breno Vieitas sob orientação de [Nome do(a) Orientador(a)]. O estudo investiga como ferramentas de inteligência artificial e práticas de recrutamento executivo se relacionam ao acesso de profissionais negros, brancos, homens e mulheres a cargos de alta liderança no Brasil (diretoria, C-level, presidência e conselhos).</p>' +
      '<p>A participação é voluntária. É possível interromper o preenchimento a qualquer momento, sem prejuízo. Não serão pedidos nome, empresa, CPF ou outros identificadores. As respostas serão analisadas apenas de forma agregada.</p>' +
      '<p>Perguntas sobre raça/cor e gênero são dados sensíveis, nos termos do Art. 5º, II, da LGPD, e servem somente às comparações estatísticas do estudo. Todas têm a opção "Prefiro não responder".</p>' +
      '<p>Se quiser receber os resultados ou participar da etapa de entrevistas, use o link independente ao final. Esse contato fica em banco separado, sem vínculo com as respostas deste formulário.</p>' +
      '<p>Dúvidas: pesquisador ([e-mail]) | orientação ([e-mail]) | CEP/UFMG ([e-mail do CEP]) | CAAE: [número].</p>' +
      '<p>A pesquisa observa a Resolução CNS nº 510/2016 e a LGPD. <strong>Tempo estimado: 6 a 8 minutos.</strong></p>' +
      '</div>' +
      '<div class="rf-field">' +
      '<label class="rf-label">Após ler as informações, você concorda voluntariamente em participar?<span class="rf-required">*</span></label>' +
      opts +
      '</div>' +
      declineBox
    );
  }

  function renderBlock(block, index) {
    var questionsHtml = block.questions.map(renderQuestion).join('');
    return (
      '<div class="rf-progress-label">Bloco ' + index + ' de ' + FORM.blocks.length + (block.optional ? ' · opcional' : '') + '</div>' +
      '<h4 class="rf-block-title">' + esc(block.title) + '</h4>' +
      '<p class="rf-block-desc">' + esc(block.description) + '</p>' +
      questionsHtml
    );
  }

  function renderEnd() {
    return (
      '<div class="rf-end-wrap">' +
      '<div class="rf-end-icon">' +
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' +
      '</div>' +
      '<h4 class="rf-end-title">Obrigado pela sua colaboração!</h4>' +
      '<p class="rf-end-desc">As respostas deste formulário são anônimas e não serão associadas a nenhum identificador pessoal.</p>' +
      '<p class="rf-end-desc">Se quiser participar da entrevista confidencial (30 a 40 minutos) ou receber a síntese dos resultados e a minuta do protocolo de governança, use o formulário independente abaixo. Esse contato não se vincula às respostas que você acabou de enviar.</p>' +
      '<div class="rf-field" style="border-top:none;padding-top:1.5rem;">' +
      '<button type="button" class="rf-btn rf-btn-ghost" disabled title="Link a ser disponibilizado pela equipe de pesquisa">Formulário B — em breve</button>' +
      '</div>' +
      '</div>'
    );
  }

  function renderStep() {
    var step = steps[stepIndex];
    var total = FORM.blocks.length;
    var progressPct = step.type === 'consent' ? 4
      : step.type === 'end' ? 100
      : Math.round(((FORM.blocks.indexOf(step.block) + 1) / total) * 100);

    var content = '';
    if (step.type === 'consent') content = renderConsent();
    else if (step.type === 'block') content = renderBlock(step.block, FORM.blocks.indexOf(step.block) + 1);
    else content = renderEnd();

    root.innerHTML =
      '<div class="rf-progress-track"><div class="rf-progress-fill" style="width:' + progressPct + '%"></div></div>' +
      '<div class="rf-step-body">' + content + '</div>' +
      '<div class="rf-nav">' + renderNav(step) + '</div>' +
      '<div class="rf-error-msg" id="rf-error" hidden>Responda às perguntas obrigatórias (*) para continuar.</div>';
  }

  function renderNav(step) {
    if (step.type === 'consent') {
      if (state.consent === 'agree') {
        return '<span></span><button type="button" class="rf-btn rf-btn-primary" data-action="next">Avançar</button>';
      }
      if (state.consent === 'disagree') {
        return '<span></span><button type="button" class="rf-btn rf-btn-ghost" data-action="close">Fechar</button>';
      }
      return '<span></span><button type="button" class="rf-btn rf-btn-primary" disabled>Avançar</button>';
    }

    if (step.type === 'end') {
      return '<span></span><button type="button" class="rf-btn rf-btn-primary" data-action="close">Concluir</button>';
    }

    // step.type === 'block'
    var isLastBlock = FORM.blocks.indexOf(step.block) === FORM.blocks.length - 1;
    var nextLabel = isLastBlock ? 'Enviar respostas' : 'Avançar';
    var skip = step.block.optional
      ? '<button type="button" class="rf-btn-text" data-action="skip">Pular este bloco</button>'
      : '';

    return (
      '<div class="rf-nav-side">' +
      '<button type="button" class="rf-btn rf-btn-ghost" data-action="back">Voltar</button>' +
      skip +
      '</div>' +
      '<button type="button" class="rf-btn rf-btn-primary" data-action="next">' + esc(nextLabel) + '</button>'
    );
  }

  /* ============================================================
   * 4. VALIDAÇÃO E NAVEGAÇÃO
   * ============================================================ */

  function isQuestionAnswered(q) {
    if (q.conditional && !q.conditional(state)) return true;
    var v = state[q.id];
    switch (q.type) {
      case 'select': return !!v;
      case 'checkbox': return Array.isArray(v) && v.length > 0;
      case 'likert-single':
      case 'likert-freq':
        return q.rows.every(function (r) { return !!(v && v[r.id]); });
      case 'likert-double':
        var subs = q.scaleLabels.map(slugify);
        return q.rows.every(function (r) {
          return v && v[r.id] && subs.every(function (s) { return !!v[r.id][s]; });
        });
      default: return true;
    }
  }

  function isBlockValid(block) {
    return block.questions.every(function (q) {
      return !q.required || isQuestionAnswered(q);
    });
  }

  function goNext() {
    var step = steps[stepIndex];
    if (step.type === 'block' && !isBlockValid(step.block)) {
      var err = document.getElementById('rf-error');
      if (err) err.hidden = false;
      return;
    }
    var isLastBlock = step.type === 'block' && FORM.blocks.indexOf(step.block) === FORM.blocks.length - 1;
    if (isLastBlock) {
      lastPayload = buildPayload();
      submitPayload(lastPayload);
    }
    if (stepIndex < steps.length - 1) stepIndex++;
    renderStep();
  }

  function goBack() {
    if (stepIndex > 0) stepIndex--;
    renderStep();
  }

  function skipBlock() {
    if (stepIndex < steps.length - 1) stepIndex++;
    renderStep();
  }

  function buildPayload() {
    return {
      formulario: 'Formulário A — questionário anônimo (PPGIT/UFMG)',
      enviadoEm: new Date().toISOString(),
      consentimento: state.consent,
      respostas: {
        q1: state.q1, q2: state.q2, q3: state.q3, q4: state.q4, q5: state.q5, q6: state.q6, q7: state.q7,
        q8: state.q8, q9: state.q9, q10: state.q10,
        q11: state.q11, q12: state.q12, q13: state.q13, q14: state.q14,
        q15: state.q15, q16: state.q16,
        q17: state.q17, q18: state.q18,
      },
    };
  }

  function submitPayload(payload) {
    // TODO: substituir por chamada ao backend/endpoint de armazenamento quando definido.
    // Ex.: fetch('/api/formulario-a', { method: 'POST', body: JSON.stringify(payload) })
    console.log('[Formulário A] Payload pronto para envio:', payload);
  }

  /* ============================================================
   * 5. MONTAGEM + EVENTOS
   * ============================================================ */

  function handleChange(e) {
    var t = e.target;
    if (!t || !t.matches('input, select')) return;
    var err = document.getElementById('rf-error');
    if (err) err.hidden = true;

    if (t.tagName === 'SELECT') {
      state[t.dataset.qid] = t.value;
      renderStep();
      return;
    }

    if (t.type === 'checkbox') {
      updateCheckboxState(t);
      renderStep();
      return;
    }

    if (t.type === 'radio') {
      updateRadioState(t);
      renderStep();
    }
  }

  function updateCheckboxState(input) {
    var qid = input.dataset.qid;
    var q = QUESTIONS_BY_ID[qid];
    var exclusiveList = (q && q.exclusiveOptions) || [];
    var arr = state[qid] || [];
    var val = input.value;

    if (input.checked) {
      if (exclusiveList.indexOf(val) !== -1) {
        arr = [val];
      } else {
        arr = arr.filter(function (v) { return exclusiveList.indexOf(v) === -1; });
        arr.push(val);
      }
    } else {
      arr = arr.filter(function (v) { return v !== val; });
    }
    state[qid] = arr;
  }

  function updateRadioState(input) {
    var qid = input.dataset.qid;
    if (qid === 'consent') {
      state.consent = input.value;
      return;
    }
    var row = input.dataset.row;
    var sub = input.dataset.sub;

    if (row === undefined) {
      state[qid] = input.value;
      return;
    }
    if (!state[qid]) state[qid] = {};
    if (sub) {
      if (!state[qid][row]) state[qid][row] = {};
      state[qid][row][sub] = input.value;
    } else {
      state[qid][row] = input.value;
    }
  }

  function handleClick(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.dataset.action;
    if (action === 'next') goNext();
    else if (action === 'back') goBack();
    else if (action === 'skip') skipBlock();
    else if (action === 'close') {
      var closeBtn = document.getElementById('close-modal-btn');
      if (closeBtn) closeBtn.click();
    }
  }

  function initResearchForm() {
    root = document.getElementById('form-root');
    if (!root) return;
    root.addEventListener('change', handleChange);
    root.addEventListener('click', handleClick);
    renderStep();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initResearchForm);
  } else {
    initResearchForm();
  }
})();
