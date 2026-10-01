BIUnavailable.show({ errorId: "erroRxp", bodyId: "tabelaUnidadesAbate", filterFields: [["filtroData","Data"],["filtroUnidade","Unidade"],["filtroProdutor","Produtor"],["filtroGalpao","Galpão"],["filtroTecnico","Técnico"],["filtroTipoGranja","Tipo de Granja"],["filtroModelo","Modelo"]] });
document.getElementById("statusRxp").textContent = "Dados indisponíveis";
["kpiProgramada","kpiReal","kpiDiferenca","kpiRegistros"].forEach(id => document.getElementById(id).textContent = "—");
document.getElementById("periodoRxp").textContent = "Ave Nova e Real Alimentos";
BIUnavailable.formulas({ prefix: "Rxp", catalog: FORMULAS_RXP, attribute: "data-rxp-formula" });

document.getElementById("tabelaUnidadesAbate").innerHTML = ["REAL ALIMENTOS", "AVE NOVA"].map(unit => '<tr class="abate-row"><td>'+unit+'</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td><button class="mini-button" type="button" disabled>Ver produtores</button></td></tr>').join("");
document.getElementById("tabelaUnidadesAbateTotal").innerHTML = '<tr><td>Total</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td><button class="mini-button" type="button" disabled>Ver produtores</button></td></tr>';
