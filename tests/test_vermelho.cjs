const fs=require('fs'),vm=require('vm'),assert=require('assert');
const SCALE=1;
const manifest=JSON.parse(fs.readFileSync('vermelho/pieces.json'));
let source=fs.readFileSync('vermelho/index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
source=source.replace(/    init\(\)\.catch[^\n]+/,'');
const element=()=>({getBoundingClientRect:()=>({left:0,top:0}),classList:{add(){},remove(){}},style:{},appendChild(){},setAttribute(){}});
const context={document:{getElementById:element},Audio:function(){},console,localStorage:{setItem(){},getItem(){return null}}};vm.createContext(context);
vm.runInContext(source+'\nthis.api={st,el,availableSlot,rotatePiece,makePiece,restore,loadManifest:v=>PIECES=v};',context);
const {api}=context;api.loadManifest(manifest.pieces);api.st.boardRect={left:20,top:30};
let checked=0,alternates=0;
for(const p of manifest.pieces){
 assert(p.matches[0].includes(p.id));
 for(let rotation=0;rotation<4;rotation++)for(const id of p.matches[rotation]){
 const slot=manifest.pieces.find(q=>q.id===id);
 const piece={id:p.id,data:p,rotation,currentX:20+slot.x*SCALE,currentY:30+slot.y*SCALE};
 api.st.pieces=[];assert.equal(api.availableSlot(piece).id,id);
 api.st.pieces=[{placed:true,slot:id}];assert.notEqual(api.availableSlot(piece)?.id,id);
 checked++;if(id!==p.id)alternates++;
 }
}
const p=manifest.pieces[0], forbidden=manifest.pieces.find(s=>!p.matches.flat().includes(s.id));
api.st.pieces=[];const invalid={data:p,rotation:0,currentX:20+forbidden.x*SCALE,currentY:30+forbidden.y*SCALE};
assert.notEqual(api.availableSlot(invalid)?.id,forbidden.id);
vm.runInContext('save()',context);
console.log(`Passed ${checked} valid rotation/slot combinations, including ${alternates} interchangeable combinations; occupied and nonidentical slots rejected; save OK.`);

// Exercise the actual right-click handlers and ensure rotation keeps other pieces in place.
(async()=>{
 const html=fs.readFileSync('vermelho/index.html','utf8');
 const actions=html.match(/<div class="actions">([\s\S]*?)<\/div>/)[1];
 assert.deepEqual([...actions.matchAll(/>([^<]+)<\/(?:button|a)>/g)].map(m=>m[1]),['Menu Principal','Reset','Embaralhar Peças','Som: Ligado','Sobre essa Imagem']);
 assert(!html.includes('id="rotate"'));
 assert(html.includes('width:1280px;height:1280px'));
 assert(html.includes('minmax(1280px,1332px)'));
 assert(html.includes('const SCALE=BOARD/1280'));
 const canvas={style:{},getContext:()=>({translate(){},rotate(){},drawImage(){}})};
 context.document.createElement=()=>canvas;
 const node={...element(),appendChild(){}};
 api.el.tpl.content={firstElementChild:{cloneNode:()=>node}};
 api.el.tray.scrollLeft=api.el.tray.scrollTop=0;
 vm.runInContext('loadImage=async()=>({width:108,height:234});compact=()=>{throw new Error("Rotation must not rearrange the tray")}',context);
 const piece=await api.makePiece(p);
 piece.sourceX=200;piece.sourceY=200;api.st.pieces=[piece];
 const center=[piece.sourceX+piece.w/2,piece.sourceY+piece.h/2];
 node.onpointerdown({button:2});assert.equal(api.st.drag,null);
 let prevented=0;
 for(let r=1;r<=4;r++){
  node.oncontextmenu({preventDefault(){prevented++}});
  assert.equal(piece.rotation,r%4);
  assert(Math.abs(piece.sourceX+piece.w/2-center[0])<1e-8);
  assert(Math.abs(piece.sourceY+piece.h/2-center[1])<1e-8);
 }
 assert.equal(prevented,4);
 piece.placed=true;node.oncontextmenu({preventDefault(){}});assert.equal(piece.rotation,0);
 console.log('Right-click rotates through four orientations, keeps the piece centered, prevents the browser menu, and leaves placed pieces locked. Menu buttons match Alittlepuzzle.');
})().catch(error=>{console.error(error);process.exitCode=1});
