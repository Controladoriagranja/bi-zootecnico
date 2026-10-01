/**
 * Cliente HTTP do BI Zootécnico.
 *
 * O navegador não lê mais Parquet.
 * Todos os dados vêm da API publicada pelo Cloudflare Worker,
 * que valida a sessão do Portal BI e encaminha a consulta
 * pelo binding privado até a API interna.
 */

class ApiError extends Error {
  constructor(message, status = 0, code = "HTTP_ERROR") {
    super(message); this.name = "ApiError"; this.status = status; this.code = code;
  }
}
function getPortalToken() {
  try {
    return sessionStorage.getItem("granjabi_auth_token") || "";
  } catch (_) {
    return "";
  }
}

async function apiGet(endpoint, params = {}, options = {}) {
  if (!endpoint) {
    throw new Error("Endpoint da API não informado.");
  }

  const baseUrl = String(APP_CONFIG.API_URL || "").replace(/\/+$/, "");

  if (!baseUrl) {
    throw new Error("APP_CONFIG.API_URL não configurada.");
  }

  const token = getPortalToken();

  if (!token) {
    throw new ApiError("Sessão da CENTRAL não encontrada. Entre pela CENTRAL e abra o relatório novamente.", 401, "SESSION_MISSING");
  }

  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const url = new URL(baseUrl + normalizedEndpoint);
  if (url.origin !== new URL(APP_CONFIG.API_URL).origin || !url.pathname.startsWith("/api/")) {
    throw new ApiError("Endereço de consulta inválido.", 0, "CONFIG_ERROR");
  }

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== null && item !== undefined && item !== "") {
          url.searchParams.append(key, String(item));
        }
      });
      return;
    }

    url.searchParams.append(key, String(value));
  });

  if (endpoint === APP_CONFIG.endpoints.detalhes && params.indicador === "vazio") {
    throw new ApiError("O indicador Vazio aguarda atualização da regra de cálculo no serviço de dados.", 503, "RULE_PENDING");
  }

  let response;

  try {
    response = await fetch(url.toString(), {
      method: "GET",
      signal: options.signal,
      cache: options.cache || "no-store",
      headers: {
        ...(options.headers || {}),
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }

    throw new ApiError(
      "Não foi possível conectar à API do BI. " +
        "Verifique a conexão com a internet e a disponibilidade do serviço."
    );
  }

  if (!response.ok) {
    const messages = {
      400: "Consulta inválida. Confira o indicador e os filtros.",
      401: "Sessão inválida ou expirada. Entre novamente pela CENTRAL.",
      403: "Acesso não autorizado para esta sessão ou origem.",
      404: "Consulta indisponível no serviço de dados.",
      422: "Filtros inválidos. Confira as datas e seleções.",
      500: "Não foi possível concluir a consulta. Tente novamente.",
      502: "Serviço de dados indisponível. Tente novamente.",
      503: "Serviço temporariamente indisponível. Tente novamente."
    };
    throw new ApiError(messages[response.status] || "Não foi possível concluir a consulta.", response.status);
  }
  try {
    const data = await response.json();
    if (endpoint === APP_CONFIG.endpoints.desempenho && data.indicadores?.vazio) {
      const metric = data.indicadores.vazio;
      metric.por_ano = Object.fromEntries(Object.entries(metric.por_ano || {}).map(([year, values]) => [year, values.map(() => null)]));
      metric.totais = Object.fromEntries(Object.keys(metric.totais || {}).map(year => [year, null]));
    }
    return data;
  }
  catch (_) { throw new ApiError("O serviço retornou uma resposta inválida.", response.status, "INVALID_JSON"); }
}
