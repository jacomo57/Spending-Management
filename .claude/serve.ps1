# Tiny static file server for local testing (this PC has no node or python).
# Serves the repo root on http://localhost:8765/
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8'; '.webmanifest'='application/manifest+json'; '.png'='image/png'; '.svg'='image/svg+xml'; '.ico'='image/x-icon' }
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:8765/')
# Second origin = separate browser storage, used to act as a "second device" in tests.
$listener.Prefixes.Add('http://127.0.0.1:8765/')
$listener.Start()
Write-Host "Serving $root on http://localhost:8765/"
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($rel -eq '') { $rel = 'index.html' }
    $path = [IO.Path]::GetFullPath((Join-Path $root $rel))
    $inside = $path.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)
    $hidden = $rel -match '(^|[\\/])\.'
    if ($inside -and -not $hidden -and (Test-Path $path -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($path)
      $type = $types[[IO.Path]::GetExtension($path).ToLower()]
      if (-not $type) { $type = 'application/octet-stream' }
      $ctx.Response.ContentType = $type
      $ctx.Response.Headers.Add('Cache-Control', 'no-store')
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
    Write-Host "$($ctx.Response.StatusCode) /$rel"
  } catch {
    Write-Host "error: $_"
  } finally {
    $ctx.Response.Close()
  }
}
