const fs=require('fs'),vm=require('vm'),assert=require('assert');
const manifest=JSON.parse(fs.readFileSync('vermelho/pieces.json'));
let source=fs.readFileSync('vermelho/index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
source=source.replace(/    init\(\)\.catch[^\n]+/,'');
const element=()=>({getBoundingClientRect:()=>({left:0,top:0}),classList:{add(){},remove(){}},style:{},appendChild(){},setAttribute(){}});
const context={document:{getElementById:element},Audio:function(){},console,localStorage:{setItem(){},getItem(){return null}}};vm.createContext(context);
vm.runInContext(source+'\nthis.api={st,el,availableSlot,rotatePiece,restore,loadManifest:v=>PIECES=v};',context);
const {api}=context;api.loadManifest(manifest.pieces);api.st.boardRect={left:20,top:30};
let checked=0,alternates=0;
for(const p of manifest.pieces){
 assert(p.matches[0].includes(p.id));
 for(let rotation=0;rotation<4;rotation++)for(const id of p.matches[rotation]){
 const slot=manifest.pieces.find(q=>q.id===id);
 const piece={id:p.id,data:p,rotation,currentX:20+slot.x*.6,currentY:30+slot.y*.6};
 api.st.pieces=[];assert.equal(api.availableSlot(piece).id,id);
 api.st.pieces=[{placed:true,slot:id}];assert.notEqual(api.availableSlot(piece)?.id,id);
 checked++;if(id!==p.id)alternates++;
 }
}
const p=manifest.pieces[0], forbidden=manifest.pieces.find(s=>!p.matches.flat().includes(s.id));
api.st.pieces=[];const invalid={data:p,rotation:0,currentX:20+forbidden.x*.6,currentY:30+forbidden.y*.6};
assert.notEqual(api.availableSlot(invalid)?.id,forbidden.id);
vm.runInContext('save()',context);
console.log(`Passed ${checked} valid rotation/slot combinations, including ${alternates} interchangeable combinations; occupied and nonidentical slots rejected; save OK.`);
