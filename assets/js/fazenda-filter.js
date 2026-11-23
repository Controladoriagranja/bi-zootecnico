/* Fazenda usa codigo como identidade. Compartilhado apenas pelo Desempenho e seus detalhes. */
window.FazendaFilter = Object.freeze({
    field: Object.freeze({id: 'fazenda', apiKey: 'fazenda', search: true, multi: true}),
    rankingParams: Object.freeze({dimensao_produtor: 'fazenda'}),
    label(codigo, integrado) {
        const code = String(codigo ?? '').trim(), name = String(integrado ?? '').trim();
        return code ? `${code} - ${name || 'Integrado não informado'}` : (name || '—');
    },
    ensureOptions(response) {
        if (!Array.isArray(response.fazenda)) throw new Error('Atualize o backend para disponibilizar o filtro Fazenda por código.');
    },
    options(items) {
        return (items || []).filter(item => item && typeof item === 'object' && String(item.valor ?? item.value ?? '').trim())
            .map(item => ({value: String(item.valor ?? item.value), label: String(item.nome ?? item.label ?? item.valor ?? item.value)}));
    },
    restore(controller, params) {
        controller.fields.forEach(field => {
            const values = params.getAll(field.apiKey).filter(Boolean);
            if (values.length) controller.set(field.apiKey, field.multi ? values : values[0]);
        });
    }
});
