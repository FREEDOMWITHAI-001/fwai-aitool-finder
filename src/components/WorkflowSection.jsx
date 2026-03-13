import { useState, useCallback } from 'react';
import ToolCard from './ToolCard';
import { getLocalWorkflow, generateWorkflowWithGemini, getToolsForCategory } from '../services/workflow';
import { useCredit, logToolUsage } from '../services/firebase';
import useGridColumns from '../hooks/useGridColumns';

const WORKFLOW_CREDIT_COST = 5;

const CATEGORY_ICONS = {
  video: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
  coding: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  design: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" />
    </svg>
  ),
  writing: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  marketing: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  audio: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
  ),
  research: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  automation: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
    </svg>
  ),
};

const CATEGORY_COLORS = {
  video: '#f472b6',
  coding: '#60a5fa',
  design: '#a78bfa',
  writing: '#34d399',
  marketing: '#fbbf24',
  audio: '#fb923c',
  research: '#38bdf8',
  automation: '#c084fc',
};

export default function WorkflowSection({ credits, setCredits, user, bookmarkedNames, onToggleBookmark }) {
  const [goal, setGoal] = useState('');
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stepToolCounts, setStepToolCounts] = useState({});
  const columns = useGridColumns('tool-list');

  const handleSeeMore = useCallback(async (stepNumber, category, currentCount) => {
    if (credits < 1) return;

    const newCount = currentCount + columns;
    const allTools = getToolsForCategory(category, newCount);
    // Ensure we only show complete rows
    const adjusted = allTools.slice(0, Math.floor(allTools.length / columns) * columns);

    // Only deduct if we actually got more tools
    if (adjusted.length > currentCount) {
      setStepToolCounts(prev => ({ ...prev, [stepNumber]: adjusted }));
      setCredits(prev => Math.max(prev - 1, 0));
      if (user?.uid) {
        await logToolUsage(user.uid, 'ai_radar', 'workflow_show_more');
        useCredit(user.uid, 1).then(serverBalance => {
          if (typeof serverBalance === 'number') setCredits(serverBalance);
        }).catch(() => {});
      }
    }
  }, [columns, credits, user, setCredits]);

  const runWorkflow = useCallback(async (query) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 3) return;

    if (credits < WORKFLOW_CREDIT_COST) return;

    setLoading(true);
    setWorkflow(null);
    setStepToolCounts({});

    // Show "Generating Workflow..." state briefly
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Show local workflow instantly
    const local = getLocalWorkflow(trimmed);
    setWorkflow(local);
    setLoading(false);

    // Deduct 5 credits after workflow is successfully generated
    setCredits(prev => Math.max(prev - WORKFLOW_CREDIT_COST, 0));
    if (user?.uid) {
      await logToolUsage(user.uid, 'ai_radar', 'workflow');
      useCredit(user.uid, WORKFLOW_CREDIT_COST).then(serverBalance => {
        if (typeof serverBalance === 'number') setCredits(serverBalance);
      }).catch(() => {});
    }

    // Try upgrading with Gemini in background
    try {
      const gemini = await generateWorkflowWithGemini(trimmed);
      if (gemini.steps && gemini.steps.length > 0) {
        setWorkflow(gemini);
      }
    } catch {
      // Local workflow already showing
    }
  }, [credits, user, setCredits]);

  const handleGenerate = useCallback(() => {
    if (loading) return;
    runWorkflow(goal);
  }, [goal, loading, runWorkflow]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleSuggestion = (s) => {
    setGoal(s);
    if (!loading) runWorkflow(s);
  };

  return (
    <div className="workflow-section">
      {/* Input */}
      <div className="workflow-input-wrapper">
        <div className="workflow-input-box">
          <input
            type="text"
            className="workflow-input"
            placeholder="Enter your goal... e.g., 'Start a YouTube channel', 'Build a website'"
            value={goal}
            onChange={e => setGoal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            className="workflow-generate-btn"
            onClick={handleGenerate}
            disabled={credits < WORKFLOW_CREDIT_COST}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" />
                Building...
              </span>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="13 17 18 12 13 7" />
                  <polyline points="6 17 11 12 6 7" />
                </svg>
                Generate Workflow
              </>
            )}
          </button>
        </div>
        <div className="workflow-suggestions">
          {['Start a YouTube channel', 'Build a website', 'Create a marketing campaign', 'Start a podcast', 'Build a mobile app', 'Launch an online course'].map(s => (
            <button
              key={s}
              className="workflow-suggestion-chip"
              onClick={() => handleSuggestion(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && !workflow && (
        <div className="workflow-loading">
          <div className="ai-summary analyzing-pulse">
            <span className="ai-summary-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
            </span>
            Generating your workflow for "{goal}"... Mapping the best AI tools for each step.
          </div>
          <div className="workflow-skeleton">
            <div className="skeleton-block" />
            <div className="skeleton-block" />
            <div className="skeleton-block" />
          </div>
        </div>
      )}

      {/* Workflow Steps with Tool Cards */}
      {workflow && (
        <div className="workflow-result">
          <div className="workflow-goal-header">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
              Workflow: {workflow.goal}
            </h3>
            <span className="workflow-step-count">{workflow.steps.length} steps</span>
          </div>

          {workflow.steps.map((step) => (
            <div key={step.number} className="workflow-step-block">
              {/* Step Header */}
              <div className="workflow-step-title-row">
                <div
                  className="workflow-step-badge"
                  style={{ background: CATEGORY_COLORS[step.category] || 'var(--primary)' }}
                >
                  {step.number}
                </div>
                <div className="workflow-step-info">
                  <div className="workflow-step-name-row">
                    <h4>{step.title}</h4>
                    <span
                      className="workflow-category-tag"
                      style={{
                        borderColor: CATEGORY_COLORS[step.category],
                        color: CATEGORY_COLORS[step.category],
                      }}
                    >
                      {CATEGORY_ICONS[step.category]}
                      {step.categoryLabel}
                    </span>
                  </div>
                  <p className="workflow-step-desc">{step.description}</p>
                </div>
              </div>

              {/* Tool Cards — same layout as Find Tools */}
              {step.tools.length > 0 && (() => {
                // Use dynamic column count to fill rows completely
                const savedTools = stepToolCounts[step.number];
                const dynamicTools = savedTools || getToolsForCategory(step.category, columns || 2);
                // Ensure complete rows only
                const rowAligned = dynamicTools.length >= columns
                  ? dynamicTools.slice(0, Math.floor(dynamicTools.length / columns) * columns)
                  : dynamicTools;
                const displayTools = rowAligned.length > 0 ? rowAligned : dynamicTools;
                const totalAvailable = getToolsForCategory(step.category, 100).length;
                const hasMore = displayTools.length < totalAvailable;
                return (
                  <>
                    <div className="tool-list workflow-tool-list">
                      {displayTools.map((tool, idx) => (
                        <ToolCard
                          key={`${step.number}-${tool.name}`}
                          tool={tool}
                          index={idx}
                          isBookmarked={bookmarkedNames?.has(tool.name)}
                          onToggleBookmark={onToggleBookmark}
                          isSelected={false}
                          onToggleCompare={() => {}}
                        />
                      ))}
                    </div>
                    {hasMore && (
                      <button
                        className="workflow-see-more-btn"
                        onClick={() => handleSeeMore(step.number, step.category, displayTools.length)}
                        disabled={credits < 1}
                      >
                        See More {step.categoryLabel} Tools (1 credit)
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!workflow && !loading && (
        <div className="workflow-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 3 21 3 21 8" />
            <line x1="4" y1="20" x2="21" y2="3" />
            <polyline points="21 16 21 21 16 21" />
            <line x1="15" y1="15" x2="21" y2="21" />
            <line x1="4" y1="4" x2="9" y2="9" />
          </svg>
          <p>Enter a goal above and we'll create a step-by-step AI-powered workflow with recommended tools for each step.</p>
        </div>
      )}
    </div>
  );
}
