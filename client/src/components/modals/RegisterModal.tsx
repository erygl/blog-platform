import { useState } from "react"
import { Link } from "react-router-dom"
import CloseIcon from "../icons/CloseIcon"
import CameraIcon from "../icons/CameraIcon"
import WarningIcon from "../icons/WarningIcon"

type Step1Data = {
  name: string; username: string; email: string; password: string;
}
type Step2Data = { bio: string; avatar: File | null }

function isEmailValid(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

function isPasswordValid(p: string) {
  return p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p)
}

export default function RegisterModal({ onClose, onLogin }: { onClose: () => void; onLogin: () => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [step1, setStep1] = useState<Step1Data>(
    { name: "", username: "", email: "", password: "" }
  )
  const [step2, setStep2] = useState<Step2Data>({ bio: "", avatar: null })
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [emailFormatError, setEmailFormatError] = useState(false)

  function close() {
    onClose()
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) close()
  }

  function handleNext(e: React.SyntheticEvent) {
    e.preventDefault()
    setSubmitAttempted(true)
    if (!step1.name || !step1.username || !step1.email || !step1.password) return
    if (step1.username.length < 3) return
    if (!isEmailValid(step1.email)) { setEmailFormatError(true); return }
    if (!isPasswordValid(step1.password)) return
    // TODO: call register API with step1 data
    console.log(step1)
    setStep(2)
  }

  function handleCompleteProfile(e: React.SyntheticEvent) {
    e.preventDefault()
    // TODO: call update profile API with step2 data
    console.log(step2)
    close()
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setStep2(s => ({ ...s, avatar: file }))
    if (file) setAvatarPreview(URL.createObjectURL(file))
  }

  const inputClass = "w-full border border-outline-variant bg-transparent px-3 py-2 sm:px-4 sm:py-3 text-body-sm sm:text-body-md text-on-surface rounded-sm focus:outline-none focus:border-primary"
  const labelClass = "text-label-md text-on-surface-variant uppercase tracking-widest"
  const errorClass = "flex items-center gap-1 text-label-md text-error"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full sm:w-120 bg-surface-container-lowest rounded-sm p-6 sm:p-10 shadow-lg max-h-[90vh] overflow-y-auto">

        <button
          onClick={close}
          className="absolute top-4 right-4 text-on-surface-variant hover:cursor-pointer hover:text-on-surface transition-colors"
          aria-label="Close"
        >
          <CloseIcon />
        </button>

        {step === 1 && (
          <>
            <h2 className="font-headline text-headline-sm text-on-background mb-2">
              Begin your journey
            </h2>
            <p className="text-body-sm sm:text-body-md text-on-surface-variant mb-5 sm:mb-8">
              Create an account to start your collection of voices.
            </p>
            <form onSubmit={handleNext} className="flex flex-col gap-3 sm:gap-5">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  maxLength={50}
                  value={step1.name}
                  onChange={e => setStep1(s => ({ ...s, name: e.target.value }))}
                  className={inputClass}
                />
                {submitAttempted && !step1.name && (
                  <p className={errorClass}><WarningIcon />Full name is required.</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Username</label>
                <input
                  type="text"
                  placeholder="john_doe"
                  maxLength={30}
                  value={step1.username}
                  onChange={e => setStep1(s => ({ ...s, username: e.target.value.replace(/\s/g, "") }))}
                  className={inputClass}
                />
                {submitAttempted && !step1.username && (
                  <p className={errorClass}><WarningIcon />Username is required.</p>
                )}
                {step1.username && step1.username.length < 3 && (
                  <p className={errorClass}><WarningIcon />Username must be at least 3 characters.</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Email Address</label>
                <input
                  type="text"
                  placeholder="johndoe@lumina.com"
                  value={step1.email}
                  onChange={e => setStep1(s => ({ ...s, email: e.target.value }))}
                  onBlur={() => setEmailFormatError(!!step1.email && !isEmailValid(step1.email))}
                  onFocus={() => setEmailFormatError(false)}
                  className={inputClass}
                />
                {submitAttempted && !step1.email && (
                  <p className={errorClass}><WarningIcon />Email address is required.</p>
                )}
                {emailFormatError && (
                  <p className={errorClass}><WarningIcon />Please enter a valid email address.</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={step1.password}
                  onChange={e => setStep1(s => ({ ...s, password: e.target.value }))}
                  className={inputClass}
                />
                {submitAttempted && !step1.password && (
                  <p className={errorClass}><WarningIcon />Password is required.</p>
                )}
                {step1.password && !isPasswordValid(step1.password) && (
                  <p className={errorClass}><WarningIcon />Use at least 8 characters — a mix of uppercase and lowercase letters and at least one number.</p>
                )}
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-primary text-on-primary text-body-sm sm:text-body-md rounded-sm hover:cursor-pointer hover:opacity-90 transition-opacity mt-1 sm:mt-2"
              >
                Create Account
              </button>
            </form>
            <p className="text-body-sm sm:text-body-md text-on-surface-variant text-center mt-4 sm:mt-6">
              Already have an account?{" "}
              <button
                onClick={() => { onClose(); onLogin() }}
                className="text-on-surface font-semibold cursor-pointer hover:text-primary hover:underline transition-colors"
              >
                Log In
              </button>
            </p>
            <p className="text-label-md text-on-surface-variant text-center mt-2 sm:mt-3 opacity-70">
              By joining, you agree to our{" "}
              <Link to="/terms" className="underline hover:text-on-surface transition-colors">Terms</Link>
              {" "}and{" "}
              <Link to="/privacy" className="underline hover:text-on-surface transition-colors">Privacy Policy</Link>.
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-headline text-headline-sm text-on-background mb-2 text-center">
              Complete Your Profile
            </h2>
            <p className="text-body-sm sm:text-body-md text-on-surface-variant text-center mb-5 sm:mb-8">
              A few details to help us personalize your reading journey.
            </p>
            <form onSubmit={handleCompleteProfile} className="flex flex-col gap-4 sm:gap-6">

              <div className="flex flex-col items-center gap-2">
                <label htmlFor="avatar-upload" className="cursor-pointer">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-dashed border-outline-variant rounded-sm flex items-center justify-center overflow-hidden hover:border-primary transition-colors bg-surface-container-low">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-on-surface-variant"><CameraIcon /></span>
                    )}
                  </div>
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <span className="text-label-md text-on-surface-variant uppercase tracking-widest">Profile Picture</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-body-sm sm:text-body-md text-on-surface">Short Bio</label>
                  <span className={`text-label-md ${step2.bio.length >= 160 ? "text-error" : "text-on-surface-variant"}`}>
                    {step2.bio.length}/160
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={160}
                  placeholder="Tell us about yourself..."
                  value={step2.bio}
                  onChange={e => setStep2(s => ({ ...s, bio: e.target.value }))}
                  className="w-full border border-outline-variant bg-transparent px-3 py-2 sm:px-4 sm:py-3 text-body-sm sm:text-body-md text-on-surface rounded-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 sm:py-3 bg-primary text-on-primary text-body-sm sm:text-body-md rounded-sm hover:cursor-pointer hover:opacity-90 transition-opacity"
              >
                Complete Profile
              </button>
            </form>

            <button
              onClick={close}
              className="w-full text-center text-body-sm sm:text-body-md text-on-surface-variant hover:cursor-pointer hover:text-on-surface transition-colors mt-3 sm:mt-4"
            >
              Skip for now
            </button>
          </>
        )}

      </div>
    </div>
  )
}
