/* Rota genérica confirmada pelo JSON do Portal de Dados; transporte pelo Worker. */
window.ConsumoRacaoConfig = Object.freeze({
  mode: 'api', // Demonstracao: apenas localhost, ?demo=1; sem fallback automático.
  transport: 'portal-paginated',
  snapshotEndpoint: '/api/portal/fabrica_racao/dados/consumo_medio_racao',
  pageSize: 500,
  requestParams: Object.freeze({}),
  maxRecords: 10000,
  contractVersion: 'consumo-racao-snapshot-v1'
});
