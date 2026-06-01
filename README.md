# 🤖 AI Code Review Agent

An intelligent AI Agent that acts as your personal code reviewer. Powered by Llama 3.3 via the Groq SDK, the agent analyzes your source code for bugs, security vulnerabilities, and logic optimizations.

## What the Agent Does

This Agent is designed to "read" your code, understand its structure, and find complex patterns just like a senior human engineer would. To make it widely accessible, this agent is wrapped in a modern, interactive web interface.


### Agent Capabilities
- **Intelligent Parsing:** Feed the agent code directly, upload files, or provide an entire workspace file tree for review.
- **Polyglot Analysis:** Autonomously detects and reviews a wide variety of programming languages (JavaScript, Python, Java, C++, Go, Rust, etc.).
- **Actionable Output:**
  - Evaluates code structure and assigns a health score (out of 100).
  - Summarizes issues and categorizes detailed findings into bugs, security risks, or improvements.
  - Generates an improved, refactored version of your code natively formatting it so you can copy and implement immediately.

### The Agent's Architecture
- **The Brain (AI Integration):** Groq SDK connecting to the Llama 3.3 large language model, forming the core reasoning engine.
- **The Interface (Frontend App):** HTML5, CSS3, JavaScript (Vite bundler) provides the medium for you to communicate directly with the Agent.
- **The Nervous System (Backend):** Node.js and Express.js to safely route your code and requests to the LLM and back.

## How to Initialize the Agent

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Setup Environment:**
   Ensure the agent has its identity and permissions configured by adding any required API keys (e.g., Groq API key) in your `.env` file.
3. **Awaken the Agent:**
   ```bash
   npm start
   ```
   *This command starts both the agent's background script engine and the user-facing interface concurrently.*

 
