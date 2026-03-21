import tools from '../data/tools.json';

// Match Gemini-returned tool names against local DB, overlay real trendScore/rating
function enrichWorkflowTools(geminiTools) {
  const localMap = new Map(tools.map(t => [t.name.toLowerCase(), t]));
  return geminiTools.map(gt => {
    const local = localMap.get(gt.name.toLowerCase());
    if (!local) return { ...gt, trendScore: gt.trendScore || 30 };
    return {
      ...gt,
      trendScore: local.trendScore ?? gt.trendScore ?? 50,
      rating: local.rating || gt.rating,
      pricing: local.pricing || gt.pricing,
      bestFor: gt.bestFor || local.bestFor,
      categories: local.categories,
      primary: local.primary,
    };
  }).sort((a, b) => {
    const trendDiff = (b.trendScore || 0) - (a.trendScore || 0);
    if (trendDiff !== 0) return trendDiff;
    return (b.rating || 0) - (a.rating || 0);
  });
}

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

// Get top tools for a category — sorted by trendScore DESC then rating DESC
export function getToolsForCategory(category, count = 2) {
  return tools
    .filter(t => t.primary === category)
    .sort((a, b) => {
      const trendDiff = (b.trendScore || 0) - (a.trendScore || 0);
      if (trendDiff !== 0) return trendDiff;
      return b.rating - a.rating;
    })
    .slice(0, count)
    .map(t => ({
      name: t.name,
      url: t.url,
      rating: t.rating,
      pricing: t.pricing,
      bestFor: t.bestFor,
      trendScore: t.trendScore || 50,
      categories: t.categories,
      primary: t.primary,
      reason: `Top-rated for ${t.bestFor.toLowerCase()}.`.slice(0, 60),
      ratingSource: 'Community',
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
  return `You are a workflow and AI tool expert. Break "${goal}" into 4-7 actionable steps and recommend 2-3 real AI tools per step.

Return JSON: {"goal":"","steps":[{"title":"","description":"","category":"","tools":[{"name":"","url":"","pricing":"Freemium","rating":4.5,"bestFor":""}]}]}

Category options (pick exactly one per step): video, coding, design, writing, marketing, audio, research, automation

Rules:
- Steps in logical execution order, specific to the goal
- description: 1-2 sentences, actionable and specific
- tools: best CURRENT AI tools for that exact step (not just category)
- pricing: exactly "Free", "Freemium", or "Premium"
- rating: real score 3.0–5.0
- bestFor: MAX 8 words
- Only real tools with valid URLs`;
}

// Client-side workflow cache — avoids repeat API calls for same goal
const workflowCache = new Map();
const WORKFLOW_CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function generateWorkflowWithGemini(goal) {
  const cacheKey = goal.trim().toLowerCase();
  const cached = workflowCache.get(cacheKey);
  if (cached && (Date.now() - cached.ts < WORKFLOW_CACHE_TTL)) {
    return cached.data;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

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
        thinkingConfig: { thinkingBudget: 0 },
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
  const validPricing = ['Free', 'Freemium', 'Premium'];

  const validSteps = parsed.steps
    .filter(s => s.title && s.category && validCategories.includes(s.category))
    .slice(0, 7);

  if (validSteps.length === 0) throw new Error('INVALID_RESPONSE');

  const result = {
    goal: parsed.goal || goal,
    steps: validSteps.map((step, i) => {
      // Normalize Gemini-provided tools for this step
      const geminiTools = Array.isArray(step.tools)
        ? step.tools.filter(t => t.name && t.url).slice(0, 3).map(t => {
            let pricing = t.pricing || 'Freemium';
            if (!validPricing.includes(pricing)) pricing = 'Freemium';
            let rating = parseFloat(t.rating) || 4.5;
            rating = Math.max(3, Math.min(5, Math.round(rating * 10) / 10));
            return {
              name: t.name,
              url: t.url,
              pricing,
              rating,
              bestFor: (t.bestFor || '').slice(0, 50),
              reason: '',
              ratingSource: '',
            };
          })
        : [];

      return {
        number: i + 1,
        title: step.title,
        description: step.description,
        category: step.category,
        categoryLabel: step.category.charAt(0).toUpperCase() + step.category.slice(1),
        // Enrich Gemini tools with local trendScore data; fall back to static if none
        tools: geminiTools.length > 0 ? enrichWorkflowTools(geminiTools) : getToolsForCategory(step.category),
        isGemini: geminiTools.length > 0,
      };
    }),
  };

  workflowCache.set(cacheKey, { data: result, ts: Date.now() });
  return result;
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
