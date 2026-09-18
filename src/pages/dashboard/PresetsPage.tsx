import { useMemo, useState } from 'react';
import { Page } from '../../components/common/Page';
import { presetRepository } from '../../repositories/presetRepository';
import { useAuthStore } from '../../store/authStore';
import type { StyleCategory, StylePreset, StyleTarget } from '../../types/style';

const categoryLabels: Record<StyleCategory, string> = {
  cut: '컷',
  perm: '펌',
  color: '컬러',
  style: '스타일',
};

const targetLabels: Record<StyleTarget, string> = {
  male: '남성',
  female: '여성',
  unisex: '공용',
};

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `preset-${Date.now()}`;
}

type PresetFormState = {
  name: string;
  description: string;
  target: StyleTarget;
  category: StyleCategory;
  tags: string;
  aiInstruction: string;
  referenceImages: string;
};

const emptyForm: PresetFormState = {
  name: '',
  description: '',
  target: 'unisex',
  category: 'style',
  tags: '',
  aiInstruction: '',
  referenceImages: '',
};

function toForm(preset: StylePreset): PresetFormState {
  return {
    name: preset.name,
    description: preset.description,
    target: preset.target,
    category: preset.category,
    tags: preset.tags.join(', '),
    aiInstruction: preset.aiInstruction,
    referenceImages: preset.referenceImages.join(', '),
  };
}

export default function PresetsPage() {
  const stylist = useAuthStore(s => s.stylist);
  const [presets, setPresets] = useState<StylePreset[]>(() => presetRepository.getAll());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PresetFormState>(emptyForm);
  const [error, setError] = useState('');

  const editingPreset = useMemo(() => presets.find(preset => preset.id === editingId) ?? null, [editingId, presets]);

  function refresh() {
    setPresets(presetRepository.getAll());
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setEditorOpen(true);
  }

  function openEdit(preset: StylePreset) {
    setEditingId(preset.id);
    setForm(toForm(preset));
    setError('');
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  }

  function savePreset() {
    const name = form.name.trim();
    if (!name) {
      setError('프리셋 이름을 입력해주세요.');
      return;
    }

    const now = new Date().toISOString();
    const existing = editingPreset;
    const preset: StylePreset = {
      id: existing?.id ?? makeId(),
      salonId: existing?.salonId ?? 'salon-1',
      name,
      description: form.description.trim(),
      target: form.target,
      category: form.category,
      tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      referenceImages: form.referenceImages.split(',').map(url => url.trim()).filter(Boolean),
      aiInstruction: form.aiInstruction.trim(),
      createdBy: existing?.createdBy ?? stylist?.id ?? 'stylist-1',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    presetRepository.save(preset);
    refresh();
    closeEditor();
  }

  function removePreset(preset: StylePreset) {
    const ok = window.confirm(`“${preset.name}” 프리셋을 삭제할까요?\n상담 중 선택된 프리셋에는 이미 저장된 값이 남습니다.`);
    if (!ok) return;
    presetRepository.remove(preset.id);
    if (editingId === preset.id) closeEditor();
    refresh();
  }

  return <Page>
    <section className="page-heading">
      <div>
        <p className="eyebrow">STYLE PRESETS</p>
        <h1>스타일 프리셋</h1>
        <p>미용사가 상담에 사용하는 스타일 방향을 직접 추가·수정·삭제할 수 있습니다.</p>
      </div>
      <button className="primary" onClick={openCreate}>＋ 스타일 프리셋 추가</button>
    </section>

    {editorOpen && <section className="preset-editor panel">
      <div className="section-heading">
        <div><p className="eyebrow">PRESET CONFIGURATION</p><h2>{editingPreset ? '프리셋 수정' : '새 프리셋 추가'}</h2></div>
        <button className="ghost" onClick={closeEditor}>닫기</button>
      </div>
      <div className="preset-form-grid">
        <label>프리셋 이름<input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="예: Soft See-through" /></label>
        <label>성별 / 구분<select value={form.target} onChange={e => setForm({ ...form, target: e.target.value as StyleTarget })}>{Object.entries(targetLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label>스타일 카테고리<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as StyleCategory })}>{Object.entries(categoryLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label>태그<input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="Natural, Clean, Light" /></label>
        <label className="full-span">스타일 설명<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="고객 화면에 보여줄 스타일 설명" /></label>
        <label className="full-span">AI 스타일 설명<textarea value={form.aiInstruction} onChange={e => setForm({ ...form, aiInstruction: e.target.value })} placeholder="AI 이미지 생성에 사용할 기술적인 스타일 설명" /></label>
        <label className="full-span">스타일 참고 이미지 URL<textarea value={form.referenceImages} onChange={e => setForm({ ...form, referenceImages: e.target.value })} placeholder="이미지 URL을 쉼표로 구분해 입력" /></label>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="button-row"><button className="secondary" onClick={closeEditor}>취소</button><button className="primary" onClick={savePreset}>{editingPreset ? '수정 저장' : '프리셋 저장'}</button></div>
    </section>}

    <div className="preset-grid preset-management-grid">
      {presets.map(preset => <article className="preset-card managed" key={preset.id}>
        {preset.referenceImages[0] && <img className="preset-thumb" src={preset.referenceImages[0]} alt="" />}
        <div className="preset-card-content">
          <div className="preset-meta"><span>{categoryLabels[preset.category]}</span><span>{targetLabels[preset.target]}</span></div>
          <strong>{preset.name}</strong>
          <span>{preset.description || '설명이 없습니다.'}</span>
          <small>{preset.tags.length ? preset.tags.join(' · ') : '태그 없음'}</small>
          <div className="button-row preset-actions"><button className="secondary compact" onClick={() => openEdit(preset)}>수정</button><button className="danger compact" onClick={() => removePreset(preset)}>삭제</button></div>
        </div>
      </article>)}
    </div>

    {!presets.length && <div className="empty-state panel"><div><h2>등록된 프리셋이 없습니다.</h2><p>첫 번째 스타일 프리셋을 추가해보세요.</p><button className="primary" onClick={openCreate}>＋ 스타일 프리셋 추가</button></div></div>}
  </Page>;
}
