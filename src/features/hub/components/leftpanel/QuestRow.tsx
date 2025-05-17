// src/features/hub/components/QuestRow.tsx
import React,{memo,CSSProperties} from 'react';
import { cn } from '@/lib/utils';
import type { QuestForListItemAugmented } from './useUnifiedChatPanelData';

interface Props{
  quest:QuestForListItemAugmented;
  isActive:boolean;
  isFocused?:boolean;
  panelId:string;
  style?:CSSProperties;
  onClick:(id:string)=>void;
  isVtEnabled:boolean;
  role?:string; id?:string; 'aria-selected'?:boolean;
}
const Row:React.FC<Props>=({
  quest,isActive,isFocused,panelId,style,onClick,isVtEnabled,role='option',...aria
})=>{
  const vtName = isVtEnabled?`quest-${quest.id}`:undefined;
  return(
    <div
      {...aria}
      role={role}
      style={{...style,viewTransitionName:vtName}}
      className={cn(
        "quest-row flex items-center w-full px-3 py-1 rounded-sm cursor-pointer",
        "hover:bg-secondary/20 transition-colors",
        isActive && "bg-primary/10 text-primary-foreground",
        isFocused && "ring-2 ring-ring"
      )}
      onClick={()=>onClick(quest.id)}
    >
      <span className="truncate">{quest.name}</span>
    </div>
  );
};
export const QuestRow = memo(Row);
