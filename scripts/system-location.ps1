$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and
    $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

function Await-Geoposition {
    param(
        [Parameter(Mandatory = $true)] $Operation,
        [Parameter(Mandatory = $true)] [Type] $ResultType
    )

    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($Operation))
    if (-not $netTask.Wait(20000)) {
        throw 'Geolocation timed out.'
    }

    return $netTask.Result
}

[Windows.Devices.Geolocation.Geolocator, Windows.Devices.Geolocation, ContentType = WindowsRuntime] | Out-Null

$locator = [Windows.Devices.Geolocation.Geolocator]::new()
$locator.DesiredAccuracy = [Windows.Devices.Geolocation.PositionAccuracy]::High
$locator.ReportInterval = 0

$position = Await-Geoposition `
    -Operation ($locator.GetGeopositionAsync([TimeSpan]::FromMinutes(1), [TimeSpan]::FromSeconds(15))) `
    -ResultType ([Windows.Devices.Geolocation.Geoposition])

$payload = [ordered]@{
    latitude = [double]$position.Coordinate.Point.Position.Latitude
    longitude = [double]$position.Coordinate.Point.Position.Longitude
    accuracy = [double]$position.Coordinate.Accuracy
    source = [string]$position.Coordinate.PositionSource
    timestamp = $position.Coordinate.Timestamp.ToString('o')
}

$payload | ConvertTo-Json -Compress
