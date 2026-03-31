import Link from 'next/link'
import { Brain, Shield, Activity, Smartphone } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Brain className="w-8 h-8 text-violet-600" />
          <span className="text-xl font-bold text-gray-900">CogniScan AI</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium">
            Sign In
          </Link>
          <Link 
            href="/register" 
            className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 font-medium"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Early Detection of<br />
          <span className="text-violet-600">Cognitive Decline</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          AI-powered screening that detects early signs of cognitive decline through 
          speech patterns, facial expressions, and cognitive task analysis.
        </p>
        <div className="flex justify-center gap-4">
          <Link 
            href="/register" 
            className="bg-violet-600 text-white px-8 py-3 rounded-lg hover:bg-violet-700 font-medium text-lg"
          >
            Start Free Assessment
          </Link>
          <Link 
            href="#how-it-works" 
            className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-50 font-medium text-lg"
          >
            Learn More
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Activity className="w-8 h-8 text-violet-600" />}
            title="Daily 10-Min Assessment"
            description="Quick daily check-ins using your smartphone or computer - speech, video, and cognitive tasks."
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8 text-violet-600" />}
            title="Privacy-First AI"
            description="All processing happens on your device. Only anonymized scores are stored in the cloud."
          />
          <FeatureCard
            icon={<Smartphone className="w-8 h-8 text-violet-600" />}
            title="Early Detection"
            description="Detect MCI 6-12 months earlier through continuous monitoring and trend analysis."
          />
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-violet-600 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <Stat number="55M+" label="People Affected Globally" />
            <Stat number="50%" label="Cases Undiagnosed Until Late Stage" />
            <Stat number="83%" label="Cost Reduction with Early Detection" />
            <Stat number="6-12" label="Months Earlier Detection" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-6 h-6 text-violet-400" />
            <span className="text-lg font-bold text-white">CogniScan AI</span>
          </div>
          <p className="text-sm">
            AI-powered early detection of cognitive decline. Not for diagnostic use. 
            Consult healthcare professionals for medical advice.
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

function Stat({ number, label }: { number: string, label: string }) {
  return (
    <div>
      <div className="text-4xl font-bold mb-2">{number}</div>
      <div className="text-violet-200">{label}</div>
    </div>
  )
}
