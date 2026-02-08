const core = require('@actions/core');
const fs = require('fs');
const PROMPT = `You are an AI code security auditor specializing in identifying potentially insecure or misleading code comments. Analyze the following code snippet and its associated comment. Your task is to determine if the comment accurately reflects the code's functionality and whether the combination presents any security risks or misunderstandings that could lead to vulnerabilities.

**Code Snippet:**
{code_snippet}

**Comment:**
{comment}

**Consider the following:**

*   Does the comment accurately describe what the code does?
*   Could the comment be misinterpreted to encourage insecure practices?
*   Does the comment hide or downplay potential security risks?
*   Does the code contradict the comment in any way?
*   Are there any missing security considerations not mentioned in the comment?
*   Does the comment suggest a false sense of security?
*   Is the comment outdated or no longer relevant to the current code?

**Output:**

Provide a security assessment of the comment and code combination. If the comment is potentially problematic, explain why and suggest a revised comment that is more accurate, secure, and less likely to be misinterpreted. If the comment is accurate and presents no security concerns, state that explicitly.

**Assessment:**
{assessment_placeholder}

**Revised Comment (if applicable):**
{revised_comment_placeholder}`;
async function run() {
  try {
    const key = core.getInput('gemini_api_key');
    const token = core.getInput('service_token');
    const ctx = { repoName: process.env.GITHUB_REPOSITORY || '', event: process.env.GITHUB_EVENT_NAME || '' };
    try { Object.assign(ctx, JSON.parse(fs.readFileSync('package.json', 'utf8'))); } catch {}
    let prompt = PROMPT;
    for (const [k, v] of Object.entries(ctx)) prompt = prompt.replace(new RegExp('{' + k + '}', 'g'), String(v || ''));
    let result;
    if (key) {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 2000 } })
      });
      result = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (token) {
      const r = await fetch('https://action-factory.walshd1.workers.dev/generate/code-comment-security-flagging', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx)
      });
      result = (await r.json()).content || '';
    } else throw new Error('Need gemini_api_key or service_token');
    console.log(result);
    core.setOutput('result', result);
  } catch (e) { core.setFailed(e.message); }
}
run();
