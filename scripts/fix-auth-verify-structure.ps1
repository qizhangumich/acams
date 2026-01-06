# Fix auth/verify directory structure
# Ensures correct nested directory structure for Next.js App Router

Write-Host "🔍 Checking directory structure..." -ForegroundColor Cyan

# Step 1: Check if files exist
$pageTsx = "app/auth/verify/page.tsx"
$pageCss = "app/auth/verify/page.module.css"

if (-not (Test-Path $pageTsx)) {
    Write-Host "❌ $pageTsx not found!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $pageCss)) {
    Write-Host "❌ $pageCss not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Files exist" -ForegroundColor Green

# Step 2: Check Git paths
Write-Host "`n🔍 Checking Git paths..." -ForegroundColor Cyan

$gitFiles = git ls-files app/auth/verify/
$hasBackslash = $gitFiles | Where-Object { $_ -match '\\' }

if ($hasBackslash) {
    Write-Host "❌ Found backslash in Git paths!" -ForegroundColor Red
    Write-Host "Files with backslash:" -ForegroundColor Yellow
    $hasBackslash | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    Write-Host "`n⚠️  This will cause 404 errors in Next.js!" -ForegroundColor Yellow
} else {
    Write-Host "✅ All Git paths use forward slashes" -ForegroundColor Green
    $gitFiles | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
}

# Step 3: Verify directory structure
Write-Host "`n🔍 Verifying directory structure..." -ForegroundColor Cyan

$authDir = Get-Item "app/auth" -ErrorAction SilentlyContinue
if (-not $authDir) {
    Write-Host "❌ app/auth directory not found!" -ForegroundColor Red
    exit 1
}

$verifyDir = Get-Item "app/auth/verify" -ErrorAction SilentlyContinue
if (-not $verifyDir) {
    Write-Host "❌ app/auth/verify directory not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Directory structure is correct:" -ForegroundColor Green
Write-Host "  app/" -ForegroundColor Gray
Write-Host "    auth/" -ForegroundColor Gray
Write-Host "      verify/" -ForegroundColor Gray
Write-Host "        page.tsx" -ForegroundColor Gray
Write-Host "        page.module.css" -ForegroundColor Gray

# Step 4: Check for incorrectly named directories
Write-Host "`n🔍 Checking for incorrectly named directories..." -ForegroundColor Cyan

$allDirs = Get-ChildItem app/ -Directory -Recurse | Where-Object { 
    $_.Name -like "*auth*" -or $_.Name -like "*verify*" 
}

$badDirs = $allDirs | Where-Object { $_.Name -match '\\' }

if ($badDirs) {
    Write-Host "❌ Found directories with backslash in name!" -ForegroundColor Red
    $badDirs | ForEach-Object { 
        Write-Host "  $($_.FullName)" -ForegroundColor Yellow 
    }
    Write-Host "`n⚠️  These need to be fixed!" -ForegroundColor Yellow
} else {
    Write-Host "✅ No incorrectly named directories found" -ForegroundColor Green
}

# Step 5: Final verification
Write-Host "`n✅ Directory structure verification complete!" -ForegroundColor Green
Write-Host "`n📋 Summary:" -ForegroundColor Cyan
Write-Host "  - Files exist: ✅" -ForegroundColor Green
Write-Host "  - Git paths: $(
    if ($hasBackslash) { '❌ (has backslash)' } else { '✅ (forward slashes)' }
)" -ForegroundColor $(if ($hasBackslash) { 'Red' } else { 'Green' })
Write-Host "  - Directory structure: ✅" -ForegroundColor Green
Write-Host "  - Directory names: $(
    if ($badDirs) { '❌ (has backslash)' } else { '✅ (correct)' }
)" -ForegroundColor $(if ($badDirs) { 'Red' } else { 'Green' })

if ($hasBackslash -or $badDirs) {
    Write-Host "`n⚠️  Action required: Fix directory structure!" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "`n✅ All checks passed! Directory structure is correct." -ForegroundColor Green
    exit 0
}

