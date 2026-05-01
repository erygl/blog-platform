import { useState } from "react"
import { Link, NavLink } from "react-router-dom"
import heroImage from "../assets/landing_stories.png"
import EditorIcon from "../components/icons/EditorIcon"
import GlobeIcon from "../components/icons/GlobeIcon"
import SparkleIcon from "../components/icons/SparkleIcon"
import Footer from "../components/layout/Footer"
import ForgotPasswordModal from "../components/modals/ForgotPasswordModal"
import LoginModal from "../components/modals/LoginModal"
import RegisterModal from "../components/modals/RegisterModal"

export default function Home() {
  const [registerOpen, setRegisterOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)

  const features = [
    {
      icon: <EditorIcon />,
      title: "Intuitive Editor",
      description: "A distraction-free writing environment that stays out of your way and lets the words flow naturally.",
    },
    {
      icon: <GlobeIcon />,
      title: "Global Reach",
      description: "Connect with a global audience of intentional readers who value depth over digital noise.",
    },
    {
      icon: <SparkleIcon />,
      title: "Creative Freedom",
      description: "Full control over your narrative style with beautiful layouts designed to elevate long-form content.",
    },
  ]

  return (
    <div className="min-h-screen flex flex-col font-body bg-background text-on-background">

      {/* Header */}
      <header className="flex items-center justify-between px-gutter py-4 border-b border-outline-variant">
        <Link to="/" className="font-headline text-2xl text-primary font-semibold tracking-tight">
          Lumina
        </Link>
        <nav className="flex items-center gap-4 md:gap-6">
          <NavLink to="/about" className="hidden sm:block text-body-md text-on-surface-variant hover:text-on-surface transition-colors">
            About
          </NavLink>
          <button
            onClick={() => setLoginOpen(true)}
            className="hidden sm:block text-body-md text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            Sign In
          </button>
          <button
            onClick={() => setRegisterOpen(true)}
            className="px-4 py-2 md:px-5 bg-primary text-on-primary text-body-sm rounded-sm cursor-pointer hover:opacity-80 transition-opacity"
          >
            Get Started
          </button>
        </nav>
      </header>

      <main className="flex-1">

        {/* Hero */}
        <section className="grid grid-cols-1 md:grid-cols-2">
          <div className="flex flex-col justify-center px-gutter md:px-xl py-lg order-2 md:order-1">
            <h1 className="font-headline text-headline-lg md:text-headline-lg lg:text-display-xl font-black leading-tight text-on-background mb-6">
              Where your stories find their light.
            </h1>
            <p className="text-body-md md:text-body-xl text-on-surface-variant mb-8 md:mb-10">
              Join a community of deep thinkers and creative writers. We provide the digital quiet you need to let your voice resonate.
            </p>
            <button
              onClick={() => setRegisterOpen(true)}
              className="self-start px-10 py-3 bg-primary text-on-primary text-body-md rounded-sm cursor-pointer hover:opacity-80 transition-opacity"
            >
              Start Writing
            </button>
          </div>
          <div className="order-1 md:order-2 md:flex md:items-center md:justify-center md:p-lg">
            <img
              src={heroImage}
              alt="Stories"
              className="w-full h-64 md:h-auto md:max-h-105 object-cover md:rounded-sm"
            />
          </div>
        </section>

        {/* Features */}
        <section className="py-xl px-gutter bg-surface-container-low">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <p className="text-label-md text-on-surface-variant uppercase tracking-widest mb-3">Our Foundation</p>
            <h2 className="font-headline text-headline-md md:text-headline-lg text-on-background">Crafted for Clarity</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {features.map((feature) => (
              <div key={feature.title} className="bg-surface-container p-8 rounded-sm">
                <div className="w-10 h-10 flex items-center justify-center bg-surface-container-highest rounded-sm mb-6 text-on-surface-variant">
                  {feature.icon}
                </div>
                <h3 className="font-headline text-headline-sm text-on-background mb-3">{feature.title}</h3>
                <p className="text-body-md text-on-surface-variant leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-xl px-gutter bg-primary text-on-primary text-center">
          <h2 className="font-headline text-headline-md md:text-headline-lg mb-4">Your narrative begins here.</h2>
          <p className="text-body-md md:text-body-xl mb-10 opacity-80 max-w-2xl mx-auto">
            Experience the serenity of intentional writing and connect with a community that listens.
          </p>
          <button
            onClick={() => setRegisterOpen(true)}
            className="inline-block px-8 py-3 border border-on-primary text-on-primary text-body-md rounded-sm cursor-pointer hover:bg-on-primary hover:text-primary transition-colors mb-4"
          >
            Create Your Account
          </button>
          <p className="text-body-md opacity-60">No credit card required. Start free, forever.</p>
        </section>

      </main>

      <Footer />

      {registerOpen && (
        <RegisterModal
          onClose={() => setRegisterOpen(false)}
          onLogin={() => setLoginOpen(true)}
        />
      )}
      {loginOpen && (
        <LoginModal
          onClose={() => setLoginOpen(false)}
          onRegister={() => setRegisterOpen(true)}
          onForgotPassword={() => setForgotPasswordOpen(true)}
        />
      )}
      {forgotPasswordOpen && (
        <ForgotPasswordModal
          onClose={() => setForgotPasswordOpen(false)}
          onLogin={() => setLoginOpen(true)}
        />
      )}

    </div>
  )
}
