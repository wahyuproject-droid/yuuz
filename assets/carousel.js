/* YuuZ Market carousel: direct pointer tracking + seamless cloned boundaries. */
(function(){'use strict';
class YuuZCarousel{
 constructor(root,{interval=5000,autoplay=true,onChange=null}={}){
  this.autoplay=autoplay;this.onChange=onChange;this.root=root;this.track=root.querySelector('.hero-track');this.originals=[...this.track.children];this.count=this.originals.length;this.index=1;this.animating=false;this.drag=null;this.hover=false;this.focused=false;this.listeners=[];this.dead=false;this.interval=interval;this.suppressUntil=0;this.reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if(!this.count)return;
  const first=this.originals[0].cloneNode(true),last=this.originals[this.count-1].cloneNode(true);for(const c of [first,last]){c.setAttribute('aria-hidden','true');c.tabIndex=-1;c.classList.add('clone');}
  this.track.prepend(last);this.track.append(first);this.setPosition(0);this.update();
  const on=(el,type,fn,opts)=>{el.addEventListener(type,fn,opts);this.listeners.push(()=>el.removeEventListener(type,fn,opts));};
  on(root,'pointerdown',e=>this.down(e));on(root,'pointermove',e=>this.move(e));on(root,'pointerup',e=>this.up(e));on(root,'pointercancel',()=>this.cancel());on(root,'lostpointercapture',()=>{if(this.drag)this.cancel();});
  on(root,'click',e=>{if(performance.now()<this.suppressUntil){e.preventDefault();e.stopPropagation();}},true);
  on(root,'dragstart',e=>e.preventDefault());
  on(root,'mouseenter',()=>{this.hover=true;this.pause();});on(root,'mouseleave',()=>{this.hover=false;this.schedule();});
  on(root,'focusin',()=>{this.focused=true;this.pause();});on(root,'focusout',e=>{if(!root.contains(e.relatedTarget)){this.focused=false;this.schedule();}});
  on(this.track,'transitionend',e=>{if(e.target===this.track&&e.propertyName==='transform')this.finish();});
  on(root,'keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();this.go(e.key==='ArrowRight'?1:-1);}});
  on(window,'resize',()=>{this.cancel();if(!this.animating)this.setPosition(0);});
  on(document,'visibilitychange',()=>{if(document.hidden)this.pause();else this.schedule();});
  const previous=root.querySelector('.prev'),next=root.querySelector('.next');if(previous)on(previous,'click',()=>this.go(-1));if(next)on(next,'click',()=>this.go(1));
  const dots=root.parentElement.querySelectorAll('[data-slide]');dots.forEach((d,i)=>on(d,'click',()=>this.select(i)));
  this.dots=[...dots];this.update();this.schedule();
 }
 logical(){return ((this.index-1)%this.count+this.count)%this.count;}
 setPosition(duration=450,dx=0){this.track.style.transitionDuration=(this.reduced?0:duration)+'ms';this.track.style.transform=`translate3d(calc(-${this.index*100}% + ${dx}px),0,0)`;}
 pause(){clearTimeout(this.timer);}
 schedule(){this.pause();if(!this.autoplay||this.dead||this.count<2||this.hover||this.focused||this.drag||document.hidden||this.reduced)return;this.timer=setTimeout(()=>{if(!document.querySelector('dialog[open]'))this.go(1);else this.schedule();},this.interval);}
 update(){const active=this.logical();this.originals.forEach((slide,i)=>{slide.tabIndex=i===active?0:-1;slide.setAttribute('aria-hidden',i===active?'false':'true');});this.dots?.forEach((dot,i)=>{dot.classList.toggle('active',i===active);dot.setAttribute('aria-current',i===active?'true':'false');});this.root.dataset.active=String(active);this.onChange?.(active);}
 go(direction){if(this.dead||this.animating||this.count<2)return;this.pause();this.index+=direction>0?1:-1;this.animate();}
 select(target){if(this.dead||this.animating||target===this.logical()||target<0||target>=this.count)return;this.pause();this.index=target+1;this.animate();}
 animate(){this.animating=true;this.root.classList.remove('dragging');this.setPosition(450);this.update();clearTimeout(this.endTimer);this.endTimer=setTimeout(()=>this.finish(),this.reduced?0:510);}
 finish(){if(this.dead)return;clearTimeout(this.endTimer);if(this.index===0)this.index=this.count;else if(this.index===this.count+1)this.index=1;this.setPosition(0);this.animating=false;this.update();this.schedule();}
 down(e){if(this.animating||this.count<2||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0)||e.target.closest('button'))return;this.pause();this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,start:performance.now(),axis:null};}
 move(e){const d=this.drag;if(!d||d.id!==e.pointerId)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(!d.axis&&Math.max(Math.abs(dx),Math.abs(dy))>7){d.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';if(d.axis==='x'){this.root.setPointerCapture?.(e.pointerId);this.root.classList.add('dragging');}}
  if(d.axis==='y'){this.drag=null;this.schedule();return;}if(d.axis!=='x')return;e.preventDefault();const width=this.root.getBoundingClientRect().width||1;d.dx=Math.max(-width,Math.min(width,dx));this.setPosition(0,d.dx);
 }
 up(e){const d=this.drag;if(!d||d.id!==e.pointerId)return;this.drag=null;this.root.classList.remove('dragging');if(d.axis!=='x'){this.schedule();return;}
  this.suppressUntil=performance.now()+400;const width=this.root.getBoundingClientRect().width||1,velocity=Math.abs(d.dx)/Math.max(1,performance.now()-d.start),threshold=Math.max(30,width*.15);if(Math.abs(d.dx)>threshold||(Math.abs(d.dx)>22&&velocity>.55))this.index+=d.dx>0?-1:1;
  // Flush the exact dragged position before transitioning to the selected slide.
  this.track.getBoundingClientRect();this.animate();
 }
 cancel(){if(!this.drag)return;this.drag=null;this.root.classList.remove('dragging');this.setPosition(0);this.schedule();}
 destroy(){this.dead=true;this.pause();clearTimeout(this.endTimer);this.listeners.forEach(off=>off());}
}
window.YuuZCarousel=YuuZCarousel;
})();
