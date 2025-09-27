import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  Languages, 
  Zap, 
  Download, 
  Share2, 
  Palette,
  Database,
  Shield
} from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Creativity',
    description: 'Advanced AI understands Hindi poetry patterns and creates authentic, emotionally resonant lyrics.',
    badge: 'Smart'
  },
  {
    icon: Languages,
    title: 'Rich Hindi Heritage',
    description: 'Trained on thousands of classic Hindi songs to maintain cultural authenticity and poetic beauty.',
    badge: 'Cultural'
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Generate complete songs with lyrics and music in under 5 minutes using cutting-edge AI technology.',
    badge: 'Fast'
  },
  {
    icon: Palette,
    title: 'Multiple Styles',
    description: 'Choose from various Hindi music styles - Classical, Bollywood, Folk, Sufi, and contemporary.',
    badge: 'Versatile'
  },
  {
    icon: Download,
    title: 'High-Quality Audio',
    description: 'Download your songs in premium audio quality, ready for sharing or professional use.',
    badge: 'Quality'
  },
  {
    icon: Share2,
    title: 'Easy Sharing',
    description: 'Share your creations instantly with friends, family, or on social media platforms.',
    badge: 'Social'
  },
  {
    icon: Database,
    title: 'Personal Library',
    description: 'All your songs are saved securely in your personal library for easy access anytime.',
    badge: 'Organized'
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'Your creations are private by default. You control who can access your musical masterpieces.',
    badge: 'Secure'
  }
]

export function FeaturesSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Features
          </Badge>
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
            Everything You Need to Create
          </h2>
          <p className="mx-auto max-w-[700px] text-lg text-muted-foreground">
            Powerful features designed to help you create beautiful Hindi music effortlessly
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="relative group hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {feature.badge}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
