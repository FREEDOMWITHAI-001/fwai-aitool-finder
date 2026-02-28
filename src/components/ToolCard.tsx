import { RecommendedTool } from '@/types';

interface ToolCardProps {
  tool: RecommendedTool;
  index: number;
}

const pricingClass: Record<string, string> = {
  Free:     'badge-free',
  Freemium: 'badge-freemium',
  Paid:     'badge-paid',
};

/* Subtle accent color per card position — matches reference image feel */
const accentColors = ['#BFDBFE', '#FED7AA', '#BAE6FD'];

export default function ToolCard({ tool, index }: ToolCardProps) {
  const rank   = String(index + 1).padStart(2, '0');
  const accent = accentColors[index % accentColors.length];

  return (
    <div
      className="tool-card fade-in"
      style={
        { animationDelay: `${index * 0.1}s`, '--card-accent': accent } as React.CSSProperties
      }
    >
      {/* 01 / 02 / 03 */}
      <div className="card-number">{rank}</div>

      {/* Name + Trending badge */}
      <div className="card-header">
        <h3 className="tool-name">{tool.name}</h3>
        {tool.trending && <span className="badge-trending">Trending</span>}
      </div>

      {/* Pricing + Rating */}
      <div className="card-meta">
        <span className={`badge-pricing ${pricingClass[tool.pricing] ?? 'badge-freemium'}`}>
          {tool.pricing}
        </span>
        <span className="badge-rating">{tool.rating}</span>
      </div>

      {/* AI-generated description */}
      {tool.description && <p className="tool-description">{tool.description}</p>}

      {/* Tags — 2-column grid */}
      {tool.tags && tool.tags.length > 0 && (
        <div className="card-tags">
          {tool.tags.slice(0, 6).map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* CTA */}
      <a
        href={tool.link}
        className="tool-visit-btn"
        target="_blank"
        rel="noopener noreferrer"
      >
        Visit Website
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 17L17 7M17 7H7M17 7V17" />
        </svg>
      </a>
    </div>
  );
}
