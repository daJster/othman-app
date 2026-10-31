import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {Footer} from "@/components/Footer.tsx";
import HomePageHeader from "@/pages/home/components/HomePageHeader.tsx";

export function HomePage() {
  const { t } = useTranslation('common')

  return (
    <div className="absolute top-0 left-0 min-h-screen w-full bg-linear-to-b from-green-50 to-white">
      <div className="flex flex-col items-center">
        <HomePageHeader />

        {/* Featured Verse Section */}
        <section className="w-full py-16 px-4 bg-green-100/50">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-semibold mb-8 text-green-800">{t('verseOfTheDay')}</h2>
            <Card className="bg-white border-green-200 shadow-lg">
              <CardContent className="pt-6">
                <p className="text-3xl font-medium text-green-900 leading-relaxed mb-4">
                  {t('verse3')}
                </p>
                <p className="text-muted-foreground">
                  {t('verse3Ref')}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-green-900">{t('features')}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                title={t('readQuran')}
                description={t('readQuranDesc')}
              />
              <FeatureCard
                title={t('tafsir')}
                description={t('tafsirDesc')}
              />
              <FeatureCard
                title={t('search')}
                description={t('searchDesc')}
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-20 px-4 bg-linear-to-r from-green-600 to-green-700 text-center text-white">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl font-bold">{t('cta')}</h2>
            <p className="text-green-100">
              {t('ctaDesc')}
            </p>
            <Button size="lg" className="mt-4 bg-white text-green-800 hover:bg-green-50">
              {t('cta')}
            </Button>
          </div>
        </section>

        {/* Footer */}
        <Footer variant={'extended'} />
      </div>
    </div>
  )
}


function FeatureCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Card className="border-green-200">
      <CardHeader>
        <CardTitle className="text-green-800 text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  )
}
