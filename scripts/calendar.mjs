import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('public/data/conferences.json','utf8'));
const safe=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
let lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Management Deadlines//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Management Deadlines'];
for(const c of data.filter(c=>c.deadline)) {
  const start=c.deadline.replaceAll('-','');
  lines.push('BEGIN:VEVENT',`UID:${c.id}@management-deadlines.local`,'DTSTAMP:20261116T000000Z',`SUMMARY:${safe(`${c.acronym} ${c.year} — Submission Deadline`)}`,`DESCRIPTION:${safe(c.name+' | '+c.officialUrl)}`,`URL:${c.officialUrl}`);
  if(c.deadlineTime&&c.timezone){const hhmm=c.deadlineTime.replace(':','');lines.push(`DTSTART;TZID=${c.timezone}:${start}T${hhmm}00`,`DTEND;TZID=${c.timezone}:${start}T${hhmm}00`);}
  else{const next=new Date(`${c.deadline}T12:00:00Z`);next.setUTCDate(next.getUTCDate()+1);lines.push(`DTSTART;VALUE=DATE:${start}`,`DTEND;VALUE=DATE:${next.toISOString().slice(0,10).replaceAll('-','')}`);}
  lines.push('END:VEVENT');
}
lines.push('END:VCALENDAR');fs.writeFileSync('public/conferences.ics',lines.join('\r\n')+'\r\n');console.log('Wrote public/conferences.ics');
