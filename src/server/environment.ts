import { Lighting, Workspace } from "@rbxts/services";
import { TACTICAL_PLATFORMS } from "shared/platforms";

export namespace EnvironmentManager {
	export function setupAtmosphere() {
		// 1. Configuración de Iluminación Cinematográfica Sci-Fi
		Lighting.Brightness = 2.0;
		Lighting.ClockTime = 18.2; // Atardecer espacial / crepúsculo
		Lighting.Ambient = new Color3(0.18, 0.22, 0.32);
		Lighting.OutdoorAmbient = new Color3(0.25, 0.2, 0.35);
		Lighting.ColorShift_Top = new Color3(0.9, 0.55, 0.7); // Tono púrpura-rosado
		Lighting.ColorShift_Bottom = new Color3(0.08, 0.12, 0.22);
		Lighting.FogColor = new Color3(0.12, 0.14, 0.25);
		Lighting.FogStart = 60;
		Lighting.FogEnd = 240;

		// Post-procesado (Bloom & Atmósfera)
		let bloom = Lighting.FindFirstChildOfClass("BloomEffect");
		if (!bloom) {
			bloom = new Instance("BloomEffect");
			bloom.Intensity = 0.85;
			bloom.Size = 24;
			bloom.Threshold = 0.75;
			bloom.Parent = Lighting;
		}

		let colorCorrection = Lighting.FindFirstChildOfClass("ColorCorrectionEffect");
		if (!colorCorrection) {
			colorCorrection = new Instance("ColorCorrectionEffect");
			colorCorrection.Contrast = 0.15;
			colorCorrection.Saturation = 0.25;
			colorCorrection.TintColor = new Color3(0.96, 0.94, 1.0);
			colorCorrection.Parent = Lighting;
		}

		let sky = Lighting.FindFirstChildOfClass("Sky");
		if (!sky) {
			sky = new Instance("Sky");
			sky.CelestialBodiesShown = false;
			sky.Parent = Lighting;
		}
	}

	export function buildArenaEnvironment() {
		let mapFolder = Workspace.FindFirstChild("MapEnvironment") as Folder;
		if (mapFolder) {
			mapFolder.Destroy();
		}
		mapFolder = new Instance("Folder");
		mapFolder.Name = "MapEnvironment";
		mapFolder.Parent = Workspace;

		const arenaRadius = 140;

		// 1. Muro Perimetral de Cristales / Pilares de Energía
		const pilarCount = 36;
		for (let i = 0; i < pilarCount; i++) {
			const angle = (i / pilarCount) * math.pi * 2;
			const x = math.cos(angle) * arenaRadius;
			const z = math.sin(angle) * arenaRadius;

			// Base de roca
			const rockBase = new Instance("Part");
			rockBase.Name = `PerimeterRock_${i}`;
			rockBase.Size = new Vector3(12, 10 + math.sin(i * 3) * 4, 8);
			rockBase.CFrame = new CFrame(new Vector3(x, 4, z), new Vector3(0, 4, 0));
			rockBase.Material = Enum.Material.Slate;
			rockBase.Color = new Color3(0.12, 0.14, 0.18);
			rockBase.Anchored = true;
			rockBase.CanCollide = true;
			rockBase.Parent = mapFolder;

			// Cristal Neón incrustado en el pilar
			const crystal = new Instance("Part");
			crystal.Name = `PerimeterCrystal_${i}`;
			crystal.Size = new Vector3(2.5, 14, 2.5);
			crystal.CFrame = new CFrame(new Vector3(x, 10, z), new Vector3(0, 10, 0));
			crystal.Material = Enum.Material.Neon;
			// Alternar entre turquesa cian y magenta alienígena
			crystal.Color = i % 2 === 0 ? new Color3(0.1, 0.85, 0.9) : new Color3(0.85, 0.2, 0.75);
			crystal.Anchored = true;
			crystal.CanCollide = false;
			crystal.Parent = mapFolder;

			const light = new Instance("PointLight");
			light.Color = crystal.Color;
			light.Range = 18;
			light.Brightness = 1.2;
			light.Parent = crystal;
		}

		// 2. Coberturas y Monolitos Interiores (Obstáculos estratégicos)
		const obstacleCoords = [
			new Vector3(35, 0, 35),
			new Vector3(-35, 0, 35),
			new Vector3(35, 0, -35),
			new Vector3(-35, 0, -35),
			new Vector3(65, 0, 0),
			new Vector3(-65, 0, 0),
			new Vector3(0, 0, 65),
			new Vector3(0, 0, -65),
		];

		obstacleCoords.forEach((coord, idx) => {
			const monolith = new Instance("Part");
			monolith.Name = `Monolith_${idx}`;
			monolith.Size = new Vector3(6, 12, 6);
			monolith.Position = coord.add(new Vector3(0, 6, 0));
			monolith.Material = Enum.Material.CorrodedMetal;
			monolith.Color = new Color3(0.15, 0.18, 0.22);
			monolith.Anchored = true;
			monolith.CanCollide = true;
			monolith.Parent = mapFolder;

			// Núcleo brillante en el monolito
			const core = new Instance("Part");
			core.Name = `MonolithCore_${idx}`;
			core.Size = new Vector3(2, 6, 6.2);
			core.Position = monolith.Position;
			core.Material = Enum.Material.Neon;
			core.Color = new Color3(0.1, 0.95, 0.7); // Esmeralda cian
			core.Anchored = true;
			core.CanCollide = false;
			core.Parent = mapFolder;

			const coreLight = new Instance("PointLight");
			coreLight.Color = core.Color;
			coreLight.Range = 22;
			coreLight.Brightness = 2.0;
			coreLight.Parent = core;
		});

		// 3. Suelo de la Arena Decorado
		const baseplate = Workspace.FindFirstChild("Baseplate") as BasePart;
		if (baseplate) {
			baseplate.Color = new Color3(0.1, 0.12, 0.16); // Asfalto espacial profundo
			baseplate.Material = Enum.Material.DiamondPlate; // Textura metálica futurista
		}

		// 4. Plataformas Tácticas Holográficas (Zonas de Buff)
		const platformsFolder = new Instance("Folder");
		platformsFolder.Name = "TacticalPlatforms";
		platformsFolder.Parent = mapFolder;

		TACTICAL_PLATFORMS.forEach((plat) => {
			// Disco del suelo holográfico
			const disk = new Instance("Part");
			disk.Name = plat.id;
			disk.Shape = Enum.PartType.Cylinder;
			disk.Size = new Vector3(0.4, plat.radius * 2, plat.radius * 2);
			disk.CFrame = new CFrame(plat.position).mul(CFrame.Angles(0, 0, math.rad(90)));
			disk.Material = Enum.Material.Neon;
			disk.Color = plat.color;
			disk.Transparency = 0.45;
			disk.CanCollide = false;
			disk.Anchored = true;
			disk.SetAttribute("BuffType", plat.buffType);
			disk.SetAttribute("Radius", plat.radius);
			disk.Parent = platformsFolder;

			// Luz ambiental en el santuario
			const light = new Instance("PointLight");
			light.Color = plat.color;
			light.Range = plat.radius + 6;
			light.Brightness = 2.5;
			light.Parent = disk;

			// Pilar central rúnico
			const pillar = new Instance("Part");
			pillar.Name = `${plat.id}_Pillar`;
			pillar.Size = new Vector3(2.5, 7, 2.5);
			pillar.Position = plat.position.add(new Vector3(0, 3.5, 0));
			pillar.Material = Enum.Material.Slate;
			pillar.Color = new Color3(0.15, 0.18, 0.22);
			pillar.CanCollide = true;
			pillar.Anchored = true;
			pillar.Parent = platformsFolder;

			const rune = new Instance("Part");
			rune.Name = "RuneCore";
			rune.Size = new Vector3(1.4, 3.5, 1.4);
			rune.Position = pillar.Position;
			rune.Material = Enum.Material.Neon;
			rune.Color = plat.color;
			rune.CanCollide = false;
			rune.Anchored = true;
			rune.Parent = platformsFolder;

			// Rótulo 3D flotante
			const bb = new Instance("BillboardGui");
			bb.Size = new UDim2(0, 160, 0, 45);
			bb.StudsOffset = new Vector3(0, 5.5, 0);
			bb.AlwaysOnTop = true;
			bb.Adornee = pillar;
			bb.Parent = pillar;

			const title = new Instance("TextLabel");
			title.Size = new UDim2(1, 0, 0.5, 0);
			title.BackgroundTransparency = 1;
			title.Font = Enum.Font.FredokaOne;
			title.Text = plat.title;
			title.TextColor3 = plat.color;
			title.TextSize = 15;
			title.Parent = bb;

			const desc = new Instance("TextLabel");
			desc.Size = new UDim2(1, 0, 0.5, 0);
			desc.Position = new UDim2(0, 0, 0.5, 0);
			desc.BackgroundTransparency = 1;
			desc.Font = Enum.Font.GothamMedium;
			desc.Text = plat.buffDesc;
			desc.TextColor3 = new Color3(1, 1, 1);
			desc.TextSize = 11;
			desc.Parent = bb;
		});
	}
}
