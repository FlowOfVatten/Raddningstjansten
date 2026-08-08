/**
 * digit-matcher.js
 * Canvas-based digit template matching for Rise of Kingdoms screenshots.
 * Public API: ensureDigitLib(), tmMatchAllTroops(imageSrc, expectedLens), clearDigitLibCache()
 */
"use strict";

const TMPL_W = 22;
const TMPL_H = 32;
const TMPL_CACHE_KEY = "rise_digit_tmpl_v4";
const TMPL_THRESHOLD = 0.68;
const TMPL_REF_IMAGE  = "original-C26D3549-8172-4216-B32C-F306D3176885.jpeg";
const TMPL_REF_CROP   = { x: 0.38, y: 0.37, w: 0.57, h: 0.42 };
const TMPL_REF_TROOPS = ["7067061504920","6005154251649","4682737012605","4499576295050","5742067553562"];
const MATCH_CROP = { x: 0.38, y: 0.33, w: 0.57, h: 0.42 };
const ROW_DIGIT_XSTART = 0.35;

let digitLib = null;

function makeCropCanvas(img, box, scale, filter) {
  const sx=Math.round(img.width*box.x), sy=Math.round(img.height*box.y);
  const sw=Math.round(img.width*box.w), sh=Math.round(img.height*box.h);
  const cv=document.createElement("canvas");
  cv.width=sw*scale; cv.height=sh*scale;
  const ctx=cv.getContext("2d");
  if(filter) ctx.filter=filter;
  ctx.drawImage(img,sx,sy,sw,sh,0,0,cv.width,cv.height);
  return cv;
}

function canvasToBinary(cv, bias=20) {
  const w=cv.width, h=cv.height;
  const px=cv.getContext("2d").getImageData(0,0,w,h).data;
  const grays=new Float32Array(w*h);
  let sum=0;
  for(let i=0;i<w*h;i++){
    grays[i]=0.299*px[i*4]+0.587*px[i*4+1]+0.114*px[i*4+2];
    sum+=grays[i];
  }
  const mean=sum/(w*h);
  const darkOnLight=mean>128;
  const threshold=darkOnLight?mean-bias:mean+bias;
  const bin=new Uint8Array(w*h);
  for(let i=0;i<w*h;i++) bin[i]=darkOnLight?(grays[i]<threshold?1:0):(grays[i]>threshold?1:0);
  return bin;
}

function horzProject(bin, w, h) {
  const p=new Array(h).fill(0);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) p[y]+=bin[y*w+x];
  return p;
}

function vertProjectSlice(bin, bw, bh, y0, rowH, xStart) {
  const usableW=bw-xStart;
  const p=new Array(usableW).fill(0);
  for(let y=y0;y<Math.min(bh,y0+rowH);y++)
    for(let x=xStart;x<bw;x++) p[x-xStart]+=bin[y*bw+x];
  return p;
}

function findBands(proj, minV, minW, mergeGap) {
  const raw=[];
  let s=-1;
  for(let i=0;i<=proj.length;i++){
    const active=i<proj.length&&proj[i]>=minV;
    if(active&&s<0) s=i;
    if(!active&&s>=0){ if(i-s>=minW) raw.push({s,e:i}); s=-1; }
  }
  const out=[];
  for(const b of raw){
    if(out.length&&b.s-out[out.length-1].e<=mergeGap) out[out.length-1].e=b.e;
    else out.push({...b});
  }
  return out;
}

function splitWideSegments(segs, expectedW, factor=1.8) {
  const out=[];
  for(const seg of segs){
    const w=seg.e-seg.s;
    if(w>expectedW*factor){
      const n=Math.max(2,Math.round(w/expectedW));
      const subW=w/n;
      for(let k=0;k<n;k++) out.push({s:Math.round(seg.s+k*subW),e:Math.round(seg.s+(k+1)*subW)});
    } else { out.push(seg); }
  }
  return out;
}

function normalizeSegmentCount(segs, expectedCount) {
  if (!segs.length || expectedCount <= 0) return [];
  let out = [...segs].sort((a, b) => a.s - b.s);

  // Drop obvious separator noise when we have too many pieces.
  while (out.length > expectedCount) {
    let minIdx = 0;
    let minW = out[0].e - out[0].s;
    for (let i = 1; i < out.length; i++) {
      const w = out[i].e - out[i].s;
      if (w < minW) {
        minW = w;
        minIdx = i;
      }
    }
    out.splice(minIdx, 1);
  }

  // Split widest merged blobs when we have too few pieces.
  while (out.length < expectedCount) {
    let maxIdx = 0;
    let maxW = out[0].e - out[0].s;
    for (let i = 1; i < out.length; i++) {
      const w = out[i].e - out[i].s;
      if (w > maxW) {
        maxW = w;
        maxIdx = i;
      }
    }

    const seg = out[maxIdx];
    const mid = Math.floor((seg.s + seg.e) / 2);
    if (mid <= seg.s || mid >= seg.e) break;

    out.splice(maxIdx, 1, { s: seg.s, e: mid }, { s: mid, e: seg.e });
    out.sort((a, b) => a.s - b.s);
  }

  return out;
}

function pickTroopBands(allBands, hProj, targetCount = 5) {
  if (!allBands.length) return [];

  const sorted = [...allBands].sort((a, b) => a.s - b.s);
  if (sorted.length <= targetCount) return sorted;

  const heights = sorted.map((b) => b.e - b.s).sort((a, b) => a - b);
  const medH = heights[Math.floor(heights.length / 2)] || 1;

  const filtered = sorted.filter((b) => {
    const h = b.e - b.s;
    return h >= Math.floor(medH * 0.7) && h <= Math.ceil(medH * 1.6);
  });

  const pool = filtered.length >= targetCount ? filtered : sorted;
  if (pool.length <= targetCount) return pool;

  let best = pool.slice(0, targetCount);
  let bestScore = -Infinity;

  for (let i = 0; i <= pool.length - targetCount; i++) {
    const win = pool.slice(i, i + targetCount);
    const centers = win.map((b) => (b.s + b.e) / 2);
    const gaps = [];
    for (let g = 1; g < centers.length; g++) gaps.push(centers[g] - centers[g - 1]);
    const avgGap = gaps.reduce((s, v) => s + v, 0) / Math.max(1, gaps.length);
    const gapVar = gaps.reduce((s, v) => s + Math.abs(v - avgGap), 0);
    const scoreSum = win.reduce((s, b) => s + hProj.slice(b.s, b.e).reduce((a, v) => a + v, 0), 0);
    const score = scoreSum - gapVar * 120;
    if (score > bestScore) {
      bestScore = score;
      best = win;
    }
  }

  return best.sort((a, b) => a.s - b.s);
}

function extractPatch(bin, bw, bh, x0, y0, pw, ph) {
  const p=new Float32Array(TMPL_W*TMPL_H);
  for(let ty=0;ty<TMPL_H;ty++)
    for(let tx=0;tx<TMPL_W;tx++){
      const sx=Math.min(bw-1,Math.round(x0+(tx/(TMPL_W-1))*(pw-1)));
      const sy=Math.min(bh-1,Math.round(y0+(ty/(TMPL_H-1))*(ph-1)));
      if(sx>=0&&sy>=0) p[ty*TMPL_W+tx]=bin[sy*bw+sx];
    }
  return p;
}

function ncc(a, b) {
  let dot=0,na=0,nb=0;
  for(let i=0;i<a.length;i++){dot+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i];}
  return na>0&&nb>0?dot/Math.sqrt(na*nb):0;
}

function matchDigit(patch) {
  if(!digitLib) return null;
  let best=null, bestS=TMPL_THRESHOLD;
  for(const [d,tmpls] of Object.entries(digitLib))
    for(const t of tmpls){ const s=ncc(patch,t); if(s>bestS){bestS=s;best=d;} }
  return best;
}

function segmentDigitRow(bin, bw, bh, band, expectedCount) {
  const rowH=band.e-band.s;
  const xStart=Math.floor(bw*ROW_DIGIT_XSTART);
  const minCol=Math.max(1,Math.floor(rowH*0.08));
  let rawSegs=[];
  for(const mg of [3,2,1,0]){
    const vProj=vertProjectSlice(bin,bw,bh,band.s,rowH,xStart);
    rawSegs=findBands(vProj,minCol,2,mg).map(s=>({s:s.s+xStart,e:s.e+xStart}));
    if(rawSegs.length>=expectedCount) break;
  }
  if(rawSegs.length===0) return [];
  // Remove narrow segments (comma/dot separators between digit groups).
  const totalW0=rawSegs.reduce((s,seg)=>s+(seg.e-seg.s),0);
  const estW0=totalW0/Math.max(1,rawSegs.length);
  const minDigitW=Math.max(4,Math.floor(estW0*0.30));
  rawSegs=rawSegs.filter(seg=>(seg.e-seg.s)>=minDigitW);
  // Re-estimate digit width after filtering and split wide merged groups.
  const totalW=rawSegs.reduce((s,seg)=>s+(seg.e-seg.s),0);
  const estDigitW=totalW/expectedCount;
  const splitSegs = splitWideSegments(rawSegs,estDigitW);
  return normalizeSegmentCount(splitSegs, expectedCount);
}

async function buildDigitLib() {
  const img=await loadImageElement(TMPL_REF_IMAGE);
  const cv=makeCropCanvas(img,TMPL_REF_CROP,4,"grayscale(100%) contrast(320%) brightness(120%)");
  const bin=canvasToBinary(cv);
  const bw=cv.width, bh=cv.height;
  const hProj=horzProject(bin,bw,bh);
  const allBands=findBands(hProj,Math.max(1,Math.floor(bw*0.04)),Math.max(2,Math.floor(bh/35)),Math.max(1,Math.floor(bh/50)));
  const scored=pickTroopBands(allBands,hProj,5);
  const lib={};
  for(let d=0;d<=9;d++) lib[String(d)]=[];
  let extracted=0;
  for(let ri=0;ri<scored.length&&ri<TMPL_REF_TROOPS.length;ri++){
    const band=scored[ri], rowH=band.e-band.s, known=TMPL_REF_TROOPS[ri];
    const colSegs=segmentDigitRow(bin,bw,bh,band,known.length);
    if(colSegs.length!==known.length){ console.debug(`[DM] Row ${ri+1}: segs=${colSegs.length} exp=${known.length} skip`); continue; }
    for(let ci=0;ci<colSegs.length;ci++){
      const seg=colSegs[ci];
      lib[known[ci]].push(extractPatch(bin,bw,bh,seg.s,band.s,seg.e-seg.s,rowH));
      extracted++;
    }
  }
  const missing=["0","1","2","3","4","5","6","7","8","9"].filter(d=>lib[d].length===0);
  if(missing.length>0) console.warn("[DM] Missing digits:",missing.join(","),`extracted=${extracted}`);
  else console.info(`[DM] Templates built: ${extracted} patches, all 10 digits covered.`);
  return lib;
}

function loadCachedLib() {
  try{
    const raw=localStorage.getItem(TMPL_CACHE_KEY);
    if(!raw) return null;
    const parsed=JSON.parse(raw);
    if(["0","1","2","3","4","5","6","7","8","9"].some(d=>!(parsed[d]?.length>0))) return null;
    const lib={};
    for(const [k,v] of Object.entries(parsed)) lib[k]=v.map(a=>new Float32Array(a));
    console.info("[DM] Templates loaded from cache.");
    return lib;
  } catch{ return null; }
}

function saveCachedLib(lib) {
  try{
    const toSave={};
    for(const [k,v] of Object.entries(lib)) toSave[k]=v.map(a=>Array.from(a));
    localStorage.setItem(TMPL_CACHE_KEY,JSON.stringify(toSave));
  } catch(e){ console.warn("[DM] Cache save failed:",e.message); }
}

async function ensureDigitLib() {
  if(digitLib) return;
  digitLib=loadCachedLib();
  if(!digitLib){ digitLib=await buildDigitLib(); saveCachedLib(digitLib); }
}

function clearDigitLibCache() {
  digitLib=null;
  try{ localStorage.removeItem(TMPL_CACHE_KEY); } catch{}
}

async function tmMatchAllTroops(imageSrc, expectedLens) {
  if(!digitLib) return {troops:Array(5).fill(null),log:"Templates not loaded"};
  const img=await loadImageElement(imageSrc);
  const cv=makeCropCanvas(img,MATCH_CROP,4,"grayscale(100%) contrast(320%) brightness(120%)");
  const bin=canvasToBinary(cv);
  const bw=cv.width, bh=cv.height;
  const hProj=horzProject(bin,bw,bh);
  const allBands=findBands(hProj,Math.max(1,Math.floor(bw*0.04)),Math.max(2,Math.floor(bh/35)),Math.max(1,Math.floor(bh/50)));
  const scored=pickTroopBands(allBands,hProj,5);
  if(scored.length<5) return {troops:Array(5).fill(null),log:`Rows found: ${scored.length}/5`};
  const troops=[], logParts=[];
  for(let ri=0;ri<5;ri++){
    const band=scored[ri], expLen=expectedLens[ri]||13;
    const colSegs=segmentDigitRow(bin,bw,bh,band,expLen);
    if(Math.abs(colSegs.length-expLen)>1){ troops.push(null); logParts.push(`T${ri+1}:SKIP(${colSegs.length})`); continue; }
    let rowStr="", uncertain=0;
    for(let ci=0;ci<Math.min(colSegs.length,expLen);ci++){
      const seg=colSegs[ci];
      const patch=extractPatch(bin,bw,bh,seg.s,band.s,seg.e-seg.s,band.e-band.s);
      const d=matchDigit(patch);
      rowStr+=d!==null?d:"?";
      if(d===null) uncertain++;
    }
    while(rowStr.length<expLen){rowStr+="?";uncertain++;}
    troops.push(uncertain===0?rowStr:null);
    logParts.push(`T${ri+1}:${uncertain===0?rowStr:`partial(${uncertain}?)`}`);
  }
  return {troops,log:logParts.join(" | ")};
}

