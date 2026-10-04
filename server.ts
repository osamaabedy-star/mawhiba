import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createServer() {
  const app = express();
  app.use(express.json());

  // Initialize Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // AI Endpoint for generating solving strategies
  app.post('/api/ai/explain', async (req, res) => {
    try {
      const { questionText, options, skill, difficulty } = req.body;

      if (!questionText) {
        return res.status(400).json({ error: 'Question text is required' });
      }

      const prompt = `
        You are an expert in gifted education and mental ability tests.
        Generate a concise "Solving Strategy" (Explanation) for the following question.
        The explanation should be in Arabic and suitable for students.
        It should explain:
        1. The logical pattern or rule.
        2. Why the correct answer is correct.
        3. A quick tip or mental trick to solve similar questions faster.

        Question: ${questionText}
        Skill: ${skill}
        Difficulty: ${difficulty}
        Options: ${JSON.stringify(options)}

        Format the response as a simple text paragraph. Keep it encouraging and clear.
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          temperature: 0.7,
          maxOutputTokens: 500,
        }
      });

      res.json({ explanation: result.text });
    } catch (error: any) {
      console.error('AI Error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate explanation' });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Parse command line arguments (--port, --host) or fallback to env vars / defaults
  const args = process.argv.slice(2);
  let port = Number(process.env.PORT) || 3000;
  let host = process.env.HOST || '0.0.0.0';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      port = Number(args[i + 1]);
      i++;
    } else if (args[i] === '--host' && args[i + 1]) {
      host = args[i + 1];
      i++;
    }
  }

  app.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`);
  });
}

createServer();
