# TGB ORDER SYSTEM - COMPLETE DOCUMENTATION
## Version 2.0 | December 2024

---

# 📋 TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [File Structure](#file-structure)
3. [File Descriptions](#file-descriptions)
4. [System Flow Diagrams](#system-flow-diagrams)
5. [Function Reference](#function-reference)
6. [Configuration Guide](#configuration-guide)
7. [Troubleshooting](#troubleshooting)

---

# 🏗️ SYSTEM OVERVIEW

## What is TGB ORDER System?

A comprehensive Google Apps Script system for **The Gold Blessing** jewelry business that handles:
- 📄 Invoice creation and sending
- 📦 Order tracking and notifications
- 💰 LayAway payment management
- 📊 Business analytics dashboard
- 🔄 Data extraction and sync
- 📦 Automated backups
- 🔗 External integrations (SMS, webhooks)

## Connected Spreadsheets

| Spreadsheet | ID | Purpose |
|-------------|----|---------| 
| **TGB ORDER** (Main) | `1YnkcqUy0osdaZbt2LGXQDWLpKiWdC0W0JB6Zfe02Oe0` | Main order management |
| **GBSR Payment** | `1pJX9eGft4NZaU33ZV7nRlzdCByt7703kFT3vIet04hg` | Payment verification source |
| **LBC Tracking** | `1OBkdAi8O1U-4-kmFBY78VnqhAHAjbtq5tZth7EoUtgY` | Shipping/tracking data |
| **Inventory** | `1R4GOtQQimCZIqOVx0yeK83UmLmBMERU0Z7w4efpbxMQ` | Product inventory |

## Sheet Tabs in TGB ORDER

| Tab Name | Purpose |
|----------|---------|
| STRAIGHT PAYMENT | Full payment orders |
| COD | Cash on Delivery orders |
| COP | Cash on Pickup orders |
| LAY AWAY | Installment payment orders |
| WALK IN | Walk-in customer orders |
| Error Log | System error tracking |
| Activity Log | User activity tracking |

---

# 📁 FILE STRUCTURE

## Total Files: 22

```
TGB ORDER Apps Script Project
├── 📜 SCRIPT FILES (.gs) - 16 files
│   ├── config.gs                 # Configuration & IDs
│   ├── SHaredUtils.gs            # Common functions (MASTER)
│   ├── UnifiedMenu.gs            # Main menu (onOpen)
│   ├── CreateLiveInvoice.gs      # Invoice document creation
│   ├── INvoiceSent.gs            # Invoice email sending
│   ├── Tracking.gs               # Tracking email system
│   ├── LBCtrackingSync.gs        # LBC tracking sync
│   ├── LayAway.gs                # LayAway management
│   ├── OrderForm.gs              # Order form processing
│   ├── v2extractor.gs            # Data extraction from GBSR
│   ├── dashboard.gs              # Dashboard functions
│   ├── EnhancedDashboard.gs      # Enhanced dashboard with charts
│   ├── Admintools.gs             # Admin utilities
│   ├── errorhandling.gs          # Error logging
│   ├── performanceUtils.gs       # Performance & caching
│   ├── AutoBackUp.gs             # Automated backup system
│   └── ExternalIntegration.gs    # SMS & webhook integrations
│
└── 📄 HTML FILES (.html) - 6 files
    ├── Dashboard.html            # Basic dashboard UI
    ├── Healthcheck.html          # System health UI
    ├── TrackingTemplate.html     # Tracking email template
    ├── OrderFormHTML.html        # Customer order form
    ├── EmailFooter.html          # Green theme email footer
    └── EnhancedDashboard.html    # Charts dashboard UI (if separate)
```

---

# 📝 FILE DESCRIPTIONS

## 🔧 CORE CONFIGURATION

### config.gs
**Purpose:** Central configuration file with all IDs and settings

**Contains:**
- Spreadsheet IDs (SS_ID, ORDER_SS_ID, LBC_SPREADSHEET_ID, INVENTORY_SPREADSHEET_ID)
- Invoice template IDs (COD, COP, LA20, LA50, STRAIGHT, WALK IN)
- Invoice folder IDs
- Column index mappings
- Admin email
- Delivery day estimates

**Key Variables:**
```javascript
var SS_ID = '1pJX9eGft4NZaU33ZV7nRlzdCByt7703kFT3vIet04hg';
var ORDER_SS_ID = '1YnkcqUy0osdaZbt2LGXQDWLpKiWdC0W0JB6Zfe02Oe0';
var LBC_SPREADSHEET_ID = '1OBkdAi8O1U-4-kmFBY78VnqhAHAjbtq5tZth7EoUtgY';
var INVENTORY_SPREADSHEET_ID = '1R4GOtQQimCZIqOVx0yeK83UmLmBMERU0Z7w4efpbxMQ';
var ADMIN_EMAIL = 'admin@yourdomain.com';
```

---

### SHaredUtils.gs ⭐ MASTER UTILITY FILE
**Purpose:** Single source of truth for all shared functions

**Contains:**
| Function | Purpose |
|----------|---------|
| `buildInvoiceData()` | Build invoice object from row data |
| `findColumnIndex()` | Find column by header name |
| `safeToString()` | Safe string conversion |
| `parseAmount()` | Parse currency amounts |
| `isValidEmail()` | Validate email format |
| `isValidPhone()` | Validate PH phone numbers |
| `formatCurrency()` | Format as Philippine Peso |
| `formatDatePH()` | Format date PH style |
| `getGreenThemeFooter()` | Get email footer HTML |
| `logActivity()` | Log to Activity Log sheet |
| `sendAdminNotification()` | Send admin alerts |
| `getSheetSafe()` | Safe sheet retrieval |
| `generateUniqueId()` | Generate unique order IDs |

**Why Important:** All other files call these functions instead of having duplicates.

---

## 📋 MENU SYSTEM

### UnifiedMenu.gs ⭐ MASTER MENU
**Purpose:** Creates all menus - ONLY file with `onOpen()`

**Menu Structure:**
```
💎 TGB SYSTEM
├── 📊 Analytics Dashboard
├── 🏥 System Health Check
├── 📄 Invoice
│   ├── Send Invoice (This Row)
│   ├── Send All Pending Invoices
│   ├── Create Invoice (This Row)
│   ├── Create All Missing Invoices
│   └── Sync Invoice Data
├── 📦 Tracking
│   ├── Send Tracking (This Row)
│   ├── Send All Unsent Tracking
│   ├── Sync from LBC Sheet
│   └── Check Tracking Status
├── 💰 LayAway
│   ├── Sync This LayAway
│   ├── Sync All LayAways
│   ├── Send Reminders
│   └── Check Overdue
├── 🔧 Admin Tools
│   ├── Clean Duplicate Links
│   ├── Detect Duplicates
│   ├── Reconcile Inventory
│   ├── View Error Log
│   └── Clear Error Log
├── 📦 Backup
│   ├── Create Backup Now
│   ├── View Backup Status
│   ├── Setup Auto-Backup
│   └── Remove Auto-Backup
├── 🔗 Integrations
│   ├── Integration Status
│   ├── Test SMS
│   └── Configure Integrations
├── 🔗 Quick Links
│   ├── Open Inventory Sheet
│   ├── Open Payment Sheet
│   └── Open LBC Sheet
└── ❓ Help & Guide

📥 Extractor
├── Extract from GBSR
├── Smart Extract (Auto-Detect)
├── Extractor Settings
└── Extractor Help
```

---

## 📄 INVOICE SYSTEM

### CreateLiveInvoice.gs
**Purpose:** Creates invoice documents from templates

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `createInvoiceForCurrentRow()` | Create invoice for selected row |
| `createAllMissingInvoices()` | Bulk create missing invoices |
| `createInvoiceFromTemplate()` | Generate doc from template |

**Flow:**
```
Row Data → Select Template → Copy Template → Fill Data → Save to Folder → Update Column O
```

**Templates Used:**
- COD/COP: `1RwCIw_jyHEeSWX6m0A1-XYQNren1cOcRytPhJG7HAx0`
- LA20: `19IXbIOQTiqxp7BWpFMrkpKci-W9_YZBRGV33f3puEzc`
- LA50: `1AcBi0ogagiX0z-bgm1k1rMuyRS6qiXCU5ZItuIDbET0`
- STRAIGHT/WALK IN: `1qpYedukyPzE3gRaI0CoU92bHLXrInSHsrrc46wJ6fwg`

---

### INvoiceSent.gs
**Purpose:** Sends invoice emails to customers

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `sendInvoiceThisRow()` | Send invoice for current row |
| `sendInvoiceEmailsPending()` | Bulk send pending invoices |
| `testInvoice()` | Test invoice sending |
| `sendInvoiceEmail()` | Core email sending function |
| `createInvoiceHTML()` | Generate email HTML |

**Email Contains:**
- Customer name & Order ID
- Invoice link (from Column O)
- Payment methods link
- Terms & Conditions link
- Raffle entry confirmation
- Green theme footer with business network

**Columns Used:**
- Column B: EMAIL
- Column C: ORDER ID
- Column D: FB NAME
- Column E: RECEIVER FULL NAME
- Column O: INVOICE LINK
- Column P: INVOICE STATUS (updates to "SENT")

---

## 📦 TRACKING SYSTEM

### Tracking.gs
**Purpose:** Sends tracking notification emails

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `sendTrackingThisRow()` | Send tracking for current row |
| `sendTrackingBulkUnsent()` | Bulk send unsent tracking |
| `processTrackingRowFixed()` | Process single tracking row |
| `determineLocationFixed()` | Detect Metro Manila vs Provincial |
| `calculateDatesFixed()` | Calculate delivery estimates |

**Email Contains:**
- Customer name & Order ID
- LBC tracking number
- Delivery location (Metro Manila/Provincial)
- Estimated delivery date
- Track package button
- Green theme footer

**Columns Used:**
- Column B: EMAIL
- Column C: ORDER ID
- Column E: RECEIVER NAME
- Column J: REGION
- Column K: CITY
- Column Q: TRACKING NUMBER
- Column R: TRACKING STATUS (updates to "SENT")

---

### LBCtrackingSync.gs
**Purpose:** Auto-sync tracking numbers from LBC sheet

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `setupLBCTrackingSyncTrigger()` | Setup auto-sync trigger |
| `onLBCEdit()` | Trigger on LBC sheet edit |
| `syncTrackingToOrderSheet()` | Sync tracking to order |
| `manualSyncAllTracking()` | Manual bulk sync |

**Sync Logic:**
```
LBC Sheet Column D (Tracking) + Column E (Recipient)
        ↓ Match by Recipient Name
TGB ORDER Column R (Tracking)
```

---

## 💰 LAYAWAY SYSTEM

### LayAway.gs
**Purpose:** Manages installment payment orders

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `syncThisLayaway()` | Sync current row calculations |
| `syncAllLayaways()` | Bulk sync all LayAways |
| `checkAndSendReminders()` | Send payment reminders |
| `calculateLayawayValues()` | Calculate fees & balances |

**LayAway Columns (T-AN):**
| Column | Purpose |
|--------|---------|
| T | Downpayment % |
| U | Downpayment Amount |
| V | Balance Due |
| W | Due Date |
| X | Days Remaining |
| Y | LayAway Status |
| Z | Service Fee % |
| AA | Service Fee Amount |
| AB | Total with Service |
| AC | Reminder Sent |
| AD | Last Reminder Date |
| AN | Invoice Template (LA20/LA50) |

**Options:**
- **LA50 (Option A):** 50% downpayment, 5% service fee
- **LA20 (Option B):** 20% downpayment, 10% service fee

---

## 📊 DASHBOARD SYSTEM

### dashboard.gs
**Purpose:** Basic dashboard functions

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `showDashboard()` | Open dashboard dialog |
| `showHealthCheck()` | Open health check dialog |
| `getDashboardMetrics()` | Get business metrics |
| `getSystemHealth()` | Get system health data |

---

### EnhancedDashboard.gs
**Purpose:** Advanced dashboard with Chart.js

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `showEnhancedDashboard()` | Open enhanced dashboard |
| `getEnhancedMetrics()` | Get detailed metrics |
| `getSalesChartData()` | Get sales trend data |
| `getPaymentMethodBreakdown()` | Payment method stats |

**Features:**
- Revenue charts
- Order trends
- Payment method breakdown
- Inventory status
- Real-time metrics

---

## 🛠️ ADMIN & UTILITIES

### Admintools.gs
**Purpose:** Administrative utilities

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `cleanDuplicateInvoiceLinks()` | Remove duplicate invoice links |
| `detectDuplicates()` | Find duplicate orders |
| `reconcileInventoryWithOLDSP()` | Reconcile inventory data |

---

### errorhandling.gs
**Purpose:** Error logging and alerts

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `logError()` | Log error to Error Log sheet |
| `isCriticalError()` | Check if error is critical |
| `sendErrorAlert()` | Send admin alert email |
| `safeExecute()` | Wrap function with error handling |

---

### performanceUtils.gs
**Purpose:** Caching and performance

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `getCachedData()` | Get/set cached data |
| `clearCache()` | Clear cache |
| `batchUpdateColumn()` | Batch update operations |

---

## 📦 BACKUP SYSTEM

### AutoBackUp.gs
**Purpose:** Automated backup system

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `runManualBackup()` | Create backup now |
| `runDailyBackup()` | Daily backup (11:59 PM) |
| `runWeeklyBackup()` | Weekly backup (Sunday) |
| `setupBackupTriggers()` | Setup auto-backup |
| `removeBackupTriggers()` | Remove auto-backup |
| `viewBackupStatus()` | View backup status |

**Backup Schedule:**
- Daily: 11:59 PM (incremental)
- Weekly: Sunday (full backup)

---

## 🔗 EXTERNAL INTEGRATIONS

### ExternalIntegration.gs
**Purpose:** SMS and webhook integrations

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `sendSMS()` | Send SMS via Semaphore |
| `testSMS()` | Test SMS sending |
| `sendWebhook()` | Send webhook notification |
| `showIntegrationStatus()` | View integration status |
| `showIntegrationConfig()` | Configure integrations |

**Supported Services:**
- Semaphore (SMS)
- Zapier (webhooks)
- Make.com (webhooks)

---

## 📥 DATA EXTRACTION

### v2extractor.gs
**Purpose:** Extract data from GBSR Payment sheet

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `smartExtract()` | Auto-detect and extract |
| `extractToStraightPayment()` | Extract to STRAIGHT PAYMENT |
| `extractToCOD()` | Extract to COD |
| `extractToLayAway()` | Extract to LAY AWAY |

**Flow:**
```
GBSR Payment Sheet → Detect Payment Type → Copy to Correct Tab in TGB ORDER
```

---

### OrderForm.gs
**Purpose:** Process customer order form submissions

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `doGet()` | Serve order form HTML |
| `processOrder()` | Process form submission |
| `sendOrderConfirmation()` | Send confirmation email |

---

## 📄 HTML TEMPLATES

### Dashboard.html
Basic dashboard UI with Material Design Lite

### Healthcheck.html
System health check UI

### TrackingTemplate.html
Tracking email template with:
- Order details
- Tracking number display
- Delivery estimates
- Track button
- Green theme footer

### OrderFormHTML.html
Customer-facing order form

### EmailFooter.html
Reusable green theme footer with:
- Contact section (Facebook, Email, Website)
- Business network links (TGB, TYG, Luntian, Sole Blessing, AST3R, Must Have Corner)
- Brand section

---

# 🔄 SYSTEM FLOW DIAGRAMS

## Order Processing Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NEW ORDER RECEIVED                            │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Order Form / GBSR Extract / Manual Entry                           │
│  → Data goes to appropriate sheet tab                               │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: CREATE INVOICE                                             │
│  CreateLiveInvoice.gs → Creates PDF → Saves link to Column O        │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: SEND INVOICE EMAIL                                         │
│  INvoiceSent.gs → Sends email with invoice link → Column P = SENT   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: PAYMENT RECEIVED                                           │
│  Update Column N (Payment Status)                                   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: SHIP ORDER                                                 │
│  Add tracking number to LBC sheet → Auto-syncs to Column Q          │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: SEND TRACKING EMAIL                                        │
│  Tracking.gs → Sends tracking email → Column R = SENT               │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ORDER COMPLETE ✓                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## LayAway Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAYAWAY ORDER CREATED                                              │
│  → Goes to LAY AWAY sheet                                           │
│  → Column AN = LA20 or LA50                                         │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  SYNC LAYAWAY CALCULATIONS                                          │
│  LayAway.gs → Calculates fees, balance, due date                    │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  CREATE & SEND INVOICE                                              │
│  Uses LA20 or LA50 template based on Column AN                      │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PAYMENT REMINDERS                                                  │
│  Day 57: First reminder                                             │
│  Day 87: Final reminder                                             │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  COMPLETION                                                         │
│  Full payment received → Status = COMPLETED → Ship order            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Extraction Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  GBSR PAYMENT SHEET                                                 │
│  Contains raw payment/order data                                    │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  V2EXTRACTOR.GS                                                     │
│  Smart Extract → Detects payment type                               │
└─────────────────────────────────────────────────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ STRAIGHT PAYMENT│  │   COD / COP     │  │    LAY AWAY     │
│     Sheet       │  │     Sheet       │  │     Sheet       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

# 📚 FUNCTION REFERENCE

## Most Used Functions

| Function | File | Purpose |
|----------|------|---------|
| `onOpen()` | UnifiedMenu.gs | Creates menus on spreadsheet open |
| `sendInvoiceThisRow()` | INvoiceSent.gs | Send invoice for current row |
| `sendTrackingThisRow()` | Tracking.gs | Send tracking for current row |
| `createInvoiceForCurrentRow()` | CreateLiveInvoice.gs | Create invoice document |
| `syncThisLayaway()` | LayAway.gs | Sync LayAway calculations |
| `smartExtract()` | v2extractor.gs | Extract data from GBSR |
| `showEnhancedDashboard()` | EnhancedDashboard.gs | Open analytics dashboard |
| `runManualBackup()` | AutoBackUp.gs | Create backup |

## Utility Functions (from SHaredUtils.gs)

| Function | Purpose | Example |
|----------|---------|---------|
| `buildInvoiceData(headers, row)` | Build invoice object | `const data = buildInvoiceData(headers, rowData);` |
| `findColumnIndex(headers, name)` | Find column index | `const col = findColumnIndex(headers, 'EMAIL');` |
| `safeToString(value)` | Safe string conversion | `const str = safeToString(cell);` |
| `parseAmount(value)` | Parse currency | `const amt = parseAmount('₱12,500');` |
| `isValidEmail(email)` | Validate email | `if (isValidEmail(email)) {...}` |
| `formatCurrency(amount)` | Format as peso | `const price = formatCurrency(12500);` |
| `formatDatePH(date, format)` | Format date | `const dateStr = formatDatePH(new Date(), 'long');` |
| `logActivity(action, details)` | Log activity | `logActivity('Invoice Sent', orderId);` |

---

# ⚙️ CONFIGURATION GUIDE

## Initial Setup Checklist

- [ ] Update `ADMIN_EMAIL` in config.gs
- [ ] Verify all spreadsheet IDs are correct
- [ ] Setup backup triggers: TGB SYSTEM → Backup → Setup Auto-Backup
- [ ] Test invoice sending with `testInvoice()`
- [ ] Configure SMS (if using): Add Semaphore API key

## Column Mapping (TGB ORDER Sheet)

| Column | Letter | Purpose |
|--------|--------|---------|
| 1 | A | DATE |
| 2 | B | EMAIL |
| 3 | C | ORDER ID |
| 4 | D | FB NAME |
| 5 | E | RECEIVER FULL NAME |
| 6 | F | FULL ADDRESS |
| 7 | G | CONTACT NUMBER |
| 8 | H | PAYMENT METHOD |
| 9 | I | SPECIAL REQUEST |
| 10 | J | REGION |
| 11 | K | CITY |
| 12 | L | VIP ID |
| 13 | M | RAFFLE ENTRY |
| 14 | N | PAYMENT STATUS |
| 15 | O | INVOICE LINK |
| 16 | P | INVOICE STATUS |
| 17 | Q | TRACKING NUMBER |
| 18 | R | TRACKING EMAIL STATUS |
| 19 | S | NOTES |
| 20-40 | T-AN | LAYAWAY COLUMNS |

---

# 🔧 TROUBLESHOOTING

## Common Issues

### "Function not found" Error
**Cause:** Function name mismatch or file not saved
**Solution:** 
1. Save all files (Ctrl+S)
2. Refresh spreadsheet
3. Check function name spelling

### Invoice Not Sending
**Cause:** Missing email or invoice link
**Solution:**
1. Check Column B has valid email
2. Check Column O has invoice link
3. Run `testInvoice()` to test

### Tracking Sync Not Working
**Cause:** Recipient name mismatch
**Solution:**
1. Ensure LBC Column E matches TGB ORDER Column E exactly
2. Run `manualSyncAllTracking()` for bulk sync

### Dashboard Shows No Data
**Cause:** Sheet name mismatch
**Solution:**
1. Verify sheet is named "TGB ORDER" or update dashboard.gs
2. Check inventory spreadsheet ID is correct

### Duplicate Function Error
**Cause:** Same function defined in multiple files
**Solution:**
1. Use only SHaredUtils.gs for common functions
2. Remove duplicates from other files

---

# 📞 SUPPORT

**Developer Contact:** [Your contact info]
**Last Updated:** December 2024
**Version:** 2.0

---

# 📋 QUICK REFERENCE CARD

```
┌────────────────────────────────────────────────────────────────────┐
│                    TGB ORDER QUICK REFERENCE                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📄 INVOICE                        📦 TRACKING                      │
│  • Create: Menu → Invoice →        • Send: Menu → Tracking →       │
│    Create Invoice (This Row)         Send Tracking (This Row)      │
│  • Send: Menu → Invoice →          • Sync: Menu → Tracking →       │
│    Send Invoice (This Row)           Sync from LBC Sheet           │
│                                                                     │
│  💰 LAYAWAY                         📊 DASHBOARD                    │
│  • Sync: Menu → LayAway →          • Open: Menu → Analytics        │
│    Sync This LayAway                 Dashboard                     │
│  • Reminders: Menu → LayAway →                                     │
│    Send Reminders                                                   │
│                                                                     │
│  📦 BACKUP                          🔗 QUICK LINKS                  │
│  • Manual: Menu → Backup →         • Inventory: Menu → Quick       │
│    Create Backup Now                 Links → Inventory             │
│  • Auto: Menu → Backup →           • Payments: Menu → Quick        │
│    Setup Auto-Backup                 Links → Payment Sheet         │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│  KEYBOARD SHORTCUTS                                                 │
│  Ctrl+S = Save  |  F5 = Refresh  |  Ctrl+A = Select All            │
└────────────────────────────────────────────────────────────────────┘
```

---

**END OF DOCUMENTATION**
