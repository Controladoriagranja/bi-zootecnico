-- Executar manualmente no Adminer, banco bi_granja.
-- Cadastra as CINCO fases do plano separadas, em kg/ave, desde 01/01/2026.
-- Cadastro separado: a interface soma FCI + FC2 para a meta de Crescimento.
-- Aplicação confirmada para todos os registros, sem restrição por sexo/linhagem/Standard.
-- referencia_mes registra o início da vigência. Não duplica todos os meses.
BEGIN;

WITH plano (indicador_codigo, indicador_nome, valor_meta, fase) AS (
    VALUES
      ('plano_0001_fpi_cons_ave', 'Plano 0001 - Pré-Inicial',    0.220::numeric, 'FPI'),
      ('plano_0001_fin_cons_ave', 'Plano 0001 - Inicial',        1.000::numeric, 'FIN'),
      ('plano_0001_fci_cons_ave', 'Plano 0001 - Crescimento',    1.000::numeric, 'FCI'),
      ('plano_0001_fc2_cons_ave', 'Plano 0001 - Crescimento 2',  1.000::numeric, 'FC2'),
      ('plano_0001_fab_cons_ave', 'Plano 0001 - Abate',          1.900::numeric, 'FAB')
), metas AS (
    SELECT *, jsonb_build_object(
        'plano', '0001', 'fase_plano', fase,
        'tipo_aves_plano', 'Frango Convencional', 'sexo_plano', 'Misto',
        'abrangencia', 'todos_registros',
        'vinculo_fase_tela', CASE fase WHEN 'FPI' THEN 'fase_pre_menos_inicial'
            WHEN 'FIN' THEN 'fase_inicial' WHEN 'FAB' THEN 'fase_final'
            WHEN 'FCI' THEN 'fase_crescimento (componente)' WHEN 'FC2' THEN 'fase_crescimento (componente)'
            ELSE 'pendente_confirmacao' END,
        'vigencia_inicio', '2026-01-01',
        'desvio', 'ABS(realizado / meta - 1) * 100',
        'verde_ate_pct', 1, 'laranja_ate_pct', 3,
        'vermelho_acima_pct', 3
    )::text AS notas
    FROM plano
), atualizadas AS (
    UPDATE fabrica_racao.metas m
       SET indicador_nome = p.indicador_nome,
           tela = 'consumo-medio-racao',
           tabela_origem = 'fabrica_racao.consumo_medio_racao',
           coluna_origem = CASE p.fase WHEN 'FPI' THEN 'fase_pre_menos_inicial_cons_ave'
               WHEN 'FIN' THEN 'fase_inicial_cons_ave' WHEN 'FAB' THEN 'fase_final_cons_ave' ELSE NULL END,
           valor_meta = p.valor_meta, unidade = 'kg/ave', comparacao = '=',
           observacao = p.notas, ativo = true, atualizado_em = now()
      FROM metas p
     WHERE m.indicador_codigo = p.indicador_codigo
       AND m.referencia_mes = DATE '2026-01-01'
    RETURNING m.id
)
INSERT INTO fabrica_racao.metas (
    indicador_codigo, indicador_nome, tela, tabela_origem, coluna_origem,
    valor_meta, unidade, comparacao, referencia_mes, observacao, ativo
)
SELECT p.indicador_codigo, p.indicador_nome, 'consumo-medio-racao',
       'fabrica_racao.consumo_medio_racao',
       CASE p.fase WHEN 'FPI' THEN 'fase_pre_menos_inicial_cons_ave'
           WHEN 'FIN' THEN 'fase_inicial_cons_ave' WHEN 'FAB' THEN 'fase_final_cons_ave' ELSE NULL END,
       p.valor_meta, 'kg/ave', '=', DATE '2026-01-01', p.notas, true
FROM metas p
WHERE NOT EXISTS (
    SELECT 1 FROM fabrica_racao.metas m
    WHERE m.indicador_codigo = p.indicador_codigo
      AND m.referencia_mes = DATE '2026-01-01'
);

COMMIT;

-- Conferência: FCI e FC2 permanecem separados; a interface soma suas metas vigentes.
SELECT indicador_codigo, indicador_nome, valor_meta, unidade, referencia_mes,
       ativo, observacao
FROM fabrica_racao.metas
WHERE indicador_codigo IN (
    'plano_0001_fpi_cons_ave', 'plano_0001_fin_cons_ave',
    'plano_0001_fci_cons_ave', 'plano_0001_fc2_cons_ave',
    'plano_0001_fab_cons_ave'
)
ORDER BY indicador_codigo, referencia_mes;
