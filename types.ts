
export enum UserRole {
  ADMIN = 'Admin',
  SCHEDULER = 'Scheduler',
  PURCHASER = 'Purchaser',
  BUSINESS = 'Business'
}

export interface User {
  username: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

// 1. Users_Roles
export interface UserRoleRow {
  username: string;
  role: UserRole;
}

// 2. ERP_Raw_Data
export interface ERPRawRow {
  id: string; 
  model: string;
  workOrder: string;
  partNumber: string;
  partName: string;
  specification: string;
  supplier: string;
  shortageQty: number;
  requiredDate: string; // Deprecated in logic, but kept for raw type
  uploadBatch: string;
}

// 3. Tracking_Schedule
export interface TrackingRow {
  id: string; 
  model: string;
  workOrder: string;
  productPartNumber?: string; // Product Part Number (品號 - 半成品)
  partNumber: string; // Component Part Number (料號 - 欠料)
  partName: string;
  specification: string;
  stage: 'SMT' | 'Assembly' | 'Packing';
  
  vendor: string;
  supplier: string;
  shortageQty: number; // Quantity
  
  // DATES & STATUS
  productionDate?: string; // ADDED: Imported from WO Detail (生產日期)
  oqcDate: string; // Manually set by Scheduler (成品客驗/出貨日)
  isMaterialReady: boolean;

  purchaserReplyDate: string;
  purchaserRemark: string;
  
  status: 'Pending' | 'Confirmed' | 'Late' | 'Ready';
  purchaserUsername: string;

  isArchived: boolean;
}

// 4. Reference_Data
export interface ReferenceRow {
  type: string;
  value: string;
}

export interface SheetDatabase {
  usersRoles: UserRoleRow[];
  erpRawData: ERPRawRow[];
  trackingSchedule: TrackingRow[];
  referenceData: ReferenceRow[];
}
