/* DMG 2014 encounter estimates. Advisory; adjusted XP is never an award. */
((root)=>{
 'use strict';const thresholds=[null,[25,50,75,100],[50,100,150,200],[75,150,225,400],[125,250,375,500],[250,500,750,1100],[300,600,900,1400],[350,750,1100,1700],[450,900,1400,2100],[550,1100,1600,2400],[600,1200,1900,2800],[800,1600,2400,3600],[1000,2000,3000,4500],[1100,2200,3400,5100],[1250,2500,3800,5700],[1400,2800,4300,6400],[1600,3200,4800,7200],[2000,3900,5900,8800],[2100,4200,6300,9500],[2400,4900,7300,10900],[2800,5700,8500,12700]];
 function difficulty(levels,members){
  if(!Array.isArray(levels)||!levels.length||levels.length>12||levels.some(l=>!Number.isInteger(l)||l<1||l>20)||!Array.isArray(members)||members.some(m=>!Number.isInteger(m.count)||m.count<1||m.count>46||!Number.isInteger(m.xp)||m.xp<0||m.xp>1000000))throw Error('Gültige Gruppenstufen und Gegnerwerte erforderlich.');
  const count=members.reduce((n,m)=>n+m.count,0);if(count>46)throw Error('Maximal 46 Gegner.');
  const xp=members.reduce((n,m)=>n+m.count*m.xp,0),limits=levels.reduce((t,l)=>t.map((n,i)=>n+thresholds[l][i]),[0,0,0,0]);
  const multipliers=[.5,1,1.5,2,2.5,3,4,5];let index=count===1?1:count===2?2:count<=6?3:count<=10?4:count<=14?5:6;index+=levels.length<3?1:levels.length>=6?-1:0;
  const multiplier=count?multipliers[index]:0,adjusted=xp*multiplier;let rank=-1;limits.forEach((n,i)=>{if(adjusted>=n)rank=i;});
  return {xp,adjusted,multiplier,count,thresholds:limits,label:['Unter leicht','Leicht','Mittel','Schwer','Tödlich'][rank+1]};
 }
 const api=Object.freeze({difficulty});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DND.campaignRules=api;
})(globalThis);
