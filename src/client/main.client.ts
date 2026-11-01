import { Debris, Players, RunService, TweenService, Workspace } from "@rbxts/services";
import { WEAPONS } from "shared/weapons";
import { VisualEffects } from "./effects";

const player = Players.LocalPlayer;
print(`[r-survivors] Cliente listo para el jugador: ${player.Name}`);

// 1. Crear HUD básico de EXP y Nivel
const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;
let hudScreen = playerGui.FindFirstChild("SurvivorHUD") as ScreenGui;
if (!hudScreen) {
	hudScreen = new Instance("ScreenGui");
	hudScreen.Name = "SurvivorHUD";
	hudScreen.ResetOnSpawn = false;
	hudScreen.Parent = playerGui;

	// Contenedor barra de exp superior
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
	barFill.BackgroundColor3 = new Color3(0.2, 0.85, 0.35); // Verde neón
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

	// Actualizar HUD cuando cambian las leaderstats
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
}

// 2. Obtener RemoteEvents de red
let networkFolder = Workspace.WaitForChild("Network", 5) as Folder;
let damageEvent = networkFolder ? (networkFolder.WaitForChild("DamageEnemy", 5) as RemoteEvent) : undefined;
let collectGemEvent = networkFolder ? (networkFolder.WaitForChild("CollectGem", 5) as RemoteEvent) : undefined;

// 3. Auto-aim loop: busca el enemigo más cercano y lanza ataques
task.spawn(() => {
	const boomerangDef = WEAPONS.void_boomerang.levels[0];
	while (true) {
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
			fireBoomerang(rootPart.Position, targetPos, boomerangDef.damage, boomerangDef.speed);
		}
	}
});

function fireBoomerang(startPos: Vector3, targetPos: Vector3, damage: number, speed: number) {
	const blade = new Instance("Part");
	blade.Name = "VoidBoomerang";
	blade.Size = new Vector3(3.2, 0.4, 3.2);
	blade.Color = new Color3(0.1, 0.9, 0.8);
	blade.Material = Enum.Material.Neon;
	blade.CanCollide = false;
	blade.Anchored = true;
	blade.CFrame = new CFrame(startPos.add(new Vector3(0, 1.5, 0)));
	blade.Parent = Workspace;

	const dir = targetPos.sub(startPos).Unit;
	const maxTravel = 35;
	let traveled = 0;
	let returning = false;

	const hitCooldowns = new Map<Instance, number>();

	const connection = RunService.Heartbeat.Connect((dt) => {
		blade.Orientation = blade.Orientation.add(new Vector3(0, 1600 * dt, 0));

		const rootPart = player.Character?.FindFirstChild("HumanoidRootPart") as BasePart;

		// Movimiento ida / vuelta
		if (!returning) {
			blade.Position = blade.Position.add(dir.mul(speed * dt));
			traveled += speed * dt;
			if (traveled >= maxTravel) {
				returning = true;
			}
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

		// Detección de colisión con enemigos (rango de 4 studs para mayor fiabilidad)
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
								if (enemy && enemy.Parent) {
									enemy.Color = origColor;
								}
							});
						}
					}
				}
			}
		}
	});

	Debris.AddItem(blade, 4);
}

// 4. Loop de recolección/imantación de gemas hacia el jugador
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
