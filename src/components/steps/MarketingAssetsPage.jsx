import { Palette } from "lucide-react"

export default function MarketingAssetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold gradient-heading">Marketing Assets</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your marketing collateral, brand assets, and creative resources.
        </p>
      </div>

      <div className="glass-card rounded-xl p-12 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-100 text-violet-500">
          <Palette className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Coming soon</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Track brand guidelines, creative assets, landing pages, and campaign materials — all in one place.
        </p>
      </div>
    </div>
  )
}
