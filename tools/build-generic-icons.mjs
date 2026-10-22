// Adds the "Generic" icon pack (gen:…) to assets/icons.json from Lucide (ISC license).
//
//   npm pack lucide-static@0.460.0 && tar xzf lucide-static-*.tgz
//   node tools/build-generic-icons.mjs <path-to>/package assets/icons.json
//
// Icons are stroke-only outlines drawn with stroke="currentColor"; orim swaps in the
// node's colour (style stroke) when it draws them.
import fs from 'node:fs'; import path from 'node:path';
const [src, out] = process.argv.slice(2);
const LIST = {
  'People': [['user','Person'],['users','People'],['user-round','Customer'],['user-check','Approver'],['user-plus','New user'],['user-cog','Admin'],['user-search','Recruit'],['contact','Contact'],['baby','Child'],['person-standing','Visitor'],['accessibility','Accessibility'],['users-round','Team']],
  'Roles': [['headset','Service'],['heart-handshake','Customer care'],['handshake','Partner'],['hand-helping','Support'],['hard-hat','Supplier'],['hammer','Maintenance'],['wrench','Repair'],['key-round','Property manager'],['briefcase','Business'],['graduation-cap','Student'],['stethoscope','Doctor'],['shield-check','Security'],['scale','Legal'],['chef-hat','Chef'],['crown','Owner'],['paintbrush','Designer'],['code','Developer'],['truck','Logistics']],
  'Places': [['house','Home'],['sofa','Resident'],['bed','Bedroom'],['building','Building'],['building-2','Office'],['factory','Factory'],['store','Store'],['warehouse','Warehouse'],['hospital','Hospital'],['school','School'],['landmark','Government'],['map-pin','Location'],['map','Map'],['trees','Park'],['construction','Construction site']],
  'Communication': [['mail','Email'],['phone','Phone'],['message-square','Message'],['message-circle','Chat'],['messages-square','Conversation'],['bell','Notification'],['megaphone','Announcement'],['send','Send'],['video','Video call'],['calendar','Calendar'],['clock','Time'],['share-2','Share']],
  'Things': [['file-text','Document'],['files','Documents'],['folder','Folder'],['clipboard-list','Checklist'],['clipboard-check','Inspection'],['receipt','Receipt'],['file-pen-line','Contract'],['credit-card','Payment'],['wallet','Wallet'],['banknote','Money'],['euro','Euro'],['dollar-sign','Dollar'],['shopping-cart','Cart'],['shopping-bag','Purchase'],['package','Package'],['gift','Gift'],['tag','Tag'],['car','Car'],['key','Key'],['lock','Lock'],['camera','Camera'],['printer','Printer'],['book-open','Guide'],['ticket','Ticket']],
  'Tech': [['laptop','Laptop'],['smartphone','Mobile'],['tablet','Tablet'],['monitor','Desktop'],['server','Server'],['database','Database'],['cloud','Cloud'],['wifi','Wi-Fi'],['globe','Web'],['bot','Bot'],['cpu','Chip'],['qr-code','QR code'],['settings','Settings'],['plug','Integration'],['workflow','Workflow'],['webhook','Webhook'],['app-window','App'],['layout-dashboard','Dashboard'],['chart-column','Report'],['search','Search']],
  'Status & ideas': [['lightbulb','Idea'],['circle-help','Question'],['circle-alert','Issue'],['triangle-alert','Warning'],['circle-check','Done'],['circle-x','Blocked'],['circle-pause','On hold'],['star','Favourite'],['heart','Like'],['thumbs-up','Good'],['thumbs-down','Bad'],['smile','Happy'],['meh','Neutral'],['frown','Unhappy'],['flag','Milestone'],['target','Goal'],['trophy','Win'],['rocket','Launch'],['zap','Quick win'],['eye','Review'],['trending-up','Growth'],['trending-down','Decline'],['list-checks','Tasks'],['recycle','Sustainability'],['leaf','Green'],['sun','Day'],['moon','Night'],['infinity','Ongoing']],
};
const clean = s => s.replace(/stroke-width="2"/, 'stroke-width="1.6"').replace(/<!--.*?-->/gs, '').replace(/\sclass="[^"]*"/, '').replace(/\swidth="24"\s+height="24"/, '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').replace(/\s\/>/g, '/>').replace(/\s>/g, '>').trim();
const icons = [];
for (const [cat, list] of Object.entries(LIST)) for (const [id, t] of list) {
  const f = path.join(src, 'icons', id + '.svg');
  if (!fs.existsSync(f)) { console.error('missing', id); process.exit(1); }
  icons.push({ id, t, c: cat, s: clean(fs.readFileSync(f, 'utf8')) });
}
const d = JSON.parse(fs.readFileSync(out, 'utf8'));
d.packs = d.packs.filter(p => p.id !== 'gen');
d.packs.push({ id: 'gen', title: 'Generic', tint: true, icons });
fs.writeFileSync(out, JSON.stringify(d));
console.log('generic icons:', icons.length);
