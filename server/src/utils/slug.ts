import crypto from "crypto"

export const generateSlug = (title: string, withSuffix: boolean = false): string => {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")  // remove special chars                                                           
    .replace(/\s+/g, "-")           // spaces to hyphens
    .replace(/-+/g, "-")            // collapse multiple hyphens     

  if (withSuffix) {
    const suffix = crypto.randomBytes(6).toString("hex")
    return `${base}-${suffix}`
  }

  return base
}