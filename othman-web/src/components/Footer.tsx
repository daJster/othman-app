import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export interface FooterProps {
  variant?: 'simple' | 'extended'
}

export function Footer({ variant = 'simple' }: FooterProps) {
  const { t } = useTranslation('common')

  if (variant === 'simple') {
    return (
      <footer className="py-8 px-4 bg-white text-black dark:bg-green-900 dark:text-slate-100 text-center">
        <p>© {new Date().getFullYear()} {t('appName')}. {t('copyright')}</p>
      </footer>
    )
  }

  return <ExtendedFooter />
}

function ExtendedFooter() {
  const { t } = useTranslation('common')
  const footer = t('footer', { returnObjects: true }) as {
    about: string
    aboutDesc: string
    quickLinks: string
    home: string
    quran: string
    tafsir: string
    features: string
    contact: string
    resources: string
    resourcesDesc: string
    mobileApp: string
    download: string
    desktopApp: string
    install: string
    legal: string
    terms: string
    privacy: string
    cookies: string
    faq: string
    subscribe: string
    subscribeDesc: string
    email: string
    subscribeBtn: string
    social: string
    madeWith: string
    love: string
    for: string
  }

  return (
    <footer className="bg-white text-neutral-700 dark:bg-green-900 dark:text-slate-100 w-full">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{footer.about}</h3>
            <p className="text-sm">
              {footer.aboutDesc}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{footer.quickLinks}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="transition-colors">
                  {footer.home}
                </Link>
              </li>
              <li>
                <Link to="/quran" className="transition-colors">
                  {footer.quran}
                </Link>
              </li>
              <li>
                <Link to="/tafsir" className="transition-colors">
                  {footer.tafsir}
                </Link>
              </li>
              <li>
                <Link to="/features" className="transition-colors">
                  {footer.features}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="transition-colors">
                  {footer.contact}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold ">{footer.resources}</h3>
            <ul className="space-y-2">
              <li className="text-green-300">
                {footer.resourcesDesc}
              </li>
              <li>
                <Link to="/app" className="transition-colors">
                  {footer.mobileApp}
                </Link>
              </li>
              <li>
                <Link to="/download" className="transition-colors">
                  {footer.download}
                </Link>
              </li>
              <li>
                <Link to="/desktop" className="transition-colors">
                  {footer.desktopApp}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold ">{footer.legal}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="transition-colors">
                  {footer.terms}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="transition-colors">
                  {footer.privacy}
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="transition-colors">
                  {footer.cookies}
                </Link>
              </li>
              <li>
                <Link to="/faq" className="transition-colors">
                  {footer.faq}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Social & Copyright */}
        <div className="mt-8 pt-8 border-t border-green-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} {t('appName')}. {t('copyright')}</p>
        </div>
      </div>
    </footer>
  )
}