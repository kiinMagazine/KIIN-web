'use client';
/* eslint-disable @next/next/no-img-element -- Las portadas se sirven desde Storage o /public. */
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';

export type Slide={href:string;title:string;kicker:string;src:string};

const VERT='attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;uv.y=1.-uv.y;gl_Position=vec4(p,0.,1.);}';
const FRAG=`precision mediump float;varying vec2 uv;uniform sampler2D a,b;uniform float t,ra,rb,rc;
vec2 fit(vec2 u,float r){vec2 s=r>rc?vec2(rc/r,1.):vec2(1.,r/rc);return (u-.5)*s+.5;}
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){
  float d=n(uv*4.+t*2.)*.7+n(uv*9.)*.3;
  float e=smoothstep(0.,1.,t);
  vec2 wave=vec2(sin(uv.y*10.+t*6.),cos(uv.x*10.+t*6.))*.05*sin(t*3.14159);
  vec2 ua=fit(uv+wave+(d-.5)*e*.35,ra),ub=fit(uv-wave-(d-.5)*(1.-e)*.35,rb);
  vec4 ca=texture2D(a,clamp(ua,0.,1.)),cb=texture2D(b,clamp(ub,0.,1.));
  float m=smoothstep(.0,1.,clamp((e*1.6)-d*.6,0.,1.));
  gl_FragColor=mix(ca,cb,m);
}`;

export default function HeroCarousel({slides}:{slides:Slide[]}){
  const [index,setIndex]=useState(0);
  const [webgl,setWebgl]=useState(false);
  const canvas=useRef<HTMLCanvasElement>(null);
  const api=useRef<{go:(from:number,to:number)=>void}|null>(null);
  const current=useRef(0);
  const count=slides.length;

  const go=useCallback((to:number)=>{
    const next=(to+count)%count;
    api.current?.go(current.current,next);
    current.current=next;
    setIndex(next);
  },[count]);

  useEffect(()=>{
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el=canvas.current;
    if(reduced||!el||!count)return;
    const gl=el.getContext('webgl',{premultipliedAlpha:false});
    if(!gl)return;
    const compile=(type:number,src:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,src);gl.compileShader(s);return s;};
    const prog=gl.createProgram()!;
    gl.attachShader(prog,compile(gl.VERTEX_SHADER,VERT));gl.attachShader(prog,compile(gl.FRAGMENT_SHADER,FRAG));gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS))return;
    gl.useProgram(prog);
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(prog,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    const u=(name:string)=>gl.getUniformLocation(prog,name);
    const textures:{tex:WebGLTexture;ratio:number}[]=[];
    let cancelled=false,raf=0;
    const resize=()=>{const w=el.clientWidth*Math.min(devicePixelRatio,2),h=el.clientHeight*Math.min(devicePixelRatio,2);if(el.width!==w||el.height!==h){el.width=w;el.height=h;}gl.viewport(0,0,el.width,el.height);};
    const draw=(from:number,to:number,t:number)=>{
      resize();
      const A=textures[from],B=textures[to];
      if(!A||!B)return;
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,A.tex);gl.uniform1i(u('a'),0);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,B.tex);gl.uniform1i(u('b'),1);
      gl.uniform1f(u('t'),t);gl.uniform1f(u('ra'),A.ratio);gl.uniform1f(u('rb'),B.ratio);gl.uniform1f(u('rc'),el.width/el.height);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    };
    api.current={go:(from,to)=>{
      cancelAnimationFrame(raf);
      const start=performance.now();
      const step=(now:number)=>{const t=Math.min((now-start)/1400,1);draw(from,to,t);if(t<1)raf=requestAnimationFrame(step);};
      raf=requestAnimationFrame(step);
    }};
    Promise.all(slides.map((s,i)=>new Promise<void>(resolve=>{
      const img=new Image();img.crossOrigin='anonymous';
      img.onload=()=>{
        const tex=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,tex);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        textures[i]={tex,ratio:(img.naturalWidth||1)/(img.naturalHeight||1)};resolve();
      };
      img.onerror=()=>resolve();img.src=s.src;
    }))).then(()=>{
      if(cancelled||textures.filter(Boolean).length!==slides.length)return;
      draw(current.current,current.current,1);setWebgl(true);
    });
    const onResize=()=>draw(current.current,current.current,1);
    window.addEventListener('resize',onResize);
    return()=>{cancelled=true;cancelAnimationFrame(raf);api.current=null;window.removeEventListener('resize',onResize);};
  },[slides,count]);

  useEffect(()=>{
    if(count<2)return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced)return;
    const id=window.setInterval(()=>go(current.current+1),6000);
    return()=>window.clearInterval(id);
  },[go,count]);

  if(!count)return null;
  const slide=slides[index];
  return <section className="hero-carousel" aria-roledescription="carrusel" aria-label="Historias y portadas destacadas">
    <div className="carousel-stage">
      <canvas ref={canvas} className={`carousel-canvas${webgl?'':' is-off'}`} aria-hidden="true"/>
      {!webgl&&<img className="carousel-fallback" key={slide.src} src={slide.src} alt="" />}
      <Link className="carousel-link" href={slide.href} aria-label={`${slide.title}: abrir`}>
        <span className="carousel-kicker">{slide.kicker}</span>
        <strong className="carousel-title">{slide.title}</strong>
        <span className="carousel-cta">Leer más ↗</span>
      </Link>
    </div>
    {count>1&&<div className="carousel-controls">
      <button type="button" onClick={()=>go(index-1)} aria-label="Anterior">←</button>
      <div className="carousel-dots" role="tablist" aria-label="Elegir diapositiva">{slides.map((s,i)=><button key={s.href+i} type="button" role="tab" aria-selected={i===index} aria-label={`Diapositiva ${i+1}: ${s.title}`} className={i===index?'is-active':''} onClick={()=>go(i)}/>)}</div>
      <button type="button" onClick={()=>go(index+1)} aria-label="Siguiente">→</button>
    </div>}
  </section>;
}
