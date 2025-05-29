
# Agent Name Service (ANS) Platform

**Author:** Ken Huang,  Vineeth Sai Narajala, Idan Habler, Akram Sheriff

## Project Introduction

The proliferation of AI agents requires robust mechanisms for secure discovery. This paper introduces the Agent Name Service (ANS), a novel architecture based on DNS addressing the lack of a public agent discovery framework. ANS provides a protocol-agnostic registry infrastructure that leverages Public Key Infrastructure (PKI) certificates for verifiable agent identity and trust. The architecture features several key innovations: a formalized agent registration and renewal mechanism for lifecycle management; DNS-inspired naming conventions with capability-aware resolution; a modular Protocol Adapter Layer supporting diverse communication standards (A2A, MCP, ACP etc.); and precisely defined algorithms for secure resolution. We implement structured communication using JSON Schema and conduct a comprehensive threat analysis of our proposal. The result is a foundational directory service addressing the core challenges of secured discovery and interaction in multi-agent systems, paving the way for future interoperable, trustworthy, and scalable agent ecosystems.

This project is a Next.js web application designed to demonstrate and explore the core concepts of an **Agent Name Service (ANS)**. It provides an interactive platform to visualize and experiment with key aspects of multi-agent systems, including:

*   **Agent Registration & Lifecycle:** How agents are registered with the ANS, including certificate issuance and renewal/revocation processes.
*   **Agent Name Service (ANS):** A system inspired by DNS for agent discovery, featuring an "ANS Agent Registry" where agents are listed with their capabilities, CA-issued certificates, and protocol details, and an "ANS Resolution" service to look up agents by their structured ANSName.
*   **Secure Agent Identity:** Demonstrating how PKI-issued certificates bind an agent's identity (ID, Public Key, ANSName/Endpoint).
*   **Capability-Aware Discovery (Conceptual):** While full capability-based searching isn't implemented, the ANSName structure itself embeds capability information.
*   **AI-Powered Offer Evaluation:** Leveraging Generative AI (via Genkit and Gemini) to evaluate and score capability offers from different agents, which could be discovered via ANS.

The platform aims to provide a tangible way to understand the dynamics of agent interactions within a structured ANS framework.

## Important: Demo Status and Future Improvements

**This project is currently a demonstration and proof-of-concept. It is NOT production-ready.**

Significant work is required to address security, scalability, and robustness before it could be considered for any real-world deployment. Key areas for future improvement include:

### Security Enhancements:
1.  **Secret Management:**
    *   Currently, API keys (like `GOOGLE_API_KEY`) are managed via `.env` files, and cryptographic keys (e.g., for the mock CA) are generated and stored in-memory or hardcoded.
    *   **Improvement:** Integrate a dedicated secret management solution (e.g., HashiCorp Vault, AWS Secrets Manager, Google Secret Manager) for securely storing and accessing all private keys, API keys, and other sensitive credentials.
2.  **Database Security (if RDBMS is used):**
    *   If evolving beyond SQLite to a production RDBMS, implement robust defenses against SQL injection vulnerabilities (e.g., parameterized queries, ORM best practices).
3.  **DDoS Attack Mitigation:**
    *   Implement rate limiting on API endpoints to prevent abuse and mitigate Denial of Service attacks.
    *   Consider using Web Application Firewalls (WAFs) and other infrastructure-level protections.
4.  **Comprehensive PKI Implementation:**
    *   The current CA and certificate issuance are highly simplified. A production system would require a robust PKI with proper certificate lifecycle management (revocation via CRL/OCSP), hardware security modules (HSMs) for CA keys, and adherence to PKI best practices.
5.  **Input Validation and Sanitization:**
    *   Enhance input validation on all API endpoints and user-facing forms to prevent common web vulnerabilities.

### Scalability and Robustness:
1.  **Production-Grade Database:**
    *   Replace the current SQLite implementation (which is file-based and primarily for single-node development) with a production-quality database system. Options include:
        *   **Distributed SQL/NoSQL Databases:** (e.g., PostgreSQL, MySQL with clustering, Cassandra, CockroachDB) for scalability and resilience.
        *   **Blockchain/Distributed Ledger Technology (DLT):** For scenarios requiring high immutability, transparency, and decentralized trust, though this comes with performance and complexity trade-offs.
2.  **Distributed Architecture:**
    *   Design the ANS services (Registry, Resolution) for distributed deployment to handle a large number of agents and requests (e.g., using microservices, load balancing, geographic distribution).
3.  **Caching Strategies:**
    *   Implement caching layers (e.g., Redis, Memcached) for frequently accessed data to improve resolution latency and reduce database load.
4.  **Asynchronous Processing:**
    *   For operations like complex AI evaluations or batch registrations, consider using message queues and background workers to improve responsiveness.
5.  **Monitoring and Logging:**
    *   Integrate comprehensive logging and monitoring to track system health, performance, and security events.

## Key Ideas (Agent Name Service - ANS)

The ANS platform is built around the following key ideas from the referenced paper:

1.  **Universal Agent Directory:** ANS provides a protocol-agnostic registry infrastructure for secure AI agent discovery.
2.  **PKI-Based Identity:** Leverages Public Key Infrastructure (PKI) certificates for verifiable agent identity and trust.
3.  **Lifecycle Management:** Formalized agent registration, renewal, and revocation mechanisms.
4.  **DNS-Inspired Naming:** Uses structured ANSNames (`Protocol://AgentID.agentCapability.Provider.vVersion.Extension`) for discovery.
5.  **Capability-Aware Resolution (Conceptual):** The ANSName itself embeds capability, and the system allows resolution based on these structured names.
6.  **Modular Protocol Support:** A conceptual Protocol Adapter Layer allows support for diverse communication standards (A2A, MCP, ACP, etc.), demonstrated here by storing protocol-specific data.
7.  **Secure Resolution Algorithms:** The platform demonstrates basic secure resolution by returning CA-signed agent certificates.

## Prerequisites

Before you begin, ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (version 18.x or later recommended)
*   [npm](https://www.npmjs.com/) (usually comes with Node.js) or [yarn](https://yarnpkg.com/)
*   SQLite3 (Ensure SQLite3 command-line tools are installed if you wish to inspect the `agent_registry.db` file directly. The application uses the `sqlite3` npm package which bundles its own binaries, so this might not be strictly necessary for running the app itself.)

## How to Run

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone https://github.com/appsec2008/https---github.com-appsec2008-ACNBP-Protocol.git # Replace with your actual repo URL
    cd your-repo-name # Replace with your actual repo directory
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up Environment Variables (for AI features):**
    The AI-powered offer evaluation features use Google's Gemini model via Genkit. To enable these, you need a Google AI API Key.
    *   Create a file named `.env` in the root directory of the project.
    *   Add your API key to this file:
        ```
        GOOGLE_API_KEY=YOUR_API_KEY_HERE
        ```
    *   Replace `YOUR_API_KEY_HERE` with your actual API key obtained from [Google AI Studio](https://aistudio.google.com/app/apikey).
    *   **Important:** The `.env` file should be in your `.gitignore` to prevent committing your API key.

4.  **Run the development server:**
    The application uses Next.js for the frontend and Genkit for AI flow management.
    *   **For Next.js (Frontend):**
        ```bash
        npm run dev
        # or
        yarn dev
        ```
        This will typically start the Next.js development server on `http://localhost:9002`.
        The first time you run the app, an `agent_registry.db` SQLite file will be created in the project root (or `/tmp/` in production-like Vercel builds).

    *   **For Genkit (AI Flows - if you want to inspect/develop flows locally):**
        In a separate terminal, you can run the Genkit development server:
        ```bash
        npm run genkit:dev
        # or use with watch mode
        npm run genkit:watch
        ```
        This starts the Genkit development UI, usually on `http://localhost:4000`, where you can inspect and test your AI flows. The Next.js application calls these flows directly as server actions, so running the Genkit server separately is primarily for development and debugging of the flows themselves.

5.  **Open your browser:**
    Navigate to `http://localhost:9002` (or the port specified in your terminal) to see the application.

## How to Contribute

Contributions are welcome! If you'd like to contribute to this project, please follow these general guidelines:

1.  **Fork the Repository:** Create your own fork of the project on GitHub.
2.  **Create a Branch:** For new features or bug fixes, create a new branch in your fork:
    ```bash
    git checkout -b feature/your-feature-name
    # or
    git checkout -b fix/your-bug-fix
    ```
3.  **Make Changes:** Implement your changes, adhering to the project's coding style and guidelines (e.g., Next.js, React, TypeScript, ShadCN UI, Tailwind CSS, Genkit).
4.  **Test Your Changes:** Ensure your changes don't break existing functionality and that new features work as expected.
5.  **Commit Your Changes:** Write clear and concise commit messages.
    ```bash
    git commit -m "feat: Add new ANS resolution parameter"
    ```
6.  **Push to Your Fork:**
    ```bash
    git push origin feature/your-feature-name
    ```
7.  **Open a Pull Request:** Submit a pull request from your fork's branch to the main repository's `main` branch. Provide a clear description of the changes you've made.

Please ensure your code is well-formatted and, if adding new features, consider if any documentation updates are needed.

## Referencing this Project

If you use this ANS Platform in your research or work, please consider citing the associated paper:

Huang, Ken, Vineeth Sai Narajala, Idan Habler, Akram Sheriff (2024). *Agent Name Service (ANS): A Universal Directory for Secure AI Agent Discovery and Interoperability*. arXiv preprint arXiv:2505.10609. Retrieved from https://arxiv.org/abs/2505.10609

You can also refer to this software implementation:

Huang, Ken, Vineeth Sai Narajala, Idan Habler, Akram Sheriff. *Agent Name Service (ANS) Platform* [Software]. Retrieved from [URL_OF_THIS_GITHUB_REPOSITORY_IF_PUBLIC]

## License

This project is licensed under the MIT License.

```
MIT License

Copyright (c) 2024 Ken Huang,  Vineeth Sai Narajala, Idan Habler, Akram Sheriff

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
