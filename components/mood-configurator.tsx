'use client';
import { Minus, Plus } from 'lucide-react';

export type MoodPreset = 'distressed' | 'sad' | 'uneasy' | 'tired' | 'neutral' | 'calm' | 'happy' | 'energetic';
export type MoodPoint = { emoji: string; label: string; detail: string; preset?: MoodPreset };
export const defaultMoodPoints: MoodPoint[] = [
  {emoji:'',label:'つらい',detail:'',preset:'distressed'},
  {emoji:'',label:'悲しい',detail:'',preset:'sad'},
  {emoji:'',label:'不安',detail:'',preset:'uneasy'},
  {emoji:'',label:'疲れた',detail:'',preset:'tired'},
  {emoji:'',label:'ふつう',detail:'',preset:'neutral'},
  {emoji:'',label:'おだやか',detail:'',preset:'calm'},
  {emoji:'',label:'うれしい',detail:'',preset:'happy'},
  {emoji:'',label:'とても元気',detail:'',preset:'energetic'},
];
const defaultIndexes: Record<number, number[]> = {
  4: [0, 2, 5, 7],
  6: [0, 1, 3, 4, 6, 7],
  8: [0, 1, 2, 3, 4, 5, 6, 7],
};
export const defaultMoodPointsFor = (count: 4 | 6 | 8): MoodPoint[] =>
  defaultIndexes[count].map((index) => ({ ...defaultMoodPoints[index] }));
export function MoodConfigurator({points,onChange}:{points:MoodPoint[];onChange:(next:MoodPoint[])=>void}) {
  const count=points.length;
  const setCount=(next:4|6|8)=>{
    const target=defaultMoodPointsFor(next);
    const currentByPreset=new Map(points.filter(point=>point.preset).map(point=>[point.preset,point]));
    onChange(target.map(point=>currentByPreset.get(point.preset) || point));
  };
  const edit=(index:number,key:keyof MoodPoint,value:string)=>onChange(points.map((point,i)=>i===index?{...point,[key]:value}:point));
  return <section className="mood-configurator"><div className="mood-count"><strong>地点の数</strong><div><button type="button" disabled={count<=4} onClick={()=>setCount((count-2) as 4|6|8)}><Minus size={16}/></button><span>{count}</span><button type="button" disabled={count>=8} onClick={()=>setCount((count+2) as 4|6|8)}><Plus size={16}/></button></div></div><p>4・6・8個から選べます。絵文字を入力すると、初期の表情から置き換わります。</p><div className="mood-point-list">{points.map((point,index)=><div className="mood-point" key={index}><input aria-label={`${index+1}番目の絵文字`} className="emoji-input" value={point.emoji} maxLength={2} placeholder="☺" onChange={e=>edit(index,'emoji',e.target.value)}/><div><input aria-label={`${index+1}番目の名前`} value={point.label} maxLength={24} placeholder="短い名前" onChange={e=>edit(index,'label',e.target.value)}/><input aria-label={`${index+1}番目の補足`} value={point.detail} maxLength={80} placeholder="補足（長押しで表示・任意）" onChange={e=>edit(index,'detail',e.target.value)}/></div></div>)}</div></section>;
}
