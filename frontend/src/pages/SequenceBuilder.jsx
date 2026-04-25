import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import Layout from '../components/Layout.jsx';
import RichEditor from '../components/RichEditor.jsx';
import EmailPreview from '../components/EmailPreview.jsx';
import { I } from '../components/Icons.jsx';

const DEFAULT_STEPS = [
  { day_offset: 0, subject: 'Quick question for {{business_name}}', body_html: '<p>Hi {{business_name}},</p><p>I noticed you don\'t have a website yet — we can help.</p>' },
  { day_offset: 3, subject: 'Following up — {{business_name}}', body_html: '<p>Just bumping this up. Open to a quick chat?</p>' },
  { day_offset: 7, subject: 'Last note — {{business_name}}', body_html: '<p>If now isn\'t the right time, no worries.</p>' },
];

export default function SequenceBuilder() {
  const { id } = useParams();
  const nav = useNavigate();
  const [seq, setSeq] = useState({ name: '', from_name: '', from_email: '', reply_to: '', active: true });
  const [steps, setSteps] = useState(DEFAULT_STEPS);
  const [activeStep, setActiveStep] = useState(0);
  const [savedId, setSavedId] = useState(id ? Number(id) : null);
  const [msg, setMsg] = useState('');
  const [enrollFilter, setEnrollFilter] = useState({ has_email: 'true', include_duplicates: 'false' });

  useEffect(() => {
    if (id) {
      api.getSequence(id).then(({ sequence, steps: stepRows }) => {
        setSeq({
          name: sequence.name || '',
          from_name: sequence.from_name || '',
          from_email: sequence.from_email || '',
          reply_to: sequence.reply_to || '',
          active: sequence.active,
        });
        if (stepRows?.length) setSteps(stepRows.map((s) => ({
          day_offset: s.day_offset, subject: s.subject, body_html: s.body_html, body_text: s.body_text,
        })));
      }).catch(() => {});
    }
  }, [id]);

  const updateStep = (i, patch) => setSteps((arr) => arr.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addStep = () => {
    const last = steps[steps.length - 1];
    setSteps((arr) => [...arr, { day_offset: (last?.day_offset || 0) + 3, subject: '', body_html: '<p></p>' }]);
    setActiveStep(steps.length);
  };
  const removeStep = (i) => setSteps((arr) => arr.filter((_, idx) => idx !== i));

  const save = async () => {
    try {
      let sid = savedId;
      const payload = { ...seq, steps };
      if (sid) {
        await api.updateSequence(sid, payload);
      } else {
        const r = await api.createSequence(payload);
        sid = r.id; setSavedId(sid);
        nav(`/sequences/${sid}`, { replace: true });
      }
      setMsg('Saved.');
      return sid;
    } catch (e) {
      setMsg(`Error: ${e.message}`);
      return null;
    }
  };

  const enroll = async () => {
    let sid = savedId;
    if (!sid) sid = await save();
    if (!sid) return;
    try {
      const r = await api.enroll(sid, { filter: enrollFilter });
      setMsg(`Enrolled ${r.enrolled} leads.`);
    } catch (e) { setMsg(`Error: ${e.message}`); }
  };

  const step = steps[activeStep] || steps[0];
  if (!step) return null;

  const actions = (
    <>
      <button className="btn-secondary" onClick={enroll}>
        <I.Users /> Enroll leads
      </button>
      <button className="btn-primary" onClick={save}>Save</button>
    </>
  );

  return (
    <Layout
      breadcrumb={['Outreach', 'Sequences', savedId ? 'Edit' : 'New']}
      title={savedId ? 'Edit sequence' : 'New sequence'}
      actions={actions}
    >
      <div className="card mb-4">
        <div className="font-semibold text-charcoal-100 mb-3">Sender</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="label">Name</label>
            <input className="input" value={seq.name} onChange={(e) => setSeq({ ...seq, name: e.target.value })} />
          </div>
          <div>
            <label className="label">From name</label>
            <input className="input" value={seq.from_name} onChange={(e) => setSeq({ ...seq, from_name: e.target.value })} />
          </div>
          <div>
            <label className="label">From email</label>
            <input className="input" value={seq.from_email} onChange={(e) => setSeq({ ...seq, from_email: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Reply-to</label>
            <input className="input" value={seq.reply_to} onChange={(e) => setSeq({ ...seq, reply_to: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card-flat overflow-hidden mb-4">
        <div className="flex border-b border-charcoal-800 overflow-x-auto bg-charcoal-875">
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveStep(i)}
              className={`px-4 py-3 text-sm whitespace-nowrap transition-colors ${i === activeStep
                ? 'bg-charcoal-850 text-brand-400 border-b-2 border-brand-500 font-medium'
                : 'text-charcoal-400 hover:bg-charcoal-800 hover:text-charcoal-200'}`}
            >
              Email {i + 1} · day {s.day_offset}
            </button>
          ))}
          <button onClick={addStep} className="px-4 py-3 text-sm text-brand-400 hover:bg-charcoal-800 whitespace-nowrap">
            + Add step
          </button>
        </div>
        <div className="p-5 grid lg:grid-cols-2 gap-5">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Day offset (after enrollment)</label>
                <input className="input" type="number" min="0" max="365" value={step.day_offset} onChange={(e) => updateStep(activeStep, { day_offset: Number(e.target.value) })} />
              </div>
              <div className="flex items-end justify-end">
                <button className="btn-ghost text-red-400" onClick={() => removeStep(activeStep)} disabled={steps.length <= 1}>
                  <I.Trash /> Remove
                </button>
              </div>
            </div>
            <div>
              <label className="label">Subject</label>
              <input className="input" value={step.subject} onChange={(e) => updateStep(activeStep, { subject: e.target.value })} />
            </div>
            <div>
              <label className="label">Body</label>
              <RichEditor value={step.body_html} onChange={(v) => updateStep(activeStep, { body_html: v })} />
            </div>
          </div>
          <div>
            <EmailPreview subject={step.subject} html={step.body_html} text={step.body_text} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="font-semibold text-charcoal-100 mb-3">Enroll leads</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <input className="input" placeholder="Country" value={enrollFilter.country || ''} onChange={(e) => setEnrollFilter({ ...enrollFilter, country: e.target.value })} />
          <input className="input" placeholder="Niche" value={enrollFilter.niche || ''} onChange={(e) => setEnrollFilter({ ...enrollFilter, niche: e.target.value })} />
          <input className="input" placeholder="Tag" value={enrollFilter.tag || ''} onChange={(e) => setEnrollFilter({ ...enrollFilter, tag: e.target.value })} />
          <select className="input" value={enrollFilter.has_email} onChange={(e) => setEnrollFilter({ ...enrollFilter, has_email: e.target.value })}>
            <option value="true">With email</option>
            <option value="">Any</option>
          </select>
        </div>
        <button className="btn-secondary" onClick={enroll}>
          <I.Users /> Enroll matching leads
        </button>
        {msg && <div className="text-sm text-charcoal-400 mt-3">{msg}</div>}
      </div>
    </Layout>
  );
}
