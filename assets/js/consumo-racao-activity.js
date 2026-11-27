/* Mesmo aviso e contador do Zootécnico; cobre também o trabalho local dos filtros. */
window.FeedActivity = (() => {
  const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
  async function run(work){
    const finish=ApiActivity.begin();
    try {
      // Give the shared popup a paint before synchronous aggregation/rendering starts.
      await frame();await frame();
      return await work();
    } finally {
      // Keep the indicator until the updated DOM/chart has had a paint opportunity.
      await frame();finish();
    }
  }
  return Object.freeze({run});
})();
