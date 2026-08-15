import { useLanguage } from '../i18n/LanguageContext';
import './LegalPage.css';

interface LegalPageProps { type: 'privacy' | 'terms'; }

/** Minimal privacy / terms placeholder — real text to be supplied by the operator */
export function LegalPage({ type }: LegalPageProps) {
  const { t } = useLanguage();
  const isPrivacy = type === 'privacy';
  const title = isPrivacy ? t('footer.privacy') : t('footer.terms');
  return (
    <div className="legal-page">
      <h1 className="legal-title">{title}</h1>
      <div className="legal-body">
        {isPrivacy ? (
          <>
            <p>我们仅收集提供服务所必需的信息：注册邮箱、您撰写的故事文本，以及生成配乐所需的记录。</p>
            <p>我们不会向第三方出售您的个人数据。您可随时删除自己的故事与账户。</p>
          </>
        ) : (
          <>
            <p>使用本服务即表示您同意：您对发布的内容负责，并授权本平台存储与展示这些内容。</p>
            <p>AI 生成的配乐仅供个人欣赏使用。请勿用于商业用途或侵犯他人权利。</p>
          </>
        )}
        <p className="legal-note">（完整法律文本由运营方补充）</p>
      </div>
    </div>
  );
}
