import { getPublicSettings } from '@chonghub/core/modules/settings/service';
import { AdminSettingsEditor } from '@/components/admin-settings-editor';
export const dynamic='force-dynamic';
export default async function AdminSettingsPage(){const settings=await getPublicSettings();return <main className="content-page"><section className="container narrow-page"><span className="eyebrow">服务设置</span><h1>公开规则与客服</h1><p className="page-lede">这些字段会影响新需求单展示和后续人工引导。保存前请核对营业时间与客服二维码路径。</p><AdminSettingsEditor settings={settings}/></section></main>}
