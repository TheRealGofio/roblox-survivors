-- Compiled with roblox-ts v3.0.0
local TS = require(game:GetService("ReplicatedStorage"):WaitForChild("rbxts_include"):WaitForChild("RuntimeLib"))
local _services = TS.import(script, game:GetService("ReplicatedStorage"), "rbxts_include", "node_modules", "@rbxts", "services")
local Lighting = _services.Lighting
local Workspace = _services.Workspace
local EnvironmentManager = {}
do
	local _container = EnvironmentManager
	local function setupAtmosphere()
		-- 1. Configuración de Iluminación Cinematográfica Sci-Fi
		Lighting.Brightness = 2.0
		Lighting.ClockTime = 18.2
		Lighting.Ambient = Color3.new(0.18, 0.22, 0.32)
		Lighting.OutdoorAmbient = Color3.new(0.25, 0.2, 0.35)
		Lighting.ColorShift_Top = Color3.new(0.9, 0.55, 0.7)
		Lighting.ColorShift_Bottom = Color3.new(0.08, 0.12, 0.22)
		Lighting.FogColor = Color3.new(0.12, 0.14, 0.25)
		Lighting.FogStart = 60
		Lighting.FogEnd = 240
		-- Post-procesado (Bloom & Atmósfera)
		local bloom = Lighting:FindFirstChildOfClass("BloomEffect")
		if not bloom then
			bloom = Instance.new("BloomEffect")
			bloom.Intensity = 0.85
			bloom.Size = 24
			bloom.Threshold = 0.75
			bloom.Parent = Lighting
		end
		local colorCorrection = Lighting:FindFirstChildOfClass("ColorCorrectionEffect")
		if not colorCorrection then
			colorCorrection = Instance.new("ColorCorrectionEffect")
			colorCorrection.Contrast = 0.15
			colorCorrection.Saturation = 0.25
			colorCorrection.TintColor = Color3.new(0.96, 0.94, 1.0)
			colorCorrection.Parent = Lighting
		end
		local sky = Lighting:FindFirstChildOfClass("Sky")
		if not sky then
			sky = Instance.new("Sky")
			sky.CelestialBodiesShown = false
			sky.Parent = Lighting
		end
	end
	_container.setupAtmosphere = setupAtmosphere
	local function buildArenaEnvironment()
		local mapFolder = Workspace:FindFirstChild("MapEnvironment")
		if mapFolder then
			mapFolder:Destroy()
		end
		mapFolder = Instance.new("Folder")
		mapFolder.Name = "MapEnvironment"
		mapFolder.Parent = Workspace
		local arenaRadius = 140
		-- 1. Muro Perimetral de Cristales / Pilares de Energía
		local pilarCount = 36
		for i = 0, pilarCount - 1 do
			local angle = (i / pilarCount) * math.pi * 2
			local x = math.cos(angle) * arenaRadius
			local z = math.sin(angle) * arenaRadius
			-- Base de roca
			local rockBase = Instance.new("Part")
			rockBase.Name = `PerimeterRock_{i}`
			rockBase.Size = Vector3.new(12, 10 + math.sin(i * 3) * 4, 8)
			rockBase.CFrame = CFrame.new(Vector3.new(x, 4, z), Vector3.new(0, 4, 0))
			rockBase.Material = Enum.Material.Slate
			rockBase.Color = Color3.new(0.12, 0.14, 0.18)
			rockBase.Anchored = true
			rockBase.CanCollide = true
			rockBase.Parent = mapFolder
			-- Cristal Neón incrustado en el pilar
			local crystal = Instance.new("Part")
			crystal.Name = `PerimeterCrystal_{i}`
			crystal.Size = Vector3.new(2.5, 14, 2.5)
			crystal.CFrame = CFrame.new(Vector3.new(x, 10, z), Vector3.new(0, 10, 0))
			crystal.Material = Enum.Material.Neon
			-- Alternar entre turquesa cian y magenta alienígena
			crystal.Color = if i % 2 == 0 then Color3.new(0.1, 0.85, 0.9) else Color3.new(0.85, 0.2, 0.75)
			crystal.Anchored = true
			crystal.CanCollide = false
			crystal.Parent = mapFolder
			local light = Instance.new("PointLight")
			light.Color = crystal.Color
			light.Range = 18
			light.Brightness = 1.2
			light.Parent = crystal
		end
		-- 2. Coberturas y Monolitos Interiores (Obstáculos estratégicos)
		local obstacleCoords = { Vector3.new(35, 0, 35), Vector3.new(-35, 0, 35), Vector3.new(35, 0, -35), Vector3.new(-35, 0, -35), Vector3.new(65, 0, 0), Vector3.new(-65, 0, 0), Vector3.new(0, 0, 65), Vector3.new(0, 0, -65) }
		-- ▼ ReadonlyArray.forEach ▼
		local _callback = function(coord, idx)
			local monolith = Instance.new("Part")
			monolith.Name = `Monolith_{idx}`
			monolith.Size = Vector3.new(6, 12, 6)
			local _coord = coord
			local _vector3 = Vector3.new(0, 6, 0)
			monolith.Position = _coord + _vector3
			monolith.Material = Enum.Material.CorrodedMetal
			monolith.Color = Color3.new(0.15, 0.18, 0.22)
			monolith.Anchored = true
			monolith.CanCollide = true
			monolith.Parent = mapFolder
			-- Núcleo brillante en el monolito
			local core = Instance.new("Part")
			core.Name = `MonolithCore_{idx}`
			core.Size = Vector3.new(2, 6, 6.2)
			core.Position = monolith.Position
			core.Material = Enum.Material.Neon
			core.Color = Color3.new(0.1, 0.95, 0.7)
			core.Anchored = true
			core.CanCollide = false
			core.Parent = mapFolder
			local coreLight = Instance.new("PointLight")
			coreLight.Color = core.Color
			coreLight.Range = 22
			coreLight.Brightness = 2.0
			coreLight.Parent = core
		end
		for _k, _v in obstacleCoords do
			_callback(_v, _k - 1, obstacleCoords)
		end
		-- ▲ ReadonlyArray.forEach ▲
		-- 3. Suelo de la Arena Decorado
		local baseplate = Workspace:FindFirstChild("Baseplate")
		if baseplate then
			baseplate.Color = Color3.new(0.1, 0.12, 0.16)
			baseplate.Material = Enum.Material.DiamondPlate
		end
	end
	_container.buildArenaEnvironment = buildArenaEnvironment
end
return {
	EnvironmentManager = EnvironmentManager,
}
