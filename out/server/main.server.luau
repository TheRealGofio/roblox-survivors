-- Compiled with roblox-ts v3.0.0
local TS = require(game:GetService("ReplicatedStorage"):WaitForChild("rbxts_include"):WaitForChild("RuntimeLib"))
local _services = TS.import(script, game:GetService("ReplicatedStorage"), "rbxts_include", "node_modules", "@rbxts", "services")
local Debris = _services.Debris
local PhysicsService = _services.PhysicsService
local Players = _services.Players
local RunService = _services.RunService
local Workspace = _services.Workspace
local ENEMY_TYPES = TS.import(script, game:GetService("ReplicatedStorage"), "TS", "enemies").ENEMY_TYPES
local EnvironmentManager = TS.import(script, game:GetService("ServerScriptService"), "TS", "environment").EnvironmentManager
print("[r-survivors] Servidor inicializado con éxito.")
-- Registrar CollisionGroup "Enemies" para que los enemigos no choquen entre sí pero sí con el entorno
pcall(function()
	PhysicsService:RegisterCollisionGroup("Enemies")
	PhysicsService:CollisionGroupSetCollidable("Enemies", "Enemies", false)
end)
-- Inicializar atmósfera e iluminación estilizada
EnvironmentManager.setupAtmosphere()
EnvironmentManager.buildArenaEnvironment()
-- Estado global de juego y tiempo de partida
local isGamePaused = false
local gameElapsedTime = 0
local bossSpawned = false
local boss1Spawned = false
local boss2Spawned = false
local boss3Spawned = false
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
local bossAlertEvent = networkFolder:FindFirstChild("BossAlert")
if not bossAlertEvent then
	bossAlertEvent = Instance.new("RemoteEvent")
	bossAlertEvent.Name = "BossAlert"
	bossAlertEvent.Parent = networkFolder
end
local debugActionEvent = networkFolder:FindFirstChild("DebugAction")
if not debugActionEvent then
	debugActionEvent = Instance.new("RemoteEvent")
	debugActionEvent.Name = "DebugAction"
	debugActionEvent.Parent = networkFolder
end
local restartGameEvent = networkFolder:FindFirstChild("RestartGame")
if not restartGameEvent then
	restartGameEvent = Instance.new("RemoteEvent")
	restartGameEvent.Name = "RestartGame"
	restartGameEvent.Parent = networkFolder
end
local zaWarudoEvent = networkFolder:FindFirstChild("ZaWarudo")
if not zaWarudoEvent then
	zaWarudoEvent = Instance.new("RemoteEvent")
	zaWarudoEvent.Name = "ZaWarudo"
	zaWarudoEvent.Parent = networkFolder
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
	if expValue >= 100 then
		-- Gema colosal del Boss
		gem.Size = Vector3.new(3.0, 3.0, 3.0)
		gem.Color = Color3.new(1.0, 0.2, 0.85)
	elseif expValue >= 30 then
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
	light.Range = if expValue >= 100 then 16 else 6
	light.Brightness = 1.6
	light.Parent = gem
	Debris:AddItem(gem, 55)
end
-- 5. Spawner de Ítems Especiales (Cofre de Suministros e Imán de Gemas)
local function spawnMagnetItem(pos)
	local magnet = Instance.new("Part")
	magnet.Name = "VacuumMagnet"
	magnet.Shape = Enum.PartType.Cylinder
	magnet.Size = Vector3.new(1.5, 2.2, 2.2)
	local _pos = pos
	local _vector3 = Vector3.new(0, 1.2, 0)
	local _cFrame = CFrame.new(_pos + _vector3)
	local _arg0 = CFrame.Angles(0, 0, math.rad(90))
	magnet.CFrame = _cFrame * _arg0
	magnet.Color = Color3.new(0.2, 0.8, 1.0)
	magnet.Material = Enum.Material.Neon
	magnet.Anchored = true
	magnet.CanCollide = false
	magnet:SetAttribute("IsSpecialDrop", "magnet")
	magnet:SetAttribute("Collected", false)
	magnet.Parent = dropsFolder
	local light = Instance.new("PointLight")
	light.Color = magnet.Color
	light.Range = 12
	light.Brightness = 2
	light.Parent = magnet
	Debris:AddItem(magnet, 40)
end
local function spawnSupplyChest(pos)
	local chest = Instance.new("Part")
	chest.Name = "SupplyChest"
	chest.Size = Vector3.new(2.8, 2.2, 2.2)
	local _pos = pos
	local _vector3 = Vector3.new(0, 1.1, 0)
	chest.Position = _pos + _vector3
	chest.Color = Color3.new(1.0, 0.75, 0.1)
	chest.Material = Enum.Material.Neon
	chest.Anchored = true
	chest.CanCollide = false
	chest:SetAttribute("IsSpecialDrop", "chest")
	chest:SetAttribute("Collected", false)
	chest.Parent = dropsFolder
	local light = Instance.new("PointLight")
	light.Color = chest.Color
	light.Range = 14
	light.Brightness = 2.5
	light.Parent = chest
	Debris:AddItem(chest, 50)
end
-- Spawner periódico de Drops de Suministro (cada 35 segundos)
task.spawn(function()
	while true do
		task.wait(35)
		if isGamePaused then
			continue
		end
		local angle = math.random() * math.pi * 2
		local dist = 15 + math.random() * 30
		local dropPos = Vector3.new(math.cos(angle) * dist, 0, math.sin(angle) * dist)
		if math.random() < 0.5 then
			spawnMagnetItem(dropPos)
		else
			spawnSupplyChest(dropPos)
		end
	end
end)
-- 6. Manejo del daño a enemigos recibido desde el cliente
damageEnemyEvent.OnServerEvent:Connect(function(player, enemyArg, damageArg, knockbackDirArg)
	if isGamePaused then
		return nil
	end
	local enemy = enemyArg
	local _damageArg = damageArg
	local damage = if typeof(_damageArg) == "number" then damageArg else 10
	local knockbackDir = knockbackDirArg
	if enemy and enemy:IsDescendantOf(enemiesFolder) and enemy:IsA("BasePart") then
		if enemy:GetAttribute("IsDead") == true then
			return nil
		end
		local _condition = (enemy:GetAttribute("HP"))
		if _condition == nil then
			_condition = 40
		end
		local currentHp = _condition
		local newHp = math.max(0, currentHp - damage)
		enemy:SetAttribute("HP", newHp)
		if newHp > 0 then
			if knockbackDir then
				local bodyVel = enemy:FindFirstChildOfClass("BodyVelocity")
				local isBoss = enemy:GetAttribute("Behavior") == "boss"
				local isTank = enemy:GetAttribute("Behavior") == "tank"
				-- Los jefes son inamovibles (inmunes a knockback), los tanques tienen alta resistencia
				local knockbackForce = if isBoss then 0 elseif isTank then 5 else 18
				if bodyVel and knockbackForce > 0 then
					local massMult = math.max(1, enemy:GetMass())
					bodyVel.MaxForce = Vector3.new(massMult * 12000, massMult * 10000, massMult * 12000)
					local _exp = knockbackDir * knockbackForce
					local _vector3 = Vector3.new(0, if isTank then 1 else 4, 0)
					bodyVel.Velocity = _exp + _vector3
					enemy:SetAttribute("InKnockback", true)
					task.delay(0.22, function()
						if enemy and enemy.Parent and enemy:GetAttribute("IsDead") ~= true then
							enemy:SetAttribute("InKnockback", false)
							bodyVel.MaxForce = Vector3.new(massMult * 10000, massMult * 30000, massMult * 10000)
						end
					end)
				end
			end
		else
			-- MUERTE DEL ENEMIGO
			enemy:SetAttribute("IsDead", true)
			enemy.CanCollide = false
			local deathPos = enemy.Position
			local _condition_1 = (enemy:GetAttribute("XpReward"))
			if _condition_1 == nil then
				_condition_1 = 15
			end
			local xpReward = _condition_1
			local isBoss = enemy:GetAttribute("Behavior") == "boss"
			-- Detener inmediatamente impulsos físicos y anclar en el sitio
			local bodyVel = enemy:FindFirstChildOfClass("BodyVelocity")
			if bodyVel then
				bodyVel.Velocity = Vector3.new(0, 0, 0)
				bodyVel.MaxForce = Vector3.new(0, 0, 0)
			end
			local bodyGyro = enemy:FindFirstChildOfClass("BodyGyro")
			if bodyGyro then
				bodyGyro.MaxTorque = Vector3.new(0, 0, 0)
			end
			enemy.Anchored = true
			-- Generación de botín (Gemas / Cofres)
			if isBoss then
				spawnSupplyChest(deathPos)
				local _vector3 = Vector3.new(2, 0, 0)
				spawnExpGem(deathPos + _vector3, 150)
				local _vector3_1 = Vector3.new(-2, 0, 0)
				spawnMagnetItem(deathPos + _vector3_1)
			else
				spawnExpGem(deathPos, xpReward)
			end
			-- Dar 0.5 segundos para que el cliente reproduzca el hundimiento / desintegración y limpiar
			task.delay(0.5, function()
				if enemy and enemy.Parent then
					enemy:Destroy()
				end
			end)
		end
	end
end)
-- 7. Manejo de recolección de gemas, cofres e imán
collectGemEvent.OnServerEvent:Connect(function(player, itemArg)
	if isGamePaused then
		return nil
	end
	local item = itemArg
	if item and item:IsDescendantOf(dropsFolder) and item:IsA("BasePart") then
		local specialType = item:GetAttribute("IsSpecialDrop")
		-- Efecto Imán / Vórtice
		if specialType == "magnet" then
			item:Destroy()
			local char = player.Character
			local _result = char
			if _result ~= nil then
				_result = _result:FindFirstChild("HumanoidRootPart")
			end
			local hrp = _result
			if hrp then
				-- Atraer instantáneamente todas las gemas del mapa hacia el jugador
				for _, gem in dropsFolder:GetChildren() do
					if gem:IsA("BasePart") and gem:GetAttribute("ExpValue") ~= nil then
						gem.Position = hrp.Position
					end
				end
			end
			return nil
		end
		-- Efecto Cofre de Suministros (Nivel gratis directo)
		if specialType == "chest" then
			item:Destroy()
			local leaderstats = player:FindFirstChild("leaderstats")
			if leaderstats then
				local levelStat = leaderstats:FindFirstChild("Level")
				if levelStat then
					levelStat.Value += 1
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
			return nil
		end
		-- Gema normal
		local _condition = (item:GetAttribute("ExpValue"))
		if _condition == nil then
			_condition = 10
		end
		local exp = _condition
		item:Destroy()
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
-- 8. Configuración de estadísticas y estado inicial del jugador
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
	local orbitsLvl = Instance.new("IntValue")
	orbitsLvl.Name = "chrono_orbits"
	orbitsLvl.Value = 0
	orbitsLvl.Parent = inventory
	local novaLvl = Instance.new("IntValue")
	novaLvl.Name = "nova_beam"
	novaLvl.Value = 0
	novaLvl.Parent = inventory
	local flareLvl = Instance.new("IntValue")
	flareLvl.Name = "aether_flare"
	flareLvl.Value = 0
	flareLvl.Parent = inventory
	local mineLvl = Instance.new("IntValue")
	mineLvl.Name = "vortex_mine"
	mineLvl.Value = 0
	mineLvl.Parent = inventory
	local maxHpBonus = Instance.new("NumberValue")
	maxHpBonus.Name = "max_hp_bonus"
	maxHpBonus.Value = 0
	maxHpBonus.Parent = inventory
	local moveSpeedBonus = Instance.new("NumberValue")
	moveSpeedBonus.Name = "speed_bonus"
	moveSpeedBonus.Value = 0
	moveSpeedBonus.Parent = inventory
	local magnetBonus = Instance.new("NumberValue")
	magnetBonus.Name = "magnet_bonus"
	magnetBonus.Value = 0
	magnetBonus.Parent = inventory
	local areaBonus = Instance.new("NumberValue")
	areaBonus.Name = "area_bonus"
	areaBonus.Value = 0
	areaBonus.Parent = inventory
end)
-- 9. Manejo de elección de mejoras y REANUDACIÓN
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
		elseif upgradeId == "chrono_orbits" then
			local val = inventory:FindFirstChild("chrono_orbits")
			if val then
				val.Value += 1
				print(`[Upgrade] {player.Name} mejoró/desbloqueó Órbitas Crono a Nivel {val.Value}`)
			end
		elseif upgradeId == "nova_beam" then
			local val = inventory:FindFirstChild("nova_beam")
			if val then
				val.Value += 1
				print(`[Upgrade] {player.Name} mejoró/desbloqueó Rayo Nova a Nivel {val.Value}`)
			end
		elseif upgradeId == "aether_flare" then
			local val = inventory:FindFirstChild("aether_flare")
			if val then
				val.Value += 1
				print(`[Upgrade] {player.Name} mejoró/desbloqueó Fulgor de Éter a Nivel {val.Value}`)
			end
		elseif upgradeId == "vortex_mine" then
			local val = inventory:FindFirstChild("vortex_mine")
			if val then
				val.Value += 1
				print(`[Upgrade] {player.Name} mejoró/desbloqueó Minas de Vórtice a Nivel {val.Value}`)
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
		elseif upgradeId == "magnet_range" then
			local val = inventory:FindFirstChild("magnet_bonus")
			if val then
				val.Value += 8
			end
		elseif upgradeId == "area_size" then
			local val = inventory:FindFirstChild("area_bonus")
			if val then
				val.Value += 0.25
			end
		end
	end
	isGamePaused = false
	print("[r-survivors] Juego reanudado.")
end)
-- Manejo de acciones del Debug Panel
local createEnemyInstance, triggerZaWarudo
debugActionEvent.OnServerEvent:Connect(function(player, actionArg)
	local action = actionArg
	local char = player.Character
	local _result = char
	if _result ~= nil then
		_result = _result:FindFirstChild("HumanoidRootPart")
	end
	local hrp = _result
	if action == "instant_level_up" then
		local leaderstats = player:FindFirstChild("leaderstats")
		local _result_1 = leaderstats
		if _result_1 ~= nil then
			_result_1 = _result_1:FindFirstChild("Level")
		end
		local lvlStat = _result_1
		if lvlStat then
			lvlStat.Value += 1
			isGamePaused = true
			for _, enemy in enemiesFolder:GetChildren() do
				if enemy:IsA("BasePart") then
					local vel = enemy:FindFirstChildOfClass("BodyVelocity")
					if vel then
						vel.Velocity = Vector3.new(0, 0, 0)
					end
				end
			end
			levelUpEvent:FireClient(player, lvlStat.Value)
		end
	elseif action == "spawn_boss" then
		bossAlertEvent:FireAllClients("¡BOSS INVOCADO POR DEBUG!")
		local bossPart = createEnemyInstance(ENEMY_TYPES.overlord_boss, 9999)
		if hrp then
			local _position = hrp.Position
			local _vector3 = Vector3.new(0, 4, 25)
			bossPart.Position = _position + _vector3
		end
	elseif action == "spawn_chest" then
		if hrp then
			local _position = hrp.Position
			local _vector3 = Vector3.new(4, 0, 4)
			spawnSupplyChest(_position + _vector3)
		end
	elseif action == "spawn_magnet" then
		if hrp then
			local _position = hrp.Position
			local _vector3 = Vector3.new(-4, 0, 4)
			spawnMagnetItem(_position + _vector3)
		end
	elseif action == "kill_all_enemies" then
		for _, enemy in enemiesFolder:GetChildren() do
			if enemy:IsA("BasePart") then
				spawnExpGem(enemy.Position, 15)
				enemy:Destroy()
			end
		end
	elseif action == "heal_player" then
		local _hum = char
		if _hum ~= nil then
			_hum = _hum:FindFirstChildOfClass("Humanoid")
		end
		local hum = _hum
		if hum then
			hum.Health = hum.MaxHealth
		end
	elseif action == "add_time" then
		gameElapsedTime += 60
		print(`[Debug] Tiempo adelantado a {gameElapsedTime}s`)
	elseif action == "unlock_all_weapons" then
		local inventory = player:FindFirstChild("Inventory")
		if inventory then
			local b = inventory:FindFirstChild("void_boomerang")
			if b then
				b.Value = 3
			end
			local p = inventory:FindFirstChild("plasma_blaster")
			if p then
				p.Value = 2
			end
			local o = inventory:FindFirstChild("chrono_orbits")
			if o then
				o.Value = 3
			end
			local n = inventory:FindFirstChild("nova_beam")
			if n then
				n.Value = 3
			end
			local f = inventory:FindFirstChild("aether_flare")
			if f then
				f.Value = 3
			end
			local m = inventory:FindFirstChild("vortex_mine")
			if m then
				m.Value = 3
			end
			print(`[Debug] {player.Name} ha desbloqueado las 6 armas a nivel máximo`)
		end
	elseif action == "give_plasma" then
		local inventory = player:FindFirstChild("Inventory")
		local _result_1 = inventory
		if _result_1 ~= nil then
			_result_1 = _result_1:FindFirstChild("plasma_blaster")
		end
		local p = _result_1
		if p then
			p.Value = math.min(2, p.Value + 1)
		end
	elseif action == "give_orbits" then
		local inventory = player:FindFirstChild("Inventory")
		local _result_1 = inventory
		if _result_1 ~= nil then
			_result_1 = _result_1:FindFirstChild("chrono_orbits")
		end
		local o = _result_1
		if o then
			o.Value = math.min(3, o.Value + 1)
		end
	elseif action == "give_nova" then
		local inventory = player:FindFirstChild("Inventory")
		local _result_1 = inventory
		if _result_1 ~= nil then
			_result_1 = _result_1:FindFirstChild("nova_beam")
		end
		local n = _result_1
		if n then
			n.Value = math.min(3, n.Value + 1)
		end
	elseif action == "give_flare" then
		local inventory = player:FindFirstChild("Inventory")
		local _result_1 = inventory
		if _result_1 ~= nil then
			_result_1 = _result_1:FindFirstChild("aether_flare")
		end
		local f = _result_1
		if f then
			f.Value = math.min(3, f.Value + 1)
		end
	elseif action == "give_mines" then
		local inventory = player:FindFirstChild("Inventory")
		local _result_1 = inventory
		if _result_1 ~= nil then
			_result_1 = _result_1:FindFirstChild("vortex_mine")
		end
		local m = _result_1
		if m then
			m.Value = math.min(3, m.Value + 1)
		end
	elseif action == "give_speed" then
		local _hum = char
		if _hum ~= nil then
			_hum = _hum:FindFirstChildOfClass("Humanoid")
		end
		local hum = _hum
		if hum then
			hum.WalkSpeed += 6
		end
	elseif action == "give_magnet" then
		local inventory = player:FindFirstChild("Inventory")
		local _result_1 = inventory
		if _result_1 ~= nil then
			_result_1 = _result_1:FindFirstChild("magnet_bonus")
		end
		local m = _result_1
		if m then
			m.Value += 8
		end
		local _exp = player.Name
		local _result_2 = m
		if _result_2 ~= nil then
			_result_2 = _result_2.Value
		end
		local _condition = _result_2
		if _condition == nil then
			_condition = 0
		end
		print(`[Debug] {_exp} aumentó radio de imán a +{_condition}`)
	elseif action == "give_area" then
		local inventory = player:FindFirstChild("Inventory")
		local _result_1 = inventory
		if _result_1 ~= nil then
			_result_1 = _result_1:FindFirstChild("area_bonus")
		end
		local a = _result_1
		if a then
			a.Value += 0.25
		end
		local _exp = player.Name
		local _result_2 = a
		if _result_2 ~= nil then
			_result_2 = _result_2.Value
		end
		local _condition = _result_2
		if _condition == nil then
			_condition = 0
		end
		print(`[Debug] {_exp} aumentó área de efecto a +{(_condition * 100)}%`)
	elseif action == "trigger_zawarudo" then
		triggerZaWarudo(player)
	end
end)
-- Función central de Za Warudo (Estasis Temporal)
local isZaWarudoActive = false
function triggerZaWarudo(player)
	if isZaWarudoActive or isGamePaused then
		return nil
	end
	isZaWarudoActive = true
	print(`[ZA WARUDO] Activado por {player.Name}! Tiempo congelado durante 4.0s`)
	-- Notificar a todos los clientes para efectos de pantalla y audio
	zaWarudoEvent:FireAllClients(4.0)
	-- Congelar velocidades de todos los enemigos y proyectiles
	for _, enemy in enemiesFolder:GetChildren() do
		if enemy:IsA("BasePart") then
			local bodyVel = enemy:FindFirstChildOfClass("BodyVelocity")
			if bodyVel then
				bodyVel.Velocity = Vector3.new(0, 0, 0)
			end
		end
	end
	for _, proj in enemyProjectilesFolder:GetChildren() do
		if proj:IsA("BasePart") then
			local bodyVel = proj:FindFirstChildOfClass("BodyVelocity")
			if bodyVel then
				bodyVel.Velocity = Vector3.new(0, 0, 0)
			end
		end
	end
	task.delay(4.0, function()
		isZaWarudoActive = false
		print("[ZA WARUDO] El tiempo vuelve a fluir...")
	end)
end
-- Escuchar activación manual de Za Warudo desde el cliente
zaWarudoEvent.OnServerEvent:Connect(function(player)
	triggerZaWarudo(player)
end)
-- Manejo de reinicio completo de partida
restartGameEvent.OnServerEvent:Connect(function(player)
	print(`[r-survivors] Reiniciando partida por completo para {player.Name}...`)
	-- 1. Limpiar todos los enemigos activos
	for _, enemy in enemiesFolder:GetChildren() do
		enemy:Destroy()
	end
	-- 2. Limpiar todos los proyectiles enemigos
	for _, proj in enemyProjectilesFolder:GetChildren() do
		proj:Destroy()
	end
	-- 3. Limpiar todas las gemas y drops del mapa
	for _, drop in dropsFolder:GetChildren() do
		drop:Destroy()
	end
	-- 4. Resetear tiempo de juego y banderas
	gameElapsedTime = 0
	bossSpawned = false
	boss1Spawned = false
	boss2Spawned = false
	boss3Spawned = false
	isGamePaused = false
	-- 5. Resetear stats e inventario del jugador
	local leaderstats = player:FindFirstChild("leaderstats")
	if leaderstats then
		local lvl = leaderstats:FindFirstChild("Level")
		if lvl then
			lvl.Value = 1
		end
		local exp = leaderstats:FindFirstChild("EXP")
		if exp then
			exp.Value = 0
		end
	end
	local inventory = player:FindFirstChild("Inventory")
	if inventory then
		local b = inventory:FindFirstChild("void_boomerang")
		if b then
			b.Value = 1
		end
		local p = inventory:FindFirstChild("plasma_blaster")
		if p then
			p.Value = 0
		end
		local o = inventory:FindFirstChild("chrono_orbits")
		if o then
			o.Value = 0
		end
		local n = inventory:FindFirstChild("nova_beam")
		if n then
			n.Value = 0
		end
		local f = inventory:FindFirstChild("aether_flare")
		if f then
			f.Value = 0
		end
		local m = inventory:FindFirstChild("vortex_mine")
		if m then
			m.Value = 0
		end
		local sp = inventory:FindFirstChild("speed_bonus")
		if sp then
			sp.Value = 0
		end
		local hp = inventory:FindFirstChild("max_hp_bonus")
		if hp then
			hp.Value = 0
		end
		local mg = inventory:FindFirstChild("magnet_bonus")
		if mg then
			mg.Value = 0
		end
		local ar = inventory:FindFirstChild("area_bonus")
		if ar then
			ar.Value = 0
		end
	end
	-- 6. Restaurar personaje
	local char = player.Character
	local _hum = char
	if _hum ~= nil then
		_hum = _hum:FindFirstChildOfClass("Humanoid")
	end
	local hum = _hum
	if hum then
		hum.MaxHealth = 100
		hum.Health = 100
		hum.WalkSpeed = 16
	end
	local _result = char
	if _result ~= nil then
		_result = _result:FindFirstChild("HumanoidRootPart")
	end
	local hrp = _result
	if hrp then
		hrp.CFrame = CFrame.new(0, 3, 0)
	end
end)
-- 10. Función para generar modelos visuales geométricos estilizados (Placeholders cilíndricos de alto rendimiento)
local function createPlaceholderVisual(enemy, config)
	local visual = Instance.new("Model")
	visual.Name = "VisualModel"
	local isSkimmer = config.id == "skimmer" or config.behavior == "fast"
	local isShooter = config.behavior == "shooter"
	local isBoss = config.isBoss == true
	local isTank = config.behavior == "tank"
	-- 1. Cuerpo Cilíndrico Principal (Vertical en eje Y)
	local body = Instance.new("Part")
	body.Name = "Body"
	body.Size = Vector3.new(config.size.X, config.size.Y, config.size.X)
	body.Color = config.color
	body.Material = Enum.Material.SmoothPlastic
	body.CanCollide = false
	body.Anchored = false
	body.Massless = true
	body.CFrame = enemy.CFrame
	body.Parent = visual
	local mesh = Instance.new("CylinderMesh")
	mesh.Parent = body
	local weld = Instance.new("WeldConstraint")
	weld.Part0 = enemy
	weld.Part1 = body
	weld.Parent = body
	-- 2. Elementos distintivos y acentos Neón por tipo de enemigo
	if isBoss then
		-- Corona / Anillo de Poder de Jefe Cósmico
		local crown = Instance.new("Part")
		crown.Name = "BossCrown"
		crown.Size = Vector3.new(config.size.X * 1.25, 0.7, config.size.X * 1.25)
		crown.Color = Color3.new(1.0, 0.25, 0.85)
		crown.Material = Enum.Material.Neon
		crown.CanCollide = false
		crown.Anchored = false
		crown.Massless = true
		local _cFrame = body.CFrame
		local _vector3 = Vector3.new(0, config.size.Y * 0.45, 0)
		crown.CFrame = _cFrame + _vector3
		crown.Parent = visual
		local crownMesh = Instance.new("CylinderMesh")
		crownMesh.Parent = crown
		local crownWeld = Instance.new("WeldConstraint")
		crownWeld.Part0 = body
		crownWeld.Part1 = crown
		crownWeld.Parent = crown
		local light = Instance.new("PointLight")
		light.Color = crown.Color
		light.Range = 22
		light.Brightness = 2.5
		light.Parent = crown
	elseif isSkimmer then
		-- Alas Neón de Planeador Rápido Aéreo
		local wingL = Instance.new("Part")
		wingL.Name = "WingL"
		wingL.Size = Vector3.new(1.6, 0.25, 2.0)
		wingL.Color = Color3.new(1.0, 0.85, 0.15)
		wingL.Material = Enum.Material.Neon
		wingL.CanCollide = false
		wingL.Anchored = false
		wingL.Massless = true
		local _cFrame = body.CFrame
		local _cFrame_1 = CFrame.new(-config.size.X * 0.65, 0, 0)
		local _arg0 = CFrame.Angles(0, 0, math.rad(-20))
		wingL.CFrame = _cFrame * _cFrame_1 * _arg0
		wingL.Parent = visual
		local weldL = Instance.new("WeldConstraint")
		weldL.Part0 = body
		weldL.Part1 = wingL
		weldL.Parent = wingL
		local wingR = Instance.new("Part")
		wingR.Name = "WingR"
		wingR.Size = Vector3.new(1.6, 0.25, 2.0)
		wingR.Color = Color3.new(1.0, 0.85, 0.15)
		wingR.Material = Enum.Material.Neon
		wingR.CanCollide = false
		wingR.Anchored = false
		wingR.Massless = true
		local _cFrame_2 = body.CFrame
		local _cFrame_3 = CFrame.new(config.size.X * 0.65, 0, 0)
		local _arg0_1 = CFrame.Angles(0, 0, math.rad(20))
		wingR.CFrame = _cFrame_2 * _cFrame_3 * _arg0_1
		wingR.Parent = visual
		local weldR = Instance.new("WeldConstraint")
		weldR.Part0 = body
		weldR.Part1 = wingR
		weldR.Parent = wingR
	elseif isShooter then
		-- Núcleo / Ojo emisor frontal
		local eye = Instance.new("Part")
		eye.Name = "ShooterEye"
		eye.Size = Vector3.new(0.9, 0.9, 0.9)
		eye.Color = Color3.new(0.1, 0.95, 1.0)
		eye.Material = Enum.Material.Neon
		eye.CanCollide = false
		eye.Anchored = false
		eye.Massless = true
		local _cFrame = body.CFrame
		local _vector3 = Vector3.new(0, config.size.Y * 0.25, -config.size.X * 0.45)
		eye.CFrame = _cFrame + _vector3
		eye.Parent = visual
		local eyeMesh = Instance.new("SpecialMesh")
		eyeMesh.MeshType = Enum.MeshType.Sphere
		eyeMesh.Parent = eye
		local eyeWeld = Instance.new("WeldConstraint")
		eyeWeld.Part0 = body
		eyeWeld.Part1 = eye
		eyeWeld.Parent = eye
	elseif isTank then
		-- Anillo de blindaje reforzado pesado
		local armor = Instance.new("Part")
		armor.Name = "ArmorBand"
		armor.Size = Vector3.new(config.size.X * 1.12, 1.4, config.size.X * 1.12)
		armor.Color = Color3.new(0.12, 0.16, 0.14)
		armor.Material = Enum.Material.DiamondPlate
		armor.CanCollide = false
		armor.Anchored = false
		armor.Massless = true
		armor.CFrame = body.CFrame
		armor.Parent = visual
		local armorMesh = Instance.new("CylinderMesh")
		armorMesh.Parent = armor
		local armorWeld = Instance.new("WeldConstraint")
		armorWeld.Part0 = body
		armorWeld.Part1 = armor
		armorWeld.Parent = armor
	else
		-- Visor frontal agresivo (Crawler)
		local visor = Instance.new("Part")
		visor.Name = "Visor"
		visor.Size = Vector3.new(config.size.X * 0.65, 0.45, 0.45)
		visor.Color = Color3.new(1.0, 0.25, 0.15)
		visor.Material = Enum.Material.Neon
		visor.CanCollide = false
		visor.Anchored = false
		visor.Massless = true
		local _cFrame = body.CFrame
		local _vector3 = Vector3.new(0, config.size.Y * 0.25, -config.size.X * 0.45)
		visor.CFrame = _cFrame + _vector3
		visor.Parent = visual
		local visorWeld = Instance.new("WeldConstraint")
		visorWeld.Part0 = body
		visorWeld.Part1 = visor
		visorWeld.Parent = visor
	end
	visual.PrimaryPart = body
	visual.Parent = enemy
	return visual
end
-- 10. Función para crear cualquier enemigo de ENEMY_TYPES con soporte de Cilindros Fluidos
function createEnemyInstance(config, index)
	local enemy = Instance.new("Part")
	enemy.Name = `{config.name}_{index}`
	enemy.Size = config.size
	enemy.Color = config.color
	enemy.Material = config.material
	enemy.Anchored = false
	enemy.CanCollide = false
	enemy.CanTouch = true
	enemy.CanQuery = true
	enemy.Transparency = 1
	enemy.CustomPhysicalProperties = PhysicalProperties.new(0.01, 0, 0, 100, 100)
	pcall(function()
		enemy:SetNetworkOwner(nil)
	end)
	local angle = math.random() * math.pi * 2
	local dist = 42 + math.random() * 22
	local isFlying = config.behavior == "fast" or config.id == "skimmer"
	local floatY = if isFlying then 2.5 else 0
	local spawnY = config.size.Y / 2 + 0.1 + floatY
	enemy.Position = Vector3.new(math.cos(angle) * dist, spawnY, math.sin(angle) * dist)
	-- Crear modelo visual cilíndrico estilizado de alto rendimiento
	createPlaceholderVisual(enemy, config)
	enemy:SetAttribute("HP", config.hp)
	enemy:SetAttribute("MaxHP", config.hp)
	enemy:SetAttribute("Speed", config.speed)
	enemy:SetAttribute("Damage", config.damage)
	enemy:SetAttribute("XpReward", config.xpValue)
	enemy:SetAttribute("Behavior", config.behavior)
	enemy:SetAttribute("IsBoss", config.isBoss == true)
	enemy:SetAttribute("EnemyName", config.name)
	enemy:SetAttribute("InKnockback", false)
	enemy:SetAttribute("IsDead", false)
	enemy:SetAttribute("LastShotTime", 0)
	enemy.Parent = enemiesFolder
	local massMultiplier = math.max(1, enemy:GetMass())
	-- MaxForce.Y muy alto con Velocity.Y = 0 sostiene al enemigo en levitación horizontal perfecta
	local bodyVelocity = Instance.new("BodyVelocity")
	bodyVelocity.MaxForce = Vector3.new(massMultiplier * 25000, massMultiplier * 100000, massMultiplier * 25000)
	bodyVelocity.Velocity = Vector3.new(0, 0, 0)
	bodyVelocity.Parent = enemy
	-- MaxTorque en los 3 ejes garantiza verticalidad 100% rígida (cero cabeceo ni alabeo)
	local bodyGyro = Instance.new("BodyGyro")
	bodyGyro.MaxTorque = Vector3.new(1e6, 1e6, 1e6)
	bodyGyro.P = 50000
	bodyGyro.D = 1000
	bodyGyro.CFrame = enemy.CFrame
	bodyGyro.Parent = enemy
	local lastPlayerDamageTime = 0
	enemy.Touched:Connect(function(hitPart)
		if isGamePaused then
			return nil
		end
		if enemy:GetAttribute("IsDead") == true then
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
-- 11. Spawner inteligente con escalado de oleadas y BOSS EVENT
task.spawn(function()
	local enemyIndex = 0
	while true do
		task.wait(1.5)
		if isGamePaused then
			continue
		end
		gameElapsedTime += 1.5
		-- BOSS EVENT 1: Minuto 3 (180 segundos) - Coloso de Obsidiana
		if gameElapsedTime >= 180 and not boss1Spawned then
			boss1Spawned = true
			bossSpawned = true
			print("[BOSS EVENT] ¡El Coloso de Obsidiana ha despertado!")
			bossAlertEvent:FireAllClients("¡COLOSO DE OBSIDIANA HA DESPERTADO!")
			local bossPart = createEnemyInstance(ENEMY_TYPES.obsidian_colossus or ENEMY_TYPES.overlord_boss, 991)
			bossPart.Position = Vector3.new(0, 4.5, 60)
		end
		-- BOSS EVENT 2: Minuto 6 (360 segundos) - Cosechador del Vacío
		if gameElapsedTime >= 360 and not boss2Spawned then
			boss2Spawned = true
			print("[BOSS EVENT] ¡El Cosechador del Vacío se materializa!")
			bossAlertEvent:FireAllClients("¡COSECHADOR DEL VACÍO SE MATERIALIZA!")
			local bossPart = createEnemyInstance(ENEMY_TYPES.void_harvester, 992)
			bossPart.Position = Vector3.new(50, 4.5, 0)
		end
		-- BOSS EVENT 3: Minuto 9 (540 segundos) - Soberano del Éter
		if gameElapsedTime >= 540 and not boss3Spawned then
			boss3Spawned = true
			print("[BOSS EVENT] ¡El Soberano del Éter desciende sobre la arena!")
			bossAlertEvent:FireAllClients("¡SOBERANO DEL ÉTER DESCIENDE!")
			local bossPart = createEnemyInstance(ENEMY_TYPES.aether_sovereign, 993)
			bossPart.Position = Vector3.new(0, 4.5, -60)
		end
		local currentCount = #enemiesFolder:GetChildren()
		local maxCapacity = math.min(50, 20 + math.floor(gameElapsedTime / 20) * 5)
		if currentCount < maxCapacity then
			enemyIndex += 1
			local chosenConfig = ENEMY_TYPES.crawler
			local roll = math.random()
			if gameElapsedTime > 60 and roll < 0.15 then
				chosenConfig = ENEMY_TYPES.brute
			elseif gameElapsedTime > 35 and roll < 0.35 then
				chosenConfig = ENEMY_TYPES.turret
			elseif gameElapsedTime > 15 and roll < 0.6 then
				chosenConfig = ENEMY_TYPES.skimmer
			else
				chosenConfig = ENEMY_TYPES.crawler
			end
			createEnemyInstance(chosenConfig, enemyIndex)
		end
	end
end)
-- 12. IA de comportamiento por arquetipo (Melee, Fast, Tank, Shooter, Boss)
local fireEnemyProjectile
RunService.Heartbeat:Connect(function()
	if isGamePaused or isZaWarudoActive then
		for _, enemy in enemiesFolder:GetChildren() do
			if enemy:IsA("BasePart") then
				local bodyVel = enemy:FindFirstChildOfClass("BodyVelocity")
				if bodyVel then
					bodyVel.Velocity = Vector3.new(0, 0, 0)
				end
			end
		end
		for _, proj in enemyProjectilesFolder:GetChildren() do
			if proj:IsA("BasePart") then
				local bodyVel = proj:FindFirstChildOfClass("BodyVelocity")
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
		if not enemy:IsA("BasePart") then
			continue
		end
		local _condition = enemy:GetAttribute("IsDead") == true
		if not _condition then
			local _condition_1 = enemy:GetAttribute("HP")
			if _condition_1 == nil then
				_condition_1 = 0
			end
			_condition = _condition_1 <= 0
		end
		if _condition then
			continue
		end
		if enemy:GetAttribute("InKnockback") == true then
			continue
		end
		local bodyVel = enemy:FindFirstChildOfClass("BodyVelocity")
		if not bodyVel then
			continue
		end
		local behavior = enemy:GetAttribute("Behavior")
		local _condition_1 = (enemy:GetAttribute("Speed"))
		if _condition_1 == nil then
			_condition_1 = 8.0
		end
		local baseSpeed = _condition_1
		local closestDist = 99999
		local targetPos = nil
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
				end
			end
		end
		if targetPos then
			local _targetPos = targetPos
			local _position = enemy.Position
			local dir = _targetPos - _position
			local dirHorizontal = Vector3.new(dir.X, 0, dir.Z).Unit
			-- Daño por contacto físico/cercanía directa al jugador
			local enemyRadius = enemy.Size.X / 2
			if closestDist <= enemyRadius + 1.8 then
				local _condition_2 = (enemy:GetAttribute("LastContactDamage"))
				if _condition_2 == nil then
					_condition_2 = 0
				end
				local lastContact = _condition_2
				if currentTime - lastContact >= 0.8 then
					enemy:SetAttribute("LastContactDamage", currentTime)
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
							local _position_1 = hrp.Position
							local _position_2 = enemy.Position
							if (_position_1 - _position_2).Magnitude <= enemyRadius + 2.0 then
								local _condition_3 = (enemy:GetAttribute("Damage"))
								if _condition_3 == nil then
									_condition_3 = 10
								end
								hum:TakeDamage(_condition_3)
							end
						end
					end
				end
			end
			if behavior == "boss" then
				-- BOSS: Marcha imparable hacia el jugador + ráfaga de 3 proyectiles
				bodyVel.Velocity = Vector3.new(dirHorizontal.X * baseSpeed, 0, dirHorizontal.Z * baseSpeed)
				local _condition_2 = (enemy:GetAttribute("LastShotTime"))
				if _condition_2 == nil then
					_condition_2 = 0
				end
				local lastShot = _condition_2
				if currentTime - lastShot >= 2.5 then
					enemy:SetAttribute("LastShotTime", currentTime)
					-- Ráfaga en trío
					fireEnemyProjectile(enemy.Position, targetPos, 18)
					task.delay(0.2, function()
						local _exp = enemy.Position
						local _targetPos_1 = targetPos
						local _vector3 = Vector3.new(4, 0, 4)
						return fireEnemyProjectile(_exp, _targetPos_1 + _vector3, 18)
					end)
					task.delay(0.4, function()
						local _exp = enemy.Position
						local _targetPos_1 = targetPos
						local _vector3 = Vector3.new(-4, 0, -4)
						return fireEnemyProjectile(_exp, _targetPos_1 + _vector3, 18)
					end)
				end
			elseif behavior == "shooter" then
				if closestDist < 18 then
					bodyVel.Velocity = Vector3.new(-dirHorizontal.X * baseSpeed * 0.8, 0, -dirHorizontal.Z * baseSpeed * 0.8)
				elseif closestDist > 28 then
					bodyVel.Velocity = Vector3.new(dirHorizontal.X * baseSpeed, 0, dirHorizontal.Z * baseSpeed)
				else
					local perpDir = Vector3.new(-dirHorizontal.Z, 0, dirHorizontal.X)
					bodyVel.Velocity = Vector3.new(perpDir.X * baseSpeed * 0.6, 0, perpDir.Z * baseSpeed * 0.6)
				end
				local _condition_2 = (enemy:GetAttribute("LastShotTime"))
				if _condition_2 == nil then
					_condition_2 = 0
				end
				local lastShot = _condition_2
				if currentTime - lastShot >= 3.0 then
					enemy:SetAttribute("LastShotTime", currentTime)
					fireEnemyProjectile(enemy.Position, targetPos, 14)
				end
			else
				bodyVel.Velocity = Vector3.new(dirHorizontal.X * baseSpeed, 0, dirHorizontal.Z * baseSpeed)
			end
			-- Orientar suavemente con BodyGyro manteniendo pitch y roll rígidamente en 0
			local bodyGyro = enemy:FindFirstChildOfClass("BodyGyro")
			if bodyGyro then
				bodyGyro.CFrame = CFrame.lookAt(Vector3.zero, dirHorizontal)
			end
		else
			local _vector3 = Vector3.new(0, 0, 0)
			local _position = enemy.Position
			local dirToCenter = (_vector3 - _position).Unit
			local dirHoriz = Vector3.new(dirToCenter.X, 0, dirToCenter.Z).Unit
			bodyVel.Velocity = Vector3.new(dirHoriz.X * 5, 0, dirHoriz.Z * 5)
			local bodyGyro = enemy:FindFirstChildOfClass("BodyGyro")
			if bodyGyro then
				bodyGyro.CFrame = CFrame.lookAt(Vector3.zero, dirHoriz)
			end
		end
	end
end)
-- 13. Proyectiles hostiles de los Centinelas y Boss
function fireEnemyProjectile(startPos, targetPos, damage)
	local proj = Instance.new("Part")
	proj.Name = "EnemyOrb"
	proj.Shape = Enum.PartType.Ball
	proj.Size = Vector3.new(1.4, 1.4, 1.4)
	proj.Color = Color3.new(1.0, 0.15, 0.2)
	proj.Material = Enum.Material.Neon
	proj.CanCollide = false
	proj.Anchored = false
	local _startPos = startPos
	local _vector3 = Vector3.new(0, 2.0, 0)
	proj.Position = _startPos + _vector3
	proj.Parent = enemyProjectilesFolder
	local light = Instance.new("PointLight")
	light.Color = proj.Color
	light.Range = 8
	light.Brightness = 2
	light.Parent = proj
	local _targetPos = targetPos
	local _position = proj.Position
	local dir = (_targetPos - _position).Unit
	local bodyVel = Instance.new("BodyVelocity")
	bodyVel.MaxForce = Vector3.new(10000, 10000, 10000)
	bodyVel.Velocity = dir * 28
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
