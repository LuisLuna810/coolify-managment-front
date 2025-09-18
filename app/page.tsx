export default function HomePage() {
  // El middleware se encarga de todos los redirects
  // Esta página solo muestra loading mientras redirige
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <h1 className="text-2xl font-bold text-foreground mt-4">Redirecting...</h1>
        <p className="text-muted-foreground mt-2">Please wait while we redirect you...</p>
      </div>
    </div>
  )
}
