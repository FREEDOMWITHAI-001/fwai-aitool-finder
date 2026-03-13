import tools from '../data/tools.json';

// ---- Local workflow templates for instant results ----

const WORKFLOW_TEMPLATES = {
  'youtube channel': [
    { title: 'Content Research & Trend Analysis', description: 'Research trending topics, analyze competitor channels, and identify content gaps in your niche.', category: 'research' },
    { title: 'Script Writing', description: 'Write engaging scripts with hooks, storytelling structure, and clear calls to action.', category: 'writing' },
    { title: 'Thumbnail & Graphics Design', description: 'Design eye-catching thumbnails and channel branding that boost click-through rates.', category: 'design' },
    { title: 'Video Recording & Editing', description: 'Record, edit, and enhance your videos with AI-powered tools for professional results.', category: 'video' },
    { title: 'Voiceover & Audio Enhancement', description: 'Add professional voiceovers, background music, and enhance audio quality.', category: 'audio' },
    { title: 'SEO Optimization & Publishing', description: 'Optimize titles, descriptions, and tags for maximum discoverability and reach.', category: 'marketing' },
  ],
  'website': [
    { title: 'Idea Validation & Research', description: 'Research your market, validate the idea, and analyze competitor websites.', category: 'research' },
    { title: 'UI/UX Design', description: 'Design wireframes, mockups, and a user-friendly interface for your website.', category: 'design' },
    { title: 'Code Generation & Development', description: 'Generate code, build components, and develop your website with AI assistance.', category: 'coding' },
    { title: 'Content Writing', description: 'Write compelling copy, landing page text, and blog content for your site.', category: 'writing' },
    { title: 'SEO & Marketing Setup', description: 'Set up analytics, optimize for search engines, and plan your launch strategy.', category: 'marketing' },
    { title: 'Deployment & Automation', description: 'Automate deployments, set up CI/CD, and configure monitoring workflows.', category: 'automation' },
  ],
  'marketing campaign': [
    { title: 'Market Research & Audience Analysis', description: 'Analyze your target market, define audience personas, and study competitor campaigns.', category: 'research' },
    { title: 'Campaign Strategy & Copy', description: 'Develop campaign messaging, ad copy, and content strategy that resonates.', category: 'writing' },
    { title: 'Ad Creative Design', description: 'Design stunning visual assets, banners, and social media creatives.', category: 'design' },
    { title: 'Video Ad Creation', description: 'Create engaging video ads and promotional content for multiple platforms.', category: 'video' },
    { title: 'Campaign Launch & Automation', description: 'Automate campaign workflows, schedule posts, and set up ad delivery.', category: 'automation' },
    { title: 'Performance Analytics & Optimization', description: 'Track campaign performance, analyze ROI, and optimize for better results.', category: 'marketing' },
  ],
  'podcast': [
    { title: 'Topic Research & Planning', description: 'Research trending topics, plan episode structure, and identify guest opportunities.', category: 'research' },
    { title: 'Script & Show Notes', description: 'Write episode scripts, talking points, and detailed show notes.', category: 'writing' },
    { title: 'Audio Recording & Editing', description: 'Record, edit, and master your podcast audio for professional sound quality.', category: 'audio' },
    { title: 'Cover Art & Branding', description: 'Design podcast cover art, episode thumbnails, and visual branding assets.', category: 'design' },
    { title: 'Distribution & Marketing', description: 'Distribute to platforms, create audiograms, and promote your podcast.', category: 'marketing' },
  ],
  'mobile app': [
    { title: 'Idea Validation & Market Research', description: 'Validate your app idea, study the market, and analyze competing apps.', category: 'research' },
    { title: 'UI/UX Design & Prototyping', description: 'Design app screens, create interactive prototypes, and build a design system.', category: 'design' },
    { title: 'App Development', description: 'Generate code, build features, and develop your mobile app with AI coding tools.', category: 'coding' },
    { title: 'Documentation & Content', description: 'Write app documentation, store descriptions, and in-app copy.', category: 'writing' },
    { title: 'Testing & QA Automation', description: 'Automate testing, set up CI/CD pipelines, and ensure quality releases.', category: 'automation' },
    { title: 'App Store Optimization & Marketing', description: 'Optimize store listings, plan launch campaigns, and drive downloads.', category: 'marketing' },
  ],
  'online course': [
    { title: 'Course Topic Research', description: 'Research in-demand skills, validate course topics, and outline the curriculum.', category: 'research' },
    { title: 'Course Content Writing', description: 'Write lesson scripts, assignments, quizzes, and supplementary materials.', category: 'writing' },
    { title: 'Slide & Visual Design', description: 'Design presentation slides, infographics, and visual learning materials.', category: 'design' },
    { title: 'Video Lessons Production', description: 'Record and edit video lessons with professional quality.', category: 'video' },
    { title: 'Voiceover & Audio', description: 'Add narration, background music, and enhance audio clarity.', category: 'audio' },
    { title: 'Launch & Marketing', description: 'Create a landing page, email campaigns, and promote your course.', category: 'marketing' },
  ],
  'blog': [
    { title: 'Niche Research & Keyword Analysis', description: 'Find profitable niches, research keywords, and analyze competitor blogs.', category: 'research' },
    { title: 'Content Writing & Editing', description: 'Write high-quality blog posts, edit for clarity, and optimize readability.', category: 'writing' },
    { title: 'Featured Images & Graphics', description: 'Design blog headers, featured images, and infographics.', category: 'design' },
    { title: 'SEO Optimization', description: 'Optimize posts for search engines, build internal links, and track rankings.', category: 'marketing' },
    { title: 'Publishing Automation', description: 'Automate publishing schedules, social sharing, and email newsletters.', category: 'automation' },
  ],
  'music': [
    { title: 'Music Research & Inspiration', description: 'Research genres, analyze trends, and find inspiration for your compositions.', category: 'research' },
    { title: 'Music Composition & Production', description: 'Compose melodies, create beats, and produce full tracks with AI.', category: 'audio' },
    { title: 'Lyrics Writing', description: 'Write compelling lyrics that match your genre and musical style.', category: 'writing' },
    { title: 'Album Art & Visuals', description: 'Design album covers, promotional graphics, and music video concepts.', category: 'design' },
    { title: 'Distribution & Promotion', description: 'Distribute to streaming platforms and promote your music online.', category: 'marketing' },
  ],
  'ecommerce': [
    { title: 'Market & Product Research', description: 'Research profitable products, analyze competition, and validate your niche.', category: 'research' },
    { title: 'Store Design & Branding', description: 'Design your store layout, logo, and brand identity.', category: 'design' },
    { title: 'Store Development', description: 'Build and customize your online store with AI-assisted development.', category: 'coding' },
    { title: 'Product Descriptions & Content', description: 'Write persuasive product descriptions, FAQs, and blog content.', category: 'writing' },
    { title: 'Product Photography & Video', description: 'Create product showcase videos and enhance product images.', category: 'video' },
    { title: 'Marketing & SEO', description: 'Set up ads, optimize for search, and create email marketing campaigns.', category: 'marketing' },
    { title: 'Order & Workflow Automation', description: 'Automate order processing, inventory management, and customer communications.', category: 'automation' },
  ],
};

// Match user goal to a template
function matchTemplate(goal) {
  const lower = goal.toLowerCase();
  for (const [key, steps] of Object.entries(WORKFLOW_TEMPLATES)) {
    const words = key.split(' ');
    if (words.every(w => lower.includes(w))) return { templateKey: key, steps };
  }
  // Partial match
  for (const [key, steps] of Object.entries(WORKFLOW_TEMPLATES)) {
    const words = key.split(' ');
    if (words.some(w => lower.includes(w))) return { templateKey: key, steps };
  }
  return null;
}

// Get top tools for a category
export function getToolsForCategory(category, count = 2) {
  return tools
    .filter(t => t.primary === category)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, count)
    .map(t => ({
      name: t.name,
      url: t.url,
      rating: t.rating,
      pricing: t.pricing,
      bestFor: t.bestFor,
    }));
}

// Build workflow from template steps
function buildWorkflow(goal, steps) {
  return {
    goal,
    steps: steps.map((step, i) => ({
      number: i + 1,
      title: step.title,
      description: step.description,
      category: step.category,
      categoryLabel: step.category.charAt(0).toUpperCase() + step.category.slice(1),
      tools: getToolsForCategory(step.category),
    })),
  };
}

// ---- Gemini-powered workflow generation ----

function buildWorkflowPrompt(goal) {
  return `You are an expert AI workflow architect. A user wants to accomplish a goal, and you must break it into a step-by-step workflow where each step can be aided by AI tools.

User's Goal: "${goal}"

Break this goal into 4-7 logical workflow steps. For each step, assign exactly ONE category from this list: video, coding, design, writing, marketing, audio, research, automation.

Respond with a JSON object in this exact format:
{
  "steps": [
    {
      "title": "Short step title",
      "description": "1-2 sentence description of what this step involves",
      "category": "one of: video, coding, design, writing, marketing, audio, research, automation"
    }
  ]
}

Rules:
- Order the steps logically (what comes first in a real workflow)
- Each step must map to exactly one of the 8 categories
- Descriptions should be specific to the user's goal, not generic
- Use 4-7 steps (not more, not less)
- Do NOT include tool names — just the steps and categories`;
}

export async function generateWorkflowWithGemini(goal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildWorkflowPrompt(goal) }] }],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
  });

  clearTimeout(timeout);

  if (!response.ok) throw new Error(`API_ERROR_${response.status}`);

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('INVALID_RESPONSE');

  const parsed = JSON.parse(text);
  if (!parsed.steps || !Array.isArray(parsed.steps)) throw new Error('INVALID_RESPONSE');

  const validCategories = ['video', 'coding', 'design', 'writing', 'marketing', 'audio', 'research', 'automation'];
  const validSteps = parsed.steps
    .filter(s => s.title && s.category && validCategories.includes(s.category))
    .slice(0, 7);

  if (validSteps.length === 0) throw new Error('INVALID_RESPONSE');

  return buildWorkflow(goal, validSteps);
}

// ---- Main export: instant local + Gemini upgrade ----

export function getLocalWorkflow(goal) {
  const match = matchTemplate(goal);
  if (match) return buildWorkflow(goal, match.steps);

  // Generic fallback workflow
  const genericSteps = [
    { title: 'Research & Planning', description: `Research and plan your approach for "${goal}".`, category: 'research' },
    { title: 'Content Creation', description: 'Create the written content and documentation needed.', category: 'writing' },
    { title: 'Visual Design', description: 'Design the visual assets and creative materials.', category: 'design' },
    { title: 'Development & Building', description: 'Build and develop the core components.', category: 'coding' },
    { title: 'Launch & Marketing', description: 'Promote, distribute, and market your work.', category: 'marketing' },
    { title: 'Automation & Scaling', description: 'Automate repetitive tasks and scale your workflow.', category: 'automation' },
  ];
  return buildWorkflow(goal, genericSteps);
}
