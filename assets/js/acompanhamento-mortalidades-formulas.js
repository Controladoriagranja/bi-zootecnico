/* Catálogo restrito a esta tela. Reutiliza o modal de fórmulas do portal. */
window.FormulaRegistry=(()=>{
 const base={columns:[],steps:[],rules:[],status:'padronizado'};
 const entries=new Map([
  ['lanc.atraso',{...base,id:'lanc.atraso',title:'DIAS ATRASO MORT.',formula:'IDADE − Idade última mortalidade',description:'Fórmula da célula AJ4: =G4-N4. Usa as idades informadas na fonte, sem substituir IDADE pela data do computador.',columns:['idade_atual','idade_ultima_mortalidade'],steps:['Subtrair a idade da última mortalidade da idade atual.'],rules:['Destacar somente valores maiores que 4 dias, conforme a formatação condicional AJ4:AJ222.','Nulos permanecem sem valor. Não truncar resultados negativos.']}],
  ['lanc.peso',{...base,id:'lanc.peso',title:'STATUS PESO',formula:'=IF(AND([IDD UPS]<35,([IDADE]-[IDD UPS])>8),"PESO ATRASADO","")',description:'Fórmula extraída de AM4. IDD UPS corresponde à idade do último peso. O limite é estritamente menor que 35, e o intervalo é estritamente maior que 8.',columns:['idade_atual','idade_ultimo_peso'],steps:['Confirmar que a idade da última pesagem é menor que 35 dias.','Calcular IDADE − IDD UPS. Se ultrapassar 8 dias, exibir PESO ATRASADO. Caso contrário, deixar vazio.'],rules:['Não filtrar inicialmente por STATUS PESO: exibir todos os registros.','Se faltar alguma idade na fonte real, apresentar —; não converter ausência em zero.']}]
 ]);
 return {get:id=>entries.get(id),reportEntries:()=>[...entries.values()],mounts:()=>[],entries};
})();
