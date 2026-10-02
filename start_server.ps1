# Servidor HTTP local para KineElectro 3D (Accesible desde PC y Teléfonos en la misma red Wi-Fi)
$port = 8080
$folder = $PSScriptRoot

# Detectar IP local de la máquina
$localIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*", "Ethernet*" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty IPAddress -First 1)
if (-not $localIp) { $localIp = "127.0.0.1" }

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)

try {
    $listener.Start()
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "  KineElectro 3D - Servidor Activo (PC y Celular)!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  💻 En tu PC:     http://localhost:$port/index.html" -ForegroundColor Yellow
    Write-Host "  📱 En tu CELULAR: http://$($localIp):$port/index.html" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  (Asegúrate de que tu celular esté conectado al mismo Wi-Fi)" -ForegroundColor DarkGray
    Write-Host "  Presiona Ctrl+C en esta consola para detener el servidor." -ForegroundColor Gray
    Write-Host "==========================================================" -ForegroundColor Cyan

    # Abrir navegador en la PC automáticamente
    Start-Process "http://localhost:$port/index.html"

    while ($true) {
        $client = $listener.AcceptTcpClient()
        [System.Threading.Tasks.Task]::Run({
            param($tcpClient, $rootFolder)
            try {
                $stream = $tcpClient.GetStream()
                $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::UTF8)
                $requestLine = $reader.ReadLine()
                if (-not $requestLine) { return }

                $parts = $requestLine -split ' '
                if ($parts.Length -lt 2) { return }

                $urlPath = $parts[1].Split('?')[0].TrimStart('/')
                if ([string]::IsNullOrEmpty($urlPath)) { $urlPath = "index.html" }
                $urlPath = [System.Uri]::UnescapeDataString($urlPath)

                $filePath = Join-Path $rootFolder $urlPath

                if (Test-Path $filePath -PathType Leaf) {
                    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                    $mime = switch ($ext) {
                        ".html" { "text/html; charset=utf-8" }
                        ".js"   { "application/javascript; charset=utf-8" }
                        ".css"  { "text/css; charset=utf-8" }
                        ".json" { "application/json; charset=utf-8" }
                        ".png"  { "image/png" }
                        ".svg"  { "image/svg+xml" }
                        Default { "application/octet-stream" }
                    }

                    $bytes = [System.IO.File]::ReadAllBytes($filePath)
                    $header = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nContent-Length: $($bytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                    $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    $stream.Write($bytes, 0, $bytes.Length)
                } else {
                    $msg = "404 Not Found"
                    $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain`r`nContent-Length: $($msg.Length)`r`nConnection: close`r`n`r`n$msg"
                    $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                }
            } catch {
            } finally {
                $tcpClient.Close()
            }
        }.GetNewClosure(), @($client, $folder))
    }
} catch {
    Write-Host "Error en el servidor: $_" -ForegroundColor Red
} finally {
    $listener.Stop()
}
