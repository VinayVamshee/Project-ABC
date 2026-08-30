# People / Business Contacts Module Migration

This plan outlines the steps to migrate ABC's disparate identity models (Customer, LedgerContact) into a unified, strictly-typed `BusinessContact` domain model.

## User Review Required

> [!WARNING]
> This is a major architectural change involving data migration and changing the core schemas of Orders, Sales, Inventory, and Ledger. Please review the migration strategy carefully. 

## Open Questions

> [!NOTE]
> - For unifying existing `Customer` and `LedgerContact` records, we will use `phone` as the primary key to merge records if the same person exists in both collections. Is this acceptable?
> - `loyaltyPoints` and `balances` are currently stored on the models. Should we keep `loyaltyPoints` in `customerDetails` (updated via sales), and `balances` updated via ledger triggers, or strictly calculate them on the fly? (The prompt suggests *not* storing duplicate totals, so we will omit balances and calculate on the fly where possible, while potentially preserving loyalty points if it's already a complex calculation).

## Proposed Changes

### Models

#### [NEW] server/models/BusinessContact.js
Create the new strictly typed model containing:
- Shared properties: `name`, `businessName`, `contactPerson`, `phone`, `alternatePhone`, `email`, `address`, `city`, `state`, `pincode`, `categories` (enum array), `gstNumber`, `panNumber`, `notes`, `tags`, `profileImage`, `status`.
- Specific detail objects: `customerDetails`, `workerDetails`, `supplierDetails`, `financierDetails`.

#### [DELETE] server/models/Customer.js
#### [DELETE] server/models/LedgerContact.js
These will be removed after migration.

#### [MODIFY] server/models/Sold.js, Order.js, Inventory.js, LedgerTransaction.js, LedgerObligation.js
Update the foreign keys (`customerId`, `workerId`, `wholeSellerId`, `providerId`, `receiverId`, etc.) to reference `BusinessContact` instead of `Customer` or `LedgerContact`.

### Controllers & APIs

#### [NEW] server/controllers/contactController.js & server/routes/contactRoutes.js
- `GET /api/contacts` (with filters for categories, status, pagination)
- `GET /api/contacts/search` (optimized compact search for selling/order UI)
- `POST /api/contacts` (creating a new unified contact)
- `GET /api/contacts/:id`, `PATCH /api/contacts/:id`, `PATCH /api/contacts/:id/status` (soft delete)

#### [MODIFY] server/index.js
Mount the new `/api/contacts` route. Remove legacy `/api/customers` and ledger contact routes if applicable.

#### [MODIFY] server/controllers/soldController.js, orderController.js, inventoryController.js, ledgerController.js
Update references in populate commands to fetch from `BusinessContact`. Update creation logic to use `BusinessContact`.

### Data Migration

#### [NEW] server/scripts/migrateToBusinessContacts.js
An idempotent script to:
1. Fetch all `Customer` and `LedgerContact` records.
2. Merge duplicates based on `phone` and insert into `BusinessContacts`.
3. Update all existing `Inventory`, `Order`, `Sold`, and `Ledger` records to point to the newly generated `BusinessContact` `_id`.

### Frontend

#### [NEW] client/src/pages/People/People.js & People.css
Create the dedicated professional UI with tabs (All, Customers, Workers, Wholesellers, Suppliers, Financiers, Businessmen, Other) that filter based on categories.

#### [NEW] client/src/pages/People/AddPerson.js
Full page dedicated form with conditional UI sections (Customer Info, Worker Info, etc.) based on the selected categories.

#### [NEW] client/src/pages/People/PersonDetail.js
Detailed view of a contact showing overview, and relevant tabs (Sales, Orders, Purchases, Ledger) based on category.

#### [MODIFY] client/src/App.js & Sidebar.js
Add the `/people` route and sidebar navigation link.

#### [MODIFY] client/src/pages/Sold/Sold.js & Order/Order.js
Implement the new `GET /api/contacts/search` inline lookup for customers/workers, with a small drawer/inline modal to create a new customer without leaving the sale/order flow.

## Verification Plan

### Automated Tests
- N/A - we will verify via manual endpoint testing.

### Manual Verification
1. Run the migration script and manually check MongoDB collections to ensure zero orphaned records.
2. Verify that creating a Sale with an existing customer correctly links the `BusinessContact`.
3. Verify that adding a "Customer" during checkout seamlessly inserts them into `BusinessContacts` and updates the sale form.
4. Verify that Ledger balances and transactions still render correctly on the frontend using the new referenced model.
