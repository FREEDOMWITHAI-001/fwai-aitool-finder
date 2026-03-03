const categories = [
  { label: 'Video', query: 'I need AI tools for video editing and creation' },
  { label: 'Coding', query: 'I need an AI coding assistant for software development' },
  { label: 'Design', query: 'I need AI tools for graphic design and image creation' },
  { label: 'Writing', query: 'I need AI tools for writing and content creation' },
  { label: 'Marketing', query: 'I need AI tools for digital marketing and SEO' },
  { label: 'Audio', query: 'I need AI tools for audio production and voice generation' },
  { label: 'Research', query: 'I need AI tools for academic research and analysis' },
  { label: 'Automation', query: 'I need AI tools to automate repetitive tasks and workflows' },
];

export default function CategoryChips({ activeChip, onChipClick }) {
  return (
    <div className="category-chips">
      {categories.map(cat => (
        <button
          key={cat.label}
          className={`chip ${activeChip === cat.label ? 'active' : ''}`}
          onClick={() => onChipClick(cat.label, cat.query)}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
