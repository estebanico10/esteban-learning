import { create } from 'zustand';
import { type Profile } from '../lib/db';
import { persist } from 'zustand/middleware';
import type { Node, Edge } from 'reactflow';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface LearnedNode {
  id: string; // The topic ID
  topic: string;
  category?: string; // Rama padre (e.g. Aritmética, Física)
  grandParentCategory?: string; // Rama abuela (e.g. Matemáticas, Ciencias)
  masteryLevel: number; // 1 to 100
  xp: number;
  lastReviewed: string; // Serialized Date
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

  // Firebase Auth & Sync
  user: User | null;
  setUser: (user: User | null) => void;
  isSyncing: boolean;
  lastSync: number | null;
  syncToCloud: () => Promise<void>;
  loadFromCloud: () => Promise<void>;
}

const initialTreeNodes: Node[] = [
  { id: '1', position: { x: 400, y: 100 }, data: { label: 'Fundamentos de Aprendizaje' } }
];

export const useStore = create<LearnState>()(
  persist(
    (set, get) => ({
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
      setTreeItems: (nodes, edges) => {
        set({ treeNodes: nodes, treeEdges: edges });
        get().syncToCloud();
      },
      
      updateNodeProgress: (topic, xpEarned, masteryIncrease, category, grandParent) => {
        const state = get();
        const existingNode = state.learnedNodes.find(n => n.topic.toLowerCase() === topic.toLowerCase());
        let updatedNodes = [...state.learnedNodes];
        
        if (existingNode) {
          existingNode.xp += xpEarned;
          existingNode.masteryLevel = Math.min(100, existingNode.masteryLevel + masteryIncrease);
          existingNode.lastReviewed = new Date().toISOString();
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
            lastReviewed: new Date().toISOString()
          });
        }
        
        set({ 
          learnedNodes: updatedNodes,
          totalXP: state.totalXP + xpEarned
        });
        
        get().syncToCloud();
      },

      dailyQuote: null,
      setDailyQuote: (quote) => set({ dailyQuote: quote }),

      // Firebase Sync Logic
      user: null,
      setUser: (user) => set({ user }),
      isSyncing: false,
      lastSync: null,

      syncToCloud: async () => {
        const { user, learnedNodes, totalXP, treeNodes, treeEdges, profile } = get();
        if (!user) return;

        set({ isSyncing: true });
        try {
          await setDoc(doc(db, "users", user.uid), {
            learnedNodes,
            totalXP,
            treeNodes,
            treeEdges,
            profile,
            lastUpdated: Date.now()
          }, { merge: true });
          set({ lastSync: Date.now() });
        } catch (error) {
          console.error("Error syncing to cloud:", error);
        } finally {
          set({ isSyncing: false });
        }
      },

      loadFromCloud: async () => {
        const { user } = get();
        if (!user) return;

        set({ isSyncing: true });
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            set({
              learnedNodes: data.learnedNodes || [],
              totalXP: data.totalXP || 0,
              treeNodes: data.treeNodes || initialTreeNodes,
              treeEdges: data.treeEdges || [],
              profile: data.profile || null,
              lastSync: data.lastUpdated || Date.now()
            });
          }
        } catch (error) {
          console.error("Error loading from cloud:", error);
        } finally {
          set({ isSyncing: false });
        }
      }
    }),
    {
      name: 'learnos-v2-storage',
      partialize: (state) => ({
        theme: state.theme,
        apiKey: state.apiKey,
        profile: state.profile,
        learnedNodes: state.learnedNodes,
        totalXP: state.totalXP,
        treeNodes: state.treeNodes,
        treeEdges: state.treeEdges
      })
    }
  )
);

// Listen for auth changes
onAuthStateChanged(auth, (user) => {
  useStore.getState().setUser(user);
  if (user) {
    useStore.getState().loadFromCloud();
  }
});
