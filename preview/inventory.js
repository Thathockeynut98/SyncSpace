// Original Base44 collection inventory. Displays counts only; never requests private rows.
(()=>{'use strict';
const sectionMap={CanvasDoc:'Canvas',CodexEntry:'Vesperan',Goodnight:'Sleep Zone',Heart:'Home',Media:'Media Library',Memory:'Home',Message:'Our Chat',Mood:'Sleep Zone',Note:'Home',Photo:'Photo Wall',ReadingDoc:'Read Together',SleepTrack:'Sleep Zone',VoiceNote:'Voice Note Vault',Video:'Watch Together',BrushTip:'Canvas'};
const names=['Home','Watch Together','Canvas','Our Chat','Games','Read Together','Vesperan','Radio','Call','Sleep Zone','Voice Note Vault','Photo Wall','Media Library'];
let requestId=0;
function mount(){
 const target=document.getElementById('home-pane');if(!target||document.getElementById('legacy-inventory'))return;
 const box=document.createElement('section');box.id='legacy-inventory';box.className='card';
 const h=document.createElement('h2');h.textContent='Your original SyncSpace collection';
 const p=document.createElement('p');p.className='muted';p.textContent='Imported records from Base44. Counts show what is preserved, not which original media files are playable yet.';
 const grid=document.createElement('div');grid.id='legacy-inventory-grid';grid.className='overview-grid';
 const status=document.createElement('p');status.id='legacy-inventory-status';status.className='muted';
 box.append(h,p,grid,status);target.append(box);
}
async function refresh(){
 const current=++requestId;mount();
 const grid=document.getElementById('legacy-inventory-grid'),status=document.getElementById('legacy-inventory-status');
 if(!grid||!status)return;
 grid.replaceChildren();
 if(typeof selectedSpace==='undefined'||!selectedSpace){status.textContent='Choose a shared space to see its imported collections.';return}
 status.textContent='Checking imported collection records…';
 try{
  const result=await call('/spaces/'+encodeURIComponent(selectedSpace.id)+'/inventory');
  if(current!==requestId)return;
  const items=result.collections.filter(x=>x.imported>0);
  for(const item of items){
   const tile=document.createElement('button');tile.type='button';tile.className='overview-tile';
   const n=document.createElement('strong');n.textContent=String(item.imported);
   const title=document.createElement('span');title.textContent=item.type;
   const detail=document.createElement('small');detail.textContent=item.linked+' linked to this space'+(item.unlinked?' · '+item.unlinked+' without a space link':'');
   tile.append(n,title,detail);
   const destination=sectionMap[item.type];
   if(destination){tile.title='Open '+destination;tile.addEventListener('click',()=>{const index=names.indexOf(destination);if(index>=0)selectTab(index)})}
   grid.append(tile);
  }
  status.textContent='Inventory only: actual media files and decryption for other collections still need verification.';
 }catch(e){if(current===requestId)status.textContent='Could not load inventory: '+e.message}
}
window.addEventListener('syncspace:login',refresh);
window.addEventListener('syncspace:logout',()=>{requestId++;const grid=document.getElementById('legacy-inventory-grid');if(grid)grid.replaceChildren()});
})();
