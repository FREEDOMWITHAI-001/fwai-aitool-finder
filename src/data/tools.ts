export interface AITool {
  name: string;
  categories: string[];
  pricing: string;
  rating: string;
  link: string;
  trending: boolean;
}

export const aiTools: AITool[] = [
  // Video Editing & Generation
  {
    name: 'Runway',
    categories: ['video', 'video editing', 'gen-video', 'visual effects', 'creative'],
    pricing: 'Freemium',
    rating: '4.8/5',
    link: 'https://runwayml.com',
    trending: true,
  },
  {
    name: 'Descript',
    categories: ['video', 'video editing', 'podcast', 'transcription', 'audio'],
    pricing: 'Freemium',
    rating: '4.7/5',
    link: 'https://www.descript.com',
    trending: true,
  },
  {
    name: 'Pictory',
    categories: ['video', 'content creation', 'social media', 'video editing'],
    pricing: 'Paid',
    rating: '4.5/5',
    link: 'https://pictory.ai',
    trending: false,
  },
  {
    name: 'Pika Labs',
    categories: ['video', 'gen-video', 'animation'],
    pricing: 'Freemium',
    rating: '4.6/5',
    link: 'https://pika.art',
    trending: true,
  },
  {
    name: 'HeyGen',
    categories: ['video', 'avatar', 'marketing', 'presentation'],
    pricing: 'Freemium',
    rating: '4.8/5',
    link: 'https://www.heygen.com',
    trending: true,
  },

  // Coding Assistants
  {
    name: 'Cursor',
    categories: ['coding', 'programming', 'ide', 'developer tools', 'software'],
    pricing: 'Freemium',
    rating: '4.9/5',
    link: 'https://cursor.sh',
    trending: true,
  },
  {
    name: 'GitHub Copilot',
    categories: ['coding', 'programming', 'developer tools', 'automation'],
    pricing: 'Paid',
    rating: '4.7/5',
    link: 'https://github.com/features/copilot',
    trending: true,
  },
  {
    name: 'Replit Agent',
    categories: ['coding', 'deployment', 'web development', 'software'],
    pricing: 'Freemium',
    rating: '4.6/5',
    link: 'https://replit.com',
    trending: true,
  },

  // Image Generation & Design
  {
    name: 'Midjourney',
    categories: ['image', 'art', 'design', 'creative', 'graphics'],
    pricing: 'Paid',
    rating: '4.9/5',
    link: 'https://www.midjourney.com',
    trending: true,
  },
  {
    name: 'Canva Magic Studio',
    categories: ['design', 'image', 'graphics', 'marketing', 'creative'],
    pricing: 'Freemium',
    rating: '4.7/5',
    link: 'https://www.canva.com',
    trending: true,
  },
  {
    name: 'Leonardo.ai',
    categories: ['image', 'art', 'creative', 'design'],
    pricing: 'Freemium',
    rating: '4.8/5',
    link: 'https://leonardo.ai',
    trending: true,
  },

  // Text & Productivity
  {
    name: 'ChatGPT',
    categories: ['text', 'writing', 'productivity', 'chatbot', 'ai', 'general', 'marketing'],
    pricing: 'Freemium',
    rating: '4.8/5',
    link: 'https://chatgpt.com',
    trending: true,
  },
  {
    name: 'Claude',
    categories: ['text', 'writing', 'coding', 'analysis', 'ai', 'general', 'automation'],
    pricing: 'Freemium',
    rating: '4.9/5',
    link: 'https://claude.ai',
    trending: true,
  },
  {
    name: 'Perplexity',
    categories: ['search', 'research', 'productivity', 'ai', 'information'],
    pricing: 'Freemium',
    rating: '4.8/5',
    link: 'https://www.perplexity.ai',
    trending: true,
  },

  // SEO & Marketing
  {
    name: 'Surfer SEO',
    categories: ['seo', 'marketing', 'writing', 'content', 'optimization'],
    pricing: 'Paid',
    rating: '4.8/5',
    link: 'https://surferseo.com',
    trending: true,
  },
  {
    name: 'Jasper',
    categories: ['marketing', 'writing', 'copywriting', 'seo', 'content'],
    pricing: 'Paid',
    rating: '4.7/5',
    link: 'https://www.jasper.ai',
    trending: true,
  },
  {
    name: 'AdCreative.ai',
    categories: ['marketing', 'ads', 'design', 'automation', 'social media'],
    pricing: 'Paid',
    rating: '4.6/5',
    link: 'https://www.adcreative.ai',
    trending: true,
  },
  {
    name: 'Copy.ai',
    categories: ['marketing', 'copywriting', 'writing', 'automation', 'sales'],
    pricing: 'Freemium',
    rating: '4.7/5',
    link: 'https://www.copy.ai',
    trending: true,
  },
  {
    name: 'Ahrefs (AI Features)',
    categories: ['seo', 'marketing', 'search', 'research'],
    pricing: 'Paid',
    rating: '4.8/5',
    link: 'https://ahrefs.com',
    trending: false,
  },

  // Career & Resume
  {
    name: 'Teal',
    categories: ['resume', 'career', 'job search', 'productivity', 'resume creation'],
    pricing: 'Freemium',
    rating: '4.8/5',
    link: 'https://www.tealhq.com',
    trending: true,
  },
  {
    name: 'Rezi',
    categories: ['resume', 'career', 'job search', 'writing', 'resume creation'],
    pricing: 'Freemium',
    rating: '4.7/5',
    link: 'https://www.rezi.ai',
    trending: true,
  },
  {
    name: 'Kickresume',
    categories: ['resume', 'career', 'design', 'creative', 'resume creation'],
    pricing: 'Freemium',
    rating: '4.6/5',
    link: 'https://www.kickresume.com',
    trending: false,
  },

  // Audio & Voice
  {
    name: 'ElevenLabs',
    categories: ['audio', 'voice', 'gen-audio', 'creative', 'video'],
    pricing: 'Freemium',
    rating: '4.9/5',
    link: 'https://elevenlabs.io',
    trending: true,
  },
  {
    name: 'Speechify',
    categories: ['audio', 'productivity', 'reading', 'voice'],
    pricing: 'Freemium',
    rating: '4.7/5',
    link: 'https://speechify.com',
    trending: true,
  },

  // Research & Writing
  {
    name: 'Jenni AI',
    categories: ['writing', 'research', 'academic', 'essay'],
    pricing: 'Freemium',
    rating: '4.7/5',
    link: 'https://jenni.ai',
    trending: true,
  },
  {
    name: 'Consensus',
    categories: ['search', 'research', 'science', 'academic'],
    pricing: 'Freemium',
    rating: '4.8/5',
    link: 'https://consensus.app',
    trending: true,
  },

  // Automation
  {
    name: 'Zapier Central',
    categories: ['automation', 'productivity', 'workflow', 'software'],
    pricing: 'Freemium',
    rating: '4.8/5',
    link: 'https://zapier.com/central',
    trending: true,
  },
  {
    name: 'Bardeen',
    categories: ['automation', 'productivity', 'workflow', 'browser'],
    pricing: 'Freemium',
    rating: '4.7/5',
    link: 'https://www.bardeen.ai',
    trending: true,
  },
  {
    name: 'Make.com',
    categories: ['automation', 'workflow', 'developer tools'],
    pricing: 'Freemium',
    rating: '4.6/5',
    link: 'https://www.make.com',
    trending: true,
  },
  {
    name: 'FlowiseAI',
    categories: ['automation', 'developer tools', 'no-code', 'ai'],
    pricing: 'Free',
    rating: '4.8/5',
    link: 'https://flowiseai.com',
    trending: true,
  },
];
