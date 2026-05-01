import { useState } from "react"
import CloseIcon from "../icons/CloseIcon"

type LoginData = { email: string; password: string }

export default function LoginModal({
  onClose,
  onRegister,
  onForgotPassword,
}: {
  onClose: () => void
  onRegister: () => void
  onForgotPassword: () => void
}) {
  const [form, setForm] = useState<LoginData>({ email: "", password: "" })

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    // TODO: call login API with form data
    console.log(form)
  }

  const inputClass =
    "w-full border border-outline-variant bg-transparent px-3 py-2 sm:px-4 sm:py-3 text-body-sm sm:text-body-md text-on-surface rounded-sm focus:outline-none focus:border-primary"
  const labelClass = "text-label-md text-on-surface-variant uppercase tracking-widest"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full sm:w-120 bg-surface-container-lowest rounded-sm p-6 sm:p-10 shadow-lg max-h-[90vh] overflow-y-auto">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:cursor-pointer hover:text-on-surface transition-colors"
          aria-label="Close"
        >
          <CloseIcon />
        </button>

        <h2 className="font-headline text-headline-sm text-on-background mb-2 text-center">
          Welcome Back
        </h2>
        <p className="text-body-sm sm:text-body-md text-on-surface-variant text-center mb-5 sm:mb-8">
          Sign in to your Lumina library.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-5">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Email Address</label>
            <input
              type="email"
              required
              placeholder="johndoe@lumina.com"
              value={form.email}
              onChange={e => setForm(s => ({ ...s, email: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className={labelClass}>Password</label>
              <button
                type="button"
                onClick={() => { onClose(); onForgotPassword() }}
                className="text-label-md text-tertiary hover:opacity-80 hover:underline transition-opacity cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(s => ({ ...s, password: e.target.value }))}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={!form.email || !form.password}
            className="w-full py-3 bg-primary text-on-primary text-body-sm sm:text-body-md rounded-sm cursor-pointer hover:opacity-90 transition-opacity mt-1 sm:mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Sign In
          </button>
        </form>

        <p className="text-body-sm sm:text-body-md text-on-surface-variant text-center mt-4 sm:mt-6">
          Don't have an account?{" "}
          <button
            onClick={() => { onClose(); onRegister() }}
            className="text-on-surface font-semibold cursor-pointer hover:text-primary hover:underline transition-colors"
          >
            Register
          </button>
        </p>

      </div>
    </div>
  )
}
