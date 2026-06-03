# ================================================================
# Screeno — Git Check & Push Script (PowerShell)
# Run from screeno/ root: .\push.ps1
# ================================================================

# Add Git to PATH if not already present
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    $gitPaths = @(
        "$env:LOCALAPPDATA\Programs\Git\bin",
        "C:\Program Files\Git\bin",
        "C:\Program Files (x86)\Git\bin"
    )
    foreach ($p in $gitPaths) {
        if (Test-Path "$p\git.exe") {
            $env:Path += ";$p"
            break
        }
    }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: git not found. Install Git for Windows." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Running pre-push checks..." -ForegroundColor Cyan
Write-Host "================================"

# ── CHECK 1: Correct folder ───────────────────────────────────────
if (-not (Test-Path "CLAUDE.md")) {
    Write-Host "ERROR: Wrong folder. Run this from the screeno/ root folder." -ForegroundColor Red
    exit 1
}
Write-Host "OK  In correct folder" -ForegroundColor Green

# ── CHECK 2: Git initialised ──────────────────────────────────────
if (-not (Test-Path ".git")) {
    Write-Host "     Git not initialised. Initialising now..." -ForegroundColor Yellow
    git init
}
Write-Host "OK  Git initialised" -ForegroundColor Green

# ── CHECK 3: .gitignore exists ────────────────────────────────────
if (-not (Test-Path ".gitignore")) {
    Write-Host "ERROR: .gitignore not found. Create it before pushing." -ForegroundColor Red
    exit 1
}
Write-Host "OK  .gitignore exists" -ForegroundColor Green

# ── CHECK 4: .gitignore blocks .env ──────────────────────────────
if (-not (Select-String -Path ".gitignore" -Pattern "\.env" -Quiet)) {
    Write-Host "ERROR: .gitignore does not block .env files. Add '.env' first." -ForegroundColor Red
    exit 1
}
Write-Host "OK  .env is blocked by .gitignore" -ForegroundColor Green

# ── CHECK 5: .gitignore blocks node_modules ───────────────────────
if (-not (Select-String -Path ".gitignore" -Pattern "node_modules" -Quiet)) {
    Write-Host "ERROR: .gitignore does not block node_modules. Add 'node_modules/' first." -ForegroundColor Red
    exit 1
}
Write-Host "OK  node_modules is blocked by .gitignore" -ForegroundColor Green

# ── CHECK 6: No .env files staged ────────────────────────────────
$stagedEnv = git ls-files --others --cached | Where-Object { $_ -match "\.env$" }
if ($stagedEnv) {
    Write-Host "ERROR: A .env file is staged. Remove it: git rm --cached .env" -ForegroundColor Red
    exit 1
}
Write-Host "OK  No .env files staged" -ForegroundColor Green

# ── CHECK 7: node_modules not staged ─────────────────────────────
$stagedModules = git ls-files --cached | Where-Object { $_ -match "node_modules" }
if ($stagedModules) {
    Write-Host "ERROR: node_modules is staged. Run: git rm -r --cached node_modules" -ForegroundColor Red
    exit 1
}
Write-Host "OK  node_modules not staged" -ForegroundColor Green

# ── CHECK 8: Key MD files present ────────────────────────────────
$requiredMd = @(
    "CLAUDE.md",
    "docs\INDEX.md",
    "docs\PRD.md",
    "docs\database-schema.md",
    "docs\folder-structure.md",
    "docs\tech-stack.md",
    "docs\rules.md",
    "frontend\CLAUDE.md",
    "backend\CLAUDE.md"
)
$missingMd = $requiredMd | Where-Object { -not (Test-Path $_) }
if ($missingMd) {
    Write-Host "ERROR: Missing required MD files:" -ForegroundColor Red
    $missingMd | ForEach-Object { Write-Host "       $_" -ForegroundColor Red }
    exit 1
}
Write-Host "OK  All required MD files present" -ForegroundColor Green

# ── SET REMOTE ────────────────────────────────────────────────────
$remote = git remote get-url origin 2>$null
if (-not $remote) {
    Write-Host "     No remote found. Adding origin..." -ForegroundColor Yellow
    git remote add origin https://github.com/dwarkeshprakash-beep/screenoV1.git
    Write-Host "OK  Remote added" -ForegroundColor Green
} else {
    Write-Host "OK  Remote: $remote" -ForegroundColor Green
}

# ── SWITCH TO DEV BRANCH ─────────────────────────────────────────
Write-Host ""
Write-Host "     Switching to dev branch..." -ForegroundColor Yellow
$branchExists = git branch --list dev
if ($branchExists) {
    git checkout dev
} else {
    git checkout -b dev
}
Write-Host "OK  On dev branch" -ForegroundColor Green

# ── STAGE ALL FILES ───────────────────────────────────────────────
Write-Host ""
Write-Host "Files that will be committed:" -ForegroundColor Cyan
Write-Host "================================"
git add .
git status --short
Write-Host ""

# ── CHECK IF ANYTHING TO COMMIT ──────────────────────────────────
$staged = git diff --cached --name-only
if (-not $staged) {
    Write-Host "Nothing new to commit. Attempting push of existing commits..." -ForegroundColor Yellow
} else {
    # ── COMMIT MESSAGE ───────────────────────────────────────────
    $defaultMsg = "chore: sync project files $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    $msg = Read-Host "Commit message (press Enter for default: '$defaultMsg')"
    if (-not $msg) { $msg = $defaultMsg }

    Write-Host ""
    Write-Host "Committing..." -ForegroundColor Cyan
    git commit -m $msg
}

# ── PUSH ──────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git push -u origin dev

Write-Host ""
Write-Host "Done! View your repo:" -ForegroundColor Green
Write-Host "   https://github.com/dwarkeshprakash-beep/screenoV1/tree/dev"
Write-Host ""
