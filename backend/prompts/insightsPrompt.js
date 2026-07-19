/**
 * insightsPrompt.js — LLM prompt template for generating dashboard summary insights.
 *
 * Returns a function that accepts list of opportunities and tasks, and returns a
 * { systemPrompt, userPrompt } pair ready for llmService.callLLM().
 */

/**
 * buildInsightsPrompt
 * @param {Array} opportunities - Array of pending/in_progress opportunities
 * @param {Array} tasks - Array of active (todo) tasks
 * @returns {{ systemPrompt: string, userPrompt: string }}
 */
const buildInsightsPrompt = (opportunities, tasks) => {
  const systemPrompt = `You are Tick-It AI, a strategic project management advisor.
Analyze the user's current project dashboard snapshot and generate 3-4 bullet points of high-priority, actionable insights, recommendations, or alerts.
Focus on:
- Upcoming deadlines in the next week.
- Uncompleted tasks on high-priority opportunities.
- Bottleneck detection and workflow suggestions.

Rules:
- Be concise, direct, and professional.
- Do not include introductory text (e.g. "Here are your insights:").
- Output ONLY the bullet points.
- Do not fabricate deadlines or tasks. Only discuss items present in the context.`;

  const oppsSummary = opportunities.length > 0
    ? opportunities.map(o => {
        const deadlineStr = o.deadline ? new Date(o.deadline).toISOString().slice(0, 10) : 'N/A';
        return `- Opportunity: "${o.title}" (Priority: ${o.priority}, Status: ${o.status}, Deadline: ${deadlineStr})`;
      }).join('\n')
    : 'No active or pending opportunities.';

  const tasksSummary = tasks.length > 0
    ? tasks.map(t => {
        const dueStr = t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : 'N/A';
        return `- Task: "${t.title}" (Priority: ${t.priority}, Due: ${dueStr}, Status: ${t.status})`;
      }).join('\n')
    : 'No active todo tasks.';

  const userPrompt = `Dashboard Snapshot:

=== OPPORTUNITIES ===
${oppsSummary}

=== ACTIVE TASKS ===
${tasksSummary}

Please generate my actionable insights:`;

  return { systemPrompt, userPrompt };
};

module.exports = { buildInsightsPrompt };
