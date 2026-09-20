(async () => {
 const root=document.querySelector('#story-box'), d=document.querySelector('#dialogue-container'), deck=document.querySelector('#command-deck-container'), choices=document.querySelector('#choices-panel'), text=document.querySelector('#dialogue-text');
 const wait=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const original=text.textContent, children=[...choices.childNodes].map(n=>n.cloneNode(true));
 const results=[];
 for(const count of [0,1,2,4]) {
  text.textContent=count===4 ? original.repeat(15) : original;
  choices.replaceChildren();
  for(let i=0;i<count;i++) { const b=document.createElement('button'); b.className='choice-btn'; b.textContent=('Pilihan panjang dengan keterangan yang membungkus beberapa baris. ').repeat(count===4?3:1); choices.append(b); }
  await wait(); await wait();
  const a=d.getBoundingClientRect(),b=deck.getBoundingClientRect(),s=root.getBoundingClientRect();
  results.push({count,gap:count?b.top-a.bottom:null,narrativeHeight:a.height,choiceHeight:b.height,scrollable:d.scrollHeight>d.clientHeight,pass:(!count||a.bottom<=b.top-7)&&a.top>=s.top&&a.left>=s.left&&a.right<=s.right+1&&b.bottom<=s.bottom+1});
 }
 const {ScreenLayoutEditor}=await import('/src/js/screenLayoutEditor.js');
 const editor=new ScreenLayoutEditor({root});
 await editor.setScene('presentation-test'); editor.setEnabled(true);
 const target=editor._getTarget('DIALOGUE_BOX');
 const base={...editor._getBox(target),x:0.08,y:0.7,w:0.8,h:0.25};
 editor.layout.profiles[editor.profile].DIALOGUE_BOX=base;editor._applyCurrentProfile(); await wait();
 const saved=JSON.stringify(editor.layout);
 editor.setEnabled(false); await wait(); editor.setEnabled(true);await wait();
 results.push({editorDrift:saved!==JSON.stringify(editor.layout),canonicalY:editor._readBox(target).y,expectedY:base.y});
 editor.destroy(); text.textContent=original;choices.replaceChildren(...children);await wait();
 return {viewport:[innerWidth,innerHeight],results};
})()
