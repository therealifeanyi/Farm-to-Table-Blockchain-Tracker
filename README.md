# 🌱 Farm-to-Table Blockchain Tracker

Welcome to a transparent supply chain solution powered by the Stacks blockchain! This Web3 project addresses the real-world problem of food traceability, where consumers often lack visibility into the origin, handling, and authenticity of ingredients. By using QR codes linked to immutable blockchain records, farmers, processors, distributors, retailers, and consumers can track ingredients from farm to table, reducing fraud, ensuring quality, and promoting sustainable practices.

## ✨ Features

📦 Register and track ingredient batches at every supply chain stage  
🔗 Immutable ledger for provenance and authenticity  
📱 QR code scanning for instant consumer verification  
👥 Role-based access for farmers, processors, distributors, and retailers  
✅ Compliance checks for organic or ethical standards  
⚠️ Alerts for tampering or irregularities  
💰 Incentive tokens for verified sustainable practices  
🔍 Public audit trails for transparency  

## 🛠 How It Works

This project leverages the Stacks blockchain and Clarity smart contracts to create a decentralized supply chain tracking system. Participants interact via a dApp or mobile app, logging data at each step. Consumers scan QR codes on products to view the full history.

The system involves 8 smart contracts for modularity, security, and scalability:

1. **UserRegistry.clar**: Manages user registration and roles (e.g., farmer, processor). Users must register with their STX address and provide verified credentials to participate.
   
2. **BatchRegistry.clar**: Allows farmers to create new ingredient batches (e.g., a lot of organic tomatoes) with initial details like origin, harvest date, and hash of supporting documents.

3. **SupplyChainStep.clar**: Logs each transformation or transfer step (e.g., processing, packaging). Each step requires the previous owner's signature and adds metadata like location and timestamp.

4. **QRCodeManager.clar**: Generates unique QR codes linked to batch IDs. It handles QR code minting as NFTs for tamper-proof association with physical products.

5. **VerificationEngine.clar**: Provides functions to verify the entire chain for a batch, checking for continuity, compliance, and no unauthorized changes.

6. **ComplianceChecker.clar**: Enforces rules like organic certification by integrating oracles or manual verifications, flagging non-compliant batches.

7. **IncentiveToken.clar**: Issues fungible tokens (e.g., based on SIP-010) to reward participants for sustainable practices, redeemable for perks or STX.

8. **AuditLog.clar**: Maintains an immutable log of all actions, accessible for public audits or disputes, ensuring accountability.

**For Producers (Farmers/Processors/Distributors)**

- Register your role via UserRegistry.
- Create a batch in BatchRegistry with details and a document hash.
- At each step, call SupplyChainStep to log updates and transfer ownership.
- Use QRCodeManager to generate a QR code for the final product.
- Earn tokens via IncentiveToken for verified eco-friendly actions.

**For Retailers**

- Receive batches via ownership transfer in SupplyChainStep.
- Attach QR codes and log final sale details.

**For Consumers**

- Scan the QR code to query VerificationEngine and view the full traceable history (e.g., farm location, processing dates, compliance status).
- Check AuditLog for any disputes or alerts.

**Integration Notes**

- Use SHA-256 hashes for off-chain data (e.g., photos, certificates) to keep on-chain costs low.
- Oracles can feed external data like GPS or weather for enhanced verification.
- Built with Clarity for security—deploy on Stacks testnet first!

This setup solves trust issues in food supply chains by making data tamper-proof and accessible, potentially reducing waste and boosting consumer confidence. Get started by cloning the repo and deploying the contracts! 🚀