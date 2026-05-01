import { useEffect, useState } from "react"
import CloseIcon from "../icons/CloseIcon"
import KeyIcon from "../icons/KeyIcon"
import MailIcon from "../icons/MailIcon"
import WarningIcon from "../icons/WarningIcon"

function isEmailValid(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

const COOLDOWN_INITIAL = 60
const COOLDOWN_EXTENDED = 120

export default function ForgotPasswordModal({
  onClose,
  onLogin,
}: {
  onClose: () => void
  onLogin: () => void
}) {
  const [email, setEmail] = useState("")
  const [emailFormatError, setEmailFormatError] = useState(false)
  const [sent, setSent] = useState(false)
  const [resendCount, setResendCount] = useState(0)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const id = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [countdown])

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  function sendResetLink(e?: React.SyntheticEvent) {
    e?.preventDefault()
    // TODO: call forgot password API with email
    console.log("send reset link to:", email)
    const next = resendCount + 1
    setSent(true)
    setResendCount(next)
    setCountdown(next >= 3 ? COOLDOWN_EXTENDED : COOLDOWN_INITIAL)
  }

  function formatCountdown(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${sec}s`
  }

  const inputClass =
    "w-full border border-outline-variant bg-transparent px-3 py-2 sm:px-4 sm:py-3 text-body-sm sm:text-body-md text-on-surface rounded-sm focus:outline-none focus:border-primary"
  const labelClass = "text-label-md text-on-surface-variant uppercase tracking-widest"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full sm:w-120 bg-surface-container-lowest rounded-sm p-6 sm:p-10 shadow-lg">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:cursor-pointer hover:text-on-surface transition-colors"
          aria-label="Close"
        >
          <CloseIcon />
        </button>

        {!sent ? (
          <>
            <div className="flex flex-col items-center mb-5 sm:mb-8">
              <div className="w-12 h-12 flex items-center justify-center bg-surface-container rounded-sm mb-5 text-on-surface-variant">
                <KeyIcon />
              </div>
              <h2 className="font-headline text-headline-sm text-on-background mb-2 text-center">
                Reset Password
              </h2>
              <p className="text-body-sm sm:text-body-md text-on-surface-variant text-center">
                Enter your email address to receive a password reset link.
              </p>
            </div>

            <form onSubmit={sendResetLink} className="flex flex-col gap-3 sm:gap-5">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Email Address</label>
                <input
                  type="text"
                  placeholder="johndoe@lumina.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => setEmailFormatError(!!email && !isEmailValid(email))}
                  onFocus={() => setEmailFormatError(false)}
                  className={inputClass}
                />
                {emailFormatError && (
                  <p className="flex items-center gap-1 text-label-md text-error"><WarningIcon />Please enter a valid email address.</p>
                )}
              </div>
              <button
                type="submit"
                disabled={!email || !isEmailValid(email)}
                className="w-full py-3 bg-primary text-on-primary text-body-sm sm:text-body-md rounded-sm cursor-pointer hover:opacity-90 transition-opacity mt-1 sm:mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Send Reset Link
              </button>
            </form>

            <p className="text-body-sm sm:text-body-md text-on-surface-variant text-center mt-4 sm:mt-6">
              Remembered your password?{" "}
              <button
                onClick={() => { onClose(); onLogin() }}
                className="text-on-surface font-semibold cursor-pointer hover:text-primary hover:underline transition-colors"
              >
                Back to Login
              </button>
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center mb-5 sm:mb-8">
              <div className="w-12 h-12 flex items-center justify-center bg-surface-container rounded-sm mb-5 text-on-surface-variant">
                <MailIcon />
              </div>
              <h2 className="font-headline text-headline-sm text-on-background mb-2 text-center">
                Check Your Inbox
              </h2>
              <p className="text-body-sm sm:text-body-md text-on-surface-variant text-center">
                If an account exists for{" "}
                <span className="text-on-surface font-semibold">{email}</span>,
                you'll receive a reset link shortly. The link expires in 15 minutes —
                check your spam folder if it doesn't appear.
              </p>
            </div>

            <button
              onClick={() => { onClose(); onLogin() }}
              className="w-full py-3 bg-primary text-on-primary text-body-sm sm:text-body-md rounded-sm cursor-pointer hover:opacity-90 transition-opacity"
            >
              Back to Login
            </button>

            <div className="mt-4 sm:mt-6 text-center flex flex-col items-center gap-1">
              {resendCount >= 3 && (
                <p className="text-body-sm text-on-surface-variant mb-1">
                  Still nothing? Make sure to check your spam or junk folder. Some email providers delay delivery by a few minutes.
                </p>
              )}
              <p className="text-body-sm sm:text-body-md text-on-surface-variant">
                Didn't receive it?
              </p>
              {countdown > 0 ? (
                <p className="text-body-sm text-on-surface-variant opacity-60 tabular-nums w-40 text-center">
                  Send again in {formatCountdown(countdown)}
                </p>
              ) : (
                <button
                  onClick={() => sendResetLink()}
                  className="text-body-sm sm:text-body-md text-on-surface font-semibold cursor-pointer hover:text-primary hover:underline transition-colors"
                >
                  Send again
                </button>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
