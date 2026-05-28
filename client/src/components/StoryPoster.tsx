import { useMemo } from 'react';
import './StoryPoster.css';

interface StoryPosterProps {
  title: string;
  content: string;
  index: number;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/* ---- sentiment detection ---- */
const SENTIMENT_WORDS: Record<string, string[]> = {
  sorrow: '悲伤愁痛苦泪哭恨孤暗寂叹忧怨离丧秋枯落残萧瑟凄凉断肠'.split(''),
  joy: '喜乐欢笑暖春阳光明媚花开美甜幸歌舞盛昌荣欣悦'.split(''),
  peace: '静安宁淡清幽柔梦闲逸雅禅空素净'.split(''),
  passion: '愤怒烈狂暴雷火炎热血壮志慷慨激昂'.split(''),
  nostalgia: '忆怀思念往昔曾旧故乡岁年记'.split(''),
};

const IMAGERY_WORDS: Record<string, string[]> = {
  mountain: '山峰岭崖岳岩壁石'.split(''),
  water: '水河江湖海洋雨雾云浪涛波流泉溪滴露'.split(''),
  night: '月夜星暗冥宵晚暮'.split(''),
  flora: '花草树木叶林梅兰竹菊桃柳荷莲松柏'.split(''),
  autumn: '风秋枫飘落黄'.split(''),
  winter: '雪冬寒冰霜冷冻'.split(''),
  fire: '火炎焚烧燃热烬'.split(''),
  spring: '春芽暖燕柳'.split(''),
};

/* ---- palettes keyed by mood ---- */
const MOOD_PALETTES: Record<string, string[][]> = {
  sorrow: [
    ['#1a1a2e', '#4a4a6a', '#8b8baa'],
    ['#16213e', '#3d3b5c', '#6b6b8a'],
    ['#1c1c2a', '#3e3e5c', '#7a7a9a'],
  ],
  joy: [
    ['#2d1f0e', '#8b6914', '#e8c56d'],
    ['#1e1a12', '#7a5c1a', '#d4a84b'],
    ['#2a2018', '#6b4c20', '#c9a040'],
  ],
  peace: [
    ['#1a2e1a', '#4a6a4a', '#8baa8b'],
    ['#162816', '#3d5c3d', '#7a9a7a'],
    ['#1c2e1c', '#3e5e3e', '#7a9a7a'],
  ],
  passion: [
    ['#2e1a1a', '#8b3535', '#d47070'],
    ['#281616', '#7a2a2a', '#c96060'],
    ['#2e1c1c', '#8b4040', '#cc7070'],
  ],
  nostalgia: [
    ['#2e2a1e', '#8b7a55', '#d4c8a0'],
    ['#2a2418', '#7a6a45', '#c9b890'],
    ['#2e281c', '#8b7550', '#d4c498'],
  ],
};

function countMatches(text: string, chars: string[]): number {
  return chars.filter((c) => text.includes(c)).length;
}

function detectMood(text: string): string {
  let best = 'peace';
  let bestScore = 0;
  for (const [mood, chars] of Object.entries(SENTIMENT_WORDS)) {
    const score = countMatches(text, chars);
    if (score > bestScore) {
      bestScore = score;
      best = mood;
    }
  }
  return best;
}

function detectImagery(text: string): string {
  let best = 'water';
  let bestScore = 0;
  for (const [img, chars] of Object.entries(IMAGERY_WORDS)) {
    const score = countMatches(text, chars);
    if (score > bestScore) {
      bestScore = score;
      best = img;
    }
  }
  return best;
}

function pickPalette(mood: string, hash: number): string[] {
  const palettes = MOOD_PALETTES[mood] || MOOD_PALETTES.peace;
  return palettes[hash % palettes.length];
}

/* ---- SVG generators for each imagery type ---- */
function renderMountainShapes(hash: number, palette: string[]) {
  const peaks = 3 + (hash % 4);
  const el: string[] = [];
  for (let i = 0; i < peaks; i++) {
    const cx = 30 + i * (220 / peaks) + (hash >> (i * 2)) % 30;
    const h = 40 + ((hash >> (i * 4)) % 80);
    const w = 30 + ((hash >> (i * 3)) % 40);
    el.push(
      `<polygon points="${cx - w},200 ${cx},${200 - h} ${cx + w},200" fill="${palette[1]}" opacity="0.15" />`
    );
    el.push(
      `<polygon points="${cx - w * 0.7},200 ${cx},${200 - h * 0.6} ${cx + w * 0.7},200" fill="${palette[2]}" opacity="0.1" />`
    );
  }
  return el.join('');
}

function renderWaterShapes(hash: number, palette: string[]) {
  const curves = 4 + (hash % 5);
  const el: string[] = [];
  for (let i = 0; i < curves; i++) {
    const y = 30 + i * 35 + (hash % 20);
    const amp = 8 + (hash >> i) % 16;
    const cx = 150;
    el.push(
      `<path d="M0,${y} Q${cx - amp * 2},${y - amp} ${cx},${y} T300,${y + amp}" fill="none" stroke="${palette[2]}" stroke-width="0.6" opacity="${0.15 + i * 0.03}"/>`
    );
  }
  return el.join('');
}

function renderNightShapes(hash: number, palette: string[]) {
  const moonR = 25 + (hash % 15);
  const moonX = 200 + (hash % 60);
  const moonY = 40 + (hash % 60);
  const el: string[] = [];
  el.push(`<circle cx="${moonX}" cy="${moonY}" r="${moonR}" fill="${palette[2]}" opacity="0.25" />`);
  el.push(`<circle cx="${moonX + 5}" cy="${moonY - 4}" r="${moonR * 0.85}" fill="${palette[0]}" opacity="0.6" />`);
  // stars
  const starCount = 8 + (hash % 12);
  for (let i = 0; i < starCount; i++) {
    const sx = 20 + (hash >> (i * 3)) % 260;
    const sy = 10 + (hash >> (i * 2)) % 120;
    const sr = 0.5 + (hash >> i) % 2;
    el.push(`<circle cx="${sx}" cy="${sy}" r="${sr}" fill="${palette[2]}" opacity="0.4" />`);
  }
  return el.join('');
}

function renderFloraShapes(hash: number, palette: string[]) {
  const el: string[] = [];
  const count = 3 + (hash % 5);
  for (let i = 0; i < count; i++) {
    const cx = 40 + i * 80 + (hash >> i) % 40;
    const cy = 60 + (hash >> (i * 2)) % 80;
    // petals
    for (let j = 0; j < 6; j++) {
      const angle = (j / 6) * Math.PI * 2;
      const px = cx + Math.cos(angle) * 14;
      const py = cy + Math.sin(angle) * 14;
      el.push(
        `<ellipse cx="${px}" cy="${py}" rx="8" ry="12" fill="${palette[2]}" opacity="0.12" transform="rotate(${angle * 57.3} ${px} ${py})" />`
      );
    }
    el.push(`<circle cx="${cx}" cy="${cy}" r="4" fill="${palette[1]}" opacity="0.2" />`);
  }
  return el.join('');
}

function renderAutumnShapes(hash: number, palette: string[]) {
  const el: string[] = [];
  const count = 5 + (hash % 8);
  for (let i = 0; i < count; i++) {
    const x1 = 20 + i * 50 + (hash >> i) % 30;
    const y1 = 10 + (hash >> (i * 3)) % 180;
    const len = 15 + (hash >> (i * 2)) % 30;
    const angle = -30 + (hash >> i) % 40;
    const x2 = x1 + Math.cos((angle * Math.PI) / 180) * len;
    const y2 = y1 + Math.sin((angle * Math.PI) / 180) * len;
    el.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${palette[1]}" stroke-width="0.8" opacity="0.25" />`
    );
  }
  return el.join('');
}

function renderWinterShapes(hash: number, palette: string[]) {
  const el: string[] = [];
  const count = 15 + (hash % 20);
  for (let i = 0; i < count; i++) {
    const cx = (hash >> (i * 3)) % 300;
    const cy = (hash >> (i * 2)) % 200;
    const r = 0.8 + (hash >> i) % 3;
    el.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${palette[2]}" opacity="0.3" />`);
  }
  return el.join('');
}

function renderFireShapes(hash: number, palette: string[]) {
  const el: string[] = [];
  const count = 3 + (hash % 4);
  for (let i = 0; i < count; i++) {
    const cx = 50 + i * 80 + (hash >> i) % 30;
    const baseY = 180 - (hash % 30);
    const h = 40 + ((hash >> (i * 3)) % 60);
    // flame shape
    el.push(
      `<path d="M${cx},${baseY} Q${cx - 10},${baseY - h * 0.5} ${cx},${baseY - h} Q${cx + 10},${baseY - h * 0.5} ${cx},${baseY}" fill="${palette[1]}" opacity="0.15" />`
    );
    el.push(
      `<path d="M${cx},${baseY} Q${cx - 5},${baseY - h * 0.3} ${cx},${baseY - h * 0.6} Q${cx + 5},${baseY - h * 0.3} ${cx},${baseY}" fill="${palette[2]}" opacity="0.1" />`
    );
  }
  return el.join('');
}

function renderSpringShapes(hash: number, palette: string[]) {
  const el: string[] = [];
  const count = 4 + (hash % 5);
  for (let i = 0; i < count; i++) {
    const cx = 30 + i * 60 + (hash >> i) % 40;
    const cy = 40 + (hash >> (i * 2)) % 60;
    // upward growing curves
    el.push(
      `<path d="M${cx},180 Q${cx - 10},${180 - cy} ${cx},${180 - cy - 20} Q${cx + 10},${180 - cy} ${cx},180" fill="none" stroke="${palette[1]}" stroke-width="0.6" opacity="0.2" />`
    );
    // small bud dots
    el.push(`<circle cx="${cx}" cy="${180 - cy - 20}" r="2" fill="${palette[2]}" opacity="0.25" />`);
  }
  return el.join('');
}

export function StoryPoster({ title, content, index }: StoryPosterProps) {
  const params = useMemo(() => {
    const fullText = title + content;
    const h = hashStr(fullText);
    const mood = detectMood(fullText);
    const imagery = detectImagery(fullText);
    const palette = pickPalette(mood, h);
    const titleChars = title.replace(/\s/g, '').slice(0, 3);
    const textLen = fullText.length;
    const density = textLen < 50 ? 'sparse' : textLen < 200 ? 'medium' : 'dense';

    let shapesSvg = '';
    switch (imagery) {
      case 'mountain': shapesSvg = renderMountainShapes(h, palette); break;
      case 'water': shapesSvg = renderWaterShapes(h, palette); break;
      case 'night': shapesSvg = renderNightShapes(h, palette); break;
      case 'flora': shapesSvg = renderFloraShapes(h, palette); break;
      case 'autumn': shapesSvg = renderAutumnShapes(h, palette); break;
      case 'winter': shapesSvg = renderWinterShapes(h, palette); break;
      case 'fire': shapesSvg = renderFireShapes(h, palette); break;
      case 'spring': shapesSvg = renderSpringShapes(h, palette); break;
      default: shapesSvg = renderWaterShapes(h, palette);
    }

    return { palette, mood, imagery, density, titleChars, shapesSvg, h };
  }, [title, content]);

  return (
    <div className="poster" style={{ background: params.palette[0] }}>
      <svg className="poster-svg" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id={`grain-${index}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
            <feColorMatrix type="saturate" values="0" in="noise" result="gray" />
            <feBlend in="SourceGraphic" in2="gray" mode="multiply" result="textured" />
          </filter>
        </defs>

        {/* Background wash */}
        <rect width="300" height="200" fill={params.palette[0]} filter={`url(#grain-${index})`} />

        {/* Large diffuse wash */}
        <ellipse
          cx={150 + (params.h % 40) - 20}
          cy={80 + (params.h % 50) - 25}
          rx={80 + (params.h % 60)}
          ry={60 + (params.h % 40)}
          fill={params.palette[2]}
          opacity={0.08 + (params.h % 6) / 100}
        />

        {/* Imagery-specific shapes */}
        <g dangerouslySetInnerHTML={{ __html: params.shapesSvg }} />

        {/* Dark vignette */}
        <radialGradient id={`vig-${index}`} cx="50%" cy="50%" r="70%">
          <stop offset="60%" stopColor="transparent" stopOpacity="0" />
          <stop offset="100%" stopColor={params.palette[0]} stopOpacity="0.35" />
        </radialGradient>
        <rect width="300" height="200" fill={`url(#vig-${index})`} />
      </svg>

      {/* Mood label */}
      <span className="poster-mood">
        {params.mood === 'sorrow' && '悲'}
        {params.mood === 'joy' && '喜'}
        {params.mood === 'peace' && '静'}
        {params.mood === 'passion' && '烈'}
        {params.mood === 'nostalgia' && '忆'}
      </span>

      {/* Title overlay */}
      <div className="poster-text">
        {params.titleChars.split('').map((ch, i) => (
          <span key={i} className="poster-char" style={{ animationDelay: `${0.1 * i}s` }}>
            {ch}
          </span>
        ))}
      </div>

      <div className="poster-grain" />
    </div>
  );
}
