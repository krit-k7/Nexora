<div align="center">

# ⬡ NEXORA PROTOCOL

### *Sovereign Infrastructure for Trustless Cross-Chain Automation*

> Cryptographic certainty. Zero trust. Infinite interoperability.

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://nexora-mu-beryl.vercel.app/)
[![Demo Video](https://img.shields.io/badge/🎬_Full_Walkthrough-Google_Drive-000000?style=for-the-badge&logo=googledrive&logoColor=white)](https://drive.google.com/file/d/1CuDCoJ5bQqvDinPmUCBDK1gz97_HtXD1/view)
[![GitHub](https://img.shields.io/badge/📦_Source_Code-GitHub-000000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/krit-k7/Nexora)
[![License](https://img.shields.io/badge/License-MIT-000000?style=for-the-badge)](./LICENSE)

</div>

---

## 📖 Table of Contents

- [What is Nexora?](#-what-is-nexora)
- [Core Features](#-core-features)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [UI Preview](#-ui-preview)
- [Smart Contracts](#-smart-contract-deployments-stellar-testnet)
- [Verified Testnet Addresses](#-verified-testnet-addresses)
- [Protocol Identity & RBAC](#-protocol-identity--rbac)
- [Local Development](#-local-development)
- [Documentation](#-documentation)
- [Dashboard & Analytics](#-dashboard--analytics)
- [Roadmap](#-next-phase-evolutions-post-mvp)
- [License & Credits](#-license--credits)

---

## ✦ What is Nexora?

**Nexora** is a production-grade, enterprise-ready protocol designed to **define, verify, and automate cross-chain logic with cryptographic certainty**. By eliminating centralized middlemen from state attestation, Nexora delivers a zero-trust orchestration layer secured by the Stellar network and autonomous SNARK batching.

> No intermediaries. No assumptions. Just math.

Users write a simple logic rule → Nexora proves it on-chain using zero-knowledge proofs → the protocol executes the resulting action automatically, without oracles or manual intervention.

---

## ✦ Core Features

| Feature | Description |
|---|---|
| 🔋 **Gas Abstraction Service** | Automated balance deduction and simulated escrow — execute logic without juggling gas tokens |
| ♾️ **Zero-Knowledge Proofs** | Integrated **snarkjs & circom** for verifiable off-chain computation and batching |
| 🏛️ **Role-Based Identity** | Dedicated dashboards for **Developers**, **Node Operators**, and **DAO Admins** with automated admin promotion |
| 🪪 **Sovereign Profile** | Centralized management of identity metadata, DIDs, and synchronization across session logins |
| ⏱️ **Chronos Engine** | Autonomous scheduled & event-based triggers via verifiable external data feeds |
| 💎 **3D Sovereign Interface** | A hardware-accelerated, glassmorphism-inspired UI featuring dynamic telemetry and high-fidelity aesthetics |

---

## ✦ Architecture

Nexora is built as a layered pipeline: a rule is **defined**, cryptographically **verified** off-chain, and then **executed** on-chain — with no oracle or intermediary in the loop.

```mermaid
flowchart TD
    subgraph Client["👤 Client Layer"]
        U[User / DAO Admin]
        FE["Frontend — Next.js 14\nFramer Motion · TailwindCSS"]
        FW["Freighter Wallet"]
    end

    subgraph Logic["🧠 Logic Definition Layer"]
        LA["Logic Architect\nRule Builder"]
        LR["Logic Registry Contract\n(Soroban)"]
    end

    subgraph Proof["♾️ Zero-Knowledge Layer"]
        BE["Backend API\nNode.js · Express"]
        CI["Circom Circuits\nGroth16"]
        SJ["snarkjs Prover"]
        PV["Proof Verifier Contract\n(Soroban)"]
    end

    subgraph Exec["⚡ Execution Layer"]
        ER["Execution Router Contract\n(Soroban)"]
        CH["Chronos Engine\nScheduled / Event Triggers"]
        RN["Relayer Node Network"]
    end

    subgraph Data["🗄️ Data & Telemetry"]
        DB[("MongoDB\n(Mongoose)")]
        SK["Socket.io\nReal-time Telemetry"]
    end

    U -->|Connects wallet| FW
    FW -->|Authenticates| FE
    FE -->|1. Define rule| LA
    LA -->|2. Register logic| LR
    LR -->|Stores predicate| BE

    BE -->|3. Generate witness| CI
    CI -->|4. Compute proof| SJ
    SJ -->|5. Submit proof| PV
    PV -->|6. Verify on-chain| ER

    CH -->|Triggers evaluation| BE
    RN -->|Relays signed txns| ER
    ER -->|7. Execute action| U

    BE <-->|Persist state| DB
    BE -->|Live updates| SK
    SK -->|Push telemetry| FE

    classDef layer fill:#000000,stroke:#ffffff,stroke-width:1px,color:#ffffff
    classDef contract fill:#ffffff,stroke:#000000,stroke-width:1.5px,color:#000000
    class FE,FW,LA,BE,CI,SJ,CH,RN,DB,SK layer
    class LR,PV,ER contract
```

**Flow summary:**

1. **Define** — A user (Developer, Node Operator, or DAO Admin) authenticates via Freighter and defines a Smart Predicate through the Logic Architect.
2. **Verify** — The rule is compiled into a Circom circuit, a Groth16 proof is generated via `snarkjs`, and the proof is verified on-chain by the Proof Verifier contract.
3. **Execute** — Once verified, the Execution Router contract autonomously triggers the target action — no oracle, no manual signer, no middleman.
4. **Observe** — Every step streams to the frontend in real time over Socket.io, so telemetry, proofs, and execution status are always visible.

For the full system design, consensus model, and database schema, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## ✦ Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                       NEXORA STACK                           │
├─────────────────┬───────────────────────────────────────────┤
│  Frontend       │  Next.js 14 · Framer Motion · TailwindCSS │
│                 │  Socket.io-client · Glassmorphism Design  │
├─────────────────┼───────────────────────────────────────────┤
│  Backend        │  Node.js · Express · MongoDB (Mongoose)   │
│                 │  snarkjs (ZK-SNARK Prover) · Socket.io    │
├─────────────────┼───────────────────────────────────────────┤
│  Blockchain     │  Stellar Testnet · Soroban Smart Contracts│
│                 │  Freighter Wallet Integration             │
├─────────────────┼───────────────────────────────────────────┤
│  Cryptography   │  Circom 2.1 (Circuits) · Ed25519          │
│                 │  Groth16 Proof Verification               │
└─────────────────┴───────────────────────────────────────────┘
```

---

## ✦ UI Preview

<div align="center">

> The Nexora Interface — A clean, high-fidelity command center designed for cryptographic precision.
<table>
  <tr>
    <td><<img width="400" alt="image" src="https://github.com/user-attachments/assets/b8ab72b9-e193-4bbf-ae29-2479f687566f" />
</td>
    <td><<img width="400" alt="image" src="https://github.com/user-attachments/assets/851e10cc-c2c1-4532-8941-56861f811ef9" />
</td>
  </tr>
  <tr>
    <td><img width="400" alt="image" src="https://github.com/user-attachments/assets/42f9c47f-92f0-438d-9cec-bfa079c40593" />
</td>
    <td><img width="400" alt="image" src="https://github.com/user-attachments/assets/2b010905-8a9d-4550-be81-c6caa3e66fe2" />
</td>
  </tr>
  <tr>
    <td><img width="400" alt="image" src="https://github.com/user-attachments/assets/617c4b2a-8d89-4d85-8e17-5a8f7e9cf5ac" />
</td>
    <td><img width="400" alt="image" src="https://github.com/user-attachments/assets/241850c0-c585-4630-999c-0ef6aab4ebc8" />
</td>
  </tr>
</table>

</div>

---

## ✦ Verified Testnet Addresses

The following Stellar Testnet wallets have verifiably interacted with the Nexora Protocol. Inspect any on [Stellar Expert](https://stellar.expert/explorer/testnet).

```
GB3Q3R3W3CS6BF3MCF3UH2Q3X6NWGPXU55LBXKXGJT5QHYQUNIL4WTBG
GB6U7APEDEHKWVXDTVO4UE5E3UDSMEOKB3DCLJ4PMAY3ABSOFK7PBUD7
GB5ZDX52U37QX4YSK4M4KA7LG7D42DXDBCRGRPQ5GPK42MFVBEGGPQQV
GA23DEPEOPIH6ZU2KC25WE3AAV37BNE2RKCEOLVLAKINFID2XLUEG6BI
GA3SFMGCV3JJ5UBZAY6OIOQHCCP33N4CDRTRI53KQHJ3DIHZXAGW4NHC
GCBOJCFQBP5INN3ACBZYUVOH3RJBMC2IYAGPYFMAM5J3PBFBIOG6GVMK
GDKV3HUVCYDUDERC6FVUSYFCZCT5UPQLNEZYF7PZ2JPT2LQK2ZKA37BE
GAJLCBFAR2RKQ5R2BJV2LAC2G3BQDQOZJELWAKX4LFQUPJBVH2WA6FB7
GB5W5XZSOJ2MSSEAM262YN4MHJOWBYV3QRYUBQ2T3VJK7H5JGA2GF6JA
GAV5URBSIROK7Q7LYOONGGOCANBH56DPO4K7ZKTJ5BRF4C55HDQPG2HF
```

## ✦ Smart Contract Deployments (Stellar Testnet)

Nexora's core architecture relies on the following Soroban Smart Contracts deployed to the Stellar Testnet:

- **Execution Router Contract:** `CC6ZZ464E3YHRRNFAQ5CXJWA7PLCSLPNQ2SPUQ2LJUSAYB3GZEVU7RTM`
- **Logic Registry Contract:** `CCPHWXKVAM74QTLBHSOQAZJDDGHACTY6QMW5SOHSITP4NCLK2PDHFOXE`
- **Proof Verifier Contract:** `CDTFPR5BX5J77YEZQU5QLI6CYRFREEVE4XTE3K5QDAEG6YAOR6J7CNC6`

---

## ✦ Smart Contract IDs (Soroban)

The following core protocol contracts are deployed on the **Stellar Testnet**.

| Contract | Contract ID |
|---|---|
| **Logic Registry** | `CB6FTILLJ3WMRL6YEDUO6H4F6YQ54EA6PRZVHLOAAVK5G5V2AHA4K4CT` |
| **Proof Verifier** | `CAFBXDITV3RPOWZXGYXRZUJD2HND2HVRVOFLKYWMBY7CRJG4PKRGQ7RZ` |
| **Execution Router** | `CBTD2KTXY22MZ5BTU7QU5H7G3H3I5PHSV3A66VHX7KGAY5POTI3K6AM5` |

---

## ✦ Protocol Identity & RBAC

Nexora implements a sovereign identity model where your wallet is your passport. Access is governed by specific protocol roles with **automated profile synchronization**:

- **🏛️ System Administrator**: Automatic promotion for the configured Admin Wallet. Full governance oversight and global Kill Switch access.
- **👨‍💻 Developer**: Access to the Developer Portal, API Key management, and Sandbox environments.
- **📡 Node Operator**: Access to real-time network telemetry, health monitoring, and staking metrics.
- **🏛️ DAO Admin**: Protocol governance oversight and multi-sig rule approval.
- **👤 Guest**: Explore the protocol with public analytics and global telemetry.

---

## ✦ Local Development

### Prerequisites

- **Node.js** v18+
- **MongoDB** (local or Atlas)
- **Freighter Wallet** browser extension

### Quickstart

```bash
# 1. Clone the repo
git clone https://github.com/krit-k7/Nexora.git
cd Nexora

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ../sdk && npm install && npm run build

# 3. Setup ZK Circuits
cd ../circuits
chmod +x compile_zk.sh
./compile_zk.sh
```

### Environment Variables

**`backend/.env`**
```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/Nexora
JWT_SECRET=your_super_secret_jwt_key
STELLAR_NETWORK=TESTNET
ADMIN_WALLET_ADDRESS=your_stellar_public_key
```

**`frontend/.env.local`**
```env
NEXT_PUBLIC_API_BASE=http://localhost:5001
```

### Run

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Connect Freighter and start orchestrating.

---

## ✦ Documentation

| Document | Description |
|---|---|
| 📐 [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System design, consensus models, and full database schema |

---

#### 1. Improve UX/UI and product stability
To ensure a premium, intuitive experience, we made significant visual and structural upgrades:
- **Refined User Flow:** Smoother page transitions and reduced click-depth for core actions.
- **Optimized Aesthetics:** Improved color contrast, typography weights, and added a highly requested dark mode option.
- **Enhanced Stability:** Resolved minor edge cases related to cross-chain state synchronization.

#### 2. Optimize onboarding experience
We drastically lowered the barrier to entry for non-technical users entering the Web3 space:
- **Quick Start Guide:** A comprehensive guide immediately available upon first login.
- **Gamified Onboarding:** A step-by-step interactive flow to build the first Smart Predicate.
- **Expanded Support:** Added contextual tooltips and an expanded FAQ section for immediate help.

### 3. Feedback Questionnaire
Beyond standard usability metrics, users were asked:
1. **Is there any feature you think this product is lacking?**
2. **Did you find any bugs/errors/issues while using this app?**
3. **Do you think this dApp is able to solve the issue it's targeting (Cross-chain automation)?**
4. **How intuitive is the Smart Predicate builder for non-technical users?**


### 🚀 Next Phase Evolutions (Post-MVP)

Based on the extensive user feedback and telemetry collected during the Level 5 testing phase, we have clearly identified our roadmap for the next evolution of Nexora. Our focus will shift toward expanding cross-chain compatibility, increasing the accessibility of the Logic Architect, and decentralizing the relay nodes further.

**Planned Improvements & Feature Roadmap:**
1. **Multi-Chain Wallet Connect:** Allow users to authenticate not just with Freighter (Stellar), but also via MetaMask and Rabby for seamless EVM integration.
2. **Visual Blueprint Builder:** Users noted the Logic Architect has a learning curve. We plan to build a "drag-and-drop" visual builder for Smart Predicates so users do not need to write raw JSON configuration files. (Feedback mapped from: *UI can be more intuitive*)
3. **Decentralized Relay Incentives:** Introduce a staking mechanism for the Active Relayer Nodes (currently simulating 1,292 nodes) so third parties can actively earn Protocol Revenue.
4. **Mobile Responsive Dashboard:** Optimize the high-fidelity UI for mobile devices to allow DAO admins to monitor telemetry on the go. (Feedback mapped from: *Enhance the mobile responsiveness*).

*(Note: The foundational architecture to support these upcoming improvements was laid down in commit [`60a3b5e`](https://github.com/MEGHA3112/Nexora) during our final layout refactoring).*

## ✦ Dashboard & Analytics

Here is a look at the real-time Nexora dashboards running on the Stellar Testnet:

### Transaction Activity (Logic Architect)
<img width="1915" height="951" alt="image" src="https://github.com/user-attachments/assets/96a697a5-8a53-4a45-b3a4-b2ca95c6d819" />


### Real-Time Telemetry & Protocol Analytics
![Analytics Dashboard](./frontend/public/screenshots/screen2.png)

### 📊 Note on Testnet Data Aggregation

Because Nexora is currently running on the Stellar Testnet and doesn't have a live mainnet contract pulling real-world USD deposits yet, the data for **Active Relayer Nodes**, **Global TVL**, and **Protocol Revenue** is dynamically calculated to simulate mainnet scale based on the *real* number of Proofs in the database.

For demonstration purposes, the database is seeded with 10,000 Proofs. The backend takes that real database count and calculates the metrics proportionally:

- **TVL:** Calculated as 10,000 proofs × $142,000 average locked per batch = **$1.42 Billion**
- **Revenue:** Calculated as 10,000 proofs × $18 fee per proof = **$180,000**
- **Relayer Nodes:** Calculated as 10,000 proofs ÷ 8 = **1,292 active nodes** supporting the load.
- **Finality Time:** Hardcoded to **0.84s** because that is the actual real-world average finality time of the Stellar Network.

This means if the protocol generates another 5,000 proofs, those numbers will automatically scale up in real-time, making it perfectly functional for testing and presentations!

---

## ✦ License & Credits

<div align="center">

Built with ❤️ and cryptographic conviction for a **decentralized future.**

*Nexora Protocol — Where trust is a proof, not a promise.*

</div>

<!-- End of README -->

<!-- testnet expansion -->

<!-- integration guide final -->

Licensed under [MIT](./LICENSE)

</div>
