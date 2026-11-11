const {chromium}=require('playwright'),assert=require('assert');
const names=['alittlepuzzle','allthewitches','flower','fundodomar','green_eye','lucifer','passacaglia','pavao','tyre','yaga'];
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_BINARY || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
for(const name of names.filter(name=>process.argv.length<3||process.argv.slice(2).includes(name))){const page=await browser.newPage({viewport:{width:1920,height:1080}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.type()==='prompt'?d.accept('baba yaga'):d.dismiss());
await page.goto('http://127.0.0.1:8000/'+name+'/',{waitUntil:'domcontentloaded'});
try{
 await page.waitForFunction(()=>Object.keys(localStorage).some(k=>k.startsWith('jigsawTray:')),{},{timeout:45000});
 await page.waitForTimeout(500);
 const before=await page.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.startsWith('jigsawTray:'));return JSON.parse(localStorage[k]).positions.sort((a,b)=>a.id.localeCompare(b.id))});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const nodes=[...document.querySelectorAll('#tray .piece')];return nodes.some(n=>parseFloat(n.style.left)>0)||document.querySelector('#trayCanvas')?.height>1200},{},{timeout:45000});
 await page.waitForTimeout(1000);
 const after=await page.evaluate(()=>{let arr;if(typeof pieces!=='undefined')arr=pieces.filter(p=>!p.placed).map(p=>({id:String(p.id),x:p.trayX,y:p.trayY}));else{const s=typeof st!=='undefined'?st:state;arr=s.pieces.filter(p=>!p.placed&&p.active!==false&&document.querySelector('#tray').contains(p.node||p.element)).map(p=>({id:String(p.id),x:p.sourceX,y:p.sourceY}));}return arr.sort((a,b)=>a.id.localeCompare(b.id));});
 assert.deepStrictEqual(after,before.map(({id,x,y})=>({id,x,y})));
 assert.deepStrictEqual(errors,[]);
 const dims=await page.evaluate(()=>({board:document.querySelector('.board').getBoundingClientRect().width,tray:document.querySelector('.trayWrap, .tray-wrap, aside.side').getBoundingClientRect().height}));
 if(name==='yaga') assert.equal(await page.evaluate(()=>toPct(384)),'50%');
 assert.equal(dims.board,1280);assert.equal(dims.tray,1318);
 console.log(name,'PASS',before.length,'pieces, exact x/y preserved after reload');
}catch(e){process.exitCode=1;console.log(name,'FAIL',e.message.slice(0,900),errors)}
await page.close();}
await browser.close()})();
