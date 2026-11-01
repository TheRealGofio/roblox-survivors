-- Compiled with roblox-ts v3.0.0
local TS = require(game:GetService("ReplicatedStorage"):WaitForChild("rbxts_include"):WaitForChild("RuntimeLib"))
local _services = TS.import(script, game:GetService("ReplicatedStorage"), "rbxts_include", "node_modules", "@rbxts", "services")
local Lighting = _services.Lighting
local Workspace = _services.Workspace
local TACTICAL_PLATFORMS = TS.import(script, game:GetService("ReplicatedStorage"), "TS", "platforms").TACTICAL_PLATFORMS
local EnvironmentManager = {}
do
	local _container = EnvironmentManager
	local function setupAtmosphere()
		-- 1. Configuración de Iluminación Diurna, Acogedora y Nítida
		Lighting.Brightness = 2.5
		Lighting.ClockTime = 14.0
		Lighting.Ambient = Color3.new(0.55, 0.55, 0.55)
		Lighting.OutdoorAmbient = Color3.new(0.65, 0.65, 0.7)
		Lighting.ColorShift_Top = Color3.new(1.0, 0.98, 0.9)
		Lighting.ColorShift_Bottom = Color3.new(0.4, 0.45, 0.5)
		-- Desactivar niebla oscura que tapaba el cielo
		Lighting.FogStart = 1000
		Lighting.FogEnd = 3000
		Lighting.FogColor = Color3.new(0.8, 0.9, 1.0)
		-- Eliminar efectos de postprocesado con brillos y contrastes molestos
		local oldBloom = Lighting:FindFirstChildOfClass("BloomEffect")
		if oldBloom then
			oldBloom:Destroy()
		end
		local oldColorCorrection = Lighting:FindFirstChildOfClass("ColorCorrectionEffect")
		if oldColorCorrection then
			oldColorCorrection:Destroy()
		end
		local oldSky = Lighting:FindFirstChildOfClass("Sky")
		if oldSky then
			oldSky:Destroy()
		end
		local oldAtmosphere = Lighting:FindFirstChildOfClass("Atmosphere")
		if oldAtmosphere then
			oldAtmosphere:Destroy()
		end
		-- Atmósfera limpia y azul con cielo abierto natural
		local sky = Instance.new("Sky")
		sky.CelestialBodiesShown = true
		sky.Parent = Lighting
		local atmosphere = Instance.new("Atmosphere")
		atmosphere.Density = 0.25
		atmosphere.Offset = 0.25
		atmosphere.Haze = 0
		atmosphere.Color = Color3.new(0.8, 0.88, 1.0)
		atmosphere.Decay = Color3.new(0.5, 0.65, 0.85)
		atmosphere.Parent = Lighting
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
		-- 3. Suelo de la Arena Agradable
		local baseplate = Workspace:FindFirstChild("Baseplate")
		if baseplate then
			baseplate.Color = Color3.new(0.35, 0.4, 0.45)
			baseplate.Material = Enum.Material.Concrete
		end
		-- 4. Plataformas Tácticas Holográficas (Zonas de Buff)
		local platformsFolder = Instance.new("Folder")
		platformsFolder.Name = "TacticalPlatforms"
		platformsFolder.Parent = mapFolder
		-- ▼ ReadonlyArray.forEach ▼
		local _callback_1 = function(plat)
			-- Disco del suelo holográfico
			local disk = Instance.new("Part")
			disk.Name = plat.id
			disk.Shape = Enum.PartType.Cylinder
			disk.Size = Vector3.new(0.4, plat.radius * 2, plat.radius * 2)
			local _cFrame = CFrame.new(plat.position)
			local _arg0 = CFrame.Angles(0, 0, math.rad(90))
			disk.CFrame = _cFrame * _arg0
			disk.Material = Enum.Material.Neon
			disk.Color = plat.color
			disk.Transparency = 0.45
			disk.CanCollide = false
			disk.Anchored = true
			disk:SetAttribute("BuffType", plat.buffType)
			disk:SetAttribute("Radius", plat.radius)
			disk.Parent = platformsFolder
			-- Luz ambiental en el santuario
			local light = Instance.new("PointLight")
			light.Color = plat.color
			light.Range = plat.radius + 6
			light.Brightness = 2.5
			light.Parent = disk
			-- Pilar central rúnico
			local pillar = Instance.new("Part")
			pillar.Name = `{plat.id}_Pillar`
			pillar.Size = Vector3.new(2.5, 7, 2.5)
			local _position = plat.position
			local _vector3 = Vector3.new(0, 3.5, 0)
			pillar.Position = _position + _vector3
			pillar.Material = Enum.Material.Slate
			pillar.Color = Color3.new(0.15, 0.18, 0.22)
			pillar.CanCollide = true
			pillar.Anchored = true
			pillar.Parent = platformsFolder
			local rune = Instance.new("Part")
			rune.Name = "RuneCore"
			rune.Size = Vector3.new(1.4, 3.5, 1.4)
			rune.Position = pillar.Position
			rune.Material = Enum.Material.Neon
			rune.Color = plat.color
			rune.CanCollide = false
			rune.Anchored = true
			rune.Parent = platformsFolder
			-- Rótulo 3D flotante
			local bb = Instance.new("BillboardGui")
			bb.Size = UDim2.new(0, 160, 0, 45)
			bb.StudsOffset = Vector3.new(0, 5.5, 0)
			bb.AlwaysOnTop = true
			bb.Adornee = pillar
			bb.Parent = pillar
			local title = Instance.new("TextLabel")
			title.Size = UDim2.new(1, 0, 0.5, 0)
			title.BackgroundTransparency = 1
			title.Font = Enum.Font.FredokaOne
			title.Text = plat.title
			title.TextColor3 = plat.color
			title.TextSize = 15
			title.Parent = bb
			local desc = Instance.new("TextLabel")
			desc.Size = UDim2.new(1, 0, 0.5, 0)
			desc.Position = UDim2.new(0, 0, 0.5, 0)
			desc.BackgroundTransparency = 1
			desc.Font = Enum.Font.GothamMedium
			desc.Text = plat.buffDesc
			desc.TextColor3 = Color3.new(1, 1, 1)
			desc.TextSize = 11
			desc.Parent = bb
		end
		for _k, _v in TACTICAL_PLATFORMS do
			_callback_1(_v, _k - 1, TACTICAL_PLATFORMS)
		end
		-- ▲ ReadonlyArray.forEach ▲
	end
	_container.buildArenaEnvironment = buildArenaEnvironment
end
return {
	EnvironmentManager = EnvironmentManager,
}
