-- Compiled with roblox-ts v3.0.0
local TS = require(game:GetService("ReplicatedStorage"):WaitForChild("rbxts_include"):WaitForChild("RuntimeLib"))
local _services = TS.import(script, game:GetService("ReplicatedStorage"), "rbxts_include", "node_modules", "@rbxts", "services")
local Debris = _services.Debris
local Players = _services.Players
local RunService = _services.RunService
local TweenService = _services.TweenService
local Workspace = _services.Workspace
local WEAPONS = TS.import(script, game:GetService("ReplicatedStorage"), "TS", "weapons").WEAPONS
print("[r-survivors] Servidor inicializado con éxito.")
print(`[r-survivors] Armas registradas: {WEAPONS.void_boomerang.name}, {WEAPONS.plasma_blaster.name}`)
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
-- 3. RemoteEvents para Daño y Recogida
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
	gem.Color = Color3.new(0.2, 0.9, 0.35)
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
		-- Retroceso físico breve (knockback)
		if knockbackDir then
			local bodyVel = enemy:FindFirstChildOfClass("BodyVelocity")
			if bodyVel then
				local _exp = knockbackDir * 18
				local _vector3 = Vector3.new(0, 4, 0)
				bodyVel.Velocity = _exp + _vector3
				enemy:SetAttribute("InKnockback", true)
				task.delay(0.25, function()
					if enemy and enemy.Parent then
						enemy:SetAttribute("InKnockback", false)
					end
				end)
			end
		end
		-- Comprobar muerte del enemigo
		if newHp <= 0 then
			local deathPos = enemy.Position
			spawnExpGem(deathPos, 15)
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
				-- Cada nivel requiere: nivel * 50 exp
				local nextLevelReq = levelStat.Value * 50
				if expStat.Value >= nextLevelReq then
					expStat.Value -= nextLevelReq
					levelStat.Value += 1
					print(`[r-survivors] ¡{player.Name} ha subido al Nivel {levelStat.Value}!`)
				end
			end
		end
	end
end)
-- 7. Configuración de estadísticas de jugador (leaderstats)
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
end)
-- 8. Spawner continuo de enemigos (Crawler)
task.spawn(function()
	local enemyCount = 0
	while true do
		task.wait(2.0)
		if #enemiesFolder:GetChildren() < 30 then
			enemyCount += 1
			local dummy = Instance.new("Part")
			dummy.Name = `Crawler_{enemyCount}`
			dummy.Size = Vector3.new(3, 3, 3)
			dummy.Color = Color3.new(0.95, 0.25, 0.2)
			dummy.Material = Enum.Material.Neon
			dummy.Anchored = false
			dummy.CanCollide = true
			-- Generar en círculo exterior alrededor de la arena
			local angle = math.random() * math.pi * 2
			local dist = 40 + math.random() * 20
			dummy.Position = Vector3.new(math.cos(angle) * dist, 3, math.sin(angle) * dist)
			dummy:SetAttribute("HP", 40)
			dummy:SetAttribute("MaxHP", 40)
			dummy:SetAttribute("InKnockback", false)
			dummy.Parent = enemiesFolder
			local bodyVelocity = Instance.new("BodyVelocity")
			bodyVelocity.MaxForce = Vector3.new(5000, 0, 5000)
			bodyVelocity.Velocity = Vector3.new(0, 0, 0)
			bodyVelocity.Parent = dummy
			-- Daño al jugador por contacto con cooldown de invulnerabilidad
			local lastPlayerDamageTime = 0
			dummy.Touched:Connect(function(hitPart)
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
						hum:TakeDamage(10)
					end
				end
			end)
		end
	end
end)
-- 9. IA Activa de los enemigos: persegir al jugador vivo más cercano
RunService.Heartbeat:Connect(function()
	local allPlayers = Players:GetPlayers()
	for _, enemy in enemiesFolder:GetChildren() do
		if enemy:IsA("BasePart") and enemy:GetAttribute("InKnockback") ~= true then
			local bodyVel = enemy:FindFirstChildOfClass("BodyVelocity")
			if not bodyVel then
				continue
			end
			-- Buscar jugador más cercano
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
				local enemySpeed = 8.5
				bodyVel.Velocity = dirHorizontal * enemySpeed
			else
				-- Si no hay jugadores vivos, caminar al centro
				local _vector3 = Vector3.new(0, 0, 0)
				local _position = enemy.Position
				local dirToCenter = (_vector3 - _position).Unit
				bodyVel.Velocity = Vector3.new(dirToCenter.X * 5, 0, dirToCenter.Z * 5)
			end
		end
	end
end)
