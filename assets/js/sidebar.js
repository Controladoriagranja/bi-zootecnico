/**
 * MAPA DE FÓRMULAS: ./FORMULAS.md
 * Navegação, sem fórmulas de indicadores.
 */
(() => {
    const current = document.body.dataset.page || "";

    const items = [
        { id: "desempenho", label: "Desempenho Lotes Fechados", href: "index.html" },
        { id: "gpd-fases", label: "GPD por Fase", href: "gpd-por-fase.html" },
        { id: "lotes", label: "Lotes em Criação", href: "lotes.html" },
        { id: "historico", label: "Histórico de Lotes em Criação", href: "historico.html" },
        { id: "diferenca-abate", label: "Diferença de Aves Abatidas", href: "diferenca-aves-abatidas.html" },
        { id: "formulas", label: "Fórmulas", href: "formulas.html" }
    ];

    const root = document.createElement("div");
    root.className = "side-nav-root";
    root.innerHTML = `
        <button class="side-nav-rail" type="button" aria-label="Abrir menu" aria-expanded="false">
            <span class="side-nav-hamburger" aria-hidden="true"><i></i><i></i><i></i></span>
        </button>
        <div class="side-nav-overlay" aria-hidden="true"></div>
        <aside class="side-nav-panel" aria-label="Navegação principal" aria-hidden="true">
            <div class="side-nav-brand">
                <div class="side-nav-panel-head">
                    <img src="assets/img/logo-granja-brasilia-branca.png" alt="Granja Brasília" class="side-nav-logo">
                    <button class="side-nav-close" type="button" aria-label="Fechar menu">×</button>
                </div>
                <div class="side-nav-section-title">RELATÓRIO ZOOTÉCNICO</div>
            </div>
            <nav class="side-nav-links">
                ${items.map(item => `
                    <a class="side-nav-link ${current === item.id ? "active" : ""}" href="${item.href}" ${current === item.id ? 'aria-current="page"' : ""}>
                        <span>${item.label}</span>
                    </a>
                `).join("")}
            </nav><nav class="pcp-support-nav" aria-label="Suporte Zootécnico"><a class="side-nav-help-link" href="ajuda.html">Ajuda</a></nav>
        </aside>
    `;

    document.body.classList.add("has-side-nav");
    document.body.prepend(root);
    const helpStyle = document.createElement('style');
    helpStyle.textContent = `.side-nav-panel{display:flex;flex-direction:column}.side-nav-panel .pcp-support-nav{display:block;margin-top:auto;padding:14px 0 4px;border-top:1px solid #ffffff15}.side-nav-panel .side-nav-help-link,.side-nav-panel .side-nav-help-link:visited{display:block;padding:10px 12px;color:#cbb4b3;font:inherit;font-size:12px;text-decoration:none;border-radius:3px}.side-nav-panel .side-nav-help-link:hover,.side-nav-panel .side-nav-help-link:focus-visible{color:#fff;background:#ffffff0d}`;
    document.head.append(helpStyle);


    const rail = root.querySelector(".side-nav-rail");
    const panel = root.querySelector(".side-nav-panel");
    const overlay = root.querySelector(".side-nav-overlay");
    const close = root.querySelector(".side-nav-close");

    const setOpen = open => {
        root.classList.toggle("open", open);
        rail.setAttribute("aria-expanded", String(open));
        panel.setAttribute("aria-hidden", String(!open));
        overlay.setAttribute("aria-hidden", String(!open));
        document.body.classList.toggle("side-nav-open", open);
    };

    rail.addEventListener("click", () => setOpen(true));
    close.addEventListener("click", () => setOpen(false));
    overlay.addEventListener("click", () => setOpen(false));

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && root.classList.contains("open")) {
            setOpen(false);
            rail.focus();
        }
    });
})();
