import { Debris, Players, RunService, TweenService, Workspace } from "@rbxts/services";
import { WEAPONS } from "shared/weapons";
import { VisualEffects } from "./effects";

const player = Players.LocalPlayer;
print(`[r-survivors] Cliente listo para el jugador: ${player.Name}`);

// Obtener RemoteEvents
let networkFolder = Workspace.WaitForChild("Network", 5) as Folder;
let damageEvent = networkFolder ? (networkFolder.WaitForChild("DamageEnemy", 5) as RemoteEvent) : undefined;
let collectGemEvent = networkFolder ? (networkFolder.WaitForChild("CollectGem", 5) as RemoteEvent) : undefined;

// Auto-aim loop: busca el enemigo más cercano y lanza ataques
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
	blade.Color = new Color3(0.1, 0.9, 0.8); // Turquesa neón
	blade.Material = Enum.Material.Neon;
	blade.CanCollide = false;
	blade.Anchored = true;
	blade.CFrame = new CFrame(startPos.add(new Vector3(0, 1.5, 0)));
	blade.Parent = Workspace;

	const dir = targetPos.sub(startPos).Unit;
	const maxTravel = 35;
	let traveled = 0;
	let returning = false;

	// Registro de cooldown de impacto por enemigo para permitir re-impacto en la vuelta
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

		// Detección de colisión con enemigos
		const enemiesFolder = Workspace.FindFirstChild("Enemies") as Folder;
		if (enemiesFolder) {
			const currentTime = os.clock();
			for (const enemy of enemiesFolder.GetChildren()) {
				if (enemy.IsA("BasePart") && (enemy.GetAttribute("HP") as number ?? 0) > 0) {
					const dist = blade.Position.sub(enemy.Position).Magnitude;
					if (dist <= 3.2) {
						const lastHit = hitCooldowns.get(enemy) ?? 0;
						if (currentTime - lastHit >= 0.35) {
							hitCooldowns.set(enemy, currentTime);

							// Notificar al servidor el impacto
							if (!damageEvent) {
								const net = Workspace.FindFirstChild("Network") as Folder;
								if (net) damageEvent = net.FindFirstChild("DamageEnemy") as RemoteEvent;
							}

							const knockbackDir = enemy.Position.sub(blade.Position).Unit;
							damageEvent?.FireServer(enemy, damage, knockbackDir);

							// Efecto visual instantáneo local
							VisualEffects.showDamagePopup(enemy.Position, damage);

							// Flash de impacto en el enemigo
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

	// Limpieza de seguridad tras 4 segundos
	Debris.AddItem(blade, 4);
}

// Loop de recolección/imantación de gemas hacia el jugador
RunService.Heartbeat.Connect((dt) => {
	const character = player.Character;
	const rootPart = character?.FindFirstChild("HumanoidRootPart") as BasePart;
	if (!rootPart) return;

	const dropsFolder = Workspace.FindFirstChild("Drops") as Folder;
	if (!dropsFolder) return;

	const magnetRadius = 15;
	const pickupRadius = 2.5;

	for (const drop of dropsFolder.GetChildren()) {
		if (drop.IsA("BasePart") && drop.GetAttribute("Collected") !== true) {
			const dist = rootPart.Position.sub(drop.Position).Magnitude;
			if (dist <= magnetRadius) {
				// Atraer gema suavemente hacia el jugador
				const pullDir = rootPart.Position.sub(drop.Position).Unit;
				const magnetSpeed = 22 + (magnetRadius - dist) * 2;
				drop.Position = drop.Position.add(pullDir.mul(magnetSpeed * dt));

				if (dist <= pickupRadius) {
					drop.SetAttribute("Collected", true);
					if (!collectGemEvent) {
						const net = Workspace.FindFirstChild("Network") as Folder;
						if (net) collectGemEvent = net.FindFirstChild("CollectGem") as RemoteEvent;
					}
					collectGemEvent?.FireServer(drop);

					// Animación de recogida local (shrink & fade)
					TweenService.Create(drop, new TweenInfo(0.2), {
						Size: new Vector3(0.05, 0.05, 0.05),
						Transparency: 1,
					}).Play();
					Debris.AddItem(drop, 0.25);
				}
			}
		}
	}
});
