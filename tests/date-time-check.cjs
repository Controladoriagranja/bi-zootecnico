const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={window:{},Intl,Date};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/js/date-time.js'),'utf8'),context);
const format=context.window.formatarDataHoraBR;
const cases=[
 ['2026-10-16 14:09:12.860716','16/10/2026 14:09'],
 ['2026-10-20T08:05:59.999999','20/10/2026 08:05'],
 ['2026-10-20T11:05:00Z','20/10/2026 08:05'],
 ['2026-10-20T08:05:00-03:00','20/10/2026 08:05'],
 ['2026-10-20T08:05:00-0300','20/10/2026 08:05'],
 ['2026-10-20T01:30:00+00:00','19/10/2026 22:30'],
 ['2026-10-20T03:00:00Z','20/10/2026 00:00'],
 ['2024-02-29 23:59','29/02/2024 23:59'],
 [new Date('2026-10-20T11:05:00Z'),'20/10/2026 08:05'],
 ...[null,undefined,'','bad','2026-02-29 08:00','2026-04-31 08:00','2026-10-20','2026-10-20 24:00','2026-10-20 08:60','2026-10-20 08:05:60','2026-10-20T08:05:00+25:00',0,new Date(NaN)].map(v=>[v,'—'])
];
for(const tz of ['UTC','America/Sao_Paulo','Asia/Tokyo']){
 process.env.TZ=tz;
 for(const [input,expected] of cases)assert.equal(format(input),expected,`${tz}: ${input}`);
}
console.log(JSON.stringify({cases:cases.length,browserTimezones:3,naivePreserved:true,explicitOffsetsConvertedOnce:true,invalidIsDash:true}));
