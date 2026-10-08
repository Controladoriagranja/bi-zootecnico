"""Copia o Worker fornecido pelo usuário e registra erros do encaminhamento privado."""
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path(r'C:\Users\vchaves\.codex\attachments\00fda2bc-11f0-475a-a2b6-4f8eb757546b\Pasted text.txt')
text=SOURCE.read_text(encoding='utf-8').replace('\r\n','\n')
anchor='    let upstream;'
assert text.count(anchor)==1
text=text.replace(anchor,anchor+'''
    const privateStarted = Date.now();
    const privateContext = {
      path: url.pathname,
      ray: request.headers.get("cf-ray") || null,
    };
''',1)
anchor='''    } catch (error) {

      return json(
        {
          detail:
            "API interna indisponível"'''
assert text.count(anchor)==1
replacement='''    } catch (error) {
      // Nunca registra headers, tokens, credenciais ou o corpo da requisição.
      console.error({
        event: "private_api_fetch_failed",
        ...privateContext,
        duration_ms: Date.now() - privateStarted,
        binding_available: typeof env.PRIVATE_API?.fetch === "function",
        error_name: String(error?.name || "Error"),
        error_code: error?.code == null ? null : String(error.code),
        error_message: String(error?.message || "Falha sem mensagem")
          .replace(/(Bearer|Basic)\\s+[^\\s]+/gi, "$1 [REDACTED]")
          .slice(0, 1500),
      });

      return json(
        {
          detail:
            "API interna indisponível"'''
text=text.replace(anchor,replacement,1)
anchor='    const responseHeaders ='
assert text.count(anchor)==1
text=text.replace(anchor,'''    if (upstream.status >= 500) {
      console.error({
        event: "private_api_upstream_error",
        ...privateContext,
        duration_ms: Date.now() - privateStarted,
        upstream_status: upstream.status,
      });
    }

'''+anchor,1)
directory=ROOT/'outputs'/'worker-diagnostico'
directory.mkdir(parents=True,exist_ok=True)
(directory/'worker.js').write_text(text,encoding='utf-8')
print(directory/'worker.js')
