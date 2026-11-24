/* Catálogo restrito a esta tela. Reutiliza o modal de fórmulas do portal. */
window.FormulaRegistry=(()=>{
 const base={columns:[],steps:[],rules:[],status:'padronizado'};
 const entries=new Map([
  ['lanc.atraso',{...base,id:'lanc.atraso',title:'DIAS ATRASO MORT.',formula:'IDADE − Idade última mortalidade',description:'Fórmula da célula AJ4: =G4-N4. Usa as idades informadas na fonte, sem substituir IDADE pela data do computador.',columns:['idade_atual','idade_ultima_mortalidade'],steps:['Subtrair a idade da última mortalidade da idade atual.'],rules:['Destacar somente valores maiores que 4 dias, conforme a formatação condicional AJ4:AJ222.','Nulos permanecem sem valor. Não truncar resultados negativos.']}],
  ['lanc.glp',{...base,id:'lanc.glp',title:'GLP',formula:'=Tabela2[[#This Row],[GALPAO]]',description:'Repete o GALPAO da mesma linha. Não representa outro galpão.',columns:['galpao'],steps:['Exibir novamente o galpão do registro.']}],
  ['lanc.tec',{...base,id:'lanc.tec',title:'TÉC',formula:'=Tabela2[[#This Row],[TÉCNICO]]',description:'Repete o TÉCNICO da mesma linha, sem vínculo adicional.',columns:['tecnico'],steps:['Exibir novamente o técnico do registro.']}],
  ['lanc.peso',{...base,id:'lanc.peso',title:'STATUS PESO',formula:'=IF(AND([IDD UPS]<35,([IDADE]-[IDD UPS])>8),"PESO ATRASADO","")',description:'Fórmula extraída de AM4. IDD UPS corresponde à idade do último peso. O limite é estritamente menor que 35, e o intervalo é estritamente maior que 8.',columns:['idade_atual','idade_ultimo_peso'],steps:['Confirmar que a idade da última pesagem é menor que 35 dias.','Calcular IDADE − IDD UPS. Se ultrapassar 8 dias, exibir PESO ATRASADO. Caso contrário, deixar vazio.'],rules:['Não filtrar inicialmente por STATUS PESO: exibir todos os registros.','Se faltar alguma idade na fonte real, apresentar —; não converter ausência em zero.']}]
 ]);
 return {get:id=>entries.get(id),reportEntries:()=>[...entries.values()],mounts:()=>[],entries};
})();
