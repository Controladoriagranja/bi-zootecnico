/** Somente endpoints identificados no backend de referência. */
const APP_CONFIG = Object.freeze({
  mode: "api-cloudflare",
  API_URL: "https://api-bi-granja.controladoriagb05.workers.dev",
  endpoints: Object.freeze({
    health: "/api/zootecnico/health",
    filtros: "/api/bi/zootecnico/filtros",
    desempenho: "/api/bi/zootecnico/resumo",
    detalhes: "/api/bi/zootecnico/detalhes"
  })
});
