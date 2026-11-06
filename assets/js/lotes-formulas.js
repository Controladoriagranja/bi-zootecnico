window.buildLotesFormulas=(selected,filtered)=>FormulaRegistry.updateLots(selected,filtered);
window.FORMULAS_LOTES=FormulaRegistry.legacyGroup("lotes").filter(item=>item.id!=="idade_atual");
