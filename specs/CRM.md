# CRM — Specifications

Purpose: Manage clients from lead to signed contract.

**Core principle:** Everything starts with the client.

## Leads

- **Sources:** Fixed list (Website, Referral, Cold call, Social media, Event, Walk-in) + "Other" (freetext)
- **Fields:** Name, Email, Phone, Source, Company name, Expected value, Assigned owner
- **Statuses:** New → Contacted → Qualified → Proposal Sent → Won → Converted
  - Dead leads get: Lost / Unqualified
- **Conversion:** Manual only. Agent clicks "Convert" and either creates a new Company + Contact from the lead's data, or attaches it to an existing Company (warn if duplicate email/phone exists)
- **Duplicates:** Warn (not block) when adding a lead/contact with an existing email or phone

## Companies

- Flat structure — no parent/child companies
- **Fields:** Name, Industry, Company size, Website, Phone, Email, Address, VAT/Tax ID, Status (active/inactive/lead/potential), Owner, Tags, Notes
- Can hold multiple open deals at once

## Contacts

- **Requirement:** Every contact belongs to a company
- **Fields:** Name, Email, Phone, Position/Job title, Department, Primary contact (flag), Assigned owner
- A company can have many contacts; one can be marked "Primary"

## Deal Pipeline

- **View:** Kanban board (drag deals between stages)
- **Stages:** Lead → Qualified → Proposal Sent → Negotiation → Won/Verbal agreement → Lost
- **Fields:** Name, Company, Contact, Value, Expected close date, Probability (editable per stage), Assigned owner, Notes

## Proposals (unified with Finance "Quotes")

- A Proposal and a Quote are the same document — used by both CRM and Finance
- **Fields:** Linked deal & client, Line items, Total (auto-calculated), Validity period, Status, Terms & notes, Approval & recipient, PDF/attachment
- **Statuses:** Draft → Sent → Accepted → Rejected / Expired
- Built from a **reusable price catalog** (services/items in Settings)
- **Contract creation:** Manual — agent clicks "Create Contract" from an accepted proposal

## Contracts

- **Fields:** Auto contract number, Linked proposal, Client company, Start/End date, Value, Status, Signed copy (PDF), Terms & notes
- **Statuses:** Draft → Sent → Signed → Active → Completed → Terminated
- **Billing types:** Fixed price, Hourly, Monthly retainer (all supported per contract)
- **Renewal:** Tracked (reminder before expiry); renew manually by creating a new contract
- **Project creation:** Manual — agent clicks "Create Project" from a signed contract

## Follow-ups

- **Types:** Call, Email, WhatsApp, Meeting
- **Fields:** Linked client, Linked deal, Due date, Type, Notes, Status (pending/done/overdue), Assigned owner
- **Auto reminders:** System suggests/schedules follow-ups (e.g. after sending a proposal, before proposal expiry)

## Meeting Notes

- **Fields:** Title, Date, Attendees (contacts), Linked company/deal, Notes, Action items (with owner & date), Summary

## Client Profile (360° view)

Shows for one company: Company + contacts, Deals, Proposals, Contracts, Projects, Invoices & payments, Meeting notes, Follow-ups, Recent activity

## General CRM rules

- **Activity log:** every change on leads/deals/proposals/contracts is recorded (who + when)
- **Deletion:** records are archived, never hard-deleted
- **Global search:** one search box across companies, contacts, deals, proposals, contracts (by name/email/phone)
- **Notifications:**
  - Proposal sent → client notified (email/WhatsApp)
  - Follow-up due/overdue → owner reminded
  - Contract expiring → owner reminded
  - Proposal accepted / contract signed → won alert

## Flow

```
Lead (New → Contacted → Qualified)
    ↓  Convert (manual) → Company + Contact
Deal Pipeline (Kanban)
    ↓
Proposal sent → Accepted
    ↓  Create Contract (manual)
Contract Signed → Active
    ↓  Create Project (manual) → Projects module
```
