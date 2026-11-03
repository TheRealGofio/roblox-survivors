-- Compiled with roblox-ts v3.0.0
local TS = require(game:GetService("ReplicatedStorage"):WaitForChild("rbxts_include"):WaitForChild("RuntimeLib"))
local _services = TS.import(script, game:GetService("ReplicatedStorage"), "rbxts_include", "node_modules", "@rbxts", "services")
local Debris = _services.Debris
local Players = _services.Players
local RunService = _services.RunService
local TweenService = _services.TweenService
local UserInputService = _services.UserInputService
local Workspace = _services.Workspace
local TACTICAL_PLATFORMS = TS.import(script, game:GetService("ReplicatedStorage"), "TS", "platforms").TACTICAL_PLATFORMS
local WEAPONS = TS.import(script, game:GetService("ReplicatedStorage"), "TS", "weapons").WEAPONS
local VisualEffects = TS.import(script, script.Parent, "effects").VisualEffects
local SoundManager = TS.import(script, script.Parent, "sound").SoundManager
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
-- Estado local de pausa y partida
local isClientPaused = false
local isGameOver = false
local startTime = os.clock()
local enemiesDefeatedCount = 0
-- Estado de Buff activo por Plataformas Tácticas
local activePlatformBuff = nil
local currentBastionIndex = -1
-- Sistema de Dash Táctico (Espacio / Shift)
local DASH_COOLDOWN = 2.8
local lastDashTime = -DASH_COOLDOWN
local isDashing = false
-- 1. HUD de EXP, Nivel y Temporizador
local hudScreen = Instance.new("ScreenGui")
hudScreen.Name = "SurvivorHUD"
hudScreen.ResetOnSpawn = false
hudScreen.Parent = playerGui
-- Barra de EXP
local barBg = Instance.new("Frame")
barBg.Name = "ExpBarBackground"
barBg.Size = UDim2.new(0.55, 0, 0, 18)
barBg.Position = UDim2.new(0.225, 0, 0.02, 0)
barBg.BackgroundColor3 = Color3.new(0.1, 0.12, 0.15)
barBg.BorderSizePixel = 0
barBg.Parent = hudScreen
local uiCornerBg = Instance.new("UICorner")
uiCornerBg.CornerRadius = UDim.new(0, 6)
uiCornerBg.Parent = barBg
local barFill = Instance.new("Frame")
barFill.Name = "ExpBarFill"
barFill.Size = UDim2.new(0, 0, 1, 0)
barFill.BackgroundColor3 = Color3.new(0.2, 0.85, 0.35)
barFill.BorderSizePixel = 0
barFill.Parent = barBg
local uiCornerFill = Instance.new("UICorner")
uiCornerFill.CornerRadius = UDim.new(0, 6)
uiCornerFill.Parent = barFill
local levelText = Instance.new("TextLabel")
levelText.Name = "LevelText"
levelText.Size = UDim2.new(1, 0, 1, 0)
levelText.BackgroundTransparency = 1
levelText.Font = Enum.Font.FredokaOne
levelText.Text = "LVL 1 - EXP: 0 / 50"
levelText.TextColor3 = Color3.new(1, 1, 1)
levelText.TextSize = 13
levelText.TextStrokeTransparency = 0.5
levelText.Parent = barBg
-- Temporizador central en el HUD
local timerLabel = Instance.new("TextLabel")
timerLabel.Name = "GameTimer"
timerLabel.Size = UDim2.new(0, 120, 0, 30)
timerLabel.Position = UDim2.new(0.5, -60, 0.05, 0)
timerLabel.BackgroundTransparency = 1
timerLabel.Font = Enum.Font.FredokaOne
timerLabel.Text = "00:00"
timerLabel.TextSize = 22
timerLabel.TextColor3 = Color3.new(1, 0.9, 0.4)
timerLabel.TextStrokeTransparency = 0.2
timerLabel.Parent = hudScreen
-- Loop activo del temporizador
task.spawn(function()
	while true do
		task.wait(1.0)
		if not isGameOver and not isClientPaused then
			local elapsed = math.floor(os.clock() - startTime)
			local mins = math.floor(elapsed / 60)
			local secs = elapsed % 60
			local minStr = if mins < 10 then `0{mins}` else `{mins}`
			local secStr = if secs < 10 then `0{secs}` else `{secs}`
			timerLabel.Text = `{minStr}:{secStr}`
		end
	end
end)
-- Barra de Salud de Jefe Colosal en el HUD (Top Center, debajo del reloj)
local bossFrame = Instance.new("Frame")
bossFrame.Name = "BossHealthFrame"
bossFrame.Size = UDim2.new(0, 360, 0, 44)
bossFrame.Position = UDim2.new(0.5, -180, 0.088, 0)
bossFrame.BackgroundColor3 = Color3.new(0.08, 0.05, 0.12)
bossFrame.BackgroundTransparency = 0.2
bossFrame.BorderSizePixel = 0
bossFrame.Visible = false
bossFrame.Parent = hudScreen
local bfCorner = Instance.new("UICorner")
bfCorner.CornerRadius = UDim.new(0, 8)
bfCorner.Parent = bossFrame
local bfStroke = Instance.new("UIStroke")
bfStroke.Color = Color3.new(0.95, 0.2, 0.35)
bfStroke.Thickness = 1.5
bfStroke.Parent = bossFrame
local bossTopRow = Instance.new("Frame")
bossTopRow.Size = UDim2.new(1, -16, 0, 18)
bossTopRow.Position = UDim2.new(0, 8, 0, 4)
bossTopRow.BackgroundTransparency = 1
bossTopRow.Parent = bossFrame
local bossNameLabel = Instance.new("TextLabel")
bossNameLabel.Name = "BossName"
bossNameLabel.Size = UDim2.new(0.7, 0, 1, 0)
bossNameLabel.BackgroundTransparency = 1
bossNameLabel.Font = Enum.Font.FredokaOne
bossNameLabel.Text = "👑 COLOSO DE OBSIDIANA"
bossNameLabel.TextColor3 = Color3.new(1, 0.85, 0.4)
bossNameLabel.TextSize = 13
bossNameLabel.TextXAlignment = Enum.TextXAlignment.Left
bossNameLabel.Parent = bossTopRow
local bossHpLabel = Instance.new("TextLabel")
bossHpLabel.Name = "BossHpText"
bossHpLabel.Size = UDim2.new(0.3, 0, 1, 0)
bossHpLabel.Position = UDim2.new(0.7, 0, 0, 0)
bossHpLabel.BackgroundTransparency = 1
bossHpLabel.Font = Enum.Font.FredokaOne
bossHpLabel.Text = "100%"
bossHpLabel.TextColor3 = Color3.new(1, 0.3, 0.4)
bossHpLabel.TextSize = 12
bossHpLabel.TextXAlignment = Enum.TextXAlignment.Right
bossHpLabel.Parent = bossTopRow
local bossBarBg = Instance.new("Frame")
bossBarBg.Name = "BossBarBg"
bossBarBg.Size = UDim2.new(1, -16, 0, 12)
bossBarBg.Position = UDim2.new(0, 8, 0, 24)
bossBarBg.BackgroundColor3 = Color3.new(0.2, 0.05, 0.08)
bossBarBg.BorderSizePixel = 0
bossBarBg.Parent = bossFrame
local bbgCorner = Instance.new("UICorner")
bbgCorner.CornerRadius = UDim.new(0, 4)
bbgCorner.Parent = bossBarBg
local bossBarFill = Instance.new("Frame")
bossBarFill.Name = "BossBarFill"
bossBarFill.Size = UDim2.new(1, 0, 1, 0)
bossBarFill.BackgroundColor3 = Color3.new(0.95, 0.2, 0.3)
bossBarFill.BorderSizePixel = 0
bossBarFill.Parent = bossBarBg
local bfillCorner = Instance.new("UICorner")
bfillCorner.CornerRadius = UDim.new(0, 4)
bfillCorner.Parent = bossBarFill
local bossGradient = Instance.new("UIGradient")
bossGradient.Color = ColorSequence.new({ ColorSequenceKeypoint.new(0, Color3.new(0.75, 0.1, 0.3)), ColorSequenceKeypoint.new(0.5, Color3.new(0.95, 0.25, 0.35)), ColorSequenceKeypoint.new(1, Color3.new(1.0, 0.6, 0.3)) })
bossGradient.Parent = bossBarFill
-- Loop reactivo de actualización de la barra de salud del jefe
task.spawn(function()
	while true do
		task.wait(0.1)
		if isGameOver then
			bossFrame.Visible = false
			continue
		end
		local enemiesFolder = Workspace:FindFirstChild("Enemies")
		local activeBoss = nil
		if enemiesFolder then
			for _, enemy in enemiesFolder:GetChildren() do
				if enemy:IsA("BasePart") then
					local isBoss = enemy:GetAttribute("IsBoss") == true or enemy:GetAttribute("Behavior") == "boss"
					local _condition = (enemy:GetAttribute("HP"))
					if _condition == nil then
						_condition = 0
					end
					local hp = _condition
					if isBoss and hp > 0 then
						activeBoss = enemy
						break
					end
				end
			end
		end
		if activeBoss then
			local _condition = (activeBoss:GetAttribute("HP"))
			if _condition == nil then
				_condition = 0
			end
			local hp = math.max(0, _condition)
			local _condition_1 = (activeBoss:GetAttribute("MaxHP"))
			if _condition_1 == nil then
				_condition_1 = 100
			end
			local maxHp = math.max(1, _condition_1)
			local _condition_2 = (activeBoss:GetAttribute("EnemyName"))
			if _condition_2 == nil then
				_condition_2 = activeBoss.Name
			end
			local rawName = _condition_2
			local bossName = (string.gsub(rawName, "_%d+", ""))
			bossNameLabel.Text = `👑 {string.upper(bossName)}`
			local pct = math.clamp(hp / maxHp, 0, 1)
			bossHpLabel.Text = `{math.floor(hp)} / {maxHp} ({math.floor(pct * 100)}%)`
			TweenService:Create(bossBarFill, TweenInfo.new(0.15, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				Size = UDim2.new(pct, 0, 1, 0),
			}):Play()
			if not bossFrame.Visible then
				bossFrame.Visible = true
			end
		else
			if bossFrame.Visible then
				bossFrame.Visible = false
			end
		end
	end
end)
-- Indicador / Cooldown de Dash en HUD
local dashIndicator = Instance.new("Frame")
dashIndicator.Name = "DashIndicator"
dashIndicator.Size = UDim2.new(0, 130, 0, 24)
dashIndicator.Position = UDim2.new(0.5, -135, 0.88, 0)
dashIndicator.BackgroundColor3 = Color3.new(0.1, 0.12, 0.18)
dashIndicator.BorderSizePixel = 0
dashIndicator.Parent = hudScreen
local dashCorner = Instance.new("UICorner")
dashCorner.CornerRadius = UDim.new(0, 6)
dashCorner.Parent = dashIndicator
local dashText = Instance.new("TextLabel")
dashText.Name = "DashText"
dashText.Size = UDim2.new(1, 0, 1, 0)
dashText.BackgroundTransparency = 1
dashText.Font = Enum.Font.FredokaOne
dashText.Text = "⚡ DASH [SHIFT]"
dashText.TextColor3 = Color3.new(0.2, 0.9, 0.95)
dashText.TextSize = 13
dashText.Parent = dashIndicator
-- Indicador / Cooldown de Za Warudo en HUD
local zaWarudoIndicator = Instance.new("Frame")
zaWarudoIndicator.Name = "ZaWarudoIndicator"
zaWarudoIndicator.Size = UDim2.new(0, 130, 0, 24)
zaWarudoIndicator.Position = UDim2.new(0.5, 5, 0.88, 0)
zaWarudoIndicator.BackgroundColor3 = Color3.new(0.15, 0.1, 0.22)
zaWarudoIndicator.BorderSizePixel = 0
zaWarudoIndicator.Parent = hudScreen
local zwCorner = Instance.new("UICorner")
zwCorner.CornerRadius = UDim.new(0, 6)
zwCorner.Parent = zaWarudoIndicator
local zwText = Instance.new("TextLabel")
zwText.Name = "ZaWarudoText"
zwText.Size = UDim2.new(1, 0, 1, 0)
zwText.BackgroundTransparency = 1
zwText.Font = Enum.Font.FredokaOne
zwText.Text = "⏱️ STASIS [E]"
zwText.TextColor3 = Color3.new(0.85, 0.45, 1.0)
zwText.TextSize = 13
zwText.Parent = zaWarudoIndicator
-- Cooldown de Za Warudo (40 segundos)
local ZA_WARUDO_COOLDOWN = 40.0
local lastZaWarudoTime = -ZA_WARUDO_COOLDOWN
-- Indicador de Buff Activo en HUD
local buffBadge = Instance.new("TextLabel")
buffBadge.Name = "BuffBadge"
buffBadge.Size = UDim2.new(0, 240, 0, 26)
buffBadge.Position = UDim2.new(0.5, -120, 0.83, 0)
buffBadge.BackgroundColor3 = Color3.new(0.1, 0.12, 0.16)
buffBadge.BackgroundTransparency = 0.2
buffBadge.Font = Enum.Font.FredokaOne
buffBadge.Text = ""
buffBadge.TextColor3 = Color3.new(1, 1, 1)
buffBadge.TextSize = 13
buffBadge.Visible = false
buffBadge.Parent = hudScreen
local bbCorner = Instance.new("UICorner")
bbCorner.CornerRadius = UDim.new(0, 6)
bbCorner.Parent = buffBadge
-- Loop de chequeo de presencia en Plataformas Tácticas
task.spawn(function()
	local lastHealTick = 0
	while true do
		task.wait(0.2)
		if isGameOver or isClientPaused then
			continue
		end
		local char = player.Character
		local _result = char
		if _result ~= nil then
			_result = _result:FindFirstChild("HumanoidRootPart")
		end
		local hrp = _result
		local _hum = char
		if _hum ~= nil then
			_hum = _hum:FindFirstChildOfClass("Humanoid")
		end
		local hum = _hum
		if not hrp or not hum or hum.Health <= 0 then
			continue
		end
		local foundPlat = nil
		for _, plat in TACTICAL_PLATFORMS do
			local dist = Vector2.new(hrp.Position.X - plat.position.X, hrp.Position.Z - plat.position.Z).Magnitude
			if dist <= plat.radius then
				foundPlat = plat
				break
			end
		end
		if foundPlat then
			activePlatformBuff = foundPlat.buffType
			buffBadge.Text = `⚡ {foundPlat.buffName} ({foundPlat.buffDesc})`
			buffBadge.TextColor3 = foundPlat.color
			buffBadge.Visible = true
			-- Efecto de Curación Continua en Bastión Norte
			if foundPlat.buffType == "heal" then
				local now = os.clock()
				if now - lastHealTick >= 1.0 then
					lastHealTick = now
					hum.Health = math.min(hum.MaxHealth, hum.Health + 8)
				end
			end
		else
			activePlatformBuff = nil
			buffBadge.Visible = false
		end
	end
end)
task.spawn(function()
	while true do
		task.wait(0.1)
		local timeSinceDash = os.clock() - lastDashTime
		if timeSinceDash >= DASH_COOLDOWN then
			dashText.Text = "⚡ DASH [SHIFT]"
			dashText.TextColor3 = Color3.new(0.2, 0.9, 0.95)
		else
			local remaining = string.format("%.1f", math.max(0, DASH_COOLDOWN - timeSinceDash))
			dashText.Text = `⏳ {remaining}s`
			dashText.TextColor3 = Color3.new(0.6, 0.6, 0.65)
		end
		local timeSinceZw = os.clock() - lastZaWarudoTime
		if timeSinceZw >= ZA_WARUDO_COOLDOWN then
			zwText.Text = "⏱️ STASIS [E]"
			zwText.TextColor3 = Color3.new(0.85, 0.45, 1.0)
		else
			local remainingZw = string.format("%.1f", math.max(0, ZA_WARUDO_COOLDOWN - timeSinceZw))
			zwText.Text = `⏳ {remainingZw}s`
			zwText.TextColor3 = Color3.new(0.6, 0.6, 0.65)
		end
	end
end)
-- Filtro Violeta Cósmico en Pantalla para Za Warudo
local stasisOverlay = Instance.new("Frame")
stasisOverlay.Name = "StasisOverlay"
stasisOverlay.Size = UDim2.new(1, 0, 1, 0)
stasisOverlay.BackgroundColor3 = Color3.new(0.35, 0.05, 0.55)
stasisOverlay.BackgroundTransparency = 1
stasisOverlay.BorderSizePixel = 0
stasisOverlay.Visible = false
stasisOverlay.Parent = hudScreen
local stasisText = Instance.new("TextLabel")
stasisText.Size = UDim2.new(1, 0, 0, 80)
stasisText.Position = UDim2.new(0, 0, 0.4, 0)
stasisText.BackgroundTransparency = 1
stasisText.Font = Enum.Font.FredokaOne
stasisText.Text = "THE WORLD (ESTASIS TEMPORAL)"
stasisText.TextSize = 36
stasisText.TextColor3 = Color3.new(0.9, 0.6, 1.0)
stasisText.TextStrokeTransparency = 0
stasisText.Parent = stasisOverlay
local networkFolder
local function triggerLocalZaWarudo()
	if isClientPaused or isGameOver then
		return nil
	end
	local now = os.clock()
	if now - lastZaWarudoTime < ZA_WARUDO_COOLDOWN then
		return nil
	end
	lastZaWarudoTime = now
	local _result = networkFolder
	if _result ~= nil then
		_result = _result:FindFirstChild("ZaWarudo")
	end
	local zwEvent = _result
	if not zwEvent then
		local net = Workspace:FindFirstChild("Network")
		if net then
			zwEvent = net:FindFirstChild("ZaWarudo")
		end
	end
	local _result_1 = zwEvent
	if _result_1 ~= nil then
		_result_1:FireServer()
	end
end
-- Función de activación de Dash
local function triggerDash()
	if isClientPaused or isGameOver or isDashing then
		return nil
	end
	local now = os.clock()
	if now - lastDashTime < DASH_COOLDOWN then
		return nil
	end
	local char = player.Character
	local _result = char
	if _result ~= nil then
		_result = _result:FindFirstChild("HumanoidRootPart")
	end
	local hrp = _result
	local _hum = char
	if _hum ~= nil then
		_hum = _hum:FindFirstChildOfClass("Humanoid")
	end
	local hum = _hum
	if not hrp or not hum or hum.Health <= 0 then
		return nil
	end
	lastDashTime = now
	isDashing = true
	SoundManager.playDashSound()
	-- Determinar dirección de movimiento (o hacia adelante si está quieto)
	local moveDir = hum.MoveDirection
	if moveDir.Magnitude < 0.1 then
		moveDir = hrp.CFrame.LookVector
	end
	moveDir = Vector3.new(moveDir.X, 0, moveDir.Z).Unit
	-- Impulso físico de Dash (con i-frames)
	local dashVelocity = Instance.new("BodyVelocity")
	dashVelocity.MaxForce = Vector3.new(80000, 4000, 80000)
	dashVelocity.Velocity = moveDir * 65
	dashVelocity.Parent = hrp
	-- Efecto visual de Estela / Ghosting Neón
	for i = 0, 3 do
		task.delay(i * 0.04, function()
			if not hrp or not hrp.Parent then
				return nil
			end
			local ghost = Instance.new("Part")
			ghost.Size = hrp.Size
			ghost.CFrame = hrp.CFrame
			ghost.Color = Color3.new(0.1, 0.95, 0.9)
			ghost.Material = Enum.Material.Neon
			ghost.Transparency = 0.4
			ghost.CanCollide = false
			ghost.Anchored = true
			ghost.Parent = Workspace
			TweenService:Create(ghost, TweenInfo.new(0.25), {
				Transparency = 1,
				Size = ghost.Size * 1.2,
			}):Play()
			Debris:AddItem(ghost, 0.3)
		end)
	end
	task.delay(0.22, function()
		dashVelocity:Destroy()
		isDashing = false
	end)
end
-- Escuchar pulsación de Shift/Q para Dash y E para Za Warudo
UserInputService.InputBegan:Connect(function(input, processed)
	if processed then
		return nil
	end
	if input.KeyCode == Enum.KeyCode.LeftShift or input.KeyCode == Enum.KeyCode.Q then
		triggerDash()
	elseif input.KeyCode == Enum.KeyCode.E then
		triggerLocalZaWarudo()
	end
end)
-- 2. Obtener referencias de RemoteEvents
networkFolder = Workspace:WaitForChild("Network", 5)
local damageEvent = if networkFolder then (networkFolder:WaitForChild("DamageEnemy", 5)) else nil
local collectGemEvent = if networkFolder then (networkFolder:WaitForChild("CollectGem", 5)) else nil
local levelUpEvent = if networkFolder then (networkFolder:WaitForChild("LevelUp", 5)) else nil
local selectUpgradeEvent = if networkFolder then (networkFolder:WaitForChild("SelectUpgrade", 5)) else nil
local bossAlertEvent = if networkFolder then (networkFolder:WaitForChild("BossAlert", 5)) else nil
local debugActionEvent = if networkFolder then (networkFolder:WaitForChild("DebugAction", 5)) else nil
local restartGameEvent = if networkFolder then (networkFolder:WaitForChild("RestartGame", 5)) else nil
local zaWarudoEvent = if networkFolder then (networkFolder:WaitForChild("ZaWarudo", 5)) else nil
-- Conectar evento Za Warudo para efectos visuales y onda de choque
local connectZaWarudoListener = function(ev)
	local _result = ev
	if _result ~= nil then
		_result = _result.OnClientEvent:Connect(function(durationArg)
			local _durationArg = durationArg
			local duration = if typeof(_durationArg) == "number" then durationArg else 4.0
			-- Activar filtro violeta
			stasisOverlay.Visible = true
			stasisOverlay.BackgroundTransparency = 0.55
			SoundManager.playSound("levelUp", 1.0, 0.5)
			-- Onda expansiva holográfica desde el jugador
			local char = player.Character
			local _result_1 = char
			if _result_1 ~= nil then
				_result_1 = _result_1:FindFirstChild("HumanoidRootPart")
			end
			local hrp = _result_1
			if hrp then
				local ring = Instance.new("Part")
				ring.Shape = Enum.PartType.Cylinder
				ring.Size = Vector3.new(0.5, 4, 4)
				local _cFrame = CFrame.new(hrp.Position)
				local _arg0 = CFrame.Angles(0, 0, math.rad(90))
				ring.CFrame = _cFrame * _arg0
				ring.Color = Color3.new(0.85, 0.35, 1.0)
				ring.Material = Enum.Material.Neon
				ring.CanCollide = false
				ring.Anchored = true
				ring.Parent = Workspace
				TweenService:Create(ring, TweenInfo.new(0.6, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
					Size = Vector3.new(0.5, 80, 80),
					Transparency = 1,
				}):Play()
				Debris:AddItem(ring, 0.7)
			end
			-- Desvanecer overlay al terminar el tiempo de estasis
			task.delay(duration - 0.5, function()
				TweenService:Create(stasisOverlay, TweenInfo.new(0.5), {
					BackgroundTransparency = 1,
				}):Play()
				task.delay(0.5, function()
					stasisOverlay.Visible = false
				end)
			end)
		end)
	end
end
if zaWarudoEvent then
	connectZaWarudoListener(zaWarudoEvent)
else
	task.spawn(function()
		local net = Workspace:WaitForChild("Network", 10)
		local _result = net
		if _result ~= nil then
			_result = _result:WaitForChild("ZaWarudo", 5)
		end
		local ev = _result
		connectZaWarudoListener(ev)
	end)
end
-- Panel de Debug Plegable Organizado por Categorías (F2 o Botón)
local debugGui = Instance.new("ScreenGui")
debugGui.Name = "DebugGui"
debugGui.ResetOnSpawn = false
debugGui.Parent = playerGui
local debugToggleBtn = Instance.new("TextButton")
debugToggleBtn.Name = "DebugToggle"
debugToggleBtn.Size = UDim2.new(0, 95, 0, 30)
debugToggleBtn.Position = UDim2.new(0.98, -95, 0.02, 0)
debugToggleBtn.BackgroundColor3 = Color3.new(0.18, 0.2, 0.28)
debugToggleBtn.Font = Enum.Font.FredokaOne
debugToggleBtn.Text = "🛠️ DEBUG"
debugToggleBtn.TextColor3 = Color3.new(1, 0.85, 0.2)
debugToggleBtn.TextSize = 13
debugToggleBtn.Parent = debugGui
local dbCorner = Instance.new("UICorner")
dbCorner.CornerRadius = UDim.new(0, 6)
dbCorner.Parent = debugToggleBtn
local debugPanel = Instance.new("Frame")
debugPanel.Name = "DebugPanel"
debugPanel.Size = UDim2.new(0, 520, 0, 310)
debugPanel.Position = UDim2.new(0.98, -520, 0.065, 0)
debugPanel.BackgroundColor3 = Color3.new(0.08, 0.1, 0.14)
debugPanel.BorderSizePixel = 0
debugPanel.Visible = false
debugPanel.Parent = debugGui
local dpCorner = Instance.new("UICorner")
dpCorner.CornerRadius = UDim.new(0, 8)
dpCorner.Parent = debugPanel
local dpStroke = Instance.new("UIStroke")
dpStroke.Color = Color3.new(1, 0.85, 0.2)
dpStroke.Thickness = 1.5
dpStroke.Parent = debugPanel
local columnsContainer = Instance.new("Frame")
columnsContainer.Size = UDim2.new(1, -16, 1, -16)
columnsContainer.Position = UDim2.new(0, 8, 0, 8)
columnsContainer.BackgroundTransparency = 1
columnsContainer.Parent = if columnsContainer then debugPanel else debugPanel
local columnsLayout = Instance.new("UIListLayout")
columnsLayout.FillDirection = Enum.FillDirection.Horizontal
columnsLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
columnsLayout.Padding = UDim.new(0, 10)
columnsLayout.Parent = columnsContainer
-- 3 Categorías: Armas, Pasivas y Entorno/General
local debugCategories = { {
	title = "⚔️ ARMAS",
	headerColor = Color3.new(0.95, 0.35, 0.2),
	buttons = { {
		id = "unlock_all_weapons",
		label = "⚡ TODAS MÁX",
	}, {
		id = "give_nova",
		label = "🔥 Rayo Nova",
	}, {
		id = "give_orbits",
		label = "🪐 Órbitas Crono",
	}, {
		id = "give_plasma",
		label = "🟣 Bláster Plasma",
	}, {
		id = "give_flare",
		label = "💥 Fulgor Éter",
	}, {
		id = "give_mines",
		label = "💣 Minas Vórtice",
	} },
}, {
	title = "✨ PASIVAS & STATS",
	headerColor = Color3.new(0.2, 0.75, 0.95),
	buttons = { {
		id = "trigger_zawarudo",
		label = "⏱️ ZA WARUDO",
	}, {
		id = "instant_level_up",
		label = "⭐ Level Up (+1)",
	}, {
		id = "heal_player",
		label = "❤️ Curar al 100%",
	}, {
		id = "give_speed",
		label = "👟 +6 Velocidad",
	}, {
		id = "give_magnet",
		label = "🧲 +8 Imán EXP",
	}, {
		id = "give_area",
		label = "📏 +25% Área",
	} },
}, {
	title = "🌍 ENTORNO / SPAWNS",
	headerColor = Color3.new(0.9, 0.8, 0.2),
	buttons = { {
		id = "spawn_boss",
		label = "👑 Invocar Boss",
	}, {
		id = "spawn_chest",
		label = "📦 Spawn Cofre",
	}, {
		id = "spawn_magnet",
		label = "🧲 Spawn Imán",
	}, {
		id = "tp_bastion",
		label = "🏛️ TP Bastión",
	}, {
		id = "kill_all_enemies",
		label = "💥 Limpiar Arena",
	} },
} }
-- ▼ ReadonlyArray.forEach ▼
local _callback = function(cat)
	local col = Instance.new("Frame")
	col.Size = UDim2.new(0.31, 0, 1, 0)
	col.BackgroundColor3 = Color3.new(0.12, 0.14, 0.2)
	col.BorderSizePixel = 0
	col.Parent = columnsContainer
	local cCorner = Instance.new("UICorner")
	cCorner.CornerRadius = UDim.new(0, 6)
	cCorner.Parent = col
	local cLayout = Instance.new("UIListLayout")
	cLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
	cLayout.Padding = UDim.new(0, 4)
	cLayout.Parent = col
	local header = Instance.new("TextLabel")
	header.Size = UDim2.new(1, 0, 0, 24)
	header.BackgroundTransparency = 1
	header.Font = Enum.Font.FredokaOne
	header.Text = cat.title
	header.TextColor3 = cat.headerColor
	header.TextSize = 12
	header.Parent = col
	local _exp = cat.buttons
	-- ▼ ReadonlyArray.forEach ▼
	local _callback_1 = function(btnInfo)
		local b = Instance.new("TextButton")
		b.Size = UDim2.new(0.92, 0, 0, 30)
		b.BackgroundColor3 = Color3.new(0.18, 0.22, 0.3)
		b.Font = Enum.Font.FredokaOne
		b.Text = btnInfo.label
		b.TextColor3 = Color3.new(1, 1, 1)
		b.TextSize = 11
		b.Parent = col
		local bCorner = Instance.new("UICorner")
		bCorner.CornerRadius = UDim.new(0, 5)
		bCorner.Parent = b
		b.MouseButton1Click:Connect(function()
			if btnInfo.id == "tp_bastion" then
				-- Teletransportar al jugador rotativamente a cada una de las 3 plataformas tácticas
				local _result = player.Character
				if _result ~= nil then
					_result = _result:FindFirstChild("HumanoidRootPart")
				end
				local hrp = _result
				if hrp and #TACTICAL_PLATFORMS > 0 then
					currentBastionIndex = (currentBastionIndex + 1) % #TACTICAL_PLATFORMS
					local targetPlat = TACTICAL_PLATFORMS[currentBastionIndex + 1]
					local _position = targetPlat.position
					local _vector3 = Vector3.new(0, 3, 0)
					hrp.CFrame = CFrame.new(_position + _vector3)
				end
				return nil
			end
			if not debugActionEvent then
				local net = Workspace:FindFirstChild("Network")
				if net then
					debugActionEvent = net:FindFirstChild("DebugAction")
				end
			end
			local _result = debugActionEvent
			if _result ~= nil then
				_result:FireServer(btnInfo.id)
			end
		end)
	end
	for _k, _v in _exp do
		_callback_1(_v, _k - 1, _exp)
	end
	-- ▲ ReadonlyArray.forEach ▲
end
for _k, _v in debugCategories do
	_callback(_v, _k - 1, debugCategories)
end
-- ▲ ReadonlyArray.forEach ▲
debugToggleBtn.MouseButton1Click:Connect(function()
	debugPanel.Visible = not debugPanel.Visible
end)
-- Atajo de teclado F2 para abrir/cerrar debug
UserInputService.InputBegan:Connect(function(input, processed)
	if processed then
		return nil
	end
	if input.KeyCode == Enum.KeyCode.F2 then
		debugPanel.Visible = not debugPanel.Visible
	end
end)
-- Banner Alerta de Boss en Pantalla
local bossBanner = Instance.new("TextLabel")
bossBanner.Name = "BossBanner"
bossBanner.Size = UDim2.new(1, 0, 0, 60)
bossBanner.Position = UDim2.new(0, 0, 0.12, 0)
bossBanner.BackgroundTransparency = 1
bossBanner.Font = Enum.Font.FredokaOne
bossBanner.Text = "⚠️ ¡SEÑOR DEL VACÍO HA DESPERTADO! ⚠️"
bossBanner.TextSize = 28
bossBanner.TextColor3 = Color3.new(1.0, 0.15, 0.2)
bossBanner.TextStrokeTransparency = 0
bossBanner.Visible = false
bossBanner.Parent = hudScreen
local connectBossAlert = function(ev)
	local _result = ev
	if _result ~= nil then
		_result = _result.OnClientEvent:Connect(function(msg)
			local _msg = msg
			local text = if typeof(_msg) == "string" then msg else "¡BOSS INMINENTE!"
			bossBanner.Text = `⚠️ {text} ⚠️`
			bossBanner.Visible = true
			SoundManager.playSound("levelUp", 1.0, 0.6)
			task.delay(5, function()
				bossBanner.Visible = false
			end)
		end)
	end
end
if bossAlertEvent then
	connectBossAlert(bossAlertEvent)
else
	task.spawn(function()
		local net = Workspace:WaitForChild("Network", 10)
		local _result = net
		if _result ~= nil then
			_result = _result:WaitForChild("BossAlert", 5)
		end
		local ev = _result
		connectBossAlert(ev)
	end)
end
-- 3. UI de Game Over
local gameOverGui = Instance.new("ScreenGui")
gameOverGui.Name = "GameOverScreen"
gameOverGui.Enabled = false
gameOverGui.ResetOnSpawn = false
gameOverGui.Parent = playerGui
local goBackdrop = Instance.new("Frame")
goBackdrop.Size = UDim2.new(1, 0, 1, 0)
goBackdrop.BackgroundColor3 = Color3.new(0.05, 0.02, 0.04)
goBackdrop.BackgroundTransparency = 0.25
goBackdrop.BorderSizePixel = 0
goBackdrop.Parent = gameOverGui
local goCard = Instance.new("Frame")
goCard.Size = UDim2.new(0, 420, 0, 360)
goCard.Position = UDim2.new(0.5, -210, 0.5, -180)
goCard.BackgroundColor3 = Color3.new(0.12, 0.14, 0.2)
goCard.BorderSizePixel = 0
goCard.Parent = goBackdrop
local goCardCorner = Instance.new("UICorner")
goCardCorner.CornerRadius = UDim.new(0, 16)
goCardCorner.Parent = goCard
local goCardStroke = Instance.new("UIStroke")
goCardStroke.Thickness = 3
goCardStroke.Color = Color3.new(0.9, 0.2, 0.3)
goCardStroke.Parent = goCard
local goTitle = Instance.new("TextLabel")
goTitle.Size = UDim2.new(1, 0, 0, 50)
goTitle.Position = UDim2.new(0, 0, 0.05, 0)
goTitle.BackgroundTransparency = 1
goTitle.Font = Enum.Font.FredokaOne
goTitle.Text = "HAS CAÍDO"
goTitle.TextSize = 36
goTitle.TextColor3 = Color3.new(0.95, 0.25, 0.3)
goTitle.TextStrokeTransparency = 0
goTitle.Parent = goCard
local goStats = Instance.new("TextLabel")
goStats.Name = "StatsLabel"
goStats.Size = UDim2.new(0.9, 0, 0, 140)
goStats.Position = UDim2.new(0.05, 0, 0.25, 0)
goStats.BackgroundTransparency = 1
goStats.Font = Enum.Font.GothamMedium
goStats.Text = "Tiempo: 00:00\nNivel: 1\nEnemigos eliminados: 0"
goStats.TextSize = 16
goStats.TextColor3 = Color3.new(0.9, 0.9, 0.95)
goStats.LineHeight = 1.4
goStats.Parent = goCard
local restartBtn = Instance.new("TextButton")
restartBtn.Size = UDim2.new(0.7, 0, 0, 45)
restartBtn.Position = UDim2.new(0.15, 0, 0.78, 0)
restartBtn.BackgroundColor3 = Color3.new(0.15, 0.75, 0.45)
restartBtn.Font = Enum.Font.FredokaOne
restartBtn.Text = "REINTENTAR PARTIDA"
restartBtn.TextColor3 = Color3.new(1, 1, 1)
restartBtn.TextSize = 18
restartBtn.BorderSizePixel = 0
restartBtn.Parent = goCard
local btnCorner = Instance.new("UICorner")
btnCorner.CornerRadius = UDim.new(0, 8)
btnCorner.Parent = restartBtn
restartBtn.MouseButton1Click:Connect(function()
	-- Reaparecer al jugador con salud completa y resetear partida
	gameOverGui.Enabled = false
	isGameOver = false
	isClientPaused = false
	startTime = os.clock()
	enemiesDefeatedCount = 0
	-- Avisar al servidor para limpiar todos los enemigos, orbes hostiles y gemas
	if not restartGameEvent then
		local net = Workspace:FindFirstChild("Network")
		if net then
			restartGameEvent = net:FindFirstChild("RestartGame")
		end
	end
	local _result = restartGameEvent
	if _result ~= nil then
		_result:FireServer()
	end
end)
-- Detectar muerte del jugador para mostrar Game Over y barra de salud
local function connectDeathListener(character)
	local hum = character:WaitForChild("Humanoid", 5)
	local hrp = character:WaitForChild("HumanoidRootPart", 5)
	-- Barra de salud dinámica flotante sobre la cabeza
	if hum and hrp then
		local existingHpGui = hrp:FindFirstChild("HealthBillboard")
		if existingHpGui then
			existingHpGui:Destroy()
		end
		local hpBillboard = Instance.new("BillboardGui")
		hpBillboard.Name = "HealthBillboard"
		hpBillboard.Size = UDim2.new(0, 90, 0, 12)
		hpBillboard.StudsOffset = Vector3.new(0, 3.2, 0)
		hpBillboard.AlwaysOnTop = true
		hpBillboard.Adornee = hrp
		hpBillboard.Parent = hrp
		local bg = Instance.new("Frame")
		bg.Size = UDim2.new(1, 0, 1, 0)
		bg.BackgroundColor3 = Color3.new(0.08, 0.1, 0.12)
		bg.BorderSizePixel = 0
		bg.Parent = hpBillboard
		local bgCorner = Instance.new("UICorner")
		bgCorner.CornerRadius = UDim.new(0, 4)
		bgCorner.Parent = bg
		local fill = Instance.new("Frame")
		fill.Name = "Fill"
		fill.Size = UDim2.new(1, 0, 1, 0)
		fill.BackgroundColor3 = Color3.new(0.15, 0.85, 0.4)
		fill.BorderSizePixel = 0
		fill.Parent = bg
		local fillCorner = Instance.new("UICorner")
		fillCorner.CornerRadius = UDim.new(0, 4)
		fillCorner.Parent = fill
		local updateHp = function()
			local ratio = math.clamp(hum.Health / hum.MaxHealth, 0, 1)
			TweenService:Create(fill, TweenInfo.new(0.15), {
				Size = UDim2.new(ratio, 0, 1, 0),
			}):Play()
			-- Color dinámico según salud
			if ratio > 0.5 then
				fill.BackgroundColor3 = Color3.new(0.15, 0.85, 0.4)
			elseif ratio > 0.25 then
				fill.BackgroundColor3 = Color3.new(0.95, 0.7, 0.1)
			else
				fill.BackgroundColor3 = Color3.new(0.95, 0.2, 0.25)
			end
		end
		hum.HealthChanged:Connect(updateHp)
		hum:GetPropertyChangedSignal("MaxHealth"):Connect(updateHp)
		updateHp()
		hum.Died:Connect(function()
			if isGameOver then
				return nil
			end
			isGameOver = true
			local elapsed = math.floor(os.clock() - startTime)
			local mins = math.floor(elapsed / 60)
			local secs = elapsed % 60
			local minStr = if mins < 10 then `0{mins}` else `{mins}`
			local secStr = if secs < 10 then `0{secs}` else `{secs}`
			local leaderstats = player:FindFirstChild("leaderstats")
			local _result = leaderstats
			if _result ~= nil then
				_result = _result:FindFirstChild("Level")
			end
			local _result_1 = _result
			if _result_1 ~= nil then
				_result_1 = _result_1.Value
			end
			local _condition = _result_1
			if _condition == nil then
				_condition = 1
			end
			local currentLvl = _condition
			goStats.Text = `⏱️ Tiempo Sobrevivido: {minStr}:{secStr}\n⭐ Nivel Alcanzado: {currentLvl}\n💀 Bajas Confirmadas: {enemiesDefeatedCount}`
			gameOverGui.Enabled = true
		end)
	end
end
if player.Character then
	connectDeathListener(player.Character)
end
player.CharacterAdded:Connect(connectDeathListener)
-- 4. UI del Menú de Level Up (3 Cartas)
local levelUpGui = Instance.new("ScreenGui")
levelUpGui.Name = "LevelUpScreen"
levelUpGui.Enabled = false
levelUpGui.ResetOnSpawn = false
levelUpGui.Parent = playerGui
local savedWalkSpeed
levelUpGui:GetPropertyChangedSignal("Enabled"):Connect(function()
	if not levelUpGui.Enabled then
		isClientPaused = false
		local _hum = player.Character
		if _hum ~= nil then
			_hum = _hum:FindFirstChildOfClass("Humanoid")
		end
		local hum = _hum
		if hum and hum.WalkSpeed == 0 then
			hum.WalkSpeed = if savedWalkSpeed > 0 then savedWalkSpeed else 16
		end
	end
end)
local modalBackdrop = Instance.new("Frame")
modalBackdrop.Size = UDim2.new(1, 0, 1, 0)
modalBackdrop.BackgroundColor3 = Color3.new(0, 0, 0)
modalBackdrop.BackgroundTransparency = 0.45
modalBackdrop.BorderSizePixel = 0
modalBackdrop.Parent = levelUpGui
local titleHeader = Instance.new("TextLabel")
titleHeader.Size = UDim2.new(1, 0, 0, 50)
titleHeader.Position = UDim2.new(0, 0, 0.15, 0)
titleHeader.BackgroundTransparency = 1
titleHeader.Font = Enum.Font.FredokaOne
titleHeader.Text = "¡SUBIDA DE NIVEL!"
titleHeader.TextSize = 34
titleHeader.TextColor3 = Color3.new(1, 0.85, 0.2)
titleHeader.TextStrokeTransparency = 0
titleHeader.Parent = modalBackdrop
local cardsContainer = Instance.new("Frame")
cardsContainer.Size = UDim2.new(0.85, 0, 0, 240)
cardsContainer.Position = UDim2.new(0.075, 0, 0.32, 0)
cardsContainer.BackgroundTransparency = 1
cardsContainer.Parent = modalBackdrop
local uiLayout = Instance.new("UIListLayout")
uiLayout.FillDirection = Enum.FillDirection.Horizontal
uiLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
uiLayout.VerticalAlignment = Enum.VerticalAlignment.Center
uiLayout.Padding = UDim.new(0, 25)
uiLayout.Parent = cardsContainer
savedWalkSpeed = 16
local function showLevelUpModal()
	if isGameOver then
		return nil
	end
	isClientPaused = true
	levelUpGui.Enabled = true
	local _hum = player.Character
	if _hum ~= nil then
		_hum = _hum:FindFirstChildOfClass("Humanoid")
	end
	local hum = _hum
	if hum then
		savedWalkSpeed = if hum.WalkSpeed > 0 then hum.WalkSpeed else savedWalkSpeed
		hum.WalkSpeed = 0
	end
	for _, child in cardsContainer:GetChildren() do
		if child:IsA("GuiButton") then
			child:Destroy()
		end
	end
	local inventory = player:FindFirstChild("Inventory")
	local _result = inventory
	if _result ~= nil then
		_result = _result:FindFirstChild("void_boomerang")
	end
	local _result_1 = _result
	if _result_1 ~= nil then
		_result_1 = _result_1.Value
	end
	local _condition = _result_1
	if _condition == nil then
		_condition = 1
	end
	local boomerangLvl = _condition
	local _result_2 = inventory
	if _result_2 ~= nil then
		_result_2 = _result_2:FindFirstChild("plasma_blaster")
	end
	local _result_3 = _result_2
	if _result_3 ~= nil then
		_result_3 = _result_3.Value
	end
	local _condition_1 = _result_3
	if _condition_1 == nil then
		_condition_1 = 0
	end
	local plasmaLvl = _condition_1
	local _result_4 = inventory
	if _result_4 ~= nil then
		_result_4 = _result_4:FindFirstChild("chrono_orbits")
	end
	local _result_5 = _result_4
	if _result_5 ~= nil then
		_result_5 = _result_5.Value
	end
	local _condition_2 = _result_5
	if _condition_2 == nil then
		_condition_2 = 0
	end
	local orbitsLvl = _condition_2
	local _result_6 = inventory
	if _result_6 ~= nil then
		_result_6 = _result_6:FindFirstChild("nova_beam")
	end
	local _result_7 = _result_6
	if _result_7 ~= nil then
		_result_7 = _result_7.Value
	end
	local _condition_3 = _result_7
	if _condition_3 == nil then
		_condition_3 = 0
	end
	local novaLvl = _condition_3
	local _result_8 = inventory
	if _result_8 ~= nil then
		_result_8 = _result_8:FindFirstChild("aether_flare")
	end
	local _result_9 = _result_8
	if _result_9 ~= nil then
		_result_9 = _result_9.Value
	end
	local _condition_4 = _result_9
	if _condition_4 == nil then
		_condition_4 = 0
	end
	local flareLvl = _condition_4
	local _result_10 = inventory
	if _result_10 ~= nil then
		_result_10 = _result_10:FindFirstChild("vortex_mine")
	end
	local _result_11 = _result_10
	if _result_11 ~= nil then
		_result_11 = _result_11.Value
	end
	local _condition_5 = _result_11
	if _condition_5 == nil then
		_condition_5 = 0
	end
	local mineLvl = _condition_5
	-- Opciones disponibles para elegir
	local allOptions = { {
		id = "void_boomerang",
		title = "Búmeran del Vacío",
		tag = if boomerangLvl < 3 then `Nivel {boomerangLvl + 1}` else "Nivel MÁX",
		desc = if boomerangLvl == 1 then "+50% daño y mayor velocidad" else "Dispara 2 búmeranes con -20% cooldown",
		color = Color3.new(0.08, 0.45, 0.4),
		available = boomerangLvl < 3,
	}, {
		id = "plasma_blaster",
		title = if plasmaLvl == 0 then "Nueva: Bláster" else "Bláster de Plasma",
		tag = if plasmaLvl == 0 then "DESBLOQUEAR" else `Nivel {plasmaLvl + 1}`,
		desc = if plasmaLvl == 0 then "Ráfagas teledirigidas de alta cadencia" else "Dispara 2 esferas de plasma a la vez",
		color = Color3.new(0.45, 0.15, 0.5),
		available = plasmaLvl < 2,
	}, {
		id = "chrono_orbits",
		title = if orbitsLvl == 0 then "Nueva: Órbitas Crono" else "Órbitas Crono",
		tag = if orbitsLvl == 0 then "DESBLOQUEAR" else `Nivel {orbitsLvl + 1}`,
		desc = if orbitsLvl == 0 then "Orbes cinéticos que te orbitan triturando la horda" else "+1 orbe orbital y mayor velocidad de giro",
		color = Color3.new(0.85, 0.65, 0.1),
		available = orbitsLvl < 3,
	}, {
		id = "nova_beam",
		title = if novaLvl == 0 then "Nueva: Rayo Nova" else "Rayo Nova",
		tag = if novaLvl == 0 then "DESBLOQUEAR" else `Nivel {novaLvl + 1}`,
		desc = if novaLvl == 0 then "Haz láser de alta energía que calcina columnas de enemigos" else "+60% de anchura, alcance y daño brutal",
		color = Color3.new(0.95, 0.35, 0.1),
		available = novaLvl < 3,
	}, {
		id = "aether_flare",
		title = if flareLvl == 0 then "Nueva: Fulgor Éter" else "Fulgor de Éter",
		tag = if flareLvl == 0 then "DESBLOQUEAR" else `Nivel {flareLvl + 1}`,
		desc = if flareLvl == 0 then "Onda de choque radial de fuego solar que arrasa hordas" else "+55% daño, mayor alcance y menor recarga",
		color = Color3.new(0.95, 0.60, 0.12),
		available = flareLvl < 3,
	}, {
		id = "vortex_mine",
		title = if mineLvl == 0 then "Nueva: Minas Vórtice" else "Minas de Vórtice",
		tag = if mineLvl == 0 then "DESBLOQUEAR" else `Nivel {mineLvl + 1}`,
		desc = if mineLvl == 0 then "Despliega minas gravitatorias de implosión devastadora" else "+1 mina simultánea y radio expansivo aumentado",
		color = Color3.new(0.65, 0.25, 0.95),
		available = mineLvl < 3,
	}, {
		id = "speed_boost",
		title = "Propulsores de Pies",
		tag = "PASIVA",
		desc = "+18% velocidad de movimiento permanente",
		color = Color3.new(0.15, 0.35, 0.55),
		available = true,
	}, {
		id = "magnet_range",
		title = "Imán Gravitatorio",
		tag = "PASIVA",
		desc = "+8 studs de alcance de atracción de gemas EXP",
		color = Color3.new(0.2, 0.65, 0.95),
		available = true,
	}, {
		id = "area_size",
		title = "Expansión Cósmica",
		tag = "PASIVA",
		desc = "+25% al área y alcance de todas tus armas",
		color = Color3.new(0.9, 0.3, 0.7),
		available = true,
	}, {
		id = "max_hp",
		title = "Blindaje Reforzado",
		tag = "PASIVA",
		desc = "+25 HP máxima y curación instantánea",
		color = Color3.new(0.2, 0.7, 0.35),
		available = true,
	} }
	-- Filtrar y barajar aleatoriamente para ofrecer 3 opciones variadas cada subida de nivel
	-- ▼ ReadonlyArray.filter ▼
	local _newValue = {}
	local _callback_1 = function(opt)
		return opt.available
	end
	local _length = 0
	for _k, _v in allOptions do
		if _callback_1(_v, _k - 1, allOptions) == true then
			_length += 1
			_newValue[_length] = _v
		end
	end
	-- ▲ ReadonlyArray.filter ▲
	local filtered = _newValue
	for i = #filtered - 1, 1, -1 do
		local j = math.floor(math.random() * (i + 1))
		local temp = filtered[i + 1]
		filtered[i + 1] = filtered[j + 1]
		filtered[j + 1] = temp
	end
	local options = {}
	do
		local i = 0
		local _shouldIncrement = false
		while true do
			if _shouldIncrement then
				i += 1
			else
				_shouldIncrement = true
			end
			if not (i < math.min(3, #filtered)) then
				break
			end
			local _arg0 = filtered[i + 1]
			table.insert(options, _arg0)
		end
	end
	for _, opt in options do
		local card = Instance.new("TextButton")
		card.Size = UDim2.new(0, 210, 0, 230)
		card.BackgroundColor3 = opt.color
		card.BorderSizePixel = 0
		card.Text = ""
		card.AutoButtonColor = true
		card.Parent = cardsContainer
		local corner = Instance.new("UICorner")
		corner.CornerRadius = UDim.new(0, 12)
		corner.Parent = card
		local stroke = Instance.new("UIStroke")
		stroke.Thickness = 2.5
		stroke.Color = Color3.new(1, 1, 1)
		stroke.Transparency = 0.3
		stroke.Parent = card
		local cardTitle = Instance.new("TextLabel")
		cardTitle.Size = UDim2.new(1, -20, 0, 36)
		cardTitle.Position = UDim2.new(0, 10, 0, 14)
		cardTitle.BackgroundTransparency = 1
		cardTitle.Font = Enum.Font.FredokaOne
		cardTitle.Text = opt.title
		cardTitle.TextSize = 18
		cardTitle.TextColor3 = Color3.new(1, 1, 1)
		cardTitle.TextWrapped = true
		cardTitle.Parent = card
		local tagLabel = Instance.new("TextLabel")
		tagLabel.Size = UDim2.new(1, -20, 0, 22)
		tagLabel.Position = UDim2.new(0, 10, 0, 52)
		tagLabel.BackgroundTransparency = 1
		tagLabel.Font = Enum.Font.FredokaOne
		tagLabel.Text = opt.tag
		tagLabel.TextSize = 14
		tagLabel.TextColor3 = Color3.new(1, 0.85, 0.2)
		tagLabel.Parent = card
		local cardDesc = Instance.new("TextLabel")
		cardDesc.Size = UDim2.new(1, -24, 0, 90)
		cardDesc.Position = UDim2.new(0, 12, 0, 85)
		cardDesc.BackgroundTransparency = 1
		cardDesc.Font = Enum.Font.GothamMedium
		cardDesc.Text = opt.desc
		cardDesc.TextSize = 13
		cardDesc.TextColor3 = Color3.new(0.9, 0.9, 0.9)
		cardDesc.TextWrapped = true
		cardDesc.Parent = card
		local selectBtn = Instance.new("TextLabel")
		selectBtn.Size = UDim2.new(0.8, 0, 0, 32)
		selectBtn.Position = UDim2.new(0.1, 0, 0.8, 0)
		selectBtn.BackgroundColor3 = Color3.new(1, 1, 1)
		selectBtn.Font = Enum.Font.FredokaOne
		selectBtn.Text = "ELEGIR"
		selectBtn.TextColor3 = Color3.new(0.1, 0.1, 0.1)
		selectBtn.TextSize = 14
		selectBtn.Parent = card
		local sCorner = Instance.new("UICorner")
		sCorner.CornerRadius = UDim.new(0, 6)
		sCorner.Parent = selectBtn
		card.MouseButton1Click:Connect(function()
			if not selectUpgradeEvent then
				local net = Workspace:FindFirstChild("Network")
				if net then
					selectUpgradeEvent = net:FindFirstChild("SelectUpgrade")
				end
			end
			local _result_12 = selectUpgradeEvent
			if _result_12 ~= nil then
				_result_12:FireServer(opt.id)
			end
			levelUpGui.Enabled = false
			isClientPaused = false
			local _currentHum = player.Character
			if _currentHum ~= nil then
				_currentHum = _currentHum:FindFirstChildOfClass("Humanoid")
			end
			local currentHum = _currentHum
			if currentHum then
				local extraSpeed = if opt.id == "speed_boost" then 3 else 0
				currentHum.WalkSpeed = savedWalkSpeed + extraSpeed
			end
		end)
	end
end
-- 5. Conectar recepción de Level Up
if levelUpEvent then
	levelUpEvent.OnClientEvent:Connect(function()
		SoundManager.playLevelUpSound()
		showLevelUpModal()
	end)
else
	task.spawn(function()
		local net = Workspace:WaitForChild("Network", 10)
		local _result = net
		if _result ~= nil then
			_result = _result:WaitForChild("LevelUp", 5)
		end
		local ev = _result
		local _result_1 = ev
		if _result_1 ~= nil then
			_result_1 = _result_1.OnClientEvent:Connect(function()
				SoundManager.playLevelUpSound()
				showLevelUpModal()
			end)
		end
	end)
end
-- 6. Actualizar barra de EXP en el cliente
task.spawn(function()
	local leaderstats = player:WaitForChild("leaderstats", 10)
	if leaderstats then
		local expVal = leaderstats:WaitForChild("EXP", 5)
		local lvlVal = leaderstats:WaitForChild("Level", 5)
		local updateUi = function()
			local currentLvl = if lvlVal then lvlVal.Value else 1
			local currentExp = if expVal then expVal.Value else 0
			local maxExp = currentLvl * 50
			local ratio = math.clamp(currentExp / maxExp, 0, 1)
			TweenService:Create(barFill, TweenInfo.new(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				Size = UDim2.new(ratio, 0, 1, 0),
			}):Play()
			levelText.Text = `LVL {currentLvl} - EXP: {math.floor(currentExp)} / {maxExp}`
		end
		local _result = expVal
		if _result ~= nil then
			_result = _result.Changed:Connect(updateUi)
		end
		local _result_1 = lvlVal
		if _result_1 ~= nil then
			_result_1 = _result_1.Changed:Connect(updateUi)
		end
		updateUi()
	end
end)
-- 6.5 Gestor de Efectos Visuales y Muerte de Enemigos en el Cliente (Placeholders fluidos a 60 FPS)
local function setupEnemyVisuals(enemy)
	if not enemy:IsA("BasePart") then
		return nil
	end
	local _value = enemy:GetAttribute("VisualSetupDone")
	if _value ~= 0 and _value == _value and _value ~= "" and _value then
		return nil
	end
	enemy:SetAttribute("VisualSetupDone", true)
	local isDead = false
	local animTrack = nil
	-- Iniciar animación R6 fluida en el cliente para modelos animados (TDS Zombie)
	task.spawn(function()
		local visualModel = enemy:WaitForChild("VisualModel", 2)
		if not visualModel or isDead then
			return nil
		end
		local animCtrl = visualModel:FindFirstChildOfClass("AnimationController")
		local _animator = animCtrl
		if _animator ~= nil then
			_animator = _animator:FindFirstChildOfClass("Animator")
		end
		local animator = _animator
		local _result = visualModel:FindFirstChild("Animations")
		if _result ~= nil then
			_result = _result:FindFirstChild("Walk")
		end
		local walkAnim = _result
		if animator and walkAnim then
			animTrack = animator:LoadAnimation(walkAnim)
			animTrack.Priority = Enum.AnimationPriority.Movement
			animTrack.Looped = true
			animTrack:Play()
			local _condition = (enemy:GetAttribute("Speed"))
			if _condition == nil then
				_condition = 8.5
			end
			local speed = _condition
			animTrack:AdjustSpeed(speed / 8.5)
		end
	end)
	local onDeath = function()
		if isDead then
			return nil
		end
		isDead = true
		if animTrack then
			animTrack:Stop(0.1)
		end
		local visualModel = enemy:FindFirstChild("VisualModel")
		if visualModel then
			-- Detener animaciones activas en modelos animados
			local animCtrl = visualModel:FindFirstChildOfClass("AnimationController")
			local _animator = animCtrl
			if _animator ~= nil then
				_animator = _animator:FindFirstChildOfClass("Animator")
			end
			local animator = _animator
			if animator then
				for _, t in animator:GetPlayingAnimationTracks() do
					t:Stop(0.1)
				end
			end
			-- Quitar highlight de hit flash si estuviera activo
			local hl = visualModel:FindFirstChild("HitFlashHighlight")
			if hl then
				hl:Destroy()
			end
			-- Efecto de desintegración y hundimiento suave estilo arcade
			local startCf = visualModel:GetPivot()
			local _vector3 = Vector3.new(0, 2.0, 0)
			local targetCf = startCf - _vector3
			local duration = 0.35
			local startTime = os.clock()
			local meshParts = {}
			for _, d in visualModel:GetDescendants() do
				if d:IsA("BasePart") then
					table.insert(meshParts, d)
				end
			end
			local conn
			conn = RunService.RenderStepped:Connect(function()
				local elapsed = os.clock() - startTime
				local progress = math.clamp(elapsed / duration, 0, 1)
				visualModel:PivotTo(startCf:Lerp(targetCf, progress))
				-- Reducción suave de escala y desvanecimiento
				local scaleFactor = math.max(0.05, 1 - progress)
				pcall(function()
					return visualModel:ScaleTo(scaleFactor)
				end)
				for _, p in meshParts do
					p.Transparency = progress
				end
				if progress >= 1 then
					conn:Disconnect()
					visualModel:Destroy()
				end
			end)
		end
	end
	local hpConn = enemy:GetAttributeChangedSignal("HP"):Connect(function()
		local _condition = (enemy:GetAttribute("HP"))
		if _condition == nil then
			_condition = 0
		end
		local hp = _condition
		if hp <= 0 then
			onDeath()
		end
	end)
	local deadConn = enemy:GetAttributeChangedSignal("IsDead"):Connect(function()
		if enemy:GetAttribute("IsDead") == true then
			onDeath()
		end
	end)
	enemy.Destroying:Connect(function()
		isDead = true
		hpConn:Disconnect()
		deadConn:Disconnect()
	end)
end
task.spawn(function()
	local enemiesFolder = Workspace:WaitForChild("Enemies", 10)
	if enemiesFolder then
		local _exp = enemiesFolder:GetChildren()
		for _k, _v in _exp do
			setupEnemyVisuals(_v, _k - 1, _exp)
		end
		enemiesFolder.ChildAdded:Connect(setupEnemyVisuals)
	end
end)
-- 7. Armas: Búmeran del Vacío
local fireBoomerang
task.spawn(function()
	while true do
		if isClientPaused or isGameOver then
			task.wait(0.2)
			continue
		end
		local inventory = player:FindFirstChild("Inventory")
		local _result = inventory
		if _result ~= nil then
			_result = _result:FindFirstChild("void_boomerang")
		end
		local _result_1 = _result
		if _result_1 ~= nil then
			_result_1 = _result_1.Value
		end
		local _condition = _result_1
		if _condition == nil then
			_condition = 1
		end
		local boomerangLvl = _condition
		local boomerangDef = WEAPONS.void_boomerang.levels[math.min(boomerangLvl, #WEAPONS.void_boomerang.levels)]
		local cdMultiplier = if activePlatformBuff == "cooldown" then 0.6 else 1.0
		task.wait(boomerangDef.cooldown * cdMultiplier)
		if isClientPaused or isGameOver then
			continue
		end
		local character = player.Character
		local _result_2 = character
		if _result_2 ~= nil then
			_result_2 = _result_2:FindFirstChild("HumanoidRootPart")
		end
		local rootPart = _result_2
		if not rootPart then
			continue
		end
		local enemiesFolder = Workspace:FindFirstChild("Enemies")
		if not enemiesFolder then
			continue
		end
		local nearestDist = 9999
		local targetPos = nil
		for _, enemy in enemiesFolder:GetChildren() do
			local _condition_1 = enemy:IsA("BasePart")
			if _condition_1 then
				local _condition_2 = enemy:GetAttribute("HP")
				if _condition_2 == nil then
					_condition_2 = 0
				end
				_condition_1 = _condition_2 > 0
			end
			if _condition_1 then
				local _position = rootPart.Position
				local _position_1 = enemy.Position
				local dist = (_position - _position_1).Magnitude
				if dist < nearestDist and dist <= boomerangDef.range then
					nearestDist = dist
					targetPos = enemy.Position
				end
			end
		end
		if targetPos then
			local dmgMultiplier = if activePlatformBuff == "damage" then 1.5 else 1.0
			local finalDamage = math.floor(boomerangDef.damage * dmgMultiplier)
			local count = boomerangDef.projectiles
			do
				local i = 0
				local _shouldIncrement = false
				while true do
					if _shouldIncrement then
						i += 1
					else
						_shouldIncrement = true
					end
					if not (i < count) then
						break
					end
					local angleOffset = if count > 1 then (if i == 0 then -0.2 else 0.2) else 0
					fireBoomerang(rootPart.Position, targetPos, finalDamage, boomerangDef.speed, angleOffset)
				end
			end
		end
	end
end)
function fireBoomerang(startPos, targetPos, damage, speed, angleOffset)
	if angleOffset == nil then
		angleOffset = 0
	end
	local blade = Instance.new("Part")
	blade.Name = "VoidBoomerang"
	blade.Size = Vector3.new(3.2, 0.4, 3.2)
	blade.Color = Color3.new(0.1, 0.9, 0.8)
	blade.Material = Enum.Material.Neon
	blade.CanCollide = false
	blade.Anchored = true
	local _startPos = startPos
	local _vector3 = Vector3.new(0, 1.5, 0)
	blade.CFrame = CFrame.new(_startPos + _vector3)
	blade.Parent = Workspace
	local _targetPos = targetPos
	local _startPos_1 = startPos
	local dir = (_targetPos - _startPos_1).Unit
	if angleOffset ~= 0 then
		dir = Vector3.new(dir.X * math.cos(angleOffset) - dir.Z * math.sin(angleOffset), dir.Y, dir.X * math.sin(angleOffset) + dir.Z * math.cos(angleOffset))
	end
	local maxTravel = 35
	local traveled = 0
	local returning = false
	local hitCooldowns = {}
	local connection
	connection = RunService.Heartbeat:Connect(function(dt)
		if isClientPaused or isGameOver then
			return nil
		end
		local _orientation = blade.Orientation
		local _vector3_1 = Vector3.new(0, 1600 * dt, 0)
		blade.Orientation = _orientation + _vector3_1
		local _result = player.Character
		if _result ~= nil then
			_result = _result:FindFirstChild("HumanoidRootPart")
		end
		local rootPart = _result
		if not returning then
			local _position = blade.Position
			local _dir = dir
			local _arg0 = speed * dt
			blade.Position = _position + (_dir * _arg0)
			traveled += speed * dt
			if traveled >= maxTravel then
				returning = true
			end
		else
			if rootPart then
				local _position = rootPart.Position
				local _position_1 = blade.Position
				local returnDir = (_position - _position_1).Unit
				local _position_2 = blade.Position
				local _arg0 = speed * 1.25 * dt
				local _arg0_1 = returnDir * _arg0
				blade.Position = _position_2 + _arg0_1
				local _position_3 = rootPart.Position
				local _position_4 = blade.Position
				if (_position_3 - _position_4).Magnitude < 3 then
					connection:Disconnect()
					blade:Destroy()
					return nil
				end
			else
				connection:Disconnect()
				blade:Destroy()
				return nil
			end
		end
		-- Detección de colisiones
		local enemiesFolder = Workspace:FindFirstChild("Enemies")
		if enemiesFolder then
			local currentTime = os.clock()
			for _, enemy in enemiesFolder:GetChildren() do
				local _condition = enemy:IsA("BasePart")
				if _condition then
					local _condition_1 = enemy:GetAttribute("HP")
					if _condition_1 == nil then
						_condition_1 = 0
					end
					_condition = _condition_1 > 0
				end
				if _condition then
					local _position = blade.Position
					local _position_1 = enemy.Position
					local dist = (_position - _position_1).Magnitude
					if dist <= 4.0 then
						local _condition_1 = hitCooldowns[enemy]
						if _condition_1 == nil then
							_condition_1 = 0
						end
						local lastHit = _condition_1
						if currentTime - lastHit >= 0.35 then
							hitCooldowns[enemy] = currentTime
							if not damageEvent then
								local net = Workspace:FindFirstChild("Network")
								if net then
									damageEvent = net:FindFirstChild("DamageEnemy")
								end
							end
							local _position_2 = enemy.Position
							local _position_3 = blade.Position
							local knockbackDir = (_position_2 - _position_3).Unit
							local _result_1 = damageEvent
							if _result_1 ~= nil then
								_result_1:FireServer(enemy, damage, knockbackDir)
							end
							VisualEffects.showDamagePopup(enemy.Position, damage)
							VisualEffects.flashEnemy(enemy)
							-- Contabilizar bajas si el daño remata al enemigo
							local _condition_2 = (enemy:GetAttribute("HP"))
							if _condition_2 == nil then
								_condition_2 = 0
							end
							local enemyHp = _condition_2
							if enemyHp - damage <= 0 then
								enemiesDefeatedCount += 1
							end
						end
					end
				end
			end
		end
	end)
	Debris:AddItem(blade, 4)
end
-- 8. Armas: Bláster de Plasma
local firePlasmaOrb
task.spawn(function()
	while true do
		if isClientPaused or isGameOver then
			task.wait(0.2)
			continue
		end
		local inventory = player:FindFirstChild("Inventory")
		local _result = inventory
		if _result ~= nil then
			_result = _result:FindFirstChild("plasma_blaster")
		end
		local _result_1 = _result
		if _result_1 ~= nil then
			_result_1 = _result_1.Value
		end
		local _condition = _result_1
		if _condition == nil then
			_condition = 0
		end
		local plasmaLvl = _condition
		if plasmaLvl <= 0 then
			task.wait(1.0)
			continue
		end
		local plasmaDef = WEAPONS.plasma_blaster.levels[math.min(plasmaLvl, #WEAPONS.plasma_blaster.levels)]
		local cdMultiplier = if activePlatformBuff == "cooldown" then 0.6 else 1.0
		task.wait(plasmaDef.cooldown * cdMultiplier)
		if isClientPaused or isGameOver then
			continue
		end
		local character = player.Character
		local _result_2 = character
		if _result_2 ~= nil then
			_result_2 = _result_2:FindFirstChild("HumanoidRootPart")
		end
		local rootPart = _result_2
		if not rootPart then
			continue
		end
		local enemiesFolder = Workspace:FindFirstChild("Enemies")
		if not enemiesFolder then
			continue
		end
		local nearestDist = 9999
		local targetEnemy = nil
		for _, enemy in enemiesFolder:GetChildren() do
			local _condition_1 = enemy:IsA("BasePart")
			if _condition_1 then
				local _condition_2 = enemy:GetAttribute("HP")
				if _condition_2 == nil then
					_condition_2 = 0
				end
				_condition_1 = _condition_2 > 0
			end
			if _condition_1 then
				local _position = rootPart.Position
				local _position_1 = enemy.Position
				local dist = (_position - _position_1).Magnitude
				if dist < nearestDist and dist <= plasmaDef.range then
					nearestDist = dist
					targetEnemy = enemy
				end
			end
		end
		if targetEnemy then
			local dmgMultiplier = if activePlatformBuff == "damage" then 1.5 else 1.0
			local finalDamage = math.floor(plasmaDef.damage * dmgMultiplier)
			firePlasmaOrb(rootPart.Position, targetEnemy, finalDamage, plasmaDef.speed)
		end
	end
end)
function firePlasmaOrb(startPos, targetEnemy, damage, speed)
	local orb = Instance.new("Part")
	orb.Name = "PlasmaOrb"
	orb.Shape = Enum.PartType.Ball
	orb.Size = Vector3.new(1.4, 1.4, 1.4)
	orb.Color = Color3.new(0.85, 0.2, 0.95)
	orb.Material = Enum.Material.Neon
	orb.CanCollide = false
	orb.Anchored = true
	local _startPos = startPos
	local _vector3 = Vector3.new(0, 1.5, 0)
	orb.Position = _startPos + _vector3
	orb.Parent = Workspace
	local light = Instance.new("PointLight")
	light.Color = orb.Color
	light.Range = 8
	light.Brightness = 2
	light.Parent = orb
	local alive = true
	local conn
	conn = RunService.Heartbeat:Connect(function(dt)
		if isClientPaused or isGameOver then
			return nil
		end
		if not alive or not targetEnemy or not targetEnemy.Parent then
			conn:Disconnect()
			orb:Destroy()
			return nil
		end
		local _position = targetEnemy.Position
		local _position_1 = orb.Position
		local dir = (_position - _position_1).Unit
		local _position_2 = orb.Position
		local _arg0 = speed * dt
		local _arg0_1 = dir * _arg0
		orb.Position = _position_2 + _arg0_1
		local _position_3 = orb.Position
		local _position_4 = targetEnemy.Position
		local dist = (_position_3 - _position_4).Magnitude
		if dist <= 2.2 then
			alive = false
			conn:Disconnect()
			if not damageEvent then
				local net = Workspace:FindFirstChild("Network")
				if net then
					damageEvent = net:FindFirstChild("DamageEnemy")
				end
			end
			local _result = damageEvent
			if _result ~= nil then
				_result:FireServer(targetEnemy, damage, dir)
			end
			VisualEffects.showDamagePopup(targetEnemy.Position, damage, true)
			VisualEffects.flashEnemy(targetEnemy)
			local _condition = (targetEnemy:GetAttribute("HP"))
			if _condition == nil then
				_condition = 0
			end
			local enemyHp = _condition
			if enemyHp - damage <= 0 then
				enemiesDefeatedCount += 1
			end
			orb:Destroy()
		end
	end)
	Debris:AddItem(orb, 2.5)
end
-- 9. Armas: Órbitas Crono (Escudo cinético rotatorio)
local currentOrbInstances = {}
local currentOrbAngle = 0
local hitOrbCooldowns = {}
RunService.Heartbeat:Connect(function(dt)
	if isClientPaused or isGameOver then
		return nil
	end
	local inventory = player:FindFirstChild("Inventory")
	local _result = inventory
	if _result ~= nil then
		_result = _result:FindFirstChild("chrono_orbits")
	end
	local _result_1 = _result
	if _result_1 ~= nil then
		_result_1 = _result_1.Value
	end
	local _condition = _result_1
	if _condition == nil then
		_condition = 0
	end
	local orbitsLvl = _condition
	if orbitsLvl <= 0 then
		if #currentOrbInstances > 0 then
			-- ▼ ReadonlyArray.forEach ▼
			local _callback_1 = function(o)
				return o:Destroy()
			end
			for _k, _v in currentOrbInstances do
				_callback_1(_v, _k - 1, currentOrbInstances)
			end
			-- ▲ ReadonlyArray.forEach ▲
			currentOrbInstances = {}
		end
		return nil
	end
	local char = player.Character
	local _result_2 = char
	if _result_2 ~= nil then
		_result_2 = _result_2:FindFirstChild("HumanoidRootPart")
	end
	local hrp = _result_2
	if not hrp then
		return nil
	end
	local orbitDef = WEAPONS.chrono_orbits.levels[math.min(orbitsLvl, #WEAPONS.chrono_orbits.levels)]
	local orbCount = orbitDef.projectiles
	local radius = orbitDef.range
	local rotateSpeed = orbitDef.speed
	-- Sincronizar número de orbes instanciados
	while #currentOrbInstances < orbCount do
		local orb = Instance.new("Part")
		orb.Name = "ChronoOrb"
		orb.Shape = Enum.PartType.Ball
		orb.Size = Vector3.new(1.6, 1.6, 1.6)
		orb.Color = Color3.new(1.0, 0.8, 0.1)
		orb.Material = Enum.Material.Neon
		orb.CanCollide = false
		orb.Anchored = true
		orb.Parent = Workspace
		local light = Instance.new("PointLight")
		light.Color = orb.Color
		light.Range = 8
		light.Brightness = 2
		light.Parent = orb
		table.insert(currentOrbInstances, orb)
	end
	currentOrbAngle += rotateSpeed * dt
	-- Actualizar posición de cada orbe y chequear colisiones
	local enemiesFolder = Workspace:FindFirstChild("Enemies")
	local now = os.clock()
	-- ▼ ReadonlyArray.forEach ▼
	local _callback_1 = function(orb, i)
		local angleOffset = (i / orbCount) * math.pi * 2
		local totalAngle = currentOrbAngle + angleOffset
		local _position = hrp.Position
		local _vector3 = Vector3.new(math.cos(totalAngle) * radius, math.sin(currentOrbAngle * 2 + i) * 0.4, math.sin(totalAngle) * radius)
		local targetOrbPos = _position + _vector3
		orb.Position = targetOrbPos
		-- Detección de colisión con enemigos
		if enemiesFolder then
			for _, enemy in enemiesFolder:GetChildren() do
				local _condition_1 = enemy:IsA("BasePart")
				if _condition_1 then
					local _condition_2 = enemy:GetAttribute("HP")
					if _condition_2 == nil then
						_condition_2 = 0
					end
					_condition_1 = _condition_2 > 0
				end
				if _condition_1 then
					local _position_1 = orb.Position
					local _position_2 = enemy.Position
					local dist = (_position_1 - _position_2).Magnitude
					if dist <= 2.8 then
						local _condition_2 = hitOrbCooldowns[enemy]
						if _condition_2 == nil then
							_condition_2 = 0
						end
						local lastHit = _condition_2
						if now - lastHit >= 0.3 then
							hitOrbCooldowns[enemy] = now
							if not damageEvent then
								local net = Workspace:FindFirstChild("Network")
								if net then
									damageEvent = net:FindFirstChild("DamageEnemy")
								end
							end
							local dmgMultiplier = if activePlatformBuff == "damage" then 1.5 else 1.0
							local finalOrbDmg = math.floor(orbitDef.damage * dmgMultiplier)
							local _position_3 = enemy.Position
							local _position_4 = hrp.Position
							local knockbackDir = (_position_3 - _position_4).Unit
							local _result_3 = damageEvent
							if _result_3 ~= nil then
								_result_3:FireServer(enemy, finalOrbDmg, knockbackDir)
							end
							VisualEffects.showDamagePopup(enemy.Position, finalOrbDmg, true)
							VisualEffects.flashEnemy(enemy)
							local _condition_3 = (enemy:GetAttribute("HP"))
							if _condition_3 == nil then
								_condition_3 = 0
							end
							local enemyHp = _condition_3
							if enemyHp - finalOrbDmg <= 0 then
								enemiesDefeatedCount += 1
							end
						end
					end
				end
			end
		end
	end
	for _k, _v in currentOrbInstances do
		_callback_1(_v, _k - 1, currentOrbInstances)
	end
	-- ▲ ReadonlyArray.forEach ▲
end)
-- 10. Armas: Rayo Nova (Haz de energía desintegrador)
local fireNovaBeam
task.spawn(function()
	while true do
		if isClientPaused or isGameOver then
			task.wait(0.2)
			continue
		end
		local inventory = player:FindFirstChild("Inventory")
		local _result = inventory
		if _result ~= nil then
			_result = _result:FindFirstChild("nova_beam")
		end
		local _result_1 = _result
		if _result_1 ~= nil then
			_result_1 = _result_1.Value
		end
		local _condition = _result_1
		if _condition == nil then
			_condition = 0
		end
		local novaLvl = _condition
		if novaLvl <= 0 then
			task.wait(1.0)
			continue
		end
		local novaDef = WEAPONS.nova_beam.levels[math.min(novaLvl, #WEAPONS.nova_beam.levels)]
		local cdMultiplier = if activePlatformBuff == "cooldown" then 0.6 else 1.0
		task.wait(novaDef.cooldown * cdMultiplier)
		if isClientPaused or isGameOver then
			continue
		end
		local char = player.Character
		local _result_2 = char
		if _result_2 ~= nil then
			_result_2 = _result_2:FindFirstChild("HumanoidRootPart")
		end
		local hrp = _result_2
		if not hrp then
			continue
		end
		local enemiesFolder = Workspace:FindFirstChild("Enemies")
		if not enemiesFolder then
			continue
		end
		-- Buscar enemigo más cercano para apuntar el haz
		local closestDist = 9999
		local targetPos = nil
		for _, enemy in enemiesFolder:GetChildren() do
			local _condition_1 = enemy:IsA("BasePart")
			if _condition_1 then
				local _condition_2 = enemy:GetAttribute("HP")
				if _condition_2 == nil then
					_condition_2 = 0
				end
				_condition_1 = _condition_2 > 0
			end
			if _condition_1 then
				local _position = hrp.Position
				local _position_1 = enemy.Position
				local dist = (_position - _position_1).Magnitude
				if dist < closestDist and dist <= novaDef.range then
					closestDist = dist
					targetPos = enemy.Position
				end
			end
		end
		if targetPos then
			local dmgMultiplier = if activePlatformBuff == "damage" then 1.5 else 1.0
			local finalDamage = math.floor(novaDef.damage * dmgMultiplier)
			local _exp = hrp.Position
			local _exp_1 = targetPos
			local _exp_2 = novaDef.range
			local _condition_1 = novaDef.duration
			if _condition_1 == nil then
				_condition_1 = 0.5
			end
			fireNovaBeam(_exp, _exp_1, finalDamage, _exp_2, _condition_1, novaDef.area)
		end
	end
end)
function fireNovaBeam(startPos, targetPos, damage, maxRange, duration, beamScale)
	local _startPos = startPos
	local _vector3 = Vector3.new(0, 1.2, 0)
	local origin = _startPos + _vector3
	local dir = (targetPos - origin).Unit
	local _maxRange = maxRange
	local _arg0 = dir * _maxRange
	local endPos = origin + _arg0
	local beamLength = maxRange
	local _arg0_1 = beamLength / 2
	local _arg0_2 = dir * _arg0_1
	local centerPos = origin + _arg0_2
	-- Cilindro de haz láser Neón
	local beamPart = Instance.new("Part")
	beamPart.Name = "NovaBeamVisual"
	beamPart.Shape = Enum.PartType.Cylinder
	beamPart.Size = Vector3.new(beamLength, 1.8 * beamScale, 1.8 * beamScale)
	local _cFrame = CFrame.new(centerPos, endPos)
	local _arg0_3 = CFrame.Angles(0, math.rad(90), 0)
	beamPart.CFrame = _cFrame * _arg0_3
	beamPart.Material = Enum.Material.Neon
	beamPart.Color = Color3.new(1.0, 0.35, 0.1)
	beamPart.CanCollide = false
	beamPart.Anchored = true
	beamPart.Parent = Workspace
	local light = Instance.new("PointLight")
	light.Color = beamPart.Color
	light.Range = 16
	light.Brightness = 3
	light.Parent = beamPart
	-- Dañar a todos los enemigos a lo largo de la línea del haz
	local enemiesFolder = Workspace:FindFirstChild("Enemies")
	if enemiesFolder then
		for _, enemy in enemiesFolder:GetChildren() do
			local _condition = enemy:IsA("BasePart")
			if _condition then
				local _condition_1 = enemy:GetAttribute("HP")
				if _condition_1 == nil then
					_condition_1 = 0
				end
				_condition = _condition_1 > 0
			end
			if _condition then
				-- Distancia punto a recta del láser
				local v = enemy.Position - origin
				local projLength = v:Dot(dir)
				if projLength >= 0 and projLength <= maxRange then
					local _arg0_4 = dir * projLength
					local closestPointOnLine = origin + _arg0_4
					local perpDist = (enemy.Position - closestPointOnLine).Magnitude
					if perpDist <= 3.5 * beamScale then
						if not damageEvent then
							local net = Workspace:FindFirstChild("Network")
							if net then
								damageEvent = net:FindFirstChild("DamageEnemy")
							end
						end
						local _result = damageEvent
						if _result ~= nil then
							_result:FireServer(enemy, damage, dir)
						end
						VisualEffects.showDamagePopup(enemy.Position, damage, true)
						VisualEffects.flashEnemy(enemy)
						local _condition_1 = (enemy:GetAttribute("HP"))
						if _condition_1 == nil then
							_condition_1 = 0
						end
						local enemyHp = _condition_1
						if enemyHp - damage <= 0 then
							enemiesDefeatedCount += 1
						end
					end
				end
			end
		end
	end
	-- Animación de desvanecimiento del rayo
	TweenService:Create(beamPart, TweenInfo.new(duration, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Transparency = 1,
		Size = Vector3.new(beamLength, 0.1, 0.1),
	}):Play()
	Debris:AddItem(beamPart, duration + 0.05)
end
-- 11. Loop de recolección/imantación de gemas hacia el jugador
RunService.Heartbeat:Connect(function(dt)
	if isClientPaused or isGameOver then
		return nil
	end
	local character = player.Character
	local _result = character
	if _result ~= nil then
		_result = _result:FindFirstChild("HumanoidRootPart")
	end
	local rootPart = _result
	if not rootPart then
		return nil
	end
	local dropsFolder = Workspace:FindFirstChild("Drops")
	if not dropsFolder then
		return nil
	end
	local inventory = player:FindFirstChild("Inventory")
	local _result_1 = inventory
	if _result_1 ~= nil then
		_result_1 = _result_1:FindFirstChild("magnet_bonus")
	end
	local _result_2 = _result_1
	if _result_2 ~= nil then
		_result_2 = _result_2.Value
	end
	local _condition = _result_2
	if _condition == nil then
		_condition = 0
	end
	local magnetBonus = _condition
	local magnetRadius = 16 + magnetBonus
	local pickupRadius = 2.5
	for _, drop in dropsFolder:GetChildren() do
		if drop:IsA("BasePart") and drop:GetAttribute("Collected") ~= true then
			local _position = rootPart.Position
			local _position_1 = drop.Position
			local dist = (_position - _position_1).Magnitude
			if dist <= magnetRadius then
				local _position_2 = rootPart.Position
				local _position_3 = drop.Position
				local pullDir = (_position_2 - _position_3).Unit
				local magnetSpeed = 24 + (magnetRadius - dist) * 2
				local _position_4 = drop.Position
				local _arg0 = magnetSpeed * dt
				local _arg0_1 = pullDir * _arg0
				drop.Position = _position_4 + _arg0_1
				if dist <= pickupRadius then
					drop:SetAttribute("Collected", true)
					if not collectGemEvent then
						local net = Workspace:FindFirstChild("Network")
						if net then
							collectGemEvent = net:FindFirstChild("CollectGem")
						end
					end
					local _result_3 = collectGemEvent
					if _result_3 ~= nil then
						_result_3:FireServer(drop)
					end
					SoundManager.playGemSound()
					TweenService:Create(drop, TweenInfo.new(0.18), {
						Size = Vector3.new(0.05, 0.05, 0.05),
						Transparency = 1,
					}):Play()
					Debris:AddItem(drop, 0.22)
				end
			end
		end
	end
end)
-- 12. Armas: Fulgor de Éter (Onda de choque radial de área continua)
local fireAetherFlare
task.spawn(function()
	while true do
		if isClientPaused or isGameOver then
			task.wait(0.2)
			continue
		end
		local inventory = player:FindFirstChild("Inventory")
		local _result = inventory
		if _result ~= nil then
			_result = _result:FindFirstChild("aether_flare")
		end
		local _result_1 = _result
		if _result_1 ~= nil then
			_result_1 = _result_1.Value
		end
		local _condition = _result_1
		if _condition == nil then
			_condition = 0
		end
		local flareLvl = _condition
		if flareLvl <= 0 then
			task.wait(1.0)
			continue
		end
		local flareDef = WEAPONS.aether_flare.levels[math.min(flareLvl, #WEAPONS.aether_flare.levels)]
		local cdMultiplier = if activePlatformBuff == "cooldown" then 0.6 else 1.0
		task.wait(flareDef.cooldown * cdMultiplier)
		if isClientPaused or isGameOver then
			continue
		end
		local char = player.Character
		local _result_2 = char
		if _result_2 ~= nil then
			_result_2 = _result_2:FindFirstChild("HumanoidRootPart")
		end
		local hrp = _result_2
		if not hrp then
			continue
		end
		local _result_3 = inventory
		if _result_3 ~= nil then
			_result_3 = _result_3:FindFirstChild("area_bonus")
		end
		local _result_4 = _result_3
		if _result_4 ~= nil then
			_result_4 = _result_4.Value
		end
		local _condition_1 = _result_4
		if _condition_1 == nil then
			_condition_1 = 0
		end
		local areaBonus = _condition_1
		local areaMultiplier = 1.0 + areaBonus
		local effectiveRadius = flareDef.range * areaMultiplier
		local dmgMultiplier = if activePlatformBuff == "damage" then 1.5 else 1.0
		local finalDamage = math.floor(flareDef.damage * dmgMultiplier)
		fireAetherFlare(hrp.Position, effectiveRadius, finalDamage)
	end
end)
function fireAetherFlare(centerPos, radius, damage)
	local spawnPos = Vector3.new(centerPos.X, 0.25, centerPos.Z)
	-- Anillo / Disco de choque radiante dorado Neón
	local shockwave = Instance.new("Part")
	shockwave.Name = "AetherFlareVisual"
	shockwave.Shape = Enum.PartType.Cylinder
	shockwave.Size = Vector3.new(0.3, 2, 2)
	local _cFrame = CFrame.new(spawnPos)
	local _arg0 = CFrame.Angles(0, 0, math.rad(90))
	shockwave.CFrame = _cFrame * _arg0
	shockwave.Material = Enum.Material.Neon
	shockwave.Color = Color3.new(1.0, 0.65, 0.1)
	shockwave.Transparency = 0.3
	shockwave.CanCollide = false
	shockwave.Anchored = true
	shockwave.Parent = Workspace
	local light = Instance.new("PointLight")
	light.Color = shockwave.Color
	light.Range = radius * 0.8
	light.Brightness = 4
	light.Parent = shockwave
	-- Expansión y desvanecimiento
	local pulseTime = 0.38
	TweenService:Create(shockwave, TweenInfo.new(pulseTime, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Size = Vector3.new(0.15, radius * 2, radius * 2),
		Transparency = 1,
	}):Play()
	TweenService:Create(light, TweenInfo.new(pulseTime, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Range = radius * 1.4,
		Brightness = 0,
	}):Play()
	Debris:AddItem(shockwave, pulseTime + 0.05)
	-- Dañar a todos los enemigos dentro del radio del fulgor
	local enemiesFolder = Workspace:FindFirstChild("Enemies")
	if enemiesFolder then
		for _, enemy in enemiesFolder:GetChildren() do
			local _condition = enemy:IsA("BasePart")
			if _condition then
				local _condition_1 = enemy:GetAttribute("HP")
				if _condition_1 == nil then
					_condition_1 = 0
				end
				_condition = _condition_1 > 0
			end
			if _condition then
				local _centerPos = centerPos
				local _position = enemy.Position
				local dist = (_centerPos - _position).Magnitude
				if dist <= radius then
					if not damageEvent then
						local net = Workspace:FindFirstChild("Network")
						if net then
							damageEvent = net:FindFirstChild("DamageEnemy")
						end
					end
					local _position_1 = enemy.Position
					local _centerPos_1 = centerPos
					local knockbackDir = (_position_1 - _centerPos_1).Unit
					local _result = damageEvent
					if _result ~= nil then
						_result:FireServer(enemy, damage, knockbackDir)
					end
					VisualEffects.showDamagePopup(enemy.Position, damage, true)
					VisualEffects.flashEnemy(enemy)
					local _condition_1 = (enemy:GetAttribute("HP"))
					if _condition_1 == nil then
						_condition_1 = 0
					end
					local enemyHp = _condition_1
					if enemyHp - damage <= 0 then
						enemiesDefeatedCount += 1
					end
				end
			end
		end
	end
end
-- 13. Armas: Minas de Vórtice (Minas gravitatorias de implosión en área)
local deployVortexMine
task.spawn(function()
	while true do
		if isClientPaused or isGameOver then
			task.wait(0.2)
			continue
		end
		local inventory = player:FindFirstChild("Inventory")
		local _result = inventory
		if _result ~= nil then
			_result = _result:FindFirstChild("vortex_mine")
		end
		local _result_1 = _result
		if _result_1 ~= nil then
			_result_1 = _result_1.Value
		end
		local _condition = _result_1
		if _condition == nil then
			_condition = 0
		end
		local mineLvl = _condition
		if mineLvl <= 0 then
			task.wait(1.0)
			continue
		end
		local mineDef = WEAPONS.vortex_mine.levels[math.min(mineLvl, #WEAPONS.vortex_mine.levels)]
		local cdMultiplier = if activePlatformBuff == "cooldown" then 0.6 else 1.0
		task.wait(mineDef.cooldown * cdMultiplier)
		if isClientPaused or isGameOver then
			continue
		end
		local char = player.Character
		local _result_2 = char
		if _result_2 ~= nil then
			_result_2 = _result_2:FindFirstChild("HumanoidRootPart")
		end
		local hrp = _result_2
		if not hrp then
			continue
		end
		local _result_3 = inventory
		if _result_3 ~= nil then
			_result_3 = _result_3:FindFirstChild("area_bonus")
		end
		local _result_4 = _result_3
		if _result_4 ~= nil then
			_result_4 = _result_4.Value
		end
		local _condition_1 = _result_4
		if _condition_1 == nil then
			_condition_1 = 0
		end
		local areaBonus = _condition_1
		local areaMultiplier = 1.0 + areaBonus
		local dmgMultiplier = if activePlatformBuff == "damage" then 1.5 else 1.0
		local finalDamage = math.floor(mineDef.damage * dmgMultiplier)
		local blastRadius = mineDef.range * areaMultiplier
		local mineCount = mineDef.projectiles
		do
			local i = 0
			local _shouldIncrement = false
			while true do
				if _shouldIncrement then
					i += 1
				else
					_shouldIncrement = true
				end
				if not (i < mineCount) then
					break
				end
				local angle = (i * (math.pi * 2 / mineCount)) + (math.random() - 0.5) * 0.8
				local dropDist = 2.5 + math.random() * 2.5
				local dropPos = Vector3.new(hrp.Position.X + math.cos(angle) * dropDist, 0.3, hrp.Position.Z + math.sin(angle) * dropDist)
				deployVortexMine(dropPos, blastRadius, finalDamage)
			end
		end
	end
end)
local detonateVortexMine
function deployVortexMine(position, blastRadius, damage)
	-- Part visual de la mina (Cuerpo de cuarzo oscuro + Esfera neón violeta)
	local mine = Instance.new("Part")
	mine.Name = "VortexMineVisual"
	mine.Shape = Enum.PartType.Ball
	mine.Size = Vector3.new(1.2, 1.2, 1.2)
	mine.Position = position
	mine.Material = Enum.Material.Neon
	mine.Color = Color3.new(0.65, 0.2, 0.95)
	mine.CanCollide = false
	mine.Anchored = true
	mine.Parent = Workspace
	local light = Instance.new("PointLight")
	light.Color = mine.Color
	light.Range = 8
	light.Brightness = 2.5
	light.Parent = mine
	-- Anillo base de anclaje de la mina
	local ring = Instance.new("Part")
	ring.Name = "MineBase"
	ring.Shape = Enum.PartType.Cylinder
	ring.Size = Vector3.new(0.15, 2.0, 2.0)
	local _position = position
	local _vector3 = Vector3.new(0, 0.2, 0)
	local _cFrame = CFrame.new(_position - _vector3)
	local _arg0 = CFrame.Angles(0, 0, math.rad(90))
	ring.CFrame = _cFrame * _arg0
	ring.Material = Enum.Material.DiamondPlate
	ring.Color = Color3.new(0.15, 0.1, 0.2)
	ring.CanCollide = false
	ring.Anchored = true
	ring.Parent = mine
	-- Monitorear activación por proximidad
	task.spawn(function()
		task.wait(0.35)
		if not mine.Parent then
			return nil
		end
		local detonated = false
		local triggerRadius = 5.0
		local maxLifetime = 14.0
		local mineStartTime = os.clock()
		while not detonated and mine.Parent and os.clock() - mineStartTime < maxLifetime do
			task.wait(0.08)
			if isClientPaused or isGameOver then
				continue
			end
			local enemiesFolder = Workspace:FindFirstChild("Enemies")
			if enemiesFolder then
				for _, enemy in enemiesFolder:GetChildren() do
					local _condition = enemy:IsA("BasePart")
					if _condition then
						local _condition_1 = enemy:GetAttribute("HP")
						if _condition_1 == nil then
							_condition_1 = 0
						end
						_condition = _condition_1 > 0
					end
					if _condition then
						local _position_1 = position
						local _position_2 = enemy.Position
						local dist = (_position_1 - _position_2).Magnitude
						if dist <= triggerRadius then
							detonated = true
							break
						end
					end
				end
			end
		end
		if mine.Parent then
			detonateVortexMine(position, blastRadius, damage)
			mine:Destroy()
		end
	end)
end
function detonateVortexMine(position, radius, damage)
	-- Efecto de Implosión Gravitatoria y Onda expansiva de Vacío
	local vortex = Instance.new("Part")
	vortex.Name = "VortexDetonation"
	vortex.Shape = Enum.PartType.Ball
	vortex.Size = Vector3.new(0.5, 0.5, 0.5)
	vortex.Position = position
	vortex.Material = Enum.Material.Neon
	vortex.Color = Color3.new(0.75, 0.25, 1.0)
	vortex.Transparency = 0.2
	vortex.CanCollide = false
	vortex.Anchored = true
	vortex.Parent = Workspace
	local pulseDuration = 0.45
	TweenService:Create(vortex, TweenInfo.new(pulseDuration, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
		Size = Vector3.new(radius * 2, radius * 2, radius * 2),
		Transparency = 1,
	}):Play()
	Debris:AddItem(vortex, pulseDuration + 0.05)
	-- Onda plana expansiva
	local shockwave = Instance.new("Part")
	shockwave.Name = "VortexRing"
	shockwave.Shape = Enum.PartType.Cylinder
	shockwave.Size = Vector3.new(0.2, 1, 1)
	local _cFrame = CFrame.new(position)
	local _arg0 = CFrame.Angles(0, 0, math.rad(90))
	shockwave.CFrame = _cFrame * _arg0
	shockwave.Material = Enum.Material.Neon
	shockwave.Color = Color3.new(0.5, 0.1, 0.9)
	shockwave.Transparency = 0.3
	shockwave.CanCollide = false
	shockwave.Anchored = true
	shockwave.Parent = Workspace
	TweenService:Create(shockwave, TweenInfo.new(pulseDuration, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Size = Vector3.new(0.1, radius * 2.2, radius * 2.2),
		Transparency = 1,
	}):Play()
	Debris:AddItem(shockwave, pulseDuration + 0.05)
	-- Dañar y atraer levemente a los enemigos en el radio de la implosión
	local enemiesFolder = Workspace:FindFirstChild("Enemies")
	if enemiesFolder then
		for _, enemy in enemiesFolder:GetChildren() do
			local _condition = enemy:IsA("BasePart")
			if _condition then
				local _condition_1 = enemy:GetAttribute("HP")
				if _condition_1 == nil then
					_condition_1 = 0
				end
				_condition = _condition_1 > 0
			end
			if _condition then
				local _position = position
				local _position_1 = enemy.Position
				local dist = (_position - _position_1).Magnitude
				if dist <= radius then
					if not damageEvent then
						local net = Workspace:FindFirstChild("Network")
						if net then
							damageEvent = net:FindFirstChild("DamageEnemy")
						end
					end
					-- Knockback dir hacia el centro (efecto vórtice / succión gravitatoria)
					local _position_2 = position
					local _position_3 = enemy.Position
					local pullDir = (_position_2 - _position_3).Unit
					local _result = damageEvent
					if _result ~= nil then
						_result:FireServer(enemy, damage, pullDir * 1.2)
					end
					VisualEffects.showDamagePopup(enemy.Position, damage, true)
					VisualEffects.flashEnemy(enemy)
					local _condition_1 = (enemy:GetAttribute("HP"))
					if _condition_1 == nil then
						_condition_1 = 0
					end
					local enemyHp = _condition_1
					if enemyHp - damage <= 0 then
						enemiesDefeatedCount += 1
					end
				end
			end
		end
	end
end
