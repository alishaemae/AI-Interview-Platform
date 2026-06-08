import { create } from 'zustand';

const useInterviewStore = create((set) => ({
  currentInterview: null,
  currentTask: null,
  code: '',
  language: 'python',
  chatMessages: [],
  testResults: null,

  setInterview: (interview) => set({ currentInterview: interview }),
  setTask: (task) => set({ currentTask: task }),
  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),
  addChatMessage: (msg) => set((state) => ({
    chatMessages: [...state.chatMessages, msg]
  })),
  setChatMessages: (messages) => set({ chatMessages: messages }),
  setTestResults: (results) => set({ testResults: results }),

  reset: () => set({
    currentInterview: null,
    currentTask: null,
    code: '',
    language: 'python',
    chatMessages: [],
    testResults: null,
  }),
}));

export default useInterviewStore;
