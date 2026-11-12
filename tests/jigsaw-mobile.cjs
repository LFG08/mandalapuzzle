const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const origin=process.env.TEST_ORIGIN||'http://localhost:8000';
const names=['mosaico','pavao','fundodomar','alittlepuzzle','allthewitches','flower','green_eye','lucifer','passacaglia','tyre','yaga'];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_BINARY||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.type()==='prompt'?d.accept('baba yaga'):d.dismiss());
  for(const name of names){
   await page.goto(`${origin}/${name}/`,{waitUntil:'load'});
   if(name==='mosaico')await page.locator('#easyMode').click();
   if(name==='alittlepuzzle')await page.locator('#closeTip').click();
   await page.waitForFunction(()=>document.querySelector('#tray .piece')||document.querySelector('#trayCanvas')?.height>0);
   const board=await page.locator('.mobile-board-viewport').boundingBox();
   const tray=await page.locator('#tray').boundingBox();
   assert(board&&tray&&board.height>80&&tray.height>80,`${name}: usable board and tray`);
   assert(board.y+board.height<=tray.y+1&&tray.y+tray.height<760,`${name}: board and tray visible together`);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
   await page.locator('.mobile-jigsaw-toggle').click();
   assert.equal(await page.locator('.mobile-jigsaw-toggle').getAttribute('aria-expanded'),'true');
   await page.locator('.mobile-jigsaw-toggle').click();
   // Explicit exploration lets touch panning work even on canvas or piece surfaces.
   await page.getByRole('button',{name:'Explorar',exact:true}).click();
   const cdp=await context.newCDPSession(page);
   const x=board.x+board.width*.8,y=board.y+board.height*.7;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-i*20,y:y-i*10}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForTimeout(100);
   assert(await page.locator('.mobile-board-viewport').evaluate(e=>e.scrollLeft>0||e.scrollTop>0),`${name}: native touch exploration`);
   await page.getByRole('button',{name:'Mover peças',exact:true}).click();
   if(name==='green_eye'){
    const from=await page.evaluate(()=>{const p=st.pieces.find(p=>!p.placed);el.tray.scrollLeft=p.sourceX;el.tray.scrollTop=p.sourceY;const r=p.node.getBoundingClientRect();return{x:r.left+10,y:r.top+10}});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x,y:from.y-40}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    await page.waitForFunction(()=>st.drag===null);
    assert.equal(await page.locator('body > .piece').count(),0,'Cancelled gesture must not leave a floating piece');
   }
   if(name==='pavao'){
    const geometry=await page.evaluate(()=>{
     const p=pieces.find(p=>!p.placed);window.mobileCanvasPiece=p;
     trayEl.scrollLeft=Math.max(0,p.trayX-8);trayEl.scrollTop=Math.max(0,p.trayY-8);
     const view=document.querySelector('.mobile-board-viewport');view.scrollLeft=Math.max(0,p.homeX-20);view.scrollTop=Math.max(0,p.homeY-20);
     let hit;
     for(let y=8;y<p.raster.height*p.scale&&!hit;y+=8)for(let x=8;x<p.raster.width*p.scale;x+=8){if(getTrayPieceAt(p.trayX+x,p.trayY+y)===p){hit={x,y};break}}
     if(!hit)return null;
     const tr=trayCanvas.getBoundingClientRect(),br=boardCanvas.getBoundingClientRect();
     return{from:{x:tr.left+(p.trayX+hit.x)*tr.width/trayCanvas.width,y:tr.top+(p.trayY+hit.y)*tr.height/trayCanvas.height},to:{x:br.left+p.homeX+hit.x,y:br.top+p.homeY+hit.y}};
    });
    assert(geometry,'Canvas piece has a hittable point');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[geometry.from]});
    for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:geometry.from.x+(geometry.to.x-geometry.from.x)*i/8,y:geometry.from.y+(geometry.to.y-geometry.from.y)*i/8}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert(await page.evaluate(()=>mobileCanvasPiece.placed),'Canvas touch drag snaps to board');
   }
   await cdp.detach();
   console.log('PASS',name,'mobile layout, menu and touch exploration');
  }
  // Mosaico: real touch placement, rotate and remove use the existing game rules.
  await page.goto(`${origin}/mosaico/`);
  await page.waitForFunction(()=>typeof st!=='undefined'&&st.difficulty!==null&&st.pieces.length===190);
  const cdp=await context.newCDPSession(page);
  async function drag(from,to){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});
   for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*i/8,y:from.y+(to.y-from.y)*i/8}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  const hiddenDrop=await page.evaluate(()=>{
   const p=st.pieces.find(p=>p.id===1),view=document.querySelector('.mobile-board-viewport');
   view.scrollLeft=0;view.scrollTop=0;
   el.tray.scrollLeft=Math.max(0,p.sourceX-8);el.tray.scrollTop=Math.max(0,p.sourceY-8);
   const from=p.node.getBoundingClientRect(),board=el.board.getBoundingClientRect(),tray=el.tray.getBoundingClientRect();
   return {from:{x:from.left+12,y:from.top+12},to:{x:board.left+p.targetX+12,y:board.top+p.targetY+12},trayY:tray.top};
  });
  assert(hiddenDrop.to.y>hiddenDrop.trayY, 'Regression target is behind the visible tray');
  await drag(hiddenDrop.from,hiddenDrop.to);
  assert(await page.evaluate(()=>!st.pieces.find(p=>p.id===1).placed),'Drop on tray must not snap to the board hidden behind it');
  const geometry=await page.evaluate(()=>{
   const piece=st.pieces.find(p=>p.id===1);window.mobileTestPiece=piece;
   const view=document.querySelector('.mobile-board-viewport');view.scrollLeft=Math.max(0,piece.targetX-20);view.scrollTop=Math.max(0,piece.targetY-20);
   el.tray.scrollLeft=Math.max(0,piece.sourceX-8);el.tray.scrollTop=Math.max(0,piece.sourceY-8);
   const from=piece.node.getBoundingClientRect(),to=el.board.getBoundingClientRect();
   return{from:{x:from.left+12,y:from.top+12},to:{x:to.left+piece.targetX+12,y:to.top+piece.targetY+12}};
  });
  await drag(geometry.from,geometry.to);
  assert(await page.evaluate(()=>mobileTestPiece.placed),'Touch placement snaps to board');
  await page.reload();await page.waitForFunction(()=>typeof st!=='undefined'&&st.pieces.some(p=>p.id===1&&p.placed));
  const removal=await page.evaluate(()=>{
   const p=st.pieces.find(p=>p.id===1);window.mobileTestPiece=p;
   const view=document.querySelector('.mobile-board-viewport');view.scrollLeft=Math.max(0,p.targetX-20);view.scrollTop=Math.max(0,p.targetY-20);
   const from=p.node.getBoundingClientRect(),tray=el.tray.getBoundingClientRect();
   return{from:{x:from.left+12,y:from.top+12},to:{x:tray.left+30,y:tray.top+30}};
  });
  await page.getByRole('button',{name:'Retirar peça',exact:true}).click();
  await drag(removal.from,removal.to);
  assert(await page.evaluate(()=>!mobileTestPiece.placed),'Touch removal returns piece to tray');
  const pick=await page.evaluate(()=>{
   const p=st.pieces.find(p=>p.id===1);el.tray.scrollLeft=Math.max(0,p.sourceX-8);el.tray.scrollTop=Math.max(0,p.sourceY-8);
   const r=p.node.getBoundingClientRect();return{x:r.left+12,y:r.top+12};
  });
  await drag(pick,pick);
  const rotation=await page.evaluate(()=>mobileTestPiece.rotation);
  await page.getByRole('button',{name:'Girar peça',exact:true}).click();
  assert.equal(await page.evaluate(()=>mobileTestPiece.rotation),(rotation+1)%8);
  await page.reload();await page.waitForFunction(rotation=>typeof st!=='undefined'&&st.pieces.some(p=>p.id===1&&!p.placed&&p.rotation===rotation), (rotation+1)%8);
  for(const size of [{width:320,height:568},{width:844,height:390}]){
   await page.setViewportSize(size);
   const menu=await page.locator('.mobile-jigsaw-menu').boundingBox();
   const tray=await page.locator('#tray').boundingBox();
   assert(menu.x>=0&&menu.x+menu.width<=size.width+1&&menu.y+menu.height<=size.height+1);
   assert(tray.height>40&&tray.y+tray.height<=menu.y, 'Landscape/small-screen tray stays above menu');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS Mosaico touch placement, removal, rotation, reload persistence, small screen and landscape; no JavaScript errors');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
