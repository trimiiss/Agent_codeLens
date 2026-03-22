import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are an elite code review agent. You analyze code with extreme precision and return structured JSON reviews.

Your response MUST be valid JSON with this exact structure:
{
  "summary": "A 2-3 sentence overall assessment of the code quality.",
  "score": <number 0-100>,
  "issues": [
    {
      "severity": "critical" | "warning" | "info",
      "line": <line number or null>,
      "title": "Short issue title",
      "description": "Detailed explanation of the problem.",
      "suggestion": "How to fix it, with a code snippet if helpful."
    }
  ],
  "improvedCode": "The full refactored/improved version of the code."
}

Guidelines:
- Be thorough: check for bugs, security vulnerabilities, performance issues, code smells, and style.
- "critical" = bugs, security holes, crash risks.
- "warning" = performance issues, bad practices, maintainability concerns.
- "info" = style improvements, minor suggestions, best practices.
- Always provide an improved version of the code, even if changes are minor.
- If the code is excellent, still provide at least one "info" level suggestion.
- Return ONLY valid JSON, no markdown fences, no extra text.`;

app.post('/api/review', async (req, res) => {
  try {
    const { code, language, filename, files } = req.body;

    if ((!code || !code.trim()) && (!files || files.length === 0)) {
      return res.status(400).json({ error: 'No code provided.' });
    }

    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') {
      return res.status(500).json({
        error: 'Groq API key not configured. Please add your key to server/.env',
      });
    }

    let userPrompt = '';
    if (files && files.length > 1) {
      userPrompt = `Review the following codebase containing multiple files:\n\n`;
      files.forEach(f => {
        userPrompt += `--- File: ${f.filename} ---\n\`\`\`${f.language || ''}\n${f.code}\n\`\`\`\n\n`;
      });
      userPrompt += `Respond with ONLY valid JSON following the required structure. Because you are reviewing multiple files, please clearly mention the relevant filename in the \`title\` or \`description\` of each issue. For \`improvedCode\`, provide the fully refactored code for the file that requires the most critical changes (add a comment at the top indicating which file it is).`;
    } else {
      userPrompt = `Review the following ${language || 'code'}${filename ? ` (file: ${filename})` : ''}:

\`\`\`${language || ''}
${code}
\`\`\`

Respond with ONLY valid JSON following the required structure.`;
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    });

    const responseText = chatCompletion.choices[0]?.message?.content;

    if (!responseText) {
      return res.status(500).json({ error: 'No response from AI model.' });
    }

    const review = JSON.parse(responseText);

    // Validate structure
    if (!review.summary || review.score === undefined || !Array.isArray(review.issues)) {
      return res.status(500).json({ error: 'AI returned an invalid review structure.' });
    }

    res.json(review);
  } catch (err) {
    console.error('Review error:', err);

    if (err.message?.includes('JSON')) {
      return res.status(500).json({ error: 'AI returned invalid JSON. Please try again.' });
    }

    res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

app.listen(PORT, () => {
  console.log(`🤖 Code Review Agent server running on http://localhost:${PORT}`);
});
