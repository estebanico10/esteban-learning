import { create } from 'zustand';
import { type Profile } from '../lib/db';
import { persist } from 'zustand/middleware';
import type { Node, Edge } from 'reactflow';

export interface LearnedNode {
  id: string; // The topic ID
  topic: string;
  category?: string; // Rama padre (e.g. Aritmética, Física)
  grandParentCategory?: string; // Rama abuela (e.g. Matemáticas, Ciencias)
  masteryLevel: number; // 1 to 100
  xp: number;
  lastReviewed: Date;
}

export interface LearnState {
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  apiKey: string | null;
  profile: Profile | null;
  setApiKey: (key: string) => void;
  setProfile: (profile: Profile) => void;
  
  learnedNodes: LearnedNode[];
  updateNodeProgress: (topic: string, xpEarned: number, masteryIncrease: number, category?: string, grandParent?: string) => void;
  totalXP: number;
  
  // Knowledge Tree Persistence
  treeNodes: Node[];
  treeEdges: Edge[];
  setTreeItems: (nodes: Node[], edges: Edge[]) => void;

  dailyQuote: { text: string, author: string, context: string } | null;
  setDailyQuote: (quote: { text: string, author: string, context: string }) => void;
}

const initialTreeNodes: Node[] = [
  { id: '1', position: { x: 400, y: 100 }, data: { label: 'Fundamentos de Aprendizaje' } }
];

export const useStore = create<LearnState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (t) => set({ theme: t }),
      apiKey: localStorage.getItem('gemini_api_key'),
      profile: null,
      setApiKey: (key) => {
        localStorage.setItem('gemini_api_key', key);
        set({ apiKey: key });
      },
      setProfile: (profile) => set({ profile }),
      
      learnedNodes: [],
      totalXP: 0,
      
      treeNodes: initialTreeNodes,
      treeEdges: [],
      setTreeItems: (nodes, edges) => set({ treeNodes: nodes, treeEdges: edges }),
      
      updateNodeProgress: (topic, xpEarned, masteryIncrease, category, grandParent) => set((state) => {
        const existingNode = state.learnedNodes.find(n => n.topic.toLowerCase() === topic.toLowerCase());
        let updatedNodes = [...state.learnedNodes];
        
        if (existingNode) {
          existingNode.xp += xpEarned;
          existingNode.masteryLevel = Math.min(100, existingNode.masteryLevel + masteryIncrease);
          existingNode.lastReviewed = new Date();
          // Update categories si se proveyeron y estaban vacias (backward compat)
          if(category) existingNode.category = category;
          if(grandParent) existingNode.grandParentCategory = grandParent;
        } else {
          updatedNodes.push({
            id: crypto.randomUUID(),
            topic,
            category,
            grandParentCategory: grandParent,
            xp: xpEarned,
            masteryLevel: masteryIncrease,
            lastReviewed: new Date()
          });
        }
        return { 
          learnedNodes: updatedNodes,
          totalXP: state.totalXP + xpEarned
        };
      }),

      dailyQuote: null,
      setDailyQuote: (quote) => set({ dailyQuote: quote })
    }),
    {
      name: 'learnos-v2-storage', 
    }
  )
);
