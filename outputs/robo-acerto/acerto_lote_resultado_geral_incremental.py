# -*- coding: utf-8 -*-
r"""
ZOOTÉCNICO - ACERTO LOTE - RESULTADO GERAL -> POSTGRESQL

Estrutura ajustada para seguir o mesmo padrão do
matrizes_acerto_produtor_producao_banco.py:

- argumentos() separado;
- cobertura desde janeiro de 2023, com retomada por mês confirmado;
- exportações de no máximo sete dias por padrão, pela data de abate;
- reconsulta dos dois meses recentes e reconciliação periódica do histórico;
- conferência de chave/hash no PostgreSQL antes do COMMIT;
- período manual por --data-inicial / --data-final;
- compatibilidade com --inicio / --fim do atualizador Zootécnico;
- uma única sessão Agrosys por execução;
- processar_alvo() separado;
- main() apenas orquestra períodos;
- acumula falhas e retorna código 1;
- mantém o tratamento validado do Excel;
- mantém o UPSERT pela identidade do lote;
- grava em zootecnico.acerto_lote_resultado_geral.

Relatório específico do Zootécnico:
- Programa/tela: wpf530d9
- Menu: 17175
- Módulo: 17000
- Unidade: 52
"""

import argparse
import hashlib
import importlib.util
import json
import os
import re
import sys
import tempfile
import traceback
import unicodedata
from contextlib import contextmanager
from datetime import datetime, date, timedelta, timezone
from pathlib import Path

import pandas as pd

PASTA_ROBO = Path(__file__).resolve().parent
sys.path.insert(0, str(PASTA_ROBO))


# ----------------------------------------------------------------------
# Localiza a estrutura existente do Agrosys_Extractor
# ----------------------------------------------------------------------
def localizar_raiz_agrosys() -> Path:
    atual = Path(__file__).resolve().parent

    for pasta in [atual] + list(atual.parents):
        if (pasta / "config.py").exists() and (pasta / "Core").exists():
            return pasta

    raise RuntimeError(
        "Não encontrei config.py + Core na árvore do Agrosys_Extractor."
    )


RAIZ = None


def carregar_runtime():
    # Planejamento/validação de Excel funcionam sem config, Agrosys ou banco.
    global RAIZ, BASE_AGROSYS, USUARIO_AGROSYS, SENHA_AGROSYS, PASTA_HTML, AgrosysEngine
    if RAIZ is not None:
        return
    raiz = localizar_raiz_agrosys()
    sys.path.insert(0, str(raiz))
    from Core import agrosys_runtime, agrosys_engine
    BASE_AGROSYS = agrosys_runtime.BASE_AGROSYS
    USUARIO_AGROSYS = agrosys_runtime.USUARIO_AGROSYS
    SENHA_AGROSYS = agrosys_runtime.SENHA_AGROSYS
    PASTA_HTML = agrosys_runtime.PASTA_HTML
    AgrosysEngine = agrosys_engine.AgrosysEngine
    RAIZ = raiz


# ----------------------------------------------------------------------
# Configuração do relatório
# ----------------------------------------------------------------------
CAMINHO_RELATORIO = "/webpro/webprod/wpf530d9"
MENU = 17175
MODULO = "17000"
UNIDADE = "52"

TABELA = "acerto_lote_resultado_geral"
RELATORIO = "Acerto Lote (Resultado Geral)"

PASTA_TEMP = (
    Path(tempfile.gettempdir())
    / "BI_Granja"
    / "Zootecnico"
    / "Acerto_Lote_Resultado_Geral"
)
PASTA_TEMP.mkdir(parents=True, exist_ok=True)
INICIO_HISTORICO = date(2023, 1, 1)
ESTADO_PADRAO = PASTA_ROBO / f"acerto_lote_checkpoint_unidade_{UNIDADE}.json"


def log(msg, nivel="INFO"):
    print(
        f"[{datetime.now():%d/%m/%Y %H:%M:%S}] "
        f"[{nivel}] {msg}",
        flush=True,
    )


# ----------------------------------------------------------------------
# Argumentos - mesmo padrão do Matrizes
# ----------------------------------------------------------------------
def argumentos(argv=None):
    p = argparse.ArgumentParser()

    p.add_argument(
        "--manter-excel",
        action="store_true",
        help="Mantém o Excel baixado após a importação.",
    )

    # Nomes iguais ao robô Matrizes.
    # --inicio/--fim são aliases para manter compatibilidade com o
    # atualizar_zootecnico.py existente.
    p.add_argument(
        "--data-inicial",
        "--inicio",
        dest="data_inicial",
        default=None,
        help="Opcional. Use junto com --data-final. Formato DD/MM/AAAA.",
    )
    p.add_argument(
        "--data-final",
        "--fim",
        dest="data_final",
        default=None,
        help="Opcional. Use junto com --data-inicial. Formato DD/MM/AAAA.",
    )

    # Aceito para compatibilidade com chamadas antigas.
    p.add_argument(
        "--sem-pausa",
        action="store_true",
        help=argparse.SUPPRESS,
    )

    p.add_argument(
        "--validar-excel",
        type=Path,
        default=None,
        help="Somente valida um Excel existente; não acessa Agrosys nem banco.",
    )
    p.add_argument("--estado", type=Path, default=ESTADO_PADRAO,
                   help="Arquivo persistente de progresso; mantenha o mesmo nas execuções.")
    p.add_argument("--planejar", action="store_true",
                   help="Lista períodos pendentes sem acessar Agrosys/banco nem alterar progresso.")
    p.add_argument("--reconciliar-historico", action="store_true",
                   help="Reconsulta todos os meses desde 2023, inclusive os já confirmados.")
    p.add_argument("--revalidar-dias", type=int, default=7,
                   help="Reconsulta meses antigos após este número de dias (padrão: 7).")
    p.add_argument("--dias-por-exportacao", type=int, default=7,
                   help="Máximo de dias por Excel, entre 1 e 31 (padrão: 7).")
    p.add_argument("--tentativas", type=int, default=3,
                   help="Tentativas de cada exportação/carga, entre 1 e 5 (padrão: 3).")
    a = p.parse_args(argv)
    if a.revalidar_dias < 1 or not 1 <= a.dias_por_exportacao <= 31 or not 1 <= a.tentativas <= 5:
        p.error("revalidar-dias deve ser positivo; dias-por-exportacao 1..31; tentativas 1..5.")
    return a


# ----------------------------------------------------------------------
# Períodos - igual ao Matrizes
# ----------------------------------------------------------------------
def dividir_intervalo(inicio, fim, dias=None):
    """Partes contíguas, inclusivas, sem dias omitidos ou sobrepostos."""
    atual = inicio
    while atual <= fim:
        proximo_mes = (atual.replace(day=28) + timedelta(days=4)).replace(day=1)
        limite = min(fim, proximo_mes - timedelta(days=1))
        if dias is not None:
            limite = min(limite, atual + timedelta(days=dias - 1))
        yield atual, limite
        atual = limite + timedelta(days=1)


def carregar_estado(caminho):
    if not caminho.exists():
        return {"versao":1, "unidade":UNIDADE, "tabela":TABELA, "periodos":{}}
    estado = json.loads(caminho.read_text(encoding="utf-8"))
    if (estado.get("versao") != 1 or estado.get("unidade") != UNIDADE or
            estado.get("tabela") != TABELA or not isinstance(estado.get("periodos"), dict)):
        raise ValueError("Checkpoint incompatível; use o arquivo correspondente à unidade/tabela.")
    return estado


def salvar_estado(caminho, estado):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    fd, temporario = tempfile.mkstemp(prefix=caminho.name + ".", suffix=".tmp", dir=caminho.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(estado, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporario, caminho)
    finally:
        if os.path.exists(temporario):
            os.unlink(temporario)


@contextmanager
def trava_execucao(caminho):
    """Lock do sistema operacional: liberado também quando o processo termina."""
    caminho.parent.mkdir(parents=True, exist_ok=True)
    with caminho.open("a+b") as stream:
        stream.seek(0, os.SEEK_END)
        if stream.tell() == 0:
            stream.write(b"0")
            stream.flush()
        stream.seek(0)
        try:
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as exc:
            raise RuntimeError("Outro processo já está usando este checkpoint.") from exc
        try:
            yield
        finally:
            stream.seek(0)
            if os.name == "nt":
                msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(stream, fcntl.LOCK_UN)


def listar_periodos(a, estado=None, hoje=None):
    hoje = hoje or datetime.now(timezone(timedelta(hours=-3))).date()
    estado = estado if estado is not None else carregar_estado(a.estado)
    manual = bool(a.data_inicial or a.data_final)
    ini, fim = INICIO_HISTORICO, hoje
    if manual:
        if not (a.data_inicial and a.data_final):
            raise RuntimeError(
                "Para período manual, informe --data-inicial e --data-final juntos."
            )

        ini = datetime.strptime(
            a.data_inicial,
            "%d/%m/%Y",
        ).date()

        fim = datetime.strptime(
            a.data_final,
            "%d/%m/%Y",
        ).date()

        if ini > fim:
            raise RuntimeError(
                "A data inicial não pode ser maior que a data final."
            )

    if ini < INICIO_HISTORICO or fim > hoje:
        raise ValueError("O intervalo deve estar entre 01/01/2023 e hoje.")
    recente = (hoje.replace(day=1) - timedelta(days=1)).replace(day=1)
    periodos=[]
    for inicio, final in dividir_intervalo(ini, fim):
        chave = inicio.strftime("%Y-%m")
        registro = estado["periodos"].get(chave, {})
        completo = (registro.get("status") == "confirmado" and registro.get("completo") is True
                    and registro.get("inicio") == inicio.isoformat() and registro.get("fim") == final.isoformat())
        try:
            dias = (hoje - datetime.fromisoformat(registro["conferido_em"]).date()).days
        except (KeyError, TypeError, ValueError):
            dias = a.revalidar_dias
        motivo = ("manual" if manual else "reconciliação solicitada" if a.reconciliar_historico
                  else "pendente" if not completo else "atualização recente" if inicio >= recente
                  else "reconciliação periódica" if dias >= a.revalidar_dias else None)
        if motivo:
            periodos.append({"chave":chave,"nome":f"{chave} ({motivo})","inicio":inicio,"fim":final})
    return periodos


# ----------------------------------------------------------------------
# Sessão Agrosys - criada uma vez por execução
# ----------------------------------------------------------------------
def criar_agrosys():
    carregar_runtime()
    ag = AgrosysEngine(
        base_url=BASE_AGROSYS,
        usuario=USUARIO_AGROSYS,
        senha=SENHA_AGROSYS,
        pasta_html=PASTA_HTML,
    )

    ag.login()
    return ag


# ----------------------------------------------------------------------
# Extrator já existente do Acerto Lote
# ----------------------------------------------------------------------
def carregar_extrator():
    carregar_runtime()
    caminho = (
        RAIZ
        / "Indice Zootecnico"
        / "acerto_lote_resultado_geral.py"
    )

    if not caminho.exists():
        raise RuntimeError(
            f"Extrator original não encontrado: {caminho}"
        )

    spec = importlib.util.spec_from_file_location(
        "extrator_acerto_lote_resultado_geral",
        caminho,
    )

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    # Usa a mesma configuração central da sessão atual.
    module.BASE_AGROSYS = BASE_AGROSYS
    module.USUARIO_AGROSYS = USUARIO_AGROSYS

    return module




def clean_col_name(value) -> str:
    if value is None:
        return ""

    try:
        if pd.isna(value):
            return ""
    except Exception:
        pass

    text = str(value)
    text = re.sub(r"_x000d_", " ", text, flags=re.IGNORECASE)
    text = text.replace("\n", " ")
    text = text.replace("\r", " ")
    text = re.sub(r"\s+", " ", text)

    return text.strip()

def strip_accents(text: str) -> str:
    return "".join(
        char
        for char in unicodedata.normalize(
            "NFKD",
            str(text),
        )
        if not unicodedata.combining(char)
    )

def header_key(text: str) -> str:
    text = strip_accents(
        clean_col_name(text)
    ).lower()

    text = re.sub(
        r"[^a-z0-9]+",
        " ",
        text,
    )

    return re.sub(
        r"\s+",
        " ",
        text,
    ).strip()

def make_unique_columns(columns):
    used = {}
    result = []

    for index, column in enumerate(columns):
        name = clean_col_name(column)

        if (
            not name
            or name.lower().startswith("unnamed")
        ):
            name = f"coluna_{index}"

        quantity = used.get(name, 0)

        if quantity:
            final_name = f"{name}.{quantity}"
        else:
            final_name = name

        result.append(final_name)
        used[name] = quantity + 1

    return result

def normalize_text(series: pd.Series) -> pd.Series:
    result = (
        series.astype("string")
        .str.replace(r"_x000d_", " ", regex=True, flags=re.IGNORECASE)
        .str.replace("\n", " ", regex=False)
        .str.replace("\r", " ", regex=False)
        .str.replace(r"\s+", " ", regex=True)
        .str.strip()
    )

    return result.replace(
        {
            "nan": pd.NA,
            "NaT": pd.NA,
            "None": pd.NA,
            "<NA>": pd.NA,
            "": pd.NA,
        }
    )

def to_numeric_ptbr(series: pd.Series) -> pd.Series:
    def parse_one(value):
        if value is None:
            return None

        try:
            if pd.isna(value):
                return None
        except Exception:
            pass

        if isinstance(value, bool):
            return None

        if isinstance(value, (int, float)):
            return float(value)

        text = str(value).strip()

        if text in {
            "",
            "-",
            "nan",
            "None",
            "NaT",
            "<NA>",
        }:
            return None

        negative_end = text.endswith("-")
        negative_parentheses = (
            text.startswith("(")
            and text.endswith(")")
        )

        if negative_end:
            text = text[:-1].strip()

        if negative_parentheses:
            text = text[1:-1].strip()

        text = (
            text.replace("R$", "")
            .replace("%", "")
            .replace("\xa0", " ")
            .strip()
        )

        text = re.sub(
            r"[^0-9,.\-]",
            "",
            text,
        )

        if not text:
            return None

        # PT-BR: 1.234,56
        if "," in text:
            text = (
                text.replace(".", "")
                .replace(",", ".")
            )

        try:
            number = float(text)
        except Exception:
            return None

        if negative_end or negative_parentheses:
            number = -abs(number)

        return number

    return series.apply(
        parse_one
    ).astype("float64")

def parse_known_dates(series: pd.Series) -> pd.Series:
    output = pd.Series(
        pd.NaT,
        index=series.index,
        dtype="datetime64[ns]",
    )

    if pd.api.types.is_datetime64_any_dtype(series):
        return pd.to_datetime(
            series,
            errors="coerce",
        )

    numeric = pd.to_numeric(
        series,
        errors="coerce",
    )

    numeric_mask = (
        numeric.notna()
        & numeric.between(1, 100000)
    )

    if numeric_mask.any():
        output.loc[numeric_mask] = pd.to_datetime(
            numeric.loc[numeric_mask],
            unit="D",
            origin="1899-12-30",
            errors="coerce",
        )

    text_mask = ~numeric_mask

    if text_mask.any():
        output.loc[text_mask] = pd.to_datetime(
            series.loc[text_mask],
            errors="coerce",
            dayfirst=True,
        )

    return output

def extrair_periodo_nome(caminho_arquivo: Path):
    """
    Exemplo:
    Base_Dados_Dinamica_01-09-2026_09-09-2026.xlsx
    """
    datas = re.findall(
        r"(\d{2}-\d{2}-\d{4})",
        caminho_arquivo.name,
    )

    if len(datas) < 2:
        return pd.NaT, pd.NaT

    try:
        inicio = pd.Timestamp(
            datetime.strptime(
                datas[0],
                "%d-%m-%Y",
            )
        )

        fim = pd.Timestamp(
            datetime.strptime(
                datas[1],
                "%d-%m-%Y",
            )
        )

        return inicio, fim

    except Exception:
        return pd.NaT, pd.NaT

def ler_acerto_lote(arquivo: Path, permitir_vazio=False) -> pd.DataFrame:
    engine = "openpyxl" if arquivo.suffix.lower() != ".xls" else None
    preview = pd.read_excel(arquivo, header=None, nrows=100, dtype=object, engine=engine)
    obrigatorias = {"codigo", "integrado", "gal", "lote", "dt aloj", "data abate", "iep"}
    linha = next((i for i in range(len(preview)) if obrigatorias.issubset(
        {header_key(v) for v in preview.iloc[i]})), None)
    if linha is None:
        raise ValueError(f"Cabeçalho do Acerto Lote não encontrado: {arquivo.name}")
    df = pd.read_excel(arquivo, header=linha, dtype=object, engine=engine)
    df.columns = make_unique_columns(df.columns.tolist())
    mapa = {header_key(c): c for c in df.columns}
    # Totais/médias marcam o fim da tabela; resumos posteriores ficam fora.
    fim = df.iloc[:, 0].map(header_key).str.match(r"^(totais|total|minima|maxima)(?: |$)", na=False)
    if fim.any():
        limite = int(fim.to_numpy().nonzero()[0][0])
        posteriores = df.iloc[limite + 1:]
        if parse_known_dates(posteriores[mapa["data abate"]]).notna().any():
            raise ValueError("Há lotes após o primeiro total; revisar o relatório antes de cortar linhas.")
        df = df.iloc[:limite].copy()
    df = df.dropna(how="all")
    df = df.loc[~df[mapa["codigo"]].map(header_key).eq("codigo")].copy()
    if df.empty and not permitir_vazio:
        raise ValueError(f"Nenhum registro analítico em {arquivo.name}")
    textos = {"codigo", "integrado", "local", "tecnico", "assist", "planta alimento",
              "acerto manual", "gal", "lote", "sx", "linh", "forneced",
              "mao de obra", "composicao lote qtde idd"}
    for coluna in df.columns:
        chave = header_key(coluna)
        original = df[coluna]
        preenchido = normalize_text(original).notna()
        if chave in textos:
            df[coluna] = normalize_text(original)
            if chave in {"codigo", "gal", "lote"}:
                df[coluna] = df[coluna].str.replace(r"^(\d+)\.0+$", r"\1", regex=True)
        elif chave in {"dt aloj", "data abate"}:
            df[coluna] = parse_known_dates(original)
            if (preenchido & df[coluna].isna()).any():
                raise ValueError(f"Data inválida em {coluna}: {arquivo.name}")
        else:
            # Medidas numéricas; percentuais mantêm a escala original.
            df[coluna] = to_numeric_ptbr(original)
            ausente = normalize_text(original).isin(["-"])
            if (preenchido & ~ausente & df[coluna].isna()).any():
                raise ValueError(f"Valor não numérico em {coluna}: {arquivo.name}")
    chave = [mapa[k] for k in ("codigo", "gal", "lote", "dt aloj", "data abate")]
    if df[chave].isna().any(axis=None):
        raise ValueError(f"Identificação incompleta de lote: {arquivo.name}")
    if df.duplicated(subset=chave).any():
        raise ValueError(f"Chave repetida no Excel; revisar granularidade: {arquivo.name}")
    inicio, fim = extrair_periodo_nome(arquivo)
    if pd.isna(inicio) or pd.isna(fim):
        for i in range(len(preview)-1):
            campos = [header_key(v) for v in preview.iloc[i]]
            if "data inicial" in campos and "data final" in campos:
                vals = preview.iloc[i+1]
                inicio = parse_known_dates(pd.Series([vals.iloc[campos.index("data inicial")]])).iloc[0]
                fim = parse_known_dates(pd.Series([vals.iloc[campos.index("data final")]])).iloc[0]
                break
    unidade = re.search(r"unidade_(\d+)(?:_|$)", arquivo.stem, re.I)
    # Pasta configurada corresponde à unidade 52; nomes do robô informam unidade.
    df["Unidade_Extracao"] = unidade.group(1) if unidade else "52"
    df["Arquivo_Origem"] = arquivo.name
    df["Periodo_Arquivo_Inicio"] = inicio
    df["Periodo_Arquivo_Fim"] = fim
    df["_Arquivo_Modificado_Em"] = datetime.fromtimestamp(arquivo.stat().st_mtime)
    print(f"  Cabeçalho: linha {linha+1} | Analíticas: {len(df):,} | Colunas originais: {len(df.columns)-5}")
    return df.reset_index(drop=True)

def identidade_lote(row, mapa):
    valores=[str(row['Unidade_Extracao'])]+[str(row[mapa[k]]) for k in ('codigo','gal','lote')]
    valores += [pd.Timestamp(row[mapa[k]]).date().isoformat() for k in ('dt aloj','data abate')]
    return hashlib.sha256(json.dumps(valores,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()

def valor_banco(valor):
    if pd.isna(valor): return None
    if isinstance(valor,pd.Timestamp): return valor.to_pydatetime()
    if hasattr(valor,'item'): return valor.item()
    return valor

def preparar_dados(df, biblioteca, inicio, fim, origem):
    meta={'Unidade_Extracao','Arquivo_Origem','Periodo_Arquivo_Inicio','Periodo_Arquivo_Fim','_Arquivo_Modificado_Em'}
    originais=[c for c in df.columns if c not in meta]
    nomes=biblioteca.nomes_unicos(originais)
    fixas={'chave_lote','hash_linha','periodo_inicio','periodo_fim','unidade_extracao','origem_arquivo','carregado_em'}
    if len(set(nomes))!=len(nomes) or fixas.intersection(nomes):
        raise ValueError('Colisão de nomes de colunas; carga interrompida.')
    tipos=['TIMESTAMP' if pd.api.types.is_datetime64_any_dtype(df[c]) else
           'DOUBLE PRECISION' if pd.api.types.is_numeric_dtype(df[c]) else 'TEXT' for c in originais]
    mapa={header_key(c):c for c in originais}
    linhas=[]
    for _,row in df.iterrows():
        valores=[valor_banco(row[c]) for c in originais]
        digest=hashlib.sha256(json.dumps(valores,default=str,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
        linhas.append([identidade_lote(row,mapa),digest,inicio,fim,str(row['Unidade_Extracao']),origem]+valores)
    return nomes,tipos,linhas


def validar_intervalo_abate(df, inicio, fim):
    mapa={header_key(c):c for c in df.columns}
    dias=df[mapa["data abate"]].dt.date
    if dias.isna().any() or ((dias < inicio) | (dias > fim)).any():
        raise ValueError("O Excel contém data de abate fora do intervalo solicitado. Nenhuma carga executada.")
    if not df["Unidade_Extracao"].astype(str).eq(UNIDADE).all():
        raise ValueError("Unidade do Excel diferente da unidade configurada.")


def conferir_gravacao(cur, destino, linhas, sql):
    """Confere todas as identidades e hashes dentro da transação do UPSERT."""
    esperado={row[0]:row[1] for row in linhas}
    if len(esperado) != len(linhas):
        raise ValueError("Identidades de lote repetidas na carga.")
    chaves=list(esperado)
    for inicio in range(0, len(chaves), 1000):
        parte=chaves[inicio:inicio+1000]
        cur.execute(sql.SQL("SELECT chave_lote, hash_linha FROM {} WHERE chave_lote IN ({})").format(
            destino, sql.SQL(", ").join(sql.Placeholder() for _ in parte)), parte)
        recebido={str(k).strip():str(h).strip() for k,h in cur.fetchall()}
        if recebido != {k:esperado[k] for k in parte}:
            raise RuntimeError("Conferência Excel/PostgreSQL falhou: chave ausente ou hash divergente. Carga revertida.")
    digest=hashlib.sha256(json.dumps(sorted(esperado.items()),separators=(',',':')).encode()).hexdigest()
    return {"registros":len(linhas),"hash_conjunto":digest}

def gravar_banco(df,inicio,fim,origem):
    # Importações da pasta deste arquivo; usa configuração existente sem editá-la.
    sys.path.insert(0,str(Path(__file__).resolve().parent))
    import banco_zootecnico as banco
    from psycopg2 import sql
    from psycopg2.extras import execute_batch
    nomes,tipos,linhas=preparar_dados(df,banco,inicio,fim,origem)
    conn=banco.conectar()
    if conn.autocommit:
        conn.autocommit=False
    carga=None
    confirmado=False
    try:
        carga=banco.iniciar_carga(conn,RELATORIO,TABELA,inicio,fim)
        with conn.cursor() as cur:
            cur.execute('SELECT pg_advisory_xact_lock(hashtext(%s))',(f'{banco.SCHEMA_DADOS}.{TABELA}',))
            destino=sql.SQL('{}.{}').format(sql.Identifier(banco.SCHEMA_DADOS),sql.Identifier(TABELA))
            cur.execute(sql.SQL('CREATE TABLE IF NOT EXISTS {} (chave_lote CHAR(64) PRIMARY KEY, hash_linha CHAR(64) NOT NULL, periodo_inicio DATE NOT NULL, periodo_fim DATE NOT NULL, unidade_extracao TEXT NOT NULL, origem_arquivo TEXT, carregado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)').format(destino))
            for nome,tipo in zip(nomes,tipos):
                cur.execute(sql.SQL('ALTER TABLE {} ADD COLUMN IF NOT EXISTS {} {}').format(destino,sql.Identifier(nome),sql.SQL(tipo)))
            colunas=['chave_lote','hash_linha','periodo_inicio','periodo_fim','unidade_extracao','origem_arquivo']+nomes
            atualizacoes=sql.SQL(', ').join(sql.SQL('{} = EXCLUDED.{}').format(sql.Identifier(c),sql.Identifier(c)) for c in colunas if c!='chave_lote')
            consulta=sql.SQL('INSERT INTO {} ({}) VALUES ({}) ON CONFLICT (chave_lote) DO UPDATE SET {}, carregado_em=CURRENT_TIMESTAMP').format(
                destino,sql.SQL(', ').join(map(sql.Identifier,colunas)),
                sql.SQL(', ').join(sql.Placeholder() for _ in colunas),atualizacoes)
            execute_batch(cur,consulta,linhas,page_size=1000)
            recibo=conferir_gravacao(cur,destino,linhas,sql)
        conn.commit()
        confirmado=True
        banco.finalizar_carga(conn,carga,'SUCESSO',len(linhas),f'UPSERT Acerto Lote: {len(linhas)} registros.','')
        log(f'Tabela: {banco.SCHEMA_DADOS}.{TABELA} | Registros enviados: {len(linhas):,}')
        return recibo
    except Exception as exc:
        conn.rollback()
        if carga is not None and not confirmado:
            try: banco.finalizar_carga(conn,carga,'ERRO',0,'Carga revertida.',str(exc))
            except Exception: pass
        if confirmado:
            log('Dados confirmados no banco; falha posterior ao atualizar controle da carga. Reexecução é idempotente.')
        raise
    finally: conn.close()



# ----------------------------------------------------------------------
# Extração do período
# ----------------------------------------------------------------------
def extrair_periodo(
    ag,
    extrator,
    inicio: date,
    fim: date,
    pasta: Path,
):
    """
    Usa a MESMA sessão Agrosys da execução inteira.
    O Selenium é usado somente para executar o fexcel() oficial.
    """
    extrator.PASTA_DOWNLOAD = pasta
    extrator.SOBRESCREVER = True

    log(
        f"Disparando {CAMINHO_RELATORIO} | "
        f"Unidade {UNIDADE} | "
        f"{inicio:%d/%m/%Y} até {fim:%d/%m/%Y}"
    )

    _, processo = ag.executar_relatorio(
        caminho=CAMINHO_RELATORIO,
        menu=MENU,
        unidade=UNIDADE,
        modulo=MODULO,
        filtros=extrator.payload(
            inicio,
            fim,
        ),
        nome_debug=(
            f"acerto_lote_banco_"
            f"{inicio:%d-%m-%Y}_"
            f"{fim:%d-%m-%Y}"
        ),
    )

    if not processo or int(processo) <= 0:
        raise RuntimeError(
            "O Agrosys não retornou um processo válido."
        )

    processo = str(int(processo))

    log(
        f"Processo criado: {processo}"
    )

    url = (
        f"{BASE_AGROSYS}/sistema/reports/"
        f"{USUARIO_AGROSYS}-{int(processo):010d}.php"
    )

    arquivo = (
        pasta
        / (
            f"acerto_lote_resultado_geral_"
            f"unidade_{UNIDADE}_"
            f"{inicio:%d-%m-%Y}_"
            f"ate_{fim:%d-%m-%Y}.xlsx"
        )
    )

    driver = None

    try:
        driver = extrator.criar_driver()

        extrator.copiar_cookies_para_selenium(
            driver,
            ag,
        )

        extrator.baixar_excel_oficial(
            driver,
            url,
            arquivo,
        )

        if not arquivo.exists():
            raise RuntimeError(
                f"Excel não foi criado: {arquivo}"
            )

        log(
            f"Excel recebido: {arquivo.name} | "
            f"{arquivo.stat().st_size:,} bytes"
        )

        return arquivo

    finally:
        if driver is not None:
            try:
                driver.quit()
            except Exception:
                pass


# ----------------------------------------------------------------------
# Processamento de um alvo/período - mesma ideia do Matrizes
# ----------------------------------------------------------------------
def processar_alvo(
    ag,
    extrator,
    periodo_nome: str,
    periodo_inicio: date,
    periodo_fim: date,
    manter_excel=False,
):
    log("=" * 90)
    log(
        f"ZOOTÉCNICO | UNIDADE {UNIDADE} | "
        f"{RELATORIO}"
    )
    log(
        f"{periodo_nome}: "
        f"{periodo_inicio:%d/%m/%Y} até "
        f"{periodo_fim:%d/%m/%Y}"
    )
    log("=" * 90)

    # A pasta temporária é exclusiva deste período.
    with tempfile.TemporaryDirectory(
        prefix="acerto_lote_banco_"
    ) as tmp:
        pasta = Path(tmp)

        arquivo = None
        try:
            arquivo = extrair_periodo(
                ag=ag,
                extrator=extrator,
                inicio=periodo_inicio,
                fim=periodo_fim,
                pasta=pasta,
            )

            df = ler_acerto_lote(arquivo, permitir_vazio=True)
            validar_intervalo_abate(df, periodo_inicio, periodo_fim)
            if df.empty:
                log("Excel com cabeçalho válido e sem lotes no intervalo; carga zero será registrada.")

            log(f"Tratamento concluído | {len(df):,} registro(s)")

            recibo=gravar_banco(df, periodo_inicio, periodo_fim, arquivo.name)
            recibo.update({"inicio":periodo_inicio.isoformat(),"fim":periodo_fim.isoformat(),
                           "arquivo":arquivo.name,"excel_sha256":hashlib.sha256(arquivo.read_bytes()).hexdigest()})
        except Exception:
            # Mantém evidência de falhas mesmo depois da limpeza da pasta temporária.
            falhas_dir=PASTA_ROBO / "acerto_lote_falhas"
            for evidencia in pasta.glob("*.xlsx"):
                falhas_dir.mkdir(parents=True,exist_ok=True)
                destino=falhas_dir / f"{datetime.now():%Y%m%d_%H%M%S_%f}_{evidencia.name}"
                destino.write_bytes(evidencia.read_bytes())
                log(f"Excel da falha preservado: {destino}","ERRO")
            raise

        if manter_excel:
            destino = (
                PASTA_TEMP
                / arquivo.name
            )

            if destino.exists():
                destino.unlink()

            destino.write_bytes(
                arquivo.read_bytes()
            )

            log(
                f"Excel mantido em: {destino}"
            )

        log(
            f"SUCESSO: {len(df):,} registros "
            f"carregados/atualizados em "
            f"zootecnico.{TABELA}."
        )

        return recibo


# ----------------------------------------------------------------------
# Main - igual ao padrão Matrizes: período x alvo, acumula falhas
# ----------------------------------------------------------------------
def executar_periodos(a, estado, periodos):
    ag = criar_agrosys()
    extrator = carregar_extrator()
    total, falhas = 0, []
    for periodo in periodos:
        recibos=[]
        try:
            for inicio, fim in dividir_intervalo(periodo["inicio"], periodo["fim"], a.dias_por_exportacao):
                for tentativa in range(1, a.tentativas + 1):
                    try:
                        if tentativa > 1:
                            ag.login()
                        recibo=processar_alvo(ag, extrator, periodo["nome"], inicio, fim, a.manter_excel)
                        recibos.append(recibo)
                        total += recibo["registros"]
                        break
                    except Exception:
                        log(f"Falha em {inicio:%d/%m/%Y} a {fim:%d/%m/%Y}: tentativa {tentativa}/{a.tentativas}.","ERRO")
                        if tentativa == a.tentativas:
                            raise
            inicio, fim = periodo["inicio"], periodo["fim"]
            registro={"status":"confirmado","inicio":inicio.isoformat(),"fim":fim.isoformat(),
                      "completo":inicio.day==1 and (fim+timedelta(days=1)).day==1,
                      "conferido_em":datetime.now(timezone.utc).isoformat(),
                      "registros":sum(r["registros"] for r in recibos),"exportacoes":recibos}
            estado["periodos"][periodo["chave"]]=registro
            salvar_estado(a.estado, estado)
            log(f"Checkpoint confirmado: {periodo['chave']} | {registro['registros']:,} registros.")
        except Exception as exc:
            # Um mês parcialmente gravado permanece pendente; reexecutar é idempotente.
            estado["periodos"][periodo["chave"]]={"status":"erro","inicio":periodo["inicio"].isoformat(),
                "fim":periodo["fim"].isoformat(),"completo":False,"exportacoes_confirmadas":recibos,
                "tentado_em":datetime.now(timezone.utc).isoformat(),"erro":f"{type(exc).__name__}: {exc}"}
            salvar_estado(a.estado, estado)
            falhas.append(f"{periodo['nome']} | Unidade {UNIDADE}: {type(exc).__name__}: {exc}")
            log(falhas[-1],"ERRO")
            traceback.print_exc()
    log(f"FINALIZADO | Registros carregados/atualizados: {total:,} | Meses com falha: {len(falhas)}")
    return 1 if falhas else 0


def main(argv=None):
    a = argumentos(argv)

    if a.validar_excel:
        df = ler_acerto_lote(
            a.validar_excel
        )

        log(
            f"Excel validado: {len(df):,} registros, "
            f"{len(df.columns)-5} colunas originais. "
            "Nenhuma carga executada."
        )

        return 0

    estado = carregar_estado(a.estado)
    periodos = listar_periodos(a, estado)

    log("=" * 90)
    log(
        "PERÍODOS DO ACERTO LOTE: "
        + " | ".join(
            f"{p['nome']} "
            f"{p['inicio']:%d/%m/%Y} a "
            f"{p['fim']:%d/%m/%Y}"
            for p in periodos
        )
    )
    log(
        f"Total previsto: {len(periodos)} período(s) "
        f"| Cada Excel cobre no máximo {a.dias_por_exportacao} dia(s)."
    )
    log(
        f"Tabela destino: zootecnico.{TABELA}"
    )

    if a.planejar:
        log("Somente planejamento. Nenhuma conexão ou alteração de checkpoint realizada.")
        return 0
    with trava_execucao(a.estado.with_suffix(a.estado.suffix + ".lock")):
        # Relê sob lock para não usar progresso desatualizado de outra execução.
        estado = carregar_estado(a.estado)
        periodos = listar_periodos(a, estado)
        return executar_periodos(a, estado, periodos) if periodos else 0


if __name__ == "__main__":
    sys.exit(main())
