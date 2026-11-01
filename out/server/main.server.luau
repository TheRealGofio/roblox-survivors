-- Compiled with roblox-ts v3.0.0
local TS = require(game:GetService("ReplicatedStorage"):WaitForChild("rbxts_include"):WaitForChild("RuntimeLib"))
local _services = TS.import(script, game:GetService("ReplicatedStorage"), "rbxts_include", "node_modules", "@rbxts", "services")
local Debris = _services.Debris
local Players = _services.Players
local RunService = _services.RunService
local TweenService = _services.TweenService
local Workspace = _services.Workspace
local ENEMY_TYPES = TS.import(script, game:GetService("ReplicatedStorage"), "TS", "enemies").ENEMY_TYPES
print("[r-survivors] Servidor inicializado con éxito.")
-- Estado global de juego y tiempo de partida
local isGamePaused = false
local gameElapsedTime = 0
-- 1. Crear el suelo de la arena física (Baseplate) si no existe
local baseplate = Workspace:FindFirstChild("Baseplate")
if not baseplate then
	baseplate = Instance.new("Part")
	baseplate.Name = "Baseplate"
	baseplate.Size = Vector3.new(500, 4, 500)
	baseplate.Position = Vector3.new(0, -2, 0)
	baseplate.Anchored = true
	baseplate.CanCollide = true
	baseplate.Material = Enum.Material.Concrete
	baseplate.Color = Color3.new(0.18, 0.22, 0.28)
	baseplate.Parent = Workspace
	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "SpawnLocation"
	spawn.Size = Vector3.new(12, 1, 12)
	spawn.Position = Vector3.new(0, 0.5, 0)
	spawn.Anchored = true
	spawn.CanCollide = true
	spawn.Neutral = true
	spawn.Material = Enum.Material.Neon
	spawn.Color = Color3.new(0.1, 0.6, 0.9)
	spawn.Parent = Workspace
end
-- 2. Folders organizativos en Workspace
local enemiesFolder = Workspace:FindFirstChild("Enemies")
if not enemiesFolder then
	enemiesFolder = Instance.new("Folder")
	enemiesFolder.Name = "Enemies"
	enemiesFolder.Parent = Workspace
end
local enemyProjectilesFolder = Workspace:FindFirstChild("EnemyProjectiles")
if not enemyProjectilesFolder then
	enemyProjectilesFolder = Instance.new("Folder")
	enemyProjectilesFolder.Name = "EnemyProjectiles"
	enemyProjectilesFolder.Parent = Workspace
end
local dropsFolder = Workspace:FindFirstChild("Drops")
if not dropsFolder then
	dropsFolder = Instance.new("Folder")
	dropsFolder.Name = "Drops"
	dropsFolder.Parent = Workspace
end
local networkFolder = Workspace:FindFirstChild("Network")
if not networkFolder then
	networkFolder = Instance.new("Folder")
	networkFolder.Name = "Network"
	networkFolder.Parent = Workspace
end
-- 3. RemoteEvents para Red
local damageEnemyEvent = networkFolder:FindFirstChild("DamageEnemy")
if not damageEnemyEvent then
	damageEnemyEvent = Instance.new("RemoteEvent")
	damageEnemyEvent.Name = "DamageEnemy"
	damageEnemyEvent.Parent = networkFolder
end
local collectGemEvent = networkFolder:FindFirstChild("CollectGem")
if not collectGemEvent then
	collectGemEvent = Instance.new("RemoteEvent")
	collectGemEvent.Name = "CollectGem"
	collectGemEvent.Parent = networkFolder
end
local levelUpEvent = networkFolder:FindFirstChild("LevelUp")
if not levelUpEvent then
	levelUpEvent = Instance.new("RemoteEvent")
	levelUpEvent.Name = "LevelUp"
	levelUpEvent.Parent = networkFolder
end
local selectUpgradeEvent = networkFolder:FindFirstChild("SelectUpgrade")
if not selectUpgradeEvent then
	selectUpgradeEvent = Instance.new("RemoteEvent")
	selectUpgradeEvent.Name = "SelectUpgrade"
	selectUpgradeEvent.Parent = networkFolder
end
-- 4. Función generadora de Gemas (Cristales de EXP)
local function spawnExpGem(position, expValue)
	if expValue == nil then
		expValue = 10
	end
	local gem = Instance.new("Part")
	gem.Name = "ExpGem"
	gem.Shape = Enum.PartType.Ball
	gem.Size = Vector3.new(1.2, 1.2, 1.2)
	gem.Material = Enum.Material.Neon
	-- Gemas grandes para los tanques
	if expValue >= 30 then
		gem.Size = Vector3.new(1.8, 1.8, 1.8)
		gem.Color = Color3.new(0.95, 0.85, 0.1)
	else
		gem.Color = Color3.new(0.2, 0.9, 0.35)
	end
	gem.CanCollide = false
	gem.Anchored = true
	local _position = position
	local _vector3 = Vector3.new(0, 0.6, 0)
	gem.Position = _position + _vector3
	gem:SetAttribute("ExpValue", expValue)
	gem:SetAttribute("Collected", false)
	gem.Parent = dropsFolder
	local light = Instance.new("PointLight")
	light.Color = gem.Color
	light.Range = 6
	light.Brightness = 1.2
	light.Parent = gem
	Debris:AddItem(gem, 45)
end
-- 5. Manejo del daño a enemigos recibido desde el cliente
damageEnemyEvent.OnServerEvent:Connect(function(player, enemyArg, damageArg, knockbackDirArg)
	if isGamePaused then
		return nil
	end
	local enemy = enemyArg
	local _damageArg = damageArg
	local damage = if typeof(_damageArg) == "number" then damageArg else 10
	local knockbackDir = knockbackDirArg
	if enemy and enemy:IsDescendantOf(enemiesFolder) and enemy:IsA("BasePart") then
		local _condition = (enemy:GetAttribute("HP"))
		if _condition == nil then
			_condition = 40
		end
		local currentHp = _condition
		local newHp = math.max(0, currentHp - damage)
		enemy:SetAttribute("HP", newHp)
		if knockbackDir then
			local bodyVel = enemy:FindFirstChildOfClass("BodyVelocity")
			local isTank = enemy:GetAttribute("Behavior") == "tank"
			-- Los brutos gigantes tienen gran resistencia al knockback
			local knockbackForce = if isTank then 5 else 18
			if bodyVel then
				local _exp = knockbackDir * knockbackForce
				local _vector3 = Vector3.new(0, if isTank then 1 else 4, 0)
				bodyVel.Velocity = _exp + _vector3
				enemy:SetAttribute("InKnockback", true)
				task.delay(0.22, function()
					if enemy and enemy.Parent then
						enemy:SetAttribute("InKnockback", false)
					end
				end)
			end
		end
		if newHp <= 0 then
			local deathPos = enemy.Position
			local _condition_1 = (enemy:GetAttribute("XpReward"))
			if _condition_1 == nil then
				_condition_1 = 15
			end
			local xpReward = _condition_1
			spawnExpGem(deathPos, xpReward)
			enemy.CanCollide = false
			TweenService:Create(enemy, TweenInfo.new(0.15, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				Size = Vector3.new(0.1, 0.1, 0.1),
				Transparency = 1,
			}):Play()
			task.delay(0.18, function()
				enemy:Destroy()
			end)
		end
	end
end)
-- 6. Manejo de recolección de gemas y Level Up
collectGemEvent.OnServerEvent:Connect(function(player, gemArg)
	if isGamePaused then
		return nil
	end
	local gem = gemArg
	if gem and gem:IsDescendantOf(dropsFolder) and gem:IsA("BasePart") then
		local _condition = (gem:GetAttribute("ExpValue"))
		if _condition == nil then
			_condition = 10
		end
		local exp = _condition
		gem:Destroy()
		local leaderstats = player:FindFirstChild("leaderstats")
		if leaderstats then
			local expStat = leaderstats:FindFirstChild("EXP")
			local levelStat = leaderstats:FindFirstChild("Level")
			if expStat and levelStat then
				expStat.Value += exp
				local nextLevelReq = levelStat.Value * 50
				if expStat.Value >= nextLevelReq then
					expStat.Value -= nextLevelReq
					levelStat.Value += 1
					print(`[r-survivors] ¡{player.Name} alcanzó el Nivel {levelStat.Value}! Pausando juego...`)
					isGamePaused = true
					for _, enemy in enemiesFolder:GetChildren() do
						if enemy:IsA("BasePart") then
							local vel = enemy:FindFirstChildOfClass("BodyVelocity")
							if vel then
								vel.Velocity = Vector3.new(0, 0, 0)
							end
						end
					end
					levelUpEvent:FireClient(player, levelStat.Value)
				end
			end
		end
	end
end)
-- 7. Configuración de estadísticas y estado inicial del jugador
Players.PlayerAdded:Connect(function(plr)
	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"
	leaderstats.Parent = plr
	local level = Instance.new("IntValue")
	level.Name = "Level"
	level.Value = 1
	level.Parent = leaderstats
	local exp = Instance.new("NumberValue")
	exp.Name = "EXP"
	exp.Value = 0
	exp.Parent = leaderstats
	local inventory = Instance.new("Folder")
	inventory.Name = "Inventory"
	inventory.Parent = plr
	local boomerangLvl = Instance.new("IntValue")
	boomerangLvl.Name = "void_boomerang"
	boomerangLvl.Value = 1
	boomerangLvl.Parent = inventory
	local plasmaLvl = Instance.new("IntValue")
	plasmaLvl.Name = "plasma_blaster"
	plasmaLvl.Value = 0
	plasmaLvl.Parent = inventory
	local maxHpBonus = Instance.new("NumberValue")
	maxHpBonus.Name = "max_hp_bonus"
	maxHpBonus.Value = 0
	maxHpBonus.Parent = inventory
	local moveSpeedBonus = Instance.new("NumberValue")
	moveSpeedBonus.Name = "speed_bonus"
	moveSpeedBonus.Value = 0
	moveSpeedBonus.Parent = inventory
end)
-- 8. Manejo de elección de mejoras y REANUDACIÓN
selectUpgradeEvent.OnServerEvent:Connect(function(player, upgradeIdArg)
	local upgradeId = upgradeIdArg
	local inventory = player:FindFirstChild("Inventory")
	if inventory then
		if upgradeId == "void_boomerang" then
			local val = inventory:FindFirstChild("void_boomerang")
			if val then
				val.Value += 1
				print(`[Upgrade] {player.Name} subió Búmeran a Nivel {val.Value}`)
			end
		elseif upgradeId == "plasma_blaster" then
			local val = inventory:FindFirstChild("plasma_blaster")
			if val then
				val.Value += 1
				print(`[Upgrade] {player.Name} mejoró/desbloqueó Bláster de Plasma a Nivel {val.Value}`)
			end
		elseif upgradeId == "speed_boost" then
			local val = inventory:FindFirstChild("speed_bonus")
			if val then
				val.Value += 3
				local _hum = player.Character
				if _hum ~= nil then
					_hum = _hum:FindFirstChildOfClass("Humanoid")
				end
				local hum = _hum
				if hum then
					hum.WalkSpeed += 3
				end
			end
		elseif upgradeId == "max_hp" then
			local _hum = player.Character
			if _hum ~= nil then
				_hum = _hum:FindFirstChildOfClass("Humanoid")
			end
			local hum = _hum
			if hum then
				hum.MaxHealth += 25
				hum.Health += 25
			end
		end
	end
	isGamePaused = false
	print("[r-survivors] Juego reanudado.")
end)
-- 9. Función para crear cualquier enemigo de ENEMY_TYPES
local function createEnemyInstance(config, index)
	local enemy = Instance.new("Part")
	enemy.Name = `{config.name}_{index}`
	enemy.Size = config.size
	enemy.Color = config.color
	enemy.Material = config.material
	enemy.Anchored = false
	enemy.CanCollide = true
	local angle = math.random() * math.pi * 2
	local dist = 42 + math.random() * 22
	enemy.Position = Vector3.new(math.cos(angle) * dist, config.size.Y / 2 + 1, math.sin(angle) * dist)
	enemy:SetAttribute("HP", config.hp)
	enemy:SetAttribute("MaxHP", config.hp)
	enemy:SetAttribute("Speed", config.speed)
	enemy:SetAttribute("Damage", config.damage)
	enemy:SetAttribute("XpReward", config.xpValue)
	enemy:SetAttribute("Behavior", config.behavior)
	enemy:SetAttribute("InKnockback", false)
	enemy:SetAttribute("LastShotTime", 0)
	enemy.Parent = enemiesFolder
	local bodyVelocity = Instance.new("BodyVelocity")
	bodyVelocity.MaxForce = Vector3.new(6000, 0, 6000)
	bodyVelocity.Velocity = Vector3.new(0, 0, 0)
	bodyVelocity.Parent = enemy
	local lastPlayerDamageTime = 0
	enemy.Touched:Connect(function(hitPart)
		if isGamePaused then
			return nil
		end
		local char = hitPart.Parent
		local _hum = char
		if _hum ~= nil then
			_hum = _hum:FindFirstChildOfClass("Humanoid")
		end
		local hum = _hum
		if hum and hum.Health > 0 then
			local now = os.clock()
			if now - lastPlayerDamageTime >= 0.8 then
				lastPlayerDamageTime = now
				hum:TakeDamage(config.damage)
			end
		end
	end)
	return enemy
end
-- 10. Spawner inteligente con escalado de oleadas
task.spawn(function()
	local enemyIndex = 0
	while true do
		task.wait(1.5)
		if isGamePaused then
			continue
		end
		gameElapsedTime += 1.5
		local currentCount = #enemiesFolder:GetChildren()
		local maxCapacity = math.min(50, 20 + math.floor(gameElapsedTime / 20) * 5)
		if currentCount < maxCapacity then
			enemyIndex += 1
			-- Selección probabilística según tiempo de supervivencia
			local chosenConfig = ENEMY_TYPES.crawler
			local roll = math.random()
			if gameElapsedTime > 60 and roll < 0.15 then
				-- Bruto Goliat (Tanque grande tras 1 minuto)
				chosenConfig = ENEMY_TYPES.brute
			elseif gameElapsedTime > 35 and roll < 0.35 then
				-- Centinela Tirador
				chosenConfig = ENEMY_TYPES.turret
			elseif gameElapsedTime > 15 and roll < 0.6 then
				-- Deslizador rápido
				chosenConfig = ENEMY_TYPES.skimmer
			else
				-- Crawler básico
				chosenConfig = ENEMY_TYPES.crawler
			end
			createEnemyInstance(chosenConfig, enemyIndex)
		end
	end
end)
-- 11. IA de comportamiento por arquetipo (Melee, Fast, Tank, Shooter)
local fireEnemyProjectile
RunService.Heartbeat:Connect(function()
	if isGamePaused then
		for _, enemy in enemiesFolder:GetChildren() do
			if enemy:IsA("BasePart") then
				local bodyVel = enemy:FindFirstChildOfClass("BodyVelocity")
				if bodyVel then
					bodyVel.Velocity = Vector3.new(0, 0, 0)
				end
			end
		end
		return nil
	end
	local allPlayers = Players:GetPlayers()
	local currentTime = os.clock()
	for _, enemy in enemiesFolder:GetChildren() do
		if enemy:IsA("BasePart") and enemy:GetAttribute("InKnockback") ~= true then
			local bodyVel = enemy:FindFirstChildOfClass("BodyVelocity")
			if not bodyVel then
				continue
			end
			local behavior = enemy:GetAttribute("Behavior")
			local _condition = (enemy:GetAttribute("Speed"))
			if _condition == nil then
				_condition = 8.0
			end
			local baseSpeed = _condition
			-- Encontrar jugador más cercano
			local closestDist = 99999
			local targetPos = nil
			local targetPlayer = nil
			for _1, p in allPlayers do
				local char = p.Character
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
				if hrp and hum and hum.Health > 0 then
					local _position = hrp.Position
					local _position_1 = enemy.Position
					local dist = (_position - _position_1).Magnitude
					if dist < closestDist then
						closestDist = dist
						targetPos = hrp.Position
						targetPlayer = p
					end
				end
			end
			if targetPos then
				local _targetPos = targetPos
				local _position = enemy.Position
				local dir = _targetPos - _position
				local dirHorizontal = Vector3.new(dir.X, 0, dir.Z).Unit
				-- Comportamiento Shooter (Centinela)
				if behavior == "shooter" then
					-- Mantiene distancia óptima de disparo (20 a 28 studs)
					if closestDist < 18 then
						-- Retroceder si el jugador se acerca demasiado
						local _arg0 = -baseSpeed * 0.8
						bodyVel.Velocity = dirHorizontal * _arg0
					elseif closestDist > 28 then
						-- Acercarse si está lejos
						bodyVel.Velocity = dirHorizontal * baseSpeed
					else
						-- Orbitar lateralmente
						local perpDir = Vector3.new(-dirHorizontal.Z, 0, dirHorizontal.X)
						local _arg0 = baseSpeed * 0.6
						bodyVel.Velocity = perpDir * _arg0
					end
					-- Disparar proyectil al jugador
					local _condition_1 = (enemy:GetAttribute("LastShotTime"))
					if _condition_1 == nil then
						_condition_1 = 0
					end
					local lastShot = _condition_1
					if currentTime - lastShot >= 3.0 then
						enemy:SetAttribute("LastShotTime", currentTime)
						fireEnemyProjectile(enemy.Position, targetPos, 14)
					end
				else
					-- Persecución directa (Melee, Fast, Tank)
					bodyVel.Velocity = dirHorizontal * baseSpeed
				end
			else
				-- Sin objetivos vivos: ir al centro
				local _vector3 = Vector3.new(0, 0, 0)
				local _position = enemy.Position
				local dirToCenter = (_vector3 - _position).Unit
				bodyVel.Velocity = Vector3.new(dirToCenter.X * 5, 0, dirToCenter.Z * 5)
			end
		end
	end
end)
-- 12. Proyectiles hostiles de los Centinelas (Turret)
function fireEnemyProjectile(startPos, targetPos, damage)
	local proj = Instance.new("Part")
	proj.Name = "TurretOrb"
	proj.Shape = Enum.PartType.Ball
	proj.Size = Vector3.new(1.3, 1.3, 1.3)
	proj.Color = Color3.new(0.05, 0.85, 1.0)
	proj.Material = Enum.Material.Neon
	proj.CanCollide = false
	proj.Anchored = false
	local _startPos = startPos
	local _vector3 = Vector3.new(0, 1.5, 0)
	proj.Position = _startPos + _vector3
	proj.Parent = enemyProjectilesFolder
	local light = Instance.new("PointLight")
	light.Color = proj.Color
	light.Range = 6
	light.Brightness = 1.5
	light.Parent = proj
	local _targetPos = targetPos
	local _position = proj.Position
	local dir = (_targetPos - _position).Unit
	local bodyVel = Instance.new("BodyVelocity")
	bodyVel.MaxForce = Vector3.new(8000, 8000, 8000)
	bodyVel.Velocity = dir * 26
	bodyVel.Parent = proj
	local hit = false
	proj.Touched:Connect(function(hitPart)
		if hit then
			return nil
		end
		local char = hitPart.Parent
		local _hum = char
		if _hum ~= nil then
			_hum = _hum:FindFirstChildOfClass("Humanoid")
		end
		local hum = _hum
		if hum and hum.Health > 0 then
			hit = true
			hum:TakeDamage(damage)
			proj:Destroy()
		end
	end)
	Debris:AddItem(proj, 4)
end
