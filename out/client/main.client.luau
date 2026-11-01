-- Compiled with roblox-ts v3.0.0
local TS = require(game:GetService("ReplicatedStorage"):WaitForChild("rbxts_include"):WaitForChild("RuntimeLib"))
local _services = TS.import(script, game:GetService("ReplicatedStorage"), "rbxts_include", "node_modules", "@rbxts", "services")
local Debris = _services.Debris
local Players = _services.Players
local RunService = _services.RunService
local TweenService = _services.TweenService
local Workspace = _services.Workspace
local WEAPONS = TS.import(script, game:GetService("ReplicatedStorage"), "TS", "weapons").WEAPONS
local VisualEffects = TS.import(script, script.Parent, "effects").VisualEffects
local player = Players.LocalPlayer
print(`[r-survivors] Cliente listo para el jugador: {player.Name}`)
-- Obtener RemoteEvents
local networkFolder = Workspace:WaitForChild("Network", 5)
local damageEvent = if networkFolder then (networkFolder:WaitForChild("DamageEnemy", 5)) else nil
local collectGemEvent = if networkFolder then (networkFolder:WaitForChild("CollectGem", 5)) else nil
-- Auto-aim loop: busca el enemigo más cercano y lanza ataques
local fireBoomerang
task.spawn(function()
	local boomerangDef = WEAPONS.void_boomerang.levels[1]
	while true do
		task.wait(boomerangDef.cooldown)
		local character = player.Character
		local _result = character
		if _result ~= nil then
			_result = _result:FindFirstChild("HumanoidRootPart")
		end
		local rootPart = _result
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
			local _condition = enemy:IsA("BasePart")
			if _condition then
				local _condition_1 = enemy:GetAttribute("HP")
				if _condition_1 == nil then
					_condition_1 = 0
				end
				_condition = _condition_1 > 0
			end
			if _condition then
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
			fireBoomerang(rootPart.Position, targetPos, boomerangDef.damage, boomerangDef.speed)
		end
	end
end)
function fireBoomerang(startPos, targetPos, damage, speed)
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
	local maxTravel = 35
	local traveled = 0
	local returning = false
	-- Registro de cooldown de impacto por enemigo para permitir re-impacto en la vuelta
	local hitCooldowns = {}
	local connection
	connection = RunService.Heartbeat:Connect(function(dt)
		local _orientation = blade.Orientation
		local _vector3_1 = Vector3.new(0, 1600 * dt, 0)
		blade.Orientation = _orientation + _vector3_1
		local _result = player.Character
		if _result ~= nil then
			_result = _result:FindFirstChild("HumanoidRootPart")
		end
		local rootPart = _result
		-- Movimiento ida / vuelta
		if not returning then
			local _position = blade.Position
			local _arg0 = speed * dt
			local _arg0_1 = dir * _arg0
			blade.Position = _position + _arg0_1
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
		-- Detección de colisión con enemigos
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
					if dist <= 3.2 then
						local _condition_1 = hitCooldowns[enemy]
						if _condition_1 == nil then
							_condition_1 = 0
						end
						local lastHit = _condition_1
						if currentTime - lastHit >= 0.35 then
							hitCooldowns[enemy] = currentTime
							-- Notificar al servidor el impacto
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
							-- Efecto visual instantáneo local
							VisualEffects.showDamagePopup(enemy.Position, damage)
							-- Flash de impacto en el enemigo
							local origColor = enemy.Color
							enemy.Color = Color3.new(1, 1, 1)
							task.delay(0.08, function()
								if enemy and enemy.Parent then
									enemy.Color = origColor
								end
							end)
						end
					end
				end
			end
		end
	end)
	-- Limpieza de seguridad tras 4 segundos
	Debris:AddItem(blade, 4)
end
-- Loop de recolección/imantación de gemas hacia el jugador
RunService.Heartbeat:Connect(function(dt)
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
	local magnetRadius = 15
	local pickupRadius = 2.5
	for _, drop in dropsFolder:GetChildren() do
		if drop:IsA("BasePart") and drop:GetAttribute("Collected") ~= true then
			local _position = rootPart.Position
			local _position_1 = drop.Position
			local dist = (_position - _position_1).Magnitude
			if dist <= magnetRadius then
				-- Atraer gema suavemente hacia el jugador
				local _position_2 = rootPart.Position
				local _position_3 = drop.Position
				local pullDir = (_position_2 - _position_3).Unit
				local magnetSpeed = 22 + (magnetRadius - dist) * 2
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
					-- Animación de recogida local (shrink & fade)
					TweenService:Create(drop, TweenInfo.new(0.2), {
						Size = Vector3.new(0.05, 0.05, 0.05),
						Transparency = 1,
					}):Play()
					Debris:AddItem(drop, 0.25)
				end
			end
		end
	end
end)
