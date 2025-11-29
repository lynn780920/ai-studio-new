
import { ERPRawRow, SheetDatabase, TrackingRow, UserRole, UserRoleRow } from '../types';
import { INITIAL_DB } from './mockData';

export interface ISheetService {
  login(username: string): Promise<{ user: UserRoleRow, role: UserRole } | null>;
  searchTracking(workOrder: string): Promise<TrackingRow[]>;
  updateDeliveryDate(rowId: string, newDate: string): Promise<boolean>;
  updatePurchaserRemark(rowId: string, remark: string): Promise<boolean>;
  updateStageDate(workOrder: string, stage: string, field: 'oqcDate', newDate: string): Promise<boolean>;
  updateStageReady(workOrder: string, stage: string, isReady: boolean): Promise<boolean>;
  archiveModel(modelName: string, isArchived: boolean): Promise<boolean>; 
  importWODetails(data: { workOrder: string; model: string; vendor: string; stage?: string; productPartNumber?: string; productionDate?: string }[]): Promise<boolean>;
  importShortages(data: Omit<ERPRawRow, 'id'>[], mode?: 'replace' | 'merge'): Promise<boolean>;
  getAllERP(): Promise<ERPRawRow[]>;
  getUsers(): Promise<UserRoleRow[]>;
  addUser(user: UserRoleRow): Promise<boolean>;
  deleteUser(username: string): Promise<boolean>;
}

class MockSheetService implements ISheetService {
  private db: SheetDatabase;

  constructor() {
    const saved = localStorage.getItem('mock_sheet_db');
    this.db = saved ? JSON.parse(saved) : INITIAL_DB;
  }

  private save() {
    localStorage.setItem('mock_sheet_db', JSON.stringify(this.db));
  }

  async login(username: string) {
    await new Promise(r => setTimeout(r, 600));
    const userMap = this.db.usersRoles.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (userMap) {
      return { user: userMap, role: userMap.role };
    }
    return null;
  }

  async searchTracking(workOrder: string) {
    await new Promise(r => setTimeout(r, 100));
    const saved = localStorage.getItem('mock_sheet_db');
    if (saved) {
      this.db = JSON.parse(saved);
    }
    return this.db.trackingSchedule;
  }

  private calculateStatus(row: TrackingRow): 'Pending' | 'Confirmed' | 'Late' | 'Ready' {
      if (row.isMaterialReady) return 'Ready';
      if (!row.purchaserReplyDate) return 'Pending';
      return 'Confirmed';
  }

  async updateDeliveryDate(rowId: string, newDate: string) {
    const row = this.db.trackingSchedule.find(r => r.id === rowId);
    if (row) {
      row.purchaserReplyDate = newDate;
      row.status = this.calculateStatus(row);
      this.save();
      return true;
    }
    return false;
  }

  async updatePurchaserRemark(rowId: string, remark: string) {
    const row = this.db.trackingSchedule.find(r => r.id === rowId);
    if (row) {
      row.purchaserRemark = remark;
      this.save();
      return true;
    }
    return false;
  }

  async updateStageDate(workOrder: string, stage: string, field: 'oqcDate', newDate: string) {
    let updated = false;
    this.db.trackingSchedule.forEach(row => {
      if (row.workOrder === workOrder && row.stage === stage) {
        if (field === 'oqcDate') row.oqcDate = newDate;
        row.status = this.calculateStatus(row);
        updated = true;
      }
    });
    if (updated) {
      this.save();
      return true;
    }
    return false;
  }

  async updateStageReady(workOrder: string, stage: string, isReady: boolean) {
    let updated = false;
    this.db.trackingSchedule.forEach(row => {
      if (row.workOrder === workOrder && row.stage === stage) {
        row.isMaterialReady = isReady;
        row.status = this.calculateStatus(row);
        updated = true;
      }
    });
    if (updated) {
      this.save();
      return true;
    }
    return false;
  }

  async archiveModel(modelName: string, isArchived: boolean) {
    const targetModel = modelName.trim().toLowerCase();
    this.db.trackingSchedule.forEach(row => {
      if (row.model.trim().toLowerCase() === targetModel) {
        row.isArchived = isArchived;
      }
    });
    this.save();
    return true;
  }

  // IMPORT LOGIC: PREVENT DUPLICATES
  async importShortages(data: Omit<ERPRawRow, 'id'>[], mode: 'replace' | 'merge' = 'replace') {
    await new Promise(r => setTimeout(r, 500));
    
    // Group incoming data by WO
    const incomingByWO: Record<string, typeof data> = {};
    data.forEach(d => {
       if (!incomingByWO[d.workOrder]) incomingByWO[d.workOrder] = [];
       incomingByWO[d.workOrder].push(d);
    });

    const targetWOs = Object.keys(incomingByWO);

    // MODE 1: REPLACE (Card 2) - Dangerous but Clean
    // For each WO in the new list, DELETE ALL existing rows for that WO, then insert new ones.
    if (mode === 'replace') {
        // 1. Remove existing rows for these WOs (including Skeletons and old shortages)
        this.db.trackingSchedule = this.db.trackingSchedule.filter(row => !targetWOs.includes(row.workOrder));

        // 2. Add new rows
        const newRows: TrackingRow[] = [];
        data.forEach((d, i) => {
           // Try to find preserved metadata (Model, Vendor) from what we just deleted? 
           // Ideally, we should have kept it. But simpler: relying on WO Details import for metadata.
           // BETTER STRATEGY: Find if there was any metadata before deleting, or expect metadata in this import?
           // Current assumption: Shortage List doesn't have Vendor/Stage info usually.
           // So we need to preserve the "Skeleton Info" (Model, Vendor, Stage) if possible.
           
           // Let's refine: Find existing info FIRST.
           let inherited: any = {};
           // We can't find it if we deleted it. So let's look at the DB before filter.
           // (This is getting complex. Let's stick to the user's workflow: Import WO Details FIRST (Sets metadata), then Import Shortages).
           
           // If we deleted everything, we lost the Model/Vendor info if it was only in the DB.
           // However, if the user follows "1. Import WO Details -> 2. Import Shortages", the DB has the info.
           // We should find the info, delete the rows, then re-create with info.
        });
        
        // REVISED REPLACE LOGIC:
        // 1. Map existing metadata for target WOs
        const metadataMap: Record<string, {model: string, vendor: string, stage: any, prodDate: string, productPN: string}> = {};
        this.db.trackingSchedule.forEach(r => {
            if (targetWOs.includes(r.workOrder)) {
                if (!metadataMap[r.workOrder]) {
                    metadataMap[r.workOrder] = {
                        model: r.model,
                        vendor: r.vendor,
                        stage: r.stage,
                        prodDate: r.productionDate || '',
                        productPN: r.productPartNumber || ''
                    };
                }
            }
        });

        // 2. Delete rows
        this.db.trackingSchedule = this.db.trackingSchedule.filter(row => !targetWOs.includes(row.workOrder));

        // 3. Add new rows with metadata
        data.forEach((d, i) => {
            const meta = metadataMap[d.workOrder] || { model: 'Unknown', vendor: '', stage: 'SMT', prodDate: '', productPN: '' };
            newRows.push({
                id: `track-${Date.now()}-${i}`,
                model: d.model || meta.model, // If Shortage has model, use it, else inherit
                workOrder: d.workOrder,
                partNumber: d.partNumber,
                partName: d.partName,
                specification: d.specification,
                supplier: d.supplier,
                shortageQty: d.shortageQty,
                stage: meta.stage,
                vendor: meta.vendor,
                productPartNumber: meta.productPN,
                productionDate: meta.prodDate,
                oqcDate: '',
                isMaterialReady: false,
                purchaserReplyDate: '',
                purchaserRemark: '',
                status: 'Pending',
                purchaserUsername: '',
                isArchived: false
            });
        });
        this.db.trackingSchedule.push(...newRows);
    } 
    
    // MODE 2: MERGE (Card 3) - Safe
    else if (mode === 'merge') {
        const existingMap = new Map<string, TrackingRow>();
        this.db.trackingSchedule.forEach(row => existingMap.set(`${row.workOrder}-${row.partNumber}`, row));

        // Update or Add
        data.forEach(d => {
            const key = `${d.workOrder}-${d.partNumber}`;
            const existing = existingMap.get(key);
            
            if (existing) {
                // Update Qty only
                existing.shortageQty = d.shortageQty;
                existing.status = existing.shortageQty === 0 ? 'Ready' : existing.status;
                // Preserve purchaser info (don't touch)
            } else {
                // Add new
                // Need metadata
                const sibling = this.db.trackingSchedule.find(r => r.workOrder === d.workOrder);
                const meta = sibling || { model: 'Unknown', vendor: '', stage: 'SMT', productionDate: '', productPartNumber: '' };
                
                this.db.trackingSchedule.push({
                    id: `track-merge-${Date.now()}-${Math.random()}`,
                    model: meta.model,
                    workOrder: d.workOrder,
                    partNumber: d.partNumber,
                    partName: d.partName,
                    specification: d.specification,
                    supplier: d.supplier,
                    shortageQty: d.shortageQty,
                    stage: meta.stage,
                    vendor: meta.vendor,
                    productPartNumber: meta.productPartNumber,
                    productionDate: meta.productionDate,
                    oqcDate: '',
                    isMaterialReady: false,
                    purchaserReplyDate: '',
                    purchaserRemark: '',
                    status: 'Pending',
                    purchaserUsername: '',
                    isArchived: false
                });
            }
        });

        // Handle resolved items (in DB but not in new list)?
        // For 'Merge', we usually assume the new list contains ALL current shortages.
        // So if something is missing in new list, it means qty = 0.
        // Let's implement that:
        const incomingKeys = new Set(data.map(d => `${d.workOrder}-${d.partNumber}`));
        this.db.trackingSchedule.forEach(row => {
            if (targetWOs.includes(row.workOrder)) {
                const key = `${row.workOrder}-${row.partNumber}`;
                if (!incomingKeys.has(key) && row.partNumber !== 'WO_INFO_ONLY') {
                    row.shortageQty = 0;
                    row.status = 'Ready';
                }
            }
        });
    }

    this.save();
    return true;
  }

  async importWODetails(data: { workOrder: string; model: string; vendor: string; stage?: string; productPartNumber?: string; productionDate?: string }[]) {
    await new Promise(r => setTimeout(r, 500));
    let updatedCount = 0;
    
    data.forEach(info => {
      const exists = this.db.trackingSchedule.some(row => row.workOrder === info.workOrder);
      let s = info.stage?.trim() || 'SMT';
      if (s === '打件') s = 'SMT';
      if (s === '組裝') s = 'Assembly';
      if (s === '包裝') s = 'Packing';

      if (!exists) {
         // Create Skeleton
         const skeleton: TrackingRow = {
             id: `skel-${Date.now()}-${Math.random()}`,
             model: info.model,
             workOrder: info.workOrder,
             vendor: info.vendor,
             stage: s as any,
             productPartNumber: info.productPartNumber,
             productionDate: info.productionDate,
             partNumber: 'WO_INFO_ONLY', 
             partName: '', specification: '', supplier: '', shortageQty: 0, oqcDate: '', isMaterialReady: false, purchaserReplyDate: '', purchaserRemark: '', status: 'Ready', purchaserUsername: '', isArchived: false
         };
         this.db.trackingSchedule.push(skeleton);
         updatedCount++;
      } else {
        // Update existing rows (Merge Metadata)
        this.db.trackingSchedule.forEach(row => {
            if (row.workOrder === info.workOrder) {
                if (info.model) row.model = info.model;
                if (info.vendor) row.vendor = info.vendor;
                if (info.productPartNumber) row.productPartNumber = info.productPartNumber;
                if (info.productionDate) row.productionDate = info.productionDate;
                if (info.stage) row.stage = s as any;
                updatedCount++;
            }
        });
      }
    });

    if (updatedCount > 0) {
      this.save();
      return true;
    }
    return false; // No changes or just updates
  }

  async getAllERP() { return this.db.erpRawData; }
  async getUsers() { return [...this.db.usersRoles]; }
  async addUser(user: UserRoleRow) {
    if (this.db.usersRoles.some(u => u.username.toLowerCase() === user.username.toLowerCase())) return false;
    this.db.usersRoles.push(user);
    this.save();
    return true;
  }
  async deleteUser(username: string) {
    const initialLen = this.db.usersRoles.length;
    this.db.usersRoles = this.db.usersRoles.filter(u => u.username !== username);
    const success = this.db.usersRoles.length < initialLen;
    if (success) this.save();
    return success;
  }
}

export const sheetService = new MockSheetService();
