import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';
import { FiPlus, FiSend, FiZap, FiSave, FiCheck } from 'react-icons/fi';
import { toast } from 'react-toastify';

import HudCard from '../../../components/V2/HudCard';
import HudButton from '../../../components/V2/HudButton';
import HudText from '../../../components/V2/HudText';
import HudInput from '../../../components/V2/HudInput';
import HudSelect from '../../../components/V2/HudSelect';
import HexLoader from '../../../components/V2/HexLoader';
import RestrictedArea from '../../../components/V2/RestrictedArea';
import { writingDraftsApi } from '../../../infrastructure/content/writingDraftsApi';
import { useSeedContext } from '../../seed/presentation/SeedContext';
import { resolveStoredSummaryWorkspaceId } from '../../../domain/auth/storedSummarySelectors';
import { readViewerStoredUserSummary } from '../../auth/presentation/browserAuthSessionSupport';

const rows = (res) =>
  res?.data?.data?.results ||
  res?.data?.results ||
  res?.data?.data ||
  (Array.isArray(res?.data) ? res.data : []) ||
  [];

const one = (res) => res?.data?.data || res?.data || null;

const TONES = [
  { value: 'professional', label: 'professional' },
  { value: 'concise', label: 'concise' },
  { value: 'urgent', label: 'urgent' }
];

/**
 * HudDraftStudio — the Reports authoring surface: drafts rail + HTML editor +
 * the AI-assist chat (grounded `draft-with-ai` through the writing agent).
 * Single-screen HUD panel content. `seedTemplate` ({title, body_html}) creates
 * a pre-filled draft on mount (the Templates "DRAFT WITH AI" hand-off).
 */
export default function HudDraftStudio({ seedTemplate = null }) {
  const { seed } = useSeedContext();
  const workspaceId =
    seed?.id ||
    seed?.pk ||
    resolveStoredSummaryWorkspaceId(readViewerStoredUserSummary()) ||
    null;

  const [drafts, setDrafts] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [active, setActive] = useState(null); // full draft object
  const [title, setTitle] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // AI assist
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('professional');
  const [generating, setGenerating] = useState(false);
  const editorRef = useRef(null);
  const seededRef = useRef(false);

  const loadDrafts = useCallback(async () => {
    if (!workspaceId) {
      setLoadingList(false);
      return [];
    }
    setLoadingList(true);
    try {
      const res = await writingDraftsApi.list(workspaceId);
      const list = rows(res);
      setDrafts(list);
      return list;
    } catch {
      setDrafts([]);
      return [];
    } finally {
      setLoadingList(false);
    }
  }, [workspaceId]);

  const openDraft = useCallback((d) => {
    setActive(d);
    setTitle(d?.title || '');
    setBodyHtml(d?.body_html || '');
    setMessages([]);
    setDirty(false);
    if (editorRef.current) editorRef.current.innerHTML = d?.body_html || '';
  }, []);

  const createDraft = useCallback(
    async (initial = null) => {
      if (!workspaceId) return;
      try {
        const res = await writingDraftsApi.create({
          workspace_id: workspaceId,
          title: initial?.title || 'Untitled report',
          kind: 'memo',
          ...(initial?.body_html ? { body_html: initial.body_html } : {})
        });
        const d = one(res);
        if (initial?.body_html && d?.id && !d.body_html) {
          // Some create paths ignore body — persist the template scaffold.
          await writingDraftsApi.update(d.id, { body_html: initial.body_html });
          d.body_html = initial.body_html;
        }
        await loadDrafts();
        if (d) openDraft(d);
      } catch {
        toast.error('Unable to create draft', { icon: '⚠️' });
      }
    },
    [workspaceId, loadDrafts, openDraft]
  );

  useEffect(() => {
    (async () => {
      const list = await loadDrafts();
      if (seedTemplate && !seededRef.current) {
        seededRef.current = true;
        await createDraft(seedTemplate);
      } else if (list.length) {
        openDraft(list[0]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const save = useCallback(async () => {
    if (!active?.id) return;
    setSaving(true);
    try {
      const html = editorRef.current ? editorRef.current.innerHTML : bodyHtml;
      await writingDraftsApi.update(active.id, { title, body_html: html });
      setBodyHtml(html);
      setDirty(false);
      toast.success('Draft saved', { icon: '💾' });
      loadDrafts();
    } catch {
      toast.error('Unable to save draft', { icon: '⚠️' });
    } finally {
      setSaving(false);
    }
  }, [active, title, bodyHtml, loadDrafts]);

  const runAssist = useCallback(async () => {
    const clean = prompt.trim();
    if (!clean || !active?.id || generating) return;
    setGenerating(true);
    setPrompt('');
    setMessages((prev) => [...prev, { role: 'user', text: clean }]);
    try {
      const html = editorRef.current ? editorRef.current.innerHTML : bodyHtml;
      const res = await writingDraftsApi.draftWithAi(active.id, {
        prompt: clean,
        tone,
        existing_body_html: html || undefined,
        conversation: messages.slice(-6)
      });
      const d = one(res) || res?.data || {};
      const generated = d.body_html || '';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text:
            d.excerpt ||
            'Draft generated — review and apply it to the editor.',
          bodyHtml: generated,
          faithfulness: d.faithfulness,
          sources: d.source_chunks || []
        }
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text:
            e?.response?.data?.error ||
            'Generation failed — check the AI configuration.',
          error: true
        }
      ]);
    } finally {
      setGenerating(false);
    }
  }, [prompt, active, generating, tone, bodyHtml, messages]);

  const applyToEditor = useCallback((html) => {
    if (!html) return;
    setBodyHtml(html);
    setDirty(true);
    if (editorRef.current) editorRef.current.innerHTML = html;
    toast.success('Applied to editor — Save to persist', { icon: '⚡' });
  }, []);

  if (!workspaceId) {
    return (
      <RestrictedArea
        variant="info"
        title="REPORTS"
        subtitle="NO WORKSPACE SELECTED"
      />
    );
  }

  return (
    <div className="flex h-[74vh] w-full gap-3 p-1">
      {/* ── Drafts rail ── */}
      <div className="flex w-[220px] flex-shrink-0 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <HudText variant="label" color="cyan-muted">
            REPORTS
          </HudText>
          <button
            type="button"
            onClick={() => createDraft()}
            className="flex items-center gap-1 border border-hud-line/25 px-1.5 py-0.5 font-mono text-[9px] text-hud-accent transition hover:border-hud-accent/50"
          >
            <FiPlus size={10} /> NEW
          </button>
        </div>
        <div className="flex-1 overflow-y-auto cc-scrollbar">
          {loadingList ? (
            <div className="flex justify-center py-6">
              <HexLoader size={36} />
            </div>
          ) : drafts.length === 0 ? (
            <span className="px-1 font-mono text-[9px] text-hud-dim">
              — NO REPORTS —
            </span>
          ) : (
            drafts.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => openDraft(d)}
                className={`block w-full border-l-2 px-2 py-2 text-left transition ${
                  String(active?.id) === String(d.id)
                    ? 'border-hud-accent bg-cyan-500/[0.06]'
                    : 'border-transparent hover:bg-cyan-500/[0.03]'
                }`}
              >
                <span className="block truncate font-mono text-[11px] text-hud-text">
                  {d.title || 'Untitled'}
                </span>
                <span className="block font-mono text-[8px] uppercase text-hud-dim">
                  {d.kind || 'memo'} · {d.status || 'draft'}
                  {d.ai_drafted ? ' · AI' : ''}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Editor ── */}
      <HudCard
        chamfer={14}
        border="cyan"
        surface="bg-hud-surface/70 backdrop-blur-sm"
        bodyClassName="flex h-full flex-col p-3"
        className="min-w-0 flex-1"
      >
        {!active ? (
          <div className="flex h-full items-center justify-center">
            <RestrictedArea
              variant="info"
              title="REPORT EDITOR"
              subtitle="SELECT OR CREATE A REPORT"
            />
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex-1">
                <HudInput
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Report title…"
                  className="px-2 py-1"
                />
              </div>
              <HudButton
                variant="primary"
                icon={saving ? <FiCheck size={12} /> : <FiSave size={12} />}
                disabled={saving || !dirty}
                onClick={save}
              >
                {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
              </HudButton>
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={() => setDirty(true)}
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
              className="hud-report-editor flex-1 overflow-y-auto cc-scrollbar border border-hud-line/[0.08] bg-hud-surface/40 px-4 py-3 font-mono text-[12px] leading-relaxed text-hud-text outline-none focus:border-hud-line/25"
            />
            <style>{`
              .hud-report-editor h1,.hud-report-editor h2{color:rgb(var(--hud-accent));font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:10px 0 4px}
              .hud-report-editor p{margin:0 0 8px}
              .hud-report-editor strong{color:rgb(var(--hud-accent))}
              .hud-report-editor ul{margin:0 0 8px 16px;list-style:square}
            `}</style>
          </>
        )}
      </HudCard>

      {/* ── AI assist rail ── */}
      <div className="flex w-[300px] flex-shrink-0 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-wider text-hud-accent">
            <FiZap size={11} /> AI ASSIST
          </span>
          <HudSelect
            label="Tone"
            value={tone}
            onChange={setTone}
            options={TONES}
          />
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto cc-scrollbar pr-1">
          {messages.length === 0 && !generating && (
            <p className="px-1 font-mono text-[9px] leading-relaxed text-hud-dim">
              Ask the writing agent to draft or refine this report — e.g.
              “Draft an incident report for the impossible-travel alert on
              svc-deploy” or “tighten the containment section”.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`border px-2.5 py-2 font-mono text-[10px] leading-relaxed ${
                m.role === 'user'
                  ? 'border-hud-accent/30 bg-cyan-500/[0.06] text-hud-text'
                  : m.error
                  ? 'border-rose-500/30 bg-rose-500/[0.05] text-rose-300'
                  : 'border-hud-line/15 bg-hud-surface/60 text-hud-dim'
              }`}
            >
              <span className="mb-1 block text-[7px] font-bold tracking-wider text-hud-dim">
                {m.role === 'user' ? 'YOU' : 'WRITING AGENT'}
              </span>
              {m.text}
              {m.bodyHtml && (
                <button
                  type="button"
                  onClick={() => applyToEditor(m.bodyHtml)}
                  className="mt-2 block w-full border border-hud-accent/40 bg-hud-accent/[0.08] px-2 py-1 text-center font-mono text-[9px] font-bold tracking-wider text-hud-accent transition hover:bg-hud-accent/[0.15]"
                >
                  ⚡ APPLY TO EDITOR
                </button>
              )}
            </div>
          ))}
          {generating && (
            <div className="flex items-center gap-2 px-1 py-2">
              <HexLoader size={26} />
              <span className="font-mono text-[9px] text-hud-dim">
                GROUNDED DRAFTING…
              </span>
            </div>
          )}
        </div>
        <div className="mt-2 flex items-end gap-1.5">
          <div className="min-w-0 flex-1">
            <HudInput
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runAssist();
              }}
              placeholder={active ? 'Ask the agent…' : 'Select a report first'}
              disabled={!active || generating}
              className="px-2 py-1"
            />
          </div>
          <HudButton
            variant="primary"
            icon={<FiSend size={12} />}
            disabled={!active || generating || !prompt.trim()}
            onClick={runAssist}
          >
            Ask
          </HudButton>
        </div>
      </div>
    </div>
  );
}
