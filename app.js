/**
 * AI Tools Recommendation Engine - Data & Logic
 */

const aiTools = [
    // Video Editing & Generation
    {
        name: "Runway",
        categories: ["video", "video editing", "gen-video", "visual effects", "creative"],
        pricing: "Freemium",
        rating: "4.8/5",
        link: "https://runwayml.com",
        trending: true
    },
    {
        name: "Descript",
        categories: ["video", "video editing", "podcast", "transcription", "audio"],
        pricing: "Freemium",
        rating: "4.7/5",
        link: "https://www.descript.com",
        trending: true
    },
    {
        name: "Pictory",
        categories: ["video", "content creation", "social media", "video editing"],
        pricing: "Paid",
        rating: "4.5/5",
        link: "https://pictory.ai",
        trending: false
    },
    {
        name: "Pika Labs",
        categories: ["video", "gen-video", "animation"],
        pricing: "Freemium",
        rating: "4.6/5",
        link: "https://pika.art",
        trending: true
    },
    {
        name: "HeyGen",
        categories: ["video", "avatar", "marketing", "presentation"],
        pricing: "Freemium",
        rating: "4.8/5",
        link: "https://www.heygen.com",
        trending: true
    },

    // Coding Assistants
    {
        name: "Cursor",
        categories: ["coding", "programming", "ide", "developer tools", "software"],
        pricing: "Freemium",
        rating: "4.9/5",
        link: "https://cursor.sh",
        trending: true
    },
    {
        name: "GitHub Copilot",
        categories: ["coding", "programming", "developer tools", "automation"],
        pricing: "Paid",
        rating: "4.7/5",
        link: "https://github.com/features/copilot",
        trending: true
    },
    {
        name: "Replit Agent",
        categories: ["coding", "deployment", "web development", "software"],
        pricing: "Freemium",
        rating: "4.6/5",
        link: "https://replit.com",
        trending: true
    },

    // Image Generation & Design
    {
        name: "Midjourney",
        categories: ["image", "art", "design", "creative", "graphics"],
        pricing: "Paid",
        rating: "4.9/5",
        link: "https://www.midjourney.com",
        trending: true
    },
    {
        name: "Canva Magic Studio",
        categories: ["design", "image", "graphics", "marketing", "creative"],
        pricing: "Freemium",
        rating: "4.7/5",
        link: "https://www.canva.com",
        trending: true
    },
    {
        name: "Leonardo.ai",
        categories: ["image", "art", "creative", "design"],
        pricing: "Freemium",
        rating: "4.8/5",
        link: "https://leonardo.ai",
        trending: true
    },

    // Text & Productivity
    {
        name: "ChatGPT",
        categories: ["text", "writing", "productivity", "chatbot", "ai", "general", "marketing"],
        pricing: "Freemium",
        rating: "4.8/5",
        link: "https://chatgpt.com",
        trending: true
    },
    {
        name: "Claude",
        categories: ["text", "writing", "coding", "analysis", "ai", "general", "automation"],
        pricing: "Freemium",
        rating: "4.9/5",
        link: "https://claude.ai",
        trending: true
    },
    {
        name: "Perplexity",
        categories: ["search", "research", "productivity", "ai", "information"],
        pricing: "Freemium",
        rating: "4.8/5",
        link: "https://www.perplexity.ai",
        trending: true
    },

    // SEO & Marketing
    {
        name: "Surfer SEO",
        categories: ["seo", "marketing", "writing", "content", "optimization"],
        pricing: "Paid",
        rating: "4.8/5",
        link: "https://surferseo.com",
        trending: true
    },
    {
        name: "Jasper",
        categories: ["marketing", "writing", "copywriting", "seo", "content"],
        pricing: "Paid",
        rating: "4.7/5",
        link: "https://www.jasper.ai",
        trending: true
    },
    {
        name: "AdCreative.ai",
        categories: ["marketing", "ads", "design", "automation", "social media"],
        pricing: "Paid",
        rating: "4.6/5",
        link: "https://www.adcreative.ai",
        trending: true
    },
    {
        name: "Copy.ai",
        categories: ["marketing", "copywriting", "writing", "automation", "sales"],
        pricing: "Freemium",
        rating: "4.7/5",
        link: "https://www.copy.ai",
        trending: true
    },
    {
        name: "Ahrefs (AI Features)",
        categories: ["seo", "marketing", "search", "research"],
        pricing: "Paid",
        rating: "4.8/5",
        link: "https://ahrefs.com",
        trending: false
    },

    // Career & Resume (New Category)
    {
        name: "Teal",
        categories: ["resume", "career", "job search", "productivity", "resume creation"],
        pricing: "Freemium",
        rating: "4.8/5",
        link: "https://www.tealhq.com",
        trending: true
    },
    {
        name: "Rezi",
        categories: ["resume", "career", "job search", "writing", "resume creation"],
        pricing: "Freemium",
        rating: "4.7/5",
        link: "https://www.rezi.ai",
        trending: true
    },
    {
        name: "Kickresume",
        categories: ["resume", "career", "design", "creative", "resume creation"],
        pricing: "Freemium",
        rating: "4.6/5",
        link: "https://www.kickresume.com",
        trending: false
    },

    // Audio & Voice (New Category)
    {
        name: "ElevenLabs",
        categories: ["audio", "voice", "gen-audio", "creative", "video"],
        pricing: "Freemium",
        rating: "4.9/5",
        link: "https://elevenlabs.io",
        trending: true
    },
    {
        name: "Speechify",
        categories: ["audio", "productivity", "reading", "voice"],
        pricing: "Freemium",
        rating: "4.7/5",
        link: "https://speechify.com",
        trending: true
    },

    // Research & Writing (New Category)
    {
        name: "Jenni AI",
        categories: ["writing", "research", "academic", "essay"],
        pricing: "Freemium",
        rating: "4.7/5",
        link: "https://jenni.ai",
        trending: true
    },
    {
        name: "Consensus",
        categories: ["search", "research", "science", "academic"],
        pricing: "Freemium",
        rating: "4.8/5",
        link: "https://consensus.app",
        trending: true
    },

    // Automation (New Categories)
    {
        name: "Zapier Central",
        categories: ["automation", "productivity", "workflow", "software"],
        pricing: "Freemium",
        rating: "4.8/5",
        link: "https://zapier.com/central",
        trending: true
    },
    {
        name: "Bardeen",
        categories: ["automation", "productivity", "workflow", "browser"],
        pricing: "Freemium",
        rating: "4.7/5",
        link: "https://www.bardeen.ai",
        trending: true
    },
    {
        name: "Make.com",
        categories: ["automation", "workflow", "developer tools"],
        pricing: "Freemium",
        rating: "4.6/5",
        link: "https://www.make.com",
        trending: true
    },
    {
        name: "FlowiseAI",
        categories: ["automation", "developer tools", "no-code", "ai"],
        pricing: "Free",
        rating: "4.8/5",
        link: "https://flowiseai.com",
        trending: true
    }
];

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const resultsSection = document.getElementById('results-section');

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return;

    // Transition effect
    resultsSection.classList.remove('show');

    setTimeout(() => {
        const results = findRecommendations(query);
        renderResults(query, results);
        resultsSection.classList.add('show');
    }, 300);
}

function findRecommendations(query) {
    // 1. Direct filtering
    let matches = aiTools.filter(tool => {
        const inCategories = tool.categories.some(cat =>
            query.includes(cat) || cat.includes(query) || (cat.split(' ').some(word => query.includes(word)))
        );
        const inName = tool.name.toLowerCase().includes(query);
        return inCategories || inName;
    });

    // 2. Determine Intent
    const isBroad = query.length < 5 || ["ai", "tool", "apps", "best", "top", "software", "marketing", "seo", "automation", "help", "find"].includes(query);
    const isAction = ["create", "make", "write", "generate", "build", "design", "check", "fix"].some(word => query.includes(word));

    // 3. Robust Fallback: If no direct matches, return general trending powerhouses
    if (matches.length === 0) {
        // Return ChatGPT, Claude, and Perplexity as they handle almost anything
        matches = aiTools.filter(t => ["ChatGPT", "Claude", "Perplexity"].includes(t.name));
    }

    // 4. Scoring and Sorting
    matches.sort((a, b) => {
        // Prioritize trending tools
        if (a.trending !== b.trending) return a.trending ? -1 : 1;

        // Then by rating
        const ratingA = parseFloat(a.rating);
        const ratingB = parseFloat(b.rating);
        return ratingB - ratingA;
    });

    // 5. Return max 3 tools
    return matches.slice(0, 3);
}

function renderResults(query, tools) {
    // Should never be empty now with fallback, but safety check
    if (tools.length === 0) {
        resultsSection.innerHTML = `
            <div class="divider"></div>
            <p class="no-results">No highly relevant AI tools found for this requirement.</p>
        `;
        return;
    }

    let html = `
        <div class="divider"></div>
        <div class="requirement-label">Requirement: ${capitalizeFirstLetter(query)}</div>
        <div class="tool-list">
    `;

    tools.forEach((tool, index) => {
        html += `
            <div class="tool-card fade-in" style="animation-delay: ${index * 0.1}s">
                <div class="tool-info">
                    <div class="tool-name">${tool.name}</div>
                    <div class="tool-details-minimal">
                        <span class="detail-label">Official Website:</span>
                        <a href="${tool.link}" class="tool-link-minimal" target="_blank" rel="noopener noreferrer">
                            ${tool.link}
                        </a>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    resultsSection.innerHTML = html;
}

function capitalizeFirstLetter(string) {
    if (string.length > 10) return string.charAt(0).toUpperCase() + string.slice(1);
    return string.toUpperCase(); // For short terms like SEO, AI
}
