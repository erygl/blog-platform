import { Link } from "react-router-dom"
import CheckCircleIcon from "../components/icons/CheckCircleIcon"
import Footer from "../components/layout/Footer"

export default function EmailVerified() {
  return (
    <div className="min-h-screen flex flex-col font-body bg-background text-on-background">

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-xl text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-surface-container rounded-sm mb-8 text-on-surface-variant">
          <CheckCircleIcon />
        </div>

        <h1 className="font-headline text-headline-md sm:text-headline-lg text-on-background mb-4">
          Your email has been verified.
        </h1>

        <p className="text-body-md sm:text-body-xl text-on-surface-variant max-w-120 mb-10">
          Welcome to the home for intentional readers. Your account is now active and ready.
        </p>

        <Link
          to="/"
          className="px-8 py-3 bg-primary text-on-primary text-body-md rounded-30 hover:opacity-90 transition-opacity"
        >
          Start Reading
        </Link>
      </main>

      <Footer />

    </div>
  )
}
