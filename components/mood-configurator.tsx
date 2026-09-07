'use client';
import { Minus, Plus } from 'lucide-react';

export type MoodPoint = { emoji: string; label: string; detail: string };
export const defaultMoodPoints: MoodPoint[] = [
  {emoji:'😄',label:'よく分かった',detail:''},{emoji:'🙂',label:'だいたい分かった',detail:''},
  {emoji:'😐',label:'少しむずかしい',detail:''},{emoji:'😟',label:'まだ分からない',detail:''},
  {emoji:'🤔',label:'質問したい',detail:''},{emoji:'😲',label:'発見があった',detail:''},
  {emoji:'🙋',label:'話したい',detail:''},{emoji:'😴',label:'ついていけない',detail:''},
];
export const defaultMoodPointsFor = (count: 4 | 6 | 8): MoodPoint[] =>
  defaultMoodPoints.slice(0,count).map(point => ({...point}));
export function parseMoodLayout(layout?: string): { points: MoodPoint[]; textOnly: boolean } {
  if (!layout) return { points: defaultMoodPointsFor(4), textOnly: false };
  try {
    const value = JSON.parse(layout);
    if (Array.isArray(value)) return { points: value as MoodPoint[], textOnly: false };
    if (value && Array.isArray(value.points)) {
      return { points: value.points as MoodPoint[], textOnly: value.textOnly === true };
    }
  } catch {}
  return { points: defaultMoodPointsFor(4), textOnly: false };
}
export function MoodConfigurator({points,onChange,textOnly=false,onTextOnlyChange}:{points:MoodPoint[];onChange:(next:MoodPoint[])=>void;textOnly?:boolean;onTextOnlyChange?:(next:boolean)=>void}) {
  const count=points.length;
  const setCount=(next:number)=>onChange(next>count?[...points,...defaultMoodPoints.slice(count,next)]:points.slice(0,next));
  const edit=(index:number,key:keyof MoodPoint,value:string)=>onChange(points.map((point,i)=>i===index?{...point,[key]:value}:point));
  return <section className="mood-configurator"><div className="mood-count"><strong>地点の数</strong><div><button type="button" disabled={count<=4} onClick={()=>setCount(count-2)}><Minus size={16}/></button><span>{count}</span><button type="button" disabled={count>=8} onClick={()=>setCount(count+2)}><Plus size={16}/></button></div></div><label className="sound-switch mood-textonly-switch"><span>絵文字を使わず文章だけにする</span><input type="checkbox" role="switch" checked={textOnly} onChange={e=>onTextOnlyChange?.(e.target.checked)}/><span className="sound-switch-track" aria-hidden="true"><span/></span></label><p>4・6・8個から選べます。補足文は参加者が長押しすると表示されます。</p><div className="mood-point-list">{points.map((point,index)=><div className="mood-point" key={index}>{!textOnly && <input aria-label={`${index+1}番目の絵文字`} className="emoji-input" value={point.emoji} maxLength={2} onChange={e=>edit(index,'emoji',e.target.value)}/>}<div><input aria-label={`${index+1}番目の名前`} value={point.label} maxLength={24} placeholder="短い名前" onChange={e=>edit(index,'label',e.target.value)}/><input aria-label={`${index+1}番目の補足`} value={point.detail} maxLength={80} placeholder="補足（長押しで表示・任意）" onChange={e=>edit(index,'detail',e.target.value)}/></div></div>)}</div></section>;
}
