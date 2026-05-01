import { useState } from "react"
import { Link } from "react-router-dom"
import KeyIcon from "../components/icons/KeyIcon"
import WarningIcon from "../components/icons/WarningIcon"
import Footer from "../components/layout/Footer"

function isPasswordValid(p: string) {
  return p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p)
}

export default function ResetPassword() {
  const [form, setForm] = useState({ password: "", confirm: "" })
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const passwordValid = isPasswordValid(form.password)

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setSubmitAttempted(true)
    if (!passwordValid) return
    if (form.password !== form.confirm) return
    // TODO: call reset password API with token from URL and form.password
    console.log("reset password:", form.password)
  }

  const inputClass = "w-full border border-outline-variant bg-transparent px-3 py-2 sm:px-4 sm:py-3 text-body-sm sm:text-body-md text-on-surface rounded-sm focus:outline-none focus:border-primary"
  const labelClass = "text-label-md text-on-surface-variant uppercase tracking-widest"
  const errorClass = "flex items-center gap-1 text-label-md text-error"

  return (
    <div className="min-h-screen flex flex-col font-body bg-background text-on-background">

      <header className="flex items-center px-gutter py-4 border-b border-outline-variant">
        <Link to="/" className="font-headline text-2xl text-primary font-semibold tracking-tight">
          Lumina
        </Link>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-10 sm:py-xl">
        <div className="w-full max-w-120 mx-auto">

          <div className="flex flex-col items-center mb-6 sm:mb-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-surface-container rounded-sm mb-4 sm:mb-5 text-on-surface-variant">
              <KeyIcon />
            </div>
            <h1 className="font-headline text-headline-sm sm:text-headline-md text-on-background mb-2 sm:mb-3 text-center">
              Set a new password
            </h1>
            <p className="text-body-sm sm:text-body-md text-on-surface-variant text-center">
              Choose a strong password you haven't used before. Your account security matters.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-5">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>New Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(s => ({ ...s, password: e.target.value }))}
                className={inputClass}
              />
              {submitAttempted && !form.password && (
                <p className={errorClass}><WarningIcon />Password is required.</p>
              )}
              {form.password && !passwordValid && (
                <p className={errorClass}><WarningIcon />Use at least 8 characters — a mix of uppercase and lowercase letters and at least one number.</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Confirm New Password</label>
              <input
                type="password"
                value={form.confirm}
                onChange={e => setForm(s => ({ ...s, confirm: e.target.value }))}
                className={`${inputClass} ${form.confirm && form.password !== form.confirm ? "border-error focus:border-error" : ""}`}
              />
              {submitAttempted && !form.confirm && (
                <p className={errorClass}><WarningIcon />Please confirm your password.</p>
              )}
              {form.confirm && form.password !== form.confirm && (
                <p className={errorClass}><WarningIcon />Passwords do not match.</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 sm:py-3 bg-primary text-on-primary text-body-sm sm:text-body-md rounded-sm cursor-pointer hover:opacity-90 transition-opacity mt-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reset Password
            </button>
          </form>

        </div>
      </main>

      <Footer />

    </div>
  )
}
