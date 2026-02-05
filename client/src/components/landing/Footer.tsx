import { AteneaLogo } from "@/components/atenea-logo";
import { useLanguage } from "@/contexts/language-context";

export default function Footer() {
  const { t } = useLanguage();
  
  return (
    <footer className="py-16 bg-navy-dark border-t border-navy-light/30">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center">
                <AteneaLogo 
                  variant="svg" 
                  size={40} 
                  showText={false}
                  className="[&_img]:w-full [&_img]:h-full"
                />
              </div>
              <span className="font-display text-xl font-semibold text-white">
                Atenea
              </span>
            </div>
            <p className="text-white/90 font-body text-sm leading-relaxed">
              {t('landing.footer.tagline')}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">{t('landing.footer.product')}</h4>
            <ul className="space-y-3">
              <li><a href="#features" className="text-white/90 hover:text-silver-light transition-colors text-sm">{t('nav.features')}</a></li>
              <li><a href="#pricing" className="text-white/90 hover:text-silver-light transition-colors text-sm">{t('nav.pricing')}</a></li>
              <li><a href="#" className="text-white/90 hover:text-silver-light transition-colors text-sm">{t('landing.footer.integrations')}</a></li>
              <li><a href="#" className="text-white/90 hover:text-silver-light transition-colors text-sm">API</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">{t('landing.footer.company')}</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-white/90 hover:text-silver-light transition-colors text-sm">{t('landing.footer.about')}</a></li>
              <li><a href="#" className="text-white/90 hover:text-silver-light transition-colors text-sm">{t('landing.footer.blog')}</a></li>
              <li><a href="#" className="text-white/90 hover:text-silver-light transition-colors text-sm">{t('landing.footer.careers')}</a></li>
              <li><a href="#" className="text-white/90 hover:text-silver-light transition-colors text-sm">{t('landing.footer.contact')}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">{t('landing.footer.legal')}</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-white/90 hover:text-silver-light transition-colors text-sm">{t('landing.footer.terms')}</a></li>
              <li><a href="#" className="text-white/90 hover:text-silver-light transition-colors text-sm">{t('landing.footer.privacy')}</a></li>
              <li><a href="#" className="text-white/90 hover:text-silver-light transition-colors text-sm">{t('landing.footer.legalNotice')}</a></li>
              <li><a href="#" className="text-white/90 hover:text-silver-light transition-colors text-sm">LFPDPPP</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-navy-light/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/80 text-sm font-body">
            © 2024 Atenea. {t('landing.footer.rights')}
          </p>
          <p className="text-white/80 text-sm font-body">
            {t('landing.footer.madeIn')}
          </p>
        </div>
      </div>
    </footer>
  );
}
