/**
 * MAPA DE FÓRMULAS: ./FORMULAS.md
 * Exibe valor, rankings e evolução recebidos de detalhes; não recalcula médias.
 */
const params =
    new URLSearchParams(
        window.location.search
    );


let metricId =
    params.get("indicador")
    || "gmd";

// Nova modificação de 26/10/2026: comportamento restrito à mortalidade.
const mortalityMode = metricId === 'mortalidade';
const transportMode = metricId === 'morte_transporte';
const singleYearMode = mortalityMode || transportMode;
const detailYearId = mortalityMode ? 'anoMortalidade' : 'anoTransporte';
let mortalityGrouping = 'semanal', mortalityPayload = null;
// Um unico ano para mortalidade e transporte; demais indicadores conservam selecao multipla.
if(singleYearMode) {
    const select=document.createElement('select');select.id=detailYearId;select.ariaLabel='Ano da análise';
    document.getElementById('ano').replaceWith(select);
    document.getElementById('tituloEvolucao').textContent=mortalityMode?'Mortalidade semanal':'Morte no Transporte por planta de abate';
}
let metricCatalog = [];


const DETAIL_FILTERS = [
    {
        id: singleYearMode ? detailYearId : "ano",
        apiKey: "ano",
        search: false,
        multi: !singleYearMode
    },
    {
        id: "mes",
        apiKey: "mes",
        search: false,
        multi: true
    },
    // Nova modificação de 26/10/2026: semanas de abate disponíveis no contexto.
    {
        id: "semana",
        apiKey: "semana",
        search: false,
        multi: true
    },
    {
        id: "tipoGranja",
        apiKey: "tipo_granja",
        search: true,
        multi: true
    },
    {
        id: "modelo",
        apiKey: "modelo",
        search: true,
        multi: true
    },
    FazendaFilter.field,
    {
        id: "tecnico",
        apiKey: "tecnico",
        search: true,
        multi: true
    },
    {
        id: "galpao",
        apiKey: "galpao",
        search: true,
        multi: true
    }
];


const inheritedKeys = [
    "status_acerto",
    "tipo_linhagem",
    "linhagem",
    "data_inicio",
    "data_fim"
];


let detalhesData = null;
let requestController = null;
let detailRequestId = 0;


function semAno2022(series) {
    return (series || []).filter(
        item => Number(item.ano) >= 2023
    );
}


const filters = new FilterController({
    fields: DETAIL_FILTERS,
    optionsObserver: FazendaFilter.ensureOptions,

    onChange: () => {
        detailRankingReturn.reset();
        atualizarUrl();
        carregarDetalhes(false);
    },

    includeDependentRefresh: true,

    contextProvider: () => ({
        ...inheritedFilters()
    })
});


function inheritedFilters() {
    const result = {};

    inheritedKeys.forEach(key => {
        const values =
            params
                .getAll(key)
                .filter(Boolean);

        if (values.length > 1) {
            result[key] = values;
        }
        else if (values.length === 1) {
            result[key] = values[0];
        }
    });

    return result;
}


function allFilters() {
    return {
        ...inheritedFilters(),
        ...filters.values(),
        ...FazendaFilter.rankingParams
    };
}

// Apenas historico local: as consultas e o contexto continuam no FilterController original.
const detailRankingReturn = (() => {
    const history = [];
    let busy = false;
    const buttons = [...document.querySelectorAll('[data-ranking-back]')];
    const loading = () => !document.getElementById('dashboardAtualizando').classList.contains('hidden');
    function sync() {
        buttons.forEach(button => {
            button.classList.toggle('hidden', !history.length);
            button.disabled = busy || loading();
        });
    }
    function reset() { history.length = 0; sync(); }
    function begin(key, name) {
        if (busy || loading() || !detalhesData) return false;
        const values = filters.values();
        const requested = typeof key === 'object' ? key : {[key]: name};
        if (Object.entries(requested).every(([field, value]) => values[field]?.length === 1 && values[field][0] === value)) return false;
        // Guardar tambem as opcoes evita perder selecoes que o contexto seguinte restringe.
        const options = DETAIL_FILTERS.map(field => field.multi
            ? filters.getState(field).options.map(option => ({...option}))
            : document.getElementById(field.id).innerHTML);
        history.push({values, options});
        busy = true; sync(); return true;
    }
    function end() { busy = false; sync(); }
    async function back() {
        if (busy || loading() || !history.length) return;
        const previous = history.pop();
        busy = true; sync();
        try {
            filters.invalidateRefresh();
            DETAIL_FILTERS.forEach((field, index) => {
                if (field.multi) filters.renderMultiOptions(field, previous.options[index], previous.values[field.apiKey] || []);
                else {
                    document.getElementById(field.id).innerHTML = previous.options[index];
                    filters.set(field.apiKey, previous.values[field.apiKey] || '');
                }
            });
            await atualizarFiltrosDetalhes(true);
        } finally { end(); }
    }
    buttons.forEach(button => button.addEventListener('click', back));
    return {begin, end, reset, sync};
})();

const detailRankings = {
    tecnicos: {suffix:'Tecnicos', label:'técnicos', direction:'desc', rows:[]},
    produtores: {suffix:'Produtores', label:'fazendas', direction:'desc', rows:[]},
    galpoes: {suffix:'Galpoes', label:'galpões', direction:'desc', rows:[]}
};

function rankingSortButton(kind, unavailable = false) {
    const state = detailRankings[kind], button = document.querySelector(`[data-ranking-sort="${kind}"]`);
    const ascending = state.direction === 'asc';
    button.title = `Ordem atual: ${ascending ? 'menor para maior' : 'maior para menor'}. Clique para inverter.`;
    button.setAttribute('aria-label', `Ordenar ${state.label} do ${ascending ? 'maior para o menor' : 'menor para o maior'}`);
    button.setAttribute('aria-pressed', String(ascending));
    button.disabled = unavailable || state.rows.length < 2 || button.closest('[data-detail-region]').getAttribute('aria-busy') === 'true';
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ascending ? 'M6 20V4m-3 3 3-3 3 3' : 'M6 4v16m-3-3 3 3 3-3'}"/><path d="${ascending ? 'M12 6h2m-2 6h5m-5 6h8' : 'M12 6h8m-8 6h5m-5 6h2'}"/></svg>`;
}

function renderDetailRanking(kind) {
    const state = detailRankings[kind], metric = detalhesData.indicador;
    const source = detalhesData['ranking_' + kind], available = Array.isArray(source);
    const value = row => row.valor == null || !Number.isFinite(Number(row.valor)) ? null : Number(row.valor);
    state.rows = available ? source.slice().sort((a, b) => {
        const x = value(a), y = value(b);
        if (x == null || y == null) return x == null ? y == null ? 0 : 1 : -1;
        return (x - y) * (state.direction === 'asc' ? 1 : -1) || String(a.nome).localeCompare(String(b.nome), 'pt-BR', {numeric:true});
    }) : [];
    const host = document.getElementById('ranking' + state.suffix);
    host.style.visibility = available ? 'visible' : 'hidden';
    const audit = detalhesData.ranking_contexto, context = audit?.[kind];
    document.getElementById('contextoRanking' + state.suffix).textContent = available
        ? `${source.length} ${state.label} · ${Math.min(20, source.length)} visíveis${source.length > 20 ? ' · Role para ver todos' : ''}${context?.sem_identificacao ? ' · Inclui registros sem identificação' : ''}`
        : 'Ranking de galpões indisponível nesta versão da API.';
    const descriptions = {sum:'Soma de todos os grupos.', avg:'Média dos lotes válidos. A média simples dos grupos não reproduz o total quando eles têm quantidades diferentes de lotes.',
        ratio_sums:'Total calculado pela divisão das somas dos componentes. Somar ou fazer média simples das barras não reproduz esse total.',
        weighted_avg:metric.id === 'vazio' ? 'Média dos grupos ponderada por aves abatidas, sem limite de 14.' : 'Média dos grupos ponderada por aves alojadas.'};
    document.getElementById('conferenciaRanking' + state.suffix).textContent = available && context
        ? `${descriptions[audit.metodo] || ''} Total recomposto: ${formatMetric(context.valor_recomposto, metric)}. ${METRICAS[metric.id]?.descricao || ''}` : '';
    if (available) ZooCharts.ranking(echarts.getInstanceByDom(host), state.rows, metric.nome, metric.unidade, metric.casas_decimais ?? 2);
    rankingSortButton(kind, !available);
}

document.querySelectorAll('[data-ranking-sort]').forEach(button => {
    button.addEventListener('click', () => {
        if (!detalhesData || button.disabled) return;
        const kind = button.dataset.rankingSort;
        detailRankings[kind].direction = detailRankings[kind].direction === 'desc' ? 'asc' : 'desc';
        renderDetailRanking(kind);
    });
    rankingSortButton(button.dataset.rankingSort);
});


async function carregarIndicadores() {
    const response = { metricas: BI_METRIC_ORDER.map(id => METRICAS[id]) };

    metricCatalog =
        Array.isArray(response.metricas)
            ? response.metricas
            : [];

    metricCatalog = metricCatalog.filter(metric => metric.id !== "cac_ref" && BI_METRIC_ORDER.includes(metric.id));
    if (!metricCatalog.some(metric => metric.id === metricId)) metricId = "gmd";

    const select =
        document.getElementById(
            "indicador"
        );

    select.innerHTML = "";

    metricCatalog.forEach(metric => {
        const option =
            document.createElement(
                "option"
            );

        option.value = metric.id;
        option.textContent = metric.nome;
        option.selected =
            metric.id === metricId;

        select.appendChild(option);
    });

    select.value = metricId;
}


function registrarIndicador() {
    document
        .getElementById(
            "indicador"
        )
        .addEventListener(
            "change",
            () => {
                detailRankingReturn.reset();
                metricId =
                    document
                        .getElementById(
                            "indicador"
                        )
                        .value;

                atualizarUrl();
                if ((metricId === 'mortalidade') !== mortalityMode || (metricId === 'morte_transporte') !== transportMode) {
                    window.location.reload(); return;
                }
                carregarDetalhes(false);
            }
        );
}


function atualizarUrl() {
    const next =
        new URLSearchParams();

    next.set(
        "indicador",
        metricId
    );

    Object.entries(
        allFilters()
    ).forEach(
        ([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach(item => {
                    next.append(key, item);
                });
                return;
            }

            if (value) {
                next.set(key, value);
            }
        }
    );

    const backParams = new URLSearchParams(next);
    backParams.delete('indicador'); backParams.delete('dimensao_produtor');
    document.getElementById('voltarDashboard').href = `index.html?${backParams}`;
    history.replaceState(
        null,
        "",
        `${location.pathname}?${next.toString()}`
    );
}


function formatMetric(
    value,
    metric
) {
    if (
        value === null
        || value === undefined
    ) {
        return "—";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
        return "—";
    }

    if (metric.unidade === "aves") {
        return number.toLocaleString(
            "pt-BR",
            {
                maximumFractionDigits: 0
            }
        );
    }

    const digits =
        Number.isInteger(
            metric.casas_decimais
        )
            ? metric.casas_decimais
            : 2;

    return number.toLocaleString(
        "pt-BR",
        {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        }
    );
}


function markDetailUpdating(part, updating) {
    const selector = part === 'all' ? '[data-detail-region]' : `[data-detail-region="${part}"]`;
    document.querySelectorAll(selector).forEach(region => {
        region.classList.toggle('detail-updating', updating);
        region.setAttribute('aria-busy', String(updating));
        region.querySelectorAll('[data-ranking-sort]').forEach(button => rankingSortButton(button.dataset.rankingSort));
    });
}

function render({principal = true, evolucao = true} = {}) {
    if (!detalhesData) {
        return;
    }

    const metric =
        detalhesData.indicador;

    if (principal) {
    IndicatorFormulaUI.scan();

    document
        .getElementById(
            "tituloDetalhes"
        )
        .textContent =
        `Detalhamento • ${metric.nome}`;

    document
        .getElementById(
            "subtituloDetalhes"
        )
        .textContent =
        "Rankings e evolução dos indicadores zootécnicos.";

    exibirAtualizacaoDados(document.getElementById('ultimaAtualizacao'),detalhesData);

    document
        .getElementById(
            "kpiNome"
        )
        .textContent =
        metric.nome;

    document
        .getElementById(
            "kpiValor"
        )
        .textContent =
        formatMetric(
            metric.valor,
            metric
        );

    Object.keys(detailRankings).forEach(renderDetailRanking);
    markDetailUpdating('principal', false);
    }

    if (evolucao) {
    document.getElementById('tituloEvolucao').textContent = `Evolução de ${metric.nome}`;
    document.getElementById('mortalityEvolutionCard').classList.toggle('mortality-evolution',mortalityMode);
    document.getElementById('mortalityGrouping').classList.toggle('hidden',!mortalityMode);
    document.getElementById('mortalityLegend').classList.toggle('hidden',!mortalityMode);
    if (mortalityMode) {
        document.getElementById('tituloEvolucao').textContent = `Mortalidade ${mortalityGrouping === 'mensal' ? 'mensal' : 'semanal'} · ${allFilters().ano}`;
        if(mortalityPayload) MortalityChart.draw(evolucaoChart,mortalityPayload);
    } else if(transportMode) {
        document.getElementById('tituloEvolucao').textContent=`% Morte no Transporte por planta de abate · ${allFilters().ano}`;
        document.querySelector('#tituloEvolucao + p').textContent='Média ponderada por aves alojadas, por mês e planta de abate. No celular, deslize horizontalmente sobre o gráfico.';
        if(detalhesData.evolucao?.agrupamento !== 'planta_de_abate')throw new Error('Atualize o backend para a evolução por planta de abate.');
        ZooCharts.evolution(evolucaoChart,detalhesData.evolucao,metric.nome,metric.casas_decimais ?? 2,metric.unidade);
    } else {
        ZooCharts.evolution(evolucaoChart,detalhesData.evolucao,metric.nome,metric.casas_decimais ?? 2,metric.unidade);
    }
    markDetailUpdating('evolucao', false);
    }
}


async function carregarDetalhes(
    initial = false
) {
    if(singleYearMode) {
        const yearSelect=document.getElementById(detailYearId);
        const allOption=yearSelect.querySelector('option[value=""]');
        allOption?.remove();
        if(!yearSelect.value) yearSelect.value=[...yearSelect.options].map(o=>o.value).filter(Boolean).sort((a,b)=>Number(b)-Number(a))[0]||'';
        if(!yearSelect.value) {
            ++detailRequestId;requestController?.abort();mortalityPayload=null;if(mortalityMode)MortalityChart.clear();evolucaoChart.clear();rankingTecnicosChart.clear();rankingProdutoresChart.clear();rankingGalpoesChart.clear();
            document.getElementById('kpiValor').textContent='\u2014';
            const error=document.getElementById('mensagemErro');error.textContent='Sem ano disponivel para os filtros selecionados.';error.classList.remove('hidden');
            document.getElementById('dashboardAtualizando').classList.add('hidden');markDetailUpdating('all',false);detailRankingReturn.sync();return;
        }
        if(mortalityMode) mortalityPayload=null;
        atualizarUrl();
        document.getElementById('tituloEvolucao').textContent=mortalityMode?`Mortalidade ${mortalityGrouping==='semanal'?'semanal':'mensal'} · ${yearSelect.value}`:`% Morte no Transporte por planta de abate · ${yearSelect.value}`;
    }
    const requestId = ++detailRequestId;
    document.getElementById("mensagemErro").classList.add("hidden");
    document.getElementById("tituloDetalhes").textContent = "Detalhamento • " + (METRICAS[metricId]?.nome || "Indicador");
    IndicatorFormulaUI.scan();
    if (requestController) {
        requestController.abort();
    }

    requestController =
        new AbortController();

    document
        .getElementById(
            "dashboardAtualizando"
        )
        .classList
        .remove("hidden");

    markDetailUpdating('all', true);
    detailRankingReturn.sync();
    try {
        if(mortalityMode) {
            // Somente duas consultas, em paralelo. A evolução antiga não é usada.
            const snapshot=allFilters(), options={signal:requestController.signal};
            let principalReady = false;
            const principal=apiGet(APP_CONFIG.endpoints.detalhes,
                {...snapshot,indicador:'mortalidade',etapa:'principal'},options).then(response=>{
                    if(requestId !== detailRequestId)return response;
                    if(!response.ranking_contexto)throw new Error('Atualize o backend para os rankings completos.');
                    detalhesData=response;principalReady=true;
                    render({principal:true,evolucao:!!mortalityPayload});return response;
                });
            const evolution=apiGet(APP_CONFIG.endpoints.detalhes,
                {...snapshot,indicador:'mortalidade',etapa:'evolucao',agrupamento:mortalityGrouping},options).then(payload=>{
                    if(requestId !== detailRequestId)return payload;
                    mortalityPayload=payload;
                    if(principalReady)render({principal:false,evolucao:true});return payload;
                });
            await Promise.all([principal,evolution]);
            return;
        }
        let principalReady = false;
        await ApiProgressive.details(
                APP_CONFIG
                    .endpoints
                    .detalhes,
                {
                    indicador: metricId,
                    ...allFilters()
                },
                {
                    signal:
                        requestController
                            .signal
                },
                response => {
                    if (requestId !== detailRequestId) return;
                    if (!response.ranking_contexto) throw new Error('Atualize o backend do Anderson para os rankings completos e a conferência dos totais.');
                    detalhesData = response;
                    render({principal:!principalReady,evolucao:response.carga_completa});
                    principalReady = true;
                }
            );

    }
    catch (error) {
        if (requestId !== detailRequestId) return;
        if (
            error.name
            === "AbortError"
        ) {
            return;
        }

        console.error(error);
        requestController?.abort();
        exibirAtualizacaoDados(document.getElementById('ultimaAtualizacao'),null);

        const el =
            document.getElementById(
                "mensagemErro"
            );

        el.textContent =
            (error.message || "Falha ao carregar detalhamento.")
            + (detalhesData ? ' Os dados anteriores continuam visíveis nas partes que não foram atualizadas.' : '');

        el.classList.remove("hidden");
    }
    finally {
        if (requestId !== detailRequestId) return;
        document
            .getElementById(
                "dashboardAtualizando"
            )
            .classList
            .add("hidden");
        markDetailUpdating('all', false);
        detailRankingReturn.sync();
    }
}


const rankingTecnicosChart =
    ZooCharts.init(
        document.getElementById(
            "rankingTecnicos"
        )
    );


const rankingProdutoresChart =
    ZooCharts.init(
        document.getElementById(
            "rankingProdutores"
        )
    );

const rankingGalpoesChart = ZooCharts.init(document.getElementById('rankingGalpoes'));


const evolucaoChart =
    ZooCharts.init(
        document.getElementById(
            "evolucaoChart"
        )
    );

// Nova modificação de 26/10/2026: consulta de lotes somente após clicar numa barra.
if(mortalityMode)MortalityChart.setLotOpener(selection=>MortalityLots.open({...selection,filters:allFilters()}));


async function atualizarFiltrosDetalhes(preserve) {
    ++detailRequestId;
    requestController?.abort();
    markDetailUpdating('all', true);
    document.getElementById("dashboardAtualizando").classList.remove("hidden");
    document.getElementById("mensagemErro").classList.add("hidden");
    try {
        if(await filters.loadOptions({preserve}) === false)return;
        atualizarUrl();
        await carregarDetalhes(false);
    }catch(error){
        if(error.name === "AbortError")return;
        const el=document.getElementById("mensagemErro");el.textContent=error.message;el.classList.remove("hidden");
        document.getElementById("dashboardAtualizando").classList.add("hidden");
        markDetailUpdating('all', false);
    }
}

rankingTecnicosChart.on(
    "click",
    async paramsChart => {
        const row = detailRankings.tecnicos.rows[paramsChart.dataIndex];
        if(!row || row.sem_identificacao)return;
        if (!detailRankingReturn.begin('tecnico', row.nome)) return;
        try {
            filters.set(
                "tecnico",
                row.nome
            );

            await atualizarFiltrosDetalhes(true);
        } finally { detailRankingReturn.end(); }
    }
);


rankingProdutoresChart.on(
    "click",
    async paramsChart => {
        const row = detailRankings.produtores.rows[paramsChart.dataIndex];
        if(!row || row.sem_identificacao || !row.codigo)return;
        if (!detailRankingReturn.begin('fazenda', row.codigo)) return;
        try {
            filters.set(
                "fazenda",
                row.codigo
            );

            await atualizarFiltrosDetalhes(true);
        } finally { detailRankingReturn.end(); }
    }
);

rankingGalpoesChart.on('click', async paramsChart => {
    const row = detailRankings.galpoes.rows[paramsChart.dataIndex];
    if (!row || row.sem_identificacao || !row.codigo || !row.galpao) return;
    if (!detailRankingReturn.begin({fazenda:row.codigo, galpao:row.galpao})) return;
    try {
        filters.set('fazenda', row.codigo);
        filters.set('galpao', row.galpao);
        await atualizarFiltrosDetalhes(true);
    } finally { detailRankingReturn.end(); }
});


document.addEventListener(
    "charts:theme-refresh",
    () => {
        if (document.getElementById('dashboardAtualizando').classList.contains('hidden')) render();
    }
);


document
    .getElementById(
        "limparFiltrosDetalhes"
    )
    .addEventListener(
        "click",
        async () => {
            detailRankingReturn.reset();
            filters.clear();

            await atualizarFiltrosDetalhes(false);
        }
    );


async function aplicarParametrosUrl() {
    DETAIL_FILTERS.forEach(field => {
        const values =
            params
                .getAll(field.apiKey)
                .filter(Boolean);

        if (values.length) {
            if(singleYearMode && field.apiKey === 'ano') {
                const chosen=[...values].sort((a,b)=>Number(b)-Number(a))[0];
                const option=document.createElement('option');option.value=chosen;option.textContent=chosen;
                document.getElementById(detailYearId).appendChild(option);
            }
            filters.set(
                field.apiKey,
                field.multi
                    ? values
                    : (field.apiKey === "ano" && singleYearMode ? [...values].sort((a,b)=>Number(b)-Number(a))[0] : values[0])
            );
        }
    });


}


async function iniciar() {
    await carregarIndicadores();
    registrarIndicador();
    filters.register();

    await aplicarParametrosUrl();

    if(await filters.loadOptions({
        preserve: true
    }) === false)return;

    atualizarUrl();
    await carregarDetalhes(true);
}


document.querySelectorAll('[data-mortality-unit]').forEach(button=>button.addEventListener('click',()=>{
    if(!mortalityMode || mortalityGrouping===button.dataset.mortalityUnit)return;
    mortalityGrouping=button.dataset.mortalityUnit;
    document.querySelectorAll('[data-mortality-unit]').forEach(item=>{
        item.classList.toggle('active',item===button);item.setAttribute('aria-checked',String(item===button));
    });
    carregarDetalhes(false);
}));
iniciar().catch(error => {
  const el = document.getElementById("mensagemErro");
  el.textContent = error.message || "Não foi possível iniciar o detalhamento.";
  el.classList.remove("hidden");
  document.getElementById("dashboardAtualizando").classList.add("hidden");
});
