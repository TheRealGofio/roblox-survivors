import { Debris, Players, RunService, TweenService, Workspace } from "@rbxts/services";
import { WEAPONS } from "shared/weapons";
import { VisualEffects } from "./effects";

const player = Players.LocalPlayer;
const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;

// 1. HUD de EXP y Nivel
const hudScreen = new Instance("ScreenGui");
hudScreen.Name = "SurvivorHUD";
hudScreen.ResetOnSpawn = false;
hudScreen.Parent = playerGui;

const barBg = new Instance("Frame");
barBg.Name = "ExpBarBackground";
barBg.Size = new UDim2(0.6, 0, 0, 18);
barBg.Position = new UDim2(0.2, 0, 0.02, 0);
barBg.BackgroundColor3 = new Color3(0.1, 0.12, 0.15);
barBg.BorderSizePixel = 0;
barBg.Parent = hudScreen;

const uiCornerBg = new Instance("UICorner");
uiCornerBg.CornerRadius = new UDim(0, 6);
uiCornerBg.Parent = barBg;

const barFill = new Instance("Frame");
barFill.Name = "ExpBarFill";
barFill.Size = new UDim2(0, 0, 1, 0);
barFill.BackgroundColor3 = new Color3(0.2, 0.85, 0.35);
barFill.BorderSizePixel = 0;
barFill.Parent = barBg;

const uiCornerFill = new Instance("UICorner");
uiCornerFill.CornerRadius = new UDim(0, 6);
uiCornerFill.Parent = barFill;

const levelText = new Instance("TextLabel");
levelText.Name = "LevelText";
levelText.Size = new UDim2(1, 0, 1, 0);
levelText.BackgroundTransparency = 1;
levelText.Font = Enum.Font.FredokaOne;
levelText.Text = "LVL 1 - EXP: 0 / 50";
levelText.TextColor3 = new Color3(1, 1, 1);
levelText.TextSize = 13;
levelText.TextStrokeTransparency = 0.5;
levelText.Parent = barBg;

// 2. Obtener referencias de RemoteEvents
let networkFolder = Workspace.WaitForChild("Network", 5) as Folder;
let damageEvent = networkFolder ? (networkFolder.WaitForChild("DamageEnemy", 5) as RemoteEvent) : undefined;
let collectGemEvent = networkFolder ? (networkFolder.WaitForChild("CollectGem", 5) as RemoteEvent) : undefined;
let levelUpEvent = networkFolder ? (networkFolder.WaitForChild("LevelUp", 5) as RemoteEvent) : undefined;
let selectUpgradeEvent = networkFolder ? (networkFolder.WaitForChild("SelectUpgrade", 5) as RemoteEvent) : undefined;

// 3. UI del Menú de Level Up (3 Cartas)
const levelUpGui = new Instance("ScreenGui");
levelUpGui.Name = "LevelUpScreen";
levelUpGui.Enabled = false;
levelUpGui.ResetOnSpawn = false;
levelUpGui.Parent = playerGui;

const modalBackdrop = new Instance("Frame");
modalBackdrop.Size = new UDim2(1, 0, 1, 0);
modalBackdrop.BackgroundColor3 = new Color3(0, 0, 0);
modalBackdrop.BackgroundTransparency = 0.45;
modalBackdrop.BorderSizePixel = 0;
modalBackdrop.Parent = levelUpGui;

const titleHeader = new Instance("TextLabel");
titleHeader.Size = new UDim2(1, 0, 0, 50);
titleHeader.Position = new UDim2(0, 0, 0.15, 0);
titleHeader.BackgroundTransparency = 1;
titleHeader.Font = Enum.Font.FredokaOne;
titleHeader.Text = "¡SUBIDA DE NIVEL!";
titleHeader.TextSize = 34;
titleHeader.TextColor3 = new Color3(1, 0.85, 0.2);
titleHeader.TextStrokeTransparency = 0;
titleHeader.Parent = modalBackdrop;

const cardsContainer = new Instance("Frame");
cardsContainer.Size = new UDim2(0.85, 0, 0, 240);
cardsContainer.Position = new UDim2(0.075, 0, 0.32, 0);
cardsContainer.BackgroundTransparency = 1;
cardsContainer.Parent = modalBackdrop;

const uiLayout = new Instance("UIListLayout");
uiLayout.FillDirection = Enum.FillDirection.Horizontal;
uiLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center;
uiLayout.VerticalAlignment = Enum.VerticalAlignment.Center;
uiLayout.Padding = new UDim(0, 25);
uiLayout.Parent = cardsContainer;

function showLevelUpModal() {
	levelUpGui.Enabled = true;

	// Limpiar cartas previas
	for (const child of cardsContainer.GetChildren()) {
		if (child.IsA("GuiButton")) {
			child.Destroy();
		}
	}

	// Obtener inventario actual
	const inventory = player.FindFirstChild("Inventory") as Folder;
	const boomerangLvl = (inventory?.FindFirstChild("void_boomerang") as IntValue)?.Value ?? 1;
	const plasmaLvl = (inventory?.FindFirstChild("plasma_blaster") as IntValue)?.Value ?? 0;

	// 3 Opciones de cartas
	const options = [
		{
			id: "void_boomerang",
			title: "Búmeran del Vacío",
			tag: boomerangLvl < 3 ? `Nivel ${boomerangLvl + 1}` : "Nivel MÁX",
			desc: boomerangLvl === 1 ? "+50% daño y mayor velocidad" : "Dispara 2 búmeranes con -20% cooldown",
			color: new Color3(0.08, 0.45, 0.4),
		},
		{
			id: "plasma_blaster",
			title: plasmaLvl === 0 ? "Nueva Arma: Bláster" : "Bláster de Plasma",
			tag: plasmaLvl === 0 ? "DESBLOQUEAR" : `Nivel ${plasmaLvl + 1}`,
			desc: plasmaLvl === 0 ? "Ráfagas teledirigidas de alta cadencia" : "Dispara 2 esferas de plasma a la vez",
			color: new Color3(0.45, 0.15, 0.5),
		},
		{
			id: "speed_boost",
			title: "Propulsores de Pies",
			tag: "PASIVA",
			desc: "+18% velocidad de movimiento permanente",
			color: new Color3(0.15, 0.35, 0.55),
		},
	];

	for (const opt of options) {
		const card = new Instance("TextButton");
		card.Size = new UDim2(0, 210, 0, 230);
		card.BackgroundColor3 = opt.color;
		card.BorderSizePixel = 0;
		card.Text = "";
		card.AutoButtonColor = true;
		card.Parent = cardsContainer;

		const corner = new Instance("UICorner");
		corner.CornerRadius = new UDim(0, 12);
		corner.Parent = card;

		const stroke = new Instance("UIStroke");
		stroke.Thickness = 2.5;
		stroke.Color = new Color3(1, 1, 1);
		stroke.Transparency = 0.3;
		stroke.Parent = card;

		const cardTitle = new Instance("TextLabel");
		cardTitle.Size = new UDim2(1, -20, 0, 36);
		cardTitle.Position = new UDim2(0, 10, 0, 14);
		cardTitle.BackgroundTransparency = 1;
		cardTitle.Font = Enum.Font.FredokaOne;
		cardTitle.Text = opt.title;
		cardTitle.TextSize = 18;
		cardTitle.TextColor3 = new Color3(1, 1, 1);
		cardTitle.TextWrapped = true;
		cardTitle.Parent = card;

		const tagLabel = new Instance("TextLabel");
		tagLabel.Size = new UDim2(1, -20, 0, 22);
		tagLabel.Position = new UDim2(0, 10, 0, 52);
		tagLabel.BackgroundTransparency = 1;
		tagLabel.Font = Enum.Font.FredokaOne;
		tagLabel.Text = opt.tag;
		tagLabel.TextSize = 14;
		tagLabel.TextColor3 = new Color3(1, 0.85, 0.2);
		tagLabel.Parent = card;

		const cardDesc = new Instance("TextLabel");
		cardDesc.Size = new UDim2(1, -24, 0, 90);
		cardDesc.Position = new UDim2(0, 12, 0, 85);
		cardDesc.BackgroundTransparency = 1;
		cardDesc.Font = Enum.Font.GothamMedium;
		cardDesc.Text = opt.desc;
		cardDesc.TextSize = 13;
		cardDesc.TextColor3 = new Color3(0.9, 0.9, 0.9);
		cardDesc.TextWrapped = true;
		cardDesc.Parent = card;

		const selectBtn = new Instance("TextLabel");
		selectBtn.Size = new UDim2(0.8, 0, 0, 32);
		selectBtn.Position = new UDim2(0.1, 0, 0.8, 0);
		selectBtn.BackgroundColor3 = new Color3(1, 1, 1);
		selectBtn.Font = Enum.Font.FredokaOne;
		selectBtn.Text = "ELEGIR";
		selectBtn.TextColor3 = new Color3(0.1, 0.1, 0.1);
		selectBtn.TextSize = 14;
		selectBtn.Parent = card;

		const btnCorner = new Instance("UICorner");
		btnCorner.CornerRadius = new UDim(0, 6);
		btnCorner.Parent = selectBtn;

		card.MouseButton1Click.Connect(() => {
			if (!selectUpgradeEvent) {
				const net = Workspace.FindFirstChild("Network") as Folder;
				if (net) selectUpgradeEvent = net.FindFirstChild("SelectUpgrade") as RemoteEvent;
			}
			selectUpgradeEvent?.FireServer(opt.id);
			levelUpGui.Enabled = false;
		});
	}
}

// 4. Conectar recepción de Level Up
if (levelUpEvent) {
	levelUpEvent.OnClientEvent.Connect(() => {
		showLevelUpModal();
	});
} else {
	task.spawn(() => {
		const net = Workspace.WaitForChild("Network", 10) as Folder;
		const ev = net?.WaitForChild("LevelUp", 5) as RemoteEvent;
		ev?.OnClientEvent.Connect(() => {
			showLevelUpModal();
		});
	});
}

// 5. Actualizar barra de EXP en el cliente
task.spawn(() => {
	const leaderstats = player.WaitForChild("leaderstats", 10) as Folder;
	if (leaderstats) {
		const expVal = leaderstats.WaitForChild("EXP", 5) as NumberValue;
		const lvlVal = leaderstats.WaitForChild("Level", 5) as IntValue;

		const updateUi = () => {
			const currentLvl = lvlVal ? lvlVal.Value : 1;
			const currentExp = expVal ? expVal.Value : 0;
			const maxExp = currentLvl * 50;
			const ratio = math.clamp(currentExp / maxExp, 0, 1);

			TweenService.Create(barFill, new TweenInfo(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				Size: new UDim2(ratio, 0, 1, 0),
			}).Play();
			levelText.Text = `LVL ${currentLvl} - EXP: ${math.floor(currentExp)} / ${maxExp}`;
		};

		expVal?.Changed.Connect(updateUi);
		lvlVal?.Changed.Connect(updateUi);
		updateUi();
	}
});

// 6. Armas: Búmeran del Vacío
task.spawn(() => {
	while (true) {
		const inventory = player.FindFirstChild("Inventory") as Folder;
		const boomerangLvl = (inventory?.FindFirstChild("void_boomerang") as IntValue)?.Value ?? 1;
		const boomerangDef = WEAPONS.void_boomerang.levels[math.min(boomerangLvl, WEAPONS.void_boomerang.levels.size()) - 1];

		task.wait(boomerangDef.cooldown);

		const character = player.Character;
		const rootPart = character?.FindFirstChild("HumanoidRootPart") as BasePart;
		if (!rootPart) continue;

		const enemiesFolder = Workspace.FindFirstChild("Enemies") as Folder;
		if (!enemiesFolder) continue;

		let nearestDist = 9999;
		let targetPos: Vector3 | undefined = undefined;

		for (const enemy of enemiesFolder.GetChildren()) {
			if (enemy.IsA("BasePart") && (enemy.GetAttribute("HP") as number ?? 0) > 0) {
				const dist = rootPart.Position.sub(enemy.Position).Magnitude;
				if (dist < nearestDist && dist <= boomerangDef.range) {
					nearestDist = dist;
					targetPos = enemy.Position;
				}
			}
		}

		if (targetPos) {
			const count = boomerangDef.projectiles;
			for (let i = 0; i < count; i++) {
				const angleOffset = count > 1 ? (i === 0 ? -0.2 : 0.2) : 0;
				fireBoomerang(rootPart.Position, targetPos, boomerangDef.damage, boomerangDef.speed, angleOffset);
			}
		}
	}
});

function fireBoomerang(startPos: Vector3, targetPos: Vector3, damage: number, speed: number, angleOffset = 0) {
	const blade = new Instance("Part");
	blade.Name = "VoidBoomerang";
	blade.Size = new Vector3(3.2, 0.4, 3.2);
	blade.Color = new Color3(0.1, 0.9, 0.8);
	blade.Material = Enum.Material.Neon;
	blade.CanCollide = false;
	blade.Anchored = true;
	blade.CFrame = new CFrame(startPos.add(new Vector3(0, 1.5, 0)));
	blade.Parent = Workspace;

	let dir = targetPos.sub(startPos).Unit;
	if (angleOffset !== 0) {
		dir = new Vector3(
			dir.X * math.cos(angleOffset) - dir.Z * math.sin(angleOffset),
			dir.Y,
			dir.X * math.sin(angleOffset) + dir.Z * math.cos(angleOffset),
		);
	}

	const maxTravel = 35;
	let traveled = 0;
	let returning = false;
	const hitCooldowns = new Map<Instance, number>();

	const connection = RunService.Heartbeat.Connect((dt) => {
		blade.Orientation = blade.Orientation.add(new Vector3(0, 1600 * dt, 0));
		const rootPart = player.Character?.FindFirstChild("HumanoidRootPart") as BasePart;

		if (!returning) {
			blade.Position = blade.Position.add(dir.mul(speed * dt));
			traveled += speed * dt;
			if (traveled >= maxTravel) returning = true;
		} else {
			if (rootPart) {
				const returnDir = rootPart.Position.sub(blade.Position).Unit;
				blade.Position = blade.Position.add(returnDir.mul(speed * 1.25 * dt));
				if (rootPart.Position.sub(blade.Position).Magnitude < 3) {
					connection.Disconnect();
					blade.Destroy();
					return;
				}
			} else {
				connection.Disconnect();
				blade.Destroy();
				return;
			}
		}

		// Detección de colisiones
		const enemiesFolder = Workspace.FindFirstChild("Enemies") as Folder;
		if (enemiesFolder) {
			const currentTime = os.clock();
			for (const enemy of enemiesFolder.GetChildren()) {
				if (enemy.IsA("BasePart") && (enemy.GetAttribute("HP") as number ?? 0) > 0) {
					const dist = blade.Position.sub(enemy.Position).Magnitude;
					if (dist <= 4.0) {
						const lastHit = hitCooldowns.get(enemy) ?? 0;
						if (currentTime - lastHit >= 0.35) {
							hitCooldowns.set(enemy, currentTime);

							if (!damageEvent) {
								const net = Workspace.FindFirstChild("Network") as Folder;
								if (net) damageEvent = net.FindFirstChild("DamageEnemy") as RemoteEvent;
							}

							const knockbackDir = enemy.Position.sub(blade.Position).Unit;
							damageEvent?.FireServer(enemy, damage, knockbackDir);
							VisualEffects.showDamagePopup(enemy.Position, damage);

							const origColor = enemy.Color;
							enemy.Color = new Color3(1, 1, 1);
							task.delay(0.08, () => {
								if (enemy && enemy.Parent) enemy.Color = origColor;
							});
						}
					}
				}
			}
		}
	});

	Debris.AddItem(blade, 4);
}

// 7. Armas: Bláster de Plasma (Desbloqueable)
task.spawn(() => {
	while (true) {
		const inventory = player.FindFirstChild("Inventory") as Folder;
		const plasmaLvl = (inventory?.FindFirstChild("plasma_blaster") as IntValue)?.Value ?? 0;

		if (plasmaLvl <= 0) {
			task.wait(1.0);
			continue;
		}

		const plasmaDef = WEAPONS.plasma_blaster.levels[math.min(plasmaLvl, WEAPONS.plasma_blaster.levels.size()) - 1];
		task.wait(plasmaDef.cooldown);

		const character = player.Character;
		const rootPart = character?.FindFirstChild("HumanoidRootPart") as BasePart;
		if (!rootPart) continue;

		const enemiesFolder = Workspace.FindFirstChild("Enemies") as Folder;
		if (!enemiesFolder) continue;

		let nearestDist = 9999;
		let targetEnemy: BasePart | undefined = undefined;

		for (const enemy of enemiesFolder.GetChildren()) {
			if (enemy.IsA("BasePart") && (enemy.GetAttribute("HP") as number ?? 0) > 0) {
				const dist = rootPart.Position.sub(enemy.Position).Magnitude;
				if (dist < nearestDist && dist <= plasmaDef.range) {
					nearestDist = dist;
					targetEnemy = enemy;
				}
			}
		}

		if (targetEnemy) {
			firePlasmaOrb(rootPart.Position, targetEnemy, plasmaDef.damage, plasmaDef.speed);
		}
	}
});

function firePlasmaOrb(startPos: Vector3, targetEnemy: BasePart, damage: number, speed: number) {
	const orb = new Instance("Part");
	orb.Name = "PlasmaOrb";
	orb.Shape = Enum.PartType.Ball;
	orb.Size = new Vector3(1.4, 1.4, 1.4);
	orb.Color = new Color3(0.85, 0.2, 0.95); // Magenta brillante
	orb.Material = Enum.Material.Neon;
	orb.CanCollide = false;
	orb.Anchored = true;
	orb.Position = startPos.add(new Vector3(0, 1.5, 0));
	orb.Parent = Workspace;

	const light = new Instance("PointLight");
	light.Color = orb.Color;
	light.Range = 8;
	light.Brightness = 2;
	light.Parent = orb;

	let alive = true;
	const conn = RunService.Heartbeat.Connect((dt) => {
		if (!alive || !targetEnemy || !targetEnemy.Parent) {
			conn.Disconnect();
			orb.Destroy();
			return;
		}

		const dir = targetEnemy.Position.sub(orb.Position).Unit;
		orb.Position = orb.Position.add(dir.mul(speed * dt));

		const dist = orb.Position.sub(targetEnemy.Position).Magnitude;
		if (dist <= 2.2) {
			alive = false;
			conn.Disconnect();

			if (!damageEvent) {
				const net = Workspace.FindFirstChild("Network") as Folder;
				if (net) damageEvent = net.FindFirstChild("DamageEnemy") as RemoteEvent;
			}
			damageEvent?.FireServer(targetEnemy, damage, dir);
			VisualEffects.showDamagePopup(targetEnemy.Position, damage, true);

			orb.Destroy();
		}
	});

	Debris.AddItem(orb, 2.5);
}

// 8. Loop de recolección/imantación de gemas hacia el jugador
RunService.Heartbeat.Connect((dt) => {
	const character = player.Character;
	const rootPart = character?.FindFirstChild("HumanoidRootPart") as BasePart;
	if (!rootPart) return;

	const dropsFolder = Workspace.FindFirstChild("Drops") as Folder;
	if (!dropsFolder) return;

	const magnetRadius = 16;
	const pickupRadius = 2.5;

	for (const drop of dropsFolder.GetChildren()) {
		if (drop.IsA("BasePart") && drop.GetAttribute("Collected") !== true) {
			const dist = rootPart.Position.sub(drop.Position).Magnitude;
			if (dist <= magnetRadius) {
				const pullDir = rootPart.Position.sub(drop.Position).Unit;
				const magnetSpeed = 24 + (magnetRadius - dist) * 2;
				drop.Position = drop.Position.add(pullDir.mul(magnetSpeed * dt));

				if (dist <= pickupRadius) {
					drop.SetAttribute("Collected", true);
					if (!collectGemEvent) {
						const net = Workspace.FindFirstChild("Network") as Folder;
						if (net) collectGemEvent = net.FindFirstChild("CollectGem") as RemoteEvent;
					}
					collectGemEvent?.FireServer(drop);

					TweenService.Create(drop, new TweenInfo(0.18), {
						Size: new Vector3(0.05, 0.05, 0.05),
						Transparency: 1,
					}).Play();
					Debris.AddItem(drop, 0.22);
				}
			}
		}
	}
});
