import React from 'react';
import { Zap, Check, X, SkipForward, Circle } from 'lucide-react';

interface PhaseInfo {
    phase: number;
    label: string;
    status: 'pending' | 'running' | 'done' | 'error' | 'skipped';
    result: string;
}

export type { PhaseInfo };

interface WorkflowProgressProps {
    phases: PhaseInfo[];
    workflowResult: string;
}

const PHASE_ICONS: Record<string, React.ReactNode> = {
    pending: <Circle size={12} />,
    running: <Zap size={12} fill="currentColor" />,
    done: <Check size={12} strokeWidth={3} />,
    error: <X size={12} strokeWidth={3} />,
    skipped: <SkipForward size={10} />,
};

const WorkflowProgress: React.FC<WorkflowProgressProps> = ({ phases, workflowResult }) => {
    const isIdle = phases.length === 0;
    const completedCount = phases.filter(p => p.status === 'done' || p.status === 'skipped' || p.status === 'error').length;
    const totalCount = phases.length || 5;
    const progressPct = (completedCount / totalCount) * 100;
    const activePhase = phases.find(p => p.status === 'running');
    const isComplete = completedCount === totalCount && phases.length > 0;

    return (
        <div className="aero-panel workflow-progress-panel">
            {/* Header */}
            <div className="aero-panel-header" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Zap size={14} style={{ color: 'var(--accent-primary)' }} />
                    <span className="aero-panel-label" style={{ fontSize: 10, letterSpacing: '0.2em' }}>
                        Workflow Progress
                    </span>
                </div>
                <div className={`wfp-status-indicator ${isIdle ? 'wfp-status--idle' : isComplete ? 'wfp-status--complete' : 'wfp-status--active'}`}>
                    {isIdle ? 'Ready' : isComplete ? 'Complete' : 'Running'}
                </div>
            </div>

            {/* Body */}
            <div className="workflow-progress-body">
                {isIdle ? (
                    <div className="wfp-idle-state">
                        <div className="wfp-idle-dots">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="wfp-phase-dot wfp-phase--pending">
                                    <div className="wfp-dot-inner">
                                        <Circle size={10} />
                                    </div>
                                    {i < 5 && <div className="wfp-connector" />}
                                </div>
                            ))}
                        </div>
                        <div className="wfp-idle-label">
                            Awaiting workflow execution
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Phase stepper */}
                        <div className="wfp-stepper">
                            {phases.map((p, idx) => (
                                <div key={p.phase} className={`wfp-phase-dot wfp-phase--${p.status}`}>
                                    <div className="wfp-dot-inner" title={`Phase ${p.phase}: ${p.label} — ${p.status}`}>
                                        {PHASE_ICONS[p.status]}
                                    </div>
                                    {idx < phases.length - 1 && (
                                        <div className={`wfp-connector ${p.status === 'done' ? 'wfp-connector--filled' : ''}`} />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Phase labels */}
                        <div className="wfp-phase-labels">
                            {phases.map(p => (
                                <div key={p.phase} className={`wfp-phase-label ${p.status === 'running' ? 'wfp-label--active' : ''}`}>
                                    <span className="wfp-label-num">{p.phase}</span>
                                </div>
                            ))}
                        </div>

                        {/* Progress bar */}
                        <div className="wfp-progress-bar-track">
                            <div
                                className="wfp-progress-bar-fill"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>

                        {/* Active phase label */}
                        <div className="wfp-active-label">
                            {activePhase ? (
                                <>
                                    <span className="wfp-active-phase-num">Phase {activePhase.phase}/{totalCount}</span>
                                    <span className="wfp-active-sep">—</span>
                                    <span className="wfp-active-name">{activePhase.label}</span>
                                </>
                            ) : isComplete ? (
                                <span className="wfp-complete-label">All phases finished</span>
                            ) : null}
                        </div>

                        {/* Per-phase results */}
                        <div className="wfp-results">
                            {phases.filter(p => p.result).map(p => (
                                <div key={p.phase} className={`wfp-result-line wfp-result--${p.status}`}>
                                    <span className="wfp-result-phase">P{p.phase}</span>
                                    <span className="wfp-result-text">{p.result}</span>
                                </div>
                            ))}
                        </div>

                        {/* Final result */}
                        {workflowResult && (
                            <div className="wfp-final-result">
                                {workflowResult}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default WorkflowProgress;
