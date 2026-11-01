-- Compiled with roblox-ts v3.0.0
local TS = require(game:GetService("ReplicatedStorage"):WaitForChild("rbxts_include"):WaitForChild("RuntimeLib"))
local _services = TS.import(script, game:GetService("ReplicatedStorage"), "rbxts_include", "node_modules", "@rbxts", "services")
local Debris = _services.Debris
local Players = _services.Players
local RunService = _services.RunService
local TweenService = _services.TweenService
local UserInputService = _services.UserInputService
local Workspace = _services.Workspace
local WEAPONS = TS.import(script, game:GetService("ReplicatedStorage"), "TS", "weapons").WEAPONS
local VisualEffects = TS.import(script, script.Parent, "effects").VisualEffects
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
-- Estado local de pausa y partida
local isClientPaused = false
local isGameOver = false
local startTime = os.clock()
local enemiesDefeatedCount = 0
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
-- Indicador / Cooldown de Dash en HUD
local dashIndicator = Instance.new("Frame")
dashIndicator.Name = "DashIndicator"
dashIndicator.Size = UDim2.new(0, 130, 0, 24)
dashIndicator.Position = UDim2.new(0.5, -65, 0.88, 0)
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
dashText.Text = "⚡ DASH [L-SHIFT]"
dashText.TextColor3 = Color3.new(0.2, 0.9, 0.95)
dashText.TextSize = 13
dashText.Parent = dashIndicator
task.spawn(function()
	while true do
		task.wait(0.1)
		local timeSinceDash = os.clock() - lastDashTime
		if timeSinceDash >= DASH_COOLDOWN then
			dashText.Text = "⚡ DASH [L-SHIFT]"
			dashText.TextColor3 = Color3.new(0.2, 0.9, 0.95)
		else
			local remaining = string.format("%.1f", math.max(0, DASH_COOLDOWN - timeSinceDash))
			dashText.Text = `⏳ {remaining}s`
			dashText.TextColor3 = Color3.new(0.6, 0.6, 0.65)
		end
	end
end)
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
-- Escuchar pulsación de Shift izquierdo o Q para Dash
UserInputService.InputBegan:Connect(function(input, processed)
	if processed then
		return nil
	end
	if input.KeyCode == Enum.KeyCode.LeftShift or input.KeyCode == Enum.KeyCode.Q then
		triggerDash()
	end
end)
-- 2. Obtener referencias de RemoteEvents
local networkFolder = Workspace:WaitForChild("Network", 5)
local damageEvent = if networkFolder then (networkFolder:WaitForChild("DamageEnemy", 5)) else nil
local collectGemEvent = if networkFolder then (networkFolder:WaitForChild("CollectGem", 5)) else nil
local levelUpEvent = if networkFolder then (networkFolder:WaitForChild("LevelUp", 5)) else nil
local selectUpgradeEvent = if networkFolder then (networkFolder:WaitForChild("SelectUpgrade", 5)) else nil
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
	-- Reaparecer al jugador con salud completa
	gameOverGui.Enabled = false
	isGameOver = false
	startTime = os.clock()
	enemiesDefeatedCount = 0
	local char = player.Character
	local _hum = char
	if _hum ~= nil then
		_hum = _hum:FindFirstChildOfClass("Humanoid")
	end
	local hum = _hum
	if hum then
		hum.Health = hum.MaxHealth
	end
	-- Teleportar a la base
	local _result = char
	if _result ~= nil then
		_result = _result:FindFirstChild("HumanoidRootPart")
	end
	local hrp = _result
	if hrp then
		hrp.CFrame = CFrame.new(0, 3, 0)
	end
end)
-- Detectar muerte del jugador para mostrar Game Over
local function connectDeathListener(character)
	local hum = character:WaitForChild("Humanoid", 5)
	if hum then
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
local savedWalkSpeed = 16
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
	local options = { {
		id = "void_boomerang",
		title = "Búmeran del Vacío",
		tag = if boomerangLvl < 3 then `Nivel {boomerangLvl + 1}` else "Nivel MÁX",
		desc = if boomerangLvl == 1 then "+50% daño y mayor velocidad" else "Dispara 2 búmeranes con -20% cooldown",
		color = Color3.new(0.08, 0.45, 0.4),
	}, {
		id = "plasma_blaster",
		title = if plasmaLvl == 0 then "Nueva Arma: Bláster" else "Bláster de Plasma",
		tag = if plasmaLvl == 0 then "DESBLOQUEAR" else `Nivel {plasmaLvl + 1}`,
		desc = if plasmaLvl == 0 then "Ráfagas teledirigidas de alta cadencia" else "Dispara 2 esferas de plasma a la vez",
		color = Color3.new(0.45, 0.15, 0.5),
	}, {
		id = "speed_boost",
		title = "Propulsores de Pies",
		tag = "PASIVA",
		desc = "+18% velocidad de movimiento permanente",
		color = Color3.new(0.15, 0.35, 0.55),
	} }
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
			local _result_4 = selectUpgradeEvent
			if _result_4 ~= nil then
				_result_4:FireServer(opt.id)
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
		task.wait(boomerangDef.cooldown)
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
					fireBoomerang(rootPart.Position, targetPos, boomerangDef.damage, boomerangDef.speed, angleOffset)
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
							local origColor = enemy.Color
							enemy.Color = Color3.new(1, 1, 1)
							task.delay(0.08, function()
								if enemy and enemy.Parent then
									enemy.Color = origColor
								end
							end)
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
		task.wait(plasmaDef.cooldown)
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
			firePlasmaOrb(rootPart.Position, targetEnemy, plasmaDef.damage, plasmaDef.speed)
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
-- 9. Loop de recolección/imantación de gemas hacia el jugador
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
	local magnetRadius = 16
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
					local _result_1 = collectGemEvent
					if _result_1 ~= nil then
						_result_1:FireServer(drop)
					end
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
