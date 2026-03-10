import { useState, useCallback } from "react"
import { Building2, Globe, FileText, Check, Loader2 } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { api } from "../../lib/api"
import { Button } from "@/components/ui/button"

export default function CompanyPage() {
  const { profile, fetchProfile } = useAuth()

  const [company, setCompany] = useState(profile?.company || "")
  const [website, setWebsite] = useState(profile?.company_website || "")
  const [description, setDescription] = useState(profile?.company_description || "")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const isDirty =
    company !== (profile?.company || "") ||
    website !== (profile?.company_website || "") ||
    description !== (profile?.company_description || "")

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaved(false)
    try {
      await api.updateProfile({
        company: company.trim(),
        company_website: website.trim(),
        company_description: description.trim(),
      })
      if (profile?.id) await fetchProfile(profile.id)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error("Failed to save company profile:", err)
    } finally {
      setSaving(false)
    }
  }, [company, website, description, profile?.id, fetchProfile])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Company</h2>
          <p className="text-sm text-muted-foreground">Your company profile information</p>
        </div>
      </div>

      {/* Form */}
      <div className="glass-card rounded-xl p-6 space-y-6">
        {/* Company name */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            Company name
          </label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Inc."
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>

        {/* Website */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Globe className="w-4 h-4 text-muted-foreground" />
            Website
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://acme.com"
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <FileText className="w-4 h-4 text-muted-foreground" />
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of your company, your market, and what you do..."
            rows={4}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
          />
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving || !isDirty}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {saved ? "Saved" : "Save"}
            {saved && <Check className="w-4 h-4 ml-1.5" />}
          </Button>
          {saved && (
            <span className="text-sm text-emerald-600 font-medium">Changes saved successfully</span>
          )}
        </div>
      </div>
    </div>
  )
}
