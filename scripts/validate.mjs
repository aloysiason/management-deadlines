import fs from 'node:fs';
const items=JSON.parse(fs.readFileSync('public/data/conferences.json','utf8'));
const ids=new Set();
for (const item of items) {
  for(const field of ['id','acronym','name','year','discipline','areas','status','officialUrl']) if(item[field]===undefined) throw new Error(`${item.id||'?'} missing ${field}`);
  if(ids.has(item.id))throw new Error(`Duplicate id: ${item.id}`);ids.add(item.id);
  if(!['management','economics'].includes(item.discipline))throw new Error(`Bad discipline: ${item.id}`);
  if(!['confirmed','confirmed-date-only','pending'].includes(item.status))throw new Error(`Bad status: ${item.id}`);
  if(item.status==='pending'&&item.deadline)throw new Error(`Pending item has deadline: ${item.id}`);
  if(item.status!=='pending'&&!item.deadline)throw new Error(`Confirmed item missing deadline: ${item.id}`);
  if(item.deadline&&!/^\d{4}-\d{2}-\d{2}$/.test(item.deadline))throw new Error(`Bad date: ${item.id}`);
  if(item.deadlineTime&&(!item.timezone||!/^\d{2}:\d{2}$/.test(item.deadlineTime)))throw new Error(`Bad time: ${item.id}`);
  if(!item.officialUrl.startsWith('https://'))throw new Error(`Not HTTPS URL: ${item.id}`);
}
console.log(`Validated ${items.length} conference records.`);
