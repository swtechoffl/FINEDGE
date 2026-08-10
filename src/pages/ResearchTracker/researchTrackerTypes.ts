export type CallType = "buy" | "sell";
export type CallStatus = "open" | "exited";

export interface ResearchCall {
  id: string;
  symbol: string;
  companyName: string;
  callType: CallType;
  callDate: string; // yyyy-mm-dd
  recommendedPrice: number;
  targetPrice: number;
  stopLoss: number | null;
  notes: string;
  status: CallStatus;
  exitPrice: number | null;
  exitDate: string | null; // yyyy-mm-dd
  createdAt: number;
  updatedAt: number;
}

// What the add/edit form collects — everything about a call except the
// bookkeeping fields (id, exit state, timestamps) that the tracker itself
// owns.
export type ResearchCallInput = Omit<
  ResearchCall,
  "id" | "status" | "exitPrice" | "exitDate" | "createdAt" | "updatedAt"
>;
