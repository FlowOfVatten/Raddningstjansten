/**
 * digit-matcher.js
 * Canvas-based digit template matching for Rise of Kingdoms screenshots.
 * Public API: ensureDigitLib(), tmMatchLeadingDigits(imageSrc, expectedLens), tmMatchDigitMatrix(imageSrc, expectedLens), tmMatchAllTroops(imageSrc, expectedLens), clearDigitLibCache()
 */
"use strict";

const TMPL_W = 22;
const TMPL_H = 32;
const TMPL_CACHE_KEY = "rise_digit_tmpl_v6";
const TMPL_THRESHOLD = 0.70;
const TMPL_MIN_SCORE = 0.78;
const TMPL_REF_IMAGE  = "original-C26D3549-8172-4216-B32C-F306D3176885.jpeg";
const TMPL_REF_CROP   = { x: 0.38, y: 0.37, w: 0.57, h: 0.42 };
const TMPL_REF_TROOPS = ["7067061504920","6005154251649","4682737012605","4499576295050","5742067553562"];
const MATCH_CROP = { x: 0.38, y: 0.33, w: 0.57, h: 0.42 };
const ROW_DIGIT_XSTART = 0.35;

let digitLib = null;
let slotModel = null;
let rowModel = null;

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

function estimateDigitSpan(bin, bw, bh, band) {
  const rowH = band.e - band.s;
  const xStart = Math.floor(bw * ROW_DIGIT_XSTART);
  const minCol = Math.max(1, Math.floor(rowH * 0.05));
  const vProj = vertProjectSlice(bin, bw, bh, band.s, rowH, xStart);
  const spans = findBands(vProj, minCol, 2, 2).map(s => ({ s: s.s + xStart, e: s.e + xStart }));
  if (!spans.length) return null;
  return { left: spans[0].s, right: spans[spans.length - 1].e };
}

function buildSlotModel(samples, expectedLen = 13) {
  if (!samples.length) return null;
  const byIdx = Array.from({ length: expectedLen }, () => ({ c: [], w: [] }));

  for (const sample of samples) {
    if (sample.relCenters.length !== expectedLen || sample.relWidths.length !== expectedLen) continue;
    for (let i = 0; i < expectedLen; i++) {
      byIdx[i].c.push(sample.relCenters[i]);
      byIdx[i].w.push(sample.relWidths[i]);
    }
  }

  const centers = [];
  const widths = [];
  for (let i = 0; i < expectedLen; i++) {
    if (!byIdx[i].c.length || !byIdx[i].w.length) return null;
    const c = byIdx[i].c.reduce((s, v) => s + v, 0) / byIdx[i].c.length;
    const w = byIdx[i].w.reduce((s, v) => s + v, 0) / byIdx[i].w.length;
    centers.push(c);
    widths.push(w);
  }

  return { expectedLen, centers, widths };
}

function matchRowBySlots(bin, bw, bh, band, expectedCount) {
  if (!slotModel || expectedCount !== slotModel.expectedLen) return null;
  const span = estimateDigitSpan(bin, bw, bh, band);
  if (!span) return null;
  const spanW = Math.max(1, span.right - span.left);
  const rowH = band.e - band.s;

  let rowStr = "";
  let minScore = 1;

  for (let i = 0; i < expectedCount; i++) {
    const cx = span.left + slotModel.centers[i] * spanW;
    const slotW = Math.max(8, Math.floor(slotModel.widths[i] * spanW * 1.35));
    const x0 = Math.max(0, Math.floor(cx - slotW / 2));
    const x1 = Math.min(bw, Math.floor(cx + slotW / 2));
    const w = Math.max(1, x1 - x0);

    const patch = extractPatch(bin, bw, bh, x0, band.s, w, rowH);
    const match = matchDigitDetailed(patch);
    if (!match || match.score < TMPL_MIN_SCORE) {
      return null;
    }

    rowStr += match.digit;
    if (match.score < minScore) minScore = match.score;
  }

  return { rowStr, minScore };
}

function matchFirstDigitBySlots(bin, bw, bh, band, expectedCount) {
  if (!slotModel || expectedCount !== slotModel.expectedLen) return null;
  const span = estimateDigitSpan(bin, bw, bh, band);
  if (!span) return null;
  const spanW = Math.max(1, span.right - span.left);
  const rowH = band.e - band.s;

  const cx = span.left + slotModel.centers[0] * spanW;
  const slotW = Math.max(8, Math.floor(slotModel.widths[0] * spanW * 1.35));
  const x0 = Math.max(0, Math.floor(cx - slotW / 2));
  const x1 = Math.min(bw, Math.floor(cx + slotW / 2));
  const w = Math.max(1, x1 - x0);

  const patch = extractPatch(bin, bw, bh, x0, band.s, w, rowH);
  const match = matchDigitDetailed(patch);
  if (!match || match.score < TMPL_MIN_SCORE) return null;
  return match;
}

function matchFirstDigitBySegments(bin, bw, bh, band, expectedCount) {
  const segs = segmentDigitRow(bin, bw, bh, band, expectedCount);
  if (!segs.length) return null;

  const firstSeg = segs[0];
  const patch = extractPatch(
    bin,
    bw,
    bh,
    firstSeg.s,
    band.s,
    Math.max(1, firstSeg.e - firstSeg.s),
    Math.max(1, band.e - band.s)
  );

  const match = matchDigitDetailed(patch);
  if (!match || match.score < TMPL_MIN_SCORE) return null;
  return match;
}

function classifyRowDigitsBySegments(bin, bw, bh, band, expectedCount) {
  const segs = segmentDigitRow(bin, bw, bh, band, expectedCount);
  if (segs.length !== expectedCount) return null;

  const out = [];
  for (let i = 0; i < expectedCount; i++) {
    const seg = segs[i];
    const patch = extractPatch(
      bin,
      bw,
      bh,
      seg.s,
      band.s,
      Math.max(1, seg.e - seg.s),
      Math.max(1, band.e - band.s)
    );
    out.push(matchDigitDetailed(patch));
  }
  return out;
}

function classifyRowDigitsBySlots(bin, bw, bh, band, expectedCount) {
  if (!slotModel || expectedCount !== slotModel.expectedLen) return null;
  const span = estimateDigitSpan(bin, bw, bh, band);
  if (!span) return null;
  const spanW = Math.max(1, span.right - span.left);
  const rowH = band.e - band.s;

  const out = [];
  for (let i = 0; i < expectedCount; i++) {
    const cx = span.left + slotModel.centers[i] * spanW;
    const slotW = Math.max(8, Math.floor(slotModel.widths[i] * spanW * 1.35));
    const x0 = Math.max(0, Math.floor(cx - slotW / 2));
    const x1 = Math.min(bw, Math.floor(cx + slotW / 2));
    const w = Math.max(1, x1 - x0);

    const patch = extractPatch(bin, bw, bh, x0, band.s, w, rowH);
    out.push(matchDigitDetailed(patch));
  }
  return out;
}

function classifyRowDigitsByUniformSlots(bin, bw, bh, band, expectedCount) {
  const span = estimateDigitSpan(bin, bw, bh, band);
  if (!span || expectedCount <= 0) return null;

  const rowH = Math.max(1, band.e - band.s);
  const spanW = Math.max(1, span.right - span.left);
  const step = spanW / expectedCount;
  const out = [];

  for (let i = 0; i < expectedCount; i++) {
    const cx = span.left + (i + 0.5) * step;
    const pw = Math.max(8, Math.floor(step * 0.96));
    const x0 = Math.max(0, Math.floor(cx - pw / 2));
    const x1 = Math.min(bw, Math.floor(cx + pw / 2));
    const w = Math.max(1, x1 - x0);

    const patch = extractPatch(bin, bw, bh, x0, band.s, w, rowH);
    out.push(matchDigitDetailed(patch));
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

function buildRowModelFromBands(bands, bh) {
  if (!bands || bands.length !== 5 || !bh) return null;
  const rows = bands.map((b) => ({
    c: ((b.s + b.e) / 2) / bh,
    h: (b.e - b.s) / bh
  }));
  return { rows };
}

function refineAnchoredBand(hProj, bh, centerRel, heightRel) {
  const h = Math.max(24, Math.round(heightRel * bh));
  const baseC = Math.round(centerRel * bh);
  const search = Math.max(12, Math.round(h * 0.8));

  let bestS = Math.max(0, baseC - Math.floor(h / 2));
  let bestScore = -1;

  for (let delta = -search; delta <= search; delta += 2) {
    const c = baseC + delta;
    let s = c - Math.floor(h / 2);
    let e = s + h;
    if (s < 0) {
      e -= s;
      s = 0;
    }
    if (e > bh) {
      s -= (e - bh);
      e = bh;
      if (s < 0) s = 0;
    }
    let score = 0;
    for (let y = s; y < e; y++) score += hProj[y] || 0;
    if (score > bestScore) {
      bestScore = score;
      bestS = s;
    }
  }

  const s = bestS;
  const e = Math.min(bh, s + h);
  return { s, e };
}

function getAnchoredRowBands(hProj, bh) {
  if (!rowModel?.rows || rowModel.rows.length !== 5) return null;
  const bands = rowModel.rows.map((r) => refineAnchoredBand(hProj, bh, r.c, r.h));
  return bands.sort((a, b) => a.s - b.s);
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

function matchDigitDetailed(patch) {
  if(!digitLib) return null;
  let best=null, bestS=0;
  for(const [d,tmpls] of Object.entries(digitLib))
    for(const t of tmpls){ const s=ncc(patch,t); if(s>bestS){bestS=s;best=d;} }
  if (!best || bestS < TMPL_THRESHOLD) return null;
  return { digit: best, score: bestS };
}

function segmentDigitRow(bin, bw, bh, band, expectedCount) {
  const rowH=band.e-band.s;
  const xStart=Math.floor(bw*ROW_DIGIT_XSTART);
  const tries=[];

  for (const minColScale of [0.12, 0.10, 0.08, 0.06]) {
    for (const mergeGap of [1, 0, 2, 3]) {
      const minCol=Math.max(1,Math.floor(rowH*minColScale));
      const vProj=vertProjectSlice(bin,bw,bh,band.s,rowH,xStart);
      let segs=findBands(vProj,minCol,2,mergeGap).map(s=>({s:s.s+xStart,e:s.e+xStart}));
      if(!segs.length) continue;

      // Remove tiny separator fragments.
      const avgW=segs.reduce((sum, seg) => sum + (seg.e - seg.s), 0) / segs.length;
      const minDigitW=Math.max(6,Math.floor(avgW*0.35));
      segs=segs.filter(seg => (seg.e - seg.s) >= minDigitW);
      if(!segs.length) continue;

      const totalW=segs.reduce((s,seg)=>s+(seg.e-seg.s),0);
      const estDigitW=Math.max(1, totalW / Math.max(1, expectedCount));
      segs=splitWideSegments(segs, estDigitW, 1.75).sort((a,b)=>a.s-b.s);

      const countDiff=Math.abs(segs.length-expectedCount);
      tries.push({segs, countDiff});
      if (countDiff === 0) {
        return segs;
      }
    }
  }

  if(!tries.length) return [];
  tries.sort((a,b)=>a.countDiff-b.countDiff);
  return tries[0].countDiff <= 1 ? tries[0].segs : [];
}

async function buildDigitLib() {
  const img=await loadImageElement(TMPL_REF_IMAGE);
  const cv=makeCropCanvas(img,TMPL_REF_CROP,4,"grayscale(100%) contrast(320%) brightness(120%)");
  const bin=canvasToBinary(cv);
  const bw=cv.width, bh=cv.height;
  const hProj=horzProject(bin,bw,bh);
  const allBands=findBands(hProj,Math.max(1,Math.floor(bw*0.04)),Math.max(2,Math.floor(bh/35)),Math.max(1,Math.floor(bh/50)));
  const scored=pickTroopBands(allBands,hProj,5);
  rowModel = buildRowModelFromBands(scored, bh);
  const lib={};
  for(let d=0;d<=9;d++) lib[String(d)]=[];
  let extracted=0;
  for(let ri=0;ri<scored.length&&ri<TMPL_REF_TROOPS.length;ri++){
    const band=scored[ri], rowH=band.e-band.s, known=TMPL_REF_TROOPS[ri];
    const span = estimateDigitSpan(bin, bw, bh, band);
    if (!span) {
      console.debug(`[DM] Row ${ri+1}: no span detected, skip`);
      continue;
    }

    const spanW = Math.max(1, span.right - span.left);
    const step = spanW / known.length;
    for (let ci = 0; ci < known.length; ci++) {
      const cx = span.left + (ci + 0.5) * step;
      const pw = Math.max(8, Math.floor(step * 0.96));
      const x0 = Math.max(0, Math.floor(cx - pw / 2));
      const x1 = Math.min(bw, Math.floor(cx + pw / 2));
      const w = Math.max(1, x1 - x0);
      lib[known[ci]].push(extractPatch(bin,bw,bh,x0,band.s,w,rowH));
      extracted++;
    }
  }
  slotModel = null;
  const missing=["0","1","2","3","4","5","6","7","8","9"].filter(d=>lib[d].length===0);
  if(missing.length>0) console.warn("[DM] Missing digits:",missing.join(","),`extracted=${extracted}`);
  else console.info(`[DM] Templates built: ${extracted} patches, all 10 digits covered.`);
  return { lib, slotModel, rowModel };
}

function loadCachedLib() {
  try{
    const raw=localStorage.getItem(TMPL_CACHE_KEY);
    if(!raw) return null;
    const parsed=JSON.parse(raw);
    const base = parsed.lib || parsed;
    if(["0","1","2","3","4","5","6","7","8","9"].some(d=>!(base[d]?.length>0))) return null;
    const lib={};
    for(const [k,v] of Object.entries(base)) lib[k]=v.map(a=>new Float32Array(a));
    slotModel = parsed.slotModel || null;
    rowModel = parsed.rowModel || null;
    console.info("[DM] Templates loaded from cache.");
    return { lib, slotModel, rowModel };
  } catch{ return null; }
}

function saveCachedLib(payload) {
  try{
    const lib = payload?.lib || payload;
    const toSave={};
    for(const [k,v] of Object.entries(lib)) toSave[k]=v.map(a=>Array.from(a));
    localStorage.setItem(
      TMPL_CACHE_KEY,
      JSON.stringify({
        lib: toSave,
        slotModel: payload?.slotModel || null,
        rowModel: payload?.rowModel || null
      })
    );
  } catch(e){ console.warn("[DM] Cache save failed:",e.message); }
}

async function ensureDigitLib() {
  if(digitLib) return;
  const cached=loadCachedLib();
  if(cached){
    digitLib=cached.lib;
    slotModel=cached.slotModel || null;
    rowModel=cached.rowModel || null;
    return;
  }
  const built=await buildDigitLib();
  digitLib=built.lib;
  slotModel=built.slotModel || null;
  rowModel=built.rowModel || null;
  saveCachedLib(built);
}

function clearDigitLibCache() {
  digitLib=null;
  slotModel=null;
  rowModel=null;
  try{ localStorage.removeItem(TMPL_CACHE_KEY); } catch{}
}

async function tmMatchLeadingDigits(imageSrc, expectedLens) {
  if(!digitLib) return { leadingDigits: Array(5).fill(null), log: "Templates not loaded" };
  const img = await loadImageElement(imageSrc);
  const cv = makeCropCanvas(img, MATCH_CROP, 4, "grayscale(100%) contrast(320%) brightness(120%)");
  const bin = canvasToBinary(cv);
  const bw = cv.width, bh = cv.height;
  const hProj = horzProject(bin, bw, bh);
  const allBands = findBands(
    hProj,
    Math.max(1, Math.floor(bw * 0.04)),
    Math.max(2, Math.floor(bh / 35)),
    Math.max(1, Math.floor(bh / 50))
  );
  const scored = getAnchoredRowBands(hProj, bh) || pickTroopBands(allBands, hProj, 5);
  if (scored.length < 5) {
    return { leadingDigits: Array(5).fill(null), log: `Rows found: ${scored.length}/5` };
  }

  const leadingDigits = [];
  const logParts = [];

  for (let ri = 0; ri < 5; ri++) {
    const band = scored[ri];
    const expLen = expectedLens[ri] || 13;

    let match = matchFirstDigitBySegments(bin, bw, bh, band, expLen);
    let source = "seg";
    if (!match) {
      match = matchFirstDigitBySlots(bin, bw, bh, band, expLen);
      source = "slot";
    }

    if (!match) {
      leadingDigits.push(null);
      logParts.push(`T${ri + 1}:?`);
      continue;
    }

    leadingDigits.push({ digit: match.digit, score: match.score, source });
    logParts.push(`T${ri + 1}:${match.digit}(${match.score.toFixed(2)} ${source})`);
  }

  return { leadingDigits, log: logParts.join(" | ") };
}

async function tmMatchDigitMatrix(imageSrc, expectedLens) {
  if(!digitLib) return { matrix: Array(5).fill(null), log: "Templates not loaded" };
  const img = await loadImageElement(imageSrc);
  const cv = makeCropCanvas(img, MATCH_CROP, 4, "grayscale(100%) contrast(320%) brightness(120%)");
  const bin = canvasToBinary(cv);
  const bw = cv.width, bh = cv.height;
  const hProj = horzProject(bin, bw, bh);
  const allBands = findBands(
    hProj,
    Math.max(1, Math.floor(bw * 0.04)),
    Math.max(2, Math.floor(bh / 35)),
    Math.max(1, Math.floor(bh / 50))
  );
  const scored = getAnchoredRowBands(hProj, bh) || pickTroopBands(allBands, hProj, 5);
  if (scored.length < 5) {
    return { matrix: Array(5).fill(null), log: `Rows found: ${scored.length}/5` };
  }

  const matrix = [];
  const logParts = [];

  for (let ri = 0; ri < 5; ri++) {
    const band = scored[ri];
    const expLen = expectedLens[ri] || 13;

    let row = classifyRowDigitsByUniformSlots(bin, bw, bh, band, expLen);
    let source = "uniform";
    if (!row) {
      row = classifyRowDigitsBySegments(bin, bw, bh, band, expLen);
      source = "seg";
    }
    if (!row) {
      row = classifyRowDigitsBySlots(bin, bw, bh, band, expLen);
      source = "slot";
    }

    if (!row || row.length !== expLen) {
      matrix.push(null);
      logParts.push(`T${ri + 1}:SKIP`);
      continue;
    }

    const known = row.filter(Boolean).length;
    matrix.push(row);
    logParts.push(`T${ri + 1}:${known}/${expLen} ${source}`);
  }

  return { matrix, log: logParts.join(" | ") };
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
    let colSegs=segmentDigitRow(bin,bw,bh,band,expLen);
    if(colSegs.length!==expLen){
      const slot = matchRowBySlots(bin, bw, bh, band, expLen);
      if (!slot) {
        troops.push(null);
        logParts.push(`T${ri+1}:SKIP(${colSegs.length})`);
        continue;
      }
      troops.push(slot.rowStr);
      logParts.push(`T${ri+1}:${slot.rowStr} (${slot.minScore.toFixed(2)} slot)`);
      continue;
    }
    let rowStr="", uncertain=0;
    let minScore=1;
    for(let ci=0;ci<Math.min(colSegs.length,expLen);ci++){
      const seg=colSegs[ci];
      const patch=extractPatch(bin,bw,bh,seg.s,band.s,seg.e-seg.s,band.e-band.s);
      const match=matchDigitDetailed(patch);
      if(!match || match.score < TMPL_MIN_SCORE){
        rowStr+="?";
        uncertain++;
        continue;
      }
      rowStr+=match.digit;
      if(match.score < minScore) minScore=match.score;
    }
    while(rowStr.length<expLen){rowStr+="?";uncertain++;}

    if (uncertain > 0) {
      const slot = matchRowBySlots(bin, bw, bh, band, expLen);
      if (slot) {
        troops.push(slot.rowStr);
        logParts.push(`T${ri+1}:${slot.rowStr} (${slot.minScore.toFixed(2)} slot)`);
        continue;
      }
    }

    troops.push(uncertain===0?rowStr:null);
    logParts.push(`T${ri+1}:${uncertain===0?`${rowStr} (${minScore.toFixed(2)})`:`partial(${uncertain}?)`}`);
  }
  return {troops,log:logParts.join(" | ")};
}

