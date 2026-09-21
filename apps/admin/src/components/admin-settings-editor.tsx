'use client';

import { useState } from 'react';
import type { PublicSettings } from '@chonghub/core/modules/settings/contracts';

type SettingsForm = {
  opensAt: string;
  closesAt: string;
  deliveryMinutes: string;
  warrantyDays: string;
  termsVersion: string;
  nickname: string;
  wechatId: string;
  qrPath: string;
};

function toForm(settings: PublicSettings): SettingsForm {
  return {
    opensAt: settings.policy.opensAt,
    closesAt: settings.policy.closesAt,
    deliveryMinutes: String(settings.policy.deliveryMinutes),
    warrantyDays: String(settings.policy.warrantyDays),
    termsVersion: settings.policy.termsVersion,
    nickname: settings.customerService.nickname,
    wechatId: settings.customerService.wechatId,
    qrPath: settings.customerService.qrPath,
  };
}

export function AdminSettingsEditor({ settings }: { settings: PublicSettings }) {
  const [form, setForm] = useState(() => toForm(settings));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function setField(field: keyof SettingsForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
    setError('');
  }

  async function save() {
    const deliveryMinutes = Number(form.deliveryMinutes);
    const warrantyDays = Number(form.warrantyDays);
    if (!Number.isSafeInteger(deliveryMinutes) || deliveryMinutes <= 0 || !Number.isSafeInteger(warrantyDays) || warrantyDays <= 0) {
      setError('交付时效和保障天数必须是正整数。');
      return;
    }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          opensAt: form.opensAt,
          closesAt: form.closesAt,
          deliveryMinutes,
          warrantyDays,
          termsVersion: form.termsVersion,
          nickname: form.nickname,
          wechatId: form.wechatId,
          qrPath: form.qrPath,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json.error?.message ?? '保存失败，请稍后重试。');
        return;
      }
      setMessage('设置已保存。已有订单的规则快照不会被改写。');
    } catch {
      setError('网络异常，设置未保存。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="form-card admin-settings-editor">
      <fieldset>
        <legend>营业与交付</legend>
        <div className="settings-grid">
          <label>开始营业时间<input type="time" value={form.opensAt} onChange={(event) => setField('opensAt', event.target.value)} /></label>
          <label>结束营业时间<input type="time" value={form.closesAt} onChange={(event) => setField('closesAt', event.target.value)} /></label>
          <label>交付时效（营业分钟）<input inputMode="numeric" value={form.deliveryMinutes} onChange={(event) => setField('deliveryMinutes', event.target.value)} /></label>
          <label>保障天数（自然日）<input inputMode="numeric" value={form.warrantyDays} onChange={(event) => setField('warrantyDays', event.target.value)} /></label>
          <label>条款版本<input value={form.termsVersion} onChange={(event) => setField('termsVersion', event.target.value)} /></label>
        </div>
        <p className="field-help">营业时间按北京时间保存；修改只影响之后创建的订单，已经生成的预计时间保留原规则。</p>
      </fieldset>
      <fieldset>
        <legend>客服入口</legend>
        <div className="settings-grid">
          <label>客服昵称<input value={form.nickname} onChange={(event) => setField('nickname', event.target.value)} /></label>
          <label>微信号（仅展示）<input value={form.wechatId} onChange={(event) => setField('wechatId', event.target.value)} /></label>
          <label className="settings-wide">二维码路径<input value={form.qrPath} onChange={(event) => setField('qrPath', event.target.value)} /></label>
        </div>
        <p className="field-help">二维码文件应放在公共图片目录；暂不在后台上传文件，避免误覆盖正在使用的客服入口。</p>
      </fieldset>
      <div className="settings-actions">
        <button className="button button-primary" type="button" disabled={saving} onClick={save}>{saving ? '保存中…' : '保存设置'}</button>
        {message && <p className="form-success" role="status">{message}</p>}
        {error && <p className="form-message" role="alert">{error}</p>}
      </div>
    </div>
  );
}
