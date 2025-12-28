# TGB Order Tracking System - Deployment Instructions

## Overview

The order tracking system has been added to your GitHub Pages website. This document provides instructions for completing the setup by deploying the Google Apps Script backend.

---

## What's Been Added

### Frontend Files (Already Deployed to GitHub Pages)

| File | URL | Description |
|------|-----|-------------|
| `track.html` | https://thegoldblessing.com/track.html | Order tracking page |
| `layaway.html` | https://thegoldblessing.com/layaway.html | LayAway status page |
| `invoice.html` | https://thegoldblessing.com/invoice.html | Invoice lookup page |
| `css/tgb-system.css` | - | Styles matching your site's green & gold theme |
| `js/tgb-api.js` | - | API connection script |

### Navigation Updated

The homepage navigation now includes links to "Track Order" and "LayAway".

---

## Step 1: Deploy Google Apps Script Web App

### 1.1 Open Your TGB ORDER Spreadsheet

1. Go to your TGB ORDER Google Spreadsheet
2. Click **Extensions** → **Apps Script**

### 1.2 Create the WebAppAPI.gs File

1. In the Apps Script editor, click the **+** next to "Files"
2. Select **Script**
3. Name it `WebAppAPI`
4. Delete any existing code in the file
5. Copy and paste the entire contents of `GOOGLE_APPS_SCRIPT_WebAppAPI.gs` (included in the repository)

### 1.3 Deploy as Web App

1. Click **Deploy** → **New Deployment**
2. Click the gear icon next to "Select type" and choose **Web App**
3. Configure the deployment:
   - **Description**: TGB Order Tracking API
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**
5. Click **Authorize access** and grant the necessary permissions
6. **Copy the Web App URL** (it looks like: `https://script.google.com/macros/s/XXXXX/exec`)

---

## Step 2: Update the API URL in Your Website

### 2.1 Edit js/tgb-api.js

1. Go to your GitHub repository: https://github.com/Maldipia/thegoldblessing
2. Navigate to `js/tgb-api.js`
3. Click the pencil icon to edit
4. Find this line:
   ```javascript
   const API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
   ```
5. Replace `YOUR_DEPLOYMENT_ID` with your actual Web App URL
6. Commit the changes

---

## Step 3: Test the System

### 3.1 Test API Connection

Visit your Web App URL with `?action=ping` to verify it's working:
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=ping
```

You should see:
```json
{"success":true,"message":"TGB API is running","timestamp":"..."}
```

### 3.2 Test Order Tracking

1. Go to https://thegoldblessing.com/track.html
2. Enter a valid Order ID from your spreadsheet
3. Verify the order details are displayed correctly

### 3.3 Test LayAway Status

1. Go to https://thegoldblessing.com/layaway.html
2. Enter a LayAway Order ID
3. Verify the balance, due date, and progress are displayed

---

## API Endpoints Reference

| Action | URL | Description |
|--------|-----|-------------|
| `ping` | `?action=ping` | Test API connectivity |
| `track` | `?action=track&orderId=XXX` | Track order by ID |
| `layaway` | `?action=layaway&orderId=XXX` | Get LayAway status |
| `invoice` | `?action=invoice&orderId=XXX` | Get invoice link |
| `dashboard` | `?action=dashboard` | Get admin dashboard data |
| `orders` | `?action=orders&page=1&limit=20` | Get orders list |

---

## Troubleshooting

### "Unable to connect" Error

- Verify the Web App URL is correct in `js/tgb-api.js`
- Ensure the Web App is deployed with "Anyone" access
- Check that you've authorized the script

### "Order not found" Error

- Verify the Order ID exists in one of these sheets: STRAIGHT PAYMENT, COD, COP, LAY AWAY, WALK IN
- Check that the Order ID is in Column C of the spreadsheet
- Order IDs are case-insensitive

### CORS Issues

Google Apps Script Web Apps handle CORS automatically when deployed with "Anyone" access. If you see CORS errors, redeploy the Web App.

---

## SSL Certificate Note

If the SSL certificate has expired:

1. Go to GitHub repo → **Settings** → **Pages**
2. Uncheck and re-check **"Enforce HTTPS"**
3. If using a custom domain, remove and re-add it
4. Wait 10-15 minutes for SSL to provision

---

## Files Reference

```
thegoldblessing/
├── index.html                    (updated navigation)
├── track.html                    (NEW - order tracking)
├── layaway.html                  (NEW - LayAway status)
├── invoice.html                  (NEW - invoice lookup)
├── css/
│   └── tgb-system.css           (NEW - system styles)
├── js/
│   └── tgb-api.js               (NEW - API connection)
├── GOOGLE_APPS_SCRIPT_WebAppAPI.gs  (Backend code to deploy)
└── DEPLOYMENT_INSTRUCTIONS.md    (This file)
```

---

## Support

If you encounter any issues, check:
1. Browser console for JavaScript errors
2. Network tab for API response errors
3. Apps Script execution logs for backend errors

---

**Deployment Complete!** Your order tracking system is now ready to use.
