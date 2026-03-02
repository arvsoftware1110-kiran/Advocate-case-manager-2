export interface Case {
  id: number;
  case_number: string;
  client_name: string;
  court: string;
  file_location: string;
  stage: string;
  created_at: string;
  // Award details
  award_passed_date?: string;
  copy_app_filed_date?: string;
  award_copy_received?: number;
  legal_opinion_given?: number;
  amount_received?: number;
  receipt_sent?: number;
  disposed_date?: string;
  hearing_date?: string;
  other_details?: string;
  next_posting_date?: string;
  // Filing details
  filing_details?: string;
  filed_on?: string;
  ref_number?: string;
  cf_number?: string;
  filing_other?: string;
  // Settlement details
  petitioner_advocate?: string;
  chance_for_settlement?: number; // 0 for No, 1 for Yes
  ca_received_date?: string;
  legal_opinion_sent_date?: string;
  case_type?: string;
  is_connected?: number; // 0 for No, 1 for Yes
  connected_case_number?: string;
  counsel_other_side?: string;
  appearing_for?: 'Petitioner' | 'Respondent' | 'Company' | 'R2' | 'R3' | 'R4' | 'R5';
  remarkable_case?: 'Yes' | 'No';
  remarkable_comments?: string;
  ws_filed?: 'Yes' | 'No';
  investigation_received?: 'Yes' | 'No';
  case_year?: string;
  immediate_action?: 'Yes' | 'No';
  immediate_action_remarks?: string;
  immediate_action_completed_date?: string;
}

export interface PriorityCase {
  id: number;
  case_number: string;
  purpose: string;
  remind_on: string;
  status: 'pending' | 'completed';
  created_at: string;
}

export interface Staff {
  id: number;
  staff_name: string;
  designation: string;
  mobile_number?: string;
  address: string;
  joined_on: string;
  relieved_on?: string;
  blood_group: string;
  created_at: string;
}

export interface Attendance {
  id: number;
  staff_name: string;
  punch_in_time?: string;
  punch_in_date: string;
  punch_out_time?: string;
  punch_out_date?: string;
  created_at: string;
}

export interface IORegister {
  id: number;
  type: 'Inward' | 'Outward';
  case_number: string;
  case_year: string;
  client_name: string;
  document_received: string;
  date: string; // inward_on or outward_on
  staff_name: string;
  via: string; // received_via or send_via
  ref_no: string;
  created_at: string;
}

export interface AllocateWork {
  id: number;
  case_number: string;
  staff_name: string;
  assign_date: string;
  complete_by_date: string;
  work_details: string;
  status: 'Pending' | 'Completed';
  remark?: string;
  actual_completion_date?: string;
  created_at: string;
}

export interface Master {
  id: number;
  category: 'Advocate' | 'Client' | 'Court' | 'Case Category' | 'Shelf';
  name: string;
  created_at: string;
}

export type CaseStage = 'Hearing' | 'Call On' | 'Evidence' | 'Steps' | 'Award Passed' | 'Disposed' | 'Other';

export const STAGES: CaseStage[] = [
  'Hearing',
  'Call On',
  'Evidence',
  'Steps',
  'Award Passed',
  'Disposed',
  'Other'
];
